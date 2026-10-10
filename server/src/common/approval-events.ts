import { EventEmitter } from 'events';

/**
 * 审批中心 → 业务模块 的跨模块解耦事件总线。
 * 审批在审批中心终审(通过/驳回)后，由 ApprovalService 在此发射事件，
 * 业务模块(订单/调课转班等)在自己的服务里订阅并回写业务效果，
 * 从而避免在 ApprovalModule 中反向依赖业务模块造成循环依赖。
 */
export const approvalEvents = new EventEmitter();
approvalEvents.setMaxListeners(200);

export interface ApprovalEventPayload {
  tenantId: number;
  bizType: string;
  bizId?: number;
  instanceId: number;
  applicantId: number;
}
