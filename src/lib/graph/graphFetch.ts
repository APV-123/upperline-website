import { getGraphAppToken } from "./getGraphAppToken";

export async function graphFetch(
    url: string,
    init?: RequestInit
) {
    const token =
        await getGraphAppToken();

    const res = await fetch(
        `https://graph.microsoft.com/v1.0${url}`,
        {
            ...init,
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type":
                    "application/json",
                ...(init?.headers ?? {}),
            },
            cache: "no-store",
        }
    );

    if (!res.ok) {
        throw new Error(
            `Graph ${res.status}: ${await res.text()}`
        );
    }

    return res.json();
}