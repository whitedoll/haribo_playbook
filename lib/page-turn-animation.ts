import type { ReadingDirection } from "@/lib/comic-spread";

/** 두 장 보기에서 넘어가는 쪽 페이지가 화면의 어느 절반(왼쪽/오른쪽)에 있는지를
 * 나타낸다. 한 장 보기(화면 전체가 한 장)에서도 어느 쪽 가장자리를 경첩으로
 * 삼을지 정하는 데 그대로 쓰인다. */
export type SpreadSide = "left" | "right";

/**
 * 다음/이전 이동(isNext)과 읽는 방향 설정으로부터, 넘어가는 페이지가 화면의
 * 어느 절반에 있는지 계산한다.
 *
 * 오→왼(rtl)으로 읽을 때 다음 페이지로 가면 왼쪽 페이지가 넘어가고, 왼→오(ltr)일
 * 때 다음 페이지로 가면 오른쪽 페이지가 넘어간다. 이전 페이지로 가는 경우는
 * 반대쪽이다.
 */
export function getTurnDirection(
  isNext: boolean,
  direction: ReadingDirection
): SpreadSide {
  const nextIsLeft = direction === "rtl";
  const isLeft = isNext ? nextIsLeft : !nextIsLeft;
  return isLeft ? "left" : "right";
}

/** 책장을 넘길 때 경첩(회전축) 역할을 하는 쪽 가장자리. 넘어가는 페이지가
 * 화면 오른쪽에 있으면 책의 갈피(중앙)에 해당하는 왼쪽 가장자리가 경첩이고,
 * 왼쪽에 있으면 오른쪽 가장자리가 경첩이다. */
export type FlipHinge = "left" | "right";

export function getFlipHinge(spreadSide: SpreadSide): FlipHinge {
  return spreadSide === "right" ? "left" : "right";
}

/** 경첩 쪽에 따라 종이가 실제로 넘어가며 뒤집히는(backface가 보이기 시작하는)
 * rotateY 각도. 왼쪽 경첩은 화면 안쪽으로, 오른쪽 경첩은 그 반대로 넘어간다. */
export function getFlipDegrees(hinge: FlipHinge): number {
  return hinge === "left" ? -180 : 180;
}

/** 한 장이 통째로 뒤집히는 넘김 애니메이션의 길이(ms). CSS의 leaf-flip
 * 애니메이션과 맞춰야 한다. */
export const PAGE_FLIP_DURATION_MS = 550;
