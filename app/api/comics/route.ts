import { NextResponse } from "next/server";

import { addComic, EXAMPLE_ENTRIES, listComics } from "@/lib/comic-library";
import { ComicZipError } from "@/lib/comic-zip";

export async function GET() {
  const entries = await listComics();
  // 업로드 기록이 없으면(배포 직후 등) 예제 zip을 대신 보여준다.
  return NextResponse.json({ entries: entries.length > 0 ? entries : EXAMPLE_ENTRIES });
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
