# Repository Guidelines

## Project Structure & Module Organization
Place all runtime code inside `src/`, grouped by domain: `src/catalog/` for skill and MCP catalog logic, `src/mcps/` for MCP server logic, and shared helpers under `src/lib/`. Keep adapters (e.g., API or CLI entry points) in `src/interfaces/`. Store reusable config in `config/` (JSON or YAML) and long-form docs in `docs/`. Create mirrored test trees under `tests/unit/` and `tests/integration/` so files such as `src/catalog/sync.ts` pair with `tests/unit/catalog/sync.spec.ts`.

## Build, Test, and Development Commands
- `npm install`: install all dependencies; rerun whenever `package.json` changes.
- `npm run dev`: run the CLI in development mode; use `npm run dev -- <command>`.
- `npm run build`: generate production artifacts in `dist/`; must succeed before releasing.
- `npm run test`: execute the full Vitest suite; use `npm run test -- <path>` to scope.
- `npm run lint`: enforce the style guide (ESLint + Prettier); run before every push.

## Coding Style & Naming Conventions
Use TypeScript, target Node 18+, and stick to ES modules. Indent with two spaces, keep files under 500 lines, and group imports as Node, external, local. Use `camelCase` for functions/variables, `PascalCase` for classes/types, and `kebab-case` directories. Document exported functions with JSDoc when behavior is non-trivial. Prefer pure, composable utilities; avoid tight coupling between modules by passing DTOs instead of shared singletons.

## Testing Guidelines
Write unit tests with Vitest alongside every new feature, naming files `*.spec.ts`. Integration tests live under `tests/integration/` and should boot the real data pipeline against fixture JSON in `tests/fixtures/`. Aim for 90% statement coverage. When adding regression tests, reference the related issue ID inside the test name (e.g., `it('quarantines failing entries - GH-42')`).

## Commit & Pull Request Guidelines
Use conventional commits (`feat: add skill weighting rule`) so release tooling can infer semantic version bumps. Keep commits focused; rewrite history before sharing to remove noise. Every PR must include: summary bullets, linked issue (e.g., `Closes GH-42`), screenshots or CLI output for user-visible changes, and a checklist confirming `npm run lint`, `npm run test`, and coverage review passed. Request at least one reviewer familiar with the touched module and ensure all conversations are resolved before merging.

## Security & Configuration Tips
Store secrets in `.env.local` only; never commit them. Validate all external inputs through schema guards (`zod` or `yup`) placed in `src/lib/validation/`. When adding third-party packages, record their purpose in `docs/dependencies.md` and run `npm audit fix` if vulnerabilities surface. Rotate signing keys quarterly and document the change under `docs/security/`.
