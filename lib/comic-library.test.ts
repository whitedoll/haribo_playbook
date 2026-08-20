import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { ComicZipError } from "@/lib/comic-zip";
import {
  addComic,
  EXAMPLE_ENTRIES,
  getComicBytes,
  getExampleBytes,
  listComics,
  updateComicPosition,
} from "@/lib/comic-library";
import { parseComicZip } from "@/lib/comic-zip";

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

  test("읽던 위치를 저장하면 목록 조회 시 함께 반환된다", async () => {
    const entry = await addComic("comic.zip", validComicZipBytes(), baseDir);

    const updated = await updateComicPosition(
      entry.id,
      { pageIndex: 5, viewMode: "double" },
      baseDir
    );
    expect(updated).toBe(true);

    const entries = await listComics(baseDir);
    expect(entries[0].lastPosition).toEqual({ pageIndex: 5, viewMode: "double" });
  });

  test("삭제되어 없는 zip의 위치를 저장하려 하면 아무것도 하지 않고 false를 반환한다", async () => {
    const updated = await updateComicPosition(
      "no-such-id",
      { pageIndex: 1, viewMode: "single" },
      baseDir
    );
    expect(updated).toBe(false);
  });

  test("2개 초과로 zip이 자동 삭제되면 그 이어보기 기록도 함께 사라진다", async () => {
    const first = await addComic("first.zip", validComicZipBytes(), baseDir);
    await updateComicPosition(first.id, { pageIndex: 3, viewMode: "single" }, baseDir);

    await addComic("second.zip", validComicZipBytes(), baseDir);
    await addComic("third.zip", validComicZipBytes(), baseDir); // first를 밀어냄

    const entries = await listComics(baseDir);
    expect(entries.some((entry) => entry.id === first.id)).toBe(false);

    const updatedAfterEviction = await updateComicPosition(
      first.id,
      { pageIndex: 4, viewMode: "single" },
      baseDir
    );
    expect(updatedAfterEviction).toBe(false);
  });

  test.each(EXAMPLE_ENTRIES)(
    "예제 zip($name)은 업로드 기록 없이도 public/examples/에서 읽을 수 있는 유효한 zip이다",
    async ({ id }) => {
      const bytes = await getExampleBytes(id);
      expect(bytes).not.toBeNull();
      expect(() => parseComicZip(bytes as Uint8Array)).not.toThrow();
    }
  );

  test("존재하지 않는 예제 id는 null을 반환한다", async () => {
    expect(await getExampleBytes("no-such-example")).toBeNull();
  });
});
