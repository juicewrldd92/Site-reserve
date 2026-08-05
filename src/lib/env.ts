/**
 * Accès typé aux variables d'environnement.
 *
 * L'app doit démarrer même sans Supabase configuré : au premier lancement
 * (et en Phase 0) on veut voir l'écran plutôt qu'un écran blanc.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

export const env = {
  supabaseUrl,
  supabaseAnonKey,
} as const

export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0
