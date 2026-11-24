import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://veoyldrbaypjllzzkovc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_w8bSgcq_28dQ3rh6Ki0RPA_-vC-iMv6';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);