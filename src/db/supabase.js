const { createClient } = require('@supabase/supabase-js');

// Proyecto Supabase dedicado a training (separado de Maneki, que tiene datos
// financieros). La publishable key es de lectura/insercion segun las policies
// de RLS: anon puede select e insert, nunca update ni delete.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kdybvbpllmpbhujheoll.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_THL13GN1akw-nBiqwPWAkw_0jYPDSCE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

module.exports = { supabase, SUPABASE_URL, SUPABASE_KEY };
