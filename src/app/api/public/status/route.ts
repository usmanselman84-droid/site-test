import { NextResponse } from 'next/server';
import { getMaintenanceState } from '@/lib/maintenance';
import { getAccessSettings } from '@/lib/access-settings';
import { getModuleFlagsBundle } from '@/lib/module-flags';
import { oauthProviderFlags } from '@/lib/oauth-providers';
import { smsProviderConfigured } from '@/lib/sms-otp';
import { isOutboundEmailReady } from '@/lib/email';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Public lightweight status for middleware / PWA / uptime checks */
export async function GET() {
  const [state, access, bundle, visibility, smsReady, emailReady] = await Promise.all([
    getMaintenanceState(),
    getAccessSettings(),
    getModuleFlagsBundle(),
    prisma.siteSettings
      .findUnique({
        where: { id: '1' },
        select: {
          publicEventsVisibility: true,
          galleryPageEnabled: true,
          galleryPublicEnabled: true,
        },
      })
      .catch(() => null),
    smsProviderConfigured(),
    isOutboundEmailReady().catch(() => false),
  ]);
  const oauth = await oauthProviderFlags();
  const ssoAvailable = Boolean(oauth.yandex || oauth.vk || oauth.telegram || (access.esiaLoginEnabled && oauth.esia));
  return NextResponse.json(
    {
      ok: true,
      maintenanceMode: state.maintenanceMode,
      maintenanceMessage: state.maintenanceMessage,
      maintenanceEta: state.maintenanceEta,
      siteName: state.siteName,
      registrationEnabled: access.registrationEnabled,
      messagingEnabled: access.messagingEnabled,
      smsLoginEnabled: access.smsLoginEnabled,
      esiaLoginEnabled: access.esiaLoginEnabled,
      smsLoginReady: access.smsLoginEnabled && smsReady,
      esiaLoginReady: access.esiaLoginEnabled && oauth.esia,
      oauth,
      ssoAvailable,
      passwordResetEmailReady: Boolean(emailReady),
      modules: bundle.flags,
      offModes: bundle.offModes,
      publicEventsVisibility: Boolean(visibility?.publicEventsVisibility),
      galleryPageEnabled: visibility?.galleryPageEnabled !== false,
      galleryPublicEnabled: Boolean(visibility?.galleryPublicEnabled),
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=5, s-maxage=15, stale-while-revalidate=30',
      },
    }
  );
}
