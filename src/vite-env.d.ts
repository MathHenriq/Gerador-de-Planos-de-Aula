/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IA_ENDPOINT?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
