export interface TechnologyData {
  technologies: string[];
}

export function detectTechnologies(html: string): TechnologyData {
  const technologies = new Set<string>();

  // Next.js
  if (html.includes('/_next/') || html.includes('__NEXT_DATA__') || html.includes('_next/static')) {
    technologies.add('Next.js');
  }

  // WordPress
  if (html.includes('wp-content') || html.includes('wp-includes')) {
    technologies.add('WordPress');
  }

  // Shopify
  if (
    html.includes('cdn.shopify.com') ||
    html.includes('shopify-payment-button') ||
    html.includes('Shopify.theme') ||
    html.includes('Shopify.shop')
  ) {
    technologies.add('Shopify');
  }

  // Elementor
  if (html.includes('elementor') || html.includes('elementor-')) {
    technologies.add('Elementor');
  }

  // Google Analytics
  if (html.includes('gtag(') || html.includes('google-analytics.com')) {
    technologies.add('Google Analytics');
  }

  // Google Tag Manager
  if (html.includes('googletagmanager.com') || html.includes('GTM-')) {
    technologies.add('Google Tag Manager');
  }

  return {
    technologies: [...technologies],
  };
}
