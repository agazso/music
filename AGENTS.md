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

## Product Feel

The app is a video game, not a CRUD interface: performant, reactive, low latency. The user should feel in
control and feel good using it.

- Every input answers on the next frame. Show the response first, then let the data settle behind it.
- Never block the UI on the network or the scanner: show what is there, refine in the background (paging,
  cover warming, polling). Background work must not starve what is on screen.
- The user stays in control: no layout jumps, reshuffles, scroll or focus changes they did not ask for.
  A background refresh replaces content in place, it never resets the view.
- Anything ongoing shows its state (indexing, loading) at a lively rate, not a sluggish one.
- Hold 60 fps through transitions and scrolling; measure on a phone, not just the desktop.
