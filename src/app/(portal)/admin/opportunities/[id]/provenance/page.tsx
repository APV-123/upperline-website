import AdminNav from '@/components/navigation/AdminNav';
import ProvenanceControl from '@/components/intelligence/ProvenanceControl';
export default async function ProvenancePage({params}:{params:Promise<{id:string}>}){const{id}=await params;return <><AdminNav/><ProvenanceControl opportunityId={id}/></>}
