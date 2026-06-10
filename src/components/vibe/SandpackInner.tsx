import { useEffect } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  useSandpack,
} from "@codesandbox/sandpack-react";

function ErrorListener({ onError }: { onError?: (msg: string | null) => void }) {
  const { sandpack, listen } = useSandpack();
  useEffect(() => {
    if (!onError) return;
    const stop = listen((msg: any) => {
      if (msg.type === "action" && msg.action === "show-error") {
        const text = [msg.title, msg.message].filter(Boolean).join(": ");
        onError(text);
      }
      if (msg.type === "start") onError(null);
      if (msg.type === "done" && msg.compilatonError === false) onError(null);
    });
    return () => stop();
  }, [listen, onError]);
  // Also surface sandpack.error if present
  useEffect(() => {
    if (!onError) return;
    const e = (sandpack as any).error;
    if (e?.message) onError(e.message);
  }, [sandpack, onError]);
  return null;
}

export default function SandpackInner({
  files,
  onError,
}: {
  files: Record<string, { code: string }>;
  onError?: (msg: string | null) => void;
}) {
  return (
    <SandpackProvider
      template="react-ts"
      files={files}
      theme="dark"
      customSetup={{
        dependencies: { react: "^18.2.0", "react-dom": "^18.2.0" },
      }}
    >
      <ErrorListener onError={onError} />
      <SandpackLayout style={{ height: "100%", border: 0 }}>
        <SandpackPreview
          showNavigator
          showRefreshButton
          showOpenInCodeSandbox={false}
          style={{ height: "100%" }}
        />
      </SandpackLayout>
    </SandpackProvider>
  );
}