export function reviewShareURL(
  getShareableUrl: (path: string) => string,
  token: string,
): string {
  return getShareableUrl(`/guest/review/${encodeURIComponent(token)}`);
}
