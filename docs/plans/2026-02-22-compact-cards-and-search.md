# Compact Cards & Session Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make SessionCards two-row compact and add a global search bar that filters by folder path or goal text.

**Architecture:** Three small, self-contained file edits — `useSessions.ts` gains an optional search term wired into TanStack DB's `.where()`, `SessionCard.tsx` gets a two-row layout, and `index.tsx` gains the search input that threads the term down. No new files, no schema changes.

**Tech Stack:** React 19, Radix UI Themes, TanStack DB `useLiveQuery`, TypeScript

---

### Task 1: Compact two-row `SessionCard`

**Files:**
- Modify: `packages/ui/src/components/SessionCard.tsx`

The current card has 4 rows with `gap="4"` (~140px). Replace with a 2-row layout in `gap="1"` with `Card size="1"` (tighter padding). Keep the `HoverCard` content completely unchanged.

New layout:
- **Row 1** — `~/path · branch-or-PR-badge · tool-badge-if-pending` (left) | `time · msgs` (right)
- **Row 2** — goal text, `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` full-width

**Step 1: Replace the card body in `SessionCard.tsx`**

Find and replace the `<Card size="2" ...>` block (lines 121–183) with:

```tsx
<Card size="1" className={getCardClass(session)}>
  <Flex direction="column" gap="1">
    {/* Row 1: path · branch/PR/tool  |  time · msgs */}
    <Flex justify="between" align="center" gap="2">
      <Flex align="center" gap="1" style={{ minWidth: 0, overflow: "hidden" }}>
        <Text
          size="1"
          color="gray"
          style={{
            fontFamily: "var(--code-font-family)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flexShrink: 1,
          }}
        >
          {dirPath}
        </Text>
        {showPendingTool ? (
          <>
            <Text size="1" color="gray" style={{ flexShrink: 0 }}>·</Text>
            <Code size="1" color="orange" variant="soft" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
              {toolIcons[session.pendingTool!.tool] ?? "⚙"}{" "}
              {session.pendingTool!.tool}: {formatTarget(session.pendingTool!.target)}
            </Code>
          </>
        ) : session.pr ? (
          <>
            <Text size="1" color="gray" style={{ flexShrink: 0 }}>·</Text>
            <a
              href={session.pr.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ textDecoration: "none", flexShrink: 0 }}
            >
              <Badge color={getCIStatusColor(session.pr.ciStatus)} variant="soft" size="1">
                {getCIStatusIcon(session.pr.ciStatus)} #{session.pr.number}
              </Badge>
            </a>
          </>
        ) : session.gitBranch ? (
          <>
            <Text size="1" color="gray" style={{ flexShrink: 0 }}>·</Text>
            <Code size="1" variant="soft" color="gray" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
              {session.gitBranch.length > 20
                ? session.gitBranch.slice(0, 17) + "..."
                : session.gitBranch}
            </Code>
          </>
        ) : null}
      </Flex>
      <Text size="1" color="gray" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
        {formatTimeAgo(session.lastActivityAt)} · {session.messageCount}
      </Text>
    </Flex>

    {/* Row 2: goal text */}
    <Text
      size="2"
      weight="medium"
      highContrast
      style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
    >
      {session.goal || session.originalPrompt.slice(0, 80)}
    </Text>
  </Flex>
</Card>
```

**Step 2: Verify TypeScript compiles**

```bash
cd packages/ui && npx tsc --noEmit
```

Expected: zero errors.

**Step 3: Commit**

```bash
git add packages/ui/src/components/SessionCard.tsx
git commit -m "feat: compact two-row session card layout"
```

---

### Task 2: Wire search term into `useSessions`

**Files:**
- Modify: `packages/ui/src/hooks/useSessions.ts`

`useLiveQuery` needs to accept a `searchTerm` and add `.where()` when non-empty. This keeps filtering inside TanStack DB per `CLAUDE.md`.

**Step 1: Update `useSessions` signature and query**

Replace the `useSessions` function body:

