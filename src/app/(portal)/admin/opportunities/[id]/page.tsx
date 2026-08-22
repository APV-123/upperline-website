import AdminNav from '@/components/navigation/AdminNav'; import OpportunityWorkspace from '@/components/opportunities/OpportunityWorkspace';
export default async function OpportunityPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <><AdminNav/><OpportunityWorkspace opportunityId={id}/></>}
