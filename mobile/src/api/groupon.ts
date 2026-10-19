import { apiGet, apiPost } from './client';

/** 团购拼团 C 端（消费者 H5）公开接口封装，对应 server GroupBuyPublicController */
export const listPublicActivities = (tenantId?: number) =>
  apiGet<any>('/group-buy-public/activities', tenantId ? { tenantId } : undefined);

export const getPublicActivity = (id: number) =>
  apiGet<any>(`/group-buy-public/activities/${id}`);

export const listPublicOpenTeams = (id: number, limit?: number) =>
  apiGet<any[]>(`/group-buy-public/activities/${id}/open-teams`, limit ? { limit } : undefined);

export const listPublicTeamMembers = (teamId: number) =>
  apiGet<any[]>(`/group-buy-public/teams/${teamId}/members`);

export const createPublicTeam = (d: any) =>
  apiPost<any>('/group-buy-public/teams', d);

export const joinPublicTeam = (d: any) =>
  apiPost<any>('/group-buy-public/teams/join', d);

export const createPublicShowoff = (d: any) =>
  apiPost<any>('/group-buy-public/showoffs', d);

export const myPublicTeams = (studentId: number) =>
  apiGet<any[]>('/group-buy-public/teams/mine', { studentId });

/** 过程埋点（访问/分享），公开接口 */
export const trackGroupBuy = (d: any) =>
  apiPost<any>('/group-buy/events/track', d).catch(() => null);
