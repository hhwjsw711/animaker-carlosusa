// Strips raw XML-style tool call tags that some models (Qwen, Kimi) output
// as plain text instead of using the structured function calling API.
// Matches from the first occurrence of a tool call tag to end of string,
// since everything after that point is tool call syntax, not user-facing text.

const TOOL_CALL_XML_RE =
  /<(?:tool_call|function=|\|tool_call\||\/tool_call|parameter=)[^>]*>[\s\S]*/;

export function sanitizeToolCallXml(text: string): string {
  return text.replace(TOOL_CALL_XML_RE, "").trimEnd();
}
