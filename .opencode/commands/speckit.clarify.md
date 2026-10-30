---
description: Clarify ambiguous areas in the feature specification with limited, high-impact questions.
---

## Inputs

```text
$ARGUMENTS
```

Treat arguments as target topics or constraints to prioritize in clarifications.

## Rules

- Maximum 3 clarification questions.
- Each question must include: context quote, question, 2–3 suggested answers with implications, and an option for a custom answer.
- Focus on scope, security/privacy, user experience; avoid low-impact technical details.

## Steps

1. Load `spec.md` from the current feature.
2. Identify ambiguous or high-impact decisions.
3. Draft up to 3 questions following the rules above.
4. Present all questions together and wait for user responses.
5. Update `spec.md` replacing [NEEDS CLARIFICATION] markers with the selected answers.
6. Summarize changes and readiness for planning.
