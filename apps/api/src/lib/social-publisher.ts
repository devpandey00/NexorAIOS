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
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.error) {
    throw new Error(json?.error?.message ?? `Meta API request failed (${response.status})`);
  }
  return json as { id?: string; post_id?: string };
}

export async function publishSocialPost(postId: string) {
  const posts = await listSocialContent({ limit: 200 });
  const post = posts.find((item) => item.id === postId);
  if (!post) throw new Error('Content post not found');

  let externalId = '';

  if (post.platform === 'FACEBOOK') {
    const pageId = process.env.META_PAGE_ID?.trim();
    if (!pageId) throw new Error('META_PAGE_ID is not configured');
    const result = await metaRequest(`/${pageId}/feed`, {
      message: `${post.caption}${post.hashtags.length ? `\n\n${post.hashtags.join(' ')}` : ''}`,
    });
    externalId = result.post_id ?? result.id ?? '';
  } else if (post.platform === 'INSTAGRAM') {
    const igUserId = process.env.META_INSTAGRAM_USER_ID?.trim();
    if (!igUserId) throw new Error('META_INSTAGRAM_USER_ID is not configured');
    if (!post.mediaUrl) throw new Error('Instagram publishing requires a public mediaUrl');

    const creation = await metaRequest(`/${igUserId}/media`, {
      image_url: post.mediaUrl,
      caption: `${post.caption}${post.hashtags.length ? `\n\n${post.hashtags.join(' ')}` : ''}`,
    });
    if (!creation.id) throw new Error('Meta did not return an Instagram creation id');

    const published = await metaRequest(`/${igUserId}/media_publish`, {
      creation_id: creation.id,
    });
    externalId = published.id ?? creation.id;
  } else {
    throw new Error(`Automatic publishing adapter not configured for ${post.platform}`);
  }

  return updateSocialContent(postId, {
    status: 'PUBLISHED',
    error: null,
  }).then((updated) => ({ ...updated, externalId }));
}

export function isProviderConfigured(platform: SocialContentPlatform) {
  if (platform === 'FACEBOOK') return Boolean(process.env.META_ACCESS_TOKEN && process.env.META_GRAPH_VERSION && process.env.META_PAGE_ID);
  if (platform === 'INSTAGRAM') return Boolean(process.env.META_ACCESS_TOKEN && process.env.META_GRAPH_VERSION && process.env.META_INSTAGRAM_USER_ID);
  return false;
}
