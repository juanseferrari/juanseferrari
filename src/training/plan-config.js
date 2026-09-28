// Configuracion del plan de 70.3. Todo lo editable a mano vive aca; el
// generador (scripts/generate-plan.js) no tiene numeros propios.
//
// Base: plan de 20 semanas de Triathlete para primer 70.3 (Matt Fitzgerald),
// mas 3 semanas de pre-base y los ajustes por historial propio.

const TIMEZONE = 'America/Argentina/Buenos_Aires';

// Domingo 7 de marzo de 2027.
const RACE_DATE = '2027-03-07';

// Primer dia de la pre-base (lunes 28/9/2026). El generador deriva todas las
// fechas de aca, asi que mover esto corre el plan entero.
const PLAN_START = '2026-09-28';

// Que sesion va cada dia de la semana. Cambiar el orden de los deportes aca
// reordena el plan sin tocar el generador.
//
//   rest     descanso (no cuenta para cumplimiento)
//   swim/bike/run  una sesion de ese deporte
//   El sabado ademas puede llevar brick (ver BRICK).
const WEEK_TEMPLATE = {
  monday:    [{ sport: 'rest' }],
  tuesday:   [{ sport: 'swim', kind: 'technique' }, { sport: 'run', kind: 'quality' }],
  wednesday: [{ sport: 'bike', kind: 'quality' }],
  thursday:  [{ sport: 'swim', kind: 'endurance' }, { sport: 'run', kind: 'easy' }],
  friday:    [{ sport: 'swim', kind: 'long' }],
  saturday:  [{ sport: 'bike', kind: 'long' }],
  sunday:    [{ sport: 'run', kind: 'long' }],
};

// Orden de los dias, empezando en lunes.
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Abreviatura usada en los ids de sesion ("w05-tue-swim").
const DAY_ABBR = {
  monday: 'mon', tuesday: 'tue', wednesday: 'wed',
  thursday: 'thu', friday: 'fri', saturday: 'sat', sunday: 'sun',
};

// Reparto del volumen semanal.
//
// La bici larga se lleva ~45% del volumen de bici y el trote largo ~40% del de
// trote; el resto se reparte entre las demas sesiones de ese deporte segun su
// peso relativo. Los pesos son relativos entre si, no porcentajes.
const VOLUME_SPLIT = {
  bike: { long: 0.45, quality: 1 },
  run:  { long: 0.40, quality: 1.15, easy: 1 },
  // Natacion: los metros se reparten por peso, sin sesion dominante.
  swim: { technique: 0.85, endurance: 1, long: 1.15 },
};

// La pre-base arranca con 2 natas semanales (vengo de ~1 por semana) y sube a
// 3 en la semana 0. Los dias que se saltan salen de WEEK_TEMPLATE en orden
// inverso: primero se cae la del viernes.
const SWIM_RAMP = {
  // semana -> cantidad de natas. Las semanas no listadas usan las 3 del template.
  '-2': 2,
  '-1': 2,
  '0': 3,
};

// Bricks: semanas pares desde la 2, el sabado, despues de la bici larga.
const BRICK = {
  startWeek: 2,
  everyNWeeks: 2,
  day: 'saturday',
  // El trote del brick progresa de 15' a 30' a lo largo del plan.
  runMinFrom: 15,
  runMinTo: 30,
};

// Bici prioritaria: es mi punto mas debil (salida mas larga 28 km, recien
// empiezo con calas). La larga del sabado progresa de ~60' a ~3h en la semana
// 17, independiente del reparto por porcentaje.
const BIKE_LONG_PROGRESSION = {
  // semana -> minutos de la bici larga. El generador interpola linealmente
  // entre los puntos listados y respeta estos valores exactos.
  '-2': 60,
  '0': 75,
  '4': 90,
  '8': 110,
  '12': 130,
  '15': 160,
  '17': 180,   // ~80-90 km, el pico
  '18': 150,
  '19': 110,
  '20': 50,
};

// Semanas donde la bici larga incluye nota de tecnica de calas.
const CLEAT_TECHNIQUE_WEEKS = [-2, -1, 0, 1, 2, 3];

// Trote: ya tengo base (media en ~1:45 en agosto 2026, fondos de hasta 32 km).
// Se mantiene el volumen del plan, el largo no pasa de 1h45 y la mayoria es Z2.
const RUN_LONG_MAX_MIN = 105;

// Triatlones de prueba opcionales.
const TEST_RACES = {
  12: { day: 'saturday', title: 'Triatlón sprint (opcional)',
        description: '750 m natación / 20 km bici / 5 km trote. Es de prueba: ' +
          'sirve para ensayar transiciones, nutrición y ritmo. Si no aparece uno ' +
          'cerca, hacelo solo como simulacro.' },
  16: { day: 'saturday', title: 'Triatlón olímpico (opcional)',
        description: '1,5 km natación / 40 km bici / 10 km trote. El ensayo más ' +
          'parecido al 70.3 antes del pico. Corré a ritmo de entrenamiento, no a fondo.' },
};

