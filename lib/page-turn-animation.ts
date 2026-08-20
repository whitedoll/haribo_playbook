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
