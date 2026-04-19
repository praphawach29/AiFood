import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const categories = ["เมนูข้าว", "เมนูเส้น", "อาหารทานเล่น", "เครื่องดื่ม"];

const categoryRules: Record<string, string[]> = {
  "เมนูข้าว": ["กะเพรา", "ข้าว", "ผัด", "กระเทียม", "คั่ว"],
  "เมนูเส้น": ["ก๋วยเตี๋ยว", "เส้น", "หมี่", "วุ้นเส้น", "สุกี้", "สปาเก็ตตี้", "พาสต้า", "ราดหน้า", "ผัดซีอิ๊ว"],
  "อาหารทานเล่น": ["ทอด", "ลวก", "นึ่ง", "ยำ", "สลัด", "ไข่เจียว", "ปูอัด", "ไส้กรอก", "ลูกชิ้น"],
  "เครื่องดื่ม": ["น้ำ", "โซดา", "กาแฟ", "ชา", "นม", "โอเลี้ยง"]
};

async function categorizeMenus() {
  console.log('Fetching menus...');
  const { data: menus, error } = await supabase.from('menus').select('*');
  
  if (error) {
    console.error('Error fetching menus:', error);
    return;
  }

  console.log(`Found ${menus.length} menus. Categorizing...`);

  for (const menu of menus) {
    let assignedTags: string[] = menu.tags || [];
    
    // Auto categorize based on name if no tags exist or if we want to enrich
    for (const [category, keywords] of Object.entries(categoryRules)) {
      if (keywords.some(k => menu.name.includes(k))) {
        if (!assignedTags.includes(category)) {
          assignedTags.push(category);
        }
      }
    }

    if (JSON.stringify(assignedTags) !== JSON.stringify(menu.tags)) {
      console.log(`Updating ${menu.name}: ${assignedTags.join(', ')}`);
      await supabase.from('menus').update({ tags: assignedTags }).eq('id', menu.id);
    }
  }

  console.log('Categorization complete.');
}

categorizeMenus();
