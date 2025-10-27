export function escapePromptText(input: string | null | undefined): string {
  if (!input) return "";
  return input.replaceAll("{", "{{").replaceAll("}", "}}");
}

export function escapeTemplateBraces(input: string): string {
  return input.replaceAll("{", "{{").replaceAll("}", "}}");
}
