import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import Home from "@/app/page";

test("홈 화면은 만화책 리더 업로드 안내를 보여준다", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { level: 1, name: "만화책 zip 리더" })
  ).toBeInTheDocument();
  expect(screen.getByLabelText("zip 파일 선택")).toBeInTheDocument();
});
