import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Minimal Markdown → React renderer for the legal pages (headings, paragraphs, bullet and
 * numbered lists, **bold**, *italic*, [links](url)). Everything else is plain text; no raw HTML
 * is ever injected, so content files can't add scripts.
 */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[2]) out.push(<strong key={k}>{m[2]}</strong>);
    else if (m[3]) out.push(<em key={k}>{m[3]}</em>);
    else {
      const href = m[5];
      out.push(
        href.startsWith("/") ? (
          <Link key={k} href={href}>
            {m[4]}
          </Link>
        ) : /^(https:|mailto:)/.test(href) ? (
          <a key={k} href={href} rel="noopener noreferrer">
            {m[4]}
          </a>
        ) : (
          m[4]
        ),
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function renderMarkdown(md: string): ReactNode[] {
  // Headings always stand alone, even without blank lines around them.
  const blocks = md
    .replace(/\r\n/g, "\n")
    .replace(/^(#{1,4}\s+.*)$/gm, "\n$1\n")
    .split(/\n{2,}/);
  return blocks.flatMap((block, b) => {
    const lines = block.split("\n").filter((l) => l.trim());
    if (!lines.length) return [];
    const key = `b${b}`;
    const h = lines[0].match(/^(#{1,4})\s+(.*)$/);
    if (h && lines.length === 1) {
      const level = Math.min(h[1].length + 1, 4); // "#" in a file becomes h2 (page has its own h1)
      const Tag = `h${level}` as "h2" | "h3" | "h4";
      return [<Tag key={key}>{inline(h[2], key)}</Tag>];
    }
    if (lines.every((l) => /^\s*[-*]\s+/.test(l)))
      return [
        <ul key={key}>
          {lines.map((l, i) => (
            <li key={i}>{inline(l.replace(/^\s*[-*]\s+/, ""), `${key}-${i}`)}</li>
          ))}
        </ul>,
      ];
    if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l)))
      return [
        <ol key={key}>
          {lines.map((l, i) => (
            <li key={i}>{inline(l.replace(/^\s*\d+[.)]\s+/, ""), `${key}-${i}`)}</li>
          ))}
        </ol>,
      ];
    return [<p key={key}>{inline(lines.join(" "), key)}</p>];
  });
}
