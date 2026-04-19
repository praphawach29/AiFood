import { lineClient, supabase, lineBlobClient } from './clients';
import { getAIRecommendation } from './ai';
import * as flex from './flex';

const GREETINGS = ['สวัสดี', 'เริ่ม', 'hello', 'hi', 'เมนู', 'menu', '/start'];

// --- Message Handlers ---
export async function handleTextMessage(userId: string, text: string, replyToken: string) {
  const normalized = text.trim().toLowerCase();
  console.log(`[Text Handler] User: ${userId}, Text: ${text}`);

  try {
    // 1. Fetch data
    const { data: menus, error: menuErr } = await supabase.from('menus').select('*').eq('available', true);
    if (menuErr || !menus) throw new Error('No menus found');

    // Load categories
    let globalCategories: string[] = [];
    try {
      const fs = require('fs');
      const path = require('path');
      const sPath = path.join(process.cwd(), 'settings.json');
      if (fs.existsSync(sPath)) {
        const s = JSON.parse(fs.readFileSync(sPath, 'utf-8'));
        if (s.available_categories && Array.isArray(s.available_categories)) {
          globalCategories = s.available_categories;
        }
      }
    } catch(e) {}
    const categories = globalCategories.length > 0 ? globalCategories : Array.from(new Set(menus.flatMap(m => m.tags || []))).filter(Boolean) as string[];

    // Standard Quick Replies with category fallback translation
    const getStandardQuickReplies = () => {
      const tagMap: Record<string, string> = {
        'spicy': 'รสจัดจ้าน', 'no-spicy': 'ไม่เผ็ด', 'seafood': 'อาหารทะเล', 
        'vegan': 'มังสวิรัติ', 'popular': 'เมนูยอดฮิต', 'snack': 'ของทานเล่น',
        'sweet': 'ของหวาน', 'beverage': 'เครื่องดื่ม', 'filling': 'อิ่มคุ้ม'
      };

      const qr = [
        { label: '🍴 เลือกหมวดหมู่', action: 'message', data: 'หมวดหมู่' },
        { label: '📖 ดูเมนูทั้งหมด', action: 'message', data: 'เมนูทั้งหมด' },
        { label: '⭐ ช่วยเลือกหน่อย', action: 'message', data: 'แนะนำอาหารหน่อย' },
        { label: '🛒 ตะกร้าของฉัน', action: 'postback', data: 'action=view_cart' }
      ];

      // Include top 4 categories
      categories.slice(0, 4).forEach(c => {
        const thaiName = tagMap[c.toLowerCase()] || c;
        qr.push({ label: `🍴 ${thaiName}`, action: 'message', data: `หมวดหมู่ ${c}` });
      });
      return qr;
    };

    // 2. Routing Logic
    if (GREETINGS.some(g => normalized.includes(g)) && !normalized.includes('เมนูหมวด')) {
      return lineClient.replyMessage({
        replyToken,
        messages: [flex.buildWelcomeMessage()]
      });
    }

    if (normalized.includes('ตะกร้า') || normalized.includes('cart')) {
      return showCart(userId, replyToken);
    }

    // Handle "Show Menu Category"
    const catMatch = text.match(/^(หน้าเมนู|หมวดหมู่|เมนูหมวด)\s*(.*)$/);
    if (catMatch || text === 'หมวดหมู่') {
      const targetCategory = catMatch ? catMatch[2].trim() : '';
      
      if (!targetCategory || text === 'หมวดหมู่') {
        const catReplies = categories.map(c => ({ label: String(c), action: 'message', data: `หมวดหมู่ ${c}` }));
        catReplies.push({ label: '🏠 เมนูหลัก', action: 'message', data: 'สวัสดี' });
        return lineClient.replyMessage({
          replyToken,
          messages: [flex.withQuickReplies({ type: 'text', text: 'เลือกหมวดหมู่ที่สนใจได้เลยค่ะ' }, catReplies.slice(0, 13) as any)]
        });
      }

      const filtered = menus.filter(m => m.tags?.includes(targetCategory));
      if (filtered.length > 0) {
        return lineClient.replyMessage({
          replyToken,
          messages: [
            { type: 'text', text: `รายการอาหารในหมวด "${targetCategory}" ค่ะ` },
            flex.withQuickReplies(flex.buildMenuCarousel(filtered, `หมวด ${targetCategory}`), getStandardQuickReplies() as any)
          ]
        });
      }
    }

    // 3. AI Recommendation Flow
    try {
      await lineClient.showLoadingAnimation({ chatId: userId, loadingSeconds: 20 });
    } catch (e) {}

    const menuList = menus.map(m => `ID:${m.id} | ${m.name} | ราคา ฿${m.price} | tags:${m.tags?.join(',') || ''}`).join('\n');
    const aiResult = await getAIRecommendation(text, menuList);
    const recommended = menus.filter(m => (aiResult.menu_ids || []).includes(m.id));
    
    let textReply = `✨ ${aiResult.intro}`;
    if (aiResult.reason) textReply += `\n\n💡 ${aiResult.reason.replace(/\n/g, '\n\n')}`;
    if (aiResult.tips) textReply += `\n\n🍃 ${aiResult.tips}`;

    const messages: any[] = [
      { type: 'text', text: textReply.trim() }
    ];

    if (recommended.length > 0) {
      messages.push(flex.buildMenuCarousel(recommended, 'เมนูที่น่าจะถูกใจคุณลูกค้าค่ะ'));
    }

    // Attach Quick Replies to the LAST message only (otherwise LINE hides them)
    const lastIdx = messages.length - 1;
    messages[lastIdx] = flex.withQuickReplies(messages[lastIdx], getStandardQuickReplies() as any);

    return lineClient.replyMessage({ replyToken, messages });
  } catch (err: any) {
    console.error('Text Flow Error:', err);
    return lineClient.replyMessage({
      replyToken,
      messages: [{ type: 'text', text: 'ขออภายค่ะ ระบบขัดข้องชั่วคราว ลองพิมพ์ "สวัสดี" เพื่อเริ่มต้นใหม่นะคะ' }]
    });
  }
}

