import 'server-only';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { resolveUpperlineUser, type OpportunityActor } from './actor-core';

export type { OpportunityActor } from './actor-core';

export function requireUpperlineUser(): Promise<OpportunityActor> {
  return resolveUpperlineUser(() => getServerSession(authOptions));
}
