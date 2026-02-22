# Compact Cards & Session Search Design

**Date**: 2026-02-22
**Status**: Approved

## Problem

Kanban cards are too tall (~140px each), limiting how many sessions are visible at once. There is also no way to filter or find sessions by working directory or goal.

## Solution

Two focused changes to `packages/ui/src`:

1. Compact two-row `SessionCard` layout
2. Global search bar in `index.tsx` filtering by `cwd` and `goal`

---

## 1. Compact Cards

### Layout

Replace the current 4-row layout (path, heading, summary, footer) with a 2-row layout:

**Row 1** — metadata line (monospace, `size="1"`, gray):
- Left: truncated `cwd` path (e.g. `~/projects/myapp`)
- Center: separator `·` then branch name (or tool badge if `hasPendingToolUse`)
- Right: `time · msgs`

**Row 2** — goal line (`size="2"`, normal weight):
- Full width: `goal` text, truncated to one line via CSS `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`

### Changes

- `SessionCard.tsx`: rewrite card body to two-row layout; drop summary row; use `Card size="1"` for tighter padding; keep `HoverCard` unchanged
- `index.css`: no animation changes needed

### Result

~56px per card vs ~140px current — roughly 2.5× more cards visible.

---

## 2. Search / Filter

### Behavior

- Text input at top of `IndexPage` with placeholder `Filter by folder or goal…`
- Filters sessions where `cwd` **or** `goal` contains the search string (case-insensitive)
- `RepoSection`s with zero matching sessions are hidden
- Clear button (`×`) appears when input is non-empty

### Implementation

- Search term stored as `useState<string>` in `IndexPage`
- Passed into `useSessions(searchTerm)` and used in TanStack DB `.where()` predicate (respects `CLAUDE.md` — no JS-level array filtering)
- `groupSessionsByRepo` receives already-filtered sessions; sections with `sessions.length === 0` are skipped in the render loop

### Files Changed

| File | Change |
|------|--------|
| `components/SessionCard.tsx` | Two-row compact layout |
| `routes/index.tsx` | Search bar UI + pass term to `useSessions` |
| `hooks/useSessions.ts` | Accept optional `searchTerm`, add `.where()` to query |

No new files. No changes to `KanbanColumn.tsx`, `RepoSection.tsx`, schema, or daemon.
