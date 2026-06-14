import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No token found',
        },
        { status: 401 }
      );
    }

    const accessToken = (
      token as {
        accessToken?: string;
      }
    ).accessToken;

    if (!accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No Graph access token',
        },
        { status: 401 }
      );
    }

    const graphRes = await fetch(
      'https://graph.microsoft.com/v1.0/me/messages',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: 'Upperline Graph Test',
          body: {
            contentType: 'Text',
            content:
              'This Outlook draft was created from Upperline.',
          },
          toRecipients: [
            {
              emailAddress: {
                address: 'av@upperlineco.com',
              },
            },
          ],
        }),
      }
    );

    const graphJson = await graphRes.json();

    return NextResponse.json({
      ok: graphRes.ok,
      graphJson,
    });
  } catch (e) {
    console.error(
      '[OUTLOOK DRAFT TEST ERROR]',
      e
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          e instanceof Error
            ? e.message
            : 'Unknown error',
      },
      { status: 500 }
    );
  }
}