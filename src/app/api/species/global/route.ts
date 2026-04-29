import { NextResponse } from 'next/server';
import { scrapeFishBase } from '@/lib/services/fishbase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');

  if (!search) {
    return NextResponse.json({ data: [] });
  }

  try {
    const results = await scrapeFishBase(search);
    return NextResponse.json({ data: results });
  } catch (error: any) {
    console.error('[FishBase API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
