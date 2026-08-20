"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import type { LibraryEntry } from "@/lib/comic-library";
import {
  findSpreadStartForPage,
  getSpreadPageIndices,
  getSpreadStarts,
  nextSpreadStart,
  orderForDisplay,
  prevSpreadStart,
  type ReadingDirection,
} from "@/lib/comic-spread";
import { ComicZipError, parseComicZip, type ComicPage } from "@/lib/comic-zip";

type ViewMode = "single" | "double";

type ReaderStatus =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "reading"; pages: ComicPage[] };

/** 클릭한 쪽(side)이 방향 설정에 따라 '다음 장'인지 판단한다. */
function isNextSide(side: "left" | "right", direction: ReadingDirection): boolean {
  return direction === "rtl" ? side === "left" : side === "right";
}

export function ComicReader() {
  const [status, setStatus] = useState<ReaderStatus>({ kind: "idle" });
  const [pageIndex, setPageIndex] = useState(0);
  const [direction, setDirection] = useState<ReadingDirection>("rtl");
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [currentComicId, setCurrentComicId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();
  const directionSelectId = useId();
  const viewModeSelectId = useId();

  async function fetchLibraryEntries(): Promise<LibraryEntry[] | null> {
    try {
      const response = await fetch("/api/comics");
      if (!response.ok) return null;
      const data = (await response.json()) as { entries: LibraryEntry[] };
      return data.entries;
    } catch {
      return null;
    }
  }

  function refreshLibrary() {
    void fetchLibraryEntries().then((entries) => {
      if (entries) setLibrary(entries);
    });
  }

  useEffect(() => {
    let ignore = false;
    void fetchLibraryEntries().then((entries) => {
      if (!ignore && entries) setLibrary(entries);
    });
    return () => {
      ignore = true;
    };
  }, []);

  // 읽는 위치(페이지/보기 모드)가 바뀔 때마다 서버에 저장해 다음에 다시 열 때
  // 이어볼 수 있게 한다. 실패해도 읽기 흐름은 계속 진행한다.
  useEffect(() => {
    if (status.kind !== "reading" || !currentComicId) return;
    void fetch(`/api/comics/${currentComicId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageIndex, viewMode }),
    }).catch(() => {});
  }, [status.kind, currentComicId, pageIndex, viewMode]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/comics", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        entry?: LibraryEntry;
        error?: string;
      };
      if (!response.ok || !data.entry) {
        setStatus({
          kind: "error",
          message: data.error ?? "zip 파일을 저장하는 중 문제가 발생했습니다.",
        });
        return;
      }

      const pages = parseComicZip(bytes);
      setPageIndex(0);
      setViewMode("single");
      setCurrentComicId(data.entry.id);
      setStatus({ kind: "reading", pages });
      void refreshLibrary();
    } catch (error) {
      const message =
        error instanceof ComicZipError
          ? error.message
          : "zip 파일을 읽는 중 문제가 발생했습니다.";
      setStatus({ kind: "error", message });
    }
  }

  async function openLibraryEntry(entry: LibraryEntry) {
    try {
      const response = await fetch(`/api/comics/${entry.id}`);
      if (!response.ok) {
        setStatus({ kind: "error", message: "선택한 zip을 열 수 없습니다." });
        void refreshLibrary();
        return;
      }
      const buffer = await response.arrayBuffer();
      const pages = parseComicZip(new Uint8Array(buffer));
      setPageIndex(entry.lastPosition?.pageIndex ?? 0);
      setViewMode(entry.lastPosition?.viewMode ?? "single");
      setCurrentComicId(entry.id);
      setStatus({ kind: "reading", pages });
    } catch {
      setStatus({ kind: "error", message: "선택한 zip을 열 수 없습니다." });
    }
  }

  function turn(side: "left" | "right") {
    if (status.kind !== "reading") return;
    const pageCount = status.pages.length;
    const isNext = isNextSide(side, direction);

    setPageIndex((current) => {
      if (viewMode === "single") {
        return Math.min(Math.max(current + (isNext ? 1 : -1), 0), pageCount - 1);
      }
      const starts = getSpreadStarts(pageCount);
      return isNext
        ? nextSpreadStart(starts, current)
        : prevSpreadStart(starts, current);
    });
  }

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);
    // 한 장 → 두 장 전환 시에는 보던 페이지가 포함된 스프레드로 이어서 보여준다.
    // 두 장 → 한 장 전환 시에는 현재 스프레드의 시작 페이지가 이미 유효한 한 장
    // 페이지 인덱스이므로 그대로 이어서 보여준다.
    if (status.kind === "reading" && mode === "double") {
      const pageCount = status.pages.length;
      setPageIndex((current) => findSpreadStartForPage(current, pageCount));
    }
  }

  function reset() {
    setStatus({ kind: "idle" });
    setPageIndex(0);
    setCurrentComicId(null);
    void refreshLibrary();
  }

  if (status.kind === "reading") {
    const pageCount = status.pages.length;
    const leftIsNext = isNextSide("left", direction);
    const displayIndices =
      viewMode === "single"
        ? [pageIndex]
        : orderForDisplay(getSpreadPageIndices(pageIndex, pageCount), direction);
    const counterLabel =
      displayIndices.length === 2
        ? `${Math.min(...displayIndices) + 1}-${Math.max(...displayIndices) + 1} / ${pageCount}`
        : `${displayIndices[0] + 1} / ${pageCount}`;

    return (
      <div className="flex flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-4 py-2">
          <span className="text-sm text-muted-foreground">{counterLabel}</span>
          <div className="flex items-center gap-2">
            <label htmlFor={viewModeSelectId} className="text-sm">
              보기 모드
            </label>
            <select
              id={viewModeSelectId}
              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              value={viewMode}
              onChange={(event) => changeViewMode(event.target.value as ViewMode)}
            >
              <option value="single">한 장 보기</option>
              <option value="double">두 장 보기</option>
            </select>
            <label htmlFor={directionSelectId} className="text-sm">
              넘기는 방향
            </label>
            <select
              id={directionSelectId}
              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              value={direction}
              onChange={(event) =>
                setDirection(event.target.value as ReadingDirection)
              }
            >
              <option value="rtl">오른쪽에서 왼쪽으로</option>
              <option value="ltr">왼쪽에서 오른쪽으로</option>
            </select>
            <Button variant="outline" size="sm" onClick={reset}>
              다른 zip 업로드
            </Button>
          </div>
        </header>
        <div className="relative flex flex-1 items-center justify-center gap-1 bg-black">
          {displayIndices.map((index) => (
            <img
              key={index}
              src={status.pages[index].dataUrl}
              alt={`${index + 1}쪽`}
              className="max-h-full max-w-full select-none object-contain"
              style={{ maxWidth: displayIndices.length === 2 ? "50%" : undefined }}
            />
          ))}
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
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-2xl font-semibold">만화책 zip 리더</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        만화책 이미지가 담긴 zip 파일을 올리면 압축을 풀지 않고 바로 읽을 수 있습니다.
      </p>
      <div className="flex flex-col items-center gap-2">
        <Button type="button" onClick={() => fileInputRef.current?.click()}>
          zip 파일 선택
        </Button>
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          aria-label="zip 파일 선택"
          accept=".zip,application/zip,application/x-zip-compressed"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {status.kind === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {status.message}
        </p>
      )}
      {library.length > 0 && (
        <div className="w-full max-w-sm text-left">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
            최근 zip
          </h2>
          <ul className="flex flex-col gap-1">
            {library.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => openLibraryEntry(entry)}
                  className="w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  {entry.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
