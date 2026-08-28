export type ChatConfig = "public" | "agent" | "dashboard";

export interface ConversationAccessRecord {
  config: string;
  sessionId: string;
  userId: string | null;
  agentId: string | null;
}

export interface ConversationAccessScope {
  config: ChatConfig;
  sessionId: string;
  userId?: string;
  agentId?: string;
}

export function canAccessConversation(
  conversation: ConversationAccessRecord,
  scope: ConversationAccessScope,
): boolean {
  if (conversation.config !== scope.config) return false;

  if (scope.config === "public") {
    return conversation.sessionId === scope.sessionId;
  }

  return (
    conversation.userId === (scope.userId ?? null) &&
    conversation.agentId === (scope.agentId ?? null)
  );
}
