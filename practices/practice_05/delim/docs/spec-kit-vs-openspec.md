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
