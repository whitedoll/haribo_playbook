import { NextResponse } from "next/server";

import { getComicBytes } from "@/lib/comic-library";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bytes = await getComicBytes(id);

  if (!bytes) {
    return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
  }

  return new NextResponse(Buffer.from(bytes), {
    headers: { "Content-Type": "application/zip" },
  });
}
