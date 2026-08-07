export interface CompanyData {
  name: string;
  domain: string;
}

export function detectCompany(url: string, title: string): CompanyData {
  const domain = new URL(url).hostname.replace('www.', '');

  let name = title.split('|').at(0)?.trim() ?? '';

  if (!name) {
    name = domain.split('.').at(0)?.trim() ?? 'Unknown';
  }

  return {
    name,
    domain,
  };
}
