/**
 * OpenCode 2.0.20 plugin: run practice_04 check.sh after write/edit/patch
 */
export default {
  id: "practice-04-check-after-edit",

  setup(ctx) {
    ctx.tool.hook("execute.after", async (event) => {
      const tool = event.tool;
      if (tool !== "write" && tool !== "edit" && tool !== "patch") {
        return;
      }

      const { execa } = await import("execa");

      try {
        const result = await execa("sh", ["practices/practice_04/scripts/check.sh"], {
          cwd: process.cwd(),
          reject: false,
        });

        const output = [
          `=== practice_04 auto-check (${tool}) ===`,
          `exit code: ${result.exitCode}`,
          result.stdout ? `stdout:\n${result.stdout}` : "",
          result.stderr ? `stderr:\n${result.stderr}` : "",
          "=== end auto-check ===",
        ].filter(Boolean).join("\n");

        if (event.status === "completed") {
          event.result = {
            ...event.result,
            output: (event.result?.output || "") + "\n" + output,
          };
        }
      } catch (err) {
        const output = [
          `=== practice_04 auto-check (${tool}) ===`,
          `error: ${err.message}`,
          "=== end auto-check ===",
        ].join("\n");

        if (event.status === "completed") {
          event.result = {
            ...event.result,
            output: (event.result?.output || "") + "\n" + output,
          };
        }
      }
    });
  },
};