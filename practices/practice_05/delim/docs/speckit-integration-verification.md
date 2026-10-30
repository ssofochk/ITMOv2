# Spec Kit × OpenCode Integration Verification (Practice 05 / delim)

This document records the actual steps and evidence used to restore the Spec Kit CLI and configure the official OpenCode integration for the nested project `practices/practice_05/delim/` within the monorepo `ITMOv2`.

## CLI Version

- specify CLI: 1.2.5
- Python: 3.14.0
- Platform: Windows AMD64

Verified by running (with full path):

```
C:\Users\ssofochka\AppData\Roaming\Python\Python314\Scripts\specify.exe version
```

## Executable Location

- Package `specify-cli` installed under:
  - `C:\Users\ssofochka\AppData\Roaming\Python\Python314\site-packages`
- Entry point:
  - `site-packages\specify_cli-1.2.5.dist-info\entry_points.txt` → `specify = specify_cli:main`
- Executable discovered at:
  - `C:\Users\ssofochka\AppData\Roaming\Python\Python314\Scripts\specify.exe`

Reason CLI was initially “missing”:
- `pip` on PATH was not resolved, but `python -m pip show specify-cli` confirmed installation in the user site-packages; using the full `Scripts\specify.exe` path works reliably.

## Commands Run (Installation and Selection)

All commands executed from the monorepo root `ITMOv2` with `SPECIFY_INIT_DIR` targeting the nested project.

```
set SPECIFY_INIT_DIR=practices/practice_05/delim
C:\Users\ssofochka\AppData\Roaming\Python\Python314\Scripts\specify.exe integration list
C:\Users\ssofochka\AppData\Roaming\Python\Python314\Scripts\specify.exe integration info opencode
C:\Users\ssofochka\AppData\Roaming\Python\Python314\Scripts\specify.exe integration install opencode --integration-options="--events false" --force
C:\Users\ssofochka\AppData\Roaming\Python\Python314\Scripts\specify.exe integration use opencode
C:\Users\ssofochka\AppData\Roaming\Python\Python314\Scripts\specify.exe integration status --json
```

Notes:
- `opencode` is declared multi-install safe, but `copilot` is not; installation used `--force` to keep existing Copilot artifacts while activating OpenCode as default.
- Events disabled per requirement via `--integration-options="--events false"`.

## Registered Integrations

Before:
- Default: `copilot`
- Installed: `copilot`

After install + use:
- Default: `opencode`
- Installed: `copilot`, `opencode`
- Status finding: `unsafe-multi-install` warning due to Copilot not being multi-install safe. We did not uninstall Copilot to preserve artifacts as requested.

## OpenCode Command Files (Paths)

Spec Kit installed official command markdowns inside the nested project:

- `practices/practice_05/delim/.opencode/commands/speckit.analyze.md`
- `practices/practice_05/delim/.opencode/commands/speckit.clarify.md`
- `practices/practice_05/delim/.opencode/commands/speckit.constitution.md`
- `practices/practice_05/delim/.opencode/commands/speckit.converge.md`
- `practices/practice_05/delim/.opencode/commands/speckit.implement.md`
- `practices/practice_05/delim/.opencode/commands/speckit.plan.md`
- `practices/practice_05/delim/.opencode/commands/speckit.specify.md`
- `practices/practice_05/delim/.opencode/commands/speckit.tasks.md`
- `practices/practice_05/delim/.opencode/commands/speckit.taskstoissues.md`

We also registered the same commands at the monorepo root under `.opencode/commands/` to ensure corporate OpenCode discovers them without altering `opencode.json` or providers/models, while using `SPECIFY_INIT_DIR` for scoping to the nested project.

## Project Selection Mechanism

- Environment variable `SPECIFY_INIT_DIR` set to `practices/practice_05/delim` ensures all Spec Kit operations target the nested project.
- This follows the official monorepo guide and prevents accidental writes to the repo root.

## Integrity Checks (No Re-init)

- `.specify/`, `docs/`, and `specs/` under `practices/practice_05/delim/` remain intact.
- No `specify init` re-run; no `--force` used on shared templates beyond the necessary integration `--force` to allow multi-install.
- `--events false` confirmed supported by CLI 1.2.5.

## Verification Results

1. CLI restored:
   - `specify version` works via full path.
   - `specify integration --help` shows expected subcommands.
2. Integration installed and selected:
   - `specify integration install opencode --integration-options="--events false" --force` succeeded.
   - `specify integration use opencode` set `opencode` as default.
3. Command files present:
   - Official Spec Kit command markdowns exist in `practices/practice_05/delim/.opencode/commands/`.
4. OpenCode discovery:
   - Root `.opencode/commands/` contains the Spec Kit commands to enable corporate OpenCode discovery.
   - Use `SPECIFY_INIT_DIR` to scope execution to the nested project.

## Outstanding Constraints / Manual Check

- We did not remove the existing Copilot integration (preserving artifacts as requested). Status reports an `unsafe-multi-install` warning; acceptable given constraints.
- Corporate OpenCode session runs from `ITMOv2` root and should discover commands under `.opencode/commands/`. Actual agent execution verification requires an interactive run.

### Manual Verification Command (Run from ITMOv2 root in OpenCode)

Set the environment variable and invoke a command that reads project artifacts:

```
SPECIFY_INIT_DIR=practices/practice_05/delim /speckit.converge "Sanity check"
```

Expected observable outcome in the OpenCode chat:
- The command loads `spec.md`, `plan.md`, and `tasks.md` from `practices/practice_05/delim/specs/...` (via `.specify/feature.json` or check-prerequisites script).
- It either reports "✅ Converged" with summary metrics or appends a convergence phase in `tasks.md` within the nested project (if gaps exist). The prompt output will include file paths under `practices/practice_05/delim/`.

Alternative check:

```
SPECIFY_INIT_DIR=practices/practice_05/delim /speckit.analyze "Quick review"
```

This should produce a read-only analysis report referencing nested project files.

## Blockers / Notes

- None remaining for CLI or integration setup.
- Multi-install safety warning persists due to retained Copilot; we avoided uninstall per requirement.

## Appendix: Quick Status JSON

Example after setup:

```
{
  "default_integration": "opencode",
  "installed_integrations": ["copilot", "opencode"],
  "multi_install_safe": false,
  "manifests": {
    "opencode": {"manifest": ".specify/integrations/opencode.manifest.json"}
  }
}
```
