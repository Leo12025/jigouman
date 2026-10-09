import { useEffect, useState } from 'react';
import { Table, Select, Space, Tag, Button, Popconfirm, message, Typography } from 'antd';
import { listResources, deleteResource } from '../api/crm';
import ResourceUpload from '../components/ResourceUpload';

const CATEGORY_LABEL: Record<string, string> = {
  syllabus: '课程大纲', stage: '阶段大纲', courseware: '课件', avatar: '头像', doc: '文档', other: '其他',
};

const fmtSize = (n: number) => {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / 1024 / 1024).toFixed(1)} MB`;
};

export default function ResourcePage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string | undefined>();
  const [uploadCategory, setUploadCategory] = useState<string>('other');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r: any = await listResources({ page, size: 20, category });
      setData(r.list || []);
      setTotal(r.total || 0);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, category]);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '文件名', dataIndex: 'originalName' },
    {
      title: '分类', dataIndex: 'category', width: 110,
      render: (c: string) => <Tag>{CATEGORY_LABEL[c] || c}</Tag>,
    },
    {
      title: '存储', dataIndex: 'storageType', width: 90,
      render: (s: string) => <Tag color={s === 'oss' ? 'blue' : 'default'}>{s}</Tag>,
    },
    { title: '大小', dataIndex: 'size', width: 100, render: (s: number) => fmtSize(s) },
    {
      title: '访问地址', dataIndex: 'url',
      render: (u: string) => (
        <Typography.Link href={u} target="_blank" rel="noreferrer" ellipsis>
          {u}
        </Typography.Link>
      ),
    },
    {
      title: '操作', width: 90,
      render: (_: any, r: any) => (
        <Popconfirm
          title="确认删除该资源？"
          onConfirm={async () => { await deleteResource(r.id); message.success('已删除'); load(); }}
        >
          <Button size="small" danger>删除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12, justifyContent: 'space-between', width: '100%' }}>
        <Space>
          <Select
            placeholder="筛选分类" allowClear style={{ width: 150 }}
            value={category} onChange={setCategory}
            options={Object.entries(CATEGORY_LABEL).map(([k, v]) => ({ value: k, label: v }))}
          />
          <Button onClick={load}>刷新</Button>
        </Space>
        <Space>
          <span>上传分类：</span>
          <Select
            style={{ width: 150 }} value={uploadCategory} onChange={setUploadCategory}
            options={Object.entries(CATEGORY_LABEL).map(([k, v]) => ({ value: k, label: v }))}
          />
          <ResourceUpload category={uploadCategory} text="上传文件" />
        </Space>
      </Space>

      <Table
        rowKey="id" loading={loading} dataSource={data} columns={columns as any}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage }}
        size="small"
      />
    </div>
  );
}
