export type TargetMarket = 'USA' | 'Australia' | 'Canada' | 'UAE';

export type InternationalPricing = {
  currency: 'USD' | 'AUD' | 'CAD' | 'AED';
  website: number;
  googleAds: number;
  metaAds: number;
  googleBusinessProfile: number;
  socialMedia: number;
};

/** Standard client-facing prices. Ad spend is never included in management fees. */
export const INTERNATIONAL_PRICING: Record<TargetMarket, InternationalPricing> = {
  USA: { currency: 'USD', website: 599, googleAds: 199, metaAds: 199, googleBusinessProfile: 149, socialMedia: 599 },
  Australia: { currency: 'AUD', website: 799, googleAds: 249, metaAds: 249, googleBusinessProfile: 199, socialMedia: 799 },
  Canada: { currency: 'CAD', website: 799, googleAds: 249, metaAds: 249, googleBusinessProfile: 199, socialMedia: 799 },
  UAE: { currency: 'AED', website: 1499, googleAds: 449, metaAds: 449, googleBusinessProfile: 299, socialMedia: 1499 },
};

export function normalizeTargetMarket(country?: string | null): TargetMarket {
  const value = String(country ?? '').trim().toLowerCase();
  if (value.includes('austral')) return 'Australia';
  if (value.includes('canada') || value === 'ca') return 'Canada';
  if (value.includes('uae') || value.includes('emirates') || value.includes('dubai')) return 'UAE';
  return 'USA';
}

export function getInternationalPricing(country?: string | null) {
  const targetMarket = normalizeTargetMarket(country);
  return { targetMarket, ...INTERNATIONAL_PRICING[targetMarket] };
}
