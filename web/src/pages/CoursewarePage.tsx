import { useEffect, useState } from 'react';
import {
  Select, Button, Modal, Form, Input, InputNumber, Space, Card, Table, Tag, message, Empty, Popconfirm,
  Typography,
} from 'antd';
import {
  listCourses, listStages, createStage, updateStage, deleteStage,
  listStageCoursewares, createCourseware, deleteCourseware,
} from '../api/crm';
import ResourceUpload, { ResourceItem } from '../components/ResourceUpload';

const TYPE_LABEL: Record<string, string> = {
  PPT: 'PPT', VIDEO: '视频', DOC: '文档', AUDIO: '音频',
};

export default function CoursewarePage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState<number | undefined>();
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [stageOpen, setStageOpen] = useState(false);
  const [stageForm] = Form.useForm();
  const [stageFiles, setStageFiles] = useState<ResourceItem[]>([]);

  const [cwOpen, setCwOpen] = useState(false);
  const [cwForm] = Form.useForm();
  const [curStage, setCurStage] = useState<any>(null);
  const [cwFiles, setCwFiles] = useState<ResourceItem[]>([]);

  useEffect(() => {
    listCourses({ size: 200 })
      .then((r: any) => {
        const list = r.list || [];
        setCourses(list);
        if (list.length) setCourseId(list[0].id);
      })
      .catch(() => undefined);
  }, []);

  const loadStages = async () => {
    if (!courseId) { setStages([]); return; }
    setLoading(true);
    try {
      const list = await listStages(courseId);
      setStages(list || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { loadStages(); }, [courseId]);

  const onCreateStage = async () => {
    const v = await stageForm.validateFields();
    await createStage(courseId as number, {
      name: v.name,
      sortOrder: v.sortOrder ?? 0,
      outlineResourceId: stageFiles[0]?.id,
      outlineUrl: stageFiles[0]?.url,
      remark: v.remark,
    });
    message.success('已创建阶段');
    setStageOpen(false);
    stageForm.resetFields();
    setStageFiles([]);
    loadStages();
  };

  const openCourseware = (s: any) => {
    setCurStage(s);
    cwForm.resetFields();
    cwForm.setFieldsValue({ type: 'PPT', sortOrder: 0 });
    setCwFiles([]);
    setCwOpen(true);
  };

  const onCreateCourseware = async () => {
    const v = await cwForm.validateFields();
    await createCourseware(curStage.id, {
      title: v.title,
      type: v.type || 'PPT',
      sortOrder: v.sortOrder ?? 0,
      durationMinutes: v.durationMinutes,
      resourceId: cwFiles[0]?.id,
      url: cwFiles[0]?.url,
      resources: cwFiles.map((f) => ({ resourceId: f.id, name: f.originalName, url: f.url })),
      remark: v.remark,
    });
    message.success('已创建课件');
    setCwOpen(false);
    loadStages();
  };

  const onRemoveStage = async (id: number) => {
    await deleteStage(id);
    message.success('已删除阶段(含课件)');
    loadStages();
  };
  const onRemoveCourseware = async (id: number) => {
    await deleteCourseware(id);
    message.success('已删除课件');
    loadStages();
  };

  const coursewareColumns = [
    { title: '标题', dataIndex: 'title' },
    { title: '类型', dataIndex: 'type', width: 90, render: (t: string) => <Tag>{TYPE_LABEL[t] || t}</Tag> },
    { title: '时长(分)', dataIndex: 'durationMinutes', width: 90, render: (v: number) => v ?? '-' },
    {
      title: '资源', dataIndex: 'url',
      render: (u: string, r: any) => (
        u ? <Typography.Link href={u} target="_blank" rel="noreferrer">打开</Typography.Link>
          : (r.resources ? '资源包' : '-')
      ),
    },
    {
      title: '操作',
      width: 90,
      render: (_: any, r: any) => (
        <Popconfirm title="确认删除该课件？" onConfirm={() => onRemoveCourseware(r.id)}>
          <Button size="small" danger>删除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12, justifyContent: 'space-between', width: '100%' }}>
        <Space>
          <span>课程：</span>
          <Select
            style={{ width: 260 }} value={courseId} onChange={setCourseId}
            placeholder="选择课程" showSearch optionFilterProp="label"
            options={courses.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Space>
        <Button
          type="primary" disabled={!courseId}
          onClick={() => { stageForm.resetFields(); setStageFiles([]); setStageOpen(true); }}
        >
          新建阶段
        </Button>
      </Space>

      {loading && <div style={{ color: 'rgba(0,0,0,.45)' }}>加载中…</div>}
      {!loading && stages.length === 0 && <Empty description="该课程暂无阶段" />}

      {stages.map((s: any) => (
        <Card
          key={s.id}
          size="small"
          style={{ marginBottom: 12 }}
          title={`${s.name}（排序 ${s.sortOrder ?? 0}）`}
          extra={(
            <Space>
              <Button size="small" onClick={() => openCourseware(s)}>添加课件</Button>
              <Popconfirm title="确认删除该阶段及其课件？" onConfirm={() => onRemoveStage(s.id)}>
                <Button size="small" danger>删除阶段</Button>
              </Popconfirm>
            </Space>
          )}
        >
          <div style={{ marginBottom: 8, color: 'rgba(0,0,0,.55)' }}>
            阶段大纲：{s.outlineUrl
              ? <Typography.Link href={s.outlineUrl} target="_blank" rel="noreferrer">查看文件</Typography.Link>
              : '未上传'}
          </div>
          <Table
            rowKey="id" size="small" pagination={false}
            dataSource={(s.coursewares || []) as any[]}
            columns={coursewareColumns as any}
          />
        </Card>
      ))}

      <Modal title="新建阶段" open={stageOpen} onOk={onCreateStage} onCancel={() => setStageOpen(false)} okText="创建">
        <Form form={stageForm} layout="vertical">
          <Form.Item name="name" label="阶段名称" rules={[{ required: true, message: '请输入阶段名称' }]}>
            <Input placeholder="如：第一阶段" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序">
            <InputNumber min={0} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item label="阶段大纲文件">
            <ResourceUpload
              category="stage"
              onChange={setStageFiles}
              text="上传大纲"
            />
          </Form.Item>
          <Form.Item name="remark" label="说明">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`为「${curStage?.name ?? ''}」添加课件`}
        open={cwOpen} onOk={onCreateCourseware} onCancel={() => setCwOpen(false)} okText="创建"
      >
        <Form form={cwForm} layout="vertical">
          <Form.Item name="title" label="课件标题" rules={[{ required: true, message: '请输入课件标题' }]}>
            <Input placeholder="如：第一课时" />
          </Form.Item>
          <Space>
            <Form.Item name="type" label="类型">
              <Select
                style={{ width: 140 }}
                options={Object.entries(TYPE_LABEL).map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
            <Form.Item name="sortOrder" label="排序">
              <InputNumber min={0} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="durationMinutes" label="时长(分钟)">
              <InputNumber min={0} style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Form.Item label="课件资源(PPT/资源包，可多文件)">
            <ResourceUpload
              category="courseware"
              onChange={setCwFiles}
              text="上传课件"
            />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
