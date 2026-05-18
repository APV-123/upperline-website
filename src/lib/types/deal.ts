export type Bucket = 'committed' | 'circling' | 'needs_touch' | 'passed';

export type InvestorRow = {
  dealId: string;
  contactId: string | null;
  investorName: string;
  investorEmail: string | null;
  amount: number;
  dealstage: string | null;
  dealstageLabel: string | null;
  bucket: Bucket;
  pipeline: string | null;
  raise_id: string | null;
  hs_lastactivitydate: string | null;
  hs_lastmodifieddate: string | null;
};

export type ProspectRow = {
  id: string;
  raise_id: string;
  contact_id: string;
  contact_name: string | null;
  contact_email: string | null;
  status: string | null;

  invite_status: string | null;
  invite_subject: string | null;
  invite_body: string | null;
  invite_method: string | null;

  created_at: string | null;
  invited_at: string | null;
  declined_at: string | null;
};