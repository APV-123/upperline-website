import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { buildInviteHtml } from '@/lib/email/buildInviteHtml';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function replaceVariables(
    text: string,
    variables: Record<
        string,
        string | number | null
    >
) {
    let rendered = text;

    Object.entries(variables).forEach(
        ([key, value]) => {
            rendered = rendered.replaceAll(
                `{{ ${key} }}`,
                String(value ?? '')
            );
        }
    );

    return rendered;
}


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

    const { data: deal } =
    await supabase
        .from('deals')
        .select(`
            name,
            location,
            asset_class,
            strategy,
            thesis
        `)
        .eq('id', dealId)
        .single();
    const { data: metrics } =
    await supabase
        .from('deal_metrics')
        .select(`
            key,
            value
        `)
        .eq('deal_id', dealId); 
    
    const variables: Record<
    string,
    string | number | null
> = {
    deal_name:
        deal?.name ?? '',
    location:
        deal?.location ?? '',
    asset_class:
        deal?.asset_class ?? '',
    strategy:
        deal?.strategy ?? '',
    thesis:
        deal?.thesis ?? '',
};
    
    (metrics ?? []).forEach(
    (metric) => {
        variables[
            metric.key
        ] =
            metric.value;
    }
);

    const renderedSubject =
    replaceVariables(
        subject,
        variables
    );

    const renderedBody =
    replaceVariables(
        body,
        variables
    );

    const htmlBody =
    buildInviteHtml(
        renderedBody,
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
            subject: renderedSubject,
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
          subject: renderedSubject,
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