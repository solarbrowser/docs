import { NextResponse } from 'next/server';
import { loadConfig } from '@/lib/markdown';

export async function GET() {
  try {
    const config = await loadConfig();
    return NextResponse.json({ ok: true, data: config });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}
