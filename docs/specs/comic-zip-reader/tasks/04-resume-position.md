# 04 — 이어보기(마지막 페이지 기억)

## Outcome

zip별로 마지막에 보던 페이지(또는 두 장 보기 스프레드)를 기억해, 목록에서 다시 열면 그
위치부터 이어서 볼 수 있다.

## Blockers

02 (두 장 보기), 03 (보관 목록) — 이어보기는 보기 모드(한 장/두 장) 상태와 목록에서의
재진입 지점이 있어야 의미가 있다.

## Acceptance criteria

- [x] 읽던 중간에 벗어났다가 목록에서 같은 zip을 다시 열면 마지막으로 보던 페이지(또는
      스프레드)부터 보인다.
- [x] 한 장 보기 중 벗어났다면 한 장 보기로, 두 장 보기 중 벗어났다면 두 장 보기로 이어진다.
- [x] 자동 삭제로 zip이 사라지면 해당 이어보기 기록도 함께 사라진다.

## Constraints

None.

## Verification

- 페이지 이동 후 재진입, 삭제 후 재업로드 시나리오를 자동화 테스트로 확인.

## Review checkpoint

None.

## Status

completed

## Execution

- Verification: `bun run typecheck` 통과, `vitest run` 6개 파일 44개 테스트 통과
  (lib/comic-library.test.ts에 이어보기 위치 저장/삭제 시 소멸 테스트 3개 추가,
  components/comic-reader.test.tsx에 위치 저장 요청 전송·이어보기 복원 테스트 2개 추가).
  실행 중인 dev 서버에서 7페이지 zip을 4-5쪽·두 장 보기까지 이동 → PATCH 저장 요청
  확인 → 페이지 새로고침 후 목록에서 같은 zip을 다시 열어 "4-5 / 7", 두 장 보기로
  정확히 이어지는 것을 직접 확인. 콘솔에 남은 404 로그는 이전 작업에서 삭제된 zip을
  의도적으로 다시 요청해본 진단성 호출이며 네트워크 로그로 이번 흐름에서 새로 발생한
  에러가 없음을 확인.
- Blocker: —
- Revision: —
