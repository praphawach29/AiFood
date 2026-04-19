export function buildWelcomeMessage() {
  const message = {
    type: 'flex' as const,
    altText: 'ยินดีต้อนรับสู่ร้านข้าวต้มนิดา',
    contents: {
      type: 'bubble' as const,
      hero: {
        type: 'image' as const,
        url: 'https://picsum.photos/seed/food/800/400',
        size: 'full' as const,
        aspectRatio: '20:13',
        aspectMode: 'cover' as const
      },
      body: {
        type: 'box' as const,
        layout: 'vertical' as const,
        contents: [
          { type: 'text' as const, text: 'ร้านข้าวต้มนิดา', weight: 'bold' as const, size: 'xl' as const },
          { type: 'text' as const, text: 'อาหารอร่อย สดใหม่ AI ช่วยแนะนำ!', size: 'sm' as const, color: '#aaaaaa' }
        ]
      },
      footer: {
        type: 'box' as const,
        layout: 'vertical' as const,
        spacing: 'sm' as const,
        contents: [
          {
            type: 'button' as const,
            style: 'primary' as const,
            height: 'sm' as const,
            action: { type: 'message' as const, label: 'ดูเมนูแนะนำ', text: 'แนะนำอาหารหน่อย' }
          },
          {
            type: 'button' as const,
            style: 'secondary' as const,
            height: 'sm' as const,
            action: { type: 'postback' as const, label: '🛒 ตะกร้าของฉัน', data: 'action=view_cart' }
          }
        ]
      }
    }
  };
  return message;
}

export function buildMenuCarousel(menus: any[], altText: string) {
  const message = {
    type: 'flex' as const,
    altText: altText,
    contents: {
      type: 'carousel' as const,
      contents: menus.map(menu => ({
        type: 'bubble' as const,
        size: 'micro' as const,
        hero: {
          type: 'image' as const,
          url: menu.image_url || `https://picsum.photos/seed/menu${menu.id}/400/400`,
          size: 'full' as const,
          aspectMode: 'cover' as const
        },
        body: {
          type: 'box' as const,
          layout: 'vertical' as const,
          contents: [
            { type: 'text' as const, text: menu.name, weight: 'bold' as const, size: 'sm' as const, wrap: true },
            { type: 'text' as const, text: `฿${menu.price}`, size: 'xs' as const, color: '#666666' }
          ]
        },
        footer: {
          type: 'box' as const,
          layout: 'vertical' as const,
          contents: [
            {
              type: 'button' as const,
              style: 'link' as const,
              height: 'sm' as const,
              action: { type: 'postback' as const, label: 'ใส่ตะกร้า', data: `action=add_to_cart&menu_id=${menu.id}&qty=1` }
            }
          ]
        }
      }))
    }
  };
  return message;
}

export function buildOrderStatusCard(orderId: string, status: string, total: number) {
  const statusLabels: Record<string, string> = {
    paid: 'เตรียมอาหาร',
    pending_payment: 'รอการชำระเงิน',
    pending_kitchen: 'กำลังทำอาหาร',
    completed: 'เสร็จสิ้นเรียบร้อย'
  };

  const message = {
    type: 'flex' as const,
    altText: 'สถานะออเดอร์',
    contents: {
      type: 'bubble' as const,
      body: {
        type: 'box' as const,
        layout: 'vertical' as const,
        contents: [
          { type: 'text' as const, text: 'อัพเดทสถานะออเดอร์', weight: 'bold' as const, color: '#1DB446', size: 'sm' as const },
          { type: 'text' as const, text: `#${orderId}`, weight: 'bold' as const, size: 'xxl' as const, margin: 'md' as const },
          {
            type: 'box' as const,
            layout: 'vertical' as const,
            margin: 'lg' as const,
            spacing: 'sm' as const,
            contents: [
              {
                type: 'box' as const,
                layout: 'baseline' as const,
                spacing: 'sm' as const,
                contents: [
                  { type: 'text' as const, text: 'ยอดยืนยัน', color: '#aaaaaa', size: 'sm' as const, flex: 1 },
                  { type: 'text' as const, text: `฿${total}`, wrap: true, color: '#666666', size: 'sm' as const, flex: 5 }
                ]
              },
              {
                type: 'box' as const,
                layout: 'baseline' as const,
                spacing: 'sm' as const,
                contents: [
                  { type: 'text' as const, text: 'สถานะ', color: '#aaaaaa', size: 'sm' as const, flex: 1 },
                  { type: 'text' as const, text: statusLabels[status] || status, wrap: true, color: '#666666', size: 'sm' as const, flex: 5 }
                ]
              }
            ]
          }
        ]
      }
    }
  };
  return message;
}

export function withQuickReplies(message: any, items: { label: string, action: 'message' | 'postback', data?: string }[]) {
  const quickReplyItems = items.map(item => ({
    type: 'action',
    action: item.action === 'message' 
      ? { type: 'message', label: item.label, text: item.data || item.label }
      : { type: 'postback', label: item.label, data: item.data || `action=${item.label}` }
  }));

  return {
    ...message,
    quickReply: { items: quickReplyItems }
  };
}
