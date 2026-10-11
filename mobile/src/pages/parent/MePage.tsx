import { useNavigate } from 'react-router-dom';
import { List, Button, Toast, Dialog } from 'antd-mobile';
import { clearToken, getToken, decodeJwt, getRole } from '../../api/client';
import BottomTab from '../../components/BottomTab';
import CampusSwitcher from '../../components/CampusSwitcher';

const ENTRIES = [
  { key: 'consumptions', title: '消课与考勤', desc: '上课消课记录' },
  { key: 'growth', title: '成长档案', desc: '成绩/素养/赛事/获奖' },
  { key: 'orders', title: '我的缴费', desc: '订单与缴费记录' },
  { key: 'notices', title: '我的通知', desc: '机构通知与续费提醒' },
];

const ROLE_LABEL: Record<string, string> = {
  parent: '家长',
  teacher: '老师',
  consultant: '顾问',
};

/** 家长端「我的」：汇总入口（§11.6 家长端其余能力） */
export default function MePage() {
  const navigate = useNavigate();
  const payload = decodeJwt();
  const account = payload?.sub || payload?.phone || payload?.username || '已登录用户';
  const roleLabel = ROLE_LABEL[getRole()] || '家长';

  const onLogout = async () => {
    const ok = await Dialog.confirm({ content: '确定退出登录？' });
    if (!ok) return;
    clearToken();
    Toast.show({ content: '已退出' });
    navigate('/login', { replace: true });
  };

  return (
    <div className="page">
      <div className="page-title">我的</div>
      <div style={{ padding: 12 }}>
        <div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{account}</div>
          <div style={{ color: '#999', fontSize: 13, marginTop: 4 }}>{roleLabel}账号</div>
        </div>
      </div>
      <List>
        {ENTRIES.map((e) => (
          <List.Item key={e.key} extra={e.desc} onClick={() => navigate(`/p/${e.key}`)} clickable>
            {e.title}
          </List.Item>
        ))}
        <CampusSwitcher />
      </List>
      <div style={{ padding: 16 }}>
        <Button block color="danger" fill="outline" onClick={onLogout} disabled={!getToken()}>
          退出登录
        </Button>
      </div>
      <BottomTab />
    </div>
  );
}
