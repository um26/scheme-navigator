import { notFound } from "next/navigation";
import schemes from "../../../public/data/schemes.json";
import SchemeDetailClient from "../../../components/SchemeDetailClient";

export default function SchemeDetailPage({ params, searchParams }) {
  const scheme = schemes.find((s) => s.id === params.id);
  if (!scheme) notFound();

  const rawReturnTo = typeof searchParams?.returnTo === "string" ? searchParams.returnTo : "";
  const returnTo = rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//") ? rawReturnTo : null;

  return <SchemeDetailClient scheme={scheme} returnTo={returnTo} />;
}
