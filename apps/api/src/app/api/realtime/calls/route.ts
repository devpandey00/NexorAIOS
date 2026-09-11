import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 503 });

  const form = await req.formData();
  const sdp = form.get('sdp');
  if (typeof sdp !== 'string' || !sdp.trim()) {
    return NextResponse.json({ error: 'SDP offer is required' }, { status: 400 });
  }

  const session = {
    type: 'realtime',
    model: process.env.NEXOR_REALTIME_MODEL?.trim() || 'gpt-realtime-2.1',
    output_modalities: ['audio'],
    audio: {
      input: {
        noise_reduction: { type: 'near_field' },
        turn_detection: {
          type: 'semantic_vad',
          eagerness: 'medium',
          create_response: true,
          interrupt_response: true,
        },
      },
      output: {
        voice: process.env.NEXOR_REALTIME_VOICE?.trim() || 'cedar',
        speed: 1.05,
      },
    },
    instructions: [
      'You are NEXOR, the executive AI operating system voice agent.',
      'Speak like a calm, fast, highly competent JARVIS-style executive copilot.',
      'Be concise. Lead with the result. Ask only when genuinely necessary.',
      'Never claim an action happened unless a tool result confirms it.',
      'For external-impacting actions, respect the application approval and compliance gates.',
      'Use the Nexor command tool for business operations instead of inventing state.',
      'When the user says stop, cancel, pause, or standby, stop taking actions immediately.',
    ].join(' '),
    tools: [
      {
        type: 'function',
        name: 'nexor_command',
        description: 'Execute a Nexor business command through the existing authenticated command router. Use this for CRM, leads, campaigns, analytics, automations, content, research, and other Nexor operations.',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'The exact business command to execute.' },
          },
          required: ['command'],
        },
      },
    ],
    tool_choice: 'auto',
  };

  const body = new FormData();
  body.append('sdp', sdp);
  body.append('session', JSON.stringify(session));

  const response = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body,
    cache: 'no-store',
  });

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/sdp',
      'Cache-Control': 'no-store',
    },
  });
}
