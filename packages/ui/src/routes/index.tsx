import { createFileRoute } from "@tanstack/react-router";
import { Box, Flex, Text, TextField, IconButton } from "@radix-ui/themes";
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

      {/* Repo sections (empty ones hidden) */}
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
