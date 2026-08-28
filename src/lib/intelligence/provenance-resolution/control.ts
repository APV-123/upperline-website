import 'server-only';

import { opportunityError } from '@/lib/opportunities/application/errors';
import type { OpportunityActor } from '@/lib/opportunities/application/actor-core';
import { createOpportunitySupabaseClient } from '@/lib/opportunities/persistence/client';
import { readPdfStorageConfig } from '@/lib/opportunities/ingestion/pdf-storage-config';
import { SupabasePrivatePdfObjectStore } from '@/lib/opportunities/ingestion/supabase-pdf-object-store';
import { SupabaseProvenanceResolutionRepository } from './supabase-repository';
import { executeProvenanceCommand } from './service';
import { parseHumanStage } from './control-validation';

export type ProvenanceControlModel = {
  opportunityId: string; opportunityName: string; artifactAcquisitionId: string;
  documentLabel: string; byteSize: number; pageCount: number | null; mediaType: string;
  documentUrl: string; readiness: string;
  resolved: { sourceId: string | null; editionId: string | null; representationId: string | null; sourceRelationshipId: string | null };
};

type BoundAcquisition = {
  id:string; artifact_id:string; opportunity_id:string; legacy_opportunity_artifact_id:string;
  storage_bucket:string; storage_path:string; original_filename:string|null; acquired_at:string;
};

async function loadBoundAcquisition(client:ReturnType<typeof createOpportunitySupabaseClient>,opportunityId:string,artifactAcquisitionId?:string):Promise<BoundAcquisition>{
  let query=client.from('intelligence_artifact_acquisitions')
    .select('id,artifact_id,opportunity_id,legacy_opportunity_artifact_id,storage_bucket,storage_path,original_filename,acquired_at')
    .eq('opportunity_id',opportunityId);
  if(artifactAcquisitionId)query=query.eq('id',artifactAcquisitionId);
  const {data,error}=await query.order('acquired_at',{ascending:false}).limit(1);
  if(error)throw opportunityError('persistence_failure','Provenance acquisition could not be loaded.',error);
  const acquisition=data?.[0] as BoundAcquisition|undefined;
  if(!acquisition)throw opportunityError('not_found','No matching Property Intelligence acquisition exists for this Opportunity.');
  const {data:legacy,error:legacyError}=await client.from('opportunity_source_artifacts').select('ingestion_id,storage_bucket,storage_path,byte_size,sha256_digest,detected_mime_type').eq('id',acquisition.legacy_opportunity_artifact_id).single();
  if(legacyError||!legacy)throw opportunityError('persistence_failure','Legacy artifact identity could not be resolved.',legacyError);
  const [{data:ingestion,error:ingestionError},{data:artifact,error:artifactError}]=await Promise.all([
    client.from('opportunity_ingestions').select('opportunity_id').eq('id',legacy.ingestion_id).single(),
    client.from('intelligence_artifacts').select('byte_size,sha256_digest,detected_media_type').eq('id',acquisition.artifact_id).single(),
  ]);
  if(ingestionError||artifactError||!ingestion||!artifact)throw opportunityError('persistence_failure','Artifact relationship could not be resolved.',ingestionError??artifactError);
  if(ingestion.opportunity_id!==opportunityId||acquisition.opportunity_id!==opportunityId||acquisition.storage_bucket!==legacy.storage_bucket||acquisition.storage_path!==legacy.storage_path||String(artifact.byte_size)!==String(legacy.byte_size)||artifact.sha256_digest!==legacy.sha256_digest||artifact.detected_media_type!==legacy.detected_mime_type)throw opportunityError('integrity_conflict','The Opportunity artifact relationship is inconsistent.');
  return acquisition;
}

export async function getProvenanceControlModel(opportunityId: string, actor: OpportunityActor): Promise<ProvenanceControlModel> {
  if (!actor.email.endsWith('@upperlineco.com')) throw opportunityError('forbidden', 'Upperline access is required.');
  const client = createOpportunitySupabaseClient();
  const acquisition=await loadBoundAcquisition(client,opportunityId);
  const [{ data: opportunity, error: opportunityErrorResult }, { data: artifact, error: artifactError }, { data: legacy, error: legacyError }] = await Promise.all([
    client.from('acquisition_opportunities').select('id,name').eq('id', opportunityId).single(),
    client.from('intelligence_artifacts').select('byte_size,detected_media_type').eq('id', acquisition.artifact_id).single(),
    client.from('opportunity_source_artifacts').select('original_filename,display_filename,page_count').eq('id', acquisition.legacy_opportunity_artifact_id).single(),
  ]);
  if (opportunityErrorResult || artifactError || legacyError || !opportunity || !artifact || !legacy) {
    throw opportunityError('persistence_failure', 'Provenance control metadata is incomplete.', opportunityErrorResult ?? artifactError ?? legacyError);
  }
  const config = readPdfStorageConfig();
  if (acquisition.storage_bucket !== config.bucket || !acquisition.storage_path) {
    throw opportunityError('integrity_conflict', 'The private document location is inconsistent.');
  }
  const document = await new SupabasePrivatePdfObjectStore(client, config).createExactReadAccess(acquisition.storage_path, 300);
  const readiness = await new SupabaseProvenanceResolutionRepository(client).getReadiness({ artifactAcquisitionId: acquisition.id });
  return {
    opportunityId: opportunity.id, opportunityName: opportunity.name, artifactAcquisitionId: acquisition.id,
    documentLabel: legacy.display_filename ?? legacy.original_filename ?? acquisition.original_filename ?? `${opportunity.name} source PDF`,
    byteSize: Number(artifact.byte_size), pageCount: legacy.page_count, mediaType: artifact.detected_media_type,
    documentUrl: document.url, readiness: readiness.readiness,
    resolved: { sourceId: readiness.sourceId, editionId: readiness.editionId, representationId: readiness.representationId, sourceRelationshipId: readiness.sourceRelationshipId },
  };
}

