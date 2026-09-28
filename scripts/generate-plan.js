#!/usr/bin/env node
// Genera data/plan-70-3.json a partir de las constantes de
// src/training/plan-config.js. Determinista: correrlo dos veces da el mismo
// archivo. Editá plan-config.js y volvé a correr esto, no el JSON a mano
// (aunque el JSON se puede tocar puntualmente: el seed respeta lo que haya).
//
//   node scripts/generate-plan.js

const fs = require('fs');
const path = require('path');

const C = require('../src/training/plan-config');
const { addDays, diffDays, dayOfWeek } = require('../src/training/dates');

// ---------------------------------------------------------------- utilidades

// Redondea a multiplos de 5 para que los objetivos se lean como los escribiria
// una persona ("45'", no "43'").
function round5(min) {
  return Math.max(5, Math.round(min / 5) * 5);
}

// Metros de natacion a multiplos de 100.
function round100(m) {
  return Math.max(100, Math.round(m / 100) * 100);
}

// Interpola linealmente entre los puntos de una tabla { semana: valor }.
// Antes del primer punto o despues del ultimo, devuelve el extremo.
function interpolate(table, week) {
  const points = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b)
    .map((w) => [w, table[String(w)]]);

  if (week <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (week >= last[0]) return last[1];

  for (let i = 0; i < points.length - 1; i++) {
    const [w0, v0] = points[i];
    const [w1, v1] = points[i + 1];
    if (week >= w0 && week <= w1) {
      const t = (week - w0) / (w1 - w0);
      return v0 + (v1 - v0) * t;
    }
  }
  return last[1];
}

// Reparte un total entre slots segun pesos relativos.
function splitByWeight(total, slots, weights) {
  const sum = slots.reduce((acc, s) => acc + (weights[s.kind] || 1), 0);
  return slots.map((s) => total * ((weights[s.kind] || 1) / sum));
}

// ------------------------------------------------------------ dias y sesiones

// Los slots de una semana, ya filtrados por la rampa de natacion.
function slotsForWeek(week) {
  const swimTarget = C.SWIM_RAMP[String(week)] != null
    ? C.SWIM_RAMP[String(week)]
    : 3;

  const slots = [];
  for (const day of C.DAYS) {
    for (const tpl of C.WEEK_TEMPLATE[day]) {
      slots.push({ day, sport: tpl.sport, kind: tpl.kind || null });
    }
  }

  // Si hay que nadar menos de 3 veces, se caen las natas desde el final de la
  // semana: primero el viernes (la de fondo), despues el jueves.
  const swims = slots.filter((s) => s.sport === 'swim');
  const drop = Math.max(0, swims.length - swimTarget);
  const dropped = new Set(swims.slice(swims.length - drop));

  return slots.filter((s) => !dropped.has(s));
}

// El trote del brick de esa semana, progresando de runMinFrom a runMinTo.
function brickRunMin(week) {
  const first = C.BRICK.startWeek;
  const lastWeek = C.WEEKS[C.WEEKS.length - 1].week;
  const t = Math.min(1, Math.max(0, (week - first) / (lastWeek - first)));
  return round5(C.BRICK.runMinFrom + (C.BRICK.runMinTo - C.BRICK.runMinFrom) * t);
}

function hasBrick(week) {
  return week >= C.BRICK.startWeek
    && (week - C.BRICK.startWeek) % C.BRICK.everyNWeeks === 0;
}

// -------------------------------------------------------------- descripciones

const SWIM_TEXT = {
  technique: (m) =>
    `Técnica + fondo suave. 300 m de nado suave para entrar, después ${Math.max(2, Math.round((m - 700) / 200))} bloques ` +
    `pensando en una sola cosa por largo (entrada de la mano, rotación del cuerpo, patada desde la cadera). ` +
    `Cerrá con nado continuo cómodo hasta completar ${m} m.`,
  endurance: (m) =>
    `Series medias. Después de 300 m de entrada, series de 200 m con 20 s de pausa hasta completar ${m} m. ` +
    `Contá brazadas por largo: debería ser siempre el mismo número. Si sube, estás perdiendo técnica y conviene cortar.`,
  long: (m) =>
    `Fondo continuo: ${m} m sin parar (o en 2 bloques grandes si todavía no da). ` +
    `Es la sesión que hace que 1,9 km se sienta corto el día de la carrera. Ritmo cómodo, respiración bilateral.`,
};

