import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { buildInviteHtml } from '@/lib/email/buildInviteHtml';

export async function POST(req: NextRequest) {
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

    const {
      to,
      subject,
      body,
      firstName,
      dealId,
    } = await req.json();
        
    

    const htmlBody =
        buildInviteHtml(
            body,
            {
            firstName,
            dealUrl:
                `https://portal.upperlineco.com/deals/${dealId}`,
            }
        );

    console.log(
        '[HTML BODY]',
        htmlBody   
    );

    console.log(
        '[GRAPH PAYLOAD]',
        JSON.stringify({
            subject,
            body: {
            contentType: 'HTML',
            content: htmlBody,
            },
            toRecipients: [
            {
                emailAddress: {
                address: to,
                },
            },
            ],
        })
    );

    if (!to) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing recipient email',
        },
        { status: 400 }
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
          subject,
        body: {
            contentType: 'HTML',
            content: htmlBody,
        },
          toRecipients: [
            {
              emailAddress: {
                address: to,
              },
            },
          ],
        }),
      }
    );

    const graphJson = await graphRes.json();

    if (!graphRes.ok) {
        console.error(
            '[GRAPH CREATE DRAFT FAILED]',
            graphJson
        );

        return NextResponse.json(
            {
            ok: false,
            error: JSON.stringify(
                graphJson,
                null,
                2
            ),
            },
            { status: 500 }
        );
        }

    return NextResponse.json({
      ok: true,
      draftId: graphJson?.id ?? null,
      webLink: graphJson?.webLink ?? null,
      graphJson,
    });

  } catch (e) {
    console.error(
      '[OUTLOOK CREATE DRAFT ERROR]',
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