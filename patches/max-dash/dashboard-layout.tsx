import { Suspense } from 'react';
import CabinetShell from '@/components/CabinetShell';

/** Auth-gated cabinet — never prerender as a public static page. */
export const dynamic = 'force-dynamic';

function DashboardFallback() {
  return (
    <div className="cabinet-desk cabinet-desk--modern" aria-busy="true" aria-label="Открываем кабинет">
      <div className="svc-skel">
        <div className="svc-skel__pill" />
        <div className="svc-skel__row" />
        <div className="svc-skel__row" />
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <CabinetShell>
      <Suspense fallback={<DashboardFallback />}>
        {children}
      </Suspense>
      {modal}
    </CabinetShell>
  );
}
