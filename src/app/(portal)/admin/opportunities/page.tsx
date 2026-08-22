import AdminNav from '@/components/navigation/AdminNav';
import OpportunityListClient from '@/components/opportunities/OpportunityListClient';
import { Suspense } from 'react';
export default function OpportunitiesPage() { return <><AdminNav /><Suspense fallback={<div style={{ padding: 24 }}>Loading Opportunities…</div>}><OpportunityListClient /></Suspense></>; }