export async function executeHumanProvenanceStage(body:unknown,actor:OpportunityActor){
  const request=parseHumanStage(body);const client=createOpportunitySupabaseClient();const repository=new SupabaseProvenanceResolutionRepository(client);
  const acquisition=await loadBoundAcquisition(client,request.opportunityId,request.artifactAcquisitionId);
  const readiness=await repository.getReadiness({artifactAcquisitionId:request.artifactAcquisitionId});
  const stage=requiredText(request.judgment.stage,'stage');if(stage!==readiness.readiness)throw opportunityError('revision_conflict','Provenance state changed. Refresh before submitting.');
  let proposalKind:string;let payload:Record<string,unknown>;
  if(stage==='source_unresolved'){exactJudgment(request.judgment,['stage','title','sourceKind','matchTitle','matchProperty']);proposalKind='source_identity';payload={resolutionMode:'create_new',existingSourceId:null,publisherId:null,candidateTitle:requiredText(request.judgment.title,'title'),candidateSourceKind:requiredText(request.judgment.sourceKind,'sourceKind'),candidateExternalIdentifier:null,publisherEvidence:'none',matchTitle:requiredBoolean(request.judgment.matchTitle,'matchTitle'),matchFilename:false,matchProperty:requiredBoolean(request.judgment.matchProperty,'matchProperty'),matchPublisher:false,matchUploader:false}}
  else if(stage==='edition_unresolved'){exactJudgment(request.judgment,['stage','editionLabel','publicationPrecision','publicationYear','publicationMonth','publicationDay']);proposalKind='source_edition';payload={sourceId:readiness.sourceId,resolutionMode:'create_new',existingEditionId:null,editionLabel:nullableText(request.judgment.editionLabel),publicationPrecision:requiredText(request.judgment.publicationPrecision,'publicationPrecision'),publicationYear:nullableInteger(request.judgment.publicationYear),publicationMonth:nullableInteger(request.judgment.publicationMonth),publicationDay:nullableInteger(request.judgment.publicationDay)}}
  else if(stage==='representation_unresolved'){exactJudgment(request.judgment,['stage','representationRole','isPrimary']);proposalKind='artifact_representation';payload={sourceEditionId:readiness.editionId,artifactId:acquisition.artifact_id,representationRole:requiredText(request.judgment.representationRole,'representationRole'),isPrimary:requiredBoolean(request.judgment.isPrimary,'isPrimary'),contentEquivalenceState:'same_bytes'}}
  else if(stage==='upstream_provenance_unresolved'){exactJudgment(request.judgment,['stage','conclusion','affirmNoUpstream','rationale']);proposalKind='upstream_attribution';if(request.judgment.conclusion!=='no_upstream_required'||request.judgment.affirmNoUpstream!==true)throw opportunityError('validation','An explicit no-upstream affirmation is required.');payload={containingSourceEditionId:readiness.editionId,conclusion:'no_upstream_required',relationshipType:null,upstreamSourceId:null,upstreamSourceEditionId:null,upstreamEditionState:null,independenceAuthority:null,humanReviewRationale:requiredRationale(request.judgment.rationale),evidenceLocationIds:[]}}
  else throw opportunityError('revision_conflict','This provenance stage cannot be confirmed by this control.');
  const proposal=await executeProvenanceCommand({operation:'create_proposal',commandId:request.createCommandId,artifactAcquisitionId:request.artifactAcquisitionId,proposalKind,correctsProposalId:null,payload},actor,repository);
  return executeProvenanceCommand({operation:'decide_proposal',commandId:request.decisionCommandId,proposalId:proposal.proposalId,action:'confirm',expectedDecisionNumber:0,rationale:'Confirmed after reviewing the private source document.'},actor,repository);
}
function exactJudgment(value:Record<string,unknown>,keys:string[]){if(Object.keys(value).some(k=>!keys.includes(k))||keys.some(k=>!(k in value)))throw opportunityError('validation','Judgment contains invalid properties.')}
function requiredText(v:unknown,n:string){if(typeof v!=='string'||!v.trim()||v!==v.trim())throw opportunityError('validation',`${n} is invalid.`);return v}function nullableText(v:unknown){return v===null?null:requiredText(v,'value')}function requiredBoolean(v:unknown,n:string){if(typeof v!=='boolean')throw opportunityError('validation',`${n} is invalid.`);return v}function nullableInteger(v:unknown){if(v===null)return null;if(!Number.isSafeInteger(v))throw opportunityError('validation','Date component is invalid.');return v as number}
function requiredRationale(v:unknown){const value=requiredText(v,'rationale');if([...value].length>2000||/[\u0000-\u001f\u007f-\u009f]/u.test(value))throw opportunityError('validation','rationale is invalid.');return value}
