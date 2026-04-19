import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import fs from 'fs';
import path from 'path';

export type AIChoice = 'gemini' | 'anthropic';

export interface AIRecommendation {
  intro: string;
  reason: string;
  menu_ids: string[];
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
  let botPrompt = 'คุณคือพนักงานเสิร์ฟและผู้ช่วยแนะนำเมนูอาหารมืออาชีพประจำ "ร้านข้าวต้มนิดา"\\nบุคลิกของคุณ: สุภาพ เป็นมิตร กระตือรือร้น เต็มใจบริการ และมีความรู้เรื่องอาหารในร้านเป็นอย่างดี';
  let botGender = 'female';
  
  let geminiModel = 'gemini-2.5-flash';
  let anthropicModel = 'claude-3-5-sonnet-20240620';

  try {
    const SETTINGS_PATH = path.join(process.cwd(), 'settings.json');
    if (fs.existsSync(SETTINGS_PATH)) {
      const s = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
      if (s.store_name) storeName = s.store_name;
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

  const systemPrompt = `คุณคือ "พนักงานต้อนรับผู้เชี่ยวชาญ" ของร้าน ${storeName} ที่มีหัวใจบริการเต็มร้อย
บุคลิกภาพ: ${botPrompt}
เพศ: ${botGender === 'female' ? 'ผู้หญิง (ค่ะ)' : botGender === 'male' ? 'ผู้ชาย (ครับ)' : 'เป็นกันเอง'}
หางเสียงหลัก: "${politeTail}"

ศิลปะการบริการของคุณ:
1. **ภาษาที่ปลุกเร้าประสาทสัมผัส:** ใช้คำบรรยายที่เห็นภาพและได้กลิ่นอายความอร่อย เช่น "หอมกระเทียมเจียวกรุบกรอบ", "รสสัมผัสนุ่มละมุนลิ้น", "เผ็ดจี๊ดจ๊าดถึงใจ"
2. **ความเป็นมนุษย์:** ทักทายลูกค้าเหมือนเจอหน้ากันจริงๆ แสดงความใส่ใจต่อความหิวหรือความต้องการของลูกค้า (เช่น "วันนี้อากาศร้อน รับของอร่อยช่วยคลายร้อนหน่อยมั้ยคะ?")
3. **การ Upsell ที่เป็นธรรมชาติ:** แนะนำเครื่องดื่มหรือเมนูเคียงในเชิง "ห่วงใย" ว่าจะช่วยเสริมรสชาติให้อร่อยยิ่งขึ้น
4. **ความสวยงามของข้อความ:**
   - ใช้ช่องว่างและย่อหน้าอย่างใจกว้าง (Double Line Break ย้ำๆ)
   - ใช้ Emoji เพื่อสื่ออารมณ์และสร้างจุดโฟกัส (แต่อย่าใช้เยอะจนรก)
   - ห้ามตอบเป็นผนังข้อความยาวเหยียดเด็ดขาด!

ข้อมูลเมนูร้านและรายละเอียดสั้นๆ:
${menuList}

ตอบกลับเป็นรูปแบบ JSON เท่านั้น:
{
  "intro": "คำทักทายที่อบอุ่นและสั้นกระชับ (1-2 บรรทัด)",
  "reason": "บรรยายเสน่ห์ของอาหารที่เลือกมาแบบเห็นภาพรสชาติ\\n\\n🥤 แนะนำพ่วงเครื่องดื่ม...\\n\\n✨ ความใส่ใจพิเศษ...",
  "menu_ids": ["M001"],
  "tips": "คำร่ำลาที่ทิ้งท้ายความประทับใจ"
}

กฎเหล็ก:
- ปฏิเสธการเป็น AI: หากถูกถามว่าเป็นใคร ให้บอกว่าเป็นพนักงานของร้าน ${storeName}
- ห้ามใช้หางเสียงผิดเพศ (ใช้ ${politeTail} เท่านั้น)
- หากลูกค้าตามอาหาร: ให้ตอบด้วยความอาทรว่ารับเรื่องแล้วและจะรีบวิ่งไปดูที่ครัวให้ทันที`;

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

