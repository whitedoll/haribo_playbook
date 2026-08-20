"use client";

import { useId, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { ComicZipError, parseComicZip, type ComicPage } from "@/lib/comic-zip";

type Direction = "rtl" | "ltr";

type ReaderStatus =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "reading"; pages: ComicPage[] };

/** 클릭한 쪽(side)이 방향 설정에 따라 '다음 장'인지 판단한다. */
function isNextSide(side: "left" | "right", direction: Direction): boolean {
  return direction === "rtl" ? side === "left" : side === "right";
}

export function ComicReader() {
  const [status, setStatus] = useState<ReaderStatus>({ kind: "idle" });
  const [pageIndex, setPageIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>("rtl");
  const fileInputId = useId();
  const directionSelectId = useId();

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const pages = parseComicZip(new Uint8Array(buffer));
      setPageIndex(0);
      setStatus({ kind: "reading", pages });
    } catch (error) {
      const message =
        error instanceof ComicZipError
          ? error.message
          : "zip 파일을 읽는 중 문제가 발생했습니다.";
      setStatus({ kind: "error", message });
    }
  }

  function turn(side: "left" | "right") {
    if (status.kind !== "reading") return;
    const pageCount = status.pages.length;
    const delta = isNextSide(side, direction) ? 1 : -1;
    setPageIndex((current) => Math.min(Math.max(current + delta, 0), pageCount - 1));
  }

  function reset() {
    setStatus({ kind: "idle" });
    setPageIndex(0);
  }

  if (status.kind === "reading") {
    const page = status.pages[pageIndex];
    const leftIsNext = isNextSide("left", direction);

    return (
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-2">
          <span className="text-sm text-muted-foreground">
            {pageIndex + 1} / {status.pages.length}
          </span>
          <div className="flex items-center gap-2">
            <label htmlFor={directionSelectId} className="text-sm">
              넘기는 방향
            </label>
            <select
              id={directionSelectId}
              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              value={direction}
              onChange={(event) => setDirection(event.target.value as Direction)}
            >
              <option value="rtl">오른쪽에서 왼쪽으로</option>
              <option value="ltr">왼쪽에서 오른쪽으로</option>
            </select>
            <Button variant="outline" size="sm" onClick={reset}>
              다른 zip 업로드
            </Button>
          </div>
        </header>
        <div className="relative flex flex-1 items-center justify-center bg-black">
          <img
            src={page.dataUrl}
            alt={`${pageIndex + 1}쪽`}
            className="max-h-full max-w-full select-none object-contain"
          />
          <button
            type="button"
            aria-label={leftIsNext ? "다음 장" : "이전 장"}
            onClick={() => turn("left")}
            className="absolute inset-y-0 left-0 z-10 w-1/2 cursor-pointer hover:bg-white/5"
          />
          <button
            type="button"
            aria-label={leftIsNext ? "이전 장" : "다음 장"}
            onClick={() => turn("right")}
            className="absolute inset-y-0 right-0 z-10 w-1/2 cursor-pointer hover:bg-white/5"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">만화책 zip 리더</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        만화책 이미지가 담긴 zip 파일을 올리면 압축을 풀지 않고 바로 읽을 수 있습니다.
      </p>
      <div className="flex flex-col items-center gap-2">
        <label htmlFor={fileInputId} className="text-sm font-medium">
          zip 파일 선택
        </label>
        <input
          id={fileInputId}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          onChange={handleFileChange}
          className="text-sm"
        />
      </div>
      {status.kind === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {status.message}
        </p>
      )}
    </div>
  );
}
