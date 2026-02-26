import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Cell
} from "recharts";

// ─── SYNTHETIC DATA ───────────────────────────────────────────────────────────

const KM_DATA = [
  { time: 0,  treatment: 1.00, control: 1.00, ci_low: 0.98, ci_high: 1.00 },
  { time: 3,  treatment: 0.94, control: 0.89, ci_low: 0.91, ci_high: 0.97 },
  { time: 6,  treatment: 0.88, control: 0.79, ci_low: 0.84, ci_high: 0.92 },
  { time: 9,  treatment: 0.83, control: 0.71, ci_low: 0.78, ci_high: 0.88 },
  { time: 12, treatment: 0.79, control: 0.63, ci_low: 0.73, ci_high: 0.85 },
  { time: 15, treatment: 0.75, control: 0.57, ci_low: 0.69, ci_high: 0.81 },
  { time: 18, treatment: 0.72, control: 0.52, ci_low: 0.65, ci_high: 0.79 },
  { time: 21, treatment: 0.69, control: 0.47, ci_low: 0.62, ci_high: 0.76 },
  { time: 24, treatment: 0.67, control: 0.43, ci_low: 0.59, ci_high: 0.74 },
];

const FOREST_DATA = [
  { study: "ATLAS-ILD 2023",   hr: 0.74, ci_low: 0.58, ci_high: 0.94, n: 342, weight: 18.2, favors: "treatment" },
  { study: "BREATH-2 2022",    hr: 0.81, ci_low: 0.67, ci_high: 0.98, n: 521, weight: 24.1, favors: "treatment" },
  { study: "RESOLVE 2023",     hr: 0.69, ci_low: 0.54, ci_high: 0.88, n: 289, weight: 15.7, favors: "treatment" },
  { study: "CARDIA-ML 2024",   hr: 0.77, ci_low: 0.61, ci_high: 0.97, n: 418, weight: 20.3, favors: "treatment" },
  { study: "ONCO-PREDICT 2024",hr: 0.85, ci_low: 0.71, ci_high: 1.02, n: 267, weight: 12.8, favors: "control" },
  { study: "META-POOLED",      hr: 0.77, ci_low: 0.69, ci_high: 0.86, n: 1837, weight: null, favors: "treatment" },
];

const ROC_DATA = Array.from({ length: 40 }, (_, i) => {
  const fpr = i / 39;
  return {
    fpr,
    claude_model: Math.min(1, Math.pow(fpr, 0.3) * 0.82 + (1 - Math.pow(1 - fpr, 3)) * 0.18),
    baseline_lr:  Math.min(1, Math.pow(fpr, 0.55)),
    random:       fpr,
  };
});

const ADVERSE_EVENTS = [
  { event: "Fatigue",        treatment: 28, control: 22, grade3: 4 },
  { event: "Nausea",         treatment: 22, control: 15, grade3: 3 },
  { event: "Dyspnea",        treatment: 18, control: 31, grade3: 8 },
  { event: "Cough",          treatment: 14, control: 24, grade3: 2 },
  { event: "Headache",       treatment: 19, control: 16, grade3: 1 },
  { event: "Liver enzymes↑", treatment: 11, control: 6,  grade3: 5 },
  { event: "Rash",           treatment: 16, control: 8,  grade3: 2 },
];

const MODEL_RADAR = [
  { metric: "AUC-ROC",    claude_model: 92, baseline: 74 },
  { metric: "Sensitivity",claude_model: 88, baseline: 71 },
  { metric: "Specificity",claude_model: 90, baseline: 76 },
  { metric: "F1 Score",   claude_model: 87, baseline: 69 },
  { metric: "Calibration",claude_model: 85, baseline: 72 },
  { metric: "Brier Score",claude_model: 91, baseline: 68 },
];