// Taper de 10 dias: arranca el jueves 25/2/2027.
const TAPER_START = '2027-02-25';

// Volumen semanal objetivo. Natacion en metros; bici y trote en minutos
// totales de la semana.
const WEEKS = [
  { week: -2, phase: 'PreBase', swim_m: 2000, bike_min:  90, run_min:  90 },
  { week: -1, phase: 'PreBase', swim_m: 2500, bike_min: 120, run_min:  95 },
  { week:  0, phase: 'PreBase', swim_m: 3000, bike_min: 140, run_min: 100 },
  { week:  1, phase: 'Base',    swim_m: 3600, bike_min: 165, run_min: 105 },
  { week:  2, phase: 'Base',    swim_m: 3800, bike_min: 175, run_min: 110 },
  { week:  3, phase: 'Base',    swim_m: 3900, bike_min: 185, run_min: 115 },
  { week:  4, phase: 'Base',    swim_m: 2800, bike_min: 135, run_min:  85, recovery: true },
  { week:  5, phase: 'Base',    swim_m: 4200, bike_min: 205, run_min: 125 },
  { week:  6, phase: 'Base',    swim_m: 4400, bike_min: 215, run_min: 130 },
  { week:  7, phase: 'Base',    swim_m: 4500, bike_min: 225, run_min: 135 },
  { week:  8, phase: 'Base',    swim_m: 3300, bike_min: 165, run_min: 100, recovery: true },
  { week:  9, phase: 'Build',   swim_m: 4800, bike_min: 240, run_min: 145 },
  { week: 10, phase: 'Build',   swim_m: 5000, bike_min: 250, run_min: 150 },
  { week: 11, phase: 'Build',   swim_m: 5200, bike_min: 260, run_min: 155 },
  { week: 12, phase: 'Build',   swim_m: 3500, bike_min: 175, run_min: 105, recovery: true },
  { week: 13, phase: 'Build',   swim_m: 5500, bike_min: 280, run_min: 165 },
  { week: 14, phase: 'Build',   swim_m: 5600, bike_min: 290, run_min: 170 },
  { week: 15, phase: 'Peak',    swim_m: 5800, bike_min: 300, run_min: 175 },
  { week: 16, phase: 'Peak',    swim_m: 3900, bike_min: 200, run_min: 120, recovery: true },
  { week: 17, phase: 'Peak',    swim_m: 6100, bike_min: 320, run_min: 185 },
  { week: 18, phase: 'Peak',    swim_m: 5500, bike_min: 290, run_min: 170 },
  // La 19 arranca en Peak y cruza a Taper el jueves 25/2 (ver TAPER_START).
  { week: 19, phase: 'Peak',    swim_m: 4300, bike_min: 225, run_min: 130 },
  { week: 20, phase: 'Taper',   swim_m: 2400, bike_min: 130, run_min:  75 },
];

// Datos de la carrera.
const RACE = {
  swim_m: 1900,
  bike_m: 90000,
  run_m: 21100,
};

// FC maxima medida, usada para las zonas.
const FC_MAX = 171;

const ZONES = [
  { z: 'Z1', name: 'Recuperación',  pct: [0, 0.60],    color: '#5DCAA5', desc: 'Caminata rápida. Podés cantar.' },
  { z: 'Z2', name: 'Base aeróbica', pct: [0.60, 0.70], color: '#378ADD', desc: 'Podés hablar en oraciones.' },
  { z: 'Z3', name: 'Tempo',         pct: [0.70, 0.80], color: '#EF9F27', desc: 'Incómodo pero sostenible.' },
  { z: 'Z4', name: 'Umbral',        pct: [0.80, 0.90], color: '#D85A30', desc: 'Muy duro. Solo en intervalos.' },
  { z: 'Z5', name: 'Máximo',        pct: [0.90, 1],    color: '#E24B4A', desc: 'Sprints. No podés hablar.' },
];

const PHASE_COLORS = {
  PreBase: '#8A8A85',
  Base:    '#1D9E75',
  Build:   '#378ADD',
  Peak:    '#D85A30',
  Taper:   '#534AB7',
  Race:    '#BA7517',
};

module.exports = {
  TIMEZONE, RACE_DATE, PLAN_START, TAPER_START,
  WEEK_TEMPLATE, DAYS, DAY_ABBR,
  VOLUME_SPLIT, SWIM_RAMP, BRICK,
  BIKE_LONG_PROGRESSION, CLEAT_TECHNIQUE_WEEKS, RUN_LONG_MAX_MIN,
  TEST_RACES, WEEKS, RACE,
  FC_MAX, ZONES, PHASE_COLORS,
};
