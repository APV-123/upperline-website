'use client';

import { useEffect, useState } from 'react';
import AdminNav from '@/components/navigation/AdminNav';
import { ADMIN_THEME } from '@/lib/adminTheme';

export default function SettingsPage() {
  const [isDark, setIsDark] =
    useState(false);

  const [isMobile, setIsMobile] =
    useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(
        window.innerWidth < 768
      );
    };

    handleResize();

    const saved =
      localStorage.getItem(
        'theme'
      );

    if (saved === 'dark') {
      setIsDark(true);
    }

    window.addEventListener(
      'resize',
      handleResize
    );

    return () =>
      window.removeEventListener(
        'resize',
        handleResize
      );
  }, []);

  const colors = isDark
    ? ADMIN_THEME.dark
    : ADMIN_THEME.light;

  return (
    <>
      <AdminNav />

      <div
        style={{
          minHeight:
            'calc(100vh - 64px)',
          background:
            colors.background,
          padding:
            isMobile
              ? 16
              : 32,
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: '0 auto',
          }}
        >
          <h1
            style={{
              marginTop: 0,
              color:
                colors.text,
            }}
          >
            Settings
          </h1>

          <p
            style={{
              color:
                colors.subtext,
              marginBottom: 24,
            }}
          >
            Manage your
            preferences and
            account settings.
          </p>

          <div
            style={{
              background:
                colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <h3
              style={{
                marginTop: 0,
                color:
                  colors.text,
              }}
            >
              Account
            </h3>

            <div
              style={{
                color:
                  colors.subtext,
              }}
            >
              User profile
              settings coming
              soon.
            </div>
          </div>

          <div
            style={{
              background:
                colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: 20,
              marginTop: 16,
            }}
          >
            <h3
              style={{
                marginTop: 0,
                color:
                  colors.text,
              }}
            >
              Notifications
            </h3>

            <div
              style={{
                color:
                  colors.subtext,
              }}
            >
              Email and CRM
              notification
              settings coming
              soon.
            </div>
          </div>

          <div
            style={{
              background:
                colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: 20,
              marginTop: 16,
            }}
          >
            <h3
              style={{
                marginTop: 0,
                color:
                  colors.text,
              }}
            >
              Integrations
            </h3>

            <div
              style={{
                color:
                  colors.subtext,
              }}
            >
              Outlook,
              HubSpot and
              future
              integrations
              will appear
              here.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}