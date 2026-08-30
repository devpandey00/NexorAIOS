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

export async function publishSocialPost(postId: string) {
  const posts = await listSocialContent({ limit: 200 });
  const post = posts.find((item) => item.id === postId);
  if (!post) throw new Error('Content post not found');
  let externalId = '';

  if (post.platform === 'FACEBOOK') {
    const pageId = process.env.META_PAGE_ID?.trim();
    if (!pageId) throw new Error('META_PAGE_ID is not configured');
    const result = await metaRequest(`/${pageId}/feed`, { message: `${post.caption}${post.hashtags.length ? `\n\n${post.hashtags.join(' ')}` : ''}` });
    externalId = result.post_id ?? result.id ?? '';
  } else if (post.platform === 'INSTAGRAM') {
    const igUserId = process.env.META_INSTAGRAM_USER_ID?.trim();
    if (!igUserId) throw new Error('META_INSTAGRAM_USER_ID is not configured');
    if (!post.mediaUrl) throw new Error('Instagram publishing requires a public mediaUrl');
    const creation = await metaRequest(`/${igUserId}/media`, { image_url: post.mediaUrl, caption: `${post.caption}${post.hashtags.length ? `\n\n${post.hashtags.join(' ')}` : ''}` });
    if (!creation.id) throw new Error('Meta did not return an Instagram creation id');
    const published = await metaRequest(`/${igUserId}/media_publish`, { creation_id: creation.id });
    externalId = published.id ?? creation.id;
  } else if (post.platform === 'LINKEDIN') {
    externalId = await publishLinkedIn(post);
  } else if (post.platform === 'YOUTUBE') {
    externalId = await publishYouTube(post);
  } else {
    throw new Error(`Automatic publishing adapter not configured for ${post.platform}`);
  }

  if (!externalId) throw new Error(`Provider did not return an external id for ${post.platform}`);
  return updateSocialContent(postId, { status: 'PUBLISHED', externalId, error: null });
}

export function isProviderConfigured(platform: SocialContentPlatform) {
  if (platform === 'FACEBOOK') return Boolean(process.env.META_ACCESS_TOKEN && process.env.META_GRAPH_VERSION && process.env.META_PAGE_ID);
  if (platform === 'INSTAGRAM') return Boolean(process.env.META_ACCESS_TOKEN && process.env.META_GRAPH_VERSION && process.env.META_INSTAGRAM_USER_ID);
  if (platform === 'LINKEDIN') return Boolean(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_AUTHOR_URN);
  if (platform === 'YOUTUBE') return Boolean(process.env.YOUTUBE_ACCESS_TOKEN);
  return false;
}
