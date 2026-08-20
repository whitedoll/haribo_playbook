import type { ReadingDirection } from "@/lib/comic-spread";

export type TurnDirection = "left" | "right";

/**
 * 다음/이전 이동(isNext)과 읽는 방향 설정으로부터, 페이지가 화면에서 실제로
 * 넘어가는(굽어 사라지는) 물리적 방향을 계산한다.
 *
 * 오→왼(rtl)으로 읽을 때 다음 페이지로 가면 왼쪽으로 넘어가고, 왼→오(ltr)일 때
 * 다음 페이지로 가면 오른쪽으로 넘어간다. 이전 페이지로 가는 경우는 반대 방향이다.
 */
export function getTurnDirection(
  isNext: boolean,
  direction: ReadingDirection
): TurnDirection {
  const nextGoesLeft = direction === "rtl";
  const goesLeft = isNext ? nextGoesLeft : !nextGoesLeft;
  return goesLeft ? "left" : "right";
}

/** 넘김 애니메이션을 이 개수의 세로 조각으로 나눠 물결치듯 굽는 느낌을 낸다. */
export const PAGE_TURN_STRIP_COUNT = 8;

/** 한 조각의 실제 회전 애니메이션 길이(ms). CSS의 page-turn 애니메이션과 맞춰야 한다. */
export const PAGE_TURN_DURATION_MS = 450;

/** 인접한 조각 사이의 시작 지연 간격(ms). 조각 수가 많을수록 전체 넘김이 길어진다. */
export const PAGE_TURN_STRIP_DELAY_STEP_MS = 20;

/** 전체 조각이 모두 애니메이션을 마치는 데 걸리는 총 시간(ms). */
export const PAGE_TURN_TOTAL_MS =
  PAGE_TURN_DURATION_MS + (PAGE_TURN_STRIP_COUNT - 1) * PAGE_TURN_STRIP_DELAY_STEP_MS;

/**
 * count개 조각 중 index번째 조각만 보이도록 잘라내는 clip-path(inset) 값을
 * 반환한다. 전체 조각을 합치면 원본 이미지 전체를 덮는다.
 */
export function getStripClipPath(index: number, count: number): string {
  const left = (index / count) * 100;
  const right = ((count - index - 1) / count) * 100;
  return `inset(0 ${right}% 0 ${left}%)`;
}

/**
 * 조각별 애니메이션 시작 지연(ms)을 계산한다. 넘어가는 방향의 반대쪽(자유단)에
 * 있는 조각이 먼저 움직이고, 경첩 쪽 조각이 뒤따라오며 물결치는 느낌을 낸다.
 */
export function getStripDelay(
  index: number,
  count: number,
  turnDirection: TurnDirection,
  stepMs: number = PAGE_TURN_STRIP_DELAY_STEP_MS
): number {
  const distanceFromFreeEdge = turnDirection === "left" ? index : count - 1 - index;
  return distanceFromFreeEdge * stepMs;
}
