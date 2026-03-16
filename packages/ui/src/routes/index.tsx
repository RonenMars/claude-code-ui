import { createFileRoute } from "@tanstack/react-router";
import { Box, Flex, Text, TextField, IconButton, Button } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { RepoSection } from "../components/RepoSection";
import { useSessions, groupSessionsByPath } from "../hooks/useSessions";
import type { HourFilter } from "../hooks/useSessions";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

const HOUR_OPTIONS: HourFilter[] = ["0.5h", "1h", "2h", "4h", "8h", "24h", "48h"];

const HOUR_ICONS: Record<HourFilter, string> = {
  "0.5h": "◔", "1h": "◑", "2h": "◕", "4h": "●", "8h": "◉", "24h": "⊛", "48h": "⊕",
};

// A — Neon card grid
function NeonCardFilter({
  value,
  onChange,
}: {
  value: HourFilter | null;
  onChange: (v: HourFilter | null) => void;
}) {
  return (
    <Flex align="center" gap="3">
      <Text size="2" color="gray" style={{ minWidth: "90px" }}>A · cards</Text>
      <Flex gap="2">
        {HOUR_OPTIONS.map((h) => {
          const isActive = value === h;
          return (
            <Box
              key={h}
              onClick={() => onChange(isActive ? null : h)}
              style={{
                width: "72px",
                height: "68px",
                borderRadius: "10px",
                border: isActive ? "1.5px solid var(--cyan-9)" : "1.5px solid var(--gray-4)",
                background: isActive
                  ? "linear-gradient(145deg, rgba(0,220,255,0.12) 0%, rgba(0,160,220,0.06) 100%)"
                  : "var(--gray-2)",
                boxShadow: isActive
                  ? "0 0 14px 3px var(--cyan-8), 0 0 28px 8px rgba(0,210,255,0.18), inset 0 0 10px rgba(0,210,255,0.07)"
                  : "inset 0 1px 0 rgba(255,255,255,0.04)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease",
                userSelect: "none",
              }}
            >
              <Text style={{
                fontSize: "20px",
                lineHeight: 1,
                color: isActive ? "var(--cyan-10)" : "var(--gray-7)",
                filter: isActive ? "drop-shadow(0 0 6px var(--cyan-9))" : "none",
                transition: "color 0.15s ease, filter 0.15s ease",
              }}>
                {HOUR_ICONS[h]}
              </Text>
              <Text style={{
                fontFamily: "monospace",
                fontSize: "11px",
                fontWeight: "600",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: isActive ? "var(--cyan-11)" : "var(--gray-9)",
                textShadow: isActive ? "0 0 8px var(--cyan-9)" : "none",
                transition: "color 0.15s ease, text-shadow 0.15s ease",
              }}>
                {h}
              </Text>
            </Box>
          );
        })}
      </Flex>
    </Flex>
  );
}

// B — Rotary dial (UIverse grumpy-deer-99 adapted, dark metallic + neon glow)
const DIAL_SIZE = 80;
const DIAL_CONTAINER = 160;
const DIAL_CENTER = DIAL_CONTAINER / 2;

