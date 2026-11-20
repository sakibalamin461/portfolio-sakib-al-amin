import { ArchiveIcon } from "@sanity/icons/Archive";
import { EnvelopeIcon } from "@sanity/icons/Envelope";
import { InboxIcon } from "@sanity/icons/Inbox";
import { TrashIcon } from "@sanity/icons/Trash";
import { UndoIcon } from "@sanity/icons/Undo";
import { Badge, Box, Button, Card, Flex, Spinner, Stack, Tab, TabList, Text } from "@sanity/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useClient } from "sanity";
import { apiVersion } from "../env";

type Status = "new" | "read" | "archived";

type Message = {
  _id: string;
  name?: string;
  email?: string;
  company?: string;
  discipline?: string;
  budget?: string;
  message?: string;
  receivedAt: string;
  status: Status;
};

const QUERY = `*[_type == "enquiry" && !(_id in path("drafts.**"))] | order(coalesce(receivedAt, _createdAt) desc) {
  _id, name, email, company, discipline, budget, message,
  "receivedAt": coalesce(receivedAt, _createdAt),
  "status": coalesce(status, "new")
}`;

function shortDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

function longDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Enquiries from the website, shown as a mailbox instead of a list of form documents. */
export function Inbox() {
  const client = useClient({ apiVersion });
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [folder, setFolder] = useState<"inbox" | "archived">("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(() => client.fetch<Message[]>(QUERY).then(setMessages), [client]);

  // Live: a new enquiry (or a change made elsewhere) refreshes the list.
  useEffect(() => {
    load();
    const subscription = client
      .listen(`*[_type == "enquiry"]`, {}, { includeResult: false, visibility: "query" })
      .subscribe(() => load());
    return () => subscription.unsubscribe();
  }, [client, load]);

  const setStatus = useCallback(
    async (id: string, status: Status) => {
      setMessages((list) => list?.map((m) => (m._id === id ? { ...m, status } : m)) ?? null);
      await client.patch(id).set({ status }).commit();
    },
    [client],
  );

  const shown = useMemo(
    () => (messages ?? []).filter((m) => (folder === "archived" ? m.status === "archived" : m.status !== "archived")),
    [messages, folder],
  );
  const unread = (messages ?? []).filter((m) => m.status === "new").length;
  const archivedCount = (messages ?? []).filter((m) => m.status === "archived").length;
  const selected = shown.find((m) => m._id === selectedId) ?? null;

  const open = (m: Message) => {
    setSelectedId(m._id);
    if (m.status === "new") setStatus(m._id, "read");
  };

  const remove = async (m: Message) => {
    if (!window.confirm(`Delete the message from ${m.name || "this sender"} permanently? This can't be undone.`)) return;
    await client.delete(m._id);
    setSelectedId(null);
    load();
  };

  return (
    <Flex height="fill" style={{ minHeight: 0 }}>
      {/* Message list */}
      <Card borderRight style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <Box padding={3} paddingBottom={2}>
          <TabList gap={1}>
            <Tab
              id="inbox-tab"
              aria-controls="inbox-list"
              icon={InboxIcon}
              label={unread ? `Inbox (${unread} new)` : "Inbox"}
              selected={folder === "inbox"}
              onClick={() => setFolder("inbox")}
            />
            <Tab
              id="archived-tab"
              aria-controls="inbox-list"
              icon={ArchiveIcon}
              label={archivedCount ? `Archived (${archivedCount})` : "Archived"}
              selected={folder === "archived"}
              onClick={() => setFolder("archived")}
            />
          </TabList>
        </Box>

        <Box id="inbox-list" flex={1} overflow="auto" padding={2} paddingTop={0}>
          {messages === null ? (
            <Flex justify="center" padding={5}>
              <Spinner muted />
            </Flex>
          ) : shown.length === 0 ? (
            <Box padding={4}>
              <Text muted size={1}>
                {folder === "inbox" ? "No messages yet. Enquiries from the website's contact form land here." : "Nothing archived."}
              </Text>
            </Box>
          ) : (
            <Stack gap={1}>
              {shown.map((m) => {
                const isNew = m.status === "new";
                return (
                  <Card
                    key={m._id}
                    as="button"
                    padding={3}
                    radius={2}
                    tone={m._id === selectedId ? "primary" : "default"}
                    pressed={m._id === selectedId}
                    onClick={() => open(m)}
                    style={{ textAlign: "left", width: "100%" }}
                  >
                    <Stack gap={2}>
                      <Flex align="center" gap={2}>
                        <Box
                          style={{ width: 8, height: 8, borderRadius: 4, flexShrink: 0, background: isNew ? "var(--card-focus-ring-color)" : "transparent" }}
                          aria-hidden
                        />
                        <Box flex={1} style={{ minWidth: 0 }}>
                          <Text size={1} weight={isNew ? "bold" : "regular"} textOverflow="ellipsis">
                            {m.name || "Unknown sender"}
                            {m.company ? ` · ${m.company}` : ""}
                          </Text>
                        </Box>
                        <Text size={0} muted>
                          {shortDate(m.receivedAt)}
                        </Text>
                      </Flex>
                      <Box paddingLeft={4}>
                        <Stack gap={2}>
                          {(m.discipline || m.budget) && (
                            <Text size={1} weight={isNew ? "semibold" : "regular"} textOverflow="ellipsis">
                              {[m.discipline, m.budget].filter(Boolean).join(" · ")}
                            </Text>
                          )}
                          <Text size={1} muted textOverflow="ellipsis">
                            {m.message}
                          </Text>
                        </Stack>
                      </Box>
                    </Stack>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Box>
      </Card>

      {/* Reading pane */}
      <Box flex={1} overflow="auto" style={{ minWidth: 0 }}>
        {!selected ? (
          <Flex align="center" justify="center" height="fill" padding={5}>
            <Stack gap={3} style={{ textAlign: "center" }}>
              <Text size={4} muted>
                <EnvelopeIcon />
              </Text>
              <Text muted size={1}>
                Select a message to read it.
              </Text>
            </Stack>
          </Flex>
        ) : (
          <Box padding={5} style={{ maxWidth: 760 }}>
            <Stack gap={5}>
              <Flex gap={2} wrap="wrap">
                {selected.email && (
                  <Button
                    as="a"
                    href={`mailto:${selected.email}?subject=${encodeURIComponent("Re: your project enquiry")}`}
                    icon={EnvelopeIcon}
                    text="Reply"
                    tone="primary"
                  />
                )}
                {selected.status === "archived" ? (
                  <Button icon={InboxIcon} text="Move to inbox" mode="ghost" onClick={() => setStatus(selected._id, "read")} />
                ) : (
                  <Button icon={ArchiveIcon} text="Archive" mode="ghost" onClick={() => setStatus(selected._id, "archived")} />
                )}
                {selected.status !== "new" && (
                  <Button icon={UndoIcon} text="Mark unread" mode="ghost" onClick={() => setStatus(selected._id, "new")} />
                )}
                <Button icon={TrashIcon} text="Delete" mode="ghost" tone="critical" onClick={() => remove(selected)} />
              </Flex>

              <Stack gap={3}>
                <Text size={4} weight="bold">
                  {selected.name || "Unknown sender"}
                </Text>
                <Text size={1} muted>
                  {selected.email ? (
                    <a href={`mailto:${selected.email}`} style={{ color: "inherit" }}>
                      {selected.email}
                    </a>
                  ) : (
                    "No email given"
                  )}
                  {selected.company ? ` · ${selected.company}` : ""}
                </Text>
                <Text size={1} muted>
                  {longDate(selected.receivedAt)}
                </Text>
              </Stack>

              {(selected.discipline || selected.budget) && (
                <Flex gap={2} wrap="wrap">
                  {selected.discipline && <Badge tone="primary" padding={2}>{selected.discipline}</Badge>}
                  {selected.budget && <Badge tone="positive" padding={2}>Budget: {selected.budget}</Badge>}
                </Flex>
              )}

              <Card borderTop paddingTop={5}>
                <Text size={2} style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {selected.message || "(No message)"}
                </Text>
              </Card>
            </Stack>
          </Box>
        )}
      </Box>
    </Flex>
  );
}