const RUN_TEXT = {
  quality: (min, week) => week < 1
    ? `Trote de calidad suave: ${min}' con los últimos 10' un poco más firmes. Todavía estamos entrando en ritmo, no fuerces.`
    : `Trote de calidad: 12' de entrada en Z2, bloque central firme (Z3–Z4) y 8' de vuelta a la calma. ` +
      `Total ${min}'. Es el único trote de la semana donde la FC sube: el resto va en Z2.`,
  easy: (min) =>
    `Trote fácil ${min}' en Z2, después de nadar. Piernas cansadas del agua: la idea es acumular minutos aeróbicos, ` +
    `no ritmo. Si la FC se va de Z2, caminá un poco.`,
  long: (min) =>
    `Fondo aeróbico: ${min}' en Z2, ritmo de conversación. Ya tenés base de trote, así que acá no buscamos progresar ` +
    `volumen sino sostenerlo fresco para que la bici se lleve la carga. Gel o banana si pasa de 75'.`,
};

const BIKE_TEXT = {
  quality: (min, week) => week < 1
    ? `Bici de calidad suave: ${min}' con 3–4 bloques de 4' un poco más fuertes. Rodillo perfectamente OK. ` +
      `Aprovechá para practicar cambios y cadencia (85–95 RPM).`
    : `Bici de calidad: ${min}' con bloques firmes en Z3–Z4 y recuperación en Z2 entre ellos. ` +
      `Rodillo OK — de hecho es mejor para sostener la intensidad sin semáforos.`,
  long: (min, week, cleats) => {
    const km = Math.round((min / 60) * 27);
    let text = `La sesión más importante de la semana: ${min}' en Z2 (≈${km} km). La bici es donde más tengo para ganar, ` +
      `así que esta salida manda sobre todo lo demás. FC promedio en Z2, no importa la velocidad. ` +
      `Comé algo cada 45–60' y llevá al menos 750 ml de agua.`;
    if (cleats) {
      text += ` TÉCNICA: dedicá los primeros 10' a calas — enganchar y desenganchar en cada parada, ` +
        `desengancharte antes de frenar, y chequear posición sobre la bici (rodilla sobre el eje del pedal, espalda larga).`;
    }
    return text;
  },
};

// ---------------------------------------------------------------- generacion

function buildSession(fields) {
  // Orden de claves estable para que el JSON sea diffeable.
  const out = {
    id: fields.id,
    date: fields.date,
    week: fields.week,
    phase: fields.phase,
    sport: fields.sport,
    title: fields.title,
  };
  if (fields.description) out.description = fields.description;
  if (fields.target_duration_min != null) out.target_duration_min = fields.target_duration_min;
  if (fields.target_distance_m != null) out.target_distance_m = fields.target_distance_m;
  if (fields.bike_duration_min != null) out.bike_duration_min = fields.bike_duration_min;
  if (fields.run_duration_min != null) out.run_duration_min = fields.run_duration_min;
  if (fields.intensity) out.intensity = fields.intensity;
  if (fields.is_key_session) out.is_key_session = true;
  if (fields.is_recovery_week) out.is_recovery_week = true;
  out.sort_order = fields.sort_order;
  return out;
}

function weekLabel(week) {
  // "w-2", "w00", "w05" — ordenable como string y legible.
  if (week < 0) return 'w-' + Math.abs(week);
  return 'w' + String(week).padStart(2, '0');
}

