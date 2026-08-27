import { notFound } from "next/navigation";
import schemes from "../../../public/data/schemes.json";
import changes from "../../../public/data/scheme-changes.json";
import SchemeDetailClient from "../../../components/SchemeDetailClient";
import { getSimilarSchemes } from "../../../lib/similarSchemes";

export default function SchemeDetailPage({ params, searchParams }) {
  const scheme = schemes.find((s) => s.id === params.id);
  if (!scheme) notFound();

  const rawReturnTo = typeof searchParams?.returnTo === "string" ? searchParams.returnTo : "";
  const returnTo = rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//") ? rawReturnTo : null;
  const relatedSchemes = getSimilarSchemes(scheme, schemes, 8);
  const changeInfo = changes?.updated?.find((item) => item.id === scheme.id)
    || changes?.added?.find((item) => item.id === scheme.id)
    || null;

  return <SchemeDetailClient scheme={scheme} returnTo={returnTo} relatedSchemes={relatedSchemes} changeInfo={changeInfo} />;
}
