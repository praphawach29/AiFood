import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, PieChart, ShoppingCart, DollarSign, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, AreaChart, Area } from 'recharts';

export default function AnalyticsManager() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <TrendingUp className="w-8 h-8 animate-pulse mb-3" />
        <p>กำลังโหลดข้อมูลการวิเคราะห์...</p>
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-center text-rose-500">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>;
  }

  return (
    <div className="w-full">
      <header className="mb-4 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">วิเคราะห์การขาย (Analytics)</h2>
          <p className="text-[11px] md:text-sm text-slate-500 mt-0.5">ภาพรวมยอดขายและเมนูยอดฮิต (30 วันล่าสุด)</p>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between col-span-2 lg:col-span-1">
          <div>
            <p className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wide">ยอดขายรวม</p>
            <h3 className="text-xl md:text-2xl font-bold text-emerald-600 mt-1 md:mt-1.5">฿{data.totalRevenue.toLocaleString()}</h3>
          </div>
          <div className="w-8 h-8 md:w-12 md:h-12 bg-emerald-50 rounded-lg md:rounded-full flex items-center justify-center mt-2 md:mt-0">
            <DollarSign className="w-4 h-4 md:w-6 md:h-6 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between">
          <div>
            <p className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wide">จำนวนออเดอร์</p>
            <h3 className="text-lg md:text-2xl font-bold text-blue-600 mt-1 md:mt-1.5">{data.totalOrders}</h3>
          </div>
          <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-50 rounded-lg md:rounded-full flex items-center justify-center mt-2 md:mt-0">
            <Package className="w-4 h-4 md:w-6 md:h-6 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between">
          <div>
            <p className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wide">เฉลี่ยต่อบิล</p>
            <h3 className="text-lg md:text-2xl font-bold text-indigo-600 mt-1 md:mt-1.5">
              ฿{data.totalOrders > 0 ? (data.totalRevenue / data.totalOrders).toFixed(0) : 0}
            </h3>
          </div>
          <div className="w-8 h-8 md:w-12 md:h-12 bg-indigo-50 rounded-lg md:rounded-full flex items-center justify-center mt-2 md:mt-0">
            <ShoppingCart className="w-4 h-4 md:w-6 md:h-6 text-indigo-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5 lg:col-span-2">
          <h3 className="font-bold text-slate-800 text-sm md:text-base mb-3 md:mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            แนวโน้มรายได้ (Daily Revenue)
          </h3>
          <div className="h-48 md:h-64 w-full">
            {data.trendData && data.trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trendData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b'}} tickLine={false} axisLine={false} />
                  <YAxis tick={{fontSize: 10, fill: '#64748b'}} tickLine={false} axisLine={false} tickFormatter={(v) => `฿${v}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`฿${value.toLocaleString()}`, 'ยอดขาย']}
                    labelStyle={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">ยังไม่มีข้อมูลรายได้ที่วิเคราะห์ได้</div>
            )}
          </div>
        </div>

        {/* Top Items */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5">
          <h3 className="font-bold text-slate-800 text-sm md:text-base mb-3 md:mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            5 อันดับขายดี (Top Menu)
          </h3>
          {data.topItems && data.topItems.length > 0 ? (
            <div className="space-y-3 md:space-y-4">
              {data.topItems.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between border-b border-slate-50 last:border-0 pb-2 md:pb-3 last:pb-0">
                  <div className="flex items-center gap-2.5 md:gap-3">
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded bg-slate-100 flex items-center justify-center text-[10px] md:text-xs font-bold text-slate-500">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-bold text-slate-800 line-clamp-1">{item.name}</p>
                      <p className="text-[9px] md:text-[10px] text-slate-500">{item.quantity} จาน</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] md:text-xs font-bold text-emerald-600">฿{item.revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              ยังไม่มีข้อมูลการขายสินค้าย่อย<br/>(ฟีเจอร์นี้ต้องใช้ตาราง order_items)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
