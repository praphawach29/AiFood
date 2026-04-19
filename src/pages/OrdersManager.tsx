import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Clock, CheckCircle2, DollarSign, ChefHat } from 'lucide-react';

export default function OrdersManager() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const prevOrdersRef = useRef<any[]>([]);

  const playPingSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = f; o.type = 'sine';
        g.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
        o.start(ctx.currentTime + i * 0.12); o.stop(ctx.currentTime + i * 0.12 + 0.3);
      });
    } catch (e) {
      console.error('Audio play failed', e);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      
      if (Array.isArray(data)) {
        // Check for new orders to play sound
        if (prevOrdersRef.current.length > 0 && prevOrdersRef.current.length < data.length) {
          playPingSound();
        }
        prevOrdersRef.current = data;
        setOrders(data);
      } else {
        console.error('API returned an error:', data);
        setOrders([]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Polling every 10 seconds for faster updates
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id: number, status: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    await fetch(`/api/orders/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchOrders();
  };

  const pendingOrders = orders.filter(o => o.status === 'pending_payment');
  const paidOrders = orders.filter(o => o.status === 'paid');
  const completedOrders = orders.filter(o => o.status === 'completed');

  const totalRevenue = orders.filter(o => o.status !== 'pending_payment').reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  if (loading && orders.length === 0) return <div className="p-8 text-slate-500 text-sm">กำลังโหลดข้อมูลออเดอร์...</div>;

  return (
    <div className="w-full h-[calc(100vh-100px)] md:h-[calc(100vh-80px)] flex flex-col">
      <header className="mb-4 md:mb-6 shrink-0">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800">จัดการออเดอร์ (Kanban Board)</h2>
        <p className="text-[11px] md:text-sm text-slate-500 mt-0.5">ลากหรือกดเพื่อเปลี่ยนสถานะออเดอร์ มีเสียงเตือนเมื่อออเดอร์ใหม่เข้า</p>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6 shrink-0">
        <div className="bg-white rounded-xl border border-slate-200 p-3 md:p-4 flex items-center gap-3 md:gap-4">
          <div className="bg-blue-50 text-blue-600 p-2 md:p-3 rounded-lg"><ShoppingBag size={20} className="w-4 h-4 md:w-5 md:h-5"/></div>
          <div><p className="text-[10px] md:text-xs text-slate-500 font-semibold mb-0.5">ออเดอร์ทั้งหมด</p><h4 className="text-lg md:text-xl font-bold text-slate-800">{orders.length}</h4></div>
        </div>
        <div className="bg-white rounded-xl border border-rose-100 p-3 md:p-4 flex items-center gap-3 md:gap-4">
          <div className="bg-rose-50 text-rose-600 p-2 md:p-3 rounded-lg"><Clock size={20} className="w-4 h-4 md:w-5 md:h-5"/></div>
          <div><p className="text-[10px] md:text-xs text-slate-500 font-semibold mb-0.5">รอชำระเงิน</p><h4 className="text-lg md:text-xl font-bold text-rose-600">{pendingOrders.length}</h4></div>
        </div>
        <div className="bg-white rounded-xl border border-amber-100 p-3 md:p-4 flex items-center gap-3 md:gap-4">
          <div className="bg-amber-50 text-amber-600 p-2 md:p-3 rounded-lg"><ChefHat size={20} className="w-4 h-4 md:w-5 md:h-5"/></div>
          <div><p className="text-[10px] md:text-xs text-slate-500 font-semibold mb-0.5">กำลังเตรียม / ทำอาหาร</p><h4 className="text-lg md:text-xl font-bold text-amber-600">{paidOrders.length}</h4></div>
        </div>
        <div className="bg-white rounded-xl border border-emerald-100 p-3 md:p-4 flex items-center gap-3 md:gap-4">
          <div className="bg-emerald-50 text-emerald-600 p-2 md:p-3 rounded-lg"><DollarSign size={20} className="w-4 h-4 md:w-5 md:h-5"/></div>
          <div><p className="text-[10px] md:text-xs text-slate-500 font-semibold mb-0.5">รายได้รวม (ที่ชำระแล้ว)</p><h4 className="text-lg md:text-xl font-bold text-emerald-600">฿{totalRevenue}</h4></div>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex gap-4 md:gap-6 h-full min-w-[800px] md:min-w-[900px]">
          
          {/* Column 1: Pending */}
          <div className="flex-1 flex flex-col bg-slate-100/50 rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-3 md:p-4 border-b border-slate-200 flex items-center justify-between bg-white/50 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                <h3 className="font-bold text-slate-800 text-sm md:text-base">1. รอชำระเงิน</h3>
              </div>
              <span className="bg-white border border-slate-200 text-slate-600 text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full">{pendingOrders.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 p-4 flex flex-col gap-3">
              {pendingOrders.map(o => (
                <OrderCard key={o.id} order={o} onAdvance={() => updateStatus(o.id, 'paid')} buttonText="ยืนยันชำระเงิน" buttonColor="border-rose-200 hover:bg-rose-50 text-rose-600" />
              ))}
              {pendingOrders.length === 0 && <div className="text-center p-6 text-slate-400 text-xs font-medium border-2 border-dashed border-slate-200 rounded-xl">ว่างเปล่า</div>}
            </div>
          </div>

          {/* Column 2: Paid/Preparing */}
          <div className="flex-1 flex flex-col bg-slate-100/50 rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-3 md:p-4 border-b border-slate-200 flex items-center justify-between bg-white/50 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                <h3 className="font-bold text-slate-800 text-sm md:text-base">2. ชำระแล้ว / กำลังทำ</h3>
              </div>
              <span className="bg-white border border-slate-200 text-slate-600 text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full">{paidOrders.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 p-4 flex flex-col gap-3">
              {paidOrders.map(o => (
                <OrderCard key={o.id} order={o} onAdvance={() => updateStatus(o.id, 'completed')} buttonText="ทำอาหารเสร็จสิ้น" buttonColor="border-amber-200 hover:bg-amber-50 text-amber-600" />
              ))}
              {paidOrders.length === 0 && <div className="text-center p-6 text-slate-400 text-xs font-medium border-2 border-dashed border-slate-200 rounded-xl">ไม่มีออเดอร์ค้างทำ</div>}
            </div>
          </div>

          {/* Column 3: Completed */}
          <div className="flex-1 flex flex-col bg-slate-100/50 rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-3 md:p-4 border-b border-slate-200 flex items-center justify-between bg-white/50 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <h3 className="font-bold text-slate-800 text-sm md:text-base">3. เสร็จสิ้น</h3>
              </div>
              <span className="bg-white border border-slate-200 text-slate-600 text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full">{completedOrders.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 p-4 flex flex-col gap-3">
              {completedOrders.map(o => (
                <OrderCard key={o.id} order={o} onAdvance={() => {}} buttonText="เสร็จสิ้นแล้ว" buttonColor="border-transparent text-emerald-600 bg-emerald-50 cursor-default" disabled />
              ))}
              {completedOrders.length === 0 && <div className="text-center p-6 text-slate-400 text-xs font-medium border-2 border-dashed border-slate-200 rounded-xl">ยังไม่มีออเดอร์ที่ทำเสร็จ</div>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

interface OrderCardProps {
  key?: React.Key;
  order: any;
  onAdvance: () => void;
  buttonText: string;
  buttonColor: string;
  disabled?: boolean;
}

function OrderCard({ order, onAdvance, buttonText, buttonColor, disabled = false }: OrderCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 md:p-4 shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{order.id}</span>
        </div>
        <span className="text-[10px] md:text-xs font-medium text-slate-500">{new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      
      <div className="mb-3">
        <p className="text-lg md:text-xl font-bold text-slate-800 mb-1">฿{order.total_amount}</p>
        <p className="text-[11px] md:text-xs text-slate-500 line-clamp-1 mb-2">
          ไอดีลูกค้า: {order.line_user_id?.slice(0,10)}...
        </p>

        {order.order_items && order.order_items.length > 0 ? (
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
            <p className="text-[10px] md:text-xs font-semibold text-slate-600 mb-1 border-b border-slate-200 pb-1">ออเดอร์:</p>
            <ul className="space-y-1">
              {order.order_items.map((item: any, i: number) => (
                <li key={i} className="text-[11px] md:text-xs flex justify-between">
                  <span className="text-slate-700 truncate mr-2">{item.menu_name}</span>
                  <span className="font-medium text-slate-600 shrink-0">x{item.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-[11px] md:text-xs text-slate-400 italic bg-slate-50 p-2 rounded-lg border border-slate-100">(ไม่ได้บันทึกรายการอาหารไว้)</p>
        )}
      </div>

      <button 
        onClick={onAdvance} 
        disabled={disabled}
        className={`w-full py-2 border rounded-lg text-xs font-bold transition-colors ${buttonColor}`}
      >
        {buttonText}
      </button>
    </div>
  );
}
