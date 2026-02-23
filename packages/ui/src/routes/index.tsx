import { createFileRoute } from "@tanstack/react-router";
import { Box, Flex, Text, TextField, IconButton, Button } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { RepoSection } from "../components/RepoSection";
import { useSessions, groupSessionsByPath } from "../hooks/useSessions";
import type { DateFilter } from "../hooks/useSessions";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

const DATE_LABELS: Record<DateFilter, string> = {
  today: "Today",
  "3days": "3d",
  week: "Week",
  month: "Month",
};

const DATE_OPTIONS: DateFilter[] = ["today", "3days", "week", "month"];

type StatusOption = "working" | "waiting" | "idle";

const STATUS_CHIPS: { value: StatusOption; label: string; color: React.ComponentProps<typeof Button>["color"] }[] = [
  { value: "working", label: "⚡ Working", color: "green" },
  { value: "waiting", label: "⏳ Waiting", color: "yellow" },
  { value: "idle", label: "💤 Idle", color: "gray" },
];

function FilterChip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color: React.ComponentProps<typeof Button>["color"];
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button size="1" variant={active ? "soft" : "ghost"} color={color} onClick={onClick}>
      {children}
    </Button>
  );
}

function IndexPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilters, setStatusFilters] = useState<Set<StatusOption>>(new Set());
  const [pendingOnly, setPendingOnly] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter | null>(null);
  const [hasPR, setHasPR] = useState(false);

  // Force re-render every minute to update relative times and activity scores
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const { sessions } = useSessions({
    searchTerm,
    statuses: statusFilters,
    pendingOnly,
    dateFilter,
    hasPR,
  });

  const hasActiveFilters = statusFilters.size > 0 || pendingOnly || dateFilter !== null || hasPR;

  const toggleStatus = (status: StatusOption) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const toggleDate = (d: DateFilter) => setDateFilter((prev) => (prev === d ? null : d));

  const clearFilters = () => {
    setStatusFilters(new Set());
    setPendingOnly(false);
    setDateFilter(null);
    setHasPR(false);
  };

  const repoGroups = groupSessionsByPath(sessions).filter((g) => g.sessions.length > 0);

  if (!searchTerm && !hasActiveFilters && sessions.length === 0) {
    return (
      <Flex direction="column" align="center" gap="3" py="9">
        <Text color="gray" size="3">No sessions found</Text>
        <Text color="gray" size="2">Start a Claude Code session to see it here</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4">
      {/* Search bar */}
      <Box maxWidth="360px">
        <TextField.Root
          size="2"
          placeholder="Filter by folder or goal…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        >
          {searchTerm.trim() && (
            <TextField.Slot side="right">
              <IconButton
                type="button"
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
      </Box>

      {/* Filter chip strip */}
      <Flex align="center" gap="1" wrap="wrap">
        {/* Status */}
        {STATUS_CHIPS.map(({ value, label, color }) => (
          <FilterChip key={value} active={statusFilters.has(value)} color={color} onClick={() => toggleStatus(value)}>
            {label}
          </FilterChip>
        ))}

        <Text size="1" color="gray" mx="1">·</Text>

        {/* Needs Approval */}
        <FilterChip active={pendingOnly} color="orange" onClick={() => setPendingOnly((v) => !v)}>
          🔔 Needs Approval
        </FilterChip>

        <Text size="1" color="gray" mx="1">·</Text>

        {/* Date */}
        {DATE_OPTIONS.map((d) => (
          <FilterChip key={d} active={dateFilter === d} color="blue" onClick={() => toggleDate(d)}>
            {DATE_LABELS[d]}
          </FilterChip>
        ))}

        <Text size="1" color="gray" mx="1">·</Text>

        {/* Has PR */}
        <FilterChip active={hasPR} color="violet" onClick={() => setHasPR((v) => !v)}>
          🔀 Has PR
        </FilterChip>

        {/* Clear all */}
        {hasActiveFilters && (
          <Button size="1" variant="ghost" color="gray" onClick={clearFilters} ml="1">
            ✕ Clear
          </Button>
        )}
      </Flex>

      {/* Repo sections (empty ones hidden) */}
      {repoGroups.length === 0 ? (
        <Text color="gray" size="2">
          {searchTerm || hasActiveFilters ? "No sessions match the current filters" : "No sessions found"}
        </Text>
      ) : (
        repoGroups.map((group) => (
          <RepoSection
            key={group.path}
            path={group.path}
            displayPath={group.displayPath}
            repoUrl={group.repoUrl}
            sessions={group.sessions}
            activityScore={group.activityScore}
          />
        ))
      )}
    </Flex>
  );
}
