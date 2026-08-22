import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Diagnostic, ScreenBadge } from './presentation';

describe('Opportunity result presentation', () => {
  it.each(['PURSUE', 'REVIEW', 'PASS'])('renders the %s screening result', (value) => {
    expect(renderToStaticMarkup(createElement(ScreenBadge, { value }))).toContain(value);
  });
  it('renders absent screening results as an em dash', () => {
    expect(renderToStaticMarkup(createElement(ScreenBadge, { value: null }))).toContain('—');
  });
  it('renders diagnostic code, field path, and sanitized message', () => {
    const d = { code: 'MISSING_VALUE', severity: 'error' as const, path: 'site.landAreaSf', message: 'Site area is required.' };
    const markup = renderToStaticMarkup(createElement(Diagnostic, { d }));
    expect(markup).toContain('MISSING_VALUE'); expect(markup).toContain('site.landAreaSf'); expect(markup).toContain('Site area is required.');
  });
});
