import React, { useState, useEffect } from 'react';
import { History, Search, Filter, Calendar, ChevronRight, Package, DollarSign } from 'lucide-react';

export default function OrderHistory() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOrders(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id.toString().includes(searchTerm) || 
                          (o.line_user_id && o.line_user_id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Analytics for popular items
  const itemCounts: Record<string, { count: number, revenue: number }> = {};
  orders.forEach(o => {
    if (o.status !== 'pending_payment' && o.order_items) {
      o.order_items.forEach((item: any) => {
        if (!itemCounts[item.menu_name]) {
          itemCounts[item.menu_name] = { count: 0, revenue: 0 };
        }
        itemCounts[item.menu_name].count += item.quantity;
        itemCounts[item.menu_name].revenue += (item.price || 0) * item.quantity;
      });
    }
  });

  const popularItems = Object.entries(itemCounts)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.count - a.count);

  if (loading) return <div className="p-8 text-slate-500 text-sm italic">กำลังโหลดประวัติออเดอร์...</div>;

  return (
    <div className="w-full">
      <header className="mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
          <History className="text-indigo-600" /> ประวัติออเดอร์ทั้งหมด
        </h2>
        <p className="text-[11px] md:text-sm text-slate-500 mt-0.5">ตรวจสอบออเดอร์ย้อนหลังและวิเคราะห์รายการที่ขายดี</p>
      </header>

      {/* Popular Items summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 mb-6 shadow-sm overflow-hidden">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Package size={18} className="text-amber-500" /> เมนูที่ขายดีที่สุด
        </h3>
        <div className="flex flex-wrap gap-3">
          {popularItems.slice(0, 5).map((item, i) => (
            <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col items-center min-w-[120px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">อันดับ {i+1}</span>
              <p className="text-sm font-bold text-slate-800 text-center line-clamp-1">{item.name}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-bold text-indigo-600">x{item.count}</span>
                <span className="text-[10px] text-slate-400">จาน</span>
              </div>
            </div>
          ))}
          {popularItems.length === 0 && <p className="text-sm text-slate-400 italic">ยังไม่มีข้อมูลการขาย</p>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="ค้นหา Order ID หรือ User ID..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select 
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">ทุกสถานะ</option>
              <option value="pending_payment">รอชำระเงิน</option>
              <option value="paid">เตรียมอาหาร</option>
              <option value="completed">เสร็จสิ้น</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">ออเดอร์</th>
                <th className="px-6 py-4">ลูกค้า</th>
                <th className="px-6 py-4">รายการ</th>
                <th className="px-6 py-4">ยอดรวม</th>
                <th className="px-6 py-4">สถานะ</th>
                <th className="px-6 py-4">วันที่/เวลา</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map(o => (
                <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">#{o.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-600 truncate max-w-[100px]">{o.line_user_id || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      {o.order_items?.map((item: any, i: number) => (
                        <span key={i} className="text-[10px] text-slate-600 line-clamp-1">{item.menu_name} (x{item.quantity})</span>
                      ))}
                      {!o.order_items?.length && <span className="text-[10px] text-slate-400 italic">-</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-slate-800">฿{o.total_amount}</p>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-700">{new Date(o.created_at).toLocaleDateString('th-TH')}</span>
                      <span className="text-[10px] text-slate-400">{new Date(o.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">ไม่พบออเดอร์ในเงื่อนไขที่กำหนด</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string, color: string }> = {
    pending_payment: { label: 'รอชำระเงิน', color: 'bg-rose-100 text-rose-700 border-rose-200' },
    pending_kitchen: { label: 'กำลังทำอาหาร', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    paid: { label: 'เตรียมอาหาร', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    completed: { label: 'เสร็จสิ้น', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
  };
  const config = configs[status] || { label: status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.color}`}>
      {config.label}
    </span>
  );
}
