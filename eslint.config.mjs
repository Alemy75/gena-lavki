import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "prisma/seed.js",
    // .claude/ целиком в .gitignore, но eslint его всё равно обходил: рабочие
    // worktree-каталоги внутри (.claude/worktrees/*) — это копии проекта, и их
    // исходники с .next давали сотни чужих ошибок в выводе `pnpm lint`.
    ".claude/**",
  ]),
]);

export default eslintConfig;
