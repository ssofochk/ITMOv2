# Practice 04 — Evidence

| Критерий | Доказательство | Статус |
|---|---|---|
| AGENTS.md | [evidence/01-agents.txt](evidence/01-agents.txt) | ✅ |
| skill test-driven-development | [evidence/02-skill.txt](evidence/02-skill.txt) | ✅ |
| Context7 MCP | [evidence/03-context7.txt](evidence/03-context7.txt) | ✅ |
| hook + runner | [evidence/04-hook-fail.txt](evidence/04-hook-fail.txt), [evidence/05-hook-pass.txt](evidence/05-hook-pass.txt) | ✅ |
| обоснование подключений | [evidence/01-agents.txt](evidence/01-agents.txt), [evidence/03-context7.txt](evidence/03-context7.txt) | ✅ |
| разбор skill | [evidence/02-skill.txt](evidence/02-skill.txt) | ✅ |
| запуск skill | [evidence/02-skill.txt](evidence/02-skill.txt) | ✅ |
| собственный MCP | [evidence/06-mcp-success.json](evidence/06-mcp-success.json), [evidence/07-mcp-error.json](evidence/07-mcp-error.json) | ✅ |
| success/error собственного MCP | [evidence/06-mcp-success.json](evidence/06-mcp-success.json), [evidence/07-mcp-error.json](evidence/07-mcp-error.json) | ✅ |
| reflection | [reflection.md](reflection.md) | ✅ |

---

## 1. AGENTS.md
- **Что демонстрируется:** Корневой файл AGENTS.md существует и содержит правила работы для practice_04
- **Ссылка на файл:** [../../AGENTS.md](../../AGENTS.md)
- **Доказательство:** [evidence/01-agents.txt](evidence/01-agents.txt) — путь файла и 5 конкретных ограничений

## 2. Skill: test-driven-development
- **SKILL.md:** [.opencode/skills/test-driven-development/SKILL.md](../../.opencode/skills/test-driven-development/SKILL.md)
- **writing-good-tests.md:** [.opencode/skills/test-driven-development/writing-good-tests.md](../../.opencode/skills/test-driven-development/writing-good-tests.md)
- **skill_review.md:** [skill_review.md](skill_review.md)
- **Доказательство:** [evidence/02-skill.txt](evidence/02-skill.txt) — факт загрузки skill, чтение writing-good-tests.md, краткая процедура, реальный результат тестов (8/8 PASS)
- **Где skill реально применялся:** Разработка `mcp_practice_checker/check_submission.py` и его тестов — все тесты написаны по TDD (RED → GREEN → REFACTOR)

## 3. Context7 MCP
- **Зачем использовался:** Для получения актуальной документации по FastMCP (декоратор `@mcp.tool` и запуск stdio server) вместо придумывания API
- **Конфигурация в opencode.json:** `mcp.servers.context7` настроен в корневом `opencode.json`
- **Доказательство:** [evidence/03-context7.txt](evidence/03-context7.txt) — реальный вызов `context7_query-docs` с запросом и полезный результат

## 4. Automatic hook + runner
- **Runner:** [scripts/check.sh](scripts/check.sh) — проверяет наличие всех артефактов и запускает MCP unit тесты
- **Hook plugin:** [.opencode/plugins/check-after-edit.js](../../.opencode/plugins/check-after-edit.js) — запускает `check.sh` после каждого write/edit/patch
- **FAIL:** [evidence/04-hook-fail.txt](evidence/04-hook-fail.txt) — edit AGENTS.md (добавлена строка) → hook автоматически запустил check.sh
- **PASS:** [evidence/05-hook-pass.txt](evidence/05-hook-pass.txt) — edit AGENTS.md (восстановлена) → hook автоматически запустил check.sh → PASS
- **Последовательность:** edit → automatic FAIL → fix → automatic PASS

## 5. Custom MCP: practice-checker
- **Исходники:** [mcp_practice_checker/](mcp_practice_checker/) — `server.py`, `check_submission.py`, `test_check_submission.py`
- **Назначение `check_submission`:** Проверяет директорию репозитория на наличие всех обязательных артефактов practice_04 (AGENTS.md, opencode.json, skill файлы, plugin, check.sh, MCP checker), возвращает структурированный результат с `ok`, `checked_root`, `missing`
- **Success:** [evidence/06-mcp-success.json](evidence/06-mcp-success.json) — вызов с `path="practices/practice_04"` вернул `ok: true`, `missing: []`
- **Error:** [evidence/07-mcp-error.json](evidence/07-mcp-error.json) — вызов с несуществующим путём вернул `ok: false` с понятной ошибкой

## 6. Reflection
- **Файл:** [reflection.md](reflection.md) — рефлексия по practice_04

## 7. Final check
- **Доказательство:** [evidence/08-final-check.txt](evidence/08-final-check.txt)
- **Итоговый PASS:** Все проверки пройдены успешно
  - `sh practices/practice_04/scripts/check.sh` → exit code 0, все [OK], все тесты PASS
  - `git diff --check` → exit code 0, нет whitespace ошибок