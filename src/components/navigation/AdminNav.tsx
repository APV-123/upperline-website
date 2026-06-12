'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  useSession,
  signOut,
} from 'next-auth/react';
import {
  useState,
  useRef,
  useEffect,
} from 'react';
import { TEAM } from '@/lib/team';

export default function AdminNav() {
  const { data: session } =
    useSession();

  const [open, setOpen] =
    useState(false);

  const menuRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const initials =
    session?.user?.name
      ?.split(' ')
      .map(
        (part) => part[0]
      )
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'U';

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
  }, []);

  const email =
    session?.user?.email
      ?.toLowerCase() ?? '';

  const teamMember =
    Object.values(TEAM).find(
      (member) =>
        member.email.toLowerCase() ===
        email
    );

  const headshot =
    teamMember?.headshot;

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
      <Link href="/admin">
        <Image
          src="/Upperline-logo-inverted.png"
          alt="Upperline"
          width={160}
          height={36}
        />
      </Link>

      <div
        ref={menuRef}
        style={{
          position: 'relative',
        }}
      >
        <div
          onClick={() =>
            setOpen(!open)
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
          }}
        >
          {headshot ? (
            <Image
              src={headshot}
              alt={
                teamMember?.name ??
                'User'
              }
              width={36}
              height={36}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                objectFit: 'cover',
                border:
                  '2px solid rgba(255,255,255,.08)',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background:
                  '#1e3a5f',
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
          )}

          <div>
            <div
              style={{
                display: 'flex',
                alignItems:
                  'center',
                gap: 6,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: '#fff',
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}
              >
                {teamMember?.name ??
                  session?.user?.name ??
                  'User'}
              </div>

              <div
                style={{
                  color:
                    '#9fb3c8',
                  fontSize: 10,
                  transition:
                    'transform .15s ease',
                  transform: open
                    ? 'rotate(180deg)'
                    : 'rotate(0deg)',
                }}
              >
                ▼
              </div>
            </div>
          </div>
        </div>

        {open && (
          <div
            style={{
              position: 'absolute',
              top: 44,
              right: 0,

              marginTop: 8,

              width: 260,

              background: '#071426',

              border:
                '1px solid rgba(255,255,255,.08)',

              borderRadius: 12,

              overflow: 'hidden',

              boxShadow:
                '0 16px 40px rgba(0,0,0,.35)',

              zIndex: 999,
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom:
                  '1px solid rgba(255,255,255,.08)',
              }}
            >
              <div
                style={{
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {teamMember?.name}
              </div>

              <div
                style={{
                  color: '#9fb3c8',
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                {teamMember?.title}
              </div>
            </div>

            <Link
              href="/admin/settings"
              onClick={() =>
                setOpen(false)
              }
              style={{
                display:
                  'block',
                padding:
                  '12px 16px',
                color: '#fff',
                textDecoration:
                  'none',
              }}
            >
              Settings
            </Link>

            <button
              onClick={() =>
                signOut({
                  callbackUrl:
                    '/login',
                })
              }
              style={{
                width: '100%',
                textAlign:
                  'left',

                padding:
                  '12px 16px',

                border: 'none',

                background:
                  'transparent',

                color:
                  '#ef4444',

                cursor:
                  'pointer',

                borderTop:
                  '1px solid rgba(255,255,255,.08)',
              }}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}