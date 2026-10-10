import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherClock } from './entities/teacher-clock.entity';
import { ClockDto } from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(TeacherClock)
    private readonly repo: Repository<TeacherClock>,
  ) {}

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
