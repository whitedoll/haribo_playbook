import { describe, expect, test } from "vitest";

import {
  getStripClipPath,
  getStripDelay,
  getTurnDirection,
} from "@/lib/page-turn-animation";

describe("getTurnDirection", () => {
  test("오→왼(rtl)에서 다음 장은 왼쪽으로, 이전 장은 오른쪽으로 넘어간다", () => {
    expect(getTurnDirection(true, "rtl")).toBe("left");
    expect(getTurnDirection(false, "rtl")).toBe("right");
  });

  test("왼→오(ltr)에서 다음 장은 오른쪽으로, 이전 장은 왼쪽으로 넘어간다", () => {
    expect(getTurnDirection(true, "ltr")).toBe("right");
    expect(getTurnDirection(false, "ltr")).toBe("left");
  });
});

describe("getStripClipPath", () => {
  test("4조각으로 나누면 각 조각이 25%씩 이어붙어 전체를 덮는다", () => {
    expect(getStripClipPath(0, 4)).toBe("inset(0 75% 0 0%)");
    expect(getStripClipPath(1, 4)).toBe("inset(0 50% 0 25%)");
    expect(getStripClipPath(2, 4)).toBe("inset(0 25% 0 50%)");
    expect(getStripClipPath(3, 4)).toBe("inset(0 0% 0 75%)");
  });
});

describe("getStripDelay", () => {
  test("왼쪽으로 넘어갈 때는 왼쪽(자유단) 조각이 먼저, 오른쪽(경첩) 조각이 나중에 움직인다", () => {
    expect(getStripDelay(0, 4, "left", 20)).toBe(0);
    expect(getStripDelay(3, 4, "left", 20)).toBe(60);
  });

  test("오른쪽으로 넘어갈 때는 반대로 오른쪽 조각이 먼저, 왼쪽 조각이 나중에 움직인다", () => {
    expect(getStripDelay(3, 4, "right", 20)).toBe(0);
    expect(getStripDelay(0, 4, "right", 20)).toBe(60);
  });
});
