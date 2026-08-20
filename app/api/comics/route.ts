import { NextResponse } from "next/server";

import { addComic, listComics } from "@/lib/comic-library";
import { ComicZipError } from "@/lib/comic-zip";

export async function GET() {
  const entries = await listComics();
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "zip 파일이 필요합니다." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    const entry = await addComic(file.name, bytes);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof ComicZipError
        ? error.message
        : "zip 파일을 저장하는 중 문제가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
