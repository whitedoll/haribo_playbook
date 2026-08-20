# 03 — 최근 zip 보관 목록 + 자동 삭제

## Outcome

업로드한 zip이 영속 저장소에 보관되어 홈 화면 목록에서 다시 열어볼 수 있고, 보관 개수가
2개를 초과하면 가장 오래된 zip이 확인 절차 없이 즉시 삭제된다.

## Blockers

01 (기본 읽기 경험) — 목록에서 열었을 때 진입할 읽기 화면이 있어야 한다.

## Acceptance criteria

- [ ] zip 업로드 후 홈 화면 목록에 해당 zip이 나타난다.
- [ ] 목록에서 zip을 클릭하면 해당 zip의 읽기 화면으로 진입한다.
- [ ] 3번째 zip을 업로드하면 가장 오래된 zip이 즉시 삭제되고 목록에서 사라진다.
- [ ] 삭제된 zip은 더 이상 열람할 수 없다.

## Constraints

None.

## Verification

- zip을 3개 연속 업로드하는 자동화 테스트로 목록 개수(최대 2)와 삭제 대상(가장 오래된 것)을
  확인.

## Review checkpoint

One review pass after this task. 누적 범위: zip 영속 저장 및 자동 삭제 로직(01~03). 위험:
삭제 조건이 잘못되면 사용자의 만화책 파일이 의도치 않게 사라질 수 있다 (데이터 손실 리스크).

## Status

pending

## Execution

- Verification: —
- Blocker: —
- Revision: —
