# 동시 업로드 시 manifest.json 갱신이 서로를 덮어써 zip 항목이 유실될 수 있음

**Symptom**: 거의 동시에 두 개의 zip이 업로드되면, 나중에 끝난 요청의
manifest 쓰기가 먼저 끝난 요청이 저장한 zip 항목을 지워버려 그 zip 파일은
디스크에 남아 있지만 목록/열람에서는 사라질 수 있다.

**Observed evidence**: `code-review low` 리뷰(작업 03, 2026-08-20)에서
`lib/comic-library.ts`의 `addComic()`을 읽고 발견. `readManifest(baseDir)`로
기존 목록을 읽은 뒤 새 zip을 쓰고 `writeManifest`로 갱신된 목록을 저장하는
과정 사이에 잠금이 없다. 실제 동시 업로드로 재현해보지는 않았다.

**Suspected cause**: `addComic()`이 read-modify-write를 원자적으로 하지
않아서, 두 요청이 거의 동시에 실행되면 둘 다 같은 `existing` 목록을 읽고,
나중에 `writeManifest`가 실행되는 쪽이 먼저 쓴 zip의 manifest 항목을 포함하지
않은 상태로 덮어쓴다.

**What was tried**: 아무 조치도 하지 않았다. 개인용 단일 사용자 도구라는
현재 스펙 범위상 동시성 방어는 요구되지 않아(AGENTS.md 검증 예산: "스펙이
요구하지 않은 ... 엣지케이스 ... 방어는 범위 밖") 수정하지 않고 그대로 두었다.

**Proposed next step**: 실사용에서 동시 업로드가 실제로 발생하는지, 또는
사용자가 이 위험을 감수 가능한지 확인한다. 고쳐야 한다면 `addComic()`의
read-modify-write 구간에 파일 기반 잠금이나 인메모리 큐(단일 프로세스 가정)를
추가해 직렬화한다.