function generate() {
  const sessions = [];
  const weeksMeta = [];

  for (const wk of C.WEEKS) {
    const week = wk.week;
    const weekStart = addDays(C.PLAN_START, (week + 2) * 7);
    const recovery = wk.recovery === true;
    const cleats = C.CLEAT_TECHNIQUE_WEEKS.includes(week);
    const brick = hasBrick(week);
    const testRace = C.TEST_RACES[week];

    const slots = slotsForWeek(week);

    // El trote del brick sale del presupuesto de trote de la semana, no se
    // suma encima: si no, las semanas pares se pasan del objetivo.
    const brickRun = brick && !testRace ? brickRunMin(week) : 0;

    // --- bici: la larga sale de la progresion explicita, el resto del reparto.
    //
    // En las semanas con triatlon de prueba la carrera ocupa el lugar de la
    // bici larga, asi que su parte de bici sale del mismo presupuesto.
    const bikeSlots = slots.filter((s) => s.sport === 'bike');
    const bikeLongMin = testRace
      ? (testRace.bike_duration_min || (week === 12 ? 45 : 85))
      : round5(interpolate(C.BIKE_LONG_PROGRESSION, week));
    const bikeRest = Math.max(0, wk.bike_min - bikeLongMin);
    const bikeQualitySlots = bikeSlots.filter((s) => s.kind !== 'long');
    const bikeQualityMins = splitByWeight(bikeRest, bikeQualitySlots, C.VOLUME_SPLIT.bike)
      .map(round5);

    // --- trote: el largo se lleva ~40%, con techo de RUN_LONG_MAX_MIN.
    // Lo que se lleve el brick (o el trote del triatlon de prueba) se
    // descuenta del total antes de repartir.
    const testRaceRun = testRace ? (week === 12 ? 28 : 55) : 0;
    const runBudget = Math.max(0, wk.run_min - brickRun - testRaceRun);
    const runSlots = slots.filter((s) => s.sport === 'run');
    const runLongSlot = runSlots.find((s) => s.kind === 'long');
    let runLongMin = round5(Math.min(
      C.RUN_LONG_MAX_MIN,
      runBudget * C.VOLUME_SPLIT.run.long
    ));
    const runRest = Math.max(0, runBudget - runLongMin);
    const runOtherSlots = runSlots.filter((s) => s !== runLongSlot);
    const runOtherMins = splitByWeight(runRest, runOtherSlots, C.VOLUME_SPLIT.run)
      .map(round5);

    // --- natacion: reparto puro por peso, en metros.
    const swimSlots = slots.filter((s) => s.sport === 'swim');
    const swimMeters = splitByWeight(wk.swim_m, swimSlots, C.VOLUME_SPLIT.swim)
      .map(round100);

    let bikeQualityIdx = 0;
    let runOtherIdx = 0;
    let swimIdx = 0;

    for (const day of C.DAYS) {
      const date = addDays(weekStart, C.DAYS.indexOf(day));
      const daySlots = slots.filter((s) => s.day === day);
      let order = 0;

      // Taper: la fase cambia a mitad de semana 19, no en el limite de semana.
      const phase = date >= C.TAPER_START && wk.phase !== 'Race'
        ? 'Taper'
        : wk.phase;

      // Dia de la carrera: reemplaza todo lo que hubiera ese dia.
      if (date === C.RACE_DATE) {
        sessions.push(buildSession({
          id: `${weekLabel(week)}-${C.DAY_ABBR[day]}-race`,
          date, week, phase: 'Race', sport: 'race',
          title: 'IRONMAN 70.3',
          description: `1,9 km natación / 90 km bici / 21,1 km trote. ` +
            `Salí conservador en la bici: el trote se gana ahí. Nutrición cada 45' desde el km 10 de bici.`,
          target_duration_min: 360,
          target_distance_m: C.RACE.swim_m + C.RACE.bike_m + C.RACE.run_m,
          intensity: 'mixed',
          is_key_session: true,
          sort_order: 0,
        }));
        continue;
      }

      // Triatlon de prueba: reemplaza las sesiones de ese dia.
      if (testRace && testRace.day === day) {
        sessions.push(buildSession({
          id: `${weekLabel(week)}-${C.DAY_ABBR[day]}-testrace`,
          date, week, phase, sport: 'brick',
          title: testRace.title,
          description: testRace.description,
          target_duration_min: week === 12 ? 90 : 165,
          bike_duration_min: week === 12 ? 45 : 85,
          run_duration_min: week === 12 ? 28 : 55,
          intensity: 'mixed',
          is_key_session: true,
          is_recovery_week: recovery,
          sort_order: 0,
        }));
        // Consumimos el slot de bici larga de ese dia para no duplicar volumen.
        for (const s of daySlots) if (s.sport === 'bike' && s.kind === 'long') s.consumed = true;
        continue;
      }

      if (daySlots.length === 0 || daySlots.every((s) => s.sport === 'rest')) {
        sessions.push(buildSession({
          id: `${weekLabel(week)}-${C.DAY_ABBR[day]}-rest`,
          date, week, phase, sport: 'strength',
          title: 'Descanso',
          description: 'Descanso. Movilidad o yoga 15–20\' si tenés ganas, pero es opcional ' +
            'y no cuenta para el cumplimiento. La adaptación pasa acá.',
          is_recovery_week: recovery,
          sort_order: 0,
        }));
        continue;
      }

      for (const slot of daySlots) {
        if (slot.consumed) continue;
        const idBase = `${weekLabel(week)}-${C.DAY_ABBR[day]}`;

        if (slot.sport === 'swim') {
          const m = swimMeters[swimIdx];
          const minutes = round5(m / 40); // ~2:30/100 m con pausas
          sessions.push(buildSession({
            id: `${idBase}-swim`,
            date, week, phase, sport: 'swim',
            title: slot.kind === 'technique' ? 'Natación técnica'
              : slot.kind === 'long' ? 'Natación fondo' : 'Natación series',
            description: SWIM_TEXT[slot.kind](m),
            target_duration_min: minutes,
            target_distance_m: m,
            intensity: slot.kind === 'endurance' ? 'mixed' : 'Z2',
            is_key_session: slot.kind === 'long' && week >= 9,
            is_recovery_week: recovery,
            sort_order: order++,
          }));
          swimIdx++;
          continue;
        }

        if (slot.sport === 'bike') {
          if (slot.kind === 'long') {
            const isBrick = brickRun > 0;
            const runMin = isBrick ? brickRun : null;
            sessions.push(buildSession({
              id: `${idBase}-${isBrick ? 'brick' : 'bike'}`,
              date, week, phase,
              sport: isBrick ? 'brick' : 'bike',
              title: isBrick ? 'Bici larga + brick trote' : 'Bici larga',
              description: BIKE_TEXT.long(bikeLongMin, week, cleats) +
                (isBrick
                  ? ` BRICK: bajás de la bici y salís a trotar ${runMin}' sin pausa. ` +
                    `Los primeros 5' se sienten rarísimos y es exactamente el punto de la sesión.`
                  : ''),
              target_duration_min: isBrick ? bikeLongMin + runMin : bikeLongMin,
              bike_duration_min: isBrick ? bikeLongMin : null,
              run_duration_min: isBrick ? runMin : null,
              intensity: 'Z2',
              is_key_session: true,
              is_recovery_week: recovery,
              sort_order: order++,
            }));
          } else {
            const min = bikeQualityMins[bikeQualityIdx++];
            sessions.push(buildSession({
              id: `${idBase}-bike`,
              date, week, phase, sport: 'bike',
              title: 'Bici calidad',
              description: BIKE_TEXT.quality(min, week),
              target_duration_min: min,
              intensity: week < 1 ? 'Z2' : 'mixed',
              is_recovery_week: recovery,
              sort_order: order++,
            }));
          }
          continue;
        }

        if (slot.sport === 'run') {
          const isLong = slot.kind === 'long';
          const min = isLong ? runLongMin : runOtherMins[runOtherIdx++];
          sessions.push(buildSession({
            id: `${idBase}-run`,
            date, week, phase, sport: 'run',
            title: isLong ? 'Trote largo'
              : slot.kind === 'quality' ? 'Trote de calidad' : 'Trote fácil',
            description: RUN_TEXT[slot.kind](min, week),
            target_duration_min: min,
            intensity: slot.kind === 'quality' && week >= 1 ? 'mixed' : 'Z2',
            is_key_session: isLong && week >= 9,
            is_recovery_week: recovery,
            sort_order: order++,
          }));
        }
      }
    }

    // La semana 19 cruza a Taper a mitad: el header muestra la fase en la que
    // termina, que es la que describe como se siente esa semana.
    const weekEnd = addDays(weekStart, 6);
    const weekPhase = weekEnd >= C.TAPER_START && wk.phase !== 'Race'
      ? 'Taper'
      : wk.phase;

    weeksMeta.push({
      week,
      phase: weekPhase,
      start: weekStart,
      end: weekEnd,
      is_recovery_week: recovery,
      targets: { swim_m: wk.swim_m, bike_min: wk.bike_min, run_min: wk.run_min },
    });
  }

  return {
    generated_by: 'scripts/generate-plan.js',
    race_date: C.RACE_DATE,
    plan_start: C.PLAN_START,
    timezone: C.TIMEZONE,
    weeks: weeksMeta,
    sessions,
  };
}

