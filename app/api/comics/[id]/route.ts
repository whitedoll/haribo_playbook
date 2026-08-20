import { NextResponse } from "next/server";

import { getComicBytes, getExampleBytes, updateComicPosition } from "@/lib/comic-library";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bytes = (await getExampleBytes(id)) ?? (await getComicBytes(id));

  if (!bytes) {
    return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
  }

  return new NextResponse(Buffer.from(bytes), {
    headers: { "Content-Type": "application/zip" },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as {
    pageIndex?: unknown;
    viewMode?: unknown;
  };

  if (
    typeof body.pageIndex !== "number" ||
    (body.viewMode !== "single" && body.viewMode !== "double")
  ) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const updated = await updateComicPosition(id, {
    pageIndex: body.pageIndex,
    viewMode: body.viewMode,
  });

  return NextResponse.json({ updated });
}
