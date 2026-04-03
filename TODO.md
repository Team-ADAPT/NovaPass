# NovaPass — TODO

## Known Issues / Production Blockers

| # | What | Notes |
|---|------|-------|
| 1 | TLS certificates | Replace self-signed certs with Let's Encrypt in production |
| 2 | Redis password | Set `REDIS_PASSWORD` in `application-prod.yml` |
| 3 | CI/CD pipeline | `.github/workflows/ci.yml` is a placeholder — no actual build/test steps |
| 4 | Unit tests | Backend `src/test/` is empty |

---

## Nice to Have

| # | What | Notes |
|---|------|-------|
| 5 | Breach detection | HaveIBeenPwned API integration |
| 6 | Vault export | Encrypted backup / export flow |
| 7 | Secure sharing | Share a vault item with another user |
| 8 | OpenAPI spec | `docs/` has no `openapi.yaml` |
| 9 | Tauri desktop build | Needs Rust: `brew install rust && cargo install tauri-cli` |
| 10 | Mobile app | React Native or Flutter |
