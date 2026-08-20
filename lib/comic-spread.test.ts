import { describe, expect, test } from "vitest";

import {
  findSpreadStartForPage,
  getSpreadPageIndices,
  getSpreadStarts,
  nextSpreadStart,
  orderForDisplay,
  prevSpreadStart,
} from "@/lib/comic-spread";

describe("getSpreadStarts", () => {
  test("1페이지는 단독, 이후 2쪽씩 짝짓는 시작 인덱스를 반환한다", () => {
    expect(getSpreadStarts(5)).toEqual([0, 1, 3]);
    expect(getSpreadStarts(3)).toEqual([0, 1]);
    expect(getSpreadStarts(1)).toEqual([0]);
    expect(getSpreadStarts(0)).toEqual([]);
  });
});

describe("nextSpreadStart / prevSpreadStart", () => {
  const starts = getSpreadStarts(5); // [0, 1, 3]

  test("다음 스프레드로 이동하고 마지막에서는 멈춘다", () => {
    expect(nextSpreadStart(starts, 0)).toBe(1);
    expect(nextSpreadStart(starts, 1)).toBe(3);
    expect(nextSpreadStart(starts, 3)).toBe(3);
  });

  test("이전 스프레드로 이동하고 처음에서는 멈춘다", () => {
    expect(prevSpreadStart(starts, 3)).toBe(1);
    expect(prevSpreadStart(starts, 1)).toBe(0);
    expect(prevSpreadStart(starts, 0)).toBe(0);
  });
});

describe("getSpreadPageIndices", () => {
  test("표지는 1개, 이후 스프레드는 2개의 페이지 인덱스를 오름차순으로 반환한다", () => {
    expect(getSpreadPageIndices(0, 5)).toEqual([0]);
    expect(getSpreadPageIndices(1, 5)).toEqual([1, 2]);
    expect(getSpreadPageIndices(3, 5)).toEqual([3, 4]);
  });

  test("마지막 홀수 페이지는 짝 없이 혼자 표시된다", () => {
    expect(getSpreadPageIndices(3, 4)).toEqual([3]);
  });
});

describe("findSpreadStartForPage", () => {
  test("페이지 인덱스가 속한 스프레드의 시작 인덱스를 반환한다 (보기 모드 전환 시 이어보기용)", () => {
    // pageCount=5 → starts [0, 1, 3], 스프레드: [0] | [1,2] | [3,4]
    expect(findSpreadStartForPage(0, 5)).toBe(0);
    expect(findSpreadStartForPage(1, 5)).toBe(1);
    expect(findSpreadStartForPage(2, 5)).toBe(1);
    expect(findSpreadStartForPage(3, 5)).toBe(3);
    expect(findSpreadStartForPage(4, 5)).toBe(3);
  });
});

describe("orderForDisplay", () => {
  test("오→왼(rtl)에서는 나중 페이지가 왼쪽에 오도록 뒤집는다", () => {
    expect(orderForDisplay([1, 2], "rtl")).toEqual([2, 1]);
  });

  test("왼→오(ltr)에서는 순서를 그대로 유지한다", () => {
    expect(orderForDisplay([1, 2], "ltr")).toEqual([1, 2]);
  });

  test("페이지가 1개뿐이면 방향과 무관하게 그대로 반환한다", () => {
    expect(orderForDisplay([0], "rtl")).toEqual([0]);
  });
});
