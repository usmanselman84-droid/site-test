'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, type ReactNode } from 'react';
import CabinetMenu from '@/components/CabinetMenu';

/**
 * Persistent cabinet chrome. Lives in /dashboard/layout so the sidebar
 * does not unmount (and loading.tsx does not wipe it) on every leaf route.
 *
 * Desktop vs phone menu is CSS-driven so a refresh never flashes the
 * mobile rail (Страница / Общение / Дела / Прогресс) on wide screens.
 */
export default function CabinetShell({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname() || '/dashboard';
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isOverview = pathname.replace(/\/+$/, '') === '/dashboard';
  const isMessages = pathname.startsWith('/dashboard/messages');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    const personalCabinet =
      pathname === '/dashboard/me' ||
      pathname.startsWith('/dashboard/me/') ||
      pathname.startsWith('/dashboard/settings') ||
      pathname.startsWith('/dashboard/messages') ||
      pathname.startsWith('/dashboard/friends') ||
      pathname.startsWith('/dashboard/notifications') ||
      pathname.startsWith('/dashboard/edit');
    if (status === 'authenticated' && role === 'SCANNER' && !personalCabinet) {
      router.replace('/scanner');
    }
    if (status === 'authenticated' && role === 'TECH' && !personalCabinet) {
      router.replace('/ops');
    }
  }, [status, router, pathname, role]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <main className="container dashboard-page cabinet-subpage">
        <div className="dashboard-layout dashboard-shell hide-aside-mobile">
          <div className="dashboard-main" aria-busy="true">
            <div className="svc-skel" aria-label="Открываем кабинет">
              <div className="svc-skel__pill" />
              <div className="svc-skel__row" />
              <div className="svc-skel__row" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isMessages) {
    return <div className="dashboard-page dashboard-page--messages cabinet-messages-bleed">{children}</div>;
  }

  return (
    <main className="container dashboard-page cabinet-subpage">
      <div
        className={`dashboard-layout dashboard-shell hide-aside-mobile${isOverview ? ' is-overview' : ''}`}
      >
        <CabinetMenu role={role} />
        <div className="dashboard-main">{children}</div>
      </div>
    </main>
  );
}
