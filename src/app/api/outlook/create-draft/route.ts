import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: Request) {
  try {
    const token = await getToken({
      req: {
        headers: {
          cookie:
            req.headers.get('cookie') ?? '',
        },
      } as never,
      secret: process.env.NEXTAUTH_SECRET,
    });

    return NextResponse.json({
      ok: true,
      hasToken: !!token,
      hasAccessToken:
        !!token?.accessToken,
      email: token?.email ?? null,
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