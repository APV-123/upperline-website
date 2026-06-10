
'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function AdminNav() {
  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',

      }}>
      <div
        style={{
          width: '100%',
          height: 64, // ✅ FIXED HEIGHT
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#071426',
          borderBottom: '1px solid rgba(255,255,255,.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>

          <Link href="/admin">
            <Image
              src="/Upperline-logo-inverted.png"
              alt="Upperline"
              width={160}   // ✅ BIGGER
              height={36}
            />
          </Link>

        </div>


        <Link href="/admin">
          <div
            style={{
              fontSize: 13,
              opacity: 0.6,
              cursor: 'pointer',
              color: '#9fb3c8',
            }}
          >
            Admin
          </div>
        </Link>

      </div>
    </div>
  );
}
