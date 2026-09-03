/**
 * Supported clip template variables. Each maps to a value captured from the
 * active tab at clip time, except `tag`, which renders the configured default
 * tag.
 */
export const TEMPLATE_VARIABLES = [
  "content",
  "title",
  "url",
  "description",
  "tag",
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

export const DEFAULT_CLIP_TEMPLATE =
  "{{content}}\n\n[{{title}}]({{url}})\n\n{{tag}}";

export interface TemplateVariables {
  content: string;
  title: string;
  url: string;
  description: string;
  tag: string;
}

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*\}\}/gu;

export function isTemplateVariable(
  value: unknown,
): value is TemplateVariable {
  return (
    typeof value === "string" &&
    (TEMPLATE_VARIABLES as readonly string[]).includes(value)
  );
}

/** Builds the literal `{{name}}` token for a supported variable. */
export function templateToken(variable: TemplateVariable): string {
  return `{{${variable}}}`;
}

/**
 * Replaces supported `{{variable}}` placeholders and leaves unknown ones
 * untouched. The rendered text is trimmed so empty variables never leave
 * dangling blank lines around the memo.
 */
export function renderClipTemplate(
  template: string,
  variables: TemplateVariables,
): string {
  return template
    .replace(PLACEHOLDER_PATTERN, (match, name: string) =>
      isTemplateVariable(name) ? (variables[name] ?? "") : match,
    )
    .trim();
}
