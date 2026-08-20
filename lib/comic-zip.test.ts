import { zipSync } from "fflate";
import { describe, expect, test } from "vitest";

import { ComicZipError, naturalCompare, parseComicZip } from "@/lib/comic-zip";

function bytesOf(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

describe("naturalCompare", () => {
  test("숫자를 인식해 page2가 page10보다 앞에 오도록 정렬한다", () => {
    const files = ["page10.jpg", "page2.jpg", "page1.jpg"];
    expect([...files].sort(naturalCompare)).toEqual([
      "page1.jpg",
      "page2.jpg",
      "page10.jpg",
    ]);
  });
});

describe("parseComicZip", () => {
  test("이미지 파일을 자연 정렬 순서의 데이터 URL 목록으로 반환한다", () => {
    const zip = zipSync({
      "page10.png": bytesOf("page-10"),
      "page2.png": bytesOf("page-2"),
      "page1.png": bytesOf("page-1"),
      "readme.txt": bytesOf("이미지가 아닌 파일"),
    });

    const pages = parseComicZip(zip);

    expect(pages.map((page) => page.name)).toEqual([
      "page1.png",
      "page2.png",
      "page10.png",
    ]);
    expect(pages[0].dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  test("__MACOSX 및 숨김 파일은 무시한다", () => {
    const zip = zipSync({
      "page1.jpg": bytesOf("page-1"),
      "__MACOSX/page1.jpg": bytesOf("junk"),
      ".DS_Store": bytesOf("junk"),
    });

    const pages = parseComicZip(zip);

    expect(pages.map((page) => page.name)).toEqual(["page1.jpg"]);
  });

  test("이미지가 하나도 없으면 에러를 던진다", () => {
    const zip = zipSync({ "readme.txt": bytesOf("텍스트만 있음") });

    expect(() => parseComicZip(zip)).toThrow(ComicZipError);
  });

  test("손상된 zip 바이트를 넘기면 에러를 던진다", () => {
    const corrupted = new Uint8Array([1, 2, 3, 4, 5]);

    expect(() => parseComicZip(corrupted)).toThrow(ComicZipError);
  });
});
