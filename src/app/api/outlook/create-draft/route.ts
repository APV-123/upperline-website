import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    return NextResponse.json({
      ok: true,
      hasToken: !!token,
      hasAccessToken:
        !!(token as { accessToken?: string })?.accessToken,

      keys: token
        ? Object.keys(token)
        : [],

      email:
        typeof token?.email === 'string'
          ? token.email
          : null,
    });
  } catch (e) {
    console.error(
      '[OUTLOOK TOKEN ERROR]',
      e
    );

    return NextResponse.json(
      {
        ok: false,
        error: 'Token lookup failed',
      },
      { status: 500 }
    );
  }
}