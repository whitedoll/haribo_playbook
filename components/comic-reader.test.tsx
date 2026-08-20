import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ComicReader } from "@/components/comic-reader";

function bytesOf(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function validComicZipBytes() {
  return zipSync({
    "page1.png": bytesOf("page-1"),
    "page2.png": bytesOf("page-2"),
    "page3.png": bytesOf("page-3"),
  });
}

function validComicZipFile(name = "comic.zip"): File {
  return new File([validComicZipBytes()], name, { type: "application/zip" });
}

function uploadFile(file: File) {
  const input = screen.getByLabelText("zip 파일 선택") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response;
}

function zipBytesResponse(bytes: Uint8Array, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    arrayBuffer: async () => bytes.buffer,
  } as Response;
}

/** 기본값: 보관 목록은 비어 있고, 업로드는 항상 성공한다. */
function stubFetch(
  handler?: (url: string, init?: RequestInit) => Response | undefined
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const custom = handler?.(url, init);
      if (custom) return custom;

      if (url === "/api/comics" && init?.method === "POST") {
        return jsonResponse(
          {
            entry: {
              id: "stub-id",
              name: "comic.zip",
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          },
          201
        );
      }
      if (url === "/api/comics") {
        return jsonResponse({ entries: [] });
      }
      return jsonResponse({ error: "not found" }, 404);
    })
  );
}

function renderReader() {
  render(<ComicReader />);
}

