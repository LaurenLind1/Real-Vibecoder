import { useMemo, useState, lazy, Suspense } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { FileIcon, FolderIcon, Loader2 } from "lucide-react";
import type { FileMap } from "@/lib/vibe/types";

const MonacoEditor = lazy(() => import("@monaco-editor/react").then((m) => ({ default: m.default })));

interface Props {
  files: FileMap;
  onChange: (files: FileMap) => void;
}

function getLanguage(path: string): string {
  if (path.endsWith(".tsx") || path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".jsx") || path.endsWith(".js")) return "javascript";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".html")) return "html";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".md")) return "markdown";
  return "plaintext";
}

export function EditorPane({ files, onChange }: Props) {
  const paths = useMemo(() => Object.keys(files).sort(), [files]);
  const [active, setActive] = useState<string>(paths[0] ?? "");
  const current = active && active in files ? active : paths[0];

  return (
    <div className="flex h-full">
      <div className="w-52 border-r bg-muted/30">
        <div className="px-3 py-2 border-b text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1">
          <FolderIcon className="h-3 w-3" /> Files
        </div>
        <ScrollArea className="h-[calc(100%-2rem)]">
          <div className="p-1">
            {paths.map((p) => (
              <button
                key={p}
                onClick={() => setActive(p)}
                className={`flex items-center gap-1.5 w-full text-left px-2 py-1 text-xs rounded hover:bg-accent ${
                  current === p ? "bg-accent font-medium" : ""
                }`}
              >
                <FileIcon className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{p}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
      <div className="flex-1 min-w-0">
        {current ? (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            }
          >
            <MonacoEditor
              height="100%"
              theme="vs-dark"
              path={current}
              language={getLanguage(current)}
              value={files[current]}
              onChange={(value) => onChange({ ...files, [current]: value ?? "" })}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                tabSize: 2,
                scrollBeyondLastLine: false,
              }}
            />
          </Suspense>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No files yet
          </div>
        )}
      </div>
    </div>
  );
}