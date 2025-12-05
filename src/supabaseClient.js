import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { CapacitorStorage } from './utils/capacitorStorage'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// Use secure native storage for mobile apps, localStorage for web
const storage = Capacitor.isNativePlatform() ? CapacitorStorage : undefined

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
