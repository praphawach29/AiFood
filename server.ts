import express from 'express';
import { createServer as createViteServer } from 'vite';
import * as line from '@line/bot-sdk';
import path from 'path';
import dotenv from 'dotenv';
import multer from 'multer';
import { handleEvent } from './src/lib/webhook';
import { supabase } from './src/lib/clients';

dotenv.config();

const app = express();
const PORT = 3000;
const upload = multer({ storage: multer.memoryStorage() });

// LINE Config
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

// Webhook route - MUST be before any body-parser middleware if using line.middleware
// Note: line.middleware handles the validation and automatic parsing of the body
app.post('/webhook', line.middleware(lineConfig), async (req, res) => {
  console.log('--- Incoming Webhook Event ---');
  try {
    const events: any[] = req.body.events;
    
    // Process all events in parallel
    const results = await Promise.all(
      events.map(event => {
        console.log(`Processing event: ${event.type} from ${event.source.userId}`);
        return handleEvent(event);
      })
    );

    res.json(results);
  } catch (err) {
    console.error('Webhook Error:', err);
    res.status(500).end();
  }
});

// JSON middleware for other API routes
app.use(express.json());

// --- Global Settings ---
import fs from 'fs';
const SETTINGS_PATH = path.join(process.cwd(), 'settings.json');

function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const data = fs.readFileSync(SETTINGS_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read settings', e);
  }
  return { 
    ai_provider: process.env.AI_PROVIDER || 'gemini',
    gemini_model: 'gemini-2.5-flash',
    anthropic_model: 'claude-3-5-sonnet-20240620',
    store_name: 'ร้านข้าวต้มนิดา',
    store_description: 'ร้านอาหารตามสั่งและก๋วยเตี๋ยวรสเด็ด',
    is_open: true,
    opening_days: ['mon','tue','wed','thu','fri','sat','sun'],
    opening_hours: '08:00 - 22:00',
    promptpay_number: '',
    promptpay_name: '',
    bot_gender: 'female',
    bot_prompt: 'คุณคือพนักงานร้านอาหารมืออาชีพ (ไม่ใช่ AI และห้ามแทนตัวเองว่า AI) หน้าที่: 1.ให้บริการสุภาพเหมือนมนุษย์แท้ๆ 2.ตอบคำถามเรื่องวัตถุดิบและส่วนผสมโดยอิงจากข้อมูลเมนูของร้าน 3.หากลูกค้าตามอาหารหรือสอบถามออเดอร์ให้แจ้งอย่างเข้าใจว่าจะรับเรื่องเช็คกับทางครัวให้',
    available_categories: ['เมนูข้าว', 'เมนูเส้น', 'อาหารทานเล่น', 'เครื่องดื่ม']
  };
}

let currentAiProvider = getSettings().ai_provider;
process.env.AI_PROVIDER = currentAiProvider;

// --- API routes for Dashboard ---

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    ai_provider: currentAiProvider
  });
});

app.get('/api/settings', (req, res) => {
  res.json(getSettings());
});

app.post('/api/settings', (req, res) => {
  const newSettings = req.body;
  const currentSettings = getSettings();
  const mergedSettings = { ...currentSettings, ...newSettings };
  
  if (mergedSettings.ai_provider === 'gemini' || mergedSettings.ai_provider === 'anthropic') {
    currentAiProvider = mergedSettings.ai_provider;
    process.env.AI_PROVIDER = currentAiProvider; // for ai.ts to pick up
  }

  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(mergedSettings, null, 2), 'utf-8');
    res.json({ success: true, settings: mergedSettings });
  } catch (e: any) {
    console.error('Failed to save settings', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/menus', async (req, res) => {
  const { data, error } = await supabase.from('menus').select('*').order('id', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/menus/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const { available } = req.body;
  const { data, error } = await supabase.from('menus').update({ available }).eq('id', id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, data });
});

app.post('/api/menus/:id/image', async (req, res) => {
  const { id } = req.params;
  const { image_url } = req.body;
  const { data, error } = await supabase.from('menus').update({ image_url }).eq('id', id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, image_url: data?.[0]?.image_url });
});

