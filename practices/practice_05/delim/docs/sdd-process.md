# Делим — процесс SDD

1. Две независимые команды:
   - UI: `docs/ui-spec-v1.md`, вопросы: `docs/ui-open-questions.md`.
   - Логика: `docs/logic-spec-v1.md`, вопросы: `docs/logic-open-questions.md`.

2. Обнаруженные расхождения и решения:
   - См. `docs/decisions.md` — уникальность имён, формат ID, распределение копеек, детерминизм, localStorage, ошибки.

3. Согласование и выпуск v2:
   - Контракт: `docs/contract.md`.
   - UI v2: `docs/ui-spec-v2.md`.
   - Логика v2: `docs/logic-spec-v2.md`.
   - Коммит согласования ДО реализации: f1d83ccc69880ffb3d3a6ad75d21a1b533f2c65f.

4. Spec Kit (локально):
   - Конституция обновлена: `.specify/memory/constitution.md`.
   - Артефакты: `specs/delim/spec.md`, `specs/delim/plan.md`, `specs/delim/tasks.md`, `specs/delim/checklist.md`.
   - CLI `specify` не найден в PATH; модульные точки входа недоступны — этапы выполнены через локальные шаблоны `.specify`.

5. Реализация:
   - Стек: React + TypeScript + Vite + Vitest.
   - Структура кода по слоям: контракт, логика, storage, UI, тесты.

6. Тестирование:
   - Запуск тестов, сборка, проверка типов — см. `docs/testing-report.md`.
