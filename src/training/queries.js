// Acceso a datos del training. Las lecturas van por la anon key (el
// calendario es publico); las escrituras por service role.

const { supabase } = require('../db/supabase');
const { admin } = require('../db/supabase-admin');
const { addDays } = require('./dates');

// Las sesiones de un rango de fechas, ordenadas como se muestran.
async function sessionsBetween(from, to) {
  const { data, error } = await supabase
    .from('planned_sessions')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function allSessions() {
  // Supabase corta en 1000 por defecto y el plan tiene ~210: entra holgado,
  // pero pedimos el rango explicito por las dudas.
  const { data, error } = await supabase
    .from('planned_sessions')
    .select('*')
    .order('date', { ascending: true })
    .order('sort_order', { ascending: true })
    .range(0, 4999);
  if (error) throw error;
  return data || [];
}

// Actividades de un rango de fechas locales. Usa la vista publica, que no
// expone raw_json ni nada geografico.
async function activitiesBetween(from, to) {
  const { data, error } = await supabase
    .from('activities_public')
    .select('*')
    .gte('start_date_local', from + 'T00:00:00')
    .lte('start_date_local', to + 'T23:59:59')
    .order('start_date_local', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function allActivities() {
  const { data, error } = await supabase
    .from('activities_public')
    .select('*')
    .order('start_date_local', { ascending: true })
    .range(0, 9999);
  if (error) throw error;
  return data || [];
}

async function overridesFor(sessionIds) {
  if (!sessionIds || !sessionIds.length) return [];
  const { data, error } = await supabase
    .from('session_overrides')
    .select('*')
    .in('session_id', sessionIds);
  if (error) throw error;
  return data || [];
}

async function allOverrides() {
  const { data, error } = await supabase.from('session_overrides').select('*');
  if (error) throw error;
  return data || [];
}

// Todo lo necesario para pintar un rango de fechas. El matcheo necesita ver
// +-1 dia alrededor del rango para detectar sesiones movidas.
async function loadRange(from, to) {
  const [sessions, activities] = await Promise.all([
    sessionsBetween(from, to),
    activitiesBetween(addDays(from, -1), addDays(to, 1)),
  ]);
  const overrides = await overridesFor(sessions.map((s) => s.id));
  return { sessions, activities, overrides };
}

// --------------------------------------------------------------- escrituras

async function setOverride(sessionId, patch) {
  const row = { session_id: sessionId, updated_at: new Date().toISOString(), ...patch };
  const { error } = await admin
    .from('session_overrides')
    .upsert(row, { onConflict: 'session_id' });
  if (error) throw error;
}

async function clearOverride(sessionId) {
  const { error } = await admin
    .from('session_overrides').delete().eq('session_id', sessionId);
  if (error) throw error;
}

async function getOverride(sessionId) {
  const { data, error } = await admin
    .from('session_overrides').select('*').eq('session_id', sessionId).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function getSession(sessionId) {
  const { data, error } = await supabase
    .from('planned_sessions').select('*').eq('id', sessionId).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function getSyncState(key) {
  const { data, error } = await admin
    .from('sync_state').select('value').eq('key', key).maybeSingle();
  if (error) throw error;
  return data ? data.value : null;
}

async function setSyncState(key, value) {
  const { error } = await admin.from('sync_state').upsert({
    key, value, updated_at: new Date().toISOString(),
  }, { onConflict: 'key' });
  if (error) throw error;
}

module.exports = {
  sessionsBetween, allSessions, activitiesBetween, allActivities,
  overridesFor, allOverrides, loadRange,
  setOverride, clearOverride, getOverride, getSession,
  getSyncState, setSyncState,
};
