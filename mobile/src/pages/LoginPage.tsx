import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Form, Toast, Card } from 'antd-mobile';
import { sendOtp, parentLogin } from '../api/parent';
import { setTokens } from '../api/client';

/** 家长端登录：手机号 + 短信验证码（§6.23） */
export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const onSendOtp = async () => {
    if (!/^1\d{10}$/.test(phone)) {
      Toast.show({ content: '请输入正确的手机号' });
      return;
    }
    setSending(true);
    try {
      const r = await sendOtp(phone);
      // 非生产环境后端回传验证码，便于联调；生产由短信下发
      Toast.show({ content: r.code ? `验证码已发送：${r.code}` : '验证码已发送' });
      if (r.code) setCode(r.code);
    } finally {
      setSending(false);
    }
  };

  const onLogin = async () => {
    if (!/^1\d{10}$/.test(phone) || !/^\d{6}$/.test(code)) {
      Toast.show({ content: '请填写手机号与6位验证码' });
      return;
    }
    const r = await parentLogin(phone, code);
    setTokens(r.accessToken, r.refreshToken);
    Toast.show({ content: '登录成功' });
    navigate('/', { replace: true });
  };

  return (
    <div className="page">
      <div className="page-title">家长端登录</div>
      <Card style={{ margin: 16 }}>
        <Form layout="vertical">
          <Form.Item label="手机号">
            <Input placeholder="请输入手机号" value={phone} onChange={setPhone} maxLength={11} />
          </Form.Item>
          <Form.Item label="验证码" extra={
            <Button size="mini" color="primary" fill="none" loading={sending} onClick={onSendOtp}>
              获取验证码
            </Button>
          }>
            <Input placeholder="6位验证码" value={code} onChange={setCode} maxLength={6} />
          </Form.Item>
        </Form>
        <Button block color="primary" size="large" onClick={onLogin} style={{ marginTop: 8 }}>
          登录 / 注册
        </Button>
      </Card>
    </div>
  );
}
