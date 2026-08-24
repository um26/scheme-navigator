import { notFound } from "next/navigation";
import schemes from "../../../public/data/schemes.json";
import SchemeDetailClient from "../../../components/SchemeDetailClient";

export default function SchemeDetailPage({ params }) {
  const scheme = schemes.find((s) => s.id === params.id);
  if (!scheme) notFound();

  // The canonical English scheme object is tiny enough to pass as a prop. The client
  // language provider overlays the selected offline translation pack, so changing
  // language updates the complete detail page without changing IDs/rule-engine data.
  return <SchemeDetailClient scheme={scheme} />;
}
