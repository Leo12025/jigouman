import { Card, List, Tag } from 'antd-mobile';
import { myOrders } from '../../api/parent';
import BottomTab from '../../components/BottomTab';
import { useApi } from '../../hooks/useApi';
import StateView from '../../components/StateView';
import { PullRefresh } from '../../components/PullRefresh';

const STATUS: Record<string, { text: string; color: string }> = {
  PENDING: { text: '待支付', color: 'warning' },
  PAID: { text: '已支付', color: 'success' },
  COMPLETED: { text: '已完成', color: 'default' },
  REFUNDING: { text: '退款中', color: 'warning' },
  REFUNDED: { text: '已退费', color: 'default' },
  CANCELLED: { text: '已取消', color: 'default' },
};

/** 我的缴费（§11.6 家长端「缴费/续费」） */
export default function OrdersPage() {
  const { data, loading, error, reload } = useApi(() => myOrders());
  const rows: any[] = data || [];

  return (
    <PullRefresh onRefresh={async () => reload()}>
      <div className="page">
      <div className="page-title">我的缴费</div>
      <div style={{ padding: 12 }}>
        <StateView loading={loading} error={error} onRetry={reload}>
          {rows.length ? rows.map((o) => {
            const s = STATUS[o.status] || { text: o.status, color: 'default' };
            return (
              <Card key={o.id} style={{ marginBottom: 10 }}>
                <List>
                  <List.Item extra={<Tag color={s.color}>{s.text}</Tag>}>订单 {o.no || `#${o.id}`}</List.Item>
                  <List.Item extra={`¥${o.payableAmount ?? o.totalAmount ?? 0}`}>应付金额</List.Item>
                  <List.Item extra={o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '-'}>
                    学员 {o.studentId}
                  </List.Item>
                </List>
              </Card>
            );
          }) : <Card><div style={{ padding: 12, color: '#999' }}>暂无缴费记录</div></Card>}
        </StateView>
      </div>
      <BottomTab />
      </div>
    </PullRefresh>
  );
}
