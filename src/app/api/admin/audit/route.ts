import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const { action, detail, category } = await req.json();
    await logAudit({ action, detail, category });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}