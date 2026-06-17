import { api, Tool, ToolRun } from "./api";

/** Result of running a tool. */
export type ToolResult = ToolRun;

/** Does this tool's match regex apply to the given content? */
export function toolMatches(tool: Tool, content: string): boolean {
  if (!tool.match) return false;
  try {
    return new RegExp(tool.match).test(content);
  } catch {
    return false;
  }
}

/**
 * Run a tool against the clip. Execution happens in Rust: the tool's command
 * runs in its folder and writes an output file, which is parsed into a ToolRun.
 */
export async function runTool(tool: Tool, input: string): Promise<ToolResult> {
  try {
    return await api.runTool(tool.id, input);
  } catch (err) {
    return { ok: false, result: null, message: null, error: String(err) };
  }
}
