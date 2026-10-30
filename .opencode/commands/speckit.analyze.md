---
description: Analyze the current feature specification and artifacts to assess completeness, consistency, and readiness.
agent: plan
---

## Inputs

```text
$ARGUMENTS
```

If arguments are provided, treat them as analysis focus areas or specific concerns to investigate.

## Scope

Perform a structured analysis of the active feature under the Spec Kit project:

1. Load project memory and context:
   - If `.specify/memory/constitution.md` exists, read and incorporate its rules
   - If `.specify/feature.json` exists, read `feature_directory` and use it to locate current feature artifacts
   - If `feature_directory` is missing, search `specs/` for the most recently updated feature directory

2. Inspect feature artifacts:
   - `spec.md`
   - `plan.md` (if present)
   - `tasks.md` (if present)
   - `checklist.md` (if present)
   - Any `docs/` references relevant to the feature

3. Assess quality and readiness:
   - Completeness of required sections
   - Presence of measurable, technology-agnostic success criteria
   - Testability and clarity of requirements
   - Alignment with constitution and governance constraints
   - Consistency across spec, plan, tasks, and checklists

4. Identify gaps and risks:
   - Missing or ambiguous requirements
   - Over-specified implementation details
   - Conflicts between artifacts
   - Missing acceptance scenarios or edge cases

5. Produce a clear report:
   - Summary of findings
   - Specific quotes/locations from artifacts
   - Prioritized recommendations
   - Next-step guidance (e.g., run `/speckit.clarify`, update specific sections, add tests)

## Output Format

Return a concise, structured markdown report with sections:

- Overview
- Strengths
- Gaps
- Risks
- Recommendations
- Next Steps

Prefer direct references to file paths and line ranges where applicable.
