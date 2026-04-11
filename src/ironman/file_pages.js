// ─── app/layout.js ──────────────────────────────────────────
import "./globals.css";

export const metadata = {
  title: "Ironman 70.3 — Juan Ferrari",
  description: "Plan de entrenamiento + seguimiento Strava",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: "#f8f8f6", color: "#1a1a1a", minHeight: "100vh" }}>
        <nav style={{ borderBottom: "0.5px solid #e5e5e5", background: "#fff", padding: "0 1.5rem", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
          <span style={{ fontWeight: 500, fontSize: 15 }}>🏊🚴🏃 Ironman 70.3</span>
          <div style={{ display: "flex", gap: 16 }}>
            <a href="/dashboard" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>Dashboard</a>
            <a href="/plan" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>Plan</a>
            <a href="/api/auth/logout" style={{ fontSize: 13, color: "#aaa", textDecoration: "none" }}>Salir</a>
          </div>
        </nav>
        <main style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1.25rem" }}>
          {children}
        </main>
      </body>
    </html>
  );
}


// ─── app/globals.css ────────────────────────────────────────
/*
* { box-sizing: border-box; }
body { margin: 0; }
a { color: inherit; }
*/


// ─── app/page.js  (página de login / landing) ───────────────
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home({ searchParams }) {
  const cookieStore = await cookies();
  const session = cookieStore.get("strava_session");

  // Si ya tiene sesión, va directo al dashboard
  if (session) redirect("/dashboard");

  const error = searchParams?.error;

  return (
    <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, textAlign: "center" }}>
      <div>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏊🚴🏃</div>
        <h1 style={{ fontSize: 26, fontWeight: 500, margin: "0 0 8px" }}>Ironman 70.3 Tracker</h1>
        <p style={{ color: "#888", fontSize: 14, margin: 0 }}>Plan de entrenamiento · Mar 2026 – Mar 2027</p>
      </div>

      {error && (
        <div style={{ background: "#fee", border: "0.5px solid #fcc", borderRadius: 8, padding: "8px 16px", fontSize: 13, color: "#c00" }}>
          Error al conectar con Strava. Intentá de nuevo.
        </div>
      )}

      <a href="/api/auth/strava" style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        background: "#FC4C02", color: "#fff", padding: "12px 28px",
        borderRadius: 10, textDecoration: "none", fontWeight: 500, fontSize: 15,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
        </svg>
        Conectar con Strava
      </a>

      <p style={{ fontSize: 12, color: "#bbb", maxWidth: 320 }}>
        Solo necesita permisos de lectura de actividades. No escribe ni modifica nada en tu cuenta.
      </p>
    </div>
  );
}


// ─── app/dashboard/page.js ──────────────────────────────────
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ActivityFeed from "@/components/ActivityFeed";
import WeeklyProgress from "@/components/WeeklyProgress";
import ProgressChart from "@/components/ProgressChart";

export const dynamic = "force-dynamic"; // siempre fresh

async function getActivities() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/strava/activities?n=30`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function Dashboard() {
  const cookieStore = await cookies();
  const session = cookieStore.get("strava_session");
  if (!session) redirect("/");

  const sessionData = JSON.parse(session.value);
  const activities = await getActivities();

  return (
    <>
      <div style={{ marginBottom: "2rem", paddingBottom: "1.25rem", borderBottom: "0.5px solid #e5e5e5" }}>
        <p style={{ color: "#888", fontSize: 13, margin: "0 0 4px" }}>Bienvenido de vuelta</p>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>
          {sessionData.athlete_name} 👋
        </h1>
        <p style={{ color: "#aaa", fontSize: 13, margin: "4px 0 0" }}>Ironman 70.3 · Mar 2027</p>
      </div>

      <WeeklyProgress activities={activities} />
      <ProgressChart activities={activities} />
      <ActivityFeed activities={activities} />
    </>
  );
}


// ─── app/plan/page.js ───────────────────────────────────────
// Esta página embebe el plan completo como componente cliente

import PlanView from "@/components/PlanView";

export default function PlanPage() {
  return (
    <>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 4px" }}>Plan de entrenamiento</h1>
        <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Mar 2026 – Mar 2027 · 52 semanas · 5 fases</p>
      </div>
      <PlanView />
    </>
  );
}
