import { useState } from "react";

const FC_MAX = 171;
const zones = [
  { z: "Z1", name: "Recuperación",     pct: [0,   0.60], color: "#5DCAA5", desc: "Caminata rápida. Podés cantar." },
  { z: "Z2", name: "Base aeróbica",    pct: [0.60,0.70], color: "#378ADD", desc: "Podés hablar en oraciones. La zona más importante." },
  { z: "Z3", name: "Tempo",            pct: [0.70,0.80], color: "#EF9F27", desc: "Incómodo pero sostenible. Frases cortas." },
  { z: "Z4", name: "Umbral",           pct: [0.80,0.90], color: "#D85A30", desc: "Muy duro. Solo en intervalos. Solo palabras sueltas." },
  { z: "Z5", name: "Máximo",           pct: [0.90,1.00], color: "#E24B4A", desc: "Sprints. No podés hablar." },
];
function zRange(z) {
  return `${Math.round(FC_MAX*z.pct[0])}–${Math.round(FC_MAX*z.pct[1])} lpm`;
}

const glossary = {
  "fondo": {
    title: "Carrera de fondo (Z2)",
    body: `La carrera de fondo es la sesión más importante del plan. Consiste en correr durante un tiempo prolongado a un ritmo cómodo, donde podés mantener una conversación sin dificultad.

Para vos, eso significa mantenerte en Z2: entre 103 y 120 lpm. Si tu FC sube de 120, reducí el ritmo. Si tenés que caminar al principio para no pasarte, está perfectamente bien.

El objetivo no es ir rápido, sino acumular tiempo en movimiento aeróbico. Esto desarrolla mitocondrias, mejora la eficiencia del corazón, entrena tu cuerpo a usar grasa como combustible y construye la base sobre la que después se agrega intensidad.

Ritmo esperado para vos: 5:45–6:30 min/km dependiendo del terreno y la temperatura.`,
  },
  "strides": {
    title: "Strides (aceleraciones controladas)",
    body: `Los strides son aceleraciones cortas de 20–30 segundos al final de una carrera fácil. No son sprints, sino una progresión controlada: empezás al 70% y llegás al 90–95% de tu esfuerzo máximo, luego reducís suave.

¿Para qué sirven? Activan el sistema neuromuscular, mejoran la eficiencia de la zancada y preparan el cuerpo para correr rápido sin acumular fatiga. Son la herramienta más barata del entrenamiento de carrera.

Cómo hacerlos: después de 50–55 minutos de carrera Z2, hacé 3–4 strides de 25 segundos con 60–90 segundos de trote suave entre cada uno. Tu FC va a subir a Z4–Z5 brevemente, pero se recupera rápido.`,
  },
  "ladrillo": {
    title: "Ladrillo (brick workout)",
    body: `Un ladrillo es la combinación de dos disciplinas en una misma sesión, sin descanso entre ellas. El más común en triatlón es bici seguido de carrera.

El objetivo es entrenar la "transición muscular": cuando bajás de la bici, tus piernas están acostumbradas al movimiento circular del pedaleo y de repente tienen que correr. Los primeros minutos se sienten rarísimos, como si las piernas fueran de plomo. Eso es exactamente lo que el ladrillo entrena a superar.

Cómo hacerlo: terminás la bici, dejás la bici (en casa o en el auto), te ponés las zapatillas y salís a correr inmediatamente. No hay pausa. Los primeros 10 minutos son incómodos, después mejora.

El día de la carrera el ladrillo es bici 90km → carrera 21km. Si nunca hiciste esa transición antes, te va a sorprender negativamente. Los ladrillos eliminan esa sorpresa.`,
  },
  "sweet spot": {
    title: "Sweet spot (zona dulce)",
    body: `El sweet spot es una intensidad entre Z3 y Z4, aproximadamente el 85–90% de tu umbral de lactato. Es el rango donde se genera la mayor adaptación aeróbica por unidad de tiempo, sin el costo de recuperación del trabajo a umbral o VO2max.

Para vos en bici, es pedalear sintiéndote "moderadamente duro": podés hablar pero preferirías no hacerlo, y podés mantener ese esfuerzo 20–40 minutos seguidos.

En términos de FC, sweet spot para vos estaría entre 130–145 lpm. Se usa en la Fase 3 cuando ya tenés base y el cuerpo puede absorber más intensidad.`,
  },
  "Z2 en bici": {
    title: "Bici en zona 2",
    body: `Andar en bici a Z2 es más difícil de calibrar que correr, especialmente al principio. En descensos tu FC baja aunque estés pedaleando, y en subidas sube aunque no quieras. El objetivo es la FC promedio de la sesión, no el pico.

Para vos: 103–120 lpm durante la mayor parte de la salida. Los primeros 10–15 minutos son de calentamiento (Z1), y los últimos 10 de enfriamiento.

Ritmo en ruta: va a depender del terreno. No importa la velocidad, importa la FC. Un rodillo es ideal para las sesiones Z2 porque no hay variables externas: podés mantenerte exactamente en zona sin que un semáforo o una bajada te saquen.

Cadencia recomendada: 85–95 RPM. Pedalear con cadencia alta y poca resistencia es más eficiente y menos desgastante para las rodillas.`,
  },
  "series de nado": {
    title: "Series de natación",
    body: `Las series de natación son repeticiones de distancias cortas con descanso entre ellas. Por ejemplo: 8×100m con 20 segundos de pausa entre cada uno.

¿Por qué no nadar todo de corrido? Porque al fragmentar la distancia podés mantener mejor técnica y nadar a un ritmo más alto. Si nadás 2000m continuos, inevitablemente te relajás y te volvés más ineficiente. Con series, cada 100m prestás atención a la brazada, la patada y la respiración.

En las primeras fases las series son más cortas (100–200m) con más pausa. A medida que avanzás, las series se alargan y la pausa se acorta, hasta que en la Fase 4 estás nadando bloques de 800m–1000m con pausa mínima.

Ritmo de referencia para vos (estimado): 2:00–2:15 min/100m en Z2, que te daría los 1900m en alrededor de 38–43 minutos.`,
  },
  "tempo en carrera": {
    title: "Carrera tempo",
    body: `Una carrera tempo es una sesión en la que corres entre 20 y 40 minutos a Z3–Z4, precedida y seguida de calentamiento y enfriamiento en Z1–Z2.

Es el tipo de entrenamiento que más mejora el umbral de lactato: el punto donde el cuerpo empieza a acumular ácido láctico más rápido de lo que puede eliminarlo. Subir ese umbral significa poder correr más rápido antes de que "te queme".

Para vos en la Fase 3: calentamiento 15 min (Z1→Z2), luego 25–30 min a Z3 (120–137 lpm), luego 10 min de enfriamiento. El ritmo en la parte tempo debería ser aproximadamente 5:00–5:15 min/km, pero guiate por FC, no por ritmo.`,
  },
  "fuerza tren inferior": {
    title: "Fuerza — tren inferior para triatlón",
    body: `La fuerza no es opcional en el triatlón: es la principal herramienta de prevención de lesiones. Al correr 21km después de 90km en bici, los músculos están fatigados y son más propensos a lesionarse si no tienen base de fuerza.

Para triatlón, el foco está en: sentadillas (unilaterales y bilaterales), peso muerto rumano, lunges, y ejercicios de glúteo como hip thrust y puente de glúteos. También core: planchas, dead bugs, y trabajo de estabilidad.

Evitá máquinas de aislamiento (prensa, leg extension). El triatlón es un deporte de patrones de movimiento, no de músculos aislados.

En las Fases 1–2: 3 series de 8–10 repeticiones con carga moderada. En las Fases 3–4: bajar volumen y subir a series de 4–6 repeticiones más pesadas. En el taper: solo mantenimiento con poco volumen.`,
  },
};