// --- Image Handlers ---
export async function handleSlipImage(userId: string, messageId: string, replyToken: string) {
  console.log(`[Image Handler] Received slip from ${userId}`);
  
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('line_user_id', userId)
    .eq('status', 'pending_payment')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (fetchError || !order) {
    return lineClient.replyMessage({
      replyToken,
      messages: [{ type: 'text', text: 'ไม่พบออเดอร์ที่รอชำระเงินค่ะ หากโอนแล้วรบกวนแจ้งแอดมินนะคะ' }]
    });
  }

  // Update order status
  await supabase.from('orders').update({
    status: 'paid',
    updated_at: new Date().toISOString(),
  }).eq('id', order.id);

  return lineClient.replyMessage({
    replyToken,
    messages: [
      { type: 'text', text: `🎉 ได้รับสลิปเรียบร้อยแล้วค่ะ! ออเดอร์ #${order.id} กำลังจัดเตรียมให้นะคะ` },
      flex.buildOrderStatusCard(order.id, 'paid', order.total_amount)
    ]
  });
}

// --- Postback Handlers ---
export async function handlePostback(userId: string, data: string, replyToken: string) {
  const params = Object.fromEntries(new URLSearchParams(data));
  const { action } = params;
  console.log(`[Postback Handler] Action: ${action}, Data: ${data}`);

  switch (action) {
    case 'add_to_cart':
      return addToCart(userId, params.menu_id, parseInt(params.qty || '1'), replyToken);
    case 'add_to_cart_quiet':
      return addToCart(userId, params.menu_id, parseInt(params.qty || '1'), replyToken, true);
    case 'view_cart':
      return showCart(userId, replyToken);
    case 'checkout':
      return startCheckout(userId, replyToken);
    case 'confirm_order':
      return confirmOrder(userId, replyToken);
    case 'pay_cash':
      return payCash(userId, replyToken);
    case 'pay_transfer':
      return payTransfer(userId, replyToken);
    default:
      return lineClient.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: 'ขออภัยค่ะ คำสั่งนี้กำลังอยู่ช่วงพัฒนา' }]
      });
  }
}

// --- Sub-services ---

const userCarts: Record<string, { menuId: string, name: string, price: number, qty: number }[]> = {};

