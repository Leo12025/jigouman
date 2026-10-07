export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export type LeadStage = 'NEW' | 'FOLLOWING' | 'TRIALED' | 'SIGNED' | 'INVALID';

export const LEAD_STAGES: LeadStage[] = ['NEW', 'FOLLOWING', 'TRIALED', 'SIGNED', 'INVALID'];
export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  NEW: '新线索',
  FOLLOWING: '跟进中',
  TRIALED: '已试听',
  SIGNED: '已报名',
  INVALID: '无效',
};

export interface Channel {
  id: number;
  name: string;
  type: string;
  cost?: number;
  source?: string;
  status: number;
}

export interface Campaign {
  id: number;
  name: string;
  type: string;
  startTime?: string;
  endTime?: string;
  budget?: number;
  status: number;
}

export interface Lead {
  id: number;
  name: string;
  phone: string;
  channelId?: number;
  campaignId?: number;
  stage: LeadStage;
  ownerId?: number;
  lastFollowAt?: string;
  gender?: number;
  age?: number;
  intentionCourse?: string;
  budget?: number;
  source?: string;
  remark?: string;
  convertedStudentId?: number;
  createdAt?: string;
}

export interface LeadFollow {
  id: number;
  leadId: number;
  type: string;
  content?: string;
  nextFollowAt?: string;
  operatorId?: number;
  createdAt?: string;
}

export interface TrialLesson {
  id: number;
  leadId: number;
  lessonId?: number;
  trialAt?: string;
  attended: number;
  feedback?: string;
}

export interface Funnel {
  total: number;
  byStage: Record<string, number>;
  trialed: number;
  signed: number;
  conversionRate: number;
}
