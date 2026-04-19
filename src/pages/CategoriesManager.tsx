import React, { useState, useEffect } from 'react';
import { Tag, Save, Plus, Edit2, Trash2, X, Check } from 'lucide-react';

export default function CategoriesManager() {
  const [menus, setMenus] = useState<any[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Category management
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  
  // Menu tags management
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      const [resMenus, resSettings] = await Promise.all([
        fetch('/api/menus').then(res => res.json()),
        fetch('/api/settings').then(res => res.json())
      ]);
      
      let fetchedCategories: string[] = [];

      if (resSettings && resSettings.available_categories) {
        fetchedCategories = resSettings.available_categories;
      }
      
      if (Array.isArray(resMenus)) {
        setMenus(resMenus);
        // Fallback: if no available_categories in settings yet, extract from menus
        if (fetchedCategories.length === 0) {
           const extracted = Array.from(new Set(resMenus.flatMap(m => m.tags || []))).filter(Boolean) as string[];
           if (extracted.length > 0) {
              fetchedCategories = extracted;
              await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ available_categories: extracted })
              });
           }
        }
      }
      
      setAvailableCategories(fetchedCategories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addCategory = async () => {
    if (!newCategoryName.trim() || availableCategories.includes(newCategoryName.trim())) return;
    const updatedCategories = [...availableCategories, newCategoryName.trim()];
    setAvailableCategories(updatedCategories);
    setNewCategoryName('');
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available_categories: updatedCategories })
    });
  };

  const saveCategoryRename = async () => {
    if (!editingCategory || !editCategoryName.trim() || availableCategories.includes(editCategoryName.trim())) {
      setEditingCategory(null);
      return;
    }
    await fetch('/api/categories/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName: editingCategory, newName: editCategoryName.trim() })
    });
    setEditingCategory(null);
    fetchData();
  };

  const deleteCategory = async (name: string) => {
    if (!window.confirm(`ลบหมวดหมู่ "${name}" ออกจากทุกเมนู?`)) return;
    await fetch('/api/categories/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryName: name })
    });
    fetchData();
  };

  const saveMenuTags = async (menuId: string) => {
    setMenus(prev => prev.map(m => m.id === menuId ? { ...m, tags: selectedTags } : m));
    await fetch(`/api/menus/${menuId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: selectedTags })
    });
    setEditingMenuId(null);
  };

  const toggleTagForMenu = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  if (loading) return <div className="p-8 text-slate-500 text-sm">กำลังโหลดข้อมูลหมวดหมู่...</div>;

  const uncategorizedMenus = menus.filter(m => !m.tags || m.tags.length === 0);

  return (
    <div className="w-full">
      <header className="mb-5 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800">จัดการหมวดหมู่อาหาร</h2>
        <p className="text-[11px] md:text-sm text-slate-500 mt-0.5">แบ่งหมวดหมู่อาหาร และตรวจสอบรายการอาหารในแต่ละหมวดหมู่</p>
      </header>

      {/* Global Categories Manager */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 mb-6 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Tag size={18} className="text-indigo-500"/> หมวดหมู่หลักของร้าน
        </h3>
        
        <div className="flex flex-wrap gap-2 mb-5">
          {availableCategories.length > 0 ? availableCategories.map((tag, i) => (
            <div key={i} className="flex items-center bg-indigo-50 border border-indigo-100 rounded-lg overflow-hidden group">
              {editingCategory === tag ? (
                <div className="flex items-center px-1 py-1">
                  <input 
                    autoFocus
                    value={editCategoryName} 
                    onChange={e => setEditCategoryName(e.target.value)}
                    className="text-xs font-bold px-2 py-1 outline-none rounded bg-white w-24 border border-indigo-200"
                    onKeyDown={e => e.key === 'Enter' && saveCategoryRename()}
                  />
                  <button onClick={saveCategoryRename} className="p-1 px-2 text-indigo-600 hover:text-indigo-800"><Check size={14}/></button>
                  <button onClick={() => setEditingCategory(null)} className="p-1 text-slate-400 hover:text-slate-600"><X size={14}/></button>
                </div>
              ) : (
                <>
                  <span className="px-3 py-1.5 text-xs font-bold text-indigo-700">{tag}</span>
                  <div className="flex items-center bg-indigo-100/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingCategory(tag); setEditCategoryName(tag); }} className="p-1.5 text-indigo-600 hover:bg-indigo-200" title="แก้ไข">
                      <Edit2 size={12}/>
                    </button>
                    <button onClick={() => deleteCategory(tag)} className="p-1.5 text-rose-500 hover:bg-rose-100" title="ลบ">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </>
              )}
            </div>
          )) : <span className="text-xs text-slate-400 italic py-2">ยังไม่มีหมวดหมู่ กรุณาเพิ่มด้านล่าง</span>}
        </div>

        <div className="flex items-center gap-2 max-w-sm">
          <input 
            type="text" 
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            placeholder="เพิ่มหมวดหมู่ใหม่..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:outline-none focus:border-indigo-500"
          />
          <button onClick={addCategory} disabled={!newCategoryName.trim()} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed">
            <Plus size={20}/>
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {availableCategories.map(category => {
          const categoryMenus = menus.filter(m => m.tags?.includes(category));
          return (
            <section key={category} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-slate-800">{category}</h3>
                  <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{categoryMenus.length} รายการ</span>
                </div>
              </div>
              <div className="p-4">
                {categoryMenus.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {categoryMenus.map(m => (
                      <MenuSmallCard 
                        key={m.id} 
                        menu={m} 
                        isEditing={editingMenuId === m.id}
                        selectedTags={selectedTags}
                        availableCategories={availableCategories}
                        onEdit={() => { setEditingMenuId(m.id); setSelectedTags(m.tags || []); }}
                        onSave={() => saveMenuTags(m.id)}
                        onCancel={() => setEditingMenuId(null)}
                        onToggleTag={toggleTagForMenu}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic text-center py-4">ไม่มีรายการอาหารในหมวดหมู่นี้</p>
                )}
              </div>
            </section>
          );
        })}

        {uncategorizedMenus.length > 0 && (
          <section className="bg-white rounded-2xl border border-rose-100 overflow-hidden shadow-sm">
            <div className="bg-rose-50/50 px-4 py-3 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-rose-800 italic">เมนูที่ยังไม่ได้จัดหมวดหมู่</h3>
                <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{uncategorizedMenus.length} รายการ</span>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {uncategorizedMenus.map(m => (
                  <MenuSmallCard 
                    key={m.id} 
                    menu={m} 
                    isEditing={editingMenuId === m.id}
                    selectedTags={selectedTags}
                    availableCategories={availableCategories}
                    onEdit={() => { setEditingMenuId(m.id); setSelectedTags(m.tags || []); }}
                    onSave={() => saveMenuTags(m.id)}
                    onCancel={() => setEditingMenuId(null)}
                    onToggleTag={toggleTagForMenu}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function MenuSmallCard({ menu, isEditing, selectedTags, availableCategories, onEdit, onSave, onCancel, onToggleTag }: any) {
  return (
    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col h-full">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-slate-700 text-xs line-clamp-1">{menu.name}</h4>
        <span className="text-[9px] text-slate-400 font-mono">#{menu.id}</span>
      </div>

      <div className="flex-1 mb-2">
        {isEditing ? (
          <div className="bg-white p-2 rounded-lg border border-slate-200 mb-1 max-h-32 overflow-y-auto">
            <div className="flex flex-wrap gap-1">
              {availableCategories.map((cat: string) => {
                const isSel = selectedTags.includes(cat);
                return (
                  <button 
                    key={cat}
                    onClick={() => onToggleTag(cat)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-colors ${isSel ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}
                  >
                    {isSel ? '✓ ' : ''}{cat}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {menu.tags && menu.tags.length > 0 ? (
              menu.tags.map((t: string, i: number) => (
                <span key={i} className="text-[9px] bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded">
                  {t}
                </span>
              ))
            ) : (
              <span className="text-[9px] text-slate-400 italic">ไม่มีหมวดหมู่</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto">
        {isEditing ? (
          <div className="flex gap-1">
            <button onClick={onSave} className="flex-1 bg-indigo-600 text-white py-1 rounded text-[10px] font-bold hover:bg-indigo-700">บันทึก</button>
            <button onClick={onCancel} className="px-2 bg-slate-200 text-slate-600 py-1 rounded text-[10px] font-bold">X</button>
          </div>
        ) : (
          <button onClick={onEdit} className="w-full text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors py-1 bg-white border border-slate-200 rounded">
            แก้ไขหมวดหมู่
          </button>
        )}
      </div>
    </div>
  );
}
