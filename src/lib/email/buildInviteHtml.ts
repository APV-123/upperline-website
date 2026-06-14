export function buildInviteHtml(
    body: string
) {
    return body
        .split('\n\n')
        .map(
            (p) =>
                `<p style="margin:0 0 16px 0;">${p}</p>`
        )
        .join('');
}