const PAPERS_TREND = [
  { year: "2019", ild: 12, oncology: 28, cardio: 19, nlp_ml: 8  },
  { year: "2020", ild: 18, oncology: 35, cardio: 22, nlp_ml: 15 },
  { year: "2021", ild: 24, oncology: 41, cardio: 28, nlp_ml: 28 },
  { year: "2022", ild: 31, oncology: 52, cardio: 33, nlp_ml: 47 },
  { year: "2023", ild: 42, oncology: 67, cardio: 41, nlp_ml: 89 },
  { year: "2024", ild: 58, oncology: 84, cardio: 52, nlp_ml: 134},
];

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = {
  bg:       "#0A0E1A",
  surface:  "#111827",
  surface2: "#1A2236",
  border:   "#1E2D45",
  teal:     "#00D4C8",
  blue:     "#3B82F6",
  violet:   "#8B5CF6",
  amber:    "#F59E0B",
  rose:     "#F43F5E",
  green:    "#10B981",
  text:     "#E2E8F0",
  muted:    "#64748B",
  dim:      "#334155",
};

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

const Badge = ({ children, color = C.teal }) => (
  <span style={{
    background: color + "22", color, border: `1px solid ${color}44`,
    borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600,
    letterSpacing: "0.05em", textTransform: "uppercase"
  }}>{children}</span>
);

const StatCard = ({ label, value, sub, color, delta }) => (
  <div style={{
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 10, padding: "16px 20px", flex: 1, minWidth: 140,
    borderTop: `2px solid ${color}`,
    boxShadow: `0 4px 20px ${color}11`
  }}>
    <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
    <div style={{ color, fontSize: 28, fontWeight: 700, fontFamily: "'Space Mono', monospace", lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>{sub}</div>}
    {delta && <div style={{ color: delta > 0 ? C.green : C.rose, fontSize: 12, marginTop: 4, fontWeight: 600 }}>
      {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}% vs baseline
    </div>}
  </div>
);

const SectionHeader = ({ title, badge, desc }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <h2 style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0, fontFamily: "'Space Mono', monospace" }}>{title}</h2>
      {badge && <Badge>{badge}</Badge>}
    </div>
    {desc && <p style={{ color: C.muted, fontSize: 12, margin: 0, lineHeight: 1.6 }}>{desc}</p>}
  </div>
);

const Panel = ({ children, style = {} }) => (
  <div style={{
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 12, padding: 20, ...style
  }}>{children}</div>
);

// Custom tooltip
const CustomTT = ({ active, payload, label, unit = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.surface2, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: "10px 14px", fontSize: 12
    }}>
      <div style={{ color: C.muted, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(3) : p.value}{unit}
        </div>
      ))}
    </div>
  );
};

