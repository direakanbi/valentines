
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create Supabase client without default schema
// We'll use explicit schema in queries: supabase.schema('valentine_orders').from('val_journeys')
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
