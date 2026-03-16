import { createFileRoute } from "@tanstack/react-router";
import { Flex, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { KanbanColumn } from "../components/KanbanColumn";
import { useSessions } from "../hooks/useSessions";

export const Route = createFileRoute("/board")({
  component: BoardPage,
});

function BoardPage() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const { sessions } = useSessions();

  const working = sessions.filter((s) => s.status === "working");
  const needsApproval = sessions.filter((s) => s.hasPendingToolUse);
  const waiting = sessions.filter((s) => s.status === "waiting" && !s.hasPendingToolUse);
  const idle = sessions.filter((s) => s.status === "idle");

  if (sessions.length === 0) {
    return (
      <Flex direction="column" align="center" gap="3" py="9">
        <Text color="gray" size="3">No sessions found</Text>
        <Text color="gray" size="2">Start a Claude Code session to see it here</Text>
      </Flex>
    );
  }

  return (
    <Flex gap="4" style={{ overflowX: "auto", paddingBottom: "8px" }}>
      <KanbanColumn
        title="⚡ Working"
        status="working"
        sessions={working}
        color="green"
        scrollHeight="calc(100vh - 200px)"
      />
      <KanbanColumn
        title="🔔 Needs Approval"
        status="needs-approval"
        sessions={needsApproval}
        color="orange"
        scrollHeight="calc(100vh - 200px)"
      />
      <KanbanColumn
        title="⏳ Waiting"
        status="waiting"
        sessions={waiting}
        color="yellow"
        scrollHeight="calc(100vh - 200px)"
      />
      <KanbanColumn
        title="💤 Idle"
        status="idle"
        sessions={idle}
        color="gray"
        scrollHeight="calc(100vh - 200px)"
      />
    </Flex>
  );
}
