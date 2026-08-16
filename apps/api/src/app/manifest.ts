import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NexorAIOS',
    short_name: 'NexorAIOS',
    description: 'Nexor Media AI Operating System',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0b0b0b',
    theme_color: '#0b0b0b',
    orientation: 'portrait',
  };
}
