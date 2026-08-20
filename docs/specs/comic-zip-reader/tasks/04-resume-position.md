# 04 — 이어보기(마지막 페이지 기억)

## Outcome

zip별로 마지막에 보던 페이지(또는 두 장 보기 스프레드)를 기억해, 목록에서 다시 열면 그
위치부터 이어서 볼 수 있다.

## Blockers

02 (두 장 보기), 03 (보관 목록) — 이어보기는 보기 모드(한 장/두 장) 상태와 목록에서의
재진입 지점이 있어야 의미가 있다.

## Acceptance criteria

- [ ] 읽던 중간에 벗어났다가 목록에서 같은 zip을 다시 열면 마지막으로 보던 페이지(또는
      스프레드)부터 보인다.
- [ ] 한 장 보기 중 벗어났다면 한 장 보기로, 두 장 보기 중 벗어났다면 두 장 보기로 이어진다.
- [ ] 자동 삭제로 zip이 사라지면 해당 이어보기 기록도 함께 사라진다.

## Constraints

None.

## Verification

- 페이지 이동 후 재진입, 삭제 후 재업로드 시나리오를 자동화 테스트로 확인.

## Review checkpoint

None.

## Status

pending

## Execution

- Verification: —
- Blocker: —
- Revision: —