// ------------------------------------------------------------------ chequeos

function validate(plan) {
  const errors = [];
  const ids = new Set();

  for (const s of plan.sessions) {
    if (ids.has(s.id)) errors.push(`id duplicado: ${s.id}`);
    ids.add(s.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date)) errors.push(`fecha invalida en ${s.id}: ${s.date}`);
    if (s.sport === 'brick' && (!s.bike_duration_min || !s.run_duration_min)) {
      errors.push(`brick sin partes: ${s.id}`);
    }
  }

  // Cada dia del plan tiene que existir, de PLAN_START a RACE_DATE.
  const total = diffDays(plan.plan_start, plan.race_date) + 1;
  const byDate = new Set(plan.sessions.map((s) => s.date));
  for (let i = 0; i < total; i++) {
    const d = addDays(plan.plan_start, i);
    if (!byDate.has(d)) errors.push(`dia sin sesiones: ${d}`);
  }

  // El lunes tiene que ser descanso y el domingo de carrera, race.
  const race = plan.sessions.filter((s) => s.sport === 'race');
  if (race.length !== 1) errors.push(`se esperaba 1 sesion race, hay ${race.length}`);
  if (race[0] && race[0].date !== plan.race_date) errors.push('la carrera no cae en race_date');
  if (dayOfWeek(plan.race_date) !== 0) errors.push('race_date no es domingo');

  return errors;
}

