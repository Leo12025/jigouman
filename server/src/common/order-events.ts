import { EventEmitter } from 'events';

export interface OrderPaidPayload {
  tenantId: number;
  orderId: number;
  orderType?: string;
}

/**
 * 订单域事件（进程内）。
 * 用于解耦"支付成功"与下游业务动作（如套餐升级补差价付清后自动执行升级），
 * 避免 OrderModule 反向依赖业务模块造成循环引用。
 */
export const orderEvents = new EventEmitter();
orderEvents.setMaxListeners(50);