function DialFilter({
  value,
  onChange,
}: {
  value: HourFilter | null;
  onChange: (v: HourFilter | null) => void;
}) {
  const N = HOUR_OPTIONS.length;
  const degPerStep = 360 / N;
  const selectedIdx = value ? HOUR_OPTIONS.indexOf(value) : -1;
  const dialAngle = selectedIdx >= 0 ? selectedIdx * degPerStep - 90 : -90;

  return (
    <Flex align="center" gap="3">
      <Text size="2" color="gray" style={{ minWidth: "90px" }}>B · dial</Text>
      <Box style={{ position: "relative", width: `${DIAL_CONTAINER}px`, height: `${DIAL_CONTAINER}px`, flexShrink: 0 }}>
        {/* Labels + click zones around the outside */}
        {HOUR_OPTIONS.map((h, i) => {
          const angleRad = ((i / N) * 360 - 90) * (Math.PI / 180);
          const lx = DIAL_CENTER + 58 * Math.cos(angleRad);
          const ly = DIAL_CENTER + 58 * Math.sin(angleRad);
          const isActive = value === h;
          return (
            <Box
              key={h}
              onClick={() => onChange(isActive ? null : h)}
              style={{
                position: "absolute",
                left: `${lx}px`,
                top: `${ly}px`,
                transform: "translate(-50%, -50%)",
                cursor: "pointer",
                zIndex: 10,
                padding: "6px",
              }}
            >
              <Text size="1" style={{
                fontFamily: "monospace",
                fontSize: "10px",
                fontWeight: isActive ? "700" : "400",
                color: isActive ? "var(--cyan-11)" : "var(--gray-8)",
                textShadow: isActive ? "0 0 8px var(--cyan-9)" : "none",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}>
                {h}
              </Text>
            </Box>
          );
        })}

        {/* Dial circle */}
        <Box style={{
          position: "absolute",
          width: `${DIAL_SIZE}px`,
          height: `${DIAL_SIZE}px`,
          top: `${DIAL_CENTER - DIAL_SIZE / 2}px`,
          left: `${DIAL_CENTER - DIAL_SIZE / 2}px`,
          backgroundImage: [
            "conic-gradient(from -2deg, rgba(200,200,255,0.15), rgba(0,0,0,0.3), rgba(200,200,255,0.15), rgba(0,0,0,0.3), rgba(200,200,255,0.15))",
            "radial-gradient(circle at 30% 30%, #2a2a3e, #0d0d1a)",
          ].join(", "),
          border: "3px solid rgba(0,0,0,0.5)",
          borderRadius: "50%",
          boxShadow: value
            ? "0 0 18px 5px var(--cyan-8), 0 0 36px 12px rgba(0,200,255,0.18)"
            : "0 3px 12px rgba(0,0,0,0.6)",
          transition: "box-shadow 0.2s ease",
        }}>
          {/* Tick dots on dial face */}
          {HOUR_OPTIONS.map((h, i) => {
            const angleRad = ((i / N) * 360 - 90) * (Math.PI / 180);
            const tx = DIAL_SIZE / 2 + 34 * Math.cos(angleRad);
            const ty = DIAL_SIZE / 2 + 34 * Math.sin(angleRad);
            const isActive = value === h;
            return (
              <Box key={`tick-${h}`} style={{
                position: "absolute",
                width: isActive ? "5px" : "3px",
                height: isActive ? "5px" : "3px",
                borderRadius: "50%",
                background: isActive ? "var(--cyan-9)" : "rgba(255,255,255,0.55)",
                left: `${tx}px`,
                top: `${ty}px`,
                transform: "translate(-50%, -50%)",
                boxShadow: isActive ? "0 0 6px 2px var(--cyan-9)" : "none",
                transition: "all 0.15s ease",
                pointerEvents: "none",
              }} />
            );
          })}

          {/* Glowing pointer */}
          <Box style={{
            position: "absolute",
            width: "28px",
            height: "3px",
            borderRadius: "0 99px 99px 0",
            backgroundImage: "linear-gradient(90deg, rgba(0,200,255,0.4), var(--cyan-10) 50%, white 100%)",
            top: "calc(50% - 1.5px)",
            left: "50%",
            transformOrigin: "0 50%",
            transform: `rotate(${dialAngle}deg)`,
            transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
            boxShadow: "0 0 8px 2px var(--cyan-8), 0 0 16px 4px rgba(0,200,255,0.25)",
            pointerEvents: "none",
          }} />

          {/* Center hub */}
          <Box style={{
            position: "absolute",
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: "var(--gray-10)",
            border: "2px solid var(--gray-6)",
            top: "calc(50% - 5px)",
            left: "calc(50% - 5px)",
            pointerEvents: "none",
            zIndex: 2,
          }} />

          {/* Current selection shown in dial */}
          {value && (
            <Text style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, 10px)",
              fontSize: "9px",
              fontFamily: "monospace",
              fontWeight: "700",
              color: "var(--cyan-11)",
              textShadow: "0 0 6px var(--cyan-9)",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}>
              {value}
            </Text>
          )}
        </Box>
      </Box>
    </Flex>
  );
}

