import { LibraryItem } from '../../types';

/**
 * HTTPS URL to pass to wp-proxy for install-from-zip (remote URL or public S3 base + path).
 * Set `LIBRARY_ZIP_PUBLIC_BASE_URL` (e.g. CloudFront or public bucket URL) for local S3 uploads.
 */
export function getLibraryZipHttpsUrl(item: LibraryItem): string | null {
  const r = item.remoteUrl?.trim();
  if (r?.startsWith('https://')) return r;
  const base =
    typeof import.meta !== 'undefined'
      ? ((import.meta as unknown as { env?: Record<string, string> }).env?.LIBRARY_ZIP_PUBLIC_BASE_URL ?? '')
      : '';
  const b = base.trim().replace(/\/$/, '');
  const path = item.s3Path?.trim().replace(/^\/+/, '');
  if (b.startsWith('https://') && path) {
    return `${b}/${path}`;
  }
  return null;
}
