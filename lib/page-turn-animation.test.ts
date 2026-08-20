import { describe, expect, test } from "vitest";

import { getTurnDirection } from "@/lib/page-turn-animation";

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