// C — Physical band-switch buttons (UIverse stupid-vampirebat-53 adapted + neon glow)
function PhysicalButtonsFilter({
  value,
  onChange,
}: {
  value: HourFilter | null;
  onChange: (v: HourFilter | null) => void;
}) {
  return (
    <Flex align="center" gap="3">
      <Text size="2" color="gray" style={{ minWidth: "90px" }}>C · physical</Text>
      <Flex style={{ gap: "2px" }}>
        {HOUR_OPTIONS.map((h, i) => {
          const isActive = value === h;
          const isFirst = i === 0;
          const isLast = i === HOUR_OPTIONS.length - 1;
          return (
            <Box
              key={h}
              onClick={() => onChange(isActive ? null : h)}
              style={{ width: "64px", textAlign: "center", cursor: "pointer", userSelect: "none" }}
            >
              <Box style={{
                width: "100%",
                height: "13px",
                backgroundImage: isActive
                  ? "linear-gradient(#4a4a4a 33%, #2c2e32 58%, #5a5453, #7a7671, #7a6e6b)"
                  : "linear-gradient(#3a3a3a 33%, #1c1e22 58%, #4a4639, #7a7468, #7a6e6b)",
                borderRadius: isFirst ? "0.4em 0 0 0.4em" : isLast ? "0 0.4em 0.4em 0" : "0",
                marginBottom: "7px",
                transition: "box-shadow 0.2s ease",
                boxShadow: isActive
                  ? [
                      "0.1em 0 0 #000000af inset",
                      "-0.1em 0 0 #000000 inset",
                      "0 0.1em 0 #4a4539 inset",
                      "0 -0.1em 0 #ffffff1f",
                      "0 0.1em 0 #ffffff3f",
                      "0 -0.1em 0 #3d1230 inset",
                      "-0.1em -0.2em 0 #ffffff3f inset",
                      "0 0 10px 3px var(--cyan-8)",
                      "0 0 22px 6px rgba(0,200,255,0.18)",
                    ].join(", ")
                  : [
                      "0.1em 0 0 #0000007f inset",
                      "-0.1em 0 0 #00000000 inset",
                      "0 0.1em 0 #5a5448 inset",
                      "0 -0.1em 0 #ffffff1f",
                      "0 0.2em 0.5em #0000007f",
                      "0 -0.1em 0 #4d3347 inset",
                      "-0.1em -0.2em 0 #ffffff3f inset",
                    ].join(", "),
              }} />
              <Text size="1" style={{
                fontFamily: "monospace",
                fontSize: "11px",
                fontWeight: isActive ? "600" : "400",
                color: isActive ? "var(--cyan-11)" : "rgba(200,200,200,0.65)",
                textShadow: isActive ? "0 0 8px var(--cyan-9)" : "none",
                letterSpacing: "0.05em",
                transition: "all 0.2s ease",
              }}>
                {h.toUpperCase()}
              </Text>
            </Box>
          );
        })}
      </Flex>
    </Flex>
  );
}

function HoursFilterGroup({
  value,
  onChange,
}: {
  value: HourFilter | null;
  onChange: (v: HourFilter | null) => void;
}) {
  return (
    <Flex direction="column" gap="5" py="2">
      <NeonCardFilter value={value} onChange={onChange} />
      <DialFilter value={value} onChange={onChange} />
      <PhysicalButtonsFilter value={value} onChange={onChange} />
    </Flex>
  );
}

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
  const [hourFilter, setHourFilter] = useState<HourFilter | null>(null);
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
    hourFilter,
    hasPR,
  });

  const hasActiveFilters = statusFilters.size > 0 || pendingOnly || hourFilter !== null || hasPR;

  const toggleStatus = (status: StatusOption) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const clearFilters = () => {
    setStatusFilters(new Set());
    setPendingOnly(false);
    setHourFilter(null);
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

      {/* Hour filter — own row, larger */}
      <HoursFilterGroup value={hourFilter} onChange={setHourFilter} />

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
