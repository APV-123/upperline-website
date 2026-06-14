import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function POST(req: Request) {
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
    });
  } catch (e) {
    console.error(e);

    return NextResponse.json(
      {
        ok: false,
        error: 'Token lookup failed',
      },
      { status: 500 }
    );
  }
}