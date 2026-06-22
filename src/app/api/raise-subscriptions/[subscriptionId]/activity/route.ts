import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/SupabaseServer';

type Params = {
  subscriptionId: string;
};

export async function GET(
  _req: Request,
  context: {
    params: Params | Promise<Params>;
  }
) {
  const { subscriptionId } =
    await context.params;

  const { data, error } =
    await supabaseServer
      .from('raise_subscription_activity')
      .select('*')
      .eq(
        'raise_subscription_id',
        subscriptionId
      )
      .order(
        'activity_at',
        { ascending: false }
      );

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    activity: data ?? [],
  });
}