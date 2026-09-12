const KEY = /^[a-zA-Z0-9][a-zA-Z0-9/_-]{0,127}$/;

export function mediaSrc(key: string): string {
  return `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function isMediaKey(key: string): boolean {
  return KEY.test(key);
}

function hashHue(key: string): number {
  let hash = 0;
  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  }
  return hash;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Development stand-in until the media store serves real bytes. */
export function placeholderSvg(key: string): string {
  const hue = hashHue(key);
  const label = escapeXml(key.split("/").at(-1) ?? key);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img">
  <rect width="1200" height="800" fill="hsl(${hue} 28% 88%)"/>
  <circle cx="420" cy="520" r="140" fill="none" stroke="hsl(${hue} 35% 32%)" stroke-width="18"/>
  <circle cx="780" cy="520" r="140" fill="none" stroke="hsl(${hue} 35% 32%)" stroke-width="18"/>
  <path d="M420 520 L560 320 H780 L780 520 M560 320 L500 520" fill="none" stroke="hsl(${hue} 40% 24%)" stroke-width="16" stroke-linejoin="round"/>
  <text x="600" y="160" text-anchor="middle" font-size="36" font-family="system-ui, sans-serif" fill="hsl(${hue} 40% 20%)">${label}</text>
</svg>`;
}
