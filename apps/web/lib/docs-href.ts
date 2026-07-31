export function docsHrefForLocale(locale: string): string {
  if (locale === "zh-Hans") return "/docs/zh";
  if (locale === "ko") return "/docs/ko";
  if (locale === "ja") return "/docs/ja";
  return "/docs";
}
