import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Exam } from './entities/exam.entity';
import { Score } from './entities/score.entity';
import { GrowthMetric } from './entities/growth-metric.entity';
import { Contest } from './entities/contest.entity';
import { ContestJoin } from './entities/contest-join.entity';
import { Award } from './entities/award.entity';
import {
  CreateExamDto, CreateScoreDto, CreateGrowthMetricDto, CreateContestDto,
  JoinContestDto, AwardDto, ScorePageQueryDto,
} from './dto/growth.dto';
import { TaskService } from '../task/task.service';

const SCORE_ENTRY_TYPE = 'SCORE_ENTRY';
const SCORE_ENTRY_REF = 'EXAM';

@Injectable()
export class GrowthService {
  constructor(
    @InjectRepository(Exam) private readonly examRepo: Repository<Exam>,
    @InjectRepository(Score) private readonly scoreRepo: Repository<Score>,
    @InjectRepository(GrowthMetric) private readonly metricRepo: Repository<GrowthMetric>,
    @InjectRepository(Contest) private readonly contestRepo: Repository<Contest>,
    @InjectRepository(ContestJoin) private readonly joinRepo: Repository<ContestJoin>,
    @InjectRepository(Award) private readonly awardRepo: Repository<Award>,
    private readonly taskSvc: TaskService,
  ) {}

  // ---------- 测评 / 成绩 ----------
  /** 创建测评（§6.5）。创建即生成 SCORE_ENTRY 待办并通知录入人（§4.26 事件化来源：测评→成绩录入） */
  async createExam(tenantId: number, d: CreateExamDto, operatorId?: number) {
    const exam = this.examRepo.create({
      tenantId,
      name: d.name,
      courseId: d.courseId,
      classGroupId: d.classGroupId,
      type: d.type || 'REGULAR',
      startTime: d.startTime ? new Date(d.startTime) : undefined,
      fullScore: d.fullScore ?? 100,
      knowledgePoints: d.knowledgePoints,
    } as Exam);
    const saved = await this.examRepo.save(exam as any);
    if (operatorId) {
      await this.taskSvc
        .ensurePending(tenantId, {
          type: SCORE_ENTRY_TYPE,
          title: `成绩录入：${saved.name}`,
          assigneeId: operatorId,
          refType: SCORE_ENTRY_REF,
          refId: saved.id,
        })
        .catch(() => undefined);
    }
    return saved;
  }

  listExams(tenantId: number) {
    return this.examRepo.find({ where: { tenantId } as any, order: { id: 'DESC' } as any, take: 100 });
  }

  /** 录入成绩（§6.5），老师端 H5 / PC 共用。若关联测评，则关闭对应 SCORE_ENTRY 待办（事件化来源闭环） */
  async createScore(tenantId: number, d: CreateScoreDto, operatorId?: number) {
    const s = this.scoreRepo.create({
      tenantId,
      studentId: d.studentId,
      courseId: d.courseId,
      lessonId: d.lessonId,
      examId: d.examId,
      type: d.type || 'EXAM',
      score: d.score,
      level: d.level,
      comment: d.comment,
      operatorId,
    } as Score);
    const saved = await this.scoreRepo.save(s as any);
    if (saved.examId) {
      // 录分完成 → 关闭该测评的"成绩录入"待办（§4.26 事件化来源）
      await this.taskSvc
        .closeByRefAll(tenantId, SCORE_ENTRY_REF, Number(saved.examId), SCORE_ENTRY_TYPE)
        .catch(() => undefined);
    }
    return saved;
  }

  listScores(tenantId: number, q: ScorePageQueryDto) {
    const where: any = { tenantId };
    if (q.studentId) where.studentId = q.studentId;
    if (q.courseId) where.courseId = q.courseId;
    if (q.examId) where.examId = q.examId;
    return this.scoreRepo.find({ where, order: { id: 'DESC' } as any, take: 100 });
  }

  /** 成绩趋势（§6.5：GET /students/{id}/scores?course=） */
  scoreTrend(tenantId: number, studentId: number, courseId?: number) {
    const where: any = { tenantId, studentId };
    if (courseId) where.courseId = courseId;
    return this.scoreRepo.find({ where, order: { createdAt: 'ASC' } as any, take: 200 });
  }

