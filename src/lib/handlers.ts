import { lineClient, supabase, lineBlobClient } from './clients';
import { getAIRecommendation } from './ai';
import * as flex from './flex';

const GREETINGS = ['สวัสดี', 'เริ่ม', 'hello', 'hi', 'เมนู', 'menu', '/start'];

// --- Message Handlers ---
export async function handleTextMessage(userId: string, text: string, replyToken: string) {
  const normalized = text.trim().toLowerCase();
  console.log(`[Text Handler] User: ${userId}, Text: ${text}`);

  if (GREETINGS.some(g => normalized.includes(g))) {
    return lineClient.replyMessage({
      replyToken,
      messages: [flex.buildWelcomeMessage()]
    });
  }

  if (normalized.includes('ตะกร้า') || normalized.includes('cart')) {
    return showCart(userId, replyToken);
  }

  // AI Recommendation
  try {
    // 1. Show thinking indicator (Loading Animation)
    // chat_id can be userId
    try {
      await lineClient.showLoadingAnimation({
        chatId: userId,
        loadingSeconds: 20 // Show for up to 20s or until a message is sent
      });
    } catch (e) {
      console.warn('Failed to show loading animation:', e);
    }

    const { data: menus, error: menuErr } = await supabase.from('menus').select('*').eq('available', true);
    if (menuErr) throw new Error(`DB Error: ${menuErr.message}`);
    if (!menus) throw new Error('No menus found');

    const menuList = menus.map(m =>
      `ID:${m.id} | ${m.name} | ราคา ฿${m.price} | ${m.calories}kcal | เผ็ด:${m.spicy_level}/3 | เจ:${m.is_vegan} | tags:${m.tags?.join(',') || ''}`
    ).join('\n');

    const aiResult = await getAIRecommendation(text, menuList);
    
    const recommended = menus.filter(m => (aiResult.menu_ids || []).includes(m.id));
    
    // Improved formatting with more line breaks
    let textReply = `✨ ${aiResult.intro}`;
    
    if (aiResult.reason && aiResult.reason.trim() !== '') {
      textReply += `\n\n💡 ${aiResult.reason.replace(/\n/g, '\n\n')}`; // Double line breaks for readability
    }
    
    if (aiResult.tips && aiResult.tips.trim() !== '') {
      textReply += `\n\n🍃 ${aiResult.tips}`;
    }

    const messages: any[] = [
      {
        type: 'text',
        text: textReply.trim(),
      }
    ];

    if (recommended.length > 0) {
      messages.push(flex.buildMenuCarousel(recommended, 'เมนูยอดฮิตที่คุณอาจจะชอบค่ะ'));
    }

    // 2. Reply ONLY ONCE at the end of process
    return lineClient.replyMessage({ replyToken, messages });
  } catch (err: any) {
    console.error('AI Flow Error Detailed:', err);
    return lineClient.replyMessage({
      replyToken,
      messages: [{ type: 'text', text: `ขออภัยค่ะ ระบบแนะนำขัดข้องชั่วคราว\n(สาเหตุ: ${err?.message || 'Unknown'})` }]
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

async function addToCart(userId: string, menuId: string, qty: number, replyToken: string) {
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

  // Get a quick drink/upsell suggestion from AI
  const menuList = menus.map(m => `ID:${m.id} | ${m.name} | Tags:${m.tags?.join(',') || ''}`).join('\n');
  const aiResult = await getAIRecommendation(`ลูกค้าเพิ่งสั่ง ${menu.name} ช่วยแนะนำเครื่องดื่มหรือของทานเล่นที่เข้ากับเมนูนี้สั้นๆ หน่อยค่ะ`, menuList);

  let upsellText = `✅ เพิ่ม "${menu.name}" ลงตะกร้าแล้วค่ะ`;
  if (aiResult.tips || aiResult.reason) {
    upsellText += `\n\n💡 ${aiResult.reason || aiResult.tips}`;
  }

  return lineClient.replyMessage({
    replyToken,
    messages: [
      flex.withQuickReplies(
        { type: 'text', text: upsellText },
        [
          { label: 'ดูตะกร้า 🛒', action: 'postback', data: 'action=view_cart' },
          { label: 'สั่งเพิ่ม 🍽️', action: 'message', data: 'เมนู' },
          { label: 'ยืนยันสั่งซื้อ ✅', action: 'postback', data: 'action=checkout' }
        ]
      )
    ]
  });
}

async function showCart(userId: string, replyToken: string) {
  const cart = userCarts[userId] || [];
  
  if (cart.length === 0) {
    return lineClient.replyMessage({
      replyToken,
      messages: [
        flex.withQuickReplies(
          { type: 'text', text: 'ตะกร้าว่างเปล่าค่ะ 🥺 ดูเมนูหน่อยไหมคะ?' },
          [{ label: 'ดูเมนู', action: 'message' }]
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
        { type: 'text', text: `🛒 รายการในตะกร้าของคุณ\n━━━━━━━━━━━━━━\n\n${itemsText}\n\n🏷️ ยอดรวมสุทธิ: ฿${total}` },
        [
          { label: 'ยืนยันสั่งซื้อ ✅', action: 'postback', data: 'action=checkout' },
          { label: 'สั่งเพิ่ม 🍽️', action: 'message', data: 'เมนู' }
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
          { label: 'โอนเงิน', action: 'postback', data: 'action=pay_transfer' },
          { label: 'เงินสด (หน้าร้าน)', action: 'postback', data: 'action=pay_cash' }
        ]
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
