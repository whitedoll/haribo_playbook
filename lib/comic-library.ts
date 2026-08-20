import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseComicZip } from "@/lib/comic-zip";

export type ReadingPosition = {
  pageIndex: number;
  viewMode: "single" | "double";
};

export type LibraryEntry = {
  id: string;
  name: string;
  createdAt: string;
  lastPosition?: ReadingPosition;
};

const MAX_ENTRIES = 2;
const MANIFEST_FILE = "manifest.json";

function defaultBaseDir(): string {
  return path.join(process.cwd(), ".data", "comics");
}

function zipPath(baseDir: string, id: string): string {
  return path.join(baseDir, `${id}.zip`);
}

async function readManifest(baseDir: string): Promise<LibraryEntry[]> {
  try {
    const raw = await readFile(path.join(baseDir, MANIFEST_FILE), "utf8");
    return JSON.parse(raw) as LibraryEntry[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeManifest(baseDir: string, entries: LibraryEntry[]): Promise<void> {
  await mkdir(baseDir, { recursive: true });
  await writeFile(
    path.join(baseDir, MANIFEST_FILE),
    JSON.stringify(entries, null, 2)
  );
}

/** 보관 중인 zip 목록을 최신순으로 반환한다. */
export async function listComics(
  baseDir: string = defaultBaseDir()
): Promise<LibraryEntry[]> {
  return readManifest(baseDir);
}

/**
 * zip을 검증(유효하지 않으면 ComicZipError)한 뒤 저장하고, 보관 개수가 2개를
 * 초과하면 가장 오래된 zip을 확인 없이 즉시 삭제한다.
 */
export async function addComic(
  name: string,
  bytes: Uint8Array,
  baseDir: string = defaultBaseDir()
): Promise<LibraryEntry> {
  parseComicZip(bytes);

  await mkdir(baseDir, { recursive: true });
  const existing = await readManifest(baseDir);
  const entry: LibraryEntry = {
    id: randomUUID(),
    name,
    createdAt: new Date().toISOString(),
  };

  await writeFile(zipPath(baseDir, entry.id), bytes);

  const updated = [entry, ...existing];
  const kept = updated.slice(0, MAX_ENTRIES);
  const evicted = updated.slice(MAX_ENTRIES);

  await Promise.all(
    evicted.map((old) => rm(zipPath(baseDir, old.id), { force: true }))
  );
  await writeManifest(baseDir, kept);

  return entry;
}

/**
 * 보관 목록에 남아 있는 zip의 마지막 읽던 위치를 갱신한다. 이미 삭제되어 목록에
 * 없는 id라면 아무것도 하지 않고 false를 반환한다(이어보기 기록도 함께 사라짐).
 */
export async function updateComicPosition(
  id: string,
  position: ReadingPosition,
  baseDir: string = defaultBaseDir()
): Promise<boolean> {
  const entries = await readManifest(baseDir);
  const index = entries.findIndex((entry) => entry.id === id);
  if (index === -1) return false;

  entries[index] = { ...entries[index], lastPosition: position };
  await writeManifest(baseDir, entries);
  return true;
}

/** 보관 목록에 남아 있는 zip의 원본 바이트를 반환한다. 삭제되었거나 없으면 null. */
export async function getComicBytes(
  id: string,
  baseDir: string = defaultBaseDir()
): Promise<Uint8Array | null> {
  const entries = await readManifest(baseDir);
  if (!entries.some((entry) => entry.id === id)) return null;

  try {
    const buffer = await readFile(zipPath(baseDir, id));
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}