const phases = [
  {
    id: 1, name: "Base aeróbica", weeks: "Sem 1–8", months: "Mar–Abr 2026",
    color: "#1D9E75", light: "#E1F5EE", darkAccent: "#0F6E56",
    goal: "Construir la base de las 3 disciplinas. Aprender técnica de nado. Adaptar el cuerpo al volumen.",
    why: "El 70.3 es 90% aeróbico. Sin base sólida, las fases intensas solo lesionan. Esta es la fase más importante del plan — no la saltes ni la acelerés.",
    sessions: [
      {
        day: "Lunes", label: "Natación — técnica + fondo",
        time: "Mañana", duration: "45 min", type: "swim",
        fc: "Z2 · 103–120 lpm",
        description: "Dedicá los primeros 15 minutos a técnica pura: un largo de crol pensando solo en la entrada de la mano al agua, un largo pensando en la rotación del cuerpo, un largo en la patada. Después 25 minutos de nado continuo a ritmo cómodo. Objetivo de la sesión: 600–800m totales.",
        glossaryLinks: ["series de nado"],
        tips: ["Si te agotás antes, descansá en la pared y seguí. No importa el tiempo de pausa, importa el tiempo en el agua.", "Considerá tomar clases de técnica las primeras 4 semanas — la mejora técnica en nado da más resultado que el volumen."],
      },
      {
        day: "Martes", label: "Carrera fondo Z2",
        time: "Mañana o noche", duration: "50–60 min", type: "run",
        fc: "Z2 · 103–120 lpm · ~5:45–6:30 min/km",
        description: "Salida continua a ritmo completamente cómodo. Si tu FC supera 120 lpm, bajá el ritmo o caminá. No hay problema en caminar — tu FC basal de 60 lpm (tu ergometría) y tu historial de carreras indican que Z2 para vos puede sentirse más lento de lo que estás acostumbrado.",
        glossaryLinks: ["fondo"],
        tips: ["Salí sin música los primeros km para escuchar tu respiración — debe ser rítmica y sin esfuerzo.", "Tus carreras de Strava muestran ritmos de 5:15–5:30 min/km. En esta sesión va a ser más lento. Eso es correcto."],
      },
      {
        day: "Miércoles", label: "Bici Z2 + Fuerza",
        time: "Mañana (bici) · tarde (gimnasio)",
        duration: "60–75 min bici · 30 min gimnasio", type: "bike",
        fc: "Z2 · 103–120 lpm · cadencia 85–95 RPM",
        description: "Salida en ruta o rodillo a ritmo completamente aeróbico. Si salís a ruta, elegí un circuito sin muchas subidas pronunciadas — Z2 en subidas exige mucho más. En rodillo: resistencia baja, cadencia alta. Por la tarde: sentadillas, peso muerto rumano, hip thrust, planchas. 3 series de 10 repeticiones.",
        glossaryLinks: ["Z2 en bici", "fuerza tren inferior"],
        tips: ["En rodillo podés ver series o escuchar algo — el tiempo pasa más rápido y mantenés la zona.", "El gimnasio de este día es igual de importante que la bici. No lo saltes."],
      },
      {
        day: "Jueves", label: "Natación — fondo continuo",
        time: "Mañana o noche", duration: "50 min", type: "swim",
        fc: "Z2 · esfuerzo 4–5/10",
        description: "Nado continuo sin pausas técnicas. El objetivo es empujar la distancia que podés mantener sin parar. Empezá con 600m la semana 1 y llegá a 1000m la semana 8. Si tenés que parar, está bien — la próxima semana llegás un poco más lejos.",
        glossaryLinks: ["series de nado"],
        tips: ["Contá brazadas por largo: debería ser siempre el mismo número. Si en el largo 10 hacés 6 más que en el largo 1, estás perdiendo técnica por fatiga."],
      },
      {
        day: "Viernes", label: "Carrera Z2 + strides",
        time: "Mañana", duration: "60 min", type: "run",
        fc: "Z2 mayoría · Z4–Z5 en strides (breve)",
        description: "50 minutos de carrera Z2 igual al martes, seguidos de 3–4 strides al final. Cada stride: 25 segundos de aceleración controlada hasta el 90% de esfuerzo, luego 60 segundos de trote suave. Los strides no deben cansar — si al día siguiente estás agotado, hacé solo 2.",
        glossaryLinks: ["strides", "fondo"],
        tips: ["Los strides se hacen en una recta, no en curvas.", "No confundas strides con sprints: empezás suave y vas subiendo, no arrancás a full."],
      },
      {
        day: "Sábado", label: "Bici larga Z2",
        time: "Mañana", duration: "90–120 min", type: "bike",
        fc: "Z2 · 103–120 lpm promedio de sesión",
        description: "La sesión más importante de la semana en bici. Salida larga a ritmo completamente aeróbico. Llevá agua y algo de comer si supera los 90 minutos. El objetivo es acumular tiempo en la bici — no importa la velocidad, importa la FC promedio. Semana 1: 90 min. Semana 8: 120 min.",
        glossaryLinks: ["Z2 en bici"],
        tips: ["Comé algo antes de salir — no en ayunas para sesiones de más de 60 minutos.", "Llevá al menos 750ml de agua. Si hace calor, más.", "Este es el día para explorar rutas y disfrutar. No tiene que ser sufrimiento."],
      },
      {
        day: "Domingo", label: "Descanso activo",
        time: "—", duration: "20 min opcional", type: "rest",
        fc: "Z1 si hacés algo · < 103 lpm",
        description: "Descanso total o caminata muy suave de 20 minutos. Stretching, foam roller, o yoga si querés. El domingo es parte del plan — la adaptación ocurre en el descanso, no en el entrenamiento. No hagas nada que eleve la FC.",
        glossaryLinks: [],
        tips: ["El descanso no es opcional. Es donde el cuerpo se construye."],
      },
    ],
    nutrition: "Foco en hidratación y carbohidratos de calidad. Nada especial todavía. Aprender a comer 1–2 hs antes de entrenar.",
    validate: ["Nadar 1000m continuos sin parar (semana 8)", "FC promedio en carrera < 120 lpm sostenido", "Bici de 120 min completada sin sensación de colapso"],
  },
  {
    id: 2, name: "Construcción de volumen", weeks: "Sem 9–20", months: "May–Jul 2026",
    color: "#378ADD", light: "#E6F1FB", darkAccent: "#185FA5",
    goal: "Alargar las 3 disciplinas progresivamente. Llegar a 2km de nado, 80km en bici, 15km corriendo. Introducir ladrillos.",
    why: "El 70.3 exige 1.9km + 90km + 21km. Hay que haber tocado esas distancias en entrenamiento. El cuerpo necesita ese contexto para no sorprenderse el día de la carrera.",
    sessions: [
      {
        day: "Lunes", label: "Natación — series",
        time: "Mañana o noche", duration: "60 min", type: "swim",
        fc: "Z2–Z3 · esfuerzo 5–6/10",
        description: "Series de 200–400m con 20–30 segundos de pausa entre ellas. Ejemplo semana 9: 5×200m con 25s pausa. Semana 20: 4×400m con 20s pausa. La pausa no es para descansar completamente, sino para recuperar la técnica. Si llegás agitado al final de una serie, la siguiente la hacés más lento.",
        glossaryLinks: ["series de nado"],
        tips: ["Usá aletas o pull buoy una sesión por semana para trabajar solo brazada sin preocuparte por la patada.", "Anotá tu tiempo por 100m — debería bajar progresivamente."],
      },
      {
        day: "Martes", label: "Carrera fondo Z2 progresivo",
        time: "Mañana", duration: "70–80 min", type: "run",
        fc: "Z2 · 103–120 lpm",
        description: "Igual que la Fase 1 pero más tiempo. Los últimos 15 minutos podés subir a Z3 (120–137 lpm) para ir introduciendo una intensidad mayor al final cuando ya estás cansado — simula el estado de la carrera. Distancia estimada: 11–13km.",
        glossaryLinks: ["fondo"],
        tips: [],
      },
      {
        day: "Miércoles", label: "Bici Z2/Z3 + Fuerza",
        time: "Mañana + tarde", duration: "75–90 min bici · 30 min gimnasio", type: "bike",
        fc: "Z2–Z3 · 103–137 lpm",
        description: "Bici similar a Fase 1 pero con 2–3 bloques de 10 minutos a Z3 intercalados en el medio. Ejemplo: 20 min Z2, 10 min Z3, 10 min Z2, 10 min Z3, 20 min Z2. El resto de la sesión siempre Z2. Gimnasio: igual que Fase 1, podés empezar a agregar carga.",
        glossaryLinks: ["Z2 en bici", "fuerza tren inferior"],
        tips: [],
      },
      {
        day: "Jueves", label: "Natación fondo 1500–2000m",
        time: "Mañana o noche", duration: "60 min", type: "swim",
        fc: "Z2 · esfuerzo 4–5/10",
        description: "Nado continuo empujando la distancia máxima que podés mantener con buena técnica. Si llegás a 1500m con buena forma, parás. No rompas la técnica por llegar a un número. El objetivo a fin de la Fase 2 es 2000m continuos.",
        glossaryLinks: ["series de nado"],
        tips: ["Cronometrá el tiempo por 500m para ver si tu ritmo es parejo o se deteriora al final."],
      },
      {
        day: "Viernes", label: "Carrera tempo suave",
        time: "Mañana", duration: "60 min", type: "run",
        fc: "Z2 calentamiento · Z3 en el medio · 120–137 lpm",
        description: "15 min calentamiento Z1→Z2, 25–30 min a Z3 (ritmo ~5:00–5:15 min/km), 10 min enfriamiento Z1. El segmento tempo debe sentirse 'incómodo pero controlado'. Podés hablar pero preferirías no. Al terminar deberías estar cansado pero no destruido.",
        glossaryLinks: ["tempo en carrera"],
        tips: ["Si tu FC supera 137 lpm bajá el ritmo. No entrenes por ritmo en esta fase, entrená por FC."],
      },
      {
        day: "Sábado", label: "Bici larga Z2",
        time: "Mañana", duration: "120–150 min", type: "bike",
        fc: "Z2 · 103–120 lpm promedio",
        description: "La bici larga sigue siendo la sesión estrella. Distancia objetivo: 50–70km según el terreno. Practicá comer en la bici: un gel o banana cada 45–60 minutos para habituar el estómago a absorber mientras pedaleás.",
        glossaryLinks: ["Z2 en bici"],
        tips: ["Empezá a usar la ropa de ciclismo que usarás en carrera para ir adaptando la piel."],
      },
      {
        day: "Domingo", label: "Ladrillo: bici + carrera",
        time: "Mañana", duration: "40 min bici + 20 min carrera", type: "brick",
        fc: "Z2 en bici · Z2–Z3 en carrera (las piernas van a estar pesadas)",
        description: "Primera vez que combinás dos disciplinas en el mismo día. Hacé 40 minutos de bici a Z2, dejá la bici, y salí a correr 20 minutos inmediatamente. Los primeros 5–8 minutos van a sentirse muy raros — las piernas de ciclista no están listas para correr. Eso es exactamente lo que estamos entrenando.",
        glossaryLinks: ["ladrillo"],
        tips: ["Tené todo preparado antes de salir: zapatillas al lado de la bici.", "No te alarmes si el ritmo de carrera es mucho más lento que lo normal. Es completamente esperado."],
      },
    ],
    nutrition: "Empezar a usar geles o isotónicos en sesiones > 90 min. Practicar comer en bici. Hidratación 500ml/hora mínimo.",
    validate: ["Bici de 80km completada", "Nado de 2km continuo", "Ladrillo completado sin colapso"],
  },
  {
    id: 3, name: "Intensidad específica", weeks: "Sem 21–32", months: "Ago–Oct 2026",
    color: "#BA7517", light: "#FAEEDA", darkAccent: "#854F0B",
    goal: "Introducir intensidad real. Consolidar ritmo de carrera objetivo. Nado a ritmo de competencia.",
    why: "Hay que saber qué ritmo mantener el día de la carrera. Esta fase lo enseña sin sobrecargar. Si llegaste bien a la Fase 3, el trabajo duro ya está hecho.",
    sessions: [
      { day: "Lunes", label: "Natación — series a ritmo de carrera", time: "Mañana", duration: "65 min", type: "swim", fc: "Z3 en series · 120–137 lpm", description: "Series de 400m a ritmo objetivo de carrera (alrededor de 1:55–2:05 min/100m). Ejemplo: 4×400m con 20s pausa. El último 400m debería sentirse al límite de lo controlable.", glossaryLinks: ["series de nado"], tips: ["Si tenés acceso a aguas abiertas, hacé al menos una sesión mensual ahí — la carrera puede ser en lago o mar."] },
      { day: "Martes", label: "Carrera con intervalos", time: "Mañana", duration: "70 min", type: "run", fc: "Z2 + bloques Z4 · hasta 154 lpm", description: "Calentamiento 15 min Z2, luego 5×5 minutos a Z4 (137–154 lpm) con 3 min de Z2 entre cada uno, enfriamiento 10 min. El ritmo en los intervalos debería ser ~4:40–4:55 min/km. Si no llegás, bajá el ritmo — no subas la FC más allá de Z4.", glossaryLinks: ["tempo en carrera"], tips: [] },
      { day: "Miércoles", label: "Bici sweet spot + Fuerza", time: "Mañana + tarde", duration: "75 min bici · 20 min fuerza", type: "bike", fc: "Z3–Z4 · 120–145 lpm en bloques", description: "2×20 minutos a sweet spot (130–145 lpm) con 10 minutos Z2 entre ellos. Calentamiento y enfriamiento en Z1–Z2. Fuerza: mantenimiento, menos volumen que fases anteriores.", glossaryLinks: ["sweet spot"], tips: [] },
      { day: "Jueves", label: "Natación fondo 2500–3000m", time: "Noche", duration: "65 min", type: "swim", fc: "Z2 · esfuerzo 4–5/10", description: "Nado continuo o en bloques grandes (2×1200m). Consolidar la capacidad aeróbica en el agua. El ritmo de carrera es 1.9km — acá nadás más para que el día de la carrera 1.9km se sienta corto.", glossaryLinks: ["series de nado"], tips: [] },
      { day: "Viernes", label: "Carrera recuperación Z2", time: "Mañana", duration: "50 min", type: "run", fc: "Z1–Z2 · < 120 lpm", description: "Carrera completamente suave para recuperar después del miércoles y jueves. No tiene objetivos de performance. Si estás muy cansado, caminá 30 min en cambio. El viernes siempre es suave.", glossaryLinks: ["fondo"], tips: [] },
      { day: "Sábado", label: "Ladrillo largo: bici + carrera", time: "Mañana", duration: "120–150 min bici + 30 min carrera", type: "brick", fc: "Z2–Z3 bici · Z2–Z3 carrera", description: "Bici de 80–90km a Z2–Z3, transición inmediata a 30 minutos de carrera. Este ladrillo simula la parte más exigente del 70.3. Practicá exactamente la nutrición que usarás en carrera.", glossaryLinks: ["ladrillo", "Z2 en bici"], tips: ["Llevá todo lo que llevarías el día de la carrera: bidones, geles, casco, zapatillas de carrera."] },
      { day: "Domingo", label: "Descanso total", time: "—", duration: "—", type: "rest", fc: "—", description: "Descanso absoluto. Después del ladrillo del sábado el cuerpo lo necesita.", glossaryLinks: [], tips: [] },
    ],
    nutrition: "Definir y testear protocolo de carrera completo en los ladrillos. 60–80g de carbohidratos/hora durante el esfuerzo.",
    validate: ["Ladrillo 90km + 10km completado", "Nado 1900m en < 45 min", "Ritmo de carrera objetivo identificado con FC sostenible"],
  },
  {
    id: 4, name: "Pico y simulacro", weeks: "Sem 33–44", months: "Nov–Ene 2027",
    color: "#D85A30", light: "#FAECE7", darkAccent: "#993C1D",
    goal: "Semanas de mayor carga. Hacer un simulacro completo del 70.3. Confirmar que el cuerpo aguanta la distancia total.",
    why: "El cuerpo necesita haber hecho estas distancias antes del día. No para destruirse, sino para saber que puede. La confianza que da el simulacro vale tanto como el entrenamiento.",
    sessions: [
      { day: "Lunes", label: "Natación fondo 2500–3000m", time: "Mañana", duration: "65 min", type: "swim", fc: "Z2", description: "Nado continuo consolidando la base aeróbica. Ya debería sentirse cómodo.", glossaryLinks: [], tips: [] },
      { day: "Martes", label: "Carrera fondo largo", time: "Mañana", duration: "90 min", type: "run", fc: "Z2 · 103–120 lpm · ~14–16km", description: "La carrera más larga del plan fuera del simulacro. Ritmo completamente cómodo. Practicá la nutrición de carrera: gel cada 35–40 minutos.", glossaryLinks: ["fondo"], tips: ["Este es el momento donde muchos atletas están más tentados de salir rápido. No lo hagas."] },
      { day: "Miércoles", label: "Bici Z3 con bloques Z4", time: "Mañana", duration: "90 min", type: "bike", fc: "Z3 base · Z4 en bloques · hasta 154 lpm", description: "La sesión de bici más intensa del plan. 3×15 minutos a Z4 con 8 min Z2 entre cada uno. Calentamiento y enfriamiento amplios.", glossaryLinks: ["sweet spot"], tips: [] },
      { day: "Jueves", label: "Natación técnica + velocidad", time: "Noche", duration: "50 min", type: "swim", fc: "Z2–Z3", description: "Sesión más corta y enfocada. 1000m técnica + 6×50m a ritmo máximo con 30s pausa. Los 50m máximos mantienen la velocidad alta sin acumular fatiga.", glossaryLinks: [], tips: [] },
      { day: "Viernes", label: "Carrera corta suave", time: "Mañana", duration: "40 min", type: "run", fc: "Z1–Z2 · < 115 lpm", description: "Sesión de recuperación activa antes del simulacro del sábado. Nada más que mantenerse suelto.", glossaryLinks: [], tips: [] },
      { day: "Sábado", label: "SIMULACRO 70.3 completo", time: "Mañana temprano", duration: "Nado 1900m + Bici 90km + Carrera 15km", type: "race",
        fc: "Ritmo de carrera real en cada disciplina",
        description: "El día más importante del plan. Simulá todo: salida al agua, transición T1, 90km en bici con nutrición, transición T2, 15km de carrera (no los 21km completos — el cuerpo no necesita eso, solo necesita saber que puede llegar). Usá exactamente lo que usarás el día de la carrera: ropa, comida, bidones, calzado.",
        glossaryLinks: ["ladrillo"],
        tips: [
          "Llegá al simulacro descansado — dormí bien el viernes.",
          "Desayuná lo mismo que desayunarás el día de la carrera.",
          "Anotá qué funcionó y qué no. Ese análisis vale oro.",
          "No hagas los 21km de carrera — 15km son suficientes para confirmar que podés.",
        ],
      },
      { day: "Domingo", label: "Descanso total", time: "—", duration: "—", type: "rest", fc: "—", description: "Descanso absoluto. Comé bien, dormí, no hagas nada físico.", glossaryLinks: [], tips: [] },
    ],
    nutrition: "Ejecutar exactamente el protocolo de carrera en el simulacro. Carbohidratos 60–80g/hora. Recuperación: proteína + carbs dentro de los 30 min post-simulacro.",
    validate: ["Simulacro completado", "Recuperación en < 48 hs", "Protocolo de nutrición validado"],
  },
  {
    id: 5, name: "Taper y carrera", weeks: "Sem 45–52", months: "Feb–Mar 2027",
    color: "#534AB7", light: "#EEEDFE", darkAccent: "#3C3489",
    goal: "Reducir volumen 40–60% manteniendo algo de intensidad. Dejar que el cuerpo absorba 11 meses de trabajo.",
    why: "El taper es donde se 'gana' la carrera. El trabajo ya está hecho. Ahora hay que dejar que el cuerpo se reconstruya y llegue al día con máxima energía. Muchos atletas arruinan el taper entrenando demasiado por nervios.",
    sessions: [
      { day: "Lunes", label: "Natación suave 1500m", time: "Mañana", duration: "45 min", type: "swim", fc: "Z2 suave", description: "1500m continuos o en series largas. Sin esfuerzo. Solo mantenerse en el agua.", glossaryLinks: [], tips: [] },
      { day: "Martes", label: "Carrera suave + aceleraciones", time: "Mañana", duration: "40 min", type: "run", fc: "Z2 + 2–3 strides breves", description: "35 min Z2 suave + 2–3 strides de 20 segundos. Las aceleraciones mantienen la activación neuromuscular sin fatiga.", glossaryLinks: ["strides"], tips: [] },
      { day: "Miércoles", label: "Bici con ritmo de carrera", time: "Mañana", duration: "60 min", type: "bike", fc: "Z2 + 2×10 min Z3", description: "60 minutos con 2 bloques de 10 minutos a Z3 para recordarle al cuerpo qué se siente el ritmo de carrera. El resto Z2.", glossaryLinks: [], tips: [] },
      { day: "Jueves", label: "Natación técnica 1000m", time: "Noche", duration: "35 min", type: "swim", fc: "Z2 muy suave", description: "Solo técnica. Largo de entrada de mano, largo de rotación, largo de respiración bilateral. Salís del agua fresco.", glossaryLinks: [], tips: [] },
      { day: "Viernes", label: "Trote suave 20 min", time: "Mañana", duration: "20 min", type: "run", fc: "Z1 · < 110 lpm", description: "Solo para moverse. No sirve para ponerte en forma, sirve para no estar ansioso y quedarte quieto.", glossaryLinks: [], tips: ["Hacelo cerca de donde te alojás si viajaste a la carrera."] },
      { day: "Sábado", label: "Bici suave 30 min", time: "Mañana", duration: "30 min", type: "bike", fc: "Z1 · < 110 lpm", description: "Pedaleada suave solo para soltar las piernas. No importa la distancia.", glossaryLinks: [], tips: [] },
      { day: "Domingo", label: "Descanso + logística", time: "—", duration: "—", type: "rest", fc: "—", description: "Revisar transiciones, dejar la bici lista, preparar la bolsa. Cena liviana conocida. Dormir temprano aunque no puedas dormir bien — es normal estar nervioso.", glossaryLinks: [], tips: ["El nerviosismo es buena señal. Significa que importa."] },
    ],
    nutrition: "Carga de carbohidratos 3 días antes. Hidratación extra. Desayuno de carrera = exactamente lo que testaste en el simulacro.",
    validate: ["Llegás descansado (no aburrido)", "Piernas frescas en la última semana", "Logística de carrera 100% confirmada"],
  },
];

