import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Form, Toast, Card, Segmented } from 'antd-mobile';
import { sendOtp, parentLogin } from '../api/parent';
import { staffLogin } from '../api/staff';
import { setTokens, setRole, type Role } from '../api/client';

const ROLE_LABEL: Record<Role, string> = {
  parent: '家长',
  teacher: '老师',
  consultant: '顾问',
};

/** 三端统一登录入口：家长走 OTP，老师/顾问走账号密码 */
export default function LoginPage() {
  const [role, setRoleState] = useState<Role>('parent');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const homeOf = (r: Role) => (r === 'parent' ? '/p/students' : r === 'teacher' ? '/t/tasks' : '/c/leads');

  const onSendOtp = async () => {
    if (!/^1\d{10}$/.test(phone)) { Toast.show({ content: '请输入正确的手机号' }); return; }
    setSending(true);
    try {
      await sendOtp(phone);
      Toast.show({ content: '验证码已发送，请查收短信' });
    } finally { setSending(false); }
  };

  const onParentLogin = async () => {
    if (!/^1\d{10}$/.test(phone) || !/^\d{6}$/.test(code)) {
      Toast.show({ content: '请填写手机号与6位验证码' }); return;
    }
    const r = await parentLogin(phone, code);
    setTokens(r.accessToken, r.refreshToken);
    setRole('parent');
    Toast.show({ content: '登录成功' });
    navigate('/p/students', { replace: true });
  };

  const onStaffLogin = async () => {
    if (!username || !password) { Toast.show({ content: '请输入账号与密码' }); return; }
    const r = await staffLogin(username, password);
    if (!r?.accessToken) { Toast.show({ content: '登录失败' }); return; }
    setTokens(r.accessToken, r.refreshToken);
    setRole(role);
    Toast.show({ content: '登录成功' });
    navigate(homeOf(role), { replace: true });
  };

  return (
    <div className="page">
      <div className="page-title">登录</div>
      <div style={{ padding: 16 }}>
        <Segmented
          value={role}
          onChange={(v) => setRoleState(v as Role)}
          options={(['parent', 'teacher', 'consultant'] as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
        />
      </div>
      <Card style={{ margin: 16 }}>
        {role === 'parent' ? (
          <>
            <Form layout="vertical">
              <Form.Item label="手机号">
                <Input placeholder="请输入手机号" value={phone} onChange={setPhone} maxLength={11} />
              </Form.Item>
              <Form.Item label="验证码" extra={
                <Button size="mini" color="primary" fill="none" loading={sending} onClick={onSendOtp}>获取验证码</Button>
              }>
                <Input placeholder="6位验证码" value={code} onChange={setCode} maxLength={6} />
              </Form.Item>
            </Form>
            <Button block color="primary" size="large" onClick={onParentLogin}>登录 / 注册</Button>
          </>
        ) : (
          <>
            <Form layout="vertical">
              <Form.Item label="账号"><Input placeholder="用户名" value={username} onChange={setUsername} /></Form.Item>
              <Form.Item label="密码"><Input placeholder="密码" type="password" value={password} onChange={setPassword} /></Form.Item>
            </Form>
            <Button block color="primary" size="large" onClick={onStaffLogin}>登录</Button>
          </>
        )}
      </Card>
    </div>
  );
}
