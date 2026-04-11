// ============================================================
// .env.local  (nunca commitear — agregarlo a .gitignore)
// ============================================================
// STRAVA_CLIENT_ID=tu_client_id
// STRAVA_CLIENT_SECRET=tu_client_secret
// STRAVA_REDIRECT_URI=http://localhost:3000/api/auth/strava/callback
// NEXT_PUBLIC_BASE_URL=http://localhost:3000
// TOKEN_COOKIE_SECRET=una_clave_larga_aleatoria_para_firmar_cookies


// ============================================================
// lib/strava.js — Cliente Strava + refresh automático de token
// ============================================================
const BASE = "https://www.strava.com/api/v3";

// Llama a la API de Strava con el access_token del usuario
// Maneja el refresh automático si el token expiró
export async function stravaFetch(endpoint, accessToken) {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Strava API error: ${res.status}`);
  return res.json();
}

// Intercambia el code de OAuth por access_token + refresh_token
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
  if (!res.ok) throw new Error("Error exchanging code");
  return res.json();
  // Devuelve: { access_token, refresh_token, expires_at, athlete: {...} }
}

// Refresca el token cuando ya expiró
export async function refreshToken(refreshToken) {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Error refreshing token");
  return res.json();
}

// Helper: devuelve las últimas N actividades con avg_heartrate y average_speed
export async function getRecentActivities(accessToken, perPage = 10) {
  return stravaFetch(`/athlete/activities?per_page=${perPage}`, accessToken);
}

// Helper: devuelve el perfil del atleta
export async function getAthlete(accessToken) {
  return stravaFetch("/athlete", accessToken);
}


// ============================================================
// app/api/auth/strava/route.js — Paso 1: redirigir a Strava
// ============================================================
import { NextResponse } from "next/server";

export function GET() {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: process.env.STRAVA_REDIRECT_URI,
    response_type: "code",
    scope: "read,activity:read_all",
    approval_prompt: "auto",
  });
  return NextResponse.redirect(
    `https://www.strava.com/oauth/authorize?${params}`
  );
}


// ============================================================
// app/api/auth/strava/callback/route.js — Paso 2: intercambio
// ============================================================
import { NextResponse } from "next/server";
import { exchangeCode } from "@/lib/strava";
import { cookies } from "next/headers";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect("/error?msg=no_code");

  try {
    const tokenData = await exchangeCode(code);
    // Guardamos el token en una cookie httpOnly segura
    // Para uso personal esto es más que suficiente
    const cookieStore = cookies();
    cookieStore.set("strava_token", JSON.stringify({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at,
      athlete_id: tokenData.athlete.id,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 días
      path: "/",
    });
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`);
  } catch (err) {
    return NextResponse.redirect("/error?msg=token_exchange_failed");
  }
}


// ============================================================
// app/api/strava/activities/route.js — Actividades recientes
// ============================================================
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRecentActivities, refreshToken } from "@/lib/strava";

export async function GET() {
  const cookieStore = cookies();
  const raw = cookieStore.get("strava_token")?.value;
  if (!raw) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let tokenData = JSON.parse(raw);

  // Refrescar token si expiró
  if (Date.now() / 1000 > tokenData.expires_at) {
    const fresh = await refreshToken(tokenData.refresh_token);
    tokenData = { ...tokenData, access_token: fresh.access_token, expires_at: fresh.expires_at };
    cookieStore.set("strava_token", JSON.stringify(tokenData), { httpOnly: true, path: "/" });
  }

  const activities = await getRecentActivities(tokenData.access_token, 20);

  // Filtramos solo lo relevante para el plan
  const cleaned = activities.map(a => ({
    id: a.id,
    name: a.name,
    type: a.type,                          // "Run", "Ride", "Swim"
    date: a.start_date_local,
    distance_m: a.distance,
    moving_time_s: a.moving_time,
    avg_heartrate: a.average_heartrate,
    max_heartrate: a.max_heartrate,
    avg_speed_mps: a.average_speed,
    total_elevation: a.total_elevation_gain,
    kudos: a.kudos_count,
  }));

  return NextResponse.json(cleaned);
}


// ============================================================
// lib/utils.js — Helpers de cálculo
// ============================================================

// Convierte m/s a min/km formateado
export function paceFromMps(mps) {
  if (!mps || mps === 0) return "—";
  const minPerKm = 1000 / 60 / mps;
  const min = Math.floor(minPerKm);
  const sec = Math.round((minPerKm - min) * 60);
  return `${min}:${sec.toString().padStart(2, "0")} min/km`;
}

// Zona de FC dado lpm y fcmax
export function getZone(bpm, fcMax = 171) {
  const pct = bpm / fcMax;
  if (pct < 0.60) return { z: "Z1", color: "#5DCAA5", name: "Recuperación" };
  if (pct < 0.70) return { z: "Z2", color: "#378ADD", name: "Base aeróbica" };
  if (pct < 0.80) return { z: "Z3", color: "#EF9F27", name: "Tempo" };
  if (pct < 0.90) return { z: "Z4", color: "#D85A30", name: "Umbral" };
  return { z: "Z5", color: "#E24B4A", name: "Máximo" };
}

// Formatea segundos a "1h 23m"
export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Formatea metros a "12.4 km"
export function formatDistance(meters) {
  return `${(meters / 1000).toFixed(1)} km`;
}

// Detecta si una actividad de Strava corresponde a un tipo de sesión del plan
// Útil para el check ✓ automático
export function matchActivityToSession(activity, sessionType) {
  const map = { swim: "Swim", run: "Run", bike: "Ride", brick: "Ride" };
  return activity.type === map[sessionType];
}


// ============================================================
// app/dashboard/page.js — Dashboard principal
// ============================================================
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ActivityFeed from "@/components/ActivityFeed";
import WeeklyProgress from "@/components/WeeklyProgress";

// Server Component — fetch en servidor, sin useEffect
export default async function Dashboard() {
  const cookieStore = cookies();
  const token = cookieStore.get("strava_token");
  if (!token) redirect("/api/auth/strava"); // Auto-redirige a login

  // Fetch actividades desde nuestra API interna
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/strava/activities`, {
    cache: "no-store", // Siempre fresco
  });
  const activities = res.ok ? await res.json() : [];

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: "0.5rem" }}>
        Ironman 70.3 — Dashboard
      </h1>
      <p style={{ color: "#888", marginBottom: "2rem", fontSize: 14 }}>
        Semana actual · {new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
      </p>
      <WeeklyProgress activities={activities} />
      <ActivityFeed activities={activities} />
    </main>
  );
}


// ============================================================
// package.json — Dependencias relevantes
// ============================================================
/*
{
  "dependencies": {
    "next": "^14",
    "react": "^18",
    "react-dom": "^18",
    "recharts": "^2.10"    ← para gráficos de FC y ritmo
  }
}

Scripts:
  npm run dev   → localhost:3000
  npm run build → build de producción
  npm run start → servidor de producción

Deploy en Vercel:
  1. vercel login
  2. vercel --prod
  3. Agregar las variables de .env.local en Vercel Dashboard → Settings → Environment Variables
  4. Cambiar STRAVA_REDIRECT_URI a https://tu-dominio.vercel.app/api/auth/strava/callback
  5. Agregar ese mismo URI en tu app de Strava en developers.strava.com
*/
