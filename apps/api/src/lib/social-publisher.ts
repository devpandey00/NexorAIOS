import { listSocialContent, updateSocialContent, type SocialContentPlatform } from './social-content';

function graphVersion() {
  const version = process.env.META_GRAPH_VERSION?.trim();
  if (!version) throw new Error('META_GRAPH_VERSION is not configured');
  return version;
}

function metaToken() {
  const token = process.env.META_ACCESS_TOKEN?.trim();
  if (!token) throw new Error('META_ACCESS_TOKEN is not configured');
  return token;
}

async function metaRequest(path: string, body: Record<string, string>) {
  const response = await fetch(`https://graph.facebook.com/${graphVersion()}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...body, access_token: metaToken() }).toString(),
    cache: 'no-store',
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.error) throw new Error(json?.error?.message ?? `Meta API request failed (${response.status})`);
  return json as { id?: string; post_id?: string };
}

function linkedinToken() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN?.trim();
  if (!token) throw new Error('LINKEDIN_ACCESS_TOKEN is not configured');
  return token;
}

function linkedinVersion() {
  return process.env.LINKEDIN_VERSION?.trim() ?? '202601';
}

async function publishLinkedIn(post: { caption: string; hashtags: string[] }) {
  const author = process.env.LINKEDIN_AUTHOR_URN?.trim();
  if (!author) throw new Error('LINKEDIN_AUTHOR_URN is not configured');
  const response = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${linkedinToken()}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': linkedinVersion(),
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author,
      commentary: `${post.caption}${post.hashtags.length ? `\n\n${post.hashtags.join(' ')}` : ''}`,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
    cache: 'no-store',
  });
  const body = await response.text();
  if (!response.ok) throw new Error(body || `LinkedIn publish failed (${response.status})`);
  return response.headers.get('x-restli-id') ?? response.headers.get('x-linkedin-id') ?? '';
}

function youtubeAccessToken() {
  const token = process.env.YOUTUBE_ACCESS_TOKEN?.trim();
  if (!token) throw new Error('YOUTUBE_ACCESS_TOKEN is not configured');
  return token;
}

async function publishYouTube(post: { title: string; caption: string; mediaUrl: string | null }) {
  if (!post.mediaUrl) throw new Error('YouTube publishing requires a public mediaUrl');
  const mediaResponse = await fetch(post.mediaUrl, { cache: 'no-store' });
  if (!mediaResponse.ok) throw new Error(`Unable to fetch YouTube media (${mediaResponse.status})`);
  const media = await mediaResponse.arrayBuffer();
  const contentType = mediaResponse.headers.get('content-type') || 'video/mp4';
  if (!contentType.startsWith('video/')) throw new Error(`YouTube media must be video/*, received ${contentType}`);

  const metadata = {
    snippet: {
      title: post.title.slice(0, 100) || 'NexorAIOS Social Video',
      description: post.caption,
      categoryId: process.env.YOUTUBE_CATEGORY_ID?.trim() ?? '22',
    },
    status: { privacyStatus: process.env.YOUTUBE_PRIVACY_STATUS?.trim() ?? 'private', selfDeclaredMadeForKids: false },
  };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('media', new Blob([media], { type: contentType }));

  const response = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status', {
    method: 'POST',
    headers: { Authorization: `Bearer ${youtubeAccessToken()}` },
    body: form,
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.id) throw new Error(body?.error?.message ?? `YouTube publish failed (${response.status})`);
  return body.id as string;
}

async function publishX(post: { caption: string; hashtags: string[] }) {
  const token = process.env.X_ACCESS_TOKEN?.trim();
  if (!token) throw new Error('X_ACCESS_TOKEN is not configured');
  const text = `${post.caption}${post.hashtags.length ? `\n\n${post.hashtags.join(' ')}` : ''}`.trim();
  if (!text) throw new Error('X post cannot be empty');
  const response = await fetch('https://api.x.com/2/tweets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.slice(0, 280) }),
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.data?.id) throw new Error(body?.detail ?? body?.title ?? `X publish failed (${response.status})`);
  return String(body.data.id);
}

function metaInstagramUserId() {
  return process.env.META_INSTAGRAM_USER_ID?.trim() || process.env.META_INSTAGRAM_ACCOUNT_ID?.trim() || '';
}

function isVideoUrl(url: string) {
  return /\.(mp4|mov|m4v|webm)(?:\?|$)/i.test(url);
}

async function publishInstagram(post: { caption: string; hashtags: string[]; mediaUrl: string | null }) {
  const igUserId = metaInstagramUserId();
  if (!igUserId) throw new Error('META_INSTAGRAM_USER_ID or META_INSTAGRAM_ACCOUNT_ID is not configured');
  if (!post.mediaUrl) throw new Error('Instagram publishing requires a public mediaUrl');
  const caption = `${post.caption}${post.hashtags.length ? `\n\n${post.hashtags.join(' ')}` : ''}`;
  const video = isVideoUrl(post.mediaUrl);
  const creation = await metaRequest(`/${igUserId}/media`, video
    ? { media_type: 'REELS', video_url: post.mediaUrl, caption }
    : { image_url: post.mediaUrl, caption });
  if (!creation.id) throw new Error('Meta did not return an Instagram creation id');
  const published = await metaRequest(`/${igUserId}/media_publish`, { creation_id: creation.id });
  return published.id ?? creation.id;
}

export async function publishSocialPost(postId: string) {
  const posts = await listSocialContent({ limit: 200 });
  const post = posts.find((item) => item.id === postId);
  if (!post) throw new Error('Content post not found');

  if (post.status === 'PUBLISHED' && post.externalId) return post;
  if (post.status !== 'APPROVED' && post.status !== 'SCHEDULED' && post.status !== 'PUBLISHING') {
    throw new Error(`Post must be approved before publishing; current status is ${post.status}`);
  }

  let externalId = '';
  if (post.platform === 'FACEBOOK') {
    const pageId = process.env.META_PAGE_ID?.trim();
    if (!pageId) throw new Error('META_PAGE_ID is not configured');
    const result = await metaRequest(`/${pageId}/feed`, { message: `${post.caption}${post.hashtags.length ? `\n\n${post.hashtags.join(' ')}` : ''}` });
    externalId = result.post_id ?? result.id ?? '';
  } else if (post.platform === 'INSTAGRAM') {
    externalId = await publishInstagram(post);
  } else if (post.platform === 'LINKEDIN') {
    externalId = await publishLinkedIn(post);
  } else if (post.platform === 'YOUTUBE') {
    externalId = await publishYouTube(post);
  } else if (post.platform === 'X') {
    externalId = await publishX(post);
  } else {
    throw new Error(`Automatic publishing adapter not configured for ${post.platform}. Use the provider/manual publishing state.`);
  }

  if (!externalId) throw new Error(`Provider did not return an external id for ${post.platform}`);
  return updateSocialContent(postId, { status: 'PUBLISHED', externalId, error: null });
}

export function isProviderConfigured(platform: SocialContentPlatform) {
  if (platform === 'FACEBOOK') return Boolean(process.env.META_ACCESS_TOKEN && process.env.META_GRAPH_VERSION && process.env.META_PAGE_ID);
  if (platform === 'INSTAGRAM') return Boolean(process.env.META_ACCESS_TOKEN && process.env.META_GRAPH_VERSION && metaInstagramUserId());
  if (platform === 'LINKEDIN') return Boolean(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_AUTHOR_URN);
  if (platform === 'YOUTUBE') return Boolean(process.env.YOUTUBE_ACCESS_TOKEN);
  if (platform === 'X') return Boolean(process.env.X_ACCESS_TOKEN);
  return false;
}
