import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest();

export function isAuthorizedCronRequest(
  request: Request,
  configuredSecret: string | undefined = process.env.CRON_SECRET,
): boolean {
  if (!configuredSecret || !configuredSecret.trim()) return false;

  const authorization = request.headers.get('authorization');
  if (!authorization) return false;

  return timingSafeEqual(
    digest(authorization),
    digest(`Bearer ${configuredSecret}`),
  );
}
