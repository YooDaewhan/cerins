const VIDEO_EXT_RE = /\.(mp4|webm|ogv|m4v)(\?.*)?$/i;

export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return VIDEO_EXT_RE.test(url);
}
