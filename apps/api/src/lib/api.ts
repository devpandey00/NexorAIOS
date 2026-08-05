const API = 'http://localhost:3000';

export async function getLeads() {
  const res = await fetch(`${API}/api/leads`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch leads');
  }

  return res.json();
}
