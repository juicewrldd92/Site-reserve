import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './database.types'
import { env, isSupabaseConfigured } from './env'

export type Client = SupabaseClient<Database>

/**
 * Client Supabase unique (Postgres + Auth + Storage + Realtime).
 *
 * Créé paresseusement : tant que les variables d'env ne sont pas renseignées,
 * l'app tourne en mode « non connecté » au lieu de planter au chargement.
 */
let client: Client | null = null

export function getSupabase(): Client {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase non configuré : renseigne VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local',
    )
  }
  client ??= createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  return client
}

export { isSupabaseConfigured }