app.post('/api/menus/:id/upload', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find(b => b.name === 'menu-images')) {
      await supabase.storage.createBucket('menu-images', { public: true });
    }

    const fileExt = file.originalname.split('.').pop();
    const fileName = `menu-${id}-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('menu-images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage.from('menu-images').getPublicUrl(fileName);
    const imageUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase.from('menus').update({ image_url: imageUrl }).eq('id', id);
    if (updateError) throw updateError;

    res.json({ success: true, image_url: imageUrl });
  } catch (err: any) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/menus/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const { data, error } = await supabase.from('menus').update(updates).eq('id', id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, data: data?.[0] });
});

app.post('/api/categories/rename', async (req, res) => {
  const { oldName, newName } = req.body;
  
  // Update in settings
  const s = getSettings();
  let cats = s.available_categories || [];
  if (cats.includes(oldName)) {
    cats = cats.map(c => c === oldName ? newName : c);
    s.available_categories = cats;
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2), 'utf-8');
  }

  // Update in menus DB
  const { data: menus } = await supabase.from('menus').select('id, tags').contains('tags', [oldName]);
  if (menus) {
    for (let m of menus) {
      let tags = m.tags || [];
      tags = tags.map((t: string) => t === oldName ? newName : t);
      await supabase.from('menus').update({ tags }).eq('id', m.id);
    }
  }

  res.json({ success: true, available_categories: cats });
});

app.post('/api/categories/delete', async (req, res) => {
  const { categoryName } = req.body;
  
  // Update in settings
  const s = getSettings();
  let cats = s.available_categories || [];
  cats = cats.filter(c => c !== categoryName);
  s.available_categories = cats;
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2), 'utf-8');

  // Update in menus DB
  const { data: menus } = await supabase.from('menus').select('id, tags').contains('tags', [categoryName]);
  if (menus) {
    for (let m of menus) {
      let tags = m.tags || [];
      tags = tags.filter((t: string) => t !== categoryName);
      await supabase.from('menus').update({ tags }).eq('id', m.id);
    }
  }

  res.json({ success: true, available_categories: cats });
});

app.get('/api/orders', async (req, res) => {
  const { data, error } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(50);
  if (error) {
    if (error.code === 'PGRST200') { // relation doesn't exist? fallback
      const { data: fallbackOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50);
      return res.json(fallbackOrders || []);
    }
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

app.get('/api/analytics', async (req, res) => {
  try {
    // 1. Fetch Orders (Past 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, order_items(menu_name,quantity,unit_price,subtotal)')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .neq('status', 'cancelled');

    if (error) {
      if (error.code === 'PGRST200') {
        // order_items doesn't exist, fetch just orders
        const { data: fallbackOrders, error: fallbackError } = await supabase
          .from('orders')
          .select('*')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .neq('status', 'cancelled');
        if (fallbackError) throw fallbackError;
        return processAnalytics(fallbackOrders || [], []);
      }
      throw error;
    }
    
    // Extract items
    const allItems = (orders || []).flatMap((o: any) => o.order_items || []);
    processAnalytics(orders || [], allItems);

    function processAnalytics(validOrders: any[], items: any[]) {
      const revenueByDate: Record<string, number> = {};
      const salesByItem: Record<string, number> = {};
      const qtyByItem: Record<string, number> = {};
      let totalRevenue = 0;
      
      validOrders.forEach(o => {
        if (o.status !== 'pending_payment') {
          const date = new Date(o.created_at).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
          const amount = Number(o.total_amount || 0);
          revenueByDate[date] = (revenueByDate[date] || 0) + amount;
          totalRevenue += amount;
        }
      });

      items.forEach(i => {
        if (i && i.menu_name) {
          salesByItem[i.menu_name] = (salesByItem[i.menu_name] || 0) + Number(i.subtotal || 0);
          qtyByItem[i.menu_name] = (qtyByItem[i.menu_name] || 0) + Number(i.quantity || 0);
        }
      });

      // Format for charts
      const trendData = Object.entries(revenueByDate).map(([date, revenue]) => ({ date, revenue }));
      // Sort by date roughly
      
      // Top items
      const topItems = Object.entries(qtyByItem)
        .map(([name, quantity]) => ({ name, quantity, revenue: salesByItem[name] }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      res.json({
        totalOrders: validOrders.length,
        totalRevenue,
        trendData,
        topItems
      });
    }

  } catch (err: any) {
    console.error('Analytics Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { data, error } = await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, data });
});

// Vite middleware setup
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
    console.log(`📡 Webhook URL: ${process.env.APP_URL || 'http://localhost:3000'}/webhook`);
  });
}

setupVite().catch(console.error);
