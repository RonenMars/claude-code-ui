import { useLiveQuery } from "@tanstack/react-db";
import { ilike, or, and, inArray, gte, eq, not, isNull } from "@tanstack/db";
import { getSessionsDbSync } from "../data/sessionsDb";
import type { Session } from "../data/schema";

export type DateFilter = "today" | "3days" | "week" | "month";

export interface SessionFilters {
  searchTerm?: string;
  statuses?: Set<string>;
  pendingOnly?: boolean;
  dateFilter?: DateFilter | null;
  hasPR?: boolean;
}

function getDateCutoff(filter: DateFilter): string {
  const now = new Date();
  if (filter === "today") {
    now.setHours(0, 0, 0, 0);
  } else {
    const days = { "3days": 3, week: 7, month: 30 }[filter];
    now.setDate(now.getDate() - days);
  }
  return now.toISOString();
}

/**
 * Hook to get all sessions from the StreamDB.
 * Returns reactive data that updates when sessions change.
 *
 * NOTE: This must only be called after the root loader has run,
 * which initializes the db via getSessionsDb().
 */
export function useSessions(filters: SessionFilters = {}) {
  const db = getSessionsDbSync();
  const {
    searchTerm = "",
    statuses,
    pendingOnly = false,
    dateFilter = null,
    hasPR = false,
  } = filters;
  const term = searchTerm.trim().toLowerCase();

  const query = useLiveQuery(
    (q) => {
      const base = q
        .from({ sessions: db.collections.sessions })
        .orderBy(({ sessions }) => sessions.lastActivityAt, "desc");

      const statusList = statuses && statuses.size > 0 ? [...statuses] : null;
      const hasFilters = term || statusList || pendingOnly || dateFilter || hasPR;
      if (!hasFilters) return base;

      return base.where(({ sessions }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let result: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const add = (cond: any) => { result = result ? and(result, cond) : cond; };

        if (term) add(or(ilike(sessions.cwd, `%${term}%`), ilike(sessions.goal, `%${term}%`)));
        if (statusList) add(inArray(sessions.status, statusList));
        if (pendingOnly) add(eq(sessions.hasPendingToolUse, true));
        if (dateFilter) add(gte(sessions.lastActivityAt, getDateCutoff(dateFilter)));
        if (hasPR) add(not(isNull(sessions.pr)));

        return result;
      });
    },
    [db, term, statuses, pendingOnly, dateFilter, hasPR]
  );

  const sessions: Session[] = query?.data
    ? Array.from(query.data.values())
    : [];

  return {
    sessions,
    isLoading: query?.isLoading ?? false,
  };
}

// Activity score weights
const STATUS_WEIGHTS: Record<Session["status"], number> = {
  working: 100,
  waiting: 50,
  idle: 1,
};

const PENDING_TOOL_BONUS = 30;

/**
 * Calculate activity score for a repo group
 */
function calculateRepoActivityScore(sessions: Session[]): number {
  const now = Date.now();

  return sessions.reduce((score, session) => {
    const ageMs = now - new Date(session.lastActivityAt).getTime();
    const ageMinutes = ageMs / (1000 * 60);

    let sessionScore = STATUS_WEIGHTS[session.status];
    if (session.hasPendingToolUse) {
      sessionScore += PENDING_TOOL_BONUS;
    }

    const decayFactor = Math.pow(0.5, ageMinutes / 30);
    return score + sessionScore * decayFactor;
  }, 0);
}

export interface PathGroup {
  path: string;
  displayPath: string;
  repoUrl: string | null;
  sessions: Session[];
  activityScore: number;
}

/**
 * Group sessions by local directory (cwd), sorted by activity score
 */
export function groupSessionsByPath(sessions: Session[]): PathGroup[] {
  const groups = new Map<string, Session[]>();

  for (const session of sessions) {
    const existing = groups.get(session.cwd) ?? [];
    existing.push(session);
    groups.set(session.cwd, existing);
  }

  const groupsWithScores = Array.from(groups.entries()).map(([path, sessions]) => {
    const repoUrl = sessions.find((s) => s.gitRepoUrl)?.gitRepoUrl ?? null;
    return {
      path,
      displayPath: path.replace(/^\/Users\/[^/]+/, "~"),
      repoUrl,
      sessions,
      activityScore: calculateRepoActivityScore(sessions),
    };
  });

  groupsWithScores.sort((a, b) => b.activityScore - a.activityScore);

  return groupsWithScores;
}
