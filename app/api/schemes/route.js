import { NextResponse } from "next/server";
import schemes from "../../../public/data/schemes.json";

const byId = new Map(schemes.map((scheme) => [scheme.id, scheme]));

export async function POST(request) {
  try {
    const body = await request.json();
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id) => typeof id === "string").slice(0, 100) : [];
    const selected = ids.map((id) => byId.get(id)).filter(Boolean);
    return NextResponse.json({ schemes: selected });
  } catch {
    return NextResponse.json({ schemes: [] }, { status: 400 });
  }
}
