import { useEffect, useState } from 'react';
import { Card, List, Button, Tag, Toast, Tabs, Input } from 'antd-mobile';
import {
  createDistributor,
  listCommissions,
  createComplaint,
  listComplaints,
  listContracts,
  redeemGroupBuy,
  myStudents,
} from '../../api/parent';
import { getList } from '../../api/client';
import BottomTab from '../../components/BottomTab';

/** 家长端：转介绍 / 客诉售后 / 合同查看 / 团购核销（§4.28/§4.26/§4.23/§4.24） */
export default function ServicePage() {
  return (
    <div className="page">
      <div className="page-title">我的服务</div>
      <Tabs>
        <Tabs.Tab title="转介绍" key="ref"><ReferralTab /></Tabs.Tab>
        <Tabs.Tab title="客诉售后" key="cmp"><ComplaintTab /></Tabs.Tab>
        <Tabs.Tab title="合同查看" key="ct"><ContractTab /></Tabs.Tab>
        <Tabs.Tab title="团购核销" key="gb"><RedeemTab /></Tabs.Tab>
      </Tabs>
      <BottomTab />
    </div>
  );
}

function ReferralTab() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [distId, setDistId] = useState<number | null>(
    () => Number(localStorage.getItem('p_dist_id')) || null,
  );
  const [comm, setComm] = useState<any[]>([]);
  const [invite, setInvite] = useState('');

  const loadComm = (id: number) =>
    getList(listCommissions(id)).then(setComm);

  useEffect(() => { if (distId) loadComm(distId); }, [distId]);

  const onRegister = async () => {
    if (!name || !phone) return Toast.show({ content: '请填写姓名与手机号' });
    const r = await createDistributor({ name, phone }).catch((e) => {
      Toast.show({ content: '登记失败：' + (e?.response?.data?.message || '') });
      return null;
    });
    if (r) {
      localStorage.setItem('p_dist_id', String(r.id));
      setDistId(r.id);
      setInvite(String(r.id));
      Toast.show({ content: '已登记，邀请码即分销员ID' });
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <Card title="我的转介绍">
        <Input placeholder="姓名" value={name} onChange={setName} />
        <Input placeholder="手机号" value={phone} onChange={setPhone} style={{ marginTop: 8 }} />
        <Button color="primary" block style={{ marginTop: 8 }} onClick={() => { void onRegister(); }}>登记/获取邀请码</Button>
        {invite && <div style={{ marginTop: 8 }}>我的邀请码：<b>{invite}</b></div>}
      </Card>
      <List header="我的佣金" style={{ marginTop: 12 }}>
        {comm.map((c) => (
          <List.Item key={c.id} extra={<Tag color={c.status === 'SETTLED' ? 'green' : 'warning'}>{c.status}</Tag>}>
            金额 {c.amount}
          </List.Item>
        ))}
        {!comm.length && <div style={{ color: '#999', padding: 12 }}>暂无佣金</div>}
      </List>
    </div>
  );
}

function ComplaintTab() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const load = () => listComplaints({ page: 1, size: 50 }).then((r) => setRows(r.list || [])).catch(() => setRows([]));
  useEffect(() => { load(); }, []);
  const onSubmit = async () => {
    if (!title || !content) return Toast.show({ content: '请填写标题与内容' });
    await createComplaint({ title, content }).catch((e) =>
      Toast.show({ content: '提交失败：' + (e?.response?.data?.message || '') }),
    );
    Toast.show({ content: '已提交客诉' });
    setTitle(''); setContent('');
    load();
  };
  return (
    <div style={{ padding: 12 }}>
      <Input placeholder="客诉标题" value={title} onChange={setTitle} />
      <Input placeholder="详细描述" value={content} onChange={setContent} style={{ marginTop: 8 }} />
      <Button color="primary" block style={{ marginTop: 8 }} onClick={() => { void onSubmit(); }}>提交客诉</Button>
      <List header="我的客诉" style={{ marginTop: 12 }}>
        {rows.map((c) => (
          <List.Item key={c.id} extra={<Tag color={c.status === 'RESOLVED' ? 'green' : 'orange'}>{c.status}</Tag>}>
            {c.title}
          </List.Item>
        ))}
        {!rows.length && <div style={{ color: '#999', padding: 12 }}>暂无客诉</div>}
      </List>
    </div>
  );
}

function ContractTab() {
  const [students, setStudents] = useState<any[]>([]);
  const [stuId, setStuId] = useState<number>();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { getList(myStudents()).then(setStudents); }, []);
  const onView = () => {
    if (!stuId) return Toast.show({ content: '请选择学员' });
    listContracts({ studentId: stuId }).then((r) => setRows(r.list || [])).catch(() => setRows([]));
  };
  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 8 }}>选择学员</div>
      <CompactSelect
        options={students.map((s) => ({ label: s.name, value: s.id }))}
        value={stuId}
        onChange={setStuId}
      />
      <Button color="primary" block style={{ marginTop: 8 }} onClick={() => { void onView(); }}>查看合同</Button>
      <List header="合同列表" style={{ marginTop: 12 }}>
        {rows.map((c) => (
          <List.Item key={c.id} extra={<Tag color={c.status === 'SIGNED' ? 'green' : 'default'}>{c.status}</Tag>}>
            {c.partyName} {c.title || ''}
          </List.Item>
        ))}
        {!rows.length && <div style={{ color: '#999', padding: 12 }}>暂无合同</div>}
      </List>
    </div>
  );
}

function CompactSelect({ options, value, onChange }: any) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map((o: any) => (
        <Button
          key={o.value}
          size="mini"
          fill={value === o.value ? 'solid' : 'outline'}
          color={value === o.value ? 'primary' : 'default'}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}

function RedeemTab() {
  const [code, setCode] = useState('');
  const [res, setRes] = useState<any>(null);
  const onRedeem = async () => {
    if (!code) return Toast.show({ content: '请输入团购码' });
    const r = await redeemGroupBuy(code).catch((e) => {
      Toast.show({ content: '核销失败：' + (e?.response?.data?.message || '未知错误') });
      return null;
    });
    if (r) { setRes(r); Toast.show({ content: '核销成功' }); }
  };
  return (
    <div style={{ padding: 12 }}>
      <Input placeholder="输入团购码" value={code} onChange={setCode} />
      <Button color="primary" block style={{ marginTop: 8 }} onClick={() => { void onRedeem(); }}>核销</Button>
      {res && <Card style={{ marginTop: 12 }}>状态：{res.status}</Card>}
    </div>
  );
}
