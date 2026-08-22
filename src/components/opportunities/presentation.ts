import { createElement } from 'react';
import type { RetailUnderwritingResult } from '@/lib/underwriting/retail-development';
export function ScreenBadge({ value }: { value: string | null | undefined }) {
  if (!value) return createElement('span', null, '—');
  const colors = value === 'PURSUE' ? ['#dcfce7', '#166534'] : value === 'REVIEW' ? ['#fef3c7', '#92400e'] : ['#fee2e2', '#991b1b'];
  return createElement('span', { 'data-screen': value, style: { display: 'inline-flex', borderRadius: 999, padding: '4px 9px', fontSize: 11, fontWeight: 750, background: colors[0], color: colors[1] } }, value);
}

export function Diagnostic({ d }: { d: RetailUnderwritingResult['diagnostics'][number] }) {
  return createElement('div', { style: { padding: '10px 0', borderBottom: '1px solid #e2e8f0' } },
    createElement('strong', null, d.code), ` · ${d.path}`, createElement('div', null, d.message));
}
