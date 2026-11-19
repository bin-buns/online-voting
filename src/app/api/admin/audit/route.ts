import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { getSessionProfile } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  try {
    const { action, detail, category } = await req.json();
    await logAudit({ action, detail, category });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}