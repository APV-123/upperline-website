export type SubjectProposalType = 'new_property' | 'existing_property';
export type SubjectDecisionAction = 'confirm' | 'reject' | 'ambiguous';
export type ReviewedAlias = { aliasType: 'property_name' | 'other'; aliasValue: string };
export type PropertyMatch = { entityId: string; displayName: string; matchedBy: 'display_name' | 'alias' };
export type PropertyIdentityModel = {
  opportunityId: string; opportunityName: string;
  authorityState: 'unresolved' | 'confirmed' | 'rejected' | 'ambiguous';
  current: null | { proposalId: string; entityId: string; opportunitySubjectId: string; displayName: string; proposalType: SubjectProposalType; decisionNumber: number; decidedAt: string };
  suggestion: { displayLabel: string; aliases: ReviewedAlias[]; supportingContext: string[] };
  possibleMatches: PropertyMatch[]; commandId: string;
};
export type ResolvePropertyIdentityInput = { action: SubjectDecisionAction; commandId: string; proposalType: SubjectProposalType; existingEntityId: string | null; displayLabel: string | null; aliases: ReviewedAlias[]; correctsProposalId: string | null };
export type ResolvePropertyIdentityResult = { proposalId: string; decisionNumber: number; decision: 'confirmed' | 'rejected' | 'ambiguous'; subjectEntityId: string | null; opportunitySubjectId: string | null; inserted: boolean };
