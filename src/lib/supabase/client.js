/// <reference types="vite/types/importMeta.d.ts" />
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  );
}

// This is a plain SPA (no per-request server rendering), so one client instance is created once
// and shared everywhere — storage.js and profiles.jsx both import this singleton rather than
// each calling createClient() themselves, which would spin up duplicate auth listeners.
export const supabase = createClient()
