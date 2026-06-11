import { useState, useEffect } from "react";

export type ProviderId = 
  | "gemini" 
  | "openai" 
  | "anthropic" 
  | "lovable" 
  | "grok" 
  | "mistral" 
  | "groq" 
  | "deepseek" 
  | "openrouter" 
  | "custom";

export interface ProviderKey {
  id: string; // Unique ID for this key entry
  providerId: ProviderId;
  label: string; // e.g., "My Work OpenAI Key"
  apiKey: string;
  baseURL?: string; // Only needed for custom/OpenAI-compatible endpoints
  enabled: boolean;
}

const STORAGE_KEY = "vibecoder.providers.v1";

export function useProviders() {
  const [providers, setProviders] = useState<ProviderKey[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from LocalStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setProviders(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse stored providers", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to LocalStorage whenever providers change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
    }
  }, [providers, isLoaded]);

  const addProvider = (provider: Omit<ProviderKey, "id">) => {
    const newProvider: ProviderKey = {
      ...provider,
      id: crypto.randomUUID(),
    };
    setProviders((prev) => [...prev, newProvider]);
  };

  const removeProvider = (id: string) => {
    setProviders((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleProvider = (id: string, enabled: boolean) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled } : p))
    );
  };

  return {
    providers,
    isLoaded,
    addProvider,
    removeProvider,
    toggleProvider,
  };
}