function summarize(plan) {
  const lines = [];
  for (const w of plan.weeks) {
    const s = plan.sessions.filter((x) => x.week === w.week);
    const swim = s.filter((x) => x.sport === 'swim');
    const bikeMin = s.reduce((a, x) => a +
      (x.sport === 'bike' ? x.target_duration_min : x.sport === 'brick' ? (x.bike_duration_min || 0) : 0), 0);
    const runMin = s.reduce((a, x) => a +
      (x.sport === 'run' ? x.target_duration_min : x.sport === 'brick' ? (x.run_duration_min || 0) : 0), 0);
    const swimM = swim.reduce((a, x) => a + (x.target_distance_m || 0), 0);
    const brick = s.some((x) => x.sport === 'brick') ? ' brick' : '';
    const long = s.find((x) => x.sport === 'bike' && x.title === 'Bici larga')
      || s.find((x) => x.sport === 'brick');
    lines.push(
      `w${String(w.week).padStart(3)} ${w.phase.padEnd(7)} ${w.start}  ` +
      `swim ${String(swimM).padStart(4)}/${String(w.targets.swim_m).padEnd(4)} (${swim.length}x)  ` +
      `bike ${String(bikeMin).padStart(3)}/${String(w.targets.bike_min).padEnd(3)} larga ${String(long ? (long.bike_duration_min || long.target_duration_min) : 0).padStart(3)}'  ` +
      `run ${String(runMin).padStart(3)}/${String(w.targets.run_min).padEnd(3)}` +
      (w.is_recovery_week ? '  REC' : '') + brick
    );
  }
  return lines.join('\n');
}

function main() {
  const plan = generate();
  const errors = validate(plan);

  if (errors.length) {
    console.error('El plan generado no valida:');
    for (const e of errors) console.error('  - ' + e);
    process.exit(1);
  }

  const outPath = path.join(__dirname, '..', 'data', 'plan-70-3.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(plan, null, 2) + '\n');

  console.log(summarize(plan));
  console.log(`\n${plan.sessions.length} sesiones en ${plan.weeks.length} semanas -> data/plan-70-3.json`);
}

if (require.main === module) main();

module.exports = { generate, validate, interpolate, splitByWeight };
