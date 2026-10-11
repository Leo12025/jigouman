import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherClock } from './entities/teacher-clock.entity';
import { ClockDto } from './dto/attendance.dto';
import { orgRepo } from '../../common/org-scope';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(TeacherClock)
    repo: Repository<TeacherClock>,
  ) {
    // 套用校区隔离：读自动过滤 org_id、写自动落 org_id 章
    this.repo = orgRepo(repo);
  }
  private readonly repo: Repository<TeacherClock>;

  async clock(t: number, d: ClockDto) {
    const date = new Date().toISOString().slice(0, 10);
    const rec = this.repo.create({
      tenantId: t,
      teacherId: d.teacherId,
      type: d.type,
      lessonId: d.lessonId,
      date,
      remark: d.remark,
    } as TeacherClock);
    return this.repo.save(rec as any);
  }

  async list(t: number, teacherId: number, date?: string) {
    const where: any = { tenantId: t, teacherId };
    if (date) where.date = date;
    const list = await this.repo.find({ where, order: { id: 'DESC' } as any });
    return { list, todayCount: list.filter((x) => x.date === new Date().toISOString().slice(0, 10)).length };
  }
}
