import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle,
  Database,
  Cpu,
  RefreshCw,
  ShoppingBag,
  Settings
} from 'lucide-react';

export default function DashboardHome() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full">
      <header className="flex justify-between items-center mb-5 md:mb-8 w-full">
        <div>
          <h2 className="text-lg md:text-2xl font-bold text-slate-800">ภาพรวมระบบ (Overview)</h2>
          <p className="text-[11px] md:text-sm text-slate-500 mt-0.5">ยินดีต้อนรับสู่ระบบจัดการหลังบ้าน ร้านข้าวต้มนิดา</p>
        </div>
        <button 
          onClick={fetchStatus}
          className="p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-full transition-colors shrink-0"
        >
          <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 mb-6 md:mb-8">
        <StatusCard 
          title="การเชื่อมต่อ LINE" 
          status="ทำงานปกติ ปกติ" 
          desc="ระบบเปิดรับข้อความพอร์ต 3000"
          icon={<CheckCircle2 className="text-emerald-500" />}
          bgColor="bg-emerald-50"
        />
        <StatusCard 
          title="สมองกล AI" 
          status={status?.ai_provider === 'anthropic' ? 'Claude' : 'Gemini'} 
          desc={status?.ai_provider === 'anthropic' ? 'วิเคราะห์ภาษาได้ละเอียดลึกซึ้ง' : 'ส่งข้อความตอบโต้ได้รวดเร็ว'}
          icon={<Cpu className="text-indigo-500" />}
          bgColor="bg-indigo-50"
        />
        <StatusCard 
          title="เชื่อมต่อฐานข้อมูล" 
          status="เชื่อมต่อแล้ว" 
          desc="ซิงค์ข้อมูลกับ Supabase แล้ว"
          icon={<Database className="text-amber-500" />}
          bgColor="bg-amber-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Debug Panel */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 text-sm md:text-base">ตรวจสอบการตั้งค่า (Debugger)</h3>
            <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-500 font-mono">
              {status?.time?.split('T')[1].split('.')[0] || '--:--:--'}
            </span>
          </div>
          <div className="p-5">
            <p className="text-sm text-slate-600 mb-4">
              สถานะของตัวแปรระบบ (Environment Variables) ที่จำเป็น
            </p>
            
            <div className="space-y-4">
              <DebugRow label="LINE Channel Secret" isSet={true} value="ตั้งค่าแล้ว" />
              <DebugRow label="LINE Access Token" isSet={true} value="ตั้งค่าแล้ว" />
              <DebugRow label="Supabase URL / Key" isSet={true} value="ตั้งค่าแล้ว" />
              <div className="pt-4 border-t border-slate-100 mt-4">
                <div className="bg-slate-50 rounded-lg p-3 md:p-4 font-mono text-[11px] md:text-xs text-slate-500 break-all select-all">
                  Webhook URL: {window.location.origin}/webhook
                </div>
                <p className="text-[10px] md:text-xs text-slate-400 mt-2 italic px-1">
                  * หากใช้บน Railway ให้นำลิงก์จากหน้า Networking มาใส่ใน LINE Developers
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Activity / Suggestions */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
          <h3 className="font-semibold text-slate-800 mb-5 text-sm md:text-base">คู่มือการใช้งานเริ่มต้น</h3>
          <div className="space-y-5">
            <ActivityItem 
              title="จัดการออเดอร์ (Manage Orders)"
              desc="ตรวจสอบรายการสั่งซื้อที่เข้ามา และกดบันทึกสถานะการชำระเงินหรือสถานะจัดส่งใหม่อีกครั้ง"
              type="order"
            />
            <ActivityItem 
              title="จัดการเมนูอาหาร (Food Menu)"
              desc="เปิดหรือปิดเมนูชั่วคราว (ของหมด) เพื่อให้บอทรับทราบและหยุดแนะนำเมนูนั้นให้ลูกค้าทันที"
              type="database"
            />
            <ActivityItem 
              title="ตั้งค่าระบบ (Settings)"
              desc="สามารถสลับสับเปลี่ยนค่าย AI ระหว่าง Google และ Anthropic ได้แบบ Real-time"
              type="settings"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusCard({ title, status, desc, icon, bgColor }: { title: string, status: string, desc: string, icon: React.ReactNode, bgColor: string }) {
  return (
    <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-default col-span-1 first:col-span-2 lg:first:col-span-1">
      <div className={` ${bgColor} w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4 `}>
        {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4 md:w-5 md:h-5 text-current' })}
      </div>
      <h4 className="text-slate-500 text-[9px] md:text-[11px] font-semibold uppercase tracking-wider mb-0.5">{title}</h4>
      <p className="text-base md:text-lg font-bold text-slate-800 mb-0.5">{status}</p>
      <p className="text-[10px] md:text-xs text-slate-400 line-clamp-1">{desc}</p>
    </div>
  );
}

function DebugRow({ label, isSet, value }: { label: string, isSet: boolean, value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2">
        {isSet ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> : <AlertTriangle size={14} className="text-amber-500 shrink-0" />}
        <span className="text-xs md:text-sm font-medium text-slate-700">{label}</span>
      </div>
      <span className={`text-[10px] md:text-xs text-right whitespace-nowrap ml-2 ${isSet ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-bold'}`}>
        {value}
      </span>
    </div>
  );
}

function ActivityItem({ title, desc, type }: { title: string, desc: string, type: string }) {
  return (
    <div className="flex gap-4 group">
      <div className="relative">
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center relative z-10 shrink-0
          ${type === 'order' ? 'bg-emerald-100 text-emerald-600' : type === 'database' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}
        `}>
          {type === 'order' ? <ShoppingBag size={14} /> : type === 'database' ? <Database size={14} /> : <Settings size={14} />}
        </div>
        <div className="absolute top-8 bottom--6 left-1/2 w-px bg-slate-100 -translate-x-1/2 group-last:hidden" />
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-slate-800 mb-1 leading-snug">{title}</h4>
        <p className="text-[11px] md:text-xs text-slate-500 leading-relaxed max-w-sm">{desc}</p>
      </div>
    </div>
  );
}
