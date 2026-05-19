import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type PublicDeal = {
  id: string;
  name: string;
  target_amount: number;
  raise_id: string;
  created_at: string | null;
};

export async function GET() {
  try {
    const supabase = supabaseServer;

    const { data, error } = await supabase
      .from('deals')
      .select(`
        id,
        name,
        target_amount,
        location,
        estimated_closing_date,
        overview_text,
        raise_id,
        created_at
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[PUBLIC DEALS ERROR]', error);

      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      deals: (data ?? []) as PublicDeal[],
    });

  } catch (e) {
    console.error('[PUBLIC DEALS CRASH]', e);

    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}