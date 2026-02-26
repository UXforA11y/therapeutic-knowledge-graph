import { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";

// ─── GRAPH DATA ───────────────────────────────────────────────────────────────
const GRAPH_DATA = {
  nodes: [
    { id: "ILD",   label: "ILD",          type: "area",      full: "Interstitial Lung Disease",                  market: ["US","JP"], papers: 58 },
    { id: "ONCO",  label: "Oncology",     type: "area",      full: "Oncology",                                   market: ["US","JP"], papers: 84 },
    { id: "CARDIO",label: "Cardiology",   type: "area",      full: "Cardiology",                                 market: ["US","JP"], papers: 52 },
    { id: "TGFb",  label: "TGF-β",        type: "target",    full: "Transforming Growth Factor Beta",            pathway: "Fibrosis"  },
    { id: "VEGFR", label: "VEGFR",        type: "target",    full: "Vascular Endothelial Growth Factor Receptor",pathway: "Angiogenesis" },
    { id: "EGFR",  label: "EGFR",         type: "target",    full: "Epidermal Growth Factor Receptor",           pathway: "Cell proliferation" },
    { id: "IL6",   label: "IL-6",         type: "target",    full: "Interleukin-6",                              pathway: "Inflammation" },
    { id: "PD1",   label: "PD-1",         type: "target",    full: "Programmed Death-1",                        pathway: "Immune checkpoint" },
    { id: "PDGFR", label: "PDGFR",        type: "target",    full: "Platelet-Derived Growth Factor Receptor",   pathway: "Fibrosis" },
    { id: "NINT",  label: "Nintedanib",   type: "compound",  full: "Nintedanib (OFEV)",  moa: "Triple kinase inhibitor", approved: ["US","JP"] },
    { id: "PREF",  label: "Pirfenidone",  type: "compound",  full: "Pirfenidone (Esbriet)", moa: "Anti-fibrotic",       approved: ["US","JP"] },
    { id: "SORA",  label: "Sorafenib",    type: "compound",  full: "Sorafenib (Nexavar)", moa: "Multikinase inhibitor", approved: ["US","JP"] },
    { id: "TOCI",  label: "Tocilizumab",  type: "compound",  full: "Tocilizumab (Actemra)", moa: "IL-6R antagonist",   approved: ["US","JP"] },
    { id: "PEMB",  label: "Pembrolizumab",type: "compound",  full: "Pembrolizumab (Keytruda)", moa: "PD-1 inhibitor",  approved: ["US","JP"] },
    { id: "P1",    label: "INPULSIS 2014",type: "paper",     full: "Richeldi et al. NEJM 2014 — Nintedanib in IPF",    journal: "NEJM",   n: 1066, hr: 0.70 },
    { id: "P2",    label: "SENSCIS 2019", type: "paper",     full: "Distler et al. NEJM 2019 — Nintedanib in SSc-ILD", journal: "NEJM",   n: 576,  hr: 0.73 },
    { id: "P3",    label: "ATLAS-ILD 2023",type:"paper",     full: "Martinez et al. Lancet 2023 — ML prediction ILD", journal: "Lancet", n: 342,  hr: 0.74 },
    { id: "P4",    label: "KEYNOTE-189",  type: "paper",     full: "Gandhi et al. NEJM 2018 — Pembrolizumab NSCLC",   journal: "NEJM",   n: 616,  hr: 0.49 },
    { id: "P5",    label: "CARDIA-ML 2024",type:"paper",     full: "Tanaka et al. JAMA 2024 — DL cardiac outcomes JP", journal: "JAMA",  n: 418,  hr: 0.77 },
    { id: "M1",    label: "ILD-Predict",  type: "model",     full: "ILD Progression Predictor",    auc: 0.924, framework: "Claude + SageMaker" },
    { id: "M2",    label: "Onco-Surv",    type: "model",     full: "Oncology Survival Model",       auc: 0.891, framework: "XGBoost + Bedrock" },
    { id: "M3",    label: "CardioRisk-JP",type: "model",     full: "JP Cardiovascular Risk",        auc: 0.876, framework: "LightGBM + PMDA" },
    { id: "FDA",   label: "FDA",          type: "regulator", full: "Food & Drug Administration",    market: "US" },
    { id: "PMDA",  label: "PMDA",         type: "regulator", full: "Pharmaceuticals and Medical Devices Agency", market: "JP" },
  ],
  edges: [
    { source: "ILD",   target: "TGFb",  rel: "KEY_TARGET",  weight: 5 },
    { source: "ILD",   target: "PDGFR", rel: "KEY_TARGET",  weight: 4 },
    { source: "ILD",   target: "VEGFR", rel: "ASSOCIATED",  weight: 3 },
    { source: "ONCO",  target: "EGFR",  rel: "KEY_TARGET",  weight: 5 },
    { source: "ONCO",  target: "PD1",   rel: "KEY_TARGET",  weight: 5 },
    { source: "ONCO",  target: "VEGFR", rel: "KEY_TARGET",  weight: 4 },
    { source: "CARDIO",target: "IL6",   rel: "KEY_TARGET",  weight: 4 },
    { source: "CARDIO",target: "VEGFR", rel: "ASSOCIATED",  weight: 2 },
    { source: "NINT",  target: "TGFb",  rel: "INHIBITS",    weight: 5 },
    { source: "NINT",  target: "VEGFR", rel: "INHIBITS",    weight: 5 },
    { source: "NINT",  target: "PDGFR", rel: "INHIBITS",    weight: 5 },
    { source: "PREF",  target: "TGFb",  rel: "MODULATES",   weight: 3 },
    { source: "SORA",  target: "VEGFR", rel: "INHIBITS",    weight: 4 },
    { source: "SORA",  target: "PDGFR", rel: "INHIBITS",    weight: 3 },
    { source: "TOCI",  target: "IL6",   rel: "BLOCKS",      weight: 5 },
    { source: "PEMB",  target: "PD1",   rel: "BLOCKS",      weight: 5 },
    { source: "P1",    target: "NINT",  rel: "STUDIES",     weight: 4 },
    { source: "P1",    target: "ILD",   rel: "IN_AREA",     weight: 4 },
    { source: "P2",    target: "NINT",  rel: "STUDIES",     weight: 4 },
    { source: "P2",    target: "ILD",   rel: "IN_AREA",     weight: 4 },
    { source: "P3",    target: "M1",    rel: "VALIDATES",   weight: 3 },
    { source: "P3",    target: "ILD",   rel: "IN_AREA",     weight: 3 },
    { source: "P4",    target: "PEMB",  rel: "STUDIES",     weight: 4 },
    { source: "P4",    target: "ONCO",  rel: "IN_AREA",     weight: 4 },
    { source: "P5",    target: "M3",    rel: "VALIDATES",   weight: 3 },
    { source: "P5",    target: "CARDIO",rel: "IN_AREA",     weight: 3 },
    { source: "M1",    target: "ILD",   rel: "PREDICTS_IN", weight: 4 },
    { source: "M2",    target: "ONCO",  rel: "PREDICTS_IN", weight: 4 },
    { source: "M3",    target: "CARDIO",rel: "PREDICTS_IN", weight: 4 },
    { source: "NINT",  target: "FDA",   rel: "APPROVED_BY", weight: 3 },
    { source: "NINT",  target: "PMDA",  rel: "APPROVED_BY", weight: 3 },
    { source: "PEMB",  target: "FDA",   rel: "APPROVED_BY", weight: 3 },
    { source: "PEMB",  target: "PMDA",  rel: "APPROVED_BY", weight: 3 },
    { source: "TOCI",  target: "FDA",   rel: "APPROVED_BY", weight: 3 },
    { source: "TOCI",  target: "PMDA",  rel: "APPROVED_BY", weight: 3 },
  ]
};

// ─── STORY TEMPLATES (what gets sent to Claude) ───────────────────────────────
const STORY_TYPES = [
  { id: "brief",     label: "Research Brief",    icon: "📋", desc: "Executive summary for medical affairs" },
  { id: "narrative", label: "Clinical Narrative",icon: "🏥", desc: "Patient-centered clinical story" },
  { id: "dossier",   label: "Regulatory Dossier",icon: "📄", desc: "FDA/PMDA submission language" },
  { id: "pitch",     label: "Investor Pitch",    icon: "🚀", desc: "BD&L opportunity framing" },
  { id: "tweet",     label: "Science Thread",    icon: "🧵", desc: "Public science communication" },
];

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = {
  bg:"#070B14", surface:"#0F1623", surface2:"#162032",
  border:"#1B2A40", teal:"#00D4C8", blue:"#3B82F6",
  violet:"#8B5CF6", amber:"#F59E0B", rose:"#F43F5E",
  green:"#10B981", text:"#E2E8F0", muted:"#64748B", dim:"#1E2D45"
};
const NC = { area:"#00D4C8", target:"#8B5CF6", compound:"#F59E0B", paper:"#3B82F6", model:"#10B981", regulator:"#F43F5E" };
const NS = { area:22, target:16, compound:18, paper:13, model:17, regulator:19 };
const ICONS = { area:"Ⓣ", target:"◉", compound:"◈", paper:"▣", model:"⬡", regulator:"Ⓡ" };

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function buildGraphContext(node) {
  const connected = GRAPH_DATA.edges
    .filter(e => e.source === node.id || e.target === node.id)
    .map(e => {
      const otherId = e.source === node.id ? e.target : e.source;
      const other = GRAPH_DATA.nodes.find(n => n.id === otherId);
      const dir = e.source === node.id ? "→" : "←";
      return `${dir} [${e.rel}] ${other?.label} (${other?.full})`;
    });
  return {
    node: `${node.label} — ${node.full}`,
    type: node.type,
    properties: Object.entries(node)
      .filter(([k]) => !["id","label","type","full"].includes(k))
      .map(([k,v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join(" | "),
    relationships: connected.join("\n"),
    gremlin: `g.V('${node.id}').bothE().otherV().path()`,
    totalEdges: connected.length
  };
}

function buildPrompt(node, storyType, market) {
  const ctx = buildGraphContext(node);
  const marketCtx = market === "JP"
    ? "Target market: Japan (PMDA regulatory framework, Japanese patient population, bilingual output with key terms in English)."
    : market === "US"
    ? "Target market: United States (FDA regulatory framework, US clinical practice guidelines)."
    : "Target markets: US (FDA) and Japan (PMDA), dual-market perspective.";

  const toneMap = {
    brief:     "Write a concise 3-paragraph research brief for a Medical Affairs team. Include: therapeutic context, mechanism evidence, and key clinical implications. Use formal medical language.",
    narrative: "Write a compelling clinical narrative (2-3 paragraphs) from the perspective of a patient journey and the unmet medical need this addresses. Make it human and impactful.",
    dossier:   "Write regulatory submission language (2 paragraphs) suitable for an FDA/PMDA CTD Section 2.5 (Clinical Overview). Be precise, cite the graph data as evidence sources, use ICH E3 structure.",
    pitch:     "Write a 3-paragraph BD&L investor pitch highlighting the commercial opportunity, differentiation, and market potential. Be compelling and data-driven.",
    tweet:     "Write a 5-tweet science thread (each tweet max 280 chars, numbered 1/5 to 5/5) explaining this discovery/connection in accessible language for the scientific community.",
  };

  return `You are a Senior Medical Writer and GenAI architect working on therapeutic area intelligence for pharma.

KNOWLEDGE GRAPH NODE SELECTED:
Entity: ${ctx.node}
Type: ${ctx.type}
Properties: ${ctx.properties}

GRAPH TRAVERSAL (Neptune Gremlin: ${ctx.gremlin}):
Connected entities (${ctx.totalEdges} relationships):
${ctx.relationships}

${marketCtx}

TASK: ${toneMap[storyType]}

Ground every claim in the graph data above. Do not hallucinate clinical data not present in the graph. If referencing papers, use the full citation provided. Keep the output focused, professional, and immediately usable.`;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function KGStories() {
  const svgRef      = useRef(null);
  const containerRef= useRef(null);
  const [dims, setDims]           = useState({ w: 600, h: 480 });
  const [selected, setSelected]   = useState(null);
  const [filter, setFilter]       = useState("all");
  const [storyType, setStoryType] = useState("brief");
  const [market, setMarket]       = useState("BOTH");
  const [story, setStory]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [tab, setTab]             = useState("graph"); // "graph" | "story"
  const [history, setHistory]     = useState([]);
  const [hoveredEdge, setHoveredEdge] = useState(null);

  useEffect(() => {
    const obs = new ResizeObserver(e => {
      setDims({ w: e[0].contentRect.width, h: e[0].contentRect.height });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const generateStory = async () => {
    if (!selected) return;
    setLoading(true);
    setError("");
    setStory("");
    setTab("story");
    const prompt = buildPrompt(selected, storyType, market);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          stream: true,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
        for (const line of lines) {
          try {
            const json = JSON.parse(line.slice(6));
            if (json.type === "content_block_delta" && json.delta?.text) {
              full += json.delta.text;
              setStory(full);
            }
          } catch {}
        }
      }
      // Save to history
      const storyObj = {
        id: Date.now(), node: selected.label, type: storyType,
        market, text: full, nodeType: selected.type,
        color: NC[selected.type], gremlin: buildGraphContext(selected).gremlin
      };
      setHistory(h => [storyObj, ...h].slice(0, 8));
    } catch (e) {
      setError("API error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── D3 Graph ───────────────────────────────────────────────────────────────
  const buildGraph = useCallback(() => {
    const { w, h } = dims;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const visTypes = filter === "all" ? Object.keys(NC) : [filter];
    const vNodes = GRAPH_DATA.nodes.filter(n => visTypes.includes(n.type)).map(n => ({...n}));
    const vIds = new Set(vNodes.map(n => n.id));
    const vEdges = GRAPH_DATA.edges.filter(e => vIds.has(e.source) && vIds.has(e.target)).map(e=>({...e}));

    const sim = d3.forceSimulation(vNodes)
      .force("link", d3.forceLink(vEdges).id(d=>d.id).distance(d=>100-d.weight*8).strength(0.4))
      .force("charge", d3.forceManyBody().strength(-260))
      .force("center", d3.forceCenter(w/2, h/2))
      .force("collision", d3.forceCollide().radius(d=>NS[d.type]+12));

    const defs = svg.append("defs");
    Object.entries(NC).forEach(([t,col]) => {
      const g = defs.append("radialGradient").attr("id",`g_${t}`).attr("cx","35%").attr("cy","35%");
      g.append("stop").attr("offset","0%").attr("stop-color","#fff").attr("stop-opacity",0.3);
      g.append("stop").attr("offset","100%").attr("stop-color",col).attr("stop-opacity",1);
      defs.append("marker").attr("id",`arr_${t}`)
        .attr("viewBox","0 -4 8 8").attr("refX",22).attr("markerWidth",5).attr("markerHeight",5).attr("orient","auto")
        .append("path").attr("d","M0,-4L8,0L0,4").attr("fill",col).attr("opacity",0.6);
    });

    // grid
    const grid = svg.append("g");
    for(let x=0;x<w;x+=40) grid.append("line").attr("x1",x).attr("y1",0).attr("x2",x).attr("y2",h).attr("stroke","#1B2A40").attr("stroke-width",0.3);
    for(let y=0;y<h;y+=40) grid.append("line").attr("x1",0).attr("y1",y).attr("x2",w).attr("y2",y).attr("stroke","#1B2A40").attr("stroke-width",0.3);

    const edgeSel = svg.append("g").selectAll("line").data(vEdges).enter().append("line")
      .attr("stroke", d => { const src = vNodes.find(n=>n.id===d.source.id||n.id===d.source); return src ? NC[src.type] : "#334155"; })
      .attr("stroke-width", d=>Math.max(0.5,d.weight*0.35))
      .attr("stroke-opacity", 0.3)
      .attr("marker-end", d => { const src = vNodes.find(n=>n.id===d.source.id||n.id===d.source); return src ? `url(#arr_${src.type})` : ""; })
      .style("cursor","pointer")
      .on("mouseenter", (_,d)=>setHoveredEdge(d))
      .on("mouseleave", ()=>setHoveredEdge(null));

    const nodeG = svg.append("g").selectAll("g").data(vNodes).enter().append("g")
      .style("cursor","pointer")
      .call(d3.drag()
        .on("start",(ev,d)=>{ if(!ev.active) sim.alphaTarget(0.3).restart(); d.fx=d.x;d.fy=d.y; })
        .on("drag",(ev,d)=>{ d.fx=ev.x;d.fy=ev.y; })
        .on("end",(ev,d)=>{ if(!ev.active) sim.alphaTarget(0); d.fx=null;d.fy=null; })
      )
      .on("click",(ev,d)=>{ ev.stopPropagation(); setSelected(d); setTab("graph"); })
      .on("mouseenter", function(_,d) {
        d3.select(this).select(".halo").attr("opacity",0.22);
        d3.select(this).select(".main-circle").attr("stroke-width",3);
        edgeSel.attr("stroke-opacity", e => (e.source.id===d.id||e.target.id===d.id||e.source===d.id||e.target===d.id) ? 0.9 : 0.08)
               .attr("stroke-width",   e => (e.source.id===d.id||e.target.id===d.id||e.source===d.id||e.target===d.id) ? e.weight*0.7+1 : e.weight*0.3);
      })
      .on("mouseleave", function() {
        d3.select(this).select(".halo").attr("opacity",0.07);
        d3.select(this).select(".main-circle").attr("stroke-width",1.5);
        edgeSel.attr("stroke-opacity",0.3).attr("stroke-width",d=>Math.max(0.5,d.weight*0.35));
      });

    nodeG.append("circle").attr("class","halo").attr("r",d=>NS[d.type]+10).attr("fill",d=>NC[d.type]).attr("opacity",0.07);
    nodeG.append("circle").attr("class","main-circle").attr("r",d=>NS[d.type]).attr("fill",d=>`url(#g_${d.type})`).attr("stroke",d=>NC[d.type]).attr("stroke-width",1.5).attr("stroke-opacity",0.8);
    nodeG.append("text").attr("text-anchor","middle").attr("dy","0.35em").attr("fill","#fff").attr("font-size",d=>NS[d.type]*0.65).attr("font-family","Space Mono,monospace").attr("pointer-events","none").text(d=>ICONS[d.type]);
    nodeG.append("text").attr("text-anchor","middle").attr("dy",d=>NS[d.type]+14).attr("fill",d=>NC[d.type]).attr("font-size",9.5).attr("font-weight",600).attr("font-family","DM Sans,sans-serif").attr("pointer-events","none").text(d=>d.label);

    svg.on("click",()=>setSelected(null));

    sim.on("tick",()=>{
      edgeSel.attr("x1",d=>d.source.x).attr("y1",d=>d.source.y)
             .attr("x2",d=>Math.max(25,Math.min(w-25,d.target.x)))
             .attr("y2",d=>Math.max(25,Math.min(h-25,d.target.y)));
      nodeG.attr("transform",d=>`translate(${Math.max(28,Math.min(w-28,d.x))},${Math.max(28,Math.min(h-28,d.y))})`);
    });
    sim.alpha(0.8).restart();
  }, [dims, filter]);

  useEffect(()=>{ buildGraph(); },[buildGraph]);

  // ── RENDER ─────────────────────────────────────────────────────────────────
  const connEdges = selected
    ? GRAPH_DATA.edges.filter(e=>e.source===selected.id||e.target===selected.id)
    : [];

  const selectedStoryMeta = STORY_TYPES.find(s=>s.id===storyType);

  return (
    <div style={{ background:C.bg, minHeight:"100vh", color:C.text, fontFamily:"'DM Sans',system-ui,sans-serif", display:"flex", flexDirection:"column" }}>

      {/* HEADER */}
      <div style={{ borderBottom:`1px solid ${C.border}`, padding:"0 20px", background:C.surface, display:"flex", alignItems:"center", justifyContent:"space-between", height:52 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontFamily:"'Space Mono',monospace", fontWeight:800, fontSize:14, color:C.teal }}>KG://therapeutic</span>
          <span style={{ fontSize:10, color:C.muted, fontFamily:"Space Mono,monospace" }}>
            {GRAPH_DATA.nodes.length}V · {GRAPH_DATA.edges.length}E · AWS Neptune
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {["US","JP","BOTH"].map(m=>(
            <button key={m} onClick={()=>setMarket(m)} style={{
              background: market===m ? (m==="JP"?"#F43F5E22":m==="US"?"#3B82F622":"#00D4C822") : "transparent",
              border:`1px solid ${market===m?(m==="JP"?C.rose:m==="US"?C.blue:C.teal):C.border}`,
              color: market===m?(m==="JP"?C.rose:m==="US"?C.blue:C.teal):C.muted,
              borderRadius:5, padding:"3px 10px", cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit"
            }}>{m==="BOTH"?"🌐 US+JP":m==="JP"?"🇯🇵 JP":"🇺🇸 US"}</button>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* GRAPH */}
        <div ref={containerRef} style={{ flex:1, position:"relative", minHeight:480 }}>

          {/* Filters */}
          <div style={{ position:"absolute", top:10, left:10, zIndex:10, display:"flex", gap:4, flexWrap:"wrap" }}>
            {["all",...Object.keys(NC)].map(t=>(
              <button key={t} onClick={()=>setFilter(t)} style={{
                background: filter===t?(NC[t]||C.teal)+"33":"#0F162388",
                border:`1px solid ${filter===t?(NC[t]||C.teal):C.border}`,
                color: filter===t?(NC[t]||C.teal):C.muted,
                borderRadius:5, padding:"2px 9px", cursor:"pointer", fontSize:9.5,
                fontWeight:600, fontFamily:"inherit", backdropFilter:"blur(8px)", textTransform:"capitalize"
              }}>{t}</button>
            ))}
          </div>

          {/* Edge tooltip */}
          {hoveredEdge && (
            <div style={{ position:"absolute", bottom:10, left:10, zIndex:20, background:C.surface2, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 14px", maxWidth:280 }}>
              <div style={{ color:C.amber, fontSize:10, fontWeight:700, marginBottom:3 }}>EDGE: {hoveredEdge.rel}</div>
              <div style={{ fontSize:11, color:"#94A3B8" }}>
                {hoveredEdge.source?.id||hoveredEdge.source} → {hoveredEdge.target?.id||hoveredEdge.target}
              </div>
            </div>
          )}

          <svg ref={svgRef} width="100%" height="100%" style={{ display:"block", minHeight:480 }} />
        </div>

        {/* RIGHT PANEL */}
        <div style={{ width:340, borderLeft:`1px solid ${C.border}`, background:C.surface, display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Tab bar */}
          <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
            {[
              { id:"graph", label:"🔬 Node", active: !!selected },
              { id:"story", label:"✨ Story", active: history.length > 0 },
              { id:"history", label:`📚 History ${history.length ? `(${history.length})`:""}`, active: history.length > 0 },
            ].map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                flex:1, padding:"10px 4px",
                background: tab===t.id ? C.surface2 : "transparent",
                border:"none", borderBottom: tab===t.id ? `2px solid ${C.teal}` : "2px solid transparent",
                color: tab===t.id ? C.teal : C.muted,
                cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit"
              }}>{t.label}</button>
            ))}
          </div>

          {/* ── GRAPH TAB ── */}
          {tab==="graph" && (
            <div style={{ flex:1, overflowY:"auto", padding:16 }}>
              {!selected ? (
                <div style={{ textAlign:"center", padding:"40px 20px" }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>🔬</div>
                  <div style={{ color:C.muted, fontSize:12, lineHeight:1.8 }}>
                    Click any node in the graph to select it, then use <span style={{color:C.teal}}>Idea2Stories</span> to generate a clinical narrative with Claude
                  </div>
                  <div style={{ marginTop:20, color:C.dim, fontSize:10, fontFamily:"Space Mono,monospace" }}>
                    {GRAPH_DATA.nodes.length} vertices · {GRAPH_DATA.edges.length} edges
                  </div>
                </div>
              ) : (
                <>
                  {/* Node card */}
                  <div style={{ background:NC[selected.type]+"14", border:`1px solid ${NC[selected.type]}44`, borderRadius:10, padding:14, marginBottom:14 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:NC[selected.type] }} />
                      <span style={{ color:NC[selected.type], fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em" }}>{selected.type}</span>
                    </div>
                    <div style={{ color:C.text, fontSize:15, fontWeight:700, marginBottom:4 }}>{selected.label}</div>
                    <div style={{ color:"#94A3B8", fontSize:11, lineHeight:1.6 }}>{selected.full}</div>
                    <div style={{ marginTop:10, display:"flex", flexWrap:"wrap", gap:5 }}>
                      {selected.market && <span style={{ fontSize:9, color:NC[selected.type], background:NC[selected.type]+"22", border:`1px solid ${NC[selected.type]}44`, borderRadius:3, padding:"1px 7px" }}>{Array.isArray(selected.market)?selected.market.join("·"):selected.market}</span>}
                      {selected.auc && <span style={{ fontSize:9, color:C.green, background:C.green+"22", borderRadius:3, padding:"1px 7px" }}>AUC {selected.auc}</span>}
                      {selected.n && <span style={{ fontSize:9, color:C.muted, background:C.dim, borderRadius:3, padding:"1px 7px" }}>n={selected.n}</span>}
                      {selected.hr && <span style={{ fontSize:9, color:C.amber, background:C.amber+"22", borderRadius:3, padding:"1px 7px" }}>HR={selected.hr}</span>}
                      {selected.moa && <span style={{ fontSize:9, color:C.violet, background:C.violet+"22", borderRadius:3, padding:"1px 7px" }}>{selected.moa}</span>}
                    </div>
                  </div>

                  {/* Connections */}
                  {connEdges.length > 0 && (
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>
                        {connEdges.length} Relationships
                      </div>
                      {connEdges.map((e,i)=>{
                        const otherId = e.source===selected.id ? e.target : e.source;
                        const other = GRAPH_DATA.nodes.find(n=>n.id===otherId);
                        const isOut = e.source===selected.id;
                        return (
                          <div key={i} onClick={()=>setSelected(other)} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:`1px solid ${C.border}`, cursor:"pointer" }}>
                            <span style={{ fontSize:9, color:NC[other?.type]||C.muted, fontFamily:"Space Mono,monospace", fontWeight:700, width:68, flexShrink:0 }}>
                              {isOut?"→":"←"} {e.rel}
                            </span>
                            <span style={{ fontSize:11, color:NC[other?.type]||C.text, fontWeight:600 }}>{other?.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* IDEA2STORIES ─────────────────────── */}
                  <div style={{ background:`linear-gradient(135deg, ${C.teal}11, ${C.violet}11)`, border:`1px solid ${C.teal}33`, borderRadius:12, overflow:"hidden" }}>
                    <div style={{ padding:"12px 14px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:16 }}>✨</span>
                      <span style={{ color:C.teal, fontWeight:800, fontSize:13, fontFamily:"Space Mono,monospace" }}>IDEA2STORIES</span>
                      <span style={{ color:C.muted, fontSize:10 }}>powered by Claude</span>
                    </div>

                    <div style={{ padding:14 }}>
                      {/* Story type selector */}
                      <div style={{ marginBottom:12 }}>
                        <div style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Story Format</div>
                        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                          {STORY_TYPES.map(s=>(
                            <button key={s.id} onClick={()=>setStoryType(s.id)} style={{
                              background: storyType===s.id ? C.teal+"22" : "transparent",
                              border:`1px solid ${storyType===s.id?C.teal:C.border}`,
                              borderRadius:7, padding:"7px 12px", cursor:"pointer",
                              display:"flex", alignItems:"center", gap:10, textAlign:"left",
                              fontFamily:"inherit"
                            }}>
                              <span style={{ fontSize:14 }}>{s.icon}</span>
                              <div>
                                <div style={{ color:storyType===s.id?C.teal:C.text, fontSize:11, fontWeight:700 }}>{s.label}</div>
                                <div style={{ color:C.muted, fontSize:9, marginTop:1 }}>{s.desc}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Gremlin preview */}
                      <div style={{ background:"#060A12", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px", marginBottom:12 }}>
                        <div style={{ color:C.muted, fontSize:9, marginBottom:4 }}>GRAPH CONTEXT (Neptune)</div>
                        <code style={{ color:C.teal, fontSize:9, fontFamily:"Space Mono,monospace" }}>
                          {buildGraphContext(selected).gremlin}
                        </code>
                      </div>

                      {/* Generate button */}
                      <button onClick={generateStory} disabled={loading} style={{
                        width:"100%", padding:"11px 0",
                        background: loading ? C.dim : `linear-gradient(135deg, ${C.teal}, ${C.blue})`,
                        border:"none", borderRadius:8, cursor: loading?"not-allowed":"pointer",
                        color:"#fff", fontWeight:800, fontSize:13, fontFamily:"inherit",
                        letterSpacing:"0.04em", transition:"all 0.2s",
                        opacity: loading ? 0.7 : 1
                      }}>
                        {loading ? "⟳ Generating..." : `✨ Generate ${selectedStoryMeta?.label}`}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── STORY TAB ── */}
          {tab==="story" && (
            <div style={{ flex:1, overflowY:"auto", padding:16 }}>
              {loading && !story && (
                <div style={{ textAlign:"center", padding:"40px 20px" }}>
                  <div style={{ color:C.teal, fontSize:13, fontFamily:"Space Mono,monospace" }}>
                    ⟳ Traversing graph context...
                  </div>
                  <div style={{ color:C.muted, fontSize:11, marginTop:8 }}>Claude is reading {selected?.label}'s relationships</div>
                </div>
              )}
              {error && (
                <div style={{ background:C.rose+"11", border:`1px solid ${C.rose}33`, borderRadius:8, padding:14, color:C.rose, fontSize:12 }}>
                  {error}
                </div>
              )}
              {story && (
                <>
                  <div style={{ marginBottom:14 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                      <span style={{ fontSize:16 }}>{selectedStoryMeta?.icon}</span>
                      <span style={{ color:C.teal, fontWeight:800, fontSize:13, fontFamily:"Space Mono,monospace" }}>{selectedStoryMeta?.label}</span>
                      {selected && <span style={{ fontSize:10, color:NC[selected.type], background:NC[selected.type]+"22", borderRadius:3, padding:"1px 7px" }}>{selected.label}</span>}
                      <span style={{ fontSize:9, color:C.muted, marginLeft:"auto" }}>{market}</span>
                    </div>
                    <div style={{ color:C.muted, fontSize:10, fontFamily:"Space Mono,monospace" }}>
                      {buildGraphContext(selected||GRAPH_DATA.nodes[0]).gremlin}
                    </div>
                  </div>

                  <div style={{
                    background:C.surface2, border:`1px solid ${C.border}`,
                    borderRadius:10, padding:16,
                    color:"#CBD5E1", fontSize:12.5, lineHeight:1.9,
                    whiteSpace:"pre-wrap"
                  }}>
                    {story}
                    {loading && <span style={{ color:C.teal, animation:"blink 1s infinite" }}>▊</span>}
                  </div>

                  {!loading && (
                    <div style={{ display:"flex", gap:8, marginTop:12 }}>
                      <button onClick={()=>navigator.clipboard.writeText(story)} style={{
                        flex:1, padding:"8px 0", background:"transparent",
                        border:`1px solid ${C.border}`, borderRadius:7,
                        color:C.muted, cursor:"pointer", fontSize:11, fontWeight:600, fontFamily:"inherit"
                      }}>📋 Copy</button>
                      <button onClick={generateStory} style={{
                        flex:1, padding:"8px 0", background:C.teal+"22",
                        border:`1px solid ${C.teal}44`, borderRadius:7,
                        color:C.teal, cursor:"pointer", fontSize:11, fontWeight:600, fontFamily:"inherit"
                      }}>↺ Regenerate</button>
                    </div>
                  )}
                </>
              )}
              {!story && !loading && !error && (
                <div style={{ textAlign:"center", padding:"40px 20px" }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>✨</div>
                  <div style={{ color:C.muted, fontSize:12 }}>Select a node and click Generate to create a story</div>
                </div>
              )}
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {tab==="history" && (
            <div style={{ flex:1, overflowY:"auto", padding:16 }}>
              {history.length === 0 ? (
                <div style={{ textAlign:"center", padding:"40px 20px", color:C.muted, fontSize:12 }}>
                  No stories generated yet
                </div>
              ) : (
                history.map(h=>(
                  <div key={h.id} onClick={()=>{ setStory(h.text); setStoryType(h.type); setTab("story"); }}
                    style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:8, padding:12, marginBottom:10, cursor:"pointer" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                      <div style={{ width:7, height:7, borderRadius:"50%", background:h.color }} />
                      <span style={{ color:h.color, fontWeight:700, fontSize:11 }}>{h.node}</span>
                      <span style={{ fontSize:10, color:C.muted, marginLeft:"auto" }}>
                        {STORY_TYPES.find(s=>s.id===h.type)?.icon} {h.type}
                      </span>
                    </div>
                    <div style={{ color:"#94A3B8", fontSize:10, lineHeight:1.6,
                      overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2,
                      WebkitBoxOrient:"vertical" }}>
                      {h.text.slice(0,120)}...
                    </div>
                    <div style={{ color:C.dim, fontSize:9, marginTop:6, fontFamily:"Space Mono,monospace" }}>
                      {h.gremlin.slice(0,50)}...
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* STATUS BAR */}
      <div style={{ borderTop:`1px solid ${C.border}`, padding:"5px 20px", background:C.surface, display:"flex", justifyContent:"space-between", fontSize:9.5, color:C.dim, fontFamily:"Space Mono,monospace" }}>
        <span>D3 Force Graph · {GRAPH_DATA.nodes.length}V · {GRAPH_DATA.edges.length}E</span>
        <span>Idea2Stories · Claude Sonnet · AWS Bedrock · Neptune Gremlin</span>
      </div>

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}