  // ---------- 素养评价 ----------
  createMetric(tenantId: number, d: CreateGrowthMetricDto, operatorId?: number) {
    const m = this.metricRepo.create({
      tenantId,
      studentId: d.studentId,
      dimension: d.dimension,
      score: d.score,
      period: d.period,
      operatorId,
    } as GrowthMetric);
    return this.metricRepo.save(m as any);
  }

  listMetrics(tenantId: number, studentId: number, period?: string) {
    const where: any = { tenantId, studentId };
    if (period) where.period = period;
    return this.metricRepo.find({ where, order: { id: 'DESC' } as any, take: 200 });
  }

  // ---------- 赛事 / 获奖 ----------
  createContest(tenantId: number, d: CreateContestDto) {
    const c = this.contestRepo.create({
      tenantId,
      name: d.name,
      level: d.level,
      organizer: d.organizer,
      startDate: d.startDate ? new Date(d.startDate) : undefined,
      endDate: d.endDate ? new Date(d.endDate) : undefined,
      entryFee: d.entryFee ?? 0,
      status: 'OPEN',
    } as Contest);
    return this.contestRepo.save(c as any);
  }

  listContests(tenantId: number) {
    return this.contestRepo.find({ where: { tenantId } as any, order: { id: 'DESC' } as any, take: 100 });
  }

  async joinContest(tenantId: number, contestId: number, d: JoinContestDto) {
    const contest = await this.contestRepo.findOne({ where: { tenantId, id: contestId } as any });
    if (!contest) throw new NotFoundException('赛事不存在');
    const join = this.joinRepo.create({
      tenantId,
      contestId,
      studentId: d.studentId,
      team: d.team,
      coachId: d.coachId,
      status: 'JOINED',
    } as ContestJoin);
    return this.joinRepo.save(join as any);
  }

  async addAward(tenantId: number, joinId: number, d: AwardDto) {
    const join = await this.joinRepo.findOne({ where: { tenantId, id: joinId } as any });
    if (!join) throw new NotFoundException('参赛记录不存在');
    join.status = 'DONE';
    join.result = d.grade;
    await this.joinRepo.save(join as any);
    const award = this.awardRepo.create({
      tenantId,
      contestJoinId: joinId,
      studentId: join.studentId,
      grade: d.grade,
      certificate: d.certificate,
      photo: d.photo,
    } as Award);
    return this.awardRepo.save(award as any);
  }

  /**
   * 成长档案时间轴（§6.5：GET /students/{id}/growth）
   * 聚合成绩 + 素养 + 参赛获奖，家长端可查阅。
   */
  async growthTimeline(tenantId: number, studentId: number) {
    const [scores, metrics, joins, awards] = await Promise.all([
      this.scoreRepo.find({ where: { tenantId, studentId } as any, order: { id: 'DESC' } as any, take: 50 }),
      this.metricRepo.find({ where: { tenantId, studentId } as any, order: { id: 'DESC' } as any, take: 50 }),
      this.joinRepo.find({ where: { tenantId, studentId } as any, order: { id: 'DESC' } as any, take: 50 }),
      this.awardRepo.find({ where: { tenantId, studentId } as any, order: { id: 'DESC' } as any, take: 50 }),
    ]);
    const contestIds = [...new Set(joins.map((j) => Number(j.contestId)))];
    const contests = contestIds.length
      ? await this.contestRepo.find({ where: { tenantId, id: In(contestIds) } as any })
      : [];
    const contestMap = new Map(contests.map((c) => [Number(c.id), c]));

    const timeline: any[] = [
      ...scores.map((s) => ({
        type: 'SCORE', at: s.createdAt, title: `成绩 ${s.score}${s.level ? `（${s.level}）` : ''}`,
        detail: s.comment, refId: s.id,
      })),
      ...metrics.map((m) => ({
        type: 'METRIC', at: m.createdAt, title: `${m.dimension} ${m.score}`,
        detail: m.period, refId: m.id,
      })),
      ...joins.map((j) => ({
        type: 'CONTEST', at: j.createdAt,
        title: `参赛：${contestMap.get(Number(j.contestId))?.name || '赛事'}`,
        detail: j.result, refId: j.id,
      })),
      ...awards.map((a) => ({
        type: 'AWARD', at: a.createdAt, title: `获奖：${a.grade}`, detail: a.certificate, refId: a.id,
      })),
    ];
    return timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }
}
