import { useState } from 'react';
import { Card, Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { loginAndStore } from '../api/crm';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await loginAndStore(values.username, values.password);
      message.success('登录成功');
      navigate('/leads', { replace: true });
    } catch (e) {
      // 错误已由拦截器提示
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Card title="机构管理系统 · 登录" style={{ width: 380 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="username"
            label="账号"
            rules={[{ required: true, message: '请输入账号' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名@品牌域（如 admin@acme）" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            登录
          </Button>
          <div style={{ marginTop: 12, color: 'rgba(0,0,0,.45)', fontSize: 12, lineHeight: 1.6 }}>
            品牌域/校区账号请使用 <b>用户名@品牌域</b> 登录（如 <code>admin@acme</code>）；
            总域默认管理员直接输入用户名即可。
          </div>
        </Form>
      </Card>
    </div>
  );
}
