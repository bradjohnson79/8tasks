import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

const DIR = join(process.cwd(), "content", "legal");

describe("legal content", () => {
  it("never ships an unresolved [CONFIRM …] marker", () => {
    for (const f of readdirSync(DIR).filter((x) => x.endsWith(".md")))
      expect(readFileSync(join(DIR, f), "utf8"), f).not.toContain("[CONFIRM");
  });

  it("renders markdown safely (no raw HTML, only https/mailto/internal links)", () => {
    const html = renderToStaticMarkup(
      <>
        {renderMarkdown(
          "# Title\n\nHello **bold** <script>x</script> [a](/legal/terms) [b](javascript:alert(1)) [c](mailto:x@y.z)\n\n- one\n- two\n\n1. first",
        )}
      </>,
    );
    expect(html).toContain("<h2>Title</h2>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('href="/legal/terms"');
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="mailto:x@y.z"');
    expect(html).toContain("<ul><li>one</li><li>two</li></ul>");
    expect(html).toContain("<ol><li>first</li></ol>");
  });
});
