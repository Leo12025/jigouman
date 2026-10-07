import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { BaseService } from '../../common/crud/base.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { Student } from './entities/student.entity';
import { StudentParent } from './entities/student-parent.entity';
import { StudentCourse, StudentCourseStatus } from './entities/student-course.entity';
import {
  CreateStudentDto,
  UpdateStudentDto,
  BindParentDto,
  UnbindParentDto,
  EnrollCourseDto,
  StudentPageQueryDto,
} from './dto/student.dto';

@Injectable()
export class StudentService {
  private readonly student = new BaseService<Student>(null as any);
  private readonly parent = new BaseService<StudentParent>(null as any);
  private readonly enroll = new BaseService<StudentCourse>(null as any);

  constructor(
    @InjectRepository(Student) studentRepo: Repository<Student>,
    @InjectRepository(StudentParent) parentRepo: Repository<StudentParent>,
    @InjectRepository(StudentCourse) enrollRepo: Repository<StudentCourse>,
  ) {
    this.student = new BaseService(studentRepo);
    this.parent = new BaseService(parentRepo);
    this.enroll = new BaseService(enrollRepo);
  }

  // 学员
  createStudent(t: number, d: CreateStudentDto) {
    return this.student.create(t, { ...d, tags: d.tags ? JSON.stringify(d.tags) : undefined });
  }
  async listStudent(t: number, q: StudentPageQueryDto) {
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.keyword) where.name = Like(`%${q.keyword}%`);
    return this.student.paginate(t, q, where);
  }
  async getStudent(t: number, id: number) {
    const student = await this.student.findOne(t, id);
    // 实体采用普通外键列（无 ORM 关联），子表数据单独查询后装配
    (student as any).parents = await this.listParents(t, student.id);
    (student as any).studentCourses = await this.listEnroll(t, student.id);
    return student;
  }
  updateStudent(t: number, id: number, d: UpdateStudentDto) {
    const patch: any = { ...d };
    if (d.tags) patch.tags = JSON.stringify(d.tags);
    return this.student.update(t, id, patch);
  }
  removeStudent(t: number, id: number) {
    return this.student.remove(t, id);
  }

  // 家长绑定（多对多，OTP 验证见 §4.4 / §8.14，此处为业务落库）
  async bindParent(t: number, d: BindParentDto) {
    // 校验学员存在
    await this.student.findOne(t, d.studentId);
    const existed = await this.parent.repo.findOne({
      where: { tenantId: t, studentId: d.studentId, phone: d.phone, unboundAt: null as any },
    });
    if (existed) throw new BusinessException(ResCode.CONFLICT, '该家长已绑定此学员');
    if (d.isMain) {
      // 设置新主联系人前，清除其他主联系人
      await this.parent.repo.update({ tenantId: t, studentId: d.studentId, isMain: 1 }, { isMain: 0 });
    }
    return this.parent.create(t, {
      studentId: d.studentId,
      parentName: d.parentName,
      phone: d.phone,
      relation: d.relation,
      isMain: d.isMain ? 1 : 0,
      bindSource: d.bindSource ?? 'otp',
      verified: 1,
      boundAt: new Date(),
    });
  }
  async unbindParent(t: number, d: UnbindParentDto) {
    const rel = await this.parent.findOne(t, d.parentId);
    if (rel.studentId !== d.studentId) {
      throw new BusinessException(ResCode.FORBIDDEN, '绑定关系不匹配');
    }
    rel.unboundAt = new Date();
    return this.parent.repo.save(rel);
  }
  listParents(t: number, studentId: number) {
    return this.parent.repo.find({
      where: { tenantId: t, studentId, unboundAt: null as any },
      order: { isMain: 'DESC', id: 'DESC' },
    });
  }

  // 报名课程
  async enrollCourse(t: number, d: EnrollCourseDto) {
    await this.student.findOne(t, d.studentId);
    const existed = await this.enroll.repo.findOne({
      where: { tenantId: t, studentId: d.studentId, courseId: d.courseId, status: StudentCourseStatus.ACTIVE },
    });
    if (existed) throw new BusinessException(ResCode.CONFLICT, '该学员已报名此课程');
    return this.enroll.create(t, {
      studentId: d.studentId,
      courseId: d.courseId,
      classGroupId: d.classGroupId,
      status: StudentCourseStatus.ACTIVE,
    });
  }
  listEnroll(t: number, studentId: number) {
    return this.enroll.repo.find({ where: { tenantId: t, studentId } });
  }
}
