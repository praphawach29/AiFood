import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Outlet } from 'react-router-dom';
import { 
  Bot, Settings, Database, ShoppingBag, LayoutDashboard, Menu, X
} from 'lucide-react';

// Pages
import OrdersManager from './pages/OrdersManager';
import MenuManager from './pages/MenuManager';
import SettingsManager from './pages/SettingsManager';
import DashboardHome from './pages/DashboardHome';
import AnalyticsManager from './pages/AnalyticsManager';
import { TrendingUp } from 'lucide-react';

function Layout() {
  const [status, setStatus] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(err => console.error(err));
  }, []);

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-3 flex justify-between items-center fixed top-0 w-full z-20 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg flex items-center justify-center shadow-inner">
            <Bot className="text-white w-4 h-4" />
          </div>
          <h1 className="font-bold text-base tracking-tight text-slate-800">ระบบหลังบ้าน</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 border border-slate-100">
          {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-30 md:hidden" onClick={closeMenu} />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 p-6 z-40 transition-transform duration-300 md:translate-x-0 flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 mb-10 hidden md:flex">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Bot className="text-white w-6 h-6" />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-slate-800">ระบบหลังบ้าน นิดา</h1>
        </div>

        <nav className="space-y-2 flex-grow mt-12 md:mt-0">
          <SidebarItem to="/" icon={<LayoutDashboard size={18} />} label="ภาพรวมระบบ" onClick={closeMenu} />
          <SidebarItem to="/orders" icon={<ShoppingBag size={18} />} label="จัดการออเดอร์" onClick={closeMenu} />
          <SidebarItem to="/menus" icon={<Database size={18} />} label="จัดการเมนูอาหาร" onClick={closeMenu} />
          <SidebarItem to="/analytics" icon={<TrendingUp size={18} />} label="วิเคราะห์การขาย" onClick={closeMenu} />
          <div className="pt-6 mt-6 border-t border-slate-100">
            <SidebarItem to="/settings" icon={<Settings size={18} />} label="ตั้งค่าระบบ" onClick={closeMenu} />
          </div>
        </nav>

        <div className="mt-auto pt-6 hidden md:block">
          <div className="bg-slate-900 rounded-xl p-4 text-white hover:bg-slate-800 transition-colors cursor-default">
            <p className="text-xs text-slate-400 mb-1">สถานะการทำงาน</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <p className="text-sm font-medium">ระบบออนไลน์ (Online)</p>
            </div>
            {status?.ai_provider && (
              <p className="text-[10px] text-slate-500 mt-2 uppercase font-bold">
                สมองกล: {status.ai_provider}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-3 md:p-8 md:ml-64 mt-14 md:mt-0 w-full overflow-x-hidden pt-16 md:pt-8 bg-slate-50/50">
        <Outlet />
      </main>
    </div>
  );
}

function SidebarItem({ to, icon, label, onClick }: { to: string, icon: React.ReactNode, label: string, onClick?: () => void }) {
  return (
    <NavLink 
      to={to} 
      onClick={onClick}
      className={({ isActive }) => `
        flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer font-medium text-sm transition-all
        ${isActive ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm border border-indigo-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent'}
      `}
    >
      {icon}
      {label}
    </NavLink>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardHome />} />
          <Route path="orders" element={<OrdersManager />} />
          <Route path="menus" element={<MenuManager />} />
          <Route path="analytics" element={<AnalyticsManager />} />
          <Route path="settings" element={<SettingsManager />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
