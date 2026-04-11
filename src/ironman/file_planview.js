"use client";
import { useState } from "react";
import { phases, zones, glossary, FC_MAX } from "@/lib/plan";

const typeColors = { swim: "#378ADD", run: "#1D9E75", bike: "#BA7517", brick: "#D85A30", race: "#534AB7", rest: "#888780" };
const typeLabels = { swim: "Natación", run: "Carrera", bike: "Bici", brick: "Ladrillo", race: "Simulacro", rest: "Descanso" };

function zRange(z) {
  return `${Math.round(FC_MAX * z.pct[0])}–${Math.round(FC_MAX * z.pct[1])} lpm`;
}

export default function PlanView() {
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
    <div style={{ fontFamily: "inherit", color: "#1a1a1a" }}>

      {/* Glossary modal */}
      {glossaryWord && (
        <div
          onClick={() => setGlossaryWord(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "1rem" }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: "1.5rem", maxWidth: 520, width: "100%", maxHeight: "75vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{glossary[glossaryWord].title}</div>
              <button onClick={() => setGlossaryWord(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#aaa", lineHeight: 1 }}>✕</button>
            </div>
            {glossary[glossaryWord].body.split("\n\n").map((p, i) => (
              <p key={i} style={{ fontSize: 14, lineHeight: 1.75, color: "#555", margin: "0 0 12px" }}>{p}</p>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "0.5px solid #e5e5e5", marginBottom: "1.5rem" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "8px 16px", fontSize: 13, border: "none",
            borderBottom: activeTab === t.id ? `2px solid ${ph.color}` : "2px solid transparent",
            background: "transparent", cursor: "pointer",
            color: activeTab === t.id ? "#1a1a1a" : "#888",
            fontWeight: activeTab === t.id ? 500 : 400,
            transition: "all .15s",
          }}>{t.label}</button>
        ))}
      </div>

      {activeTab === "plan" && (
        <>
          {/* Phase selector */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: "1.5rem" }}>
            {phases.map((p, i) => (
              <button key={p.id} onClick={() => { setActivePhase(i); setExpandedSession(null); }} style={{
                padding: "10px 6px", borderRadius: 10, textAlign: "center", cursor: "pointer",
                border: activePhase === i ? `2px solid ${p.color}` : "0.5px solid #e5e5e5",
                background: activePhase === i ? p.light : "#fff",
                transition: "all .15s",
              }}>
                <div style={{ fontSize: 10, color: p.color, fontWeight: 500, marginBottom: 2 }}>Fase {p.id}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: "#1a1a1a", lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>{p.weeks}</div>
              </button>
            ))}
          </div>

          {/* Phase banner */}
          <div style={{ borderRadius: 12, padding: "14px 16px", marginBottom: "1.25rem", background: ph.light, borderLeft: `4px solid ${ph.color}` }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: ph.darkAccent, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{ph.months}</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: ph.darkAccent, marginBottom: 6 }}>{ph.goal}</div>
            <div style={{ fontSize: 13, color: ph.darkAccent, opacity: 0.8, lineHeight: 1.6 }}>{ph.why}</div>
          </div>

          {/* Sessions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: "1.25rem" }}>
            {ph.sessions.map((s, i) => {
              const isOpen = expandedSession === i;
              const isRest = s.type === "rest";
              const c = typeColors[s.type];
              return (
                <div key={i} style={{ borderRadius: 10, border: isOpen ? `1.5px solid ${c}` : "0.5px solid #e5e5e5", background: "#fff", overflow: "hidden", transition: "border .15s" }}>
                  <button
                    onClick={() => !isRest && setExpandedSession(isOpen ? null : i)}
                    style={{ width: "100%", background: "none", border: "none", cursor: isRest ? "default" : "pointer", padding: "12px 14px", textAlign: "left", display: "grid", gridTemplateColumns: "80px 1fr auto", gap: 10, alignItems: "center" }}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#555", marginBottom: 4 }}>{s.day}</div>
                      <span style={{ fontSize: 10, fontWeight: 500, color: c, background: `${c}18`, padding: "2px 7px", borderRadius: 4 }}>{typeLabels[s.type]}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>{s.duration}{s.time && s.time !== "—" ? ` · ${s.time}` : ""}</div>
                    </div>
                    {!isRest && <div style={{ fontSize: 20, color: "#ccc", userSelect: "none", fontWeight: 300 }}>{isOpen ? "−" : "+"}</div>}
                  </button>

                  {isOpen && (
                    <div style={{ padding: "0 14px 14px", borderTop: "0.5px solid #f0f0f0" }}>
                      <div style={{ display: "inline-block", fontSize: 11, fontWeight: 500, color: c, background: `${c}15`, padding: "4px 10px", borderRadius: 6, margin: "12px 0 10px" }}>
                        FC objetivo: {s.fc}
                      </div>
                      <p style={{ fontSize: 13, lineHeight: 1.75, color: "#555", margin: "0 0 12px" }}>{s.description}</p>

                      {s.glossaryLinks?.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: "#aaa" }}>Ver en glosario:</span>
                          {s.glossaryLinks.map(gl => (
                            <button key={gl} onClick={() => setGlossaryWord(gl)} style={{
                              fontSize: 12, color: ph.darkAccent, background: ph.light, border: "none",
                              borderRadius: 5, padding: "3px 10px", cursor: "pointer", fontWeight: 500,
                            }}>{gl} ↗</button>
                          ))}
                        </div>
                      )}

                      {s.tips?.length > 0 && (
                        <div style={{ background: "#f8f8f6", borderRadius: 8, padding: "10px 12px" }}>
                          <div style={{ fontSize: 11, fontWeight: 500, color: "#bbb", marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.06em" }}>Consejos</div>
                          {s.tips.map((tip, j) => (
                            <div key={j} style={{ fontSize: 12, color: "#666", lineHeight: 1.65, marginBottom: j < s.tips.length - 1 ? 5 : 0 }}>
                              · {tip}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Validation checklist */}
          <div style={{ borderRadius: 10, border: "0.5px solid #e5e5e5", padding: "14px 16px", background: "#fafafa" }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Cómo validar que avanzaste en esta fase</div>
            {ph.validate.map((v, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: i < ph.validate.length - 1 ? 8 : 0 }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${ph.color}`, flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>{v}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === "zones" && (
        <>
          <div style={{ background: "#f0f7ff", borderRadius: 10, padding: "12px 14px", marginBottom: "1rem", fontSize: 13, color: "#555", lineHeight: 1.7, border: "0.5px solid #b5d4f4" }}>
            Tu FC máxima según la ergometría es <strong style={{ color: "#1a1a1a" }}>171 lpm</strong>. El 80% de tu entrenamiento debería ser Z2 (103–120 lpm). El error más común es entrenar Z3 creyendo que es Z2.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: "1rem" }}>
            {zones.map((z, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "8px 1fr 120px", gap: 14, alignItems: "center", padding: "12px 14px", borderRadius: 10, border: "0.5px solid #e5e5e5", background: "#fff" }}>
                <div style={{ width: 8, height: 44, borderRadius: 4, background: z.color }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{z.z} — {z.name}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>{z.desc}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: z.color }}>{zRange(z)}</div>
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>{Math.round(z.pct[0]*100)}–{Math.round(z.pct[1]*100)}% FCmáx</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: "#f8f8f6", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>La regla 80/20</div>
            <p style={{ margin: 0, fontSize: 13, color: "#555", lineHeight: 1.75 }}>80% del volumen en Z1–Z2. 20% en Z3–Z4. Ir más rápido en los días fáciles es el error número uno en triatletas amateurs. Z2 estimula la biogénesis mitocondrial sin elevar el cortisol crónico. Z4 en exceso lo hace.</p>
          </div>
        </>
      )}

      {activeTab === "nutrition" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { icon: "🌅", t: "Antes del entrenamiento", body: "1–2 horas antes: carbohidratos + algo de proteína. Ejemplos: tostadas con huevo, yogur griego con granola, avena con banana. Evitá grasas y fibra en exceso — ralentizan el vaciado gástrico." },
            { icon: "💧", t: "Durante sesiones < 60 min", body: "Solo agua. No necesitás geles. Tu glucógeno alcanza. Solo hidratate si hace calor." },
            { icon: "⚡", t: "Durante sesiones 60–90 min", body: "30–40g de carbohidratos por hora. Podés usar bebida isotónica o un gel partido en dos tomas. El objetivo es mantener la glucemia estable." },
            { icon: "🔋", t: "Durante sesiones > 90 min", body: "60–90g de carbohidratos por hora. Un gel cada 30–40 min + agua. Practicalo en entrenamiento — nunca en carrera por primera vez. Tu estómago también necesita adaptación." },
            { icon: "🔄", t: "Post entrenamiento (ventana 30 min)", body: "Proteína (20–30g) + carbohidratos (40–60g). Ejemplos: batido de proteína + banana, arroz con pollo, yogur griego con fruta. Esta ventana es real y vale aprovecharla." },
            { icon: "🥗", t: "Día a día", body: "Carbohidratos como base energética (arroz, avena, papa, pasta). Proteína en cada comida. Grasas buenas (palta, aceite de oliva). Evitá ultraprocesados en semanas de alta carga." },
            { icon: "🚰", t: "Hidratación", body: "2.5–3 litros diarios. Orina clara = bien hidratado. En entrenamientos > 60 min sumá electrolitos (sodio principalmente) para reponer lo que sudás." },
            { icon: "🏁", t: "Día de carrera", body: "Nunca debutar. Desayuno 2–3 hs antes = lo mismo que en el simulacro. Bici: gel cada 30 min + agua + electrolitos cada 20 min. Carrera: gel cada 30–35 min + agua en cada estación. 60–80g carbs/hora." },
          ].map((n, i) => (
            <div key={i} style={{ padding: "14px 16px", borderRadius: 10, background: "#fff", border: "0.5px solid #e5e5e5" }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{n.icon} {n.t}</div>
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.75 }}>{n.body}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "glossary" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {Object.entries(glossary).map(([key, val]) => (
            <div key={key} style={{ borderRadius: 10, border: "0.5px solid #e5e5e5", background: "#fff", overflow: "hidden" }}>
              <button onClick={() => setGlossaryWord(glossaryWord === key ? null : key)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "13px 16px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{val.title}</div>
                <div style={{ fontSize: 20, color: "#ccc", fontWeight: 300 }}>{glossaryWord === key ? "−" : "+"}</div>
              </button>
              {glossaryWord === key && (
                <div style={{ padding: "0 16px 16px", borderTop: "0.5px solid #f0f0f0" }}>
                  {val.body.split("\n\n").map((p, j) => (
                    <p key={j} style={{ fontSize: 13, lineHeight: 1.75, color: "#555", margin: "12px 0 0" }}>{p}</p>
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
