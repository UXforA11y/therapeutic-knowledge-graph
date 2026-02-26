import { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";

// ─── KNOWLEDGE GRAPH DATA ─────────────────────────────────────────────────────
// This mirrors what you'd store in Amazon Neptune (property graph model)
// Each node = vertex, each edge = relationship with properties

const GRAPH_DATA = {
  nodes: [
    // Therapeutic Areas
    { id: "ILD",        label: "ILD",              type: "area",     full: "Interstitial Lung Disease",       market: ["US","JP"], papers: 58 },
    { id: "ONCO",       label: "Oncology",         type: "area",     full: "Oncology",                       market: ["US","JP"], papers: 84 },
    { id: "CARDIO",     label: "Cardiology",       type: "area",     full: "Cardiology",                     market: ["US","JP"], papers: 52 },

    // Drug Targets
    { id: "TGFb",       label: "TGF-β",            type: "target",   full: "Transforming Growth Factor Beta", pathway: "Fibrosis"  },
    { id: "VEGFR",      label: "VEGFR",            type: "target",   full: "Vascular Endothelial Growth Factor Receptor", pathway: "Angiogenesis" },
    { id: "EGFR",       label: "EGFR",             type: "target",   full: "Epidermal Growth Factor Receptor", pathway: "Cell proliferation" },
    { id: "IL6",        label: "IL-6",             type: "target",   full: "Interleukin-6",                   pathway: "Inflammation" },
    { id: "PD1",        label: "PD-1",             type: "target",   full: "Programmed Death-1",              pathway: "Immune checkpoint" },
    { id: "PDGFR",      label: "PDGFR",            type: "target",   full: "Platelet-Derived Growth Factor Receptor", pathway: "Fibrosis" },

    // Compounds / Drugs
    { id: "NINT",       label: "Nintedanib",       type: "compound", full: "Nintedanib (OFEV)",  moa: "Triple kinase inhibitor", approved: ["US","JP"] },
    { id: "PREF",       label: "Pirfenidone",      type: "compound", full: "Pirfenidone (Esbriet)", moa: "Anti-fibrotic", approved: ["US","JP"] },
    { id: "SORA",       label: "Sorafenib",        type: "compound", full: "Sorafenib (Nexavar)", moa: "Multikinase inhibitor", approved: ["US","JP"] },
    { id: "TOCI",       label: "Tocilizumab",      type: "compound", full: "Tocilizumab (Actemra)", moa: "IL-6R antagonist", approved: ["US","JP"] },
    { id: "PEMB",       label: "Pembrolizumab",    type: "compound", full: "Pembrolizumab (Keytruda)", moa: "PD-1 inhibitor", approved: ["US","JP"] },

    // Papers / Studies
    { id: "P1",         label: "INPULSIS 2014",    type: "paper",    full: "Richeldi et al. NEJM 2014 — Nintedanib in IPF", journal: "NEJM", n: 1066, hr: 0.70 },
    { id: "P2",         label: "SENSCIS 2019",     type: "paper",    full: "Distler et al. NEJM 2019 — Nintedanib in SSc-ILD", journal: "NEJM", n: 576, hr: 0.73 },
    { id: "P3",         label: "ATLAS-ILD 2023",   type: "paper",    full: "Martinez et al. Lancet 2023 — ML prediction ILD", journal: "Lancet", n: 342, hr: 0.74 },
    { id: "P4",         label: "KEYNOTE-189",      type: "paper",    full: "Gandhi et al. NEJM 2018 — Pembrolizumab NSCLC", journal: "NEJM", n: 616, hr: 0.49 },
    { id: "P5",         label: "CARDIA-ML 2024",   type: "paper",    full: "Tanaka et al. JAMA 2024 — DL cardiac outcomes JP", journal: "JAMA", n: 418, hr: 0.77 },

    // ML Models
    { id: "M1",         label: "ILD-Predict",      type: "model",    full: "ILD Progression Predictor", auc: 0.924, framework: "Claude + SageMaker" },
    { id: "M2",         label: "Onco-Surv",        type: "model",    full: "Oncology Survival Model",   auc: 0.891, framework: "XGBoost + Bedrock" },
    { id: "M3",         label: "CardioRisk-JP",    type: "model",    full: "JP Cardiovascular Risk",    auc: 0.876, framework: "LightGBM + PMDA" },

    // Regulatory Bodies
    { id: "FDA",        label: "FDA",              type: "regulator", full: "Food & Drug Administration", market: "US" },
    { id: "PMDA",       label: "PMDA",             type: "regulator", full: "Pharmaceuticals and Medical Devices Agency", market: "JP" },
  ],

  edges: [
    // Area → Target relationships
    { source: "ILD",    target: "TGFb",   rel: "KEY_TARGET",    label: "key target",    weight: 5 },
    { source: "ILD",    target: "PDGFR",  rel: "KEY_TARGET",    label: "key target",    weight: 4 },
    { source: "ILD",    target: "VEGFR",  rel: "ASSOCIATED",    label: "associated",    weight: 3 },
    { source: "ONCO",   target: "EGFR",   rel: "KEY_TARGET",    label: "key target",    weight: 5 },
    { source: "ONCO",   target: "PD1",    rel: "KEY_TARGET",    label: "key target",    weight: 5 },
    { source: "ONCO",   target: "VEGFR",  rel: "KEY_TARGET",    label: "key target",    weight: 4 },
    { source: "CARDIO", target: "IL6",    rel: "KEY_TARGET",    label: "key target",    weight: 4 },
    { source: "CARDIO", target: "VEGFR",  rel: "ASSOCIATED",    label: "associated",    weight: 2 },

    // Compound → Target (mechanism of action)
    { source: "NINT",   target: "TGFb",   rel: "INHIBITS",      label: "inhibits",      weight: 5 },
    { source: "NINT",   target: "VEGFR",  rel: "INHIBITS",      label: "inhibits",      weight: 5 },
    { source: "NINT",   target: "PDGFR",  rel: "INHIBITS",      label: "inhibits",      weight: 5 },
    { source: "PREF",   target: "TGFb",   rel: "MODULATES",     label: "modulates",     weight: 3 },
    { source: "SORA",   target: "VEGFR",  rel: "INHIBITS",      label: "inhibits",      weight: 4 },
    { source: "SORA",   target: "PDGFR",  rel: "INHIBITS",      label: "inhibits",      weight: 3 },
    { source: "TOCI",   target: "IL6",    rel: "BLOCKS",        label: "blocks",        weight: 5 },
    { source: "PEMB",   target: "PD1",    rel: "BLOCKS",        label: "blocks",        weight: 5 },

    // Paper → Area / Compound
    { source: "P1",     target: "NINT",   rel: "STUDIES",       label: "studies",       weight: 4 },
    { source: "P1",     target: "ILD",    rel: "IN_AREA",       label: "in area",       weight: 4 },
    { source: "P2",     target: "NINT",   rel: "STUDIES",       label: "studies",       weight: 4 },
    { source: "P2",     target: "ILD",    rel: "IN_AREA",       label: "in area",       weight: 4 },
    { source: "P3",     target: "M1",     rel: "VALIDATES",     label: "validates",     weight: 3 },
    { source: "P3",     target: "ILD",    rel: "IN_AREA",       label: "in area",       weight: 3 },
    { source: "P4",     target: "PEMB",   rel: "STUDIES",       label: "studies",       weight: 4 },
    { source: "P4",     target: "ONCO",   rel: "IN_AREA",       label: "in area",       weight: 4 },
    { source: "P5",     target: "M3",     rel: "VALIDATES",     label: "validates",     weight: 3 },
    { source: "P5",     target: "CARDIO", rel: "IN_AREA",       label: "in area",       weight: 3 },

    // Model → Area
    { source: "M1",     target: "ILD",    rel: "PREDICTS_IN",   label: "predicts in",   weight: 4 },
    { source: "M2",     target: "ONCO",   rel: "PREDICTS_IN",   label: "predicts in",   weight: 4 },
    { source: "M3",     target: "CARDIO", rel: "PREDICTS_IN",   label: "predicts in",   weight: 4 },

    // Regulatory
    { source: "NINT",   target: "FDA",    rel: "APPROVED_BY",   label: "approved by",   weight: 3 },
    { source: "NINT",   target: "PMDA",   rel: "APPROVED_BY",   label: "approved by",   weight: 3 },
    { source: "PEMB",   target: "FDA",    rel: "APPROVED_BY",   label: "approved by",   weight: 3 },
    { source: "PEMB",   target: "PMDA",   rel: "APPROVED_BY",   label: "approved by",   weight: 3 },
    { source: "TOCI",   target: "FDA",    rel: "APPROVED_BY",   label: "approved by",   weight: 3 },
    { source: "TOCI",   target: "PMDA",   rel: "APPROVED_BY",   label: "approved by",   weight: 3 },
  ]
};

// ─── GRAPH CONCEPTS (learn-as-you-click) ─────────────────────────────────────
const CONCEPTS = {
  area:     { term: "Vertex (Nodo)", color: "#00D4C8", gremlin: "g.V().hasLabel('TherapeuticArea')", neptune: "Nodos de tipo TherapeuticArea en Neptune. Cada área terapéutica es un vértice con propiedades como market=['US','JP'] y papers count.", cypher: "MATCH (a:TherapeuticArea) RETURN a" },
  target:   { term: "Vertex — Drug Target", color: "#8B5CF6", gremlin: "g.V().hasLabel('Target').has('pathway', 'Fibrosis')", neptune: "Vértices que representan proteínas o receptores. Las propiedades del vértice almacenan el pathway biológico.", cypher: "MATCH (t:Target) WHERE t.pathway = 'Fibrosis' RETURN t" },
  compound: { term: "Vertex — Compound", color: "#F59E0B", gremlin: "g.V().hasLabel('Compound').has('approved', within('US','JP'))", neptune: "Fármacos aprobados. La aprobación por mercado es una propiedad de lista en Neptune.", cypher: "MATCH (c:Compound) WHERE 'US' IN c.approved RETURN c" },
  paper:    { term: "Vertex — Paper/Study", color: "#3B82F6", gremlin: "g.V().hasLabel('Paper').order().by('year', decr)", neptune: "Publicaciones científicas como vértices. Permiten hacer traversals: Paper→Compound→Target→Area.", cypher: "MATCH (p:Paper) RETURN p ORDER BY p.year DESC" },
  model:    { term: "Vertex — ML Model", color: "#10B981", gremlin: "g.V().hasLabel('Model').has('auc', gt(0.9))", neptune: "Modelos ML como entidades del grafo. Conectados a papers que los validan y áreas donde predicen.", cypher: "MATCH (m:Model) WHERE m.auc > 0.9 RETURN m" },
  regulator:{ term: "Vertex — Regulator", color: "#F43F5E", gremlin: "g.V().hasLabel('Regulator')", neptune: "FDA y PMDA como vértices. Los edges APPROVED_BY conectan compuestos con reguladores.", cypher: "MATCH (r:Regulator) RETURN r" },
};

const EDGE_CONCEPTS = {
  INHIBITS:    { desc: "Edge de inhibición. El compuesto bloquea la actividad del target. En Neptune: edge con propiedades como IC50, selectivity.", color: "#F43F5E" },
  KEY_TARGET:  { desc: "Edge que conecta área terapéutica con su target principal. Peso del edge = relevancia clínica.", color: "#00D4C8" },
  STUDIES:     { desc: "Edge Paper→Compound. Permite traversal: ¿Qué papers estudiaron nintedanib? g.V('NINT').in('STUDIES')", color: "#3B82F6" },
  VALIDATES:   { desc: "Edge Paper→Model. La validación científica del modelo ML está representada como relación en el grafo.", color: "#10B981" },
  APPROVED_BY: { desc: "Edge Compound→Regulator. Permite consultar: ¿Qué drogas están aprobadas en JP y US?", color: "#F59E0B" },
  PREDICTS_IN: { desc: "Edge Model→Area. El modelo ML tiene jurisdicción sobre un área terapéutica específica.", color: "#8B5CF6" },
  IN_AREA:     { desc: "Edge Paper→Area. Permite clustering de literatura por área: g.V('ILD').in('IN_AREA').hasLabel('Paper')", color: "#64748B" },
};

// ─── COLORS & THEME ──────────────────────────────────────────────────────────
const NODE_COLORS = {
  area:     "#00D4C8",
  target:   "#8B5CF6",
  compound: "#F59E0B",
  paper:    "#3B82F6",
  model:    "#10B981",
  regulator:"#F43F5E",
};

const NODE_SIZES = {
  area: 22, target: 16, compound: 18, paper: 13, model: 17, regulator: 19
};

export default function KnowledgeGraph() {
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [filter, setFilter] = useState("all");
  const [showQuery, setShowQuery] = useState("gremlin");
  const [pulseNode, setPulseNode] = useState(null);
  const [learnMode, setLearnMode] = useState(true);
  const [dims, setDims] = useState({ w: 680, h: 500 });
  const containerRef = useRef(null);

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (let e of entries) {
        setDims({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const buildGraph = useCallback(() => {
    const { w, h } = dims;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Filter nodes/edges
    const visibleTypes = filter === "all"
      ? Object.keys(NODE_COLORS)
      : [filter];
    const visibleNodes = GRAPH_DATA.nodes.filter(n => visibleTypes.includes(n.type));
    const visibleIds = new Set(visibleNodes.map(n => n.id));
    const visibleEdges = GRAPH_DATA.edges.filter(
      e => visibleIds.has(e.source) && visibleIds.has(e.target)
    );

    const nodes = visibleNodes.map(n => ({ ...n }));
    const edges = visibleEdges.map(e => ({ ...e }));

    // Simulation
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(edges).id(d => d.id).distance(d => 100 - d.weight * 8).strength(0.4))
      .force("charge", d3.forceManyBody().strength(-280))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collision", d3.forceCollide().radius(d => NODE_SIZES[d.type] + 12));
    simRef.current = sim;

    // Defs
    const defs = svg.append("defs");
    Object.entries(NODE_COLORS).forEach(([type, color]) => {
      const grad = defs.append("radialGradient")
        .attr("id", `glow_${type}`).attr("cx", "35%").attr("cy", "35%");
      grad.append("stop").attr("offset", "0%").attr("stop-color", "#ffffff").attr("stop-opacity", 0.35);
      grad.append("stop").attr("offset", "100%").attr("stop-color", color).attr("stop-opacity", 1);

      defs.append("filter").attr("id", `blur_${type}`)
        .append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur");
    });

    // Arrow markers
    Object.entries(EDGE_CONCEPTS).forEach(([rel, { color }]) => {
      defs.append("marker")
        .attr("id", `arrow_${rel}`)
        .attr("viewBox", "0 -4 8 8")
        .attr("refX", 20).attr("refY", 0)
        .attr("markerWidth", 5).attr("markerHeight", 5)
        .attr("orient", "auto")
        .append("path").attr("d", "M0,-4L8,0L0,4")
        .attr("fill", color).attr("opacity", 0.7);
    });

    // Background grid
    const grid = svg.append("g").attr("class", "grid");
    for (let x = 0; x < w; x += 40) {
      grid.append("line").attr("x1", x).attr("y1", 0).attr("x2", x).attr("y2", h)
        .attr("stroke", "#1E2D45").attr("stroke-width", 0.3);
    }
    for (let y = 0; y < h; y += 40) {
      grid.append("line").attr("x1", 0).attr("y1", y).attr("x2", w).attr("y2", y)
        .attr("stroke", "#1E2D45").attr("stroke-width", 0.3);
    }

    // Edges
    const edgeGroup = svg.append("g").attr("class", "edges");
    const edgeSel = edgeGroup.selectAll("line")
      .data(edges).enter().append("line")
      .attr("stroke", d => EDGE_CONCEPTS[d.rel]?.color || "#334155")
      .attr("stroke-width", d => Math.max(0.5, d.weight * 0.4))
      .attr("stroke-opacity", 0.35)
      .attr("marker-end", d => `url(#arrow_${d.rel})`)
      .style("cursor", "pointer")
      .on("mouseenter", (event, d) => setHoveredEdge(d))
      .on("mouseleave", () => setHoveredEdge(null));

    // Edge labels (only on hover via CSS — handled in React)

    // Node groups
    const nodeGroup = svg.append("g").attr("class", "nodes");
    const nodeSel = nodeGroup.selectAll("g")
      .data(nodes).enter().append("g")
      .attr("class", "node-group")
      .style("cursor", "pointer")
      .call(d3.drag()
        .on("start", (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on("end", (event, d) => {
          if (!event.active) sim.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      )
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelected(d);
        setPulseNode(d.id);
        setTimeout(() => setPulseNode(null), 1500);
      });

    // Glow halo
    nodeSel.append("circle")
      .attr("r", d => NODE_SIZES[d.type] + 8)
      .attr("fill", d => NODE_COLORS[d.type])
      .attr("opacity", 0.08)
      .attr("class", "halo");

    // Main circle
    nodeSel.append("circle")
      .attr("r", d => NODE_SIZES[d.type])
      .attr("fill", d => `url(#glow_${d.type})`)
      .attr("stroke", d => NODE_COLORS[d.type])
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.8);

    // Type icon / letter
    nodeSel.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#ffffff")
      .attr("font-size", d => NODE_SIZES[d.type] * 0.65)
      .attr("font-weight", "700")
      .attr("font-family", "Space Mono, monospace")
      .attr("pointer-events", "none")
      .text(d => ({ area: "Ⓣ", target: "◉", compound: "◈", paper: "▣", model: "⬡", regulator: "Ⓡ" }[d.type]));

    // Labels
    nodeSel.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", d => NODE_SIZES[d.type] + 14)
      .attr("fill", d => NODE_COLORS[d.type])
      .attr("font-size", 10)
      .attr("font-weight", "600")
      .attr("font-family", "DM Sans, sans-serif")
      .attr("pointer-events", "none")
      .text(d => d.label);

    // Hover effects
    nodeSel
      .on("mouseenter", function(event, d) {
        d3.select(this).select("circle.halo").attr("opacity", 0.2);
        d3.select(this).select("circle:not(.halo)").attr("stroke-width", 3);
        // Highlight connected edges
        edgeSel.attr("stroke-opacity", e =>
          (e.source.id === d.id || e.target.id === d.id) ? 0.9 : 0.1
        ).attr("stroke-width", e =>
          (e.source.id === d.id || e.target.id === d.id) ? e.weight * 0.7 + 1 : e.weight * 0.4
        );
      })
      .on("mouseleave", function() {
        d3.select(this).select("circle.halo").attr("opacity", 0.08);
        d3.select(this).select("circle:not(.halo)").attr("stroke-width", 1.5);
        edgeSel.attr("stroke-opacity", 0.35).attr("stroke-width", d => Math.max(0.5, d.weight * 0.4));
      });

    // Click on background deselects
    svg.on("click", () => setSelected(null));

    // Tick
    sim.on("tick", () => {
      edgeSel
        .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
        .attr("x2", d => Math.max(NODE_SIZES[d.target.type] + 5, Math.min(w - NODE_SIZES[d.target.type] - 5, d.target.x)))
        .attr("y2", d => Math.max(NODE_SIZES[d.target.type] + 5, Math.min(h - NODE_SIZES[d.target.type] - 5, d.target.y)));
      nodeSel.attr("transform", d =>
        `translate(${Math.max(30, Math.min(w - 30, d.x))}, ${Math.max(30, Math.min(h - 30, d.y))})`
      );
    });

    // Gentle initial alpha
    sim.alpha(0.8).restart();

  }, [dims, filter]);

  useEffect(() => { buildGraph(); }, [buildGraph]);

  const concept = selected ? CONCEPTS[selected.type] : null;

  const TYPES = ["all","area","target","compound","paper","model","regulator"];
  const TYPE_LABELS = { all:"All", area:"Areas", target:"Targets", compound:"Drugs", paper:"Papers", model:"ML Models", regulator:"Regulators" };

  const connectedEdges = selected
    ? GRAPH_DATA.edges.filter(e => e.source === selected.id || e.target === selected.id)
    : [];

  return (
    <div style={{
      background: "#0A0E1A", minHeight: "100vh", color: "#E2E8F0",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      display: "flex", flexDirection: "column"
    }}>
      {/* HEADER */}
      <div style={{
        borderBottom: "1px solid #1E2D45", padding: "10px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#111827"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.05em",
            fontFamily: "'Space Mono', monospace", color: "#00D4C8" }}>
            KG://therapeutic
          </span>
          <span style={{ fontSize: 11, color: "#64748B", fontFamily: "Space Mono, monospace" }}>
            Amazon Neptune · Gremlin · {GRAPH_DATA.nodes.length}V · {GRAPH_DATA.edges.length}E
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            onClick={() => setLearnMode(v => !v)}
            style={{
              background: learnMode ? "#00D4C822" : "transparent",
              border: `1px solid ${learnMode ? "#00D4C8" : "#1E2D45"}`,
              color: learnMode ? "#00D4C8" : "#64748B",
              borderRadius: 6, padding: "4px 12px", cursor: "pointer",
              fontSize: 11, fontWeight: 600, fontFamily: "inherit"
            }}>
            {learnMode ? "📚 Learn Mode ON" : "📚 Learn Mode"}
          </button>
          <span style={{ fontSize: 11, color: "#334155" }}>US · JP markets</span>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* GRAPH CANVAS */}
        <div ref={containerRef} style={{ flex: 1, position: "relative", minHeight: 500 }}>
          {/* Filter bar */}
          <div style={{
            position: "absolute", top: 12, left: 12, zIndex: 10,
            display: "flex", gap: 4, flexWrap: "wrap"
          }}>
            {TYPES.map(t => (
              <button key={t} onClick={() => setFilter(t)} style={{
                background: filter === t
                  ? (NODE_COLORS[t] || "#00D4C8") + "33"
                  : "#11182788",
                border: `1px solid ${filter === t ? (NODE_COLORS[t] || "#00D4C8") : "#1E2D45"}`,
                color: filter === t ? (NODE_COLORS[t] || "#00D4C8") : "#64748B",
                borderRadius: 6, padding: "3px 10px", cursor: "pointer",
                fontSize: 10, fontWeight: 600, fontFamily: "inherit",
                backdropFilter: "blur(8px)"
              }}>{TYPE_LABELS[t]}</button>
            ))}
          </div>

          {/* Edge hover tooltip */}
          {hoveredEdge && (
            <div style={{
              position: "absolute", bottom: 12, left: 12, zIndex: 20,
              background: "#1A2236", border: "1px solid #1E2D45",
              borderRadius: 8, padding: "8px 14px", maxWidth: 320
            }}>
              <div style={{ color: EDGE_CONCEPTS[hoveredEdge.rel]?.color || "#64748B",
                fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                EDGE: {hoveredEdge.rel}
              </div>
              <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>
                {EDGE_CONCEPTS[hoveredEdge.rel]?.desc}
              </div>
            </div>
          )}

          <svg ref={svgRef} width="100%" height="100%"
            style={{ display: "block", minHeight: 500 }} />
        </div>

        {/* SIDE PANEL */}
        <div style={{
          width: 320, borderLeft: "1px solid #1E2D45",
          background: "#111827", overflowY: "auto",
          display: "flex", flexDirection: "column"
        }}>
          {!selected ? (
            <div style={{ padding: 20 }}>
              {/* LEGEND */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700,
                  letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
                  Node Types
                </div>
                {Object.entries(NODE_COLORS).map(([type, color]) => (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "#94A3B8", textTransform: "capitalize" }}>{type}</span>
                    <span style={{ fontSize: 10, color: "#334155", marginLeft: "auto", fontFamily: "Space Mono, monospace" }}>
                      {GRAPH_DATA.nodes.filter(n => n.type === type).length}V
                    </span>
                  </div>
                ))}
              </div>

              {/* EDGE LEGEND */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700,
                  letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
                  Relationship Types
                </div>
                {Object.entries(EDGE_CONCEPTS).slice(0,5).map(([rel, { color, desc }]) => (
                  <div key={rel} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 20, height: 2, background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color, fontWeight: 700, fontFamily: "Space Mono, monospace" }}>{rel}</span>
                    </div>
                  </div>
                ))}
              </div>

              {learnMode && (
                <div style={{
                  background: "#00D4C811", border: "1px solid #00D4C833",
                  borderRadius: 8, padding: 14
                }}>
                  <div style={{ color: "#00D4C8", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                    📚 APRENDE HACIENDO
                  </div>
                  <div style={{ color: "#94A3B8", fontSize: 11, lineHeight: 1.7 }}>
                    Haz click en cualquier nodo para ver:<br/>
                    • La query Gremlin equivalente<br/>
                    • Cómo se almacena en Neptune<br/>
                    • El Cypher equivalente (Neo4j)<br/>
                    • Sus relaciones en el grafo
                  </div>
                  <div style={{ marginTop: 12, color: "#64748B", fontSize: 10, fontFamily: "Space Mono, monospace" }}>
                    Arrastra los nodos para reorganizar
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: 20 }}>
              {/* NODE DETAIL */}
              <div style={{
                background: NODE_COLORS[selected.type] + "15",
                border: `1px solid ${NODE_COLORS[selected.type]}44`,
                borderRadius: 10, padding: 14, marginBottom: 16
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: NODE_COLORS[selected.type]
                  }} />
                  <span style={{ color: NODE_COLORS[selected.type], fontSize: 10,
                    fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {selected.type}
                  </span>
                </div>
                <div style={{ color: "#E2E8F0", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                  {selected.label}
                </div>
                <div style={{ color: "#94A3B8", fontSize: 11, lineHeight: 1.6 }}>
                  {selected.full}
                </div>
                {/* Properties */}
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selected.market && (
                    <div style={{ fontSize: 10, color: NODE_COLORS[selected.type],
                      background: NODE_COLORS[selected.type] + "22",
                      border: `1px solid ${NODE_COLORS[selected.type]}44`,
                      borderRadius: 4, padding: "2px 8px" }}>
                      {Array.isArray(selected.market) ? selected.market.join(" · ") : selected.market}
                    </div>
                  )}
                  {selected.papers && <div style={{ fontSize: 10, color: "#64748B", background: "#1E2D45", borderRadius: 4, padding: "2px 8px" }}>{selected.papers} papers</div>}
                  {selected.auc && <div style={{ fontSize: 10, color: "#10B981", background: "#10B98122", borderRadius: 4, padding: "2px 8px" }}>AUC {selected.auc}</div>}
                  {selected.n && <div style={{ fontSize: 10, color: "#64748B", background: "#1E2D45", borderRadius: 4, padding: "2px 8px" }}>n={selected.n}</div>}
                  {selected.hr && <div style={{ fontSize: 10, color: "#F59E0B", background: "#F59E0B22", borderRadius: 4, padding: "2px 8px" }}>HR={selected.hr}</div>}
                  {selected.moa && <div style={{ fontSize: 10, color: "#8B5CF6", background: "#8B5CF622", borderRadius: 4, padding: "2px 8px" }}>{selected.moa}</div>}
                </div>
              </div>

              {/* CONNECTIONS */}
              {connectedEdges.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                    Edges ({connectedEdges.length})
                  </div>
                  {connectedEdges.map((e, i) => {
                    const isSource = e.source === selected.id;
                    const other = isSource ? e.target : e.source;
                    const otherNode = GRAPH_DATA.nodes.find(n => n.id === other);
                    return (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "6px 0", borderBottom: "1px solid #1E2D45",
                        cursor: "pointer"
                      }} onClick={() => setSelected(otherNode)}>
                        <div style={{
                          width: 16, height: 2,
                          background: EDGE_CONCEPTS[e.rel]?.color || "#334155"
                        }} />
                        <span style={{ fontSize: 10, color: EDGE_CONCEPTS[e.rel]?.color || "#64748B",
                          fontWeight: 700, fontFamily: "Space Mono, monospace", width: 70, flexShrink: 0 }}>
                          {isSource ? "→" : "←"} {e.rel}
                        </span>
                        <span style={{ fontSize: 11, color: NODE_COLORS[otherNode?.type],
                          fontWeight: 600, cursor: "pointer" }}>
                          {otherNode?.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* LEARN MODE: Graph concept */}
              {learnMode && concept && (
                <div style={{ background: "#0A0E1A", border: "1px solid #1E2D45", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid #1E2D45",
                    display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#00D4C8",
                      fontFamily: "Space Mono, monospace" }}>GRAPH CONCEPT</span>
                    <span style={{ fontSize: 11, color: concept.color, fontWeight: 700 }}>
                      {concept.term}
                    </span>
                  </div>
                  <div style={{ padding: "10px 14px" }}>
                    <p style={{ color: "#94A3B8", fontSize: 11, lineHeight: 1.7, marginBottom: 12 }}>
                      {concept.neptune}
                    </p>

                    {/* Query tabs */}
                    <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                      {["gremlin","cypher"].map(q => (
                        <button key={q} onClick={() => setShowQuery(q)} style={{
                          background: showQuery === q ? "#1A2236" : "transparent",
                          border: `1px solid ${showQuery === q ? "#1E2D45" : "transparent"}`,
                          color: showQuery === q ? "#00D4C8" : "#334155",
                          borderRadius: 4, padding: "2px 10px", cursor: "pointer",
                          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                          fontFamily: "Space Mono, monospace"
                        }}>{q}</button>
                      ))}
                    </div>
                    <div style={{
                      background: "#060A12", border: "1px solid #1E2D45",
                      borderRadius: 6, padding: 10
                    }}>
                      <code style={{ color: "#00D4C8", fontSize: 10,
                        fontFamily: "Space Mono, monospace", lineHeight: 1.8,
                        whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                        {showQuery === "gremlin" ? concept.gremlin : concept.cypher}
                      </code>
                    </div>

                    {showQuery === "gremlin" && (
                      <div style={{ marginTop: 10, padding: 8,
                        background: "#8B5CF611", border: "1px solid #8B5CF633",
                        borderRadius: 6 }}>
                        <div style={{ color: "#8B5CF6", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>
                          NEPTUNE TIP
                        </div>
                        <div style={{ color: "#64748B", fontSize: 10, lineHeight: 1.6 }}>
                          En AWS Neptune usas Gremlin (Apache TinkerPop). La misma query corre en Neptune sin cambios. Cypher está disponible via Neptune OpenCypher (preview).
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* STATUS BAR */}
      <div style={{
        borderTop: "1px solid #1E2D45", padding: "6px 20px",
        background: "#111827", display: "flex", justifyContent: "space-between",
        alignItems: "center", fontSize: 10, color: "#334155",
        fontFamily: "Space Mono, monospace"
      }}>
        <span>{GRAPH_DATA.nodes.length} vertices · {GRAPH_DATA.edges.length} edges · Force-directed D3 v7</span>
        <span>Amazon Neptune — Apache TinkerPop 3.x — Click node to explore</span>
      </div>
    </div>
  );
}
