'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function AdminNav() {
  return (
    <div
      style={{
        width: '100%',
        height: 64,
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#071426',
        borderBottom: '1px solid rgba(255,255,255,.08)',
        boxSizing: 'border-box',
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

      <Link href="/admin">
        <div
          style={{
            fontSize: 13,
            color: '#9fb3c8',
            cursor: 'pointer',
          }}
        >
          Admin
        </div>
      </Link>
    </div>
  );
}