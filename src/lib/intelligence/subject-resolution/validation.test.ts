import { describe,expect,it } from 'vitest';
import { parseResolutionRequest } from './validation';
const commandId='10000000-0000-4000-8000-000000000001';
const valid={action:'confirm',commandId,proposalType:'new_property',existingEntityId:null,displayLabel:'NW Corner of Mason Rd. @ Mason Manor Dr.',aliases:[{aliasType:'property_name',aliasValue:'Mason Rd / Mason Manor Dr'}],correctsProposalId:null};
describe('Property identity request boundary',()=>{
  it('admits the reviewed Mason identity intent without implying objective Property facts',()=>expect(parseResolutionRequest(valid)).toEqual(valid));
  it.each(['reviewerEmail','decidedAt','authorityState','fingerprint','requestDigest','materializedEntityId','sourceAuthority','observationAuthority'])('rejects browser authority property %s',key=>expect(()=>parseResolutionRequest({...valid,[key]:'forged'})).toThrow('invalid properties'));
  it('requires a preselected entity shape for reuse',()=>expect(()=>parseResolutionRequest({...valid,proposalType:'existing_property'})).toThrow('Existing Property'));
  it('rejects arbitrary alias fields and unsupported parcel semantics',()=>expect(()=>parseResolutionRequest({...valid,aliases:[{aliasType:'parcel_number',aliasValue:'123',apn:'123'}]})).toThrow());
  it('retains reject and ambiguous as non-confirming judgments',()=>{expect(parseResolutionRequest({...valid,action:'reject'}).action).toBe('reject');expect(parseResolutionRequest({...valid,action:'ambiguous'}).action).toBe('ambiguous')});
});
