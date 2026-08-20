import { unzipSync } from "fflate";

export type ComicPage = {
  name: string;
  dataUrl: string;
};

export class ComicZipError extends Error {}

const IMAGE_EXTENSION = /\.(jpe?g|png|webp|gif)$/i;
const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function isImageEntry(path: string): boolean {
  const name = path.split("/").pop() ?? "";
  if (!name || name.startsWith(".")) return false;
  if (path.startsWith("__MACOSX/")) return false;
  return IMAGE_EXTENSION.test(name);
}

function mimeTypeFor(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

function toBase64(bytes: Uint8Array): string {
  let result = "";
  const length = bytes.length;
  for (let i = 0; i < length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < length ? bytes[i + 1] : undefined;
    const b2 = i + 2 < length ? bytes[i + 2] : undefined;

    result += BASE64_CHARS[b0 >> 2];
    result +=
      BASE64_CHARS[((b0 & 0x03) << 4) | (b1 !== undefined ? b1 >> 4 : 0)];
    result +=
      b1 !== undefined
        ? BASE64_CHARS[((b1 & 0x0f) << 2) | (b2 !== undefined ? b2 >> 6 : 0)]
        : "=";
    result += b2 !== undefined ? BASE64_CHARS[b2 & 0x3f] : "=";
  }
  return result;
}

/** "page2.jpg"가 "page10.jpg"보다 앞에 오도록 숫자를 인식해 비교한다. */
export function naturalCompare(a: string, b: string): number {
  const toChunks = (value: string) => value.match(/\d+|\D+/g) ?? [];
  const chunksA = toChunks(a);
  const chunksB = toChunks(b);
  const length = Math.max(chunksA.length, chunksB.length);

  for (let i = 0; i < length; i++) {
    const chunkA = chunksA[i] ?? "";
    const chunkB = chunksB[i] ?? "";
    if (chunkA === chunkB) continue;

    const bothNumeric = /^\d+$/.test(chunkA) && /^\d+$/.test(chunkB);
    if (bothNumeric) {
      const diff = Number(chunkA) - Number(chunkB);
      if (diff !== 0) return diff;
    } else {
      return chunkA < chunkB ? -1 : 1;
    }
  }
  return 0;
}

/** zip 안의 이미지 파일을 파일명 자연 정렬 순서로 읽어 데이터 URL 목록으로 반환한다. */
export function parseComicZip(bytes: Uint8Array): ComicPage[] {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch {
    throw new ComicZipError("zip 파일을 열 수 없습니다.");
  }

  const pages = Object.entries(entries)
    .filter(([path, content]) => isImageEntry(path) && content.length > 0)
    .sort(([a], [b]) => naturalCompare(a, b))
    .map(([path, content]) => ({
      name: path,
      dataUrl: `data:${mimeTypeFor(path)};base64,${toBase64(content)}`,
    }));

  if (pages.length === 0) {
    throw new ComicZipError("이미지가 있는 만화책 zip이 아닙니다.");
  }

  return pages;
}