async function addToCart(userId: string, menuId: string, qty: number, replyToken: string, skipUpsell: boolean = false) {
  try {
    await lineClient.showLoadingAnimation({ chatId: userId, loadingSeconds: 15 });
  } catch (e) {}

  const { data: menu, error: menuErr } = await supabase.from('menus').select('*').eq('id', menuId).single();
  const { data: menus, error: menusErr } = await supabase.from('menus').select('*').eq('available', true);
  
  if (menuErr || menusErr) {
    return lineClient.replyMessage({
      replyToken,
      messages: [{ type: 'text', text: `ขออภัย เกิดข้อผิดพลาดกับฐานข้อมูล: ${menuErr?.message || menusErr?.message}` }]
    });
  }

  if (!menu || !menus) {
    return lineClient.replyMessage({
      replyToken,
      messages: [{ type: 'text', text: 'ขออภัย ไม่พบเมนูนี้ค่ะ' }]
    });
  }

  if (!userCarts[userId]) userCarts[userId] = [];
  
  const existing = userCarts[userId].find(i => i.menuId === menuId);
  if (existing) {
    existing.qty += qty;
  } else {
    userCarts[userId].push({ menuId, name: menu.name, price: menu.price, qty });
  }

  // Generate Quick Replies
  let replies = [
    { label: '🛒 ดูตะกร้า/ชำระเงิน', action: 'postback', data: 'action=view_cart' },
    { label: '🍽️ สั่งอาหารเพิ่ม', action: 'message', data: 'หมวดหมู่' }
  ];

  let upsellText = `✅ เพิ่ม "${menu.name}" ลงตะกร้าแล้วค่ะ`;

  // Get a quick drink/upsell suggestion from AI (only if it's not already an upsell)
  if (!skipUpsell) {
    const menuList = menus.map(m => `ID:${m.id} | ${m.name} | Tags:${m.tags?.join(',') || ''}`).join('\n');
    try {
      const aiResult = await getAIRecommendation(`ลูกค้าเพิ่งสั่ง ${menu.name} ช่วยแนะนำเครื่องดื่มหรือของทานเล่นที่เข้ากับเมนูนี้ 1 เมนู พร้อมระบุ upsell_menu_id ให้ชัดเจน`, menuList);
      
      if (aiResult.tips || aiResult.reason) {
        upsellText += `\n\n💡 ${aiResult.reason || aiResult.tips}`;
      }

      if (aiResult.upsell_menu_id) {
        const idMatch = aiResult.upsell_menu_id.match(/M\d+/);
        if (idMatch) {
          const upsellMenu = menus.find(m => m.id === idMatch[0]);
          if (upsellMenu) {
            replies.unshift({ 
              label: `รับ ${upsellMenu.name.substring(0, 10)} (+฿${upsellMenu.price})`, 
              action: 'postback', 
              data: `action=add_to_cart_quiet&menu_id=${upsellMenu.id}&qty=1` 
            });
          }
        }
      }
    } catch (e) {
      console.warn('Upsell AI failed', e);
    }
  }

  return lineClient.replyMessage({
    replyToken,
    messages: [flex.withQuickReplies({ type: 'text', text: upsellText }, replies as any)]
  });
}

async function showCart(userId: string, replyToken: string) {
  const cart = userCarts[userId] || [];
  
  if (cart.length === 0) {
    return lineClient.replyMessage({
      replyToken,
      messages: [
        flex.withQuickReplies(
          { type: 'text', text: 'ตะกร้าว่างเปล่าค่ะ 🥺 ดูเมนูอาหารหน่อยไหมคะ?' },
          [
            { label: '📖 เมนูแนะนำ', action: 'message', data: 'แนะนำอาหารหน่อย' },
            { label: '🍴 เลือกหมวดหมู่', action: 'message', data: 'หมวดหมู่' }
          ] as any
        )
      ]
    });
  }

  const itemsText = cart.map((i, idx) => `▫️ ${i.name} (x${i.qty})\n   ฿${i.price * i.qty}`).join('\n\n');
  const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);

  return lineClient.replyMessage({
    replyToken,
    messages: [
      flex.withQuickReplies(
        { type: 'text', text: `📝 **สรุปรายการอาหารของคุณ**\n━━━━━━━━━━━━━━\n\n${itemsText}\n\n🏷️ ยอดรวมสุทธิ: ฿${total}\n\nรับอะไรเพิ่มอีกไหมคะ?` },
        [
          { label: 'พอก่อน ชำระเงิน ✅', action: 'postback', data: 'action=checkout' },
          { label: 'สั่งอาหารเพิ่ม 🍽️', action: 'message', data: 'หมวดหมู่' }
        ]
      )
    ]
  });
}

