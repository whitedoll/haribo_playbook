import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { zipSync } from "fflate";
import { beforeEach, describe, expect, test } from "vitest";

import { ComicReader } from "@/components/comic-reader";

function bytesOf(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function validComicZipFile(name = "comic.zip"): File {
  const zip = zipSync({
    "page1.png": bytesOf("page-1"),
    "page2.png": bytesOf("page-2"),
    "page3.png": bytesOf("page-3"),
  });
  return new File([zip], name, { type: "application/zip" });
}

function uploadFile(file: File) {
  const input = screen.getByLabelText("zip 파일 선택") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("ComicReader", () => {
  beforeEach(() => {
    render(<ComicReader />);
  });

  test("초기 화면에는 업로드 안내와 파일 선택 입력이 보인다", () => {
    expect(
      screen.getByRole("heading", { name: "만화책 zip 리더" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("zip 파일 선택")).toBeInTheDocument();
  });

  test("zip을 올리면 압축 해제 안내 없이 첫 페이지가 바로 보인다", async () => {
    uploadFile(validComicZipFile());

    expect(await screen.findByAltText("1쪽")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  test("기본 방향(오→왼)에서 왼쪽 클릭은 다음 장, 오른쪽 클릭은 이전 장이다", async () => {
    uploadFile(validComicZipFile());
    await screen.findByAltText("1쪽");

    expect(screen.getByLabelText("다음 장")).toBeInTheDocument();
    expect(screen.getByLabelText("이전 장")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("다음 장"));
    expect(await screen.findByAltText("2쪽")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("이전 장"));
    expect(await screen.findByAltText("1쪽")).toBeInTheDocument();
  });

  test("방향을 왼→오로 바꾸면 좌우 클릭의 의미가 반대로 바뀐다", async () => {
    uploadFile(validComicZipFile());
    await screen.findByAltText("1쪽");

    fireEvent.change(screen.getByLabelText("넘기는 방향"), {
      target: { value: "ltr" },
    });

    const nextButton = screen.getByLabelText("다음 장");
    fireEvent.click(nextButton);
    expect(await screen.findByAltText("2쪽")).toBeInTheDocument();
  });

  test("손상된 zip을 올리면 에러가 표시되고 읽기 화면에 진입하지 않는다", async () => {
    const corrupted = new File([new Uint8Array([1, 2, 3])], "broken.zip", {
      type: "application/zip",
    });

    uploadFile(corrupted);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "zip 파일을 열 수 없습니다."
    );
    expect(screen.queryByAltText(/쪽$/)).not.toBeInTheDocument();
  });

  test("이미지가 없는 zip을 올리면 에러가 표시된다", async () => {
    const zip = zipSync({ "readme.txt": bytesOf("이미지 없음") });
    const file = new File([zip], "no-images.zip", { type: "application/zip" });

    uploadFile(file);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "이미지가 있는 만화책 zip이 아닙니다."
    );
  });

  test("두 장 보기로 전환하면 1페이지가 표지로 단독 표시된다", async () => {
    uploadFile(validComicZipFile());
    await screen.findByAltText("1쪽");

    fireEvent.change(screen.getByLabelText("보기 모드"), {
      target: { value: "double" },
    });

    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByAltText("1쪽")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  test("두 장 보기에서 다음으로 넘기면 2-3쪽이 함께 표시되고, 기본 방향(오→왼)에서는 3쪽이 왼쪽에 온다", async () => {
    uploadFile(validComicZipFile());
    await screen.findByAltText("1쪽");

    fireEvent.change(screen.getByLabelText("보기 모드"), {
      target: { value: "double" },
    });
    fireEvent.click(screen.getByLabelText("다음 장"));

    expect(await screen.findByText("2-3 / 3")).toBeInTheDocument();
    const images = screen.getAllByRole("img");
    expect(images.map((img) => img.getAttribute("alt"))).toEqual(["3쪽", "2쪽"]);
  });

  test("두 장 보기에서 이전 장을 누르면 표지로 돌아간다", async () => {
    uploadFile(validComicZipFile());
    await screen.findByAltText("1쪽");

    fireEvent.change(screen.getByLabelText("보기 모드"), {
      target: { value: "double" },
    });
    fireEvent.click(screen.getByLabelText("다음 장"));
    await screen.findByText("2-3 / 3");

    fireEvent.click(screen.getByLabelText("이전 장"));

    expect(await screen.findByText("1 / 3")).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  test("다른 zip 업로드 버튼을 누르면 업로드 화면으로 돌아간다", async () => {
    uploadFile(validComicZipFile());
    await screen.findByAltText("1쪽");

    fireEvent.click(screen.getByRole("button", { name: "다른 zip 업로드" }));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "만화책 zip 리더" })
      ).toBeInTheDocument()
    );
  });
});
