import { describe, expect, it } from "vitest";
import {
  isReadmeCollapsible,
  parseBranchFromReadmeHtmlUrl,
  readmeDirectory,
  rewriteReadmeRelativeUrls,
} from "./readme-preview";

const ctx = {
  owner: "octo",
  name: "hello",
  branch: "main",
  readmePath: "README.md",
};

describe("rewriteReadmeRelativeUrls", () => {
  it("rewrites relative images to raw.githubusercontent.com with branch", () => {
    const md = "![demo](./assets/demo.png)";
    const out = rewriteReadmeRelativeUrls(md, ctx);
    expect(out).toBe(
      "![demo](https://raw.githubusercontent.com/octo/hello/main/assets/demo.png)",
    );
  });

  it("resolves images relative to README subdirectory", () => {
    const md = "![x](images/a.png)";
    const out = rewriteReadmeRelativeUrls(md, {
      ...ctx,
      readmePath: "docs/README.md",
    });
    expect(out).toContain(
      "https://raw.githubusercontent.com/octo/hello/main/docs/images/a.png",
    );
  });

  it("converts github blob image URLs to raw.githubusercontent.com", () => {
    const md =
      "![bad](https://github.com/octo/hello/blob/main/screenshots/demo.png)";
    const out = rewriteReadmeRelativeUrls(md, ctx);
    expect(out).toContain(
      "https://raw.githubusercontent.com/octo/hello/main/screenshots/demo.png",
    );
  });

  it("rewrites HTML img src attributes", () => {
    const md = '<img src="./logo.png" alt="logo">';
    const out = rewriteReadmeRelativeUrls(md, ctx);
    expect(out).toBe(
      '<img src="https://raw.githubusercontent.com/octo/hello/main/logo.png" alt="logo">',
    );
  });

  it("rewrites relative links to github blob URLs", () => {
    const md = "See [guide](docs/guide.md) for details.";
    const out = rewriteReadmeRelativeUrls(md, ctx);
    expect(out).toContain("https://github.com/octo/hello/blob/main/docs/guide.md");
  });

  it("leaves external absolute URLs unchanged", () => {
    const md = "![cdn](https://cdn.example.com/x.png)";
    expect(rewriteReadmeRelativeUrls(md, ctx)).toBe(md);
  });

  it("rewrites docs/screenshots path without ./ prefix", () => {
    const md = "![deck](docs/screenshots/07-magazine-deck.png)";
    const out = rewriteReadmeRelativeUrls(md, ctx);
    expect(out).toBe(
      "![deck](https://raw.githubusercontent.com/octo/hello/main/docs/screenshots/07-magazine-deck.png)",
    );
  });

  it("rewrites images with optional title in parentheses", () => {
    const md = '![deck](docs/screenshots/07-magazine-deck.png "Magazine deck")';
    const out = rewriteReadmeRelativeUrls(md, ctx);
    expect(out).toBe(
      '![deck](https://raw.githubusercontent.com/octo/hello/main/docs/screenshots/07-magazine-deck.png "Magazine deck")',
    );
  });

  it("rewrites angle-bracket image URLs", () => {
    const md = "![deck](<docs/screenshots/07-magazine-deck.png>)";
    const out = rewriteReadmeRelativeUrls(md, ctx);
    expect(out).toBe(
      "![deck](https://raw.githubusercontent.com/octo/hello/main/docs/screenshots/07-magazine-deck.png)",
    );
  });

  it("rewrites HTML img src without quotes", () => {
    const md = "<img src=docs/screenshots/07-magazine-deck.png alt=deck>";
    const out = rewriteReadmeRelativeUrls(md, ctx);
    expect(out).toContain(
      "https://raw.githubusercontent.com/octo/hello/main/docs/screenshots/07-magazine-deck.png",
    );
  });

  it("rewrites image inside a markdown link", () => {
    const md = "[![deck](docs/screenshots/07-magazine-deck.png)](https://example.com)";
    const out = rewriteReadmeRelativeUrls(md, ctx);
    expect(out).toContain(
      "https://raw.githubusercontent.com/octo/hello/main/docs/screenshots/07-magazine-deck.png",
    );
  });
});

describe("parseBranchFromReadmeHtmlUrl", () => {
  it("extracts branch from html_url", () => {
    expect(
      parseBranchFromReadmeHtmlUrl(
        "https://github.com/octo/hello/blob/develop/README.md",
      ),
    ).toBe("develop");
  });
});

describe("readmeDirectory", () => {
  it("returns empty for root README", () => {
    expect(readmeDirectory("README.md")).toBe("");
  });

  it("returns parent dir for nested README", () => {
    expect(readmeDirectory("docs/guide/README.md")).toBe("docs/guide");
  });
});

describe("isReadmeCollapsible", () => {
  it("returns false for short README", () => {
    expect(isReadmeCollapsible("# Hi\n\nShort.")).toBe(false);
  });

  it("returns true for long README", () => {
    expect(isReadmeCollapsible("x".repeat(4000))).toBe(true);
  });
});
