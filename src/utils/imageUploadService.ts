import { extractDirectImageUrl } from './imageUtils';

export const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';
export const IMGBB_API_KEY = '709e187619d91bd942cefbff315493eb';

export const POSTIMAGES_UPLOAD_URL = 'https://api.postimage.org/1/upload';
export const POSTIMAGES_API_KEY = 'eaa8f38707ddd76a1e519fd0c4cdadbf';

export interface UploadedImageResult {
  inputValue: string;
  previewUrl: string;
  provider: 'imgbb' | 'postimages';
}

function readFileAsBase64Payload(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.replace(/^data:[^;]+;base64,/i, '').trim();
      if (!base64) {
        reject(new Error('ছবি রিড করা যায়নি।'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('ডিভাইস থেকে ছবি পড়তে সমস্যা হয়েছে।'));
    reader.readAsDataURL(file);
  });
}

function getFileNameAndExt(file: File): { stem: string; ext: string } {
  const rawName = (file.name || 'image.jpg').trim();
  const lastDot = rawName.lastIndexOf('.');
  const rawStem = lastDot > 0 ? rawName.slice(0, lastDot) : rawName;
  const stem = rawStem.replace(/[^a-zA-Z0-9_-]/g, '_') || 'image';

  let ext = lastDot > 0 ? rawName.slice(lastDot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  if (!ext && file.type) {
    const mimeExt = file.type.split('/')[1]?.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (mimeExt === 'jpeg') ext = 'jpg';
    else if (mimeExt === 'svg+xml' || mimeExt === 'svgxml') ext = 'svg';
    else if (mimeExt) ext = mimeExt;
  }
  if (!ext) ext = 'jpg';
  return { stem, ext };
}

async function uploadToImgBB(base64Payload: string): Promise<UploadedImageResult> {
  const formData = new FormData();
  formData.append('key', IMGBB_API_KEY);
  formData.append('image', base64Payload);
  // Expiration is intentionally omitted so uploaded images remain permanent

  const response = await fetch(IMGBB_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`ImgBB HTTP ${response.status}`);
  }

  const json = await response.json();
  if (!json?.success || !json?.data) {
    throw new Error(json?.error?.message || 'ImgBB upload failed');
  }

  const d = json.data;
  const candidate =
    d.url ||
    d.display_url ||
    d.image?.url ||
    d.medium?.url ||
    d.thumb?.url ||
    '';

  const directLink = extractDirectImageUrl(String(candidate));
  if (!directLink) {
    throw new Error('ImgBB রেসপন্সে ইমেজ লিংক পাওয়া যায়নি');
  }

  return {
    inputValue: directLink,
    previewUrl: directLink,
    provider: 'imgbb',
  };
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractXmlTag(xml: string, tagName: string): string {
  const re = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(re);
  if (!match || !match[1]) return '';
  return decodeXmlEntities(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim());
}

async function uploadToPostImages(
  base64Payload: string,
  file: File
): Promise<UploadedImageResult> {
  const { stem, ext } = getFileNameAndExt(file);
  const bodyParams = new URLSearchParams({
    key: POSTIMAGES_API_KEY,
    version: '1.0.1',
    portable: '1',
    name: stem,
    type: ext,
    image: base64Payload,
    o: '2b819584285c102318568238c7d4a4c7',
    m: '59c2ad4b46b0c1e12d5703302bff0120',
  });

  const response = await fetch(POSTIMAGES_UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: bodyParams.toString(),
  });

  if (!response.ok) {
    throw new Error(`PostImages HTTP ${response.status}`);
  }

  const rawText = await response.text();
  if (!rawText || !rawText.trim()) {
    throw new Error('PostImages খালি রেসপন্স দিয়েছে');
  }

  let pageUrl = '';
  let directLink = '';
  let hotlinkForums = '';

  const trimmed = rawText.trim();
  if (trimmed.startsWith('{')) {
    const json = JSON.parse(trimmed);
    if (json?.status && String(json.status).toUpperCase() !== 'OK' && !json.direct_link && !json.url) {
      throw new Error(json?.error || 'PostImages আপলোড ব্যর্থ হয়েছে');
    }
    pageUrl = String(json.url || json.page || '').trim();
    directLink = extractDirectImageUrl(String(json.direct_link || json.original || json.image || json.thumbnail_url || ''));
    hotlinkForums = String(json.hotlink || json.bbcode || '').trim();
  } else {
    // Parse XML payload returned by PostImages API
    hotlinkForums = extractXmlTag(trimmed, 'hotlink') || extractXmlTag(trimmed, 'bbcode');
    directLink = extractDirectImageUrl(
      extractXmlTag(trimmed, 'direct_link') ||
        extractXmlTag(trimmed, 'direct') ||
        extractXmlTag(trimmed, 'original') ||
        extractXmlTag(trimmed, 'image') ||
        hotlinkForums
    );
    pageUrl = extractXmlTag(trimmed, 'page') || extractXmlTag(trimmed, 'url');
  }

  if (!hotlinkForums && directLink) {
    hotlinkForums = pageUrl
      ? `[url=${pageUrl}][img]${directLink}[/img][/url]`
      : `[img]${directLink}[/img]`;
  }

  const previewUrl = extractDirectImageUrl(hotlinkForums || directLink);
  const inputValue = hotlinkForums || directLink;

  if (!inputValue || !previewUrl) {
    throw new Error('PostImages থেকে ভ্যালিড ইমেজ লিংক পাওয়া যায়নি');
  }

  return {
    inputValue,
    previewUrl,
    provider: 'postimages',
  };
}

/**
 * Uploads a selected image file in the background:
 * 1) Primary: ImgBB (no expiration)
 * 2) Fallback on any error: PostImages.org (extracts Hotlink for forums)
 */
export async function uploadImageWithFallback(file: File): Promise<UploadedImageResult> {
  if (!file.type.startsWith('image/') && !/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name)) {
    throw new Error('অনুগ্রহ করে একটি বৈধ ছবির ফাইল নির্বাচন করুন।');
  }

  const base64Payload = await readFileAsBase64Payload(file);

  try {
    return await uploadToImgBB(base64Payload);
  } catch (imgbbError) {
    console.warn('ImgBB upload failed, switching to PostImages fallback:', imgbbError);
    try {
      return await uploadToPostImages(base64Payload, file);
    } catch (postImgError: any) {
      throw new Error(
        postImgError?.message || 'ছবি আপলোড করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।'
      );
    }
  }
}
