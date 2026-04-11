// ─── lib/utils.js ───────────────────────────────────────────

export const FC_MAX = 171;

export function paceFromMps(mps) {
  if (!mps || mps === 0) return "—";
  const minPerKm = 1000 / 60 / mps;
  const min = Math.floor(minPerKm);
  const sec = Math.round((minPerKm - min) * 60);
  return `${min}:${sec.toString().padStart(2, "0")} /km`;
}

export function getZone(bpm, fcMax = FC_MAX) {
  if (!bpm) return null;
  const pct = bpm / fcMax;
  if (pct < 0.60) return { z: "Z1", color: "#5DCAA5", name: "Recuperación" };
  if (pct < 0.70) return { z: "Z2", color: "#378ADD", name: "Base aeróbica" };
  if (pct < 0.80) return { z: "Z3", color: "#EF9F27", name: "Tempo" };
  if (pct < 0.90) return { z: "Z4", color: "#D85A30", name: "Umbral" };
  return { z: "Z5", color: "#E24B4A", name: "Máximo" };
}

export function formatDuration(seconds) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatDistance(meters) {
  if (!meters || meters === 0) return "—";
  return `${(meters / 1000).toFixed(1)} km`;
}

export function typeLabel(type) {
  const map = { Run: "Carrera", Ride: "Bici", Swim: "Natación", WeightTraining: "Pesas", Workout: "Entrenamiento" };
  return map[type] || type;
}

export function typeColor(type) {
  const map = { Run: "#1D9E75", Ride: "#BA7517", Swim: "#378ADD", WeightTraining: "#534AB7", Workout: "#888780" };
  return map[type] || "#888780";
}

// Dada una actividad de Strava, determina si corresponde a un tipo de sesión del plan
export function matchesSessionType(stravaType, planType) {
  const map = { swim: "Swim", run: "Run", bike: "Ride", brick: "Ride", race: "Ride", rest: null };
  return map[planType] === stravaType;
}


// ─── lib/strava.js ──────────────────────────────────────────

const STRAVA_BASE = "https://www.strava.com/api/v3";

export async function exchangeCode(code) {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json();
}

export async function doRefreshToken(refresh_token) {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
  return res.json();
}

export async function stravaGet(endpoint, accessToken) {
  const res = await fetch(`${STRAVA_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 300 }, // cache 5 min en Next.js
  });
  if (!res.ok) throw new Error(`Strava API ${endpoint} → ${res.status}`);
  return res.json();
}

// Devuelve actividades limpias para el dashboard
export function cleanActivity(a) {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    date: a.start_date_local,
    distance_m: a.distance ?? 0,
    moving_time_s: a.moving_time ?? 0,
    avg_heartrate: a.average_heartrate ?? null,
    max_heartrate: a.max_heartrate ?? null,
    avg_speed_mps: a.average_speed ?? null,
    elevation: a.total_elevation_gain ?? 0,
  };
}
