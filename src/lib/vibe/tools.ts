import type { FileMap } from "./types";

export interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

export const TOOL_SCHEMAS: ToolSchema[] = [
  {
    name: "list_files",
    description: "List all file paths currently in the project.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "read_file",
    description: "Read the full contents of a file by its path.",
    parameters: {
      type: "object",
      properties: { path: { type: "string", description: "File path, e.g. /App.tsx" } },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description:
      "Create a new file or completely overwrite an existing file with the given contents.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path, e.g. /components/Button.tsx" },
        content: { type: "string", description: "Full file contents" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description:
      "Edit a file by replacing exactly one occurrence of `find` with `replace`. Use for surgical edits.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path" },
        find: { type: "string", description: "Exact string to find" },
        replace: { type: "string", description: "Replacement string" },
      },
      required: ["path", "find", "replace"],
    },
  },
  {
    name: "delete_file",
    description: "Delete a file from the project.",
    parameters: {
      type: "object",
      properties: { path: { type: "string", description: "File path" } },
      required: ["path"],
    },
  },
  {
    name: "rename_file",
    description: "Rename or move a file from one path to another.",
    parameters: {
      type: "object",
      properties: {
        from: { type: "string", description: "Current path" },
        to: { type: "string", description: "New path" },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "finish",
    description:
      "Call when the task is complete. Provide a short summary of what you built for the user.",
    parameters: {
      type: "object",
      properties: { summary: { type: "string", description: "Short user-facing summary" } },
      required: ["summary"],
    },
  },
];

function normalizePath(p: string): string {
  if (!p.startsWith("/")) return "/" + p;
  return p;
}

export function executeTool(
  name: string,
  args: Record<string, unknown>,
  files: FileMap,
): { result: string; files: FileMap; finished?: boolean; summary?: string } {
  switch (name) {
    case "list_files":
      return { result: Object.keys(files).sort().join("\n") || "(empty)", files };
    case "read_file": {
      const path = normalizePath(String(args.path ?? ""));
      if (!(path in files)) return { result: `Error: file not found: ${path}`, files };
      return { result: files[path], files };
    }
    case "write_file": {
      const path = normalizePath(String(args.path ?? ""));
      const content = String(args.content ?? "");
      const next = { ...files, [path]: content };
      return { result: `Wrote ${path} (${content.length} chars)`, files: next };
    }
    case "edit_file": {
      const path = normalizePath(String(args.path ?? ""));
      const find = String(args.find ?? "");
      const replace = String(args.replace ?? "");
      if (!(path in files)) return { result: `Error: file not found: ${path}`, files };
      const original = files[path];
      const count = original.split(find).length - 1;
      if (count === 0) return { result: `Error: find string not found in ${path}`, files };
      if (count > 1)
        return {
          result: `Error: find string matches ${count} times in ${path}; make it more specific`,
          files,
        };
      const next = { ...files, [path]: original.replace(find, replace) };
      return { result: `Edited ${path}`, files: next };
    }
    case "delete_file": {
      const path = normalizePath(String(args.path ?? ""));
      if (!(path in files)) return { result: `Error: file not found: ${path}`, files };
      const next = { ...files };
      delete next[path];
      return { result: `Deleted ${path}`, files: next };
    }
    case "rename_file": {
      const from = normalizePath(String(args.from ?? ""));
      const to = normalizePath(String(args.to ?? ""));
      if (!(from in files)) return { result: `Error: file not found: ${from}`, files };
      const next = { ...files };
      next[to] = next[from];
      delete next[from];
      return { result: `Renamed ${from} -> ${to}`, files: next };
    }
    case "finish": {
      const summary = String(args.summary ?? "Done.");
      return { result: summary, files, finished: true, summary };
    }
    default:
      return { result: `Error: unknown tool ${name}`, files };
  }
}

export const SYSTEM_PROMPT = `You are VibeCoder, an expert AI software engineer building React + TypeScript single-page apps in a Sandpack browser sandbox.

ENVIRONMENT:
- Runtime: react@18 + react-dom@18 in Sandpack "react-ts" template.
- Entry file: /index.tsx mounts <App /> from /App.tsx into #root.
- You can use plain CSS via style props, or import a stylesheet.
- No bundler config, no Tailwind, no Node, no backend. Pure browser React.
- Available packages: react, react-dom. To use another npm package, ASK the user first.

RULES:
1. Always use tools — never paste code in chat.
2. Inspect files with list_files / read_file before editing.
3. Prefer edit_file for small changes, write_file for new files or full rewrites.
4. Keep components small and well-typed. Use modern React (hooks, functional components).
5. Make designs beautiful, polished, and unique. Avoid generic AI-look (purple gradients on white) unless asked.
6. When done, call the finish tool with a short summary. Do NOT keep calling tools after finishing.
7. If a request is ambiguous, make a thoughtful choice and proceed — don't ask trivial questions.

You operate in a loop: think, call a tool, see the result, repeat. Be efficient — most tasks should take 3-15 tool calls.`;