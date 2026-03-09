import type { IssueSchedule } from "@paperclipai/shared";
import { api } from "./client";

export const schedulesApi = {
    list: (companyId: string) =>
        api.get<IssueSchedule[]>(`/companies/${companyId}/issue-schedules`),
    get: (id: string) => api.get<IssueSchedule>(`/issue-schedules/${id}`),
    create: (companyId: string, data: Record<string, unknown>) =>
        api.post<IssueSchedule>(`/companies/${companyId}/issue-schedules`, data),
    update: (id: string, data: Record<string, unknown>) =>
        api.patch<IssueSchedule>(`/issue-schedules/${id}`, data),
    remove: (id: string) => api.delete<IssueSchedule>(`/issue-schedules/${id}`),
    pause: (id: string) =>
        api.post<IssueSchedule>(`/issue-schedules/${id}/pause`, {}),
    resume: (id: string) =>
        api.post<IssueSchedule>(`/issue-schedules/${id}/resume`, {}),
};
