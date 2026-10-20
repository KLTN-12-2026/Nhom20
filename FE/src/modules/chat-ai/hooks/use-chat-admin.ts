import { useCallback, useState } from 'react';

import { getChatAdminOverview, getChatAdminSessionDetail, getChatAdminSessions } from '../api/chat-admin.api';
import type { ChatAdminFilters, ChatAdminOverview, ChatAdminSession, ChatAdminSessionDetail } from '../types/chat-admin.types';

export function useChatAdmin() {
  const [overview, setOverview] = useState<ChatAdminOverview | null>(null);
  const [sessions, setSessions] = useState<ChatAdminSession[]>([]);
  const [detail, setDetail] = useState<ChatAdminSessionDetail | null>(null);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const loadDashboard = useCallback(async (filters: ChatAdminFilters) => {
    setIsLoading(true);
    try {
      const [overviewResponse, sessionsResponse] = await Promise.all([
        getChatAdminOverview(), getChatAdminSessions(filters),
      ]);
      setOverview(overviewResponse.data);
      setSessions(sessionsResponse.data);
      setMeta({
        total: sessionsResponse.meta?.total ?? 0,
        page: sessionsResponse.meta?.page ?? filters.page,
        limit: sessionsResponse.meta?.limit ?? filters.limit,
        totalPages: sessionsResponse.meta?.totalPages ?? 1,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    setIsLoadingDetail(true);
    try {
      const response = await getChatAdminSessionDetail(id);
      setDetail(response.data);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  return { overview, sessions, detail, meta, isLoading, isLoadingDetail, setDetail, loadDashboard, loadDetail };
}
