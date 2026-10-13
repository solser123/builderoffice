# CLAUDE.md

이 저장소(BuilderOffice)의 작업 지침은 **[AGENTS.md](AGENTS.md)** 에 있습니다.
Claude Code·Codex 등 모든 에이전트는 작업 전에 AGENTS.md를 먼저 읽으세요.

특히 주의:
- `js/sync.js` 동기화 불변식 — 깨면 데이터가 유실됩니다 (AGENTS.md §1)
- 배포 시 `index.html`의 `?v=N` 상향 + `www/` 복사 (AGENTS.md §2)
- 보안 규칙 수정 시 공격 시나리오 검증 (AGENTS.md §3)
- 새 컬렉션은 `Store.KEYS` + `Sync.ARRAY_KEYS` 양쪽 등록
