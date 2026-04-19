import React, { useState, useEffect } from 'react';
import { Tag, Save, Plus, Edit2, Trash2 } from 'lucide-react';

export default function CategoriesManager() {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState('');

  const fetchMenus = async () => {
    try {
      const res = await fetch('/api/menus');
      const data = await res.json();
      if (Array.isArray(data)) {
        setMenus(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const saveTags = async (menuId: string) => {
    const tagsArray = editingTags.split(',').map(t => t.trim()).filter(Boolean);
    
    setMenus(prev => prev.map(m => m.id === menuId ? { ...m, tags: tagsArray } : m));
    
    await fetch(`/api/menus/${menuId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: tagsArray })
    });
    
    setEditingMenuId(null);
  };

  if (loading) return <div className="p-8 text-slate-500 text-sm">กำลังโหลดข้อมูลหมวดหมู่...</div>;

  const allTags = Array.from(new Set(menus.flatMap(m => m.tags || []))).filter(Boolean);

  return (
    <div className="w-full">
      <header className="mb-5 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800">จัดการหมวดหมู่อาหาร (Tags & Categories)</h2>
        <p className="text-[11px] md:text-sm text-slate-500 mt-0.5">แบ่งหมวดหมู่อาหาร เพื่อให้บอทแสดงผลบนเมนู Quick Reply ตอนตอบกลับลูกค้า</p>
      </header>

      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 mb-6">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Tag size={18} className="text-indigo-500"/> หมวดหมู่ที่มีในระบบตอนนี้:
        </h3>
        <div className="flex flex-wrap gap-2">
          {allTags.length > 0 ? allTags.map((tag, i) => (
            <span key={i} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100">
              {String(tag)}
            </span>
          )) : <span className="text-xs text-slate-400 italic">ยังไม่มีการตั้งหมวดหมู่</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {menus.map(m => (
          <div key={m.id} className="bg-white p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 text-sm truncate">{m.name}</h4>
            <p className="text-xs text-slate-400 mb-3">{m.id}</p>
            
            {editingMenuId === m.id ? (
              <div className="flex flex-col gap-2">
                <input 
                  type="text" 
                  value={editingTags}
                  onChange={e => setEditingTags(e.target.value)}
                  placeholder="เช่น: เมนูเส้น, แนะนำ, เผ็ด"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
                />
                <div className="flex gap-2">
                  <button onClick={() => saveTags(m.id)} className="flex-1 bg-indigo-600 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-1">
                    <Save size={14}/> บันทึก
                  </button>
                  <button onClick={() => setEditingMenuId(null)} className="px-3 bg-slate-100 text-slate-600 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-200">
                    ยกเลิก
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {m.tags && m.tags.length > 0 ? (
                    m.tags.map((t: string, i: number) => (
                      <span key={i} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] md:text-xs">
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] md:text-xs text-slate-400 italic">ไม่มีหมวดหมู่</span>
                  )}
                </div>
                <button 
                  onClick={() => { setEditingMenuId(m.id); setEditingTags((m.tags || []).join(', ')); }}
                  className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg shrink-0"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
