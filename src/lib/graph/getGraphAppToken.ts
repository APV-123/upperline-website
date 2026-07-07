let cachedToken: string | null = null;
let expiresAt = 0;

type TokenResponse = {
    access_token: string;
    expires_in: number;
};

export async function getGraphAppToken() {
    if (
        cachedToken &&
        Date.now() < expiresAt
    ) {
        return cachedToken;
    }

    const tenantId =
        process.env.AZURE_AD_TENANT_ID!;

    const clientId =
        process.env.AZURE_AD_CLIENT_ID!;

    const clientSecret =
        process.env.AZURE_AD_CLIENT_SECRET!;

    const res = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: "client_credentials",
                scope:
                    "https://graph.microsoft.com/.default",
            }),
            cache: "no-store",
        }
    );

    if (!res.ok) {
        throw new Error(
            `Graph token request failed (${res.status})`
        );
    }

    const json =
        (await res.json()) as TokenResponse;

    cachedToken = json.access_token;

    expiresAt =
        Date.now() +
        (json.expires_in - 60) * 1000;

    return cachedToken;
}