const typeColors = { swim: "#378ADD", run: "#1D9E75", bike: "#BA7517", brick: "#D85A30", race: "#534AB7", rest: "#888780" };
const typeLabels = { swim: "Natación", run: "Carrera", bike: "Bici", brick: "Ladrillo", race: "Simulacro", rest: "Descanso" };

export default function App() {
  const [activePhase, setActivePhase] = useState(0);
  const [activeTab, setActiveTab] = useState("plan");
  const [expandedSession, setExpandedSession] = useState(null);
  const [glossaryWord, setGlossaryWord] = useState(null);
  const ph = phases[activePhase];

  const tabs = [
    { id: "plan", label: "Plan semanal" },
    { id: "zones", label: "Zonas FC" },
    { id: "nutrition", label: "Nutrición" },
    { id: "glossary", label: "Glosario" },
  ];

  return (
    <div style={{ fontFamily: "var(--font-sans)", color: "var(--color-text-primary)", padding: "1rem 0", maxWidth: 680 }}>

      {/* Header */}
      <div style={{ marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: 4 }}>Ironman 70.3 · Plan de entrenamiento</div>
        <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 2 }}>Juan Ferrari</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[["FC máx", "171 lpm"], ["FE", "65%"], ["METs máx", "9.9"], ["Objetivo", "Mar 2027"]].map(([k,v]) => (
            <div key={k} style={{ fontSize: 12, color: "var(--color-text-secondary)" }}><span style={{ color: "var(--color-text-tertiary)" }}>{k} </span>{v}</div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: "1.25rem", borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "8px 14px", fontSize: 13, borderRadius: "8px 8px 0 0",
            border: "none", borderBottom: activeTab === t.id ? `2px solid ${ph.color}` : "2px solid transparent",
            background: "transparent",
            color: activeTab === t.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            cursor: "pointer", fontWeight: activeTab === t.id ? 500 : 400,
            transition: "all .15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Glossary modal */}
      {glossaryWord && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "1rem" }}
          onClick={() => setGlossaryWord(null)}>
          <div style={{ background: "var(--color-background-primary)", borderRadius: 16, padding: "1.25rem", maxWidth: 500, width: "100%", maxHeight: "70vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{glossary[glossaryWord].title}</div>
              <button onClick={() => setGlossaryWord(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)", padding: "0 4px" }}>✕</button>
            </div>
            {glossary[glossaryWord].body.split("\n\n").map((p, i) => (
              <p key={i} style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-text-secondary)", margin: "0 0 10px" }}>{p}</p>
            ))}
          </div>
        </div>
      )}

      {activeTab === "plan" && (
        <div>
          {/* Phase selector */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: "1.25rem" }}>
            {phases.map((p, i) => (
              <button key={p.id} onClick={() => { setActivePhase(i); setExpandedSession(null); }} style={{
                padding: "8px 6px", borderRadius: 10, textAlign: "center", cursor: "pointer",
                border: activePhase === i ? `2px solid ${p.color}` : "0.5px solid var(--color-border-tertiary)",
                background: activePhase === i ? p.light : "var(--color-background-secondary)",
                transition: "all .15s",
              }}>
                <div style={{ fontSize: 10, color: p.color, fontWeight: 500, marginBottom: 1 }}>Fase {p.id}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 1 }}>{p.weeks}</div>
              </button>
            ))}
          </div>

          {/* Phase summary */}
          <div style={{ borderRadius: 12, padding: "12px 16px", marginBottom: "1rem", background: ph.light, borderLeft: `4px solid ${ph.color}` }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: ph.darkAccent, marginBottom: 3 }}>{ph.months}</div>
            <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 500, color: ph.darkAccent }}>{ph.goal}</p>
            <p style={{ margin: 0, fontSize: 13, color: ph.darkAccent, opacity: 0.85 }}>{ph.why}</p>
          </div>

          {/* Sessions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: "1rem" }}>
            {ph.sessions.map((s, i) => {
              const isOpen = expandedSession === i;
              const isRest = s.type === "rest";
              return (
                <div key={i} style={{ borderRadius: 10, border: isOpen ? `1.5px solid ${typeColors[s.type]}` : "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", overflow: "hidden", transition: "border .15s" }}>
                  <button onClick={() => setExpandedSession(isOpen ? null : i)} style={{ width: "100%", background: "none", border: "none", cursor: isRest ? "default" : "pointer", padding: "12px 14px", textAlign: "left", display: "grid", gridTemplateColumns: "80px 1fr auto", gap: 10, alignItems: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>{s.day}</div>
                      <span style={{ fontSize: 10, fontWeight: 500, color: typeColors[s.type], background: `${typeColors[s.type]}18`, padding: "2px 6px", borderRadius: 4, width: "fit-content" }}>{typeLabels[s.type]}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{s.duration}{s.time && s.time !== "—" ? ` · ${s.time}` : ""}</div>
                    </div>
                    {!isRest && <div style={{ fontSize: 18, color: "var(--color-text-tertiary)", userSelect: "none" }}>{isOpen ? "−" : "+"}</div>}
                  </button>
                  {isOpen && !isRest && (
                    <div style={{ padding: "0 14px 14px", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                      <div style={{ display: "inline-block", fontSize: 11, fontWeight: 500, color: typeColors[s.type], background: `${typeColors[s.type]}18`, padding: "3px 8px", borderRadius: 6, marginTop: 10, marginBottom: 10 }}>
                        FC objetivo: {s.fc}
                      </div>
                      <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--color-text-secondary)", margin: "0 0 10px" }}>{s.description}</p>
                      {s.glossaryLinks.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                          <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Términos:</span>
                          {s.glossaryLinks.map(gl => (
                            <button key={gl} onClick={() => setGlossaryWord(gl)} style={{ fontSize: 12, color: ph.color, background: ph.light, border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontWeight: 500 }}>
                              {gl} ↗
                            </button>
                          ))}
                        </div>
                      )}
                      {s.tips.length > 0 && (
                        <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "10px 12px" }}>
                          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", marginBottom: 6 }}>CONSEJOS</div>
                          {s.tips.map((tip, j) => (
                            <div key={j} style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: j < s.tips.length - 1 ? 4 : 0 }}>· {tip}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Validation */}
          <div style={{ borderRadius: 10, border: "0.5px solid var(--color-border-tertiary)", padding: "12px 14px", background: "var(--color-background-secondary)" }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 8 }}>Cómo validar que avanzaste en esta fase</div>
            {ph.validate.map((v, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < ph.validate.length - 1 ? 6 : 0 }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${ph.color}`, flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "zones" && (
        <div>
          <div style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "12px 14px", marginBottom: "1rem", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            Tu FC máxima según la ergometría es <strong style={{ color: "var(--color-text-primary)" }}>171 lpm</strong>. El 80% de tu entrenamiento debería ser Z2. El error más común es entrenar Z3 pensando que es Z2.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: "1rem" }}>
            {zones.map((z, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "8px 1fr 110px", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 10, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)" }}>
                <div style={{ width: 8, height: 40, borderRadius: 4, background: z.color }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{z.z} — {z.name}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{z.desc}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: z.color }}>{zRange(z)}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{Math.round(z.pct[0]*100)}–{Math.round(z.pct[1]*100)}% FCmáx</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>La regla 80/20</div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>80% del volumen en Z1–Z2. 20% en Z3–Z4. Ir más rápido en los días fáciles es el error número uno en triatletas amateurs. Destruye la adaptación y acumula fatiga sin ganancia adicional. La ciencia detrás: Z2 estimula la biogénesis mitocondrial sin elevar el cortisol. Z4 en exceso lo hace.</p>
          </div>
        </div>
      )}

      {activeTab === "nutrition" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { t: "Antes del entrenamiento", icon: "🌅", body: "1–2 horas antes: carbohidratos + algo de proteína. Ejemplos: tostadas con huevo revuelto, yogur griego con granola y miel, avena con banana. Evitá grasas y fibra en exceso — ralentizan el vaciado gástrico y pueden causar problemas durante el esfuerzo." },
            { t: "Durante — sesiones < 60 min", icon: "💧", body: "Solo agua. No necesitás geles ni carbohidratos externos. Tu glucógeno alcanza. Solo hidratate si hace calor." },
            { t: "Durante — sesiones 60–90 min", icon: "⚡", body: "Empezá a introducir 30–40g de carbohidratos por hora. Podés usar bebida isotónica o un gel partido en dos tomas. El objetivo es mantener la glucemia estable, no compensar el gasto total." },
            { t: "Durante — sesiones > 90 min", icon: "🔋", body: "60–90g de carbohidratos por hora. Un gel cada 30–40 minutos + agua. Practicalo en entrenamiento antes de usarlo en carrera. Tu estómago también necesita entrenamiento — muchos atletas tienen problemas gastrointestinales el día de la carrera porque nunca practicaron comer mientras hacen esfuerzo." },
            { t: "Post entrenamiento (ventana de 30 min)", icon: "🔄", body: "Dentro de los 30 minutos: proteína (20–30g) + carbohidratos (40–60g). Ejemplos: batido de proteína con banana, arroz con pollo, yogur griego con fruta. Esta ventana es real y vale la pena aprovecharla — el músculo absorbe los nutrientes con más eficiencia en este período." },
            { t: "Día a día", icon: "🥗", body: "Carbohidratos como base energética (arroz, avena, papa, pasta). Proteína en cada comida (carne, pollo, pescado, huevo, legumbres). Grasas buenas (palta, aceite de oliva, frutos secos). Evitá ultraprocesados en semanas de mayor carga — el cuerpo no puede rendir si se inflama." },
            { t: "Hidratación diaria", icon: "🚰", body: "2.5–3 litros diarios como mínimo. La prueba más fácil: orina clara a amarillo pálido = bien hidratado. Orina oscura = tomá agua ahora. En entrenamientos de más de 60 minutos: sumá electrolitos (sodio principalmente) para reponer lo que sudás." },
            { t: "Día de carrera", icon: "🏁", body: "Nunca debutar. Desayuno igual al del simulacro: 2–3 horas antes, carbohidratos de fácil digestión. En el nado nada. En la bici: gel cada 30 min + agua + electrolitos cada 20 min. En la carrera: gel cada 30–35 min + agua en cada estación. 60–80g de carbohidratos por hora durante toda la carrera." },
          ].map((n, i) => (
            <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{n.icon} {n.t}</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>{n.body}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "glossary" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(glossary).map(([key, val]) => (
            <div key={key} style={{ borderRadius: 10, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", overflow: "hidden" }}>
              <button onClick={() => setGlossaryWord(glossaryWord === key ? null : key)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "12px 14px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{val.title}</div>
                <div style={{ fontSize: 18, color: "var(--color-text-tertiary)" }}>{glossaryWord === key ? "−" : "+"}</div>
              </button>
              {glossaryWord === key && (
                <div style={{ padding: "0 14px 14px", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                  {val.body.split("\n\n").map((p, j) => (
                    <p key={j} style={{ fontSize: 13, lineHeight: 1.7, color: "var(--color-text-secondary)", margin: "10px 0 0" }}>{p}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
