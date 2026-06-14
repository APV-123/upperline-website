export function buildInviteHtml(
  body: string,
  options?: {
    firstName?: string;
    dealUrl?: string;
  }
) {
  let rendered = body;

  rendered = rendered.replaceAll(
    '{{ first_name }}',
    options?.firstName ?? ''
  );

  const lines = rendered.split('\n');

  const html: string[] = [];
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }

      html.push(
        '<div style="height:16px;"></div>'
      );

      continue;
    }

    if (
      line === '{{ opportunity_link }}'
    ) {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }

      html.push(`
        <p style="margin:0 0 16px 0;">
          <a
            href="${options?.dealUrl ?? '#'}"
            style="
              color:#0ea5e9;
              font-weight:600;
              text-decoration:none;
            "
          >
            View Colony Lakes Opportunity
          </a>
        </p>
      `);

      continue;
    }

    if (
      line.startsWith('{{ bullet }}')
    ) {
      if (!inList) {
        html.push(
          '<ul style="margin:0 0 16px 24px;">'
        );
        inList = true;
      }

      html.push(
        `<li style="margin:0 0 8px 0;">
          ${line
            .replace(
              '{{ bullet }}',
              ''
            )
            .trim()}
        </li>`
      );

      continue;
    }

    if (inList) {
      html.push('</ul>');
      inList = false;
    }

    if (
      line.toLowerCase() ===
      'key highlights:'
    ) {
      html.push(
        '<p style="margin:0 0 12px 0;"><strong>Key Highlights:</strong></p>'
      );

      continue;
    }

    html.push(
      `<p style="margin:0 0 16px 0;">${line}</p>`
    );
  }

  if (inList) {
    html.push('</ul>');
  }

  return html.join('');
}