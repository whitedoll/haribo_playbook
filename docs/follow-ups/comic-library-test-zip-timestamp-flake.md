# `lib/comic-library.test.ts`의 저장 zip 바이트 비교 테스트가 드물게 실패할 수 있음

**Symptom**: "zip을 저장하면 목록에서 조회할 수 있다" 테스트가 `getComicBytes`로
읽은 바이트와 `validComicZipBytes()`로 새로 만든 바이트를 `toEqual`로 비교하는데,
아주 드물게 한 바이트가 달라 실패한다.

**Observed evidence**: 2026-08-20, 페이지 넘김 애니메이션 작업 중 무관한 변경
후 전체 테스트를 돌리다 한 번 재현됐다. 곧바로 다시 실행하니 통과했다.

**Suspected cause**: `fflate`의 `zipSync`가 로컬 파일 헤더에 DOS 타임스탬프(2초
단위)를 기록한다. 테스트 안에서 `addComic()`이 저장할 때 한 번, 비교용으로
`validComicZipBytes()`를 호출할 때 또 한 번, 서로 다른 시점에 `zipSync`를 호출해
같은 내용을 압축하므로, 그 호출 사이에 2초 경계를 넘으면 타임스탬프 바이트가
달라져 바이트 단위 비교가 깨진다.

**What was tried**: 아무 조치도 하지 않았다. 학습용 템플릿의 검증 예산상
범위 밖이라 판단해 그대로 두었다. 재현이 드물어 실사용에 지장은 없다.

**Proposed next step**: 바이트를 그대로 비교하는 대신 `parseComicZip`으로 압축을
풀어 이미지 내용만 비교하도록 테스트를 바꾸면 타임스탬프 바이트 차이에
흔들리지 않는다.
