# Agent Guidelines

## Package Manager

This project uses **pnpm** (not npm or yarn). Always use `pnpm` commands:

- `pnpm install` - Install dependencies
- `pnpm add <package>` - Add a dependency
- `pnpm dev` - Run development server
- `pnpm build` - Build for production

## Code Style

- Prefer `const` over `let` whenever the variable is not reassigned

## Commits

- Conventional commits, lowercase, imperative: `fix: show share URL input on iOS Safari`.
- One commit per change — squash, don't stack fixups.
- Subject only. Add a body just when the _why_ isn't obvious from the diff, and keep
  it to a few wrapped lines.
- No `Co-Authored-By`, no `Generated with Claude Code`, no session links, no emoji.

## Modules

- Use ESM `import`, not CommonJS `require` — in source, scripts, and ad-hoc
  verification snippets (e.g. `node --input-type=module -e "import { x } from './frontend/src/lib/api.svelte.ts'"`).