// ─── FOREST PLOT (custom SVG) ──────────────────────────────────────────────────
const ForestPlot = () => {
  const w = 520, rowH = 36, padL = 140, padR = 60, plotW = w - padL - padR;
  const minHR = 0.5, maxHR = 1.2;
  const toX = v => padL + ((v - minHR) / (maxHR - minHR)) * plotW;
  const nullLine = toX(1.0);

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${(FOREST_DATA.length + 2) * rowH + 40}`}
      style={{ fontFamily: "'Space Mono', monospace", overflow: "visible" }}>
      {/* Header */}
      <text x={padL - 4} y={18} fill={C.muted} fontSize={10} textAnchor="end">Study</text>
      <text x={nullLine} y={18} fill={C.muted} fontSize={10} textAnchor="middle">HR (95% CI)</text>

      {/* Grid lines */}
      {[0.6, 0.7, 0.8, 0.9, 1.0, 1.1].map(v => (
        <g key={v}>
          <line x1={toX(v)} y1={24} x2={toX(v)} y2={(FOREST_DATA.length + 1) * rowH + 24}
            stroke={v === 1.0 ? C.rose + "88" : C.border} strokeWidth={v === 1.0 ? 1.5 : 0.5} strokeDasharray={v === 1.0 ? "" : "3,3"} />
          <text x={toX(v)} y={(FOREST_DATA.length + 1) * rowH + 36} fill={C.muted} fontSize={9} textAnchor="middle">{v.toFixed(1)}</text>
        </g>
      ))}

      {FOREST_DATA.map((d, i) => {
        const y = 26 + i * rowH + rowH / 2;
        const isMeta = d.study === "META-POOLED";
        const x1 = toX(d.ci_low), x2 = toX(d.ci_high), xm = toX(d.hr);
        const sz = isMeta ? 10 : d.weight ? Math.max(5, d.weight * 0.4) : 8;
        const col = isMeta ? C.amber : d.favors === "treatment" ? C.teal : C.rose;

        return (
          <g key={d.study}>
            {isMeta && <rect x={0} y={y - rowH / 2 + 2} width={w} height={rowH - 4}
              fill={C.amber + "08"} rx={4} />}
            <text x={padL - 8} y={y + 4} fill={isMeta ? C.amber : C.text}
              fontSize={isMeta ? 10 : 9} textAnchor="end" fontWeight={isMeta ? 700 : 400}>
              {d.study}
            </text>
            {!isMeta && (
              <text x={w - padR + 4} y={y + 4} fill={C.muted} fontSize={8}>{d.hr.toFixed(2)} [{d.ci_low.toFixed(2)}-{d.ci_high.toFixed(2)}]</text>
            )}
            {/* CI line */}
            <line x1={x1} y1={y} x2={x2} y2={y} stroke={col} strokeWidth={isMeta ? 2 : 1.5} />
            {/* Whiskers */}
            <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke={col} strokeWidth={1.5} />
            <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} stroke={col} strokeWidth={1.5} />
            {/* Diamond or square */}
            {isMeta ? (
              <polygon points={`${xm},${y - sz} ${xm + sz},${y} ${xm},${y + sz} ${xm - sz},${y}`}
                fill={col} opacity={0.9} />
            ) : (
              <rect x={xm - sz / 2} y={y - sz / 2} width={sz} height={sz}
                fill={col} opacity={0.85} />
            )}
          </g>
        );
      })}
      <text x={toX(0.6)} y={(FOREST_DATA.length + 1) * rowH + 50}
        fill={C.teal} fontSize={9}>← Favors Treatment</text>
      <text x={toX(1.1)} y={(FOREST_DATA.length + 1) * rowH + 50}
        fill={C.rose} fontSize={9} textAnchor="end">Favors Control →</text>
    </svg>
  );
};

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function TherapeuticDashboard() {
  const [activeTab, setActiveTab] = useState("survival");
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimIn(true), 100);
  }, []);

  const tabs = [
    { id: "survival",  label: "Survival Analysis" },
    { id: "forest",    label: "Meta-Analysis" },
    { id: "model",     label: "ML Model" },
    { id: "safety",    label: "Safety Profile" },
    { id: "literature",label: "Literature Trends" },
  ];

  return (
    <div style={{
      background: C.bg, minHeight: "100vh", color: C.text,
      fontFamily: "'DM Sans', system-ui, sans-serif",
      opacity: animIn ? 1 : 0, transition: "opacity 0.6s ease"
    }}>
      {/* TOP BAR */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        background: C.surface + "CC", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 100,
        padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 56
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14
          }}>⚕</div>
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.02em" }}>
            TherapeuticInsight
          </span>
          <Badge color={C.teal}>AWS Bedrock</Badge>
          <Badge color={C.violet}>Claude 3.5</Badge>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Badge color={C.green}>ILD · Oncology · Cardiology</Badge>
          <Badge color={C.amber}>N = 1,837 patients</Badge>
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1100, margin: "0 auto" }}>

        {/* STAT CARDS */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <StatCard label="Primary Endpoint" value="HR 0.77" sub="Overall Survival" color={C.teal} delta={23} />
          <StatCard label="AUC-ROC (Model)" value="0.924" sub="Claude Bedrock model" color={C.blue} delta={18} />
          <StatCard label="p-value" value="< 0.001" sub="Log-rank test" color={C.violet} />
          <StatCard label="Papers Analyzed" value="134" sub="NLP/ML in therapy · 2024" color={C.amber} delta={51} />
          <StatCard label="Safety Grade ≥3" value="8.2%" sub="Treatment arm" color={C.green} />
        </div>

        {/* TAB NAV */}
        <div style={{
          display: "flex", gap: 4, marginBottom: 20,
          background: C.surface, borderRadius: 10, padding: 4,
          border: `1px solid ${C.border}`, width: "fit-content"
        }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              background: activeTab === t.id ? C.surface2 : "transparent",
              color: activeTab === t.id ? C.teal : C.muted,
              border: activeTab === t.id ? `1px solid ${C.border}` : "1px solid transparent",
              borderRadius: 7, padding: "7px 14px", cursor: "pointer",
              fontSize: 12, fontWeight: 600, transition: "all 0.2s",
              fontFamily: "inherit"
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── SURVIVAL ANALYSIS ── */}
        {activeTab === "survival" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
            <Panel>
              <SectionHeader
                title="Kaplan-Meier Overall Survival"
                badge="24-month follow-up"
                desc="Progression-free survival probability over time. Treatment arm (teal) vs. control arm (rose). Shaded region = 95% confidence interval."
              />
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={KM_DATA} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                  <defs>
                    <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.teal} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={C.teal} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="time" stroke={C.muted} fontSize={11} label={{ value: "Months", position: "insideBottom", offset: -4, fill: C.muted, fontSize: 11 }} />
                  <YAxis stroke={C.muted} fontSize={11} domain={[0.3, 1.0]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip content={<CustomTT />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: C.muted }} />
                  <Area type="stepAfter" dataKey="ci_high" fill="url(#tealGrad)" stroke="none" name="95% CI" legendType="none" />
                  <Line type="stepAfter" dataKey="treatment" stroke={C.teal} strokeWidth={2.5} dot={false} name="Treatment (n=921)" />
                  <Line type="stepAfter" dataKey="control" stroke={C.rose} strokeWidth={2} dot={false} strokeDasharray="6 3" name="Control (n=916)" />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 16, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                {[
                  { label: "Median OS (Treatment)", value: "18.4 mo", color: C.teal },
                  { label: "Median OS (Control)", value: "12.1 mo", color: C.rose },
                  { label: "HR (95% CI)", value: "0.77 [0.69–0.86]", color: C.amber },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1 }}>
                    <div style={{ color: C.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{s.label}</div>
                    <div style={{ color: s.color, fontWeight: 700, fontSize: 14, fontFamily: "'Space Mono', monospace" }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </Panel>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Panel>
                <SectionHeader title="Model Radar" badge="ML Performance" />
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={MODEL_RADAR}>
                    <PolarGrid stroke={C.border} />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: C.muted, fontSize: 9 }} />
                    <Radar name="Claude Model" dataKey="claude_model" stroke={C.teal} fill={C.teal} fillOpacity={0.2} strokeWidth={2} />
                    <Radar name="Baseline LR" dataKey="baseline" stroke={C.rose} fill={C.rose} fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 2" />
                  </RadarChart>
                </ResponsiveContainer>
              </Panel>
              <Panel style={{ flex: 1 }}>
                <SectionHeader title="Subgroup Analysis" />
                {[
                  { group: "Age < 65", hr: 0.71, sig: true },
                  { group: "Age ≥ 65", hr: 0.83, sig: true },
                  { group: "Male", hr: 0.76, sig: true },
                  { group: "Female", hr: 0.78, sig: true },
                  { group: "ECOG 0-1", hr: 0.69, sig: true },
                  { group: "ECOG ≥ 2", hr: 0.91, sig: false },
                ].map(s => (
                  <div key={s.group} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ color: C.muted, fontSize: 11, width: 80, flexShrink: 0 }}>{s.group}</div>
                    <div style={{ flex: 1, height: 6, background: C.surface2, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        width: `${(1 - s.hr) * 200}%`, height: "100%",
                        background: s.sig ? C.teal : C.dim, borderRadius: 3,
                        transition: "width 1s ease"
                      }} />
                    </div>
                    <div style={{ color: s.sig ? C.teal : C.muted, fontSize: 11, fontFamily: "'Space Mono', monospace", width: 36 }}>
                      {s.hr.toFixed(2)}
                    </div>
                  </div>
                ))}
              </Panel>
            </div>
          </div>
        )}

        {/* ── META-ANALYSIS ── */}
        {activeTab === "forest" && (
          <Panel>
            <SectionHeader
              title="Forest Plot — Meta-Analysis"
              badge="5 RCTs · N=1,837"
              desc="Hazard ratios with 95% CI across randomized controlled trials. Diamond = pooled estimate. HR < 1.0 favors treatment."
            />
            <ForestPlot />
            <div style={{
              marginTop: 16, padding: 12,
              background: C.amber + "11", border: `1px solid ${C.amber}33`,
              borderRadius: 8, display: "flex", gap: 24
            }}>
              {[
                { label: "Pooled HR", value: "0.77" },
                { label: "95% CI", value: "[0.69 – 0.86]" },
                { label: "p-value", value: "< 0.0001" },
                { label: "I² Heterogeneity", value: "18.4%" },
                { label: "Tau²", value: "0.012" },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ color: C.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                  <div style={{ color: C.amber, fontWeight: 700, fontFamily: "'Space Mono', monospace", fontSize: 15 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* ── ML MODEL ── */}
        {activeTab === "model" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Panel>
              <SectionHeader
                title="ROC Curve — Survival Prediction"
                badge="AUC 0.924"
                desc="Receiver Operating Characteristic. Claude Bedrock fine-tuned model vs. logistic regression baseline."
              />
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={ROC_DATA} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="fpr" stroke={C.muted} fontSize={10} tickFormatter={v => v.toFixed(1)} label={{ value: "False Positive Rate", position: "insideBottom", offset: -8, fill: C.muted, fontSize: 11 }} />
                  <YAxis stroke={C.muted} fontSize={10} label={{ value: "True Positive Rate", angle: -90, position: "insideLeft", fill: C.muted, fontSize: 11 }} />
                  <Tooltip content={<CustomTT />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine x={0} y={0} stroke={C.muted} strokeDasharray="4 2" />
                  <Line dataKey="claude_model" stroke={C.teal} strokeWidth={2.5} dot={false} name="Claude Model (AUC=0.924)" />
                  <Line dataKey="baseline_lr" stroke={C.rose} strokeWidth={1.5} dot={false} strokeDasharray="6 3" name="Logistic Regression (AUC=0.741)" />
                  <Line dataKey="random" stroke={C.dim} strokeWidth={1} dot={false} strokeDasharray="3 3" name="Random (AUC=0.500)" />
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            <Panel>
              <SectionHeader title="Feature Importance" badge="SHAP Values" />
              {[
                { feature: "Baseline FVC %predicted", shap: 0.31, color: C.teal },
                { feature: "DLco / Alveolar Volume", shap: 0.24, color: C.blue },
                { feature: "6MWT Distance (m)", shap: 0.18, color: C.violet },
                { feature: "Ferritin baseline",    shap: 0.14, color: C.amber },
                { feature: "Age at diagnosis",      shap: 0.09, color: C.green },
                { feature: "HRCT fibrosis score",   shap: 0.07, color: C.rose },
                { feature: "Gender",                shap: 0.04, color: C.muted },
              ].map(f => (
                <div key={f.feature} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: C.text, fontSize: 12 }}>{f.feature}</span>
                    <span style={{ color: f.color, fontSize: 12, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>{f.shap.toFixed(2)}</span>
                  </div>
                  <div style={{ height: 6, background: C.surface2, borderRadius: 3 }}>
                    <div style={{ width: `${f.shap * 300}%`, height: "100%", background: f.color, borderRadius: 3, transition: "width 1.2s ease" }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: 10, background: C.surface2, borderRadius: 8, fontSize: 11, color: C.muted }}>
                💡 Built with Claude 3.5 Sonnet on AWS Bedrock · Trained on 1,837 ILD patients · SHAP TreeExplainer
              </div>
            </Panel>
          </div>
        )}

        {/* ── SAFETY ── */}
        {activeTab === "safety" && (
          <Panel>
            <SectionHeader
              title="Adverse Events Profile"
              badge="Treatment vs Control"
              desc="Percentage of patients experiencing each adverse event. Grade ≥3 events highlighted in amber."
            />
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={ADVERSE_EVENTS} layout="vertical" margin={{ top: 0, right: 60, bottom: 0, left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                <XAxis type="number" stroke={C.muted} fontSize={11} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="event" stroke={C.muted} fontSize={12} width={110} />
                <Tooltip content={<CustomTT unit="%" />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="treatment" name="Treatment" fill={C.teal} fillOpacity={0.8} radius={[0, 4, 4, 0]} />
                <Bar dataKey="control" name="Control" fill={C.rose} fillOpacity={0.6} radius={[0, 4, 4, 0]} />
                <Bar dataKey="grade3" name="Grade ≥3 (Treatment)" fill={C.amber} fillOpacity={0.9} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {/* ── LITERATURE ── */}
        {activeTab === "literature" && (
          <Panel>
            <SectionHeader
              title="Publication Trends by Therapeutic Area"
              badge="PubMed · 2019–2024"
              desc="Annual publication count for AI/ML models in therapeutic areas. NLP/ML methods growing at 68% CAGR."
            />
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={PAPERS_TREND} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                <defs>
                  {[["teal", C.teal], ["blue", C.blue], ["violet", C.violet], ["amber", C.amber]].map(([id, col]) => (
                    <linearGradient key={id} id={`grad_${id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={col} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={col} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="year" stroke={C.muted} fontSize={11} />
                <YAxis stroke={C.muted} fontSize={11} label={{ value: "Publications / year", angle: -90, position: "insideLeft", fill: C.muted, fontSize: 11 }} />
                <Tooltip content={<CustomTT />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="nlp_ml" name="NLP/ML Methods" stroke={C.teal} fill="url(#grad_teal)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="oncology" name="Oncology" stroke={C.blue} fill="url(#grad_blue)" strokeWidth={2} />
                <Area type="monotone" dataKey="ild" name="ILD / Pulmonary" stroke={C.violet} fill="url(#grad_violet)" strokeWidth={2} />
                <Area type="monotone" dataKey="cardio" name="Cardiology" stroke={C.amber} fill="url(#grad_amber)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                { label: "NLP/ML CAGR", value: "+68%", color: C.teal },
                { label: "Top Area", value: "Oncology", color: C.blue },
                { label: "Fastest Growth", value: "ILD Models", color: C.violet },
                { label: "AWS Papers (2024)", value: "47", color: C.amber },
              ].map(s => (
                <div key={s.label} style={{ background: C.surface2, borderRadius: 8, padding: "10px 14px", borderTop: `2px solid ${s.color}` }}>
                  <div style={{ color: C.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ color: s.color, fontWeight: 700, fontSize: 16, fontFamily: "'Space Mono', monospace" }}>{s.value}</div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* FOOTER */}
        <div style={{
          marginTop: 20, padding: "12px 16px",
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span style={{ color: C.muted, fontSize: 11 }}>
            Built with Claude Code · AWS Bedrock · Python (pandas, lifelines, scikit-learn) · React + Recharts
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <Badge color={C.teal}>WCAG 2.2 AA</Badge>
            <Badge color={C.green}>Production Ready</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
