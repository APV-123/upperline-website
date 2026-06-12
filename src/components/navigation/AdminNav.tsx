'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

export default function AdminNav() {
  const { data: session } =
    useSession();

  const initials =
    session?.user?.name
      ?.split(' ')
      .map(
        (part) => part[0]
      )
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'U';

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        height: 64,
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent:
          'space-between',
        background: '#071426',
        borderBottom:
          '1px solid rgba(255,255,255,.08)',
        boxSizing: 'border-box',
        boxShadow:
          '0 4px 20px rgba(0,0,0,.25)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <Link href="/admin">
          <Image
            src="/Upperline-logo-inverted.png"
            alt="Upperline"
            width={160}
            height={36}
          />
        </Link>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: '#1e3a5f',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'center',
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        <div>
          <div
            style={{
              fontSize: 13,
              color: '#fff',
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            {session?.user?.name ??
              'User'}
          </div>

          <div
            style={{
              fontSize: 11,
              color: '#9fb3c8',
              lineHeight: 1.2,
            }}
          >
            Admin
          </div>
        </div>
      </div>
    </div>
  );
}