export type ReadingDirection = "rtl" | "ltr";

/**
 * 두 장 보기에서 각 스프레드의 시작 페이지 인덱스 목록을 반환한다.
 * 1페이지(인덱스 0)는 표지로 단독 표시되고, 이후 2-3, 4-5 순으로 짝짓는다.
 */
export function getSpreadStarts(pageCount: number): number[] {
  if (pageCount <= 0) return [];
  const starts = [0];
  for (let i = 1; i < pageCount; i += 2) starts.push(i);
  return starts;
}

export function nextSpreadStart(starts: number[], current: number): number {
  const index = starts.indexOf(current);
  return index >= 0 && index < starts.length - 1 ? starts[index + 1] : current;
}

export function prevSpreadStart(starts: number[], current: number): number {
  const index = starts.indexOf(current);
  return index > 0 ? starts[index - 1] : current;
}

/** 스프레드 시작 인덱스로부터 실제로 보여줄 페이지 인덱스(오름차순 1~2개)를 계산한다. */
export function getSpreadPageIndices(start: number, pageCount: number): number[] {
  if (start === 0) return [0]; // 1페이지(표지)는 항상 단독 표시.
  const hasSecond = start + 1 < pageCount;
  return hasSecond ? [start, start + 1] : [start];
}

/** 읽는 방향에 맞춰 화면에 왼쪽부터 그릴 순서로 페이지 인덱스를 정렬한다. */
export function orderForDisplay(
  ascendingIndices: number[],
  direction: ReadingDirection
): number[] {
  if (ascendingIndices.length < 2) return ascendingIndices;
  return direction === "rtl" ? [...ascendingIndices].reverse() : ascendingIndices;
}
