export const SSO_PROVIDERS = ['yandex', 'vk', 'telegram', 'esia'] as const;
export type SsoProviderId = (typeof SSO_PROVIDERS)[number];

export const SSO_LABELS: Record<SsoProviderId, string> = {
  yandex: 'Яндекс',
  vk: 'VK',
  telegram: 'Telegram',
  esia: 'Госуслуги',
};
