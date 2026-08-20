# 01 — 기본 읽기 경험

## Outcome

사용자가 zip 파일을 업로드하면 압축 해제 없이 바로 첫 페이지가 보이고, 한 장 보기 상태에서
화면 좌/우 클릭으로 페이지를 넘기며, 넘기는 방향(왼→오 / 오→왼, 기본값 오→왼)을 설정할 수 있다.

## Blockers

None.

## Acceptance criteria

- [x] zip 업로드 후 압축 해제 절차 노출 없이 첫 페이지가 바로 표시된다.
- [x] 페이지는 파일명 자연 정렬 순서대로 보인다 (예: page2 다음에 page10).
- [x] 기본값(오→왼)에서 오른쪽 클릭 = 이전 장, 왼쪽 클릭 = 다음 장이다.
- [x] 방향 설정을 왼→오로 바꾸면 좌우 클릭의 의미가 반대로 바뀐다.
- [x] 이미지가 없거나 손상된 zip을 올리면 에러가 표시되고 읽기 화면으로 진입하지 않는다.

## Constraints

- 지원 이미지 포맷은 jpg/png/webp/gif 등 일반 래스터 포맷이다.
- 업로드는 파일 선택 버튼만 지원한다 (드래그앤드롭 없음).

## Verification

- 정상/손상/빈 zip 픽스처를 업로드해 페이지 순서, 좌우 클릭 동작, 에러 표시를 자동화 테스트로 확인.

## Review checkpoint

None.

## Status

completed

## Execution

- Verification: `bun run typecheck` 통과, `vitest run`(lib/comic-zip.test.ts,
  components/comic-reader.test.tsx, app/page.test.tsx) 15개 테스트 통과. 실행 중인
  dev 서버에서 실제 zip 업로드 → 첫 페이지 표시, 좌/우 클릭 넘김(기본 오→왼),
  방향 전환 시 좌우 반전, 손상 zip 업로드 시 에러 표시까지 브라우저에서 직접 확인.
- Blocker: —
- Revision: —
