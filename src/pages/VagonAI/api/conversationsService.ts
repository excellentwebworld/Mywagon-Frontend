/**
 * REST client for the Vagon AI chat gateway's conversation-history endpoints
 * (list/resume/delete past chats). Same gateway as `useChat.ts` and the same
 * bearer-token auth, but plain request/response JSON rather than an SSE stream.
 *
 * The shipper's identity comes from the token alone — the gateway resolves it
 * server-side, so these calls take no user id.
 */
import { getStoredToken } from '../../../api/client';
import { gatewayFetch } from '../../../api/chatGatewayUrl';

export interface ConversationSummary {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  seq: number;
  createdAt: string;
}

async function gatewayRequest<T>(
  path: string,
  method: 'GET' | 'DELETE',
  locale?: string,
): Promise<T> {
  const response = await gatewayFetch(path, { method, token: getStoredToken(), locale });
  return response.json() as Promise<T>;
}

export function listConversations(locale?: string): Promise<ConversationSummary[]> {
  return gatewayRequest<ConversationSummary[]>('/conversations', 'GET', locale);
}

export function getConversationMessages(id: string, locale?: string): Promise<ConversationMessage[]> {
  return gatewayRequest<ConversationMessage[]>(`/conversations/${encodeURIComponent(id)}/messages`, 'GET', locale);
}

export function deleteConversation(id: string, locale?: string): Promise<{ deleted: true }> {
  return gatewayRequest<{ deleted: true }>(`/conversations/${encodeURIComponent(id)}`, 'DELETE', locale);
}

export function clearHistory(locale?: string): Promise<{ deleted: number }> {
  return gatewayRequest<{ deleted: number }>('/conversations', 'DELETE', locale);
}
