import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function Dashboard() {
  const h = await headers();
  const nonce = h.get('x-nonce') || undefined;
  return (
    <div className="fixed inset-0 overflow-hidden bg-[#F8FAFC]">
      <iframe
        title="NexorAIOS Founder Command Center"
        src="/stitch-founder-command-center.html"
        className="block h-full w-full border-0"
        {...(nonce ? { nonce } : {})}
      />
    </div>
  );
}
