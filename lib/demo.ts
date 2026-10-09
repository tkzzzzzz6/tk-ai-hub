export const demoTypes = ["auto", "image", "video", "link"] as const;
export type DemoType = typeof demoTypes[number];
export type DemoFields = { demoUrl?: string; demoType?: DemoType };

export function validDemoUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password ? value.trim() : null;
  } catch { return null; }
}

export function demoKind(url: string, type: DemoType = "auto"): Exclude<DemoType, "auto"> {
  if (type !== "auto") return type;
  try {
    const path = new URL(url).pathname;
    if (/\.(?:png|jpe?g|webp|gif|avif|svg)$/i.test(path)) return "image";
    if (/\.(?:mp4|webm|ogv|mov|m4v)$/i.test(path)) return "video";
  } catch { /* Invalid links are omitted by the preview. */ }
  return "link";
}
