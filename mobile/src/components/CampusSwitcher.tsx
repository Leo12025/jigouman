import { useEffect, useState } from 'react';
import { Popup, List, Toast } from 'antd-mobile';
import { myCampuses } from '../api/parent';
import { getCurrentOrg, setCurrentOrg, getRole } from '../api/client';

interface Campus {
  orgId: number;
  name: string;
}

/**
 * 移动端校区切换器：家长/老师在多个校区有数据时，切换当前校区视角。
 * 切换后经 X-Org-Id 下发，后端按 org_id 隔离返回数据；选"全部校区"则不携带该头。
 */
export default function CampusSwitcher({ onChanged }: { onChanged?: () => void }) {
  const [visible, setVisible] = useState(false);
  const [list, setList] = useState<Campus[]>([]);
  const [current, setCurrent] = useState<number | null>(getCurrentOrg());

  const load = async () => {
    try {
      const rows = await myCampuses();
      const arr = Array.isArray(rows) ? rows : [];
      setList(arr);
      // 无校区数据 / 仅一个校区时不展示切换入口
      if (arr.length <= 1) return;
    } catch {
      /* 学员未绑定等场景静默：不展示切换入口 */
    }
  };

  useEffect(() => {
    load();
  }, []);

  const role = getRole();
  if (role !== 'parent' || list.length <= 1) return null;

  const currentName =
    list.find((c) => c.orgId === current)?.name || '全部校区(总校区)';

  const onPick = (orgId: number | null) => {
    setCurrentOrg(orgId);
    setCurrent(orgId);
    setVisible(false);
    Toast.show({ content: orgId == null ? '已切换为全部校区' : '已切换校区' });
    // 触发依赖校区的数据重新加载
    onChanged?.();
    window.location.reload();
  };

  return (
    <>
      <List.Item
        extra={currentName}
        clickable
        onClick={() => setVisible(true)}
      >
        当前校区
      </List.Item>
      <Popup
        visible={visible}
        onMaskClick={() => setVisible(false)}
        bodyStyle={{ borderTopLeftRadius: 8, borderTopRightRadius: 8, minHeight: '30vh' }}
      >
        <List header="选择校区">
          <List.Item
            extra={current == null ? '当前' : ''}
            clickable
            onClick={() => onPick(null)}
          >
            全部校区(总校区)
          </List.Item>
          {list.map((c) => (
            <List.Item
              key={c.orgId}
              extra={current === c.orgId ? '当前' : ''}
              clickable
              onClick={() => onPick(c.orgId)}
            >
              {c.name}
            </List.Item>
          ))}
        </List>
      </Popup>
    </>
  );
}
