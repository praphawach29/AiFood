import React, { useState, useEffect } from 'react';
import { Settings, Cpu, Store, CreditCard, Bot, AlertTriangle, Save, CheckCircle2 } from 'lucide-react';

export default function SettingsManager() {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => setSettings(d));
  }, []);

  const DAYS = [
    { id: 'mon', label: 'จ.' },
    { id: 'tue', label: 'อ.' },
    { id: 'wed', label: 'พ.' },
    { id: 'thu', label: 'พฤ.' },
    { id: 'fri', label: 'ศ.' },
    { id: 'sat', label: 'ส.' },
    { id: 'sun', label: 'อา.' },
  ];

  const toggleDay = (dayId: string) => {
    const current = settings.opening_days || [];
    const updated = current.includes(dayId) 
      ? current.filter((d: string) => d !== dayId)
      : [...current, dayId];
    setSettings((prev: any) => ({ ...prev, opening_days: updated }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleProviderChange = (provider: string) => {
    setSettings(prev => ({ ...prev, ai_provider: provider }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="p-8 text-slate-500 text-sm">กำลังโหลดการตั้งค่า...</div>;

  return (
    <div className="w-full pb-10">
      <header className="mb-5 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">ตั้งค่าระบบ (Settings)</h2>
          <p className="text-[11px] md:text-sm text-slate-500 mt-0.5">จัดการข้อมูลร้านค้า การชำระเงิน และสมองกล AI</p>
        </div>
        
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="flex flex-1 md:flex-none items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {saving ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : 
           saveSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'กำลังบันทึก...' : saveSuccess ? 'บันทึกสำเร็จ' : 'บันทึกการตั้งค่า'}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl w-full">
        
        {/* Store Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center gap-3">
            <Store className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-slate-800 text-sm md:text-base">ข้อมูลร้านค้า (Store Info)</h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อร้าน</label>
              <input type="text" name="store_name" value={settings.store_name} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">คำอธิบายร้าน</label>
              <textarea name="store_description" value={settings.store_description} onChange={handleChange} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">วันเปิดทำการ (Opening Days)</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(day => {
                    const isActive = (settings.opening_days || []).includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleDay(day.id)}
                        className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">เวลาทำการ</label>
                <input type="text" name="opening_hours" value={settings.opening_hours} onChange={handleChange} placeholder="เช่น 08:00 - 20:00" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <div className="relative">
                    <input type="checkbox" name="is_open" checked={settings.is_open} onChange={handleChange} className="sr-only" />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${settings.is_open ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.is_open ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                  <span className="text-sm font-bold text-slate-700">{settings.is_open ? 'เปิดรับออเดอร์' : 'ปิดร้านชั่วคราว'}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-slate-800 text-sm md:text-base">ข้อมูลการชำระเงิน (Payment)</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg mb-2">
              <p className="text-xs text-emerald-700 leading-relaxed">
                ข้อมูลนี้จะถูกส่งให้ลูกค้าพร้อมกับบิลเมื่อลูกค้ายืนยันการสั่งซื้อ แจ้งโอนเงินผ่านระบบหลังบ้านได้ทันที
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">เบอร์พร้อมเพย์ (PromptPay)</label>
              <input type="text" name="promptpay_number" value={settings.promptpay_number} onChange={handleChange} placeholder="0812345678 หรือ 0123456789012" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อบัญชีรับเงิน (Account Name)</label>
              <input type="text" name="promptpay_name" value={settings.promptpay_name} onChange={handleChange} placeholder="นาย/นางสาว ..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
            </div>
          </div>
        </div>

        {/* AI Provider Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden lg:col-span-2">
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center gap-3">
            <Cpu className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-slate-800 text-sm md:text-base">ระบบสมองกล (AI Bot Settings)</h3>
          </div>
          <div className="p-5">
            
            <div className="mb-5">
              <label className="block text-sm font-bold text-slate-700 mb-2">เพศของบอท / หางเสียง (Bot Gender)</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="bot_gender" value="female" checked={settings.bot_gender === 'female'} onChange={handleChange} className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-medium">หญิง (ค่ะ/จ๊ะ)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="bot_gender" value="male" checked={settings.bot_gender === 'male'} onChange={handleChange} className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-medium">ชาย (ครับ/ฮะ)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="bot_gender" value="neutral" checked={settings.bot_gender === 'neutral'} onChange={handleChange} className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-medium">เป็นกันเอง (ไม่มีหางเสียงทางการ)</span>
                </label>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-3">ให้ AI รับบทบาทเป็นใคร? (System Prompt)</label>
              <textarea 
                name="bot_prompt" 
                value={settings.bot_prompt} 
                onChange={handleChange} 
                rows={3} 
                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                placeholder="อธิบายบุคลิกการตอบคำถามของร้าน เช่น ให้ตอบเป็นกันเอง ชอบพูดลงท้ายด้วยจ้ะ"
              />
              <p className="text-[10px] text-slate-500 mt-1.5">เคล็ดลับ: พิมพ์อธิบายสไตล์การตอบ ท่าทางการขาย เช่น "เน้นเชียร์เมนูแพงๆ" หรือ "ทักทายลูกค้าแบบสุภาพ"</p>
            </div>

            <label className="block text-sm font-bold text-slate-700 mb-3">เลือกระบบผู้ให้บริการ (AI Provider)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <label className={`border-2 rounded-lg md:rounded-xl p-4 cursor-pointer transition-all ${settings.ai_provider === 'gemini' ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' : 'border-slate-100 hover:border-slate-300'}`}>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <input 
                    type="radio" 
                    name="ai-provider" 
                    value="gemini" 
                    checked={settings.ai_provider === 'gemini'} 
                    onChange={() => handleProviderChange('gemini')}
                    className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-bold text-slate-800 text-sm md:text-base">Google Gemini</span>
                </div>
                <p className="text-[10px] md:text-xs text-slate-500 ml-6 leading-relaxed">ตอบสนองรวดเร็ว เหมาะกับเมนูอาหารทั่วไป (Gemini Flash)</p>
              </label>

              <label className={`border-2 rounded-lg md:rounded-xl p-4 cursor-pointer transition-all ${settings.ai_provider === 'anthropic' ? 'border-amber-500 bg-amber-50/50 shadow-sm' : 'border-slate-100 hover:border-slate-300'}`}>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <input 
                    type="radio" 
                    name="ai-provider" 
                    value="anthropic" 
                    checked={settings.ai_provider === 'anthropic'} 
                    onChange={() => handleProviderChange('anthropic')}
                    className="w-3.5 h-3.5 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-bold text-slate-800 text-sm md:text-base">Anthropic Claude</span>
                </div>
                <p className="text-[10px] md:text-xs text-slate-500 ml-6 leading-relaxed">วิเคราะห์ประโยคและการให้เหตุผลมีความเป็นมนุษย์สูง (Claude Sonnet)</p>
              </label>
            </div>

            <div className="mt-5 p-4 md:p-5 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="block text-sm font-bold text-slate-700 mb-2">รุ่นของสมองกลที่เสถียร (Model Version)</label>
              {settings.ai_provider === 'gemini' ? (
                <select
                  name="gemini_model"
                  value={settings.gemini_model || 'gemini-2.5-flash'}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white shadow-sm"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (รวดเร็ว คุ้มค่าที่สุด)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (ฉลาดและดึงข้อมูลซับซ้อนได้ดี)</option>
                </select>
              ) : (
                <select
                  name="anthropic_model"
                  value={settings.anthropic_model || 'claude-3-5-sonnet-20240620'}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-white shadow-sm"
                >
                  <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet (ฉลาดมาก แนะนำ)</option>
                  <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (รวดเร็วที่สุด มั่นใจได้)</option>
                  <option value="claude-3-opus-20240229">Claude 3 Opus (ซับซ้อนและละเอียดสูงสุด)</option>
                </select>
              )}
            </div>

            {settings.ai_provider === 'anthropic' && (
              <div className="mt-4 text-[11px] md:text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100 flex gap-2 items-start">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>ระบบตรวจพบว่าคุณเลือกใช้ Anthropic อย่าลืมไปเพิ่ม <b>ANTHROPIC_API_KEY</b> ในเมนู Variables ของ Railway ก่อนเพื่อป้องกันบอทไม่ทำงานครับ</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
