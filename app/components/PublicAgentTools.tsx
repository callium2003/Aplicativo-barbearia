"use client";

import { useEffect } from "react";
import { publicTools, executePublicTool } from "../../utils/agent-content";

type ModelContext = {
  registerTool: (tool: { name: string; description: string; inputSchema: object; annotations: object; execute: (args: unknown) => Promise<unknown> }, options?: { signal: AbortSignal }) => void | Promise<void>;
  unregisterTool?: (name: string) => void;
};

export default function PublicAgentTools() {
  useEffect(() => {
    // Current draft uses Document; older experimental browsers use Navigator.
    const current = (document as Document & { modelContext?: ModelContext }).modelContext;
    const context = current ?? (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    const registered: string[] = [];
    for (const tool of publicTools) {
      try {
        const registration = context.registerTool({ ...tool, execute: async args => executePublicTool(tool.name, args) }, current ? { signal: controller.signal } : undefined);
        registered.push(tool.name);
        Promise.resolve(registration).catch(() => { /* Experimental API may be disabled by browser policy. */ });
      } catch { /* Unsupported experimental implementations must not break the landing. */ }
    }
    return () => {
      controller.abort();
      if (!current) for (const name of registered) context.unregisterTool?.(name);
    };
  }, []);
  return null;
}
