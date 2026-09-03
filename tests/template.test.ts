import { describe, expect, it } from "vitest";

import {
  DEFAULT_CLIP_TEMPLATE,
  isTemplateVariable,
  renderClipTemplate,
  templateToken,
  TEMPLATE_VARIABLES,
} from "../src/lib/template";
import type { TemplateVariables } from "../src/lib/template";

const variables: TemplateVariables = {
  content: "Selected\nparagraph",
  title: "A useful page",
  url: "https://example.com/page",
  description: "A practical guide.",
  tag: "#inbox",
};

describe("renderClipTemplate", () => {
  it("renders the default template into Markdown", () => {
    expect(renderClipTemplate(DEFAULT_CLIP_TEMPLATE, variables)).toBe(
      "Selected\nparagraph\n\n[A useful page](https://example.com/page)\n\n#inbox",
    );
  });

  it("replaces every supported variable and keeps surrounding text", () => {
    expect(
      renderClipTemplate(
        "{{title}}\n{{description}}\n\n<{{url}}>\n\n{{content}}\n\n{{tag}}",
        variables,
      ),
    ).toBe(
      "A useful page\nA practical guide.\n\n<https://example.com/page>\n\nSelected\nparagraph\n\n#inbox",
    );
  });

  it("leaves unknown placeholders untouched", () => {
    expect(
      renderClipTemplate("{{content}} by {{author}} and {{ 1 }}", variables),
    ).toBe("Selected\nparagraph by {{author}} and {{ 1 }}");
  });

  it("trims the result so empty values do not leave blank edges", () => {
    expect(
      renderClipTemplate(DEFAULT_CLIP_TEMPLATE, { ...variables, content: "" }),
    ).toBe("[A useful page](https://example.com/page)\n\n#inbox");
    expect(
      renderClipTemplate(DEFAULT_CLIP_TEMPLATE, {
        ...variables,
        content: "  ",
        description: "",
        tag: "",
      }),
    ).toBe("[A useful page](https://example.com/page)");
  });

  it("accepts optional whitespace inside placeholders", () => {
    expect(renderClipTemplate("{{ content }}", variables)).toBe(
      "Selected\nparagraph",
    );
  });

  it("returns an empty string for a blank template", () => {
    expect(renderClipTemplate("   ", variables)).toBe("");
  });
});

describe("template helpers", () => {
  it("exposes the supported variables", () => {
    expect(TEMPLATE_VARIABLES).toEqual([
      "content",
      "title",
      "url",
      "description",
      "tag",
    ]);
  });

  it("recognizes supported variable names", () => {
    expect(isTemplateVariable("url")).toBe(true);
    expect(isTemplateVariable("tag")).toBe(true);
    expect(isTemplateVariable("author")).toBe(false);
    expect(isTemplateVariable(42)).toBe(false);
  });

  it("builds literal tokens", () => {
    expect(templateToken("title")).toBe("{{title}}");
  });
});
