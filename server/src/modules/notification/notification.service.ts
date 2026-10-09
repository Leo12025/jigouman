import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Notification, NotifyChannel } from './entities/notification.entity';
import { NotifyPageQueryDto } from './dto/notification.dto';

export interface CreateNotificationDto {
  userId: number;
  channel?: NotifyChannel;
  type: string;
  title: string;
  content?: string;
  refType?: string;
  refId?: number;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  /** 创建通知（系统事件调用；本人可见，外部不暴露创建接口） */
  async create(tenantId: number, d: CreateNotificationDto) {
    const n = this.repo.create({
      tenantId,
      userId: d.userId,
      channel: d.channel || NotifyChannel.IN_APP,
      type: d.type,
      title: d.title,
      content: d.content,
      refType: d.refType,
      refId: d.refId,
    } as Notification);
    return this.repo.save(n as any);
  }

  async list(tenantId: number, userId: number, q: NotifyPageQueryDto) {
    const where: any = { tenantId, userId };
    if (q.unreadOnly === 1) where.readAt = IsNull();
    const [list, total] = await this.repo.findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (q.page - 1) * q.size,
      take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }

  async unreadCount(tenantId: number, userId: number) {
    return this.repo.count({ where: { tenantId, userId, readAt: IsNull() } as any });
  }

  async markRead(tenantId: number, userId: number, id: number) {
    const n = await this.repo.findOne({ where: { tenantId, userId, id } as any });
    if (!n) throw new NotFoundException('通知不存在');
    n.readAt = new Date();
    return this.repo.save(n as any);
  }

  async markAllRead(tenantId: number, userId: number) {
    await this.repo
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('tenant_id = :t AND user_id = :u AND read_at IS NULL', { t: tenantId, u: userId })
      .execute();
    return { ok: true };
  }
}
