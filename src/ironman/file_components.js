// ─── components/ActivityFeed.jsx ────────────────────────────
"use client";
import { formatDistance, formatDuration, paceFromMps, typeLabel, typeColor, getZone } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default function ActivityFeed({ activities }) {
  if (!activities?.length) return (
    <div style={{ padding: "2rem", textAlign: "center", color: "#888", fontSize: 14 }}>
      No hay actividades recientes de Strava.
    </div>
  );

  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: "0.75rem" }}>
        Actividades recientes
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {activities.slice(0, 10).map(a => {
          const zone = getZone(a.avg_heartrate);
          const color = typeColor(a.type);
          return (
            <div key={a.id} style={{
              display: "grid", gridTemplateColumns: "8px 1fr auto",
              gap: 12, padding: "12px 14px", borderRadius: 10,
              border: "0.5px solid #e5e5e5", background: "#fff", alignItems: "center",
            }}>
              <div style={{ width: 8, height: 40, borderRadius: 4, background: color }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: "#888", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span>{format(parseISO(a.date), "EEEE d MMM", { locale: es })}</span>
                  {a.distance_m > 100 && <span>{formatDistance(a.distance_m)}</span>}
                  <span>{formatDuration(a.moving_time_s)}</span>
                  {a.type === "Run" && a.avg_speed_mps && <span>{paceFromMps(a.avg_speed_mps)}</span>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                {zone && (
                  <div style={{
                    fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 6,
                    background: `${zone.color}20`, color: zone.color,
                  }}>
                    {zone.z} · {Math.round(a.avg_heartrate)} lpm
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
                  {typeLabel(a.type)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}


// ─── components/WeeklyProgress.jsx ──────────────────────────
"use client";
import { phases } from "@/lib/plan";
import { matchesSessionType } from "@/lib/utils";
import { parseISO, isThisWeek } from "date-fns";

const typeColors = {
  swim: "#378ADD", run: "#1D9E75", bike: "#BA7517",
  brick: "#D85A30", race: "#534AB7", rest: "#e5e5e5"
};
const typeIcons = { swim: "🏊", run: "🏃", bike: "🚴", brick: "⚡", race: "🏁", rest: "😴" };

function getCurrentPhase() {
  const now = new Date();
  const start = new Date("2026-03-01");
  const weekNum = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000)) + 1;
  if (weekNum <= 8)  return phases[0];
  if (weekNum <= 20) return phases[1];
  if (weekNum <= 32) return phases[2];
  if (weekNum <= 44) return phases[3];
  return phases[4];
}

export default function WeeklyProgress({ activities }) {
  const phase = getCurrentPhase();
  const thisWeekActivities = (activities || []).filter(a =>
    isThisWeek(parseISO(a.date), { weekStartsOn: 1 })
  );

  return (
    <section style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem" }}>
        <h2 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>Semana actual</h2>
        <span style={{ fontSize: 12, color: phase.color, fontWeight: 500, background: phase.light, padding: "2px 8px", borderRadius: 6 }}>
          {phase.name}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {phase.sessions.map((s, i) => {
          const done = s.type !== "rest" && thisWeekActivities.some(a =>
            matchesSessionType(a.type, s.type)
          );
          const isRest = s.type === "rest";

          return (
            <div key={i} style={{
              borderRadius: 10, padding: "10px 6px", textAlign: "center",
              border: done
                ? `1.5px solid ${typeColors[s.type]}`
                : "0.5px solid #e5e5e5",
              background: done ? `${typeColors[s.type]}12` : isRest ? "#fafafa" : "#fff",
              position: "relative",
            }}>
              <div style={{ fontSize: 16, marginBottom: 4 }}>{typeIcons[s.type]}</div>
              <div style={{ fontSize: 10, fontWeight: 500, color: "#555", lineHeight: 1.3, marginBottom: 4 }}>
                {s.day.slice(0, 3)}
              </div>
              {done && (
                <div style={{
                  position: "absolute", top: 4, right: 4,
                  width: 14, height: 14, borderRadius: "50%",
                  background: typeColors[s.type],
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 8, color: "#fff", fontWeight: 700,
                }}>✓</div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>
        {thisWeekActivities.length} actividad{thisWeekActivities.length !== 1 ? "es" : ""} esta semana en Strava
      </div>
    </section>
  );
}


// ─── components/ProgressChart.jsx ───────────────────────────
"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { paceFromMps } from "@/lib/utils";

export default function ProgressChart({ activities }) {
  const runs = (activities || [])
    .filter(a => a.type === "Run" && a.avg_heartrate && a.distance_m > 1000)
    .slice(0, 20)
    .reverse();

  if (runs.length < 2) return null;

  const data = runs.map(a => ({
    date: format(parseISO(a.date), "d MMM", { locale: es }),
    "FC prom": Math.round(a.avg_heartrate),
    "Ritmo (s/km)": a.avg_speed_mps ? Math.round(1000 / a.avg_speed_mps) : null,
    _pace: paceFromMps(a.avg_speed_mps),
  }));

  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: "0.75rem" }}>
        FC y ritmo en carreras
      </h2>
      <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e5e5e5", padding: "1rem" }}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 12, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#999" }} />
            <YAxis yAxisId="fc" domain={[100, 200]} tick={{ fontSize: 11, fill: "#999" }} />
            <YAxis yAxisId="pace" orientation="right" domain={[240, 420]} hide />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "0.5px solid #e5e5e5" }}
              formatter={(val, name, props) => {
                if (name === "FC prom") return [`${val} lpm`, name];
                if (name === "Ritmo") return [props.payload._pace, name];
                return [val, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line yAxisId="fc" type="monotone" dataKey="FC prom" stroke="#378ADD" strokeWidth={2} dot={{ r: 3 }} name="FC prom" />
            <Line yAxisId="pace" type="monotone" dataKey="Ritmo (s/km)" stroke="#1D9E75" strokeWidth={2} dot={{ r: 3 }} name="Ritmo" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
