import axios from 'axios';

export async function fetchHtml(url: string): Promise<string> {
  const { data } = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 NexorOS Research Bot',
    },
  });

  return data;
}
