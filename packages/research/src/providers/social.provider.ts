export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
}

export function extractSocialLinks(html: string): SocialLinks {
  const result: SocialLinks = {};

  const instagram = html.match(/https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>]+/i)?.[0];

  const facebook = html.match(/https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/i)?.[0];

  const linkedin = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s"'<>]+/i)?.[0];

  const youtube = html.match(/https?:\/\/(?:www\.)?youtube\.com\/[^\s"'<>]+/i)?.[0];

  if (instagram) result.instagram = instagram;
  if (facebook) result.facebook = facebook;
  if (linkedin) result.linkedin = linkedin;
  if (youtube) result.youtube = youtube;

  return result;
}
