import { GET as verifyWebhook, POST as receiveWebhook } from '../../webhooks/whatsapp/route';

export const runtime = 'nodejs';

export const GET = verifyWebhook;
export const POST = receiveWebhook;