```ts
export function useSessions(searchTerm = "") {
  const db = getSessionsDbSync();
  const term = searchTerm.trim().toLowerCase();

  const query = useLiveQuery(
    (q) => {
      const base = q
        .from({ sessions: db.collections.sessions })
        .orderBy(({ sessions }) => sessions.lastActivityAt, "desc");

      if (!term) return base;

      return base.where(({ sessions }) =>
        sessions.cwd.toLowerCase().includes(term) ||
        sessions.goal.toLowerCase().includes(term)
      );
    },
    [db, term]
  );

  const sessions: Session[] = query?.data
    ? Array.from(query.data.values())
    : [];

  return {
    sessions,
    isLoading: query?.isLoading ?? false,
  };
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd packages/ui && npx tsc --noEmit
```

Expected: zero errors. If TanStack DB's `.where()` doesn't accept a plain boolean predicate, you may need to check the TanStack DB version docs — but `.where()` with a predicate returning `boolean` is standard for this library's API.

**Step 3: Commit**

```bash
git add packages/ui/src/hooks/useSessions.ts
git commit -m "feat: add search term filtering to useSessions via where()"
```

---

### Task 3: Add search bar to `IndexPage`

**Files:**
- Modify: `packages/ui/src/routes/index.tsx`

Add a `TextField.Root` search input at the top of the page. Pass the search term to `useSessions`. Hide repo sections with zero matching sessions.

**Step 1: Replace `IndexPage` in `index.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { Flex, Text, TextField, IconButton } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { RepoSection } from "../components/RepoSection";
import { useSessions, groupSessionsByRepo } from "../hooks/useSessions";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { sessions } = useSessions(searchTerm);

  // Force re-render every minute to update relative times and activity scores
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const repoGroups = groupSessionsByRepo(sessions).filter(
    (g) => g.sessions.length > 0
  );

  if (!searchTerm && sessions.length === 0) {
    return (
      <Flex direction="column" align="center" gap="3" py="9">
        <Text color="gray" size="3">No sessions found</Text>
        <Text color="gray" size="2">Start a Claude Code session to see it here</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="5">
      {/* Search bar */}
      <TextField.Root
        size="2"
        placeholder="Filter by folder or goal…"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ maxWidth: 360 }}
      >
        {searchTerm && (
          <TextField.Slot side="right">
            <IconButton
              size="1"
              variant="ghost"
              color="gray"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
            >
              ✕
            </IconButton>
          </TextField.Slot>
        )}
      </TextField.Root>

      {/* Repo sections (empty ones hidden by filter above) */}
      {repoGroups.length === 0 ? (
        <Text color="gray" size="2">No sessions match "{searchTerm}"</Text>
      ) : (
        repoGroups.map((group) => (
          <RepoSection
            key={group.repoId}
            repoId={group.repoId}
            repoUrl={group.repoUrl}
            sessions={group.sessions}
            activityScore={group.activityScore}
          />
        ))
      )}
    </Flex>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd packages/ui && npx tsc --noEmit
```

Expected: zero errors.

**Step 3: Build**

```bash
cd packages/ui && npm run build
```

Expected: build succeeds with no errors.

**Step 4: Commit**

```bash
git add packages/ui/src/routes/index.tsx
git commit -m "feat: add global session search bar with folder/goal filtering"
```

---

### Task 4: Visual verification

**Step 1: Start dev server**

```bash
cd packages/ui && npm run dev
```

Open `http://localhost:5173` (or whichever port Vite prints).

**Step 2: Verify compact cards**

- Cards should be ~56px tall (two lines), not the old ~140px
- Row 1: path on the left, time · msg count on the right
- If session has a branch: `· branch-name` appears after the path (monospace)
- If session has a pending tool: `· ToolName: target` badge appears in orange after path
- Row 2: goal text, truncated with ellipsis if long
- Hover card still shows full detail (unchanged)

**Step 3: Verify search**

- Type a folder name substring (e.g., `myapp`) — only sessions with that in their `cwd` appear
- Type part of a goal (e.g., `auth`) — only sessions matching show
- Repo sections with no matches disappear
- Clear button (`✕`) appears while typing; clicking it resets all sessions
- Empty state shows `No sessions match "term"` when nothing matches

**Step 4: Commit (if any fixup needed)**

```bash
git add -p
git commit -m "fix: visual corrections to compact cards and search"
```
