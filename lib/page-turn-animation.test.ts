import { describe, expect, test } from "vitest";

import {
  getFlipDegrees,
  getFlipHinge,
  getTurnDirection,
} from "@/lib/page-turn-animation";

describe("getTurnDirection", () => {
  test("오→왼(rtl)에서 다음 장은 왼쪽 페이지가, 이전 장은 오른쪽 페이지가 넘어간다", () => {
    expect(getTurnDirection(true, "rtl")).toBe("left");
    expect(getTurnDirection(false, "rtl")).toBe("right");
  });

  test("왼→오(ltr)에서 다음 장은 오른쪽 페이지가, 이전 장은 왼쪽 페이지가 넘어간다", () => {
    expect(getTurnDirection(true, "ltr")).toBe("right");
    expect(getTurnDirection(false, "ltr")).toBe("left");
  });
});

describe("getFlipHinge", () => {
  test("넘어가는 페이지가 화면 오른쪽에 있으면 경첩은 왼쪽(갈피)이다", () => {
    expect(getFlipHinge("right")).toBe("left");
  });

  test("넘어가는 페이지가 화면 왼쪽에 있으면 경첩은 오른쪽(갈피)이다", () => {
    expect(getFlipHinge("left")).toBe("right");
  });
});

describe("getFlipDegrees", () => {
  test("왼쪽 경첩은 -180도, 오른쪽 경첩은 180도 회전한다", () => {
    expect(getFlipDegrees("left")).toBe(-180);
    expect(getFlipDegrees("right")).toBe(180);
  });
});
