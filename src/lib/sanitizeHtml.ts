import sanitizeHtml, { type IOptions } from "sanitize-html";

const POST_OPTIONS: IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "s",
    "h1",
    "h2",
    "h3",
    "h4",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
    "a",
    "img",
    "hr",
    "table",
    "thead",
    "tbody",
    "tr",
    "td",
    "th",
    "span",
    "video",
    "source",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    video: [
      "src",
      "controls",
      "autoplay",
      "loop",
      "muted",
      "playsinline",
      "poster",
      "preload",
      "width",
      "height",
    ],
    source: ["src", "type"],
    span: ["style"],
    "*": ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
    video: ["http", "https"],
    source: ["http", "https"],
  },
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        rel: "noopener noreferrer",
        target: attribs.target ?? "_blank",
      },
    }),
  },
};

export function sanitizePostHtml(input: string): string {
  if (!input) return "";
  return sanitizeHtml(input, POST_OPTIONS);
}
