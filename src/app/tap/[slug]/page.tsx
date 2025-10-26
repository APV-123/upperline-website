import { TapClient } from "./TapClient";

export default function TapPage({ params }: { params: { slug: string } }) {
  const owner = (params.slug ?? "").toLowerCase();
  return <TapClient owner={owner} />;
}
