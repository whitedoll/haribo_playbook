"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";

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
import {
  getStripClipPath,
  getStripDelay,
  getTurnDirection,
  PAGE_TURN_STRIP_COUNT,
  PAGE_TURN_TOTAL_MS,
  type TurnDirection,
} from "@/lib/page-turn-animation";

type ViewMode = "single" | "double";

/** 오버레이가 차지할 영역. 두 장 보기에서 넘어가는 쪽 페이지만 굽을 때는
 * "left"/"right" 절반만, 표지처럼 한 장만 보이는 경계에서는 "full"을 쓴다. */
type TurnOverlaySlot = "full" | TurnDirection;

type TurnOverlay = {
  id: number;
  imageUrl: string;
  turnDirection: TurnDirection;
  slot: TurnOverlaySlot;
};

type ReaderStatus =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "reading"; pages: ComicPage[] };

/** 클릭한 쪽(side)이 방향 설정에 따라 '다음 장'인지 판단한다. */
function isNextSide(side: "left" | "right", direction: ReadingDirection): boolean {
  return direction === "rtl" ? side === "left" : side === "right";
}

/** 표지 이미지가 없는 최근 zip을 책장에서 서로 구별되는 색으로 보여주기 위한
 * 팔레트. public/cozy-bookshelf.html 무드보드의 책 색상을 그대로 가져왔다. */
const BOOK_PALETTES = [
  { from: "#3F6C6B", to: "#2C4E4D" },
  { from: "#9C4B33", to: "#7A3624" },
  { from: "#2E3F56", to: "#1F2C3D" },
  { from: "#6C7A54", to: "#515D3E" },
  { from: "#B77768", to: "#8F5849" },
];

/** zip의 id로부터 팔레트를 정해, 같은 zip은 다시 보아도 항상 같은 색을 갖게 한다. */
function paletteForId(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index++) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return BOOK_PALETTES[hash % BOOK_PALETTES.length];
}

function spineGradient(from: string, to: string): string {
  return `linear-gradient(180deg, ${from}, ${to})`;
}

/** 실제로 열 수 없는 장식용 책. 책장이 꽉 차 보이게 하는 배경 소품이라,
 * 실제 항목(zip 선택/보관 zip)과 달리 글자도 없고 클릭·마우스오버에도
 * 반응하지 않으며 스크린리더에도 노출하지 않는다. */
function DecorBook({
  width,
  height,
  from,
  to,
  lean,
  className,
}: {
  width: number;
  height: number;
  from: string;
  to: string;
  lean?: "lean" | "lean2";
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`filler-book pointer-events-none${lean ? ` ${lean}` : ""}${className ? ` ${className}` : ""}`}
      style={{ width, height, background: spineGradient(from, to) }}
    />
  );
}

