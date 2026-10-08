import { useEffect, useState } from 'react';
import { Card, Button, Toast, Dialog, Input, Form, List } from 'antd-mobile';
import { myStudents, bindStudent, unbindStudent } from '../../api/parent';
import BottomTab from '../../components/BottomTab';

/** 我的学员（多对多绑定，§6.23） */
export default function StudentsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [parentName, setParentName] = useState('');
  const [relation, setRelation] = useState('');

  const load = async () => {
    try {
      setRows(await myStudents());
    } catch { setRows([]); }
  };
  useEffect(() => { load(); }, []);

  const onBind = async () => {
    if (!studentId) { Toast.show({ content: '请输入学员ID' }); return; }
    await bindStudent({ studentId: Number(studentId), parentName: parentName || undefined, relation: relation || undefined });
    Toast.show({ content: '绑定成功' });
    setOpen(false); setStudentId(''); setParentName(''); setRelation('');
    load();
  };

  const onUnbind = async (id: number) => {
    const ok = await Dialog.confirm({ content: '确定解绑该学员？' });
    if (!ok) return;
    await unbindStudent(id);
    Toast.show({ content: '已解绑' });
    load();
  };

  return (
    <div className="page">
      <div className="page-title">我的学员</div>
      <div style={{ padding: 12 }}>
        {rows.length ? rows.map((s) => (
          <Card key={s.bindId} style={{ marginBottom: 10 }}>
            <List>
              <List.Item extra={s.relation || '-'}>{s.studentName}（ID:{s.studentId}）</List.Item>
              <List.Item extra={s.isMain ? '主联系人' : '非主'}>关系</List.Item>
            </List>
            <Button size="mini" fill="none" color="danger" onClick={() => onUnbind(s.bindId)}>解绑</Button>
          </Card>
        )) : <Card><div style={{ padding: 12, color: '#999' }}>暂无绑定学员，请先绑定</div></Card>}

        <Button block color="primary" onClick={() => setOpen(true)} style={{ marginTop: 8 }}>绑定学员</Button>
      </div>

      {open && (
        <div style={{ padding: 12 }}>
          <Form layout="vertical">
            <Form.Item label="学员ID"><Input placeholder="学员ID" value={studentId} onChange={setStudentId} /></Form.Item>
            <Form.Item label="家长姓名"><Input placeholder="选填" value={parentName} onChange={setParentName} /></Form.Item>
            <Form.Item label="关系"><Input placeholder="如 母亲" value={relation} onChange={setRelation} /></Form.Item>
          </Form>
          <Button block color="primary" onClick={onBind}>确认绑定</Button>
          <Button block fill="none" onClick={() => setOpen(false)} style={{ marginTop: 8 }}>取消</Button>
        </div>
      )}
      <BottomTab />
    </div>
  );
}
