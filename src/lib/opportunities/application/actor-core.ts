import { opportunityError } from './errors';

export type OpportunityActor = { email: string; name: string | null };
export type SessionResolver = () => Promise<{ user?: { email?: string | null; name?: string | null } } | null>;

export async function resolveUpperlineUser(resolveSession: SessionResolver): Promise<OpportunityActor> {
  const session = await resolveSession();
  const rawEmail = session?.user?.email;
  if (typeof rawEmail !== 'string' || !rawEmail.trim()) {
    throw opportunityError('unauthorized', 'Authentication is required.');
  }
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^@\s]+@upperlineco\.com$/.test(email)) {
    throw opportunityError('forbidden', 'Upperline access is required.');
  }
  return { email, name: session?.user?.name?.trim() || null };
}
