import { useState } from "react";
import { Box, Flex, Heading, Text, Separator } from "@radix-ui/themes";
import { KanbanColumn } from "./KanbanColumn";
import type { Session, SessionStatus } from "../data/schema";

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour - match daemon setting

/**
 * Get effective status based on elapsed time since last activity.
 * Sessions inactive for 1 hour are considered idle regardless of stored status.
 */
function getEffectiveStatus(session: Session): SessionStatus {
  const elapsed = Date.now() - new Date(session.lastActivityAt).getTime();
  if (elapsed > IDLE_TIMEOUT_MS) {
    return "idle";
  }
  return session.status;
}

interface PathSectionProps {
  path: string;
  displayPath: string;
  repoUrl: string | null;
  sessions: Session[];
  activityScore: number;
}

export function RepoSection({ path, displayPath, repoUrl, sessions, activityScore }: PathSectionProps) {
  const [collapsed, setCollapsed] = useState(true);

  const working = sessions.filter((s) => getEffectiveStatus(s) === "working");
  const needsApproval = sessions.filter(
    (s) => getEffectiveStatus(s) === "waiting" && s.hasPendingToolUse
  );
  const waiting = sessions.filter(
    (s) => getEffectiveStatus(s) === "waiting" && !s.hasPendingToolUse
  );
  const idle = sessions.filter((s) => getEffectiveStatus(s) === "idle");

  const isHot = activityScore > 50;

  return (
    <Box mb="5">
      <Flex
        align="center"
        gap="3"
        mb={collapsed ? "0" : "4"}
        onClick={() => setCollapsed(!collapsed)}
        style={{ cursor: "pointer", userSelect: "none" }}
      >
        <Text size="2" color="gray" style={{ width: 12, flexShrink: 0 }}>
          {collapsed ? "▶" : "▼"}
        </Text>

        <Heading size="5" weight="bold">
          <a
            href={`file://${path}`}
            onClick={(e) => e.stopPropagation()}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            📁 {displayPath}
          </a>
        </Heading>

        {repoUrl && (
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Open repository"
            style={{ lineHeight: 1, textDecoration: "none" }}
          >
            <Text size="2">🔗</Text>
          </a>
        )}

        {isHot && (
          <Text size="2" color="orange">
            🔥
          </Text>
        )}

        <Text size="2" color="gray">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""}
        </Text>
      </Flex>

      {!collapsed && (
        <Flex gap="3" style={{ minHeight: 240 }}>
          <KanbanColumn
            title="Working"
            status="working"
            sessions={working}
            color="green"
          />
          <KanbanColumn
            title="Needs Approval"
            status="needs-approval"
            sessions={needsApproval}
            color="orange"
          />
          <KanbanColumn
            title="Waiting"
            status="waiting"
            sessions={waiting}
            color="yellow"
          />
          <KanbanColumn
            title="Idle"
            status="idle"
            sessions={idle}
            color="gray"
          />
        </Flex>
      )}

      <Separator size="4" mt={collapsed ? "3" : "6"} />
    </Box>
  );
}
