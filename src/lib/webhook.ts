import * as line from '@line/bot-sdk';
import { handleTextMessage, handleSlipImage, handlePostback } from './handlers';

export async function handleEvent(event: any) {
  console.log(`[Event Handler] Type: ${event.type}`);

  if (event.type === 'message' && event.message.type === 'text') {
    return handleTextMessage(event.source.userId || '', event.message.text, event.replyToken);
  }

  if (event.type === 'message' && event.message.type === 'image') {
    return handleSlipImage(event.source.userId || '', event.message.id, event.replyToken);
  }

  if (event.type === 'postback') {
    return handlePostback(event.source.userId || '', event.postback.data, event.replyToken);
  }

  console.log(`[Event Handler] Unhandled event type: ${event.type}`);
  return null;
}
