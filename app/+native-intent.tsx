import { extractTokenFromUrl, setPendingDeepLinkToken } from '@/src/services/deepLinkToken';

// Uygulamayı açan her link buradan geçer. `token` taşıyan SSO linki (ör. boostifyexam://login?token=...)
// hangi path ile gelirse gelsin ana sayfaya yönlenir; token, girişi yapacak DeepLinkLoginHandler'a bırakılır.
// Token'sız linkler (dev client linkleri dahil) olduğu gibi geçer.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  const token = extractTokenFromUrl(path);
  if (!token) return path;

  setPendingDeepLinkToken(token);
  return '/';
}
