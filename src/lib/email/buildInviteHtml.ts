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
  <p
    style="
      margin:0 0 24px 0;
    "
  >
    <a
      href="${options?.dealUrl ?? '#'}"
      style="
        display:inline-block;
        background:#31c8db;
        color:#0b2240;
        padding:14px 28px;
        border-radius:8px;
        font-weight:700;
        text-decoration:none;
        font-family:Arial,sans-serif;
      "
    >
      View Investment Opportunity
    </a>
  </p>

  <div style="height:12px;"></div>
`);

      continue;
    }

    if (
      line.startsWith('{{ bullet }}')
    ) {
      if (!inList) {
        html.push(
  '<ul style="margin:0 0 16px 24px; list-style-type:square;">'
);
        inList = true;
      }

      html.push(
  `<li
      style="
        margin:0 0 8px 0;
        list-style-type:square;
      "
    >
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