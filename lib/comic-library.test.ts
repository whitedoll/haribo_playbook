import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { ComicZipError } from "@/lib/comic-zip";
import { addComic, getComicBytes, listComics } from "@/lib/comic-library";

function bytesOf(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function validComicZipBytes(): Uint8Array {
  return zipSync({ "page1.png": bytesOf("page-1") });
}

let baseDir: string;

beforeEach(async () => {
  baseDir = await mkdtemp(path.join(tmpdir(), "comic-library-test-"));
});

afterEach(async () => {
  await rm(baseDir, { recursive: true, force: true });
});

describe("comic-library", () => {
  test("zip을 저장하면 목록에서 조회할 수 있다", async () => {
    const entry = await addComic("comic.zip", validComicZipBytes(), baseDir);

    const entries = await listComics(baseDir);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ id: entry.id, name: "comic.zip" });

    const bytes = await getComicBytes(entry.id, baseDir);
    expect(bytes).toEqual(validComicZipBytes());
  });

  test("보관 개수가 2개를 초과하면 가장 오래된 zip이 즉시 삭제된다", async () => {
    const first = await addComic("first.zip", validComicZipBytes(), baseDir);
    const second = await addComic("second.zip", validComicZipBytes(), baseDir);
    const third = await addComic("third.zip", validComicZipBytes(), baseDir);

    const entries = await listComics(baseDir);
    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.id)).toEqual([third.id, second.id]);

    expect(await getComicBytes(first.id, baseDir)).toBeNull();
    expect(await getComicBytes(second.id, baseDir)).not.toBeNull();
    expect(await getComicBytes(third.id, baseDir)).not.toBeNull();
  });

  test("최신순으로 목록을 반환한다", async () => {
    const first = await addComic("first.zip", validComicZipBytes(), baseDir);
    const second = await addComic("second.zip", validComicZipBytes(), baseDir);

    const entries = await listComics(baseDir);
    expect(entries.map((entry) => entry.id)).toEqual([second.id, first.id]);
  });

  test("유효하지 않은 zip은 저장하지 않고 에러를 던진다", async () => {
    const corrupted = new Uint8Array([1, 2, 3]);

    await expect(addComic("broken.zip", corrupted, baseDir)).rejects.toThrow(
      ComicZipError
    );
    expect(await listComics(baseDir)).toEqual([]);
  });

  test("존재하지 않는 id는 null을 반환한다", async () => {
    expect(await getComicBytes("no-such-id", baseDir)).toBeNull();
  });
});
