import { apiPost, apiGet, apiPut, apiDelete } from './client';
import type {
  Channel,
  Campaign,
  Lead,
  LeadFollow,
  TrialLesson,
  Funnel,
  PageResult,
} from './types';

// ---------- 鉴权 ----------
export const login = (username: string, password: string) =>
  apiPost<{ accessToken: string; username?: string }>('/auth/login', { username, password });

// ---------- 渠道 ----------
export const listChannels = () => apiGet<Channel[]>('/channels');
export const createChannel = (d: any) => apiPost<Channel>('/channels', d);
export const updateChannel = (id: number, d: any) => apiPut<Channel>(`/channels/${id}`, d);
export const deleteChannel = (id: number) => apiDelete(`/channels/${id}`);

// ---------- 活动 ----------
export const listCampaigns = () => apiGet<Campaign[]>('/campaigns');
export const createCampaign = (d: any) => apiPost<Campaign>('/campaigns', d);
export const updateCampaign = (id: number, d: any) => apiPut<Campaign>(`/campaigns/${id}`, d);
export const deleteCampaign = (id: number) => apiDelete(`/campaigns/${id}`);

// ---------- 线索 ----------
export const listLeads = (params: any) => apiGet<PageResult<Lead>>('/leads', params);
export const getLead = (id: number) => apiGet<Lead>(`/leads/${id}`);
export const createLead = (d: any) => apiPost<Lead>('/leads', d);
export const updateLead = (id: number, d: any) => apiPut<Lead>(`/leads/${id}`, d);
export const deleteLead = (id: number) => apiDelete(`/leads/${id}`);
export const assignLead = (id: number, ownerId: number) =>
  apiPost<Lead>(`/leads/${id}/assign`, { ownerId });
export const followLead = (id: number, d: any) => apiPost<LeadFollow>(`/leads/${id}/follow`, d);
export const convertLead = (id: number, d: any) =>
  apiPost<{ leadId: number; studentId: number; already: boolean }>(`/leads/${id}/convert`, d);
export const createTrial = (id: number, d: any) => apiPost<TrialLesson>(`/leads/${id}/trials`, d);
export const listTrials = (id: number) => apiGet<TrialLesson[]>(`/leads/${id}/trials`);
export const listFollows = (id: number) => apiGet<LeadFollow[]>(`/leads/${id}/follows`);
export const getFunnel = (params: any) => apiGet<Funnel>('/leads/funnel', params);