describe("ComicReader", () => {
  beforeEach(() => {
    stubFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("초기 화면에는 업로드 안내와 zip 파일 선택 버튼 하나만 보인다", () => {
    renderReader();

    expect(
      screen.getByRole("heading", { name: "만화책 zip 리더" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("zip 파일 선택")).toBeInTheDocument();
    expect(screen.getAllByText("zip 파일 선택")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "zip 파일 선택" })
    ).toBeInTheDocument();
  });

  test("zip 파일 선택 버튼을 누르면 실제 파일 입력이 열린다", () => {
    renderReader();
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click");

    fireEvent.click(screen.getByRole("button", { name: "zip 파일 선택" }));

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  test("zip을 올리면 압축 해제 안내 없이 첫 페이지가 바로 보인다", async () => {
    renderReader();
    uploadFile(validComicZipFile());

    expect(await screen.findByAltText("1쪽")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  test("기본 방향(오→왼)에서 왼쪽 클릭은 다음 장, 오른쪽 클릭은 이전 장이다", async () => {
    renderReader();
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
    renderReader();
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
    renderReader();
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
    renderReader();
    const zip = zipSync({ "readme.txt": bytesOf("이미지 없음") });
    const file = new File([zip], "no-images.zip", { type: "application/zip" });

    uploadFile(file);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "이미지가 있는 만화책 zip이 아닙니다."
    );
  });

  test("서버가 업로드를 거부하면 에러가 표시되고 읽기 화면에 진입하지 않는다", async () => {
    stubFetch((url, init) => {
      if (url === "/api/comics" && init?.method === "POST") {
        return jsonResponse({ error: "zip 파일을 저장하는 중 문제가 발생했습니다." }, 400);
      }
      return undefined;
    });
    renderReader();

    uploadFile(validComicZipFile());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "zip 파일을 저장하는 중 문제가 발생했습니다."
    );
    expect(screen.queryByAltText(/쪽$/)).not.toBeInTheDocument();
  });

  test("두 장 보기로 전환하면 1페이지가 표지로 단독 표시된다", async () => {
    renderReader();
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
    renderReader();
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
    renderReader();
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

  test("한 장 보기에서 넘긴 뒤 두 장 보기로 전환하면 보던 페이지가 포함된 스프레드로 이어진다", async () => {
    renderReader();
    uploadFile(validComicZipFile());
    await screen.findByAltText("1쪽");

    fireEvent.click(screen.getByLabelText("다음 장")); // 2쪽으로 이동
    await screen.findByAltText("2쪽");

    fireEvent.change(screen.getByLabelText("보기 모드"), {
      target: { value: "double" },
    });

    expect(await screen.findByText("2-3 / 3")).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  test("두 장 보기에서 다음 스프레드로 넘긴 뒤 한 장 보기로 전환하면 그 스프레드의 첫 페이지로 이어진다", async () => {
    renderReader();
    uploadFile(validComicZipFile());
    await screen.findByAltText("1쪽");

    fireEvent.change(screen.getByLabelText("보기 모드"), {
      target: { value: "double" },
    });
    fireEvent.click(screen.getByLabelText("다음 장"));
    await screen.findByText("2-3 / 3");

    fireEvent.change(screen.getByLabelText("보기 모드"), {
      target: { value: "single" },
    });

    expect(await screen.findByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByAltText("2쪽")).toBeInTheDocument();
  });

  test("다른 zip 업로드 버튼을 누르면 업로드 화면으로 돌아간다", async () => {
    renderReader();
    uploadFile(validComicZipFile());
    await screen.findByAltText("1쪽");

    fireEvent.click(screen.getByRole("button", { name: "다른 zip 업로드" }));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "만화책 zip 리더" })
      ).toBeInTheDocument()
    );
  });

  test("업로드 후 업로드 화면으로 돌아가면 최근 zip 목록에 나타난다", async () => {
    const entries: Array<{ id: string; name: string; createdAt: string }> = [];
    stubFetch((url, init) => {
      if (url === "/api/comics" && init?.method === "POST") {
        const entry = {
          id: "new-id",
          name: "comic.zip",
          createdAt: "2026-01-01T00:00:00.000Z",
        };
        entries.unshift(entry);
        return jsonResponse({ entry }, 201);
      }
      if (url === "/api/comics" && !init) {
        return jsonResponse({ entries });
      }
      return undefined;
    });
    renderReader();

    uploadFile(validComicZipFile());
    await screen.findByAltText("1쪽");

    fireEvent.click(screen.getByRole("button", { name: "다른 zip 업로드" }));

    expect(
      await screen.findByRole("button", { name: "comic.zip" })
    ).toBeInTheDocument();
  });

  test("목록에서 zip을 클릭하면 해당 zip의 읽기 화면으로 진입한다", async () => {
    const zipBytes = zipSync({ "page1.png": bytesOf("stored-page-1") });
    stubFetch((url) => {
      if (url === "/api/comics") {
        return jsonResponse({
          entries: [
            { id: "abc", name: "old.zip", createdAt: "2026-01-01T00:00:00.000Z" },
          ],
        });
      }
      if (url === "/api/comics/abc") {
        return zipBytesResponse(zipBytes);
      }
      return undefined;
    });
    renderReader();

    fireEvent.click(await screen.findByRole("button", { name: "old.zip" }));

    expect(await screen.findByAltText("1쪽")).toBeInTheDocument();
  });

  test("페이지를 넘기면 현재 위치를 서버에 저장하는 요청을 보낸다", async () => {
    const fetchMock = vi.fn();
    stubFetch((url, init) => {
      fetchMock(url, init?.method);
      return undefined;
    });
    renderReader();
    uploadFile(validComicZipFile());
    await screen.findByAltText("1쪽");

    fireEvent.click(screen.getByLabelText("다음 장"));
    await screen.findByAltText("2쪽");

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/comics/stub-id", "PATCH")
    );
  });

  test("이어보기 기록이 있는 zip을 목록에서 열면 마지막 위치와 보기 모드로 이어진다", async () => {
    const zipBytes = zipSync({
      "page1.png": bytesOf("p1"),
      "page2.png": bytesOf("p2"),
      "page3.png": bytesOf("p3"),
    });
    stubFetch((url) => {
      if (url === "/api/comics") {
        return jsonResponse({
          entries: [
            {
              id: "resumed",
              name: "resumed.zip",
              createdAt: "2026-01-01T00:00:00.000Z",
              lastPosition: { pageIndex: 1, viewMode: "double" },
            },
          ],
        });
      }
      if (url === "/api/comics/resumed") {
        return zipBytesResponse(zipBytes);
      }
      return undefined;
    });
    renderReader();

    fireEvent.click(await screen.findByRole("button", { name: "resumed.zip" }));

    expect(await screen.findByText("2-3 / 3")).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  test("삭제되어 더 이상 없는 zip을 목록에서 열면 에러가 표시된다", async () => {
    stubFetch((url) => {
      if (url === "/api/comics") {
        return jsonResponse({
          entries: [
            { id: "gone", name: "gone.zip", createdAt: "2026-01-01T00:00:00.000Z" },
          ],
        });
      }
      if (url === "/api/comics/gone") {
        return jsonResponse({ error: "찾을 수 없습니다." }, 404);
      }
      return undefined;
    });
    renderReader();

    fireEvent.click(await screen.findByRole("button", { name: "gone.zip" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "선택한 zip을 열 수 없습니다."
    );
  });
});
