import { In } from 'typeorm';

/**
 * 人群判定（文档 §2.4 #17 老生续费专享包）。
 *
 * 规则：学员存在**有效订单**即为老生。有效订单 = 已支付(PAID) / 已完成(COMPLETED)，
 * 即排除待支付(PENDING)、已取消(CANCELLED)、退款中(REFUNDING)、已退费(REFUNDED)。
 * 简言之：有订单且不是退掉/作废的，就是老生。
 */
export const EFFECTIVE_ORDER_STATUSES = ['PAID', 'COMPLETED'];

export async function isReturningStudent(
  orderRepo: { count: (options?: any) => Promise<number> },
  tenantId: number,
  studentId: number,
): Promise<boolean> {
  const n = await orderRepo.count({
    where: { tenantId, studentId, status: In(EFFECTIVE_ORDER_STATUSES) } as any,
  });
  return Number(n) > 0;
}
