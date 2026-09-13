import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
import './globals.css';
import './auth-layout.css';
import '../../public/brand/theme.css';
import './layout-unify.css';
import './cabinet-app-shell.css';
import NavbarWrapper from '@/components/NavbarWrapper';
import BottomNav from '@/components/BottomNav';
import Footer from '@/components/Footer';
import { Providers } from '@/components/Providers';
import { Toaster } from 'react-hot-toast';
import PwaUpdateBanner from '@/components/PwaUpdateBanner';
import PwaInstallBanner from '@/components/PwaInstallBanner';
import ConsentBanner from '@/components/ConsentBanner';
import PrivacyPolicyGate from '@/components/PrivacyPolicyGate';
import CopyProtection from '@/components/CopyProtection';
import YandexMetrika from '@/components/YandexMetrika';
import StaffChrome from '@/components/StaffChrome';
import HideOnPaths from '@/components/HideOnPaths';
import CabinetTopBar from '@/components/CabinetTopBar';
import MaintenanceStaffBanner from '@/components/MaintenanceStaffBanner';
import { isLocalOrigin } from '@/lib/site-identity';
import { getCachedPublicChromeSettings } from '@/lib/public-chrome-settings';

/** Vendored fonts — Google Fonts fetch is flaky during Docker builds on the VPS. */
const manrope = localFont({
  src: [
    { path: '../fonts/manrope/Manrope-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/manrope/Manrope-600.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/manrope/Manrope-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-manrope',
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
});

const unbounded = localFont({
  src: [{ path: '../fonts/unbounded/Unbounded-700.woff2', weight: '700', style: 'normal' }],
  variable: '--font-unbounded',
  display: 'swap',
  preload: true,
});

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, publicOrigin } = await getCachedPublicChromeSettings();
  const publicUrl = isLocalOrigin(publicOrigin) ? undefined : publicOrigin;
  const titleDefault = `${siteName} | Официальный портал`;
  const description = `Официальный портал ${siteName}: залы, коворкинг, клубы, афиша и новости.`;
  return {
    ...(publicUrl ? { metadataBase: new URL(publicUrl), alternates: { canonical: publicUrl } } : {}),
    title: {
      default: titleDefault,
      template: `%s | ${siteName}`,
    },
    description,
    openGraph: {
      type: 'website',
      locale: 'ru_RU',
      ...(publicUrl ? { url: publicUrl } : {}),
      siteName,
      title: titleDefault,
      description,
      images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: siteName }],
    },
    twitter: {
      card: 'summary',
      title: siteName,
      description,
      images: ['/icons/icon-512.png'],
    },
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: siteName,
    },
    icons: {
      icon: [
        { url: '/icons/favicon-48.png', sizes: '48x48', type: 'image/png' },
        { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
        { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#8562d8',
};

/**
 * Root layout is ISR. Do not read cookies/headers/session here —
 * that dynamizes every route. Auth chrome lives in client islands;
 * maintenance and module kill-switches run in `src/proxy.ts`.
 */
export const revalidate = 60;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const chrome = await getCachedPublicChromeSettings();
  const { siteName, publicOrigin, yandexMetrikaId, copyProtectionEnabled, cookieBannerEnabled, analyticsConsentRequired } =
    chrome;

  return (
    <html lang="ru" className={`${manrope.variable} ${unbounded.variable}`}>
      <body className={manrope.className}>
        <Script
          id="yp-chrome-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.pathname||'';var staff=p.indexOf('/admin')===0||p.indexOf('/scanner')===0||p.indexOf('/dashboard')===0||p.indexOf('/profile')===0;var ops=p.indexOf('/ops')===0;var gamesPlay=p.indexOf('/games/')===0;var immersive=staff||ops||gamesPlay||p.indexOf('/login')===0||p.indexOf('/register')===0||p.indexOf('/verify')===0||p.indexOf('/maintenance')===0||p.indexOf('/presentation/view')===0||p.indexOf('/forgot-password')===0||p.indexOf('/reset-password')===0;document.documentElement.classList.add('yp-booting');if(staff){document.documentElement.classList.add('is-admin');document.body.classList.add('is-admin')}if(ops){document.documentElement.classList.add('is-ops');document.body.classList.add('is-ops')}try{if(localStorage.getItem('yp-session')==='1'){document.documentElement.classList.add('has-session')}}catch(e){}if(!immersive){try{if(localStorage.getItem('yp-dock')==='1'&&window.matchMedia('(max-width:860px)').matches){document.documentElement.classList.add('has-bottom-nav');document.body.classList.add('has-bottom-nav')}}catch(e){}}setTimeout(function(){document.documentElement.classList.remove('yp-booting')},3000)}catch(e){}})();`,
          }}
        />
        <Script
          id="yp-pwa-early"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{window.__ypPwa=window.__ypPwa||{deferred:null};window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__ypPwa.deferred=e;window.dispatchEvent(new Event('yp-beforeinstallprompt'))});window.addEventListener('appinstalled',function(){window.__ypPwa.deferred=null;window.dispatchEvent(new Event('yp-appinstalled'))});if('serviceWorker'in navigator){var reg=function(){navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(function(){})};if(document.readyState==='complete'){setTimeout(reg,1500)}else window.addEventListener('load',function(){setTimeout(reg,1500)})}}catch(e){}})();`,
          }}
        />
        <Providers>
          <Toaster
            position="top-center"
            reverseOrder={false}
            gutter={10}
            containerClassName="yp-toaster"
            containerStyle={{
              top: 'calc(env(safe-area-inset-top, 0px) + 76px)',
              zIndex: 100000,
            }}
            toastOptions={{
              duration: 3200,
              className: 'yp-toast',
              style: {
                maxWidth: 'min(420px, calc(100vw - 24px))',
                padding: '10px 14px',
                fontSize: '0.9rem',
                fontWeight: 650,
                borderRadius: 12,
                boxShadow: '0 10px 28px rgba(15,23,42,0.14)',
              },
              success: { duration: 2800 },
              error: { duration: 4500 },
            }}
          />
          <HideOnPaths>
            <PwaUpdateBanner />
            <PwaInstallBanner siteName={siteName} />
            <ConsentBanner enabled={cookieBannerEnabled} />
            <PrivacyPolicyGate />
            <CopyProtection enabled={copyProtectionEnabled} />
            <YandexMetrika counterId={yandexMetrikaId} requireConsent={analyticsConsentRequired} />
          </HideOnPaths>
          <div className="animated-bg"></div>
          <MaintenanceStaffBanner />
          <StaffChrome />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@graph': [
                  {
                    '@type': 'Organization',
                    name: siteName,
                    url: publicOrigin,
                    logo: `${publicOrigin}/icons/icon-512.png`,
                  },
                  {
                    '@type': 'WebSite',
                    name: siteName,
                    url: publicOrigin,
                    inLanguage: 'ru-RU',
                    potentialAction: {
                      '@type': 'SearchAction',
                      target: `${publicOrigin}/search?q={search_term_string}`,
                      'query-input': 'required name=search_term_string',
                    },
                  },
                ],
              }),
            }}
          />
          <HideOnPaths>
            <NavbarWrapper />
          </HideOnPaths>
          <CabinetTopBar />
          <main className="main-content">{children}</main>
          <HideOnPaths extraPrefixes={['/dashboard', '/profile']}>
            <Footer />
          </HideOnPaths>
          <HideOnPaths exceptPrefixes={['/dashboard', '/profile']}>
            <div className="yp-bottom-nav-space" aria-hidden="true" />
            <BottomNav />
          </HideOnPaths>
        </Providers>
      </body>
    </html>
  );
}
