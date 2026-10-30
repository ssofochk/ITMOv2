# Spec Kit vs OpenSpec — краткое сравнение

Архитектура процесса:
- Spec Kit: интеграции (copilot, opencode, и др.), команды specify/plan/tasks/implement, рабочие шаблоны `.specify`, локальные workflow.
- OpenSpec: фокус на артефакты изменений (specs, delta/spec, tasks), tight интеграция с OpenCode через skills и workflows.

Структура артефактов:
- Spec Kit: constitution, spec, plan, tasks, checklist; интеграции через manifests.
- OpenSpec: base specs, delta specs, changes, apply/sync/archive workflows.

Удобство согласования:
- Spec Kit: предусмотрен этап Clarify и Analyze; можно применять локальные шаблоны.
- OpenSpec: сильная связь с изменениями и согласованием через delta/spec, но требуется соответствующая tooling.

Интеграция с OpenCode:
- В данном проекте: попытка `specify integration install opencode` не выполнена из‑за недоступности CLI; использованы локальные `.specify` файлы.
- OpenSpec skills доступны, но задача не требовала их вызова напрямую; сравнение основано на документации в репозитории.
# Spec Kit vs OpenSpec — сравнение подходов (Практика 05)

## Резюме

- Spec Kit (GitHub Spec Kit): ближе к многоэтапному командному workflow с явной интеграцией под корпоративные агенты (через `.opencode/commands`), сильная поддержка разбиения на spec → plan → tasks → implement и анализа `/speckit.analyze` (как slash-команда).
- OpenSpec: ориентирован на артефакты изменений (changes) с четкими инструкциями, проверками статуса и схемами; хорошо структурирует планирование (proposal/design/specs/tasks) и предоставляет операции `status`, `instructions`, `validate`, `archive`, `sync`.

## Где использовали

- UI команда — OpenSpec: создали change `delim-ui-base` и проработали `proposal.md`, `design.md`, `specs/ui/delim/expense-edit/spec.md`, `tasks.md`.
- Логика — Spec Kit: разработали спецификацию `specs/delim/001-edit-expense/spec.md`, план `plan.md`, задачи `tasks.md`, интеграцию с OpenCode и инструменты проекта.

## Сильные стороны

- Spec Kit:
  - Управляемые интеграции (opencode/coplanar), slash-команды `/speckit.*` под корпоративные агенты
  - Развитая структура анализа (анализ — read-only команды), constitution memory
  - Удобные PowerShell-скрипты для monorepo (`SPECIFY_INIT_DIR`), внятная валидация prereq

- OpenSpec:
  - Прозрачная модель изменений: `openspec status`, `instructions`, `artifacts`
  - Предиктивные подсказки: какие артефакты «blocked/ready/done»
  - Встраиваемость в локальный репозиторий без скрытых side effects

## Ограничения/нюансы

- Spec Kit:
  - CLI `specify` не исполняет `/speckit.analyze` — это slash-команда в OpenCode; запуск требует контекста агента
  - Предпочитает артефакты в nested-проектах — важно корректно задать `SPECIFY_INIT_DIR`

- OpenSpec:
  - `validate --specs` работает на main-specs; change в `openspec/changes` требует либо `archive`, либо `opsx sync` для проверки main specs.

## Практический вывод

Использование обоих SDD-фреймворков параллельно повышает дисциплину спецификаций и дает разную «оптику»: Spec Kit — процессную и агентно-ориентированную; OpenSpec — артефактно-ориентированную с прозрачным статусом изменений.
