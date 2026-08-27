import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * `null` quando o app roda sem as variáveis de ambiente do Supabase
 * configuradas (ex.: alguém rodando localmente sem `.env`, ou uma instância
 * simplificada sem login). O resto do app trata isso como "login
 * indisponível" em vez de quebrar a tela toda.
 */
export const supabase = url && chave ? createClient(url, chave) : null
