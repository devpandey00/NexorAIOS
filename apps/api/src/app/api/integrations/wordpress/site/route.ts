import { NextResponse } from 'next/server';
import { WordPressClient } from '@/lib/integrations/wordpress';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const client = new WordPressClient();
    const posts = await client.get<unknown[]>('posts?per_page=5&context=edit');
    return NextResponse.json({ success: true, posts });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 503 },
    );
  }
}
