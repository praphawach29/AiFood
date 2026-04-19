import React, { useState, useEffect, useRef } from 'react';
import { Database, Image as ImageIcon, Link as LinkIcon, UploadCloud, X } from 'lucide-react';

export default function MenuManager() {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingImage, setEditingImage] = useState<any | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMenus = async () => {
    try {
      const res = await fetch('/api/menus');
      const data = await res.json();
      setMenus(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const toggleStatus = async (id: number, currentAvailable: boolean) => {
    setMenus(prev => prev.map(m => m.id === id ? { ...m, available: !currentAvailable } : m));
    await fetch(`/api/menus/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: !currentAvailable })
    });
    fetchMenus();
  };

  const saveImageUrl = async () => {
    if (!editingImage) return;
    setUploading(true);
    try {
      await fetch(`/api/menus/${editingImage.id}/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrlInput })
      });
      setEditingImage(null);
      setImageUrlInput('');
      fetchMenus();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const uploadLocalImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingImage || !e.target.files?.[0]) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('image', e.target.files[0]);

    try {
      await fetch(`/api/menus/${editingImage.id}/upload`, {
        method: 'POST',
        body: formData
      });
      setEditingImage(null);
      fetchMenus();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  if (loading && menus.length === 0) return <div className="p-8 text-slate-500 text-sm">กำลังโหลดข้อมูลเมนู...</div>;

  return (
    <div className="w-full relative">
      <header className="mb-5 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800">จัดการเมนูอาหาร (Menus)</h2>
        <p className="text-[11px] md:text-sm text-slate-500 mt-0.5">ตั้งค่ารูปภาพ และเปิด-ปิดการแสดงผลของเมนู</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5 w-full">
        {menus.map(m => (
          <div key={m.id} className={`bg-white rounded-xl md:rounded-2xl p-3 md:p-5 border flex flex-col justify-between ${m.available ? 'border-slate-200' : 'border-rose-200 bg-rose-50/40'}`}>
            <div>
              {m.image_url && (
                <div className="w-full h-24 md:h-32 rounded-lg mb-3 md:mb-4 bg-slate-100 overflow-hidden relative group">
                  <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => { setEditingImage(m); setImageUrlInput(m.image_url || ''); }}>
                    <button className="bg-white/90 text-slate-800 px-2 py-1 md:px-3 md:py-1.5 rounded-md text-[10px] md:text-xs font-bold flex items-center gap-1.5 shadow-sm transform scale-95 group-hover:scale-100 transition-transform">
                      <ImageIcon size={12} /> เปลี่ยนรูป
                    </button>
                  </div>
                </div>
              )}

              {!m.image_url && (
                <div className="w-full h-24 md:h-32 rounded-lg mb-3 md:mb-4 bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center flex-col gap-1.5 hover:bg-slate-100 transition-colors cursor-pointer group" onClick={() => { setEditingImage(m); setImageUrlInput(''); }}>
                  <ImageIcon size={20} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
                  <span className="text-[10px] md:text-xs font-medium text-slate-500 group-hover:text-indigo-500">เพิ่มรูปภาพ</span>
                </div>
              )}

              <div className="mb-2 md:mb-3">
                <h3 className="font-bold text-sm md:text-base text-slate-800 leading-tight line-clamp-1">{m.name}</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="text-slate-500 text-[10px] md:text-xs">{m.id} • ฿</p>
                  <input 
                    type="number" 
                    value={m.price}
                    onChange={async (e) => {
                      const newPrice = Number(e.target.value);
                      setMenus(prev => prev.map(menu => menu.id === m.id ? { ...menu, price: newPrice } : menu));
                      await fetch(`/api/menus/${m.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ price: newPrice })
                      });
                    }}
                    className="w-14 text-[10px] md:text-xs border border-slate-200 rounded px-1 py-0.5 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1 md:gap-1.5 mb-3 md:mb-4">
                <span className="bg-slate-100 text-slate-600 px-1.5 md:px-2 py-0.5 rounded text-[9px] md:text-[10px] font-semibold">🌶️ {m.spicy_level}</span>
                {m.is_vegan && <span className="bg-emerald-100 text-emerald-700 px-1.5 md:px-2 py-0.5 rounded text-[9px] md:text-[10px] font-semibold">เจ</span>}
                <span className="bg-orange-100 text-orange-700 px-1.5 md:px-2 py-0.5 rounded text-[9px] md:text-[10px] font-semibold">{m.calories}kcal</span>
              </div>
            </div>
            
            <button 
              onClick={() => toggleStatus(m.id, m.available)}
              className={`w-full px-2 py-1.5 md:py-2 rounded-lg text-[11px] md:text-sm font-bold transition-all border ${m.available ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-sm' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'}`}
            >
              {m.available ? '● พร้อมขาย' : '○ ของหมด (ปิด)'}
            </button>
          </div>
        ))}
        {menus.length === 0 && (
          <div className="col-span-full p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl text-sm mt-4">
            ยังไม่มีข้อมูลเมนูในฐานข้อมูล (Supabase)
          </div>
        )}
      </div>

      {/* Image Upload Modal */}
      {editingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditingImage(null)}></div>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md relative z-10 overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">จัดการรูปภาพ : {editingImage.name}</h3>
              <button onClick={() => setEditingImage(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <UploadCloud size={16} className="text-indigo-500" />
                  อัปโหลดรูปจากเครื่อง (Upload from Device)
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="bg-indigo-50 text-indigo-600 p-3 rounded-full">
                      <ImageIcon size={24} />
                    </div>
                    <span className="text-sm text-slate-600 font-medium">กดเพื่อเลือกไฟล์รูปภาพ</span>
                    <span className="text-[10px] text-slate-400">* ระบบจะนำไปฝากไว้บน Supabase Storage</span>
                  </div>
                  <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={uploadLocalImage} />
                </div>
              </div>

              <div className="relative mb-6 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-400 font-medium">หรือ (OR)</span></div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <LinkIcon size={16} className="text-emerald-500" />
                  วางลิงก์รูปภาพ (Paste Image URL)
                </label>
                <div className="flex gap-2">
                  <input 
                    type="url" 
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                  <button onClick={saveImageUrl} disabled={uploading || !imageUrlInput} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50">
                    {uploading ? 'รอสักครู่...' : 'บันทึก'}
                  </button>
                </div>
              </div>
            </div>
            
            {uploading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-20">
                <div className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium animate-pulse shadow-lg">
                  กำลังอัปโหลด...
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
