'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import FounderSafetyControls from './FounderSafetyControls';

type Control = { key: 'master_autopilot' | 'outbound_enabled'; enabled: boolean; label: string };

export default function FounderGlobalControls() {
  const pathname = usePathname();
  const [controls, setControls] = useState<Control[]>([]);

  useEffect(() => {
    if (pathname !== '/dashboard/command') return;
    let active = true;
    fetch('/api/automations/settings', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load controls');
        return data.settings as Control[];
      })
      .then((settings) => {
        if (!active) return;
        setControls(settings.filter((item) => item.key === 'master_autopilot' || item.key === 'outbound_enabled'));
      })
      .catch(() => {
        if (active) setControls([]);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  if (pathname !== '/dashboard/command' || controls.length !== 2) return null;
  return <FounderSafetyControls controls={controls} />;
}
