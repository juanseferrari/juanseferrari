#!/usr/bin/env node
// Carga data/plan-70-3.json en la tabla planned_sessions. Idempotente:
// upsert por id, asi que se puede correr las veces que haga falta.
//
//   node scripts/seed-plan.js            carga el plan
//   node scripts/seed-plan.js --dry      muestra que haria, sin escribir
//   node scripts/seed-plan.js --prune    ademas borra las sesiones que ya no
//                                        estan en el JSON
//
// Los overrides no se tocan: session_overrides tiene FK a planned_sessions
// con ON DELETE CASCADE, asi que --prune si se lleva los overrides de las
// sesiones borradas (que es lo correcto: la sesion ya no existe).

const fs = require('fs');
const path = require('path');
const { admin } = require('../src/db/supabase-admin');

const DRY = process.argv.includes('--dry');
const PRUNE = process.argv.includes('--prune');

const PLAN_PATH = path.join(__dirname, '..', 'data', 'plan-70-3.json');

// Supabase se pone lento con upserts muy grandes en una sola llamada.
const CHUNK = 100;

function toRow(s) {
  return {
    id: s.id,
    date: s.date,
    week: s.week,
    phase: s.phase,
    sport: s.sport,
    title: s.title,
    description: s.description || null,
    target_duration_min: s.target_duration_min != null ? s.target_duration_min : null,
    target_distance_m: s.target_distance_m != null ? s.target_distance_m : null,
    bike_duration_min: s.bike_duration_min != null ? s.bike_duration_min : null,
    run_duration_min: s.run_duration_min != null ? s.run_duration_min : null,
    intensity: s.intensity || null,
    is_key_session: s.is_key_session === true,
    is_recovery_week: s.is_recovery_week === true,
    sort_order: s.sort_order || 0,
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  if (!fs.existsSync(PLAN_PATH)) {
    console.error('No existe data/plan-70-3.json. Corré primero: npm run plan:generate');
    process.exit(1);
  }

  const plan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf8'));
  const rows = plan.sessions.map(toRow);

  console.log(`Plan: ${rows.length} sesiones, carrera el ${plan.race_date}.`);

  if (DRY) {
    const { data: existing } = await admin.from('planned_sessions').select('id');
    const have = new Set((existing || []).map((r) => r.id));
    const nuevas = rows.filter((r) => !have.has(r.id)).length;
    const sobran = [...have].filter((id) => !rows.some((r) => r.id === id));
    console.log(`  ${nuevas} nuevas, ${rows.length - nuevas} actualizadas.`);
    console.log(`  ${sobran.length} en la DB que ya no están en el JSON${sobran.length ? ': ' + sobran.slice(0, 5).join(', ') + (sobran.length > 5 ? '…' : '') : ''}.`);
    console.log('(--dry: no se escribió nada)');
    return;
  }

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await admin
      .from('planned_sessions')
      .upsert(chunk, { onConflict: 'id' });
    if (error) throw error;
    console.log(`  upsert ${i + chunk.length}/${rows.length}`);
  }

  if (PRUNE) {
    const ids = rows.map((r) => r.id);
    const { data: existing, error } = await admin.from('planned_sessions').select('id');
    if (error) throw error;
    const sobran = (existing || []).map((r) => r.id).filter((id) => !ids.includes(id));
    if (sobran.length) {
      const { error: delErr } = await admin.from('planned_sessions').delete().in('id', sobran);
      if (delErr) throw delErr;
      console.log(`  borradas ${sobran.length} sesiones que ya no están en el JSON`);
    } else {
      console.log('  nada para borrar');
    }
  }

  const { count } = await admin
    .from('planned_sessions')
    .select('id', { count: 'exact', head: true });
  console.log(`Listo. ${count} sesiones en la DB.`);
}

main().catch((err) => {
  console.error('Falló el seed:', err.message || err);
  process.exit(1);
});
