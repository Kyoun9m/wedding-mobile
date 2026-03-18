import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dhahkfdqaplkxdflczax.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoYWhrZmRxYXBsa3hkZmxjemF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTM0ODksImV4cCI6MjA4NzU4OTQ4OX0.Hkzo5mRe4vLBiLi3VgFA4Feb-lAtSIE9VvqeRyb6Umc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface GuestMessage {
  id: string;
  name: string;
  phone?: string;
  message?: string;
  audio_url?: string;
  duration?: number;
  type: 'voice' | 'text';
  created_at: string;
}
