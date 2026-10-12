import { useState } from 'react';
import { Upload, Button, Space, Typography, List, App } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { uploadResources } from '../api/crm';

export interface ResourceItem {
  id: number;
  originalName: string;
  url: string;
  size: number;
  category: string;
  storageType: string;
}

interface Props {
  /** 资源分类：syllabus / stage / courseware / avatar / doc */
  category?: string;
  refType?: string;
  refId?: number;
  /** 上传完成回调（返回本次累积的全部资源） */
  onChange?: (resources: ResourceItem[]) => void;
  text?: string;
}

/** 统一资源上传（走 /resources/upload，底层本地/OSS 由服务端配置决定） */
export default function ResourceUpload({ category, refType, refId, onChange, text }: Props) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState<ResourceItem[]>([]);

  const doUpload = async (file: File) => {
    setLoading(true);
    try {
      const r = await uploadResources([file], { category, refType, refId });
      const added: ResourceItem[] = Array.isArray(r) ? r : [r];
      const next = [...uploaded, ...added];
      setUploaded(next);
      onChange?.(next);
      message.success('上传成功');
    } catch {
      /* 错误提示由 api 层统一处理 */
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Upload
        multiple
        showUploadList={false}
        beforeUpload={(file) => {
          void doUpload(file as unknown as File);
          return false; // 交由 uploadResources 自行上传
        }}
      >
        <Button icon={<UploadOutlined />} loading={loading}>
          {text || '上传文件'}
        </Button>
      </Upload>
      {uploaded.length > 0 && (
        <List
          size="small"
          dataSource={uploaded}
          renderItem={(r) => (
            <List.Item key={r.id}>
              <Typography.Link href={r.url} target="_blank" rel="noreferrer">
                {r.originalName}
              </Typography.Link>
            </List.Item>
          )}
        />
      )}
    </Space>
  );
}