async function startCheckout(userId: string, replyToken: string) {
  const cart = userCarts[userId] || [];
  if (cart.length === 0) {
    return lineClient.replyMessage({
      replyToken,
      messages: [{ type: 'text', text: 'ตะกร้าว่างเปล่า สั่งอาหารก่อนนะคะ' }]
    });
  }

  return lineClient.replyMessage({
    replyToken,
    messages: [
      flex.withQuickReplies(
        { type: 'text', text: '💰 เลือกวิธีที่สะดวกเพื่อชำระเงินได้เลยค่ะ' },
        [
          { label: 'โอนผ่านบัญชี (Slip)', action: 'postback', data: 'action=pay_transfer' },
          { label: 'ชำระเงินสด', action: 'postback', data: 'action=pay_cash' },
          { label: 'สั่งเพิ่ม 🍽️', action: 'message', data: 'หมวดหมู่' }
        ] as any
      )
    ]
  });
}

async function payCash(userId: string, replyToken: string) {
  return createOrder(userId, replyToken, 'cash', 'pending_kitchen');
}

async function payTransfer(userId: string, replyToken: string) {
  let ppName = 'นาย ทดสอบ ระบบ';
  let ppNum = '0812345678';
  try {
    const s = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'settings.json'), 'utf-8'));
    if (s.promptpay_name) ppName = s.promptpay_name;
    if (s.promptpay_number) ppNum = s.promptpay_number;
  } catch(e) {}

  await createOrder(userId, replyToken, 'transfer', 'pending_payment', 
    `💳 รายละเอียดการโอนเงิน\n\n🏦 พร้อมเพย์: ${ppNum}\n👤 ชื่อบัญชี: ${ppName}\n\n📸 โอนแล้วอย่าลืมส่งสลิปมาให้แอดมินเช็กนะคะ!`);
}

import fs from 'fs';
import path from 'path';

async function createOrder(userId: string, replyToken: string, paymentMethod: string, status: string, customMessage?: string) {
  const cart = userCarts[userId] || [];
  if (cart.length === 0) {
    return lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text: 'เกิดข้อผิดพลาด ตะกร้าว่างเปล่า' }] });
  }

  const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const generatedId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);

  try {
    // 1. Create order (Providing id explicitly to fix null constraint issue)
    const { data: order, error: orderError } = await supabase.from('orders').insert({
      id: generatedId,
      line_user_id: userId,
      total_amount: total,
      status: status,
      payment_method: paymentMethod,
      updated_at: new Date().toISOString()
    }).select().single();

    if (orderError || !order) {
      console.error('Order Insert Error:', orderError);
      return lineClient.replyMessage({ 
        replyToken, 
        messages: [{ type: 'text', text: `ขออภัย เกิดปัญหาในการบันทึกออเดอร์\nรหัสข้อผิดพลาด: ${orderError?.code}\n${orderError?.message}` }] 
      });
    }

    // 2. Create order items
    const orderItems = cart.map(item => ({
      order_id: order.id,
      menu_id: item.menuId,
      menu_name: item.name,
      quantity: item.qty,
      unit_price: item.price,
      subtotal: item.price * item.qty
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) {
      console.error('Order Items Error:', itemsError);
    }

    // 3. Clear local cart
    delete userCarts[userId];

    // 4. Reply
    const msgText = customMessage || `✨ สั่งซื้อสำเร็จ! ออเดอร์ #${order.id} เรียบร้อยแล้วค่ะ\nเดี๋ยวทางร้านรีบจัดเตรียมอาหารให้นะคะ`;

    return lineClient.replyMessage({
      replyToken,
      messages: [{ type: 'text', text: msgText }]
    });
  } catch (err: any) {
    console.error('Create Order Exception:', err);
    return lineClient.replyMessage({ 
      replyToken, 
      messages: [{ type: 'text', text: 'ขออภัย เกิดความผิดพลาดทางเทคนิคในการสร้างออเดอร์' }] 
    });
  }
}

async function confirmOrder(userId: string, replyToken: string) {
  return startCheckout(userId, replyToken);
}
