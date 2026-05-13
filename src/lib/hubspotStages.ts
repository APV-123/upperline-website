export const HUBSPOT_DEAL_STAGES = [
  { label: 'Introduced', id: '3604434673' },
  { label: 'Engaged', id: '3604434674' },
  { label: 'Soft Interest', id: '3604434675' },
  { label: 'Docs / IC Review', id: '3604434676' },
  { label: 'Committed', id: '3604434677' },
  { label: 'Funded', id: '3604434678' },
  { label: 'Passed', id: '3604434679' },
  { label: 'Deferred / Recycle', id: '3604426446' },
] as const;

// Helpful helpers 👇
export const STAGE_ID_TO_LABEL = Object.fromEntries(
  HUBSPOT_DEAL_STAGES.map((s) => [s.id, s.label])
);

export const STAGE_LABEL_TO_ID = Object.fromEntries(
  HUBSPOT_DEAL_STAGES.map((s) => [s.label, s.id])
);