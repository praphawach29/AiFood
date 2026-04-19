import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import fs from 'fs';
import path from 'path';

export type AIChoice = 'gemini' | 'anthropic';

export interface AIRecommendation {
  intro: string;
  reason: string;
  menu_ids: string[]; // max 2
  upsell_menu_id?: string; // specific menu_id to upsell via quick reply
  tips: string | null;
}

const getGeminiClient = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const getAnthropicClient = () => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
};

export async function getAIRecommendation(userMessage: string, menuList: string): Promise<AIRecommendation> {
  let provider = (process.env.AI_PROVIDER as AIChoice) || 'gemini';
  
  let storeName = 'ร้านข้าวต้มนิดา';
  let storeDesc = '';
  let openingHours = '';
  let openingDays = '';
  let isOpen = true;
  let botPrompt = 'คุณคือพนักงานเสิร์ฟและผู้ช่วยแนะนำเมนูอาหารมืออาชีพประจำ "ร้านข้าวต้มนิดา"\\nบุคลิกของคุณ: สุภาพ เป็นมิตร กระตือรือร้น เต็มใจบริการ และมีความรู้เรื่องอาหารในร้านเป็นอย่างดี';
  let botGender = 'female';
  
  let geminiModel = 'gemini-2.5-flash';
  let anthropicModel = 'claude-3-5-sonnet-20240620';

  try {
    const SETTINGS_PATH = path.join(process.cwd(), 'settings.json');
    if (fs.existsSync(SETTINGS_PATH)) {
      const s = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
      if (s.store_name) storeName = s.store_name;
      if (s.store_description) storeDesc = s.store_description;
      if (s.opening_hours) openingHours = s.opening_hours;
      if (s.opening_days) openingDays = s.opening_days.join(', ');
      if (s.is_open !== undefined) isOpen = s.is_open;
      if (s.bot_prompt) botPrompt = s.bot_prompt;
      if (s.ai_provider) provider = s.ai_provider;
      if (s.gemini_model) geminiModel = s.gemini_model;
      if (s.anthropic_model) anthropicModel = s.anthropic_model;
      if (s.bot_gender) botGender = s.bot_gender;
    }
  } catch(e) {}
  
  const politeTail = botGender === 'female' ? "ค่ะ" : botGender === 'male' ? "ครับ" : "จ้า";
  const femaleParticles = ["นะคะ", "ค่ะ", "คะ"];
  const maleParticles = ["ครับ", "ฮะ"];
  
  const forbiddenParticles = botGender === 'female' ? maleParticles : botGender === 'male' ? femaleParticles : [];

  const storeInfoText = `
ข้อมูลร้านทำแหน่งของคุณ:
- ชื่อร้าน: ${storeName}
- คำอธิบายร้าน: ${storeDesc}
- วันเวลาทำการ: ${openingDays} (${openingHours})
- สถานะร้านตอนนี้: ${isOpen ? 'เปิดให้บริการปกติ' : 'ปิดให้บริการ مؤقتاً (โปรดแจ้งลูกค้าด้วยความสุภาพ)'}
  `.trim();

  const systemPrompt = `คุณคือ "พนักงานต้อนรับผู้เชี่ยวชาญ" ของร้าน ${storeName} ที่มีหัวใจบริการเต็มร้อย
บุคลิกภาพ: ${botPrompt}
เพศ: ${botGender === 'female' ? 'ผู้หญิง (ค่ะ)' : botGender === 'male' ? 'ผู้ชาย (ครับ)' : 'เป็นกันเอง'}
หางเสียงหลัก: "${politeTail}"

${storeInfoText}

ศิลปะการบริการของคุณ:
1. **บริบทและเวลาจริง:** (ขณะนี้เวลา ${new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })}) ปรับการสนทนาตามเวลา เช่น เช้าทักทายสดใส, ดึกเสนอเมนูเบาท้อง หรือถ้าลูกค้าบ่นหิวให้แสดงความเห็นใจ
2. **ความลื่นไหลเป็นธรรมชาติ:** 
   - ❌ ห้ามกล่าว "สวัสดี" หรือแนะนำตัวซ้ำๆ ในทุกการตอบ ให้สนทนาต่อเนื่องเหมือนคุยกับคนจริงๆ
   - ❌ ห้ามตอบเป็นหุ่นยนต์แพทเทิร์นเดิมๆ ใช้ประโยคที่หลากหลายและดูมีชีวิตชีวา
3. **การแนะนำอาหาร:**
   - 🌟 เลือกแนะนำเมนูที่เหมาะสมที่สุด "เพียง 1-2 เมนูเท่านั้น" เพื่อไม่ให้ข้อความสั้นยาวหรือรกหน้าจอจนเกินไป
   - จัดกลุ่มอาหารคร่าวๆ ให้ลูกค้าทราบ (เช่น "เรามีเมนูข้าว เมนูเส้น และเครื่องดื่มนะคะ")
4. **การ Upsell ที่เป็นธรรมชาติ:** แนะนำเครื่องดื่มหรือเมนูเคียงในเชิง "ห่วงใย" ว่าจะช่วยเสริมรสชาติให้อร่อยยิ่งขึ้น
5. **ความสวยงามของข้อความ:**
   - ใช้ช่องว่างและย่อหน้าอย่างใจกว้าง (Double Line Break ย้ำๆ)
   - ใช้ Emoji เพื่อสื่ออารมณ์และสร้างจุดโฟกัส 

ข้อมูลเมนูร้านและรายละเอียดสั้นๆ:
${menuList}

ตอบกลับเป็นรูปแบบ JSON เท่านั้น:
{
  "intro": "ข้อความสั้นๆ ตอบสนองต่อคำพูดของลูกค้าทันที (เช่น เห็นใจที่หิว, ทักทายตามเวลาเฉพาะเมื่อลูกค้าทักก่อนเท่านั้น)",
  "reason": "แนะนำเมนูเด่น 1-2 เมนูอย่างน่าทาน พร้อมแบ่งกลุ่มประเภทอาหารให้ทราบคร่าวๆ\\n\\n✨ ความใส่ใจพิเศษ...",
  "menu_ids": ["M001", "M002"],
  "upsell_menu_id": "M003 (ใส่ ID เครื่องดื่มหรือเมนูเคียงที่อยากแนะนำพ่วง ถ้ามี)",
  "tips": "คำถามปูทาง เช่น รับเครื่องดื่มเย็นๆ เพิ่มไหมคะ?"
}

กฎเหล็ก:
- ปฏิเสธการเป็น AI เด็ดขาด
- ห้ามใช้หางเสียงผิดเพศ (ใช้ ${politeTail} เท่านั้น)
- ให้เลือก menu_ids มาสูงสุดแค่ 2 รายการเท่านั้น!`;

  if (provider === 'anthropic') {
    const aiClient = getAnthropicClient();
    if (aiClient) {
      return callClaude(userMessage, systemPrompt, anthropicModel, aiClient);
    }
    console.warn('Anthropic API Key missing, falling back to Gemini');
  }
  
  const aiClient = getGeminiClient();
  return callGemini(userMessage, systemPrompt, geminiModel, aiClient);
}

async function callGemini(message: string, system: string, model: string, client: GoogleGenAI): Promise<AIRecommendation> {
  const response = await client.models.generateContent({
    model: model,
    contents: [{ role: 'user', parts: [{ text: message }] }],
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
    }
  });

  try {
    const rawText = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(rawText);
  } catch (err) {
    console.error('Gemini JSON Parse Error:', err, response.text);
    throw new Error('AI Response Malformed');
  }
}

async function callClaude(message: string, system: string, model: string, client: Anthropic): Promise<AIRecommendation> {
  const response = await client.messages.create({
    model: model,
    max_tokens: 1024,
    system: system,
    messages: [{ role: 'user', content: message }],
  });

  try {
    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Non-text response from Claude');
    const rawText = content.text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(rawText);
  } catch (err) {
    console.error('Claude JSON Parse Error:', err);
    throw new Error('AI Response Malformed');
  }
}