export function ComicReader() {
  const [status, setStatus] = useState<ReaderStatus>({ kind: "idle" });
  const [pageIndex, setPageIndex] = useState(0);
  const [direction, setDirection] = useState<ReadingDirection>("rtl");
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [currentComicId, setCurrentComicId] = useState<string | null>(null);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [overlay, setOverlay] = useState<TurnOverlay | null>(null);
  const overlayIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();
  const directionSelectId = useId();
  const viewModeSelectId = useId();
  const animationToggleId = useId();

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

  // onAnimationEnd가 정상적으로 오버레이를 지우지만, 애니메이션이 재생되지
  // 않는 환경(예: prefers-reduced-motion, 테스트 환경)에서도 오버레이가 영영
  // 남지 않도록 CSS 애니메이션 길이(450ms)보다 약간 긴 시간 뒤에 대비용으로
  // 한 번 더 지운다.
  useEffect(() => {
    if (!overlay) return;
    const overlayId = overlay.id;
    const timeout = setTimeout(() => {
      setOverlay((current) => (current?.id === overlayId ? null : current));
    }, PAGE_TURN_TOTAL_MS + 350);
    return () => clearTimeout(timeout);
  }, [overlay]);

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
    const turnDirection = getTurnDirection(isNext, direction);

    if (viewMode === "single") {
      const nextIndex = Math.min(Math.max(pageIndex + (isNext ? 1 : -1), 0), pageCount - 1);
      if (nextIndex === pageIndex) return; // 맨 앞/뒤 페이지에서는 넘길 것이 없다.

      if (animationsEnabled) {
        overlayIdRef.current += 1;
        setOverlay({
          id: overlayIdRef.current,
          imageUrl: status.pages[pageIndex].dataUrl,
          turnDirection,
          slot: "full",
        });
      }
      // 애니메이션 재생 여부와 무관하게 실제 페이지는 클릭 즉시 반영한다.
      setPageIndex(nextIndex);
      return;
    }

    const starts = getSpreadStarts(pageCount);
    const nextStart = isNext
      ? nextSpreadStart(starts, pageIndex)
      : prevSpreadStart(starts, pageIndex);
    if (nextStart === pageIndex) return; // 맨 앞/뒤 스프레드에서는 넘길 것이 없다.

    if (animationsEnabled) {
      const currentDisplay = orderForDisplay(
        getSpreadPageIndices(pageIndex, pageCount),
        direction
      );
      overlayIdRef.current += 1;
      if (currentDisplay.length === 1) {
        // 표지처럼 한 장만 보이던 경계라서, 한 장 보기와 같이 전체가 굽는다.
        setOverlay({
          id: overlayIdRef.current,
          imageUrl: status.pages[currentDisplay[0]].dataUrl,
          turnDirection,
          slot: "full",
        });
      } else {
        // 넘어가는 쪽(turnDirection과 같은 쪽) 페이지만 낱장처럼 독립적으로
        // 굽고, 반대쪽 페이지는 애니메이션 없이 새 내용으로 바로 바뀐다.
        const outgoingIndex = turnDirection === "left" ? currentDisplay[0] : currentDisplay[1];
        setOverlay({
          id: overlayIdRef.current,
          imageUrl: status.pages[outgoingIndex].dataUrl,
          turnDirection,
          slot: turnDirection,
        });
      }
    }

    setPageIndex(nextStart);
  }

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);
    setOverlay(null); // 보기 모드가 바뀌면 진행 중이던 넘김 오버레이는 의미가 없어진다.
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
    setOverlay(null); // 다음에 열 zip에 이전 zip의 넘김 오버레이가 겹쳐 보이지 않게 한다.
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
            <label htmlFor={animationToggleId} className="flex items-center gap-1 text-sm">
              <input
                id={animationToggleId}
                type="checkbox"
                checked={animationsEnabled}
                onChange={(event) => setAnimationsEnabled(event.target.checked)}
              />
              넘김 애니메이션
            </label>
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
          {overlay && (
            <div
              key={overlay.id}
              data-testid="page-turn-overlay"
              data-direction={overlay.turnDirection}
              data-slot={overlay.slot}
              className="pointer-events-none absolute inset-y-0 z-20"
              style={{
                left: overlay.slot === "right" ? "50%" : 0,
                width: overlay.slot === "full" ? "100%" : "50%",
              }}
            >
              {Array.from({ length: PAGE_TURN_STRIP_COUNT }, (_, index) => {
                // 경첩에서 가장 먼 조각(자유단)이 먼저 움직이고 경첩 쪽 조각이
                // 가장 늦게 끝나므로, 그 "마지막 조각"에서만 오버레이를 지운다.
                const lastToFinishIndex =
                  overlay.turnDirection === "left" ? PAGE_TURN_STRIP_COUNT - 1 : 0;

                const delayMs = getStripDelay(
                  index,
                  PAGE_TURN_STRIP_COUNT,
                  overlay.turnDirection
                );

                return (
                  <div
                    key={index}
                    data-testid="page-turn-strip"
                    className="page-turn-strip absolute inset-0"
                    style={
                      {
                        clipPath: getStripClipPath(index, PAGE_TURN_STRIP_COUNT),
                        transformOrigin:
                          overlay.turnDirection === "left" ? "right center" : "left center",
                        "--turn-sign": overlay.turnDirection === "left" ? -1 : 1,
                        animationDelay: `${delayMs}ms`,
                      } as CSSProperties
                    }
                    onAnimationEnd={
                      index === lastToFinishIndex ? () => setOverlay(null) : undefined
                    }
                  >
                    <img
                      src={overlay.imageUrl}
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full select-none object-contain"
                    />
                    {/* 조각이 화면과 수직에 가까워질 때(가장 많이 굽었을 때) 그
                        조각 위로 그림자/하이라이트가 지나가게 해, 평평한 판이
                        아니라 종이가 접히는 것처럼 보이게 한다. */}
                    <div
                      className="page-turn-strip-shade absolute inset-0"
                      style={{
                        animationDelay: `${delayMs}ms`,
                        background:
                          overlay.turnDirection === "left"
                            ? "linear-gradient(to left, rgba(0,0,0,0.15), rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.85))"
                            : "linear-gradient(to right, rgba(0,0,0,0.15), rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.85))",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
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
    <div className="cozy-bookshelf-backdrop flex flex-1 flex-col items-center justify-center p-6 sm:p-10">
      <div className="cozy-bookshelf w-full max-w-xl">
        <p className="eyebrow">Comic Library</p>
        <h1 className="title text-2xl sm:text-3xl">Comic Zip Viewer</h1>
        <p className="subtitle text-sm">
          만화책 이미지가 담긴 zip 파일을 올리면 압축을 풀지 않고 바로 읽을 수 있습니다.
        </p>

        <div className="case">
          <div className="glow" aria-hidden="true" />

          {/* 1단: zip 파일 선택. 실제로 클릭 가능한 책 한 권과, 책장을 채우는
              장식용 책들 + 화분을 함께 둔다. */}
          <div className="shelf">
            <div className="row">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="book cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{ width: 36, height: 128, background: spineGradient("#C0932E", "#96701E") }}
              >
                <span className="book-spine">zip 파일 선택</span>
              </button>
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                aria-label="zip 파일 선택"
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={handleFileChange}
                className="hidden"
              />

              <DecorBook width={34} height={118} from="#3F6C6B" to="#2C4E4D" lean="lean" />
              <DecorBook width={30} height={104} from="#9C4B33" to="#7A3624" />
              <DecorBook width={26} height={96} from="#C0932E" to="#96701E" />
              <DecorBook width={38} height={126} from="#2E3F56" to="#1F2C3D" lean="lean2" />
              <DecorBook width={28} height={100} from="#6C7A54" to="#515D3E" />
              {/* 모바일 폭에서는 화분이 밀려나 떨어져 보이므로 이 책은 숨긴다. */}
              <DecorBook width={32} height={112} from="#B77768" to="#8F5849" className="hide-on-mobile" />

              <div className="plant" aria-hidden="true">
                <div className="leaves">
                  <div className="leaf" />
                  <div className="leaf" />
                  <div className="leaf" />
                </div>
                <div className="pot" />
              </div>
            </div>
            <div className="plank" />
          </div>

          {/* 2단: 최근 zip. 실제로 클릭 가능한 책(최대 2권)과, 그 옆을 채우는
              장식용 책 더미/책들을 함께 둔다. */}
          <div className="shelf">
            <div className="row">
              <div className="stack" aria-hidden="true">
                <div className="flat" style={{ width: 74, background: spineGradient("#6C7A54", "#515D3E") }} />
                <div className="flat" style={{ width: 64, background: spineGradient("#C0932E", "#96701E") }} />
              </div>
              <div
                className="flat-lean"
                aria-hidden="true"
                style={{ background: spineGradient("#9C4B33", "#7A3624") }}
              />

              {library.length === 0 ? (
                <p className="empty-hint">아직 열어본 zip이 없습니다.</p>
              ) : (
                library.map((entry) => {
                  const palette = paletteForId(entry.id);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => openLibraryEntry(entry)}
                      className="book cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      style={{ width: 34, height: 120, background: spineGradient(palette.from, palette.to) }}
                    >
                      <span className="book-spine line-clamp-1">{entry.name}</span>
                    </button>
                  );
                })
              )}

              <DecorBook width={30} height={108} from="#3F6C6B" to="#2C4E4D" />
              <DecorBook width={26} height={96} from="#C0932E" to="#96701E" lean="lean2" />
              <DecorBook width={32} height={110} from="#B77768" to="#8F5849" />
              {/* 모바일 폭에서는 옆 책들과 겹쳐 밀려나므로 이 책은 숨긴다. */}
              <DecorBook width={28} height={102} from="#2E3F56" to="#1F2C3D" lean="lean" className="hide-on-mobile" />
            </div>
            <div className="plank" />
          </div>
        </div>

        {status.kind === "error" && (
          <p role="alert" className="mt-4 text-center text-sm text-destructive">
            {status.message}
          </p>
        )}
      </div>
    </div>
  );
}
