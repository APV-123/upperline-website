import { opportunityError } from '../../opportunities/application/errors';

export type HumanStageRequest={operation:'confirm_stage';opportunityId:string;artifactAcquisitionId:string;createCommandId:string;decisionCommandId:string;judgment:Record<string,unknown>};

export function parseHumanStage(value:unknown):HumanStageRequest{
  if(!value||typeof value!=='object'||Array.isArray(value))throw opportunityError('validation','Request must be an object.');
  const r=value as Record<string,unknown>;const keys=['operation','opportunityId','artifactAcquisitionId','createCommandId','decisionCommandId','judgment'];
  if(Object.keys(r).some(k=>!keys.includes(k))||keys.some(k=>!(k in r))||r.operation!=='confirm_stage'||!r.judgment||typeof r.judgment!=='object'||Array.isArray(r.judgment))throw opportunityError('validation','Request contains invalid properties.');
  for(const k of ['opportunityId','artifactAcquisitionId','createCommandId','decisionCommandId'])if(typeof r[k]!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(r[k] as string))throw opportunityError('validation',`${k} is invalid.`);
  return r as HumanStageRequest;
}
