/**
 * Utility to parse, extract, and clean image URLs from:
 * - Direct image links (https://...jpg/png/webp/svg/gif)
 * - ImgBB HTML / BBCode embed snippets
 * - PostImages HTML / BBCode embed snippets
 * - Imgur, Cloudinary, Google Drive & Dropbox share links
 * - Base64 Data URLs
 */
export function extractDirectImageUrl(rawInput?: string): string {
  if (!rawInput) return '';
  let str = rawInput.trim();
  if (!str) return '';

  // 1. Check BBCode snippets: [url=...][img]URL[/img][/url] or [img]URL[/img]
  const bbMatch = str.match(/\[img\](.*?)\[\/img\]/i);
  if (bbMatch && bbMatch[1]) {
    str = bbMatch[1].trim();
  }

  // 2. Check HTML snippets: <a href="..."><img src="URL" .../></a> or <img src="URL" ...>
  const htmlMatch = str.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (htmlMatch && htmlMatch[1]) {
    str = htmlMatch[1].trim();
  }

  // 3. Remove leading/trailing quotes or markdown
  str = str.replace(/^["'`]|["'`]$/g, '').trim();

  // 4. If URL wrapped in markdown format ![alt](url)
  const mdMatch = str.match(/!\[.*?\]\((.*?)\)/);
  if (mdMatch && mdMatch[1]) {
    str = mdMatch[1].trim();
  }

  // 5. Google Drive share link conversion -> direct high-res image endpoint
  // Matches /file/d/FILE_ID/... or ?id=FILE_ID
  if (str.includes('drive.google.com')) {
    const fileMatch = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const idParamMatch = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const driveId = fileMatch?.[1] || idParamMatch?.[1];
    if (driveId) {
      return `https://lh3.googleusercontent.com/d/${driveId}`;
    }
  }

  // 6. Dropbox share link conversion -> direct raw image content
  if (str.includes('dropbox.com/')) {
    str = str
      .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
      .replace(/[?&]dl=0\b/, '');
  }

  return str;
}

/**
 * Checks whether a given string is a plausible image source
 */
export function isValidImageSource(src?: string): boolean {
  if (!src) return false;
  const cleaned = extractDirectImageUrl(src);
  if (!cleaned) return false;
  return (
    cleaned.startsWith('http://') ||
    cleaned.startsWith('https://') ||
    cleaned.startsWith('data:image/') ||
    cleaned.startsWith('/') ||
    cleaned.startsWith('./')
  );
}

