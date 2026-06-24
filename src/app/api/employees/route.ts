import { NextResponse } from 'next/server';

async function getGraphToken() {
    const tenantId =
        process.env.AZURE_AD_TENANT_ID!;

    const clientId =
        process.env.AZURE_AD_CLIENT_ID!;

    const clientSecret =
        process.env.AZURE_AD_CLIENT_SECRET!;

    const tokenRes = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
            method: 'POST',
            headers: {
                'Content-Type':
                    'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                scope:
                    'https://graph.microsoft.com/.default',
                grant_type:
                    'client_credentials',
            }),
        }
    );

    const json =
        await tokenRes.json();

    return json.access_token;
}

export async function GET() {
    try {
        const accessToken =
            await getGraphToken();

        const graphRes = await fetch(
            'https://graph.microsoft.com/v1.0/users?$select=displayName,mail,userPrincipalName',
            {
                headers: {
                    Authorization:
                        `Bearer ${accessToken}`,
                },
                cache: 'no-store',
            }
        );

        const graphJson =
            await graphRes.json();

        const directory: Record<
            string,
            {
                displayName: string;
                initials: string;
            }
        > = {};

        for (const user of graphJson.value ?? []) {
            const email =
                (
                    user.mail ??
                    user.userPrincipalName
                )?.toLowerCase();

            if (!email) continue;

            const displayName =
                user.displayName ?? email;

            const initials =
                displayName
                    .split(' ')
                    .map(
                        (part: string) =>
                            part[0]
                    )
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

            directory[email] = {
                displayName,
                initials,
            };
        }

        return NextResponse.json({
            directory,
        });
    } catch (err) {
        console.error(
            '[EMPLOYEE DIRECTORY]',
            err
        );

        return NextResponse.json(
            {
                directory: {},
            },
            { status: 500 }
        );
    }
}