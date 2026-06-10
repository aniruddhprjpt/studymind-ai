"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";

interface RawNode {
  id: string;
  label: string;
  type: "main" | "sub" | "leaf";
  description: string;
}

interface RawLink {
  source: string;
  target: string;
}

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: "main" | "sub" | "leaf";
  description: string;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: string | D3Node;
  target: string | D3Node;
}

interface MindMapProps {
  documentContent: string;
  onNodeClick: (topic: string) => void;
}

interface Tooltip {
  x: number;
  y: number;
  text: string;
  label: string;
  visible: boolean;
}

const NODE_COLORS = {
  main: { fill: "#f5c842", stroke: "#e0a800", text: "#0a0f1e", r: 34 },
  sub: { fill: "#0d1835", stroke: "#4fc3f7", text: "#4fc3f7", r: 26 },
  leaf: { fill: "#0d1835", stroke: "rgba(245,200,66,0.4)", text: "#8892a4", r: 18 },
};

export default function MindMap({ documentContent, onNodeClick }: MindMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);

  const [graphData, setGraphData] = useState<{ nodes: RawNode[]; links: RawLink[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip>({ x: 0, y: 0, text: "", label: "", visible: false });

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGraphData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate mind map");
    } finally {
      setLoading(false);
    }
  }, [documentContent]);

  const exportPNG = useCallback(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const w = svgEl.clientWidth || 800;
    const h = svgEl.clientHeight || 600;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob(
      [`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${svgData}</svg>`],
      { type: "image/svg+xml" }
    );
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#0a0f1e";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = "mind-map.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  }, []);

  useEffect(() => {
    if (!graphData || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const w = container.clientWidth || 700;
    const h = container.clientHeight || 480;

    const svg = d3.select(svgRef.current);
    svg.attr("width", w).attr("height", h);
    svg.selectAll("*").remove();

    // Defs: arrowhead
    const defs = svg.append("defs");
    defs.append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L8,0L0,4")
      .attr("fill", "rgba(245,200,66,0.4)");

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on("zoom", (event) => g.attr("transform", event.transform.toString()));
    svg.call(zoom as d3.ZoomBehavior<SVGSVGElement, unknown>);

    const nodes: D3Node[] = graphData.nodes.map((n) => ({ ...n }));
    const links: D3Link[] = graphData.links.map((l) => ({
      source: l.source,
      target: l.target,
    }));

    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force("link", d3.forceLink<D3Node, D3Link>(links)
        .id((d) => d.id)
        .distance((l) => {
          const s = l.source as D3Node;
          const t = l.target as D3Node;
          if (s.type === "main" || t.type === "main") return 160;
          return 110;
        })
        .strength(0.6))
      .force("charge", d3.forceManyBody<D3Node>().strength(-380))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collision", d3.forceCollide<D3Node>((d) => NODE_COLORS[d.type].r + 16));

    simulationRef.current = simulation;

    // Links
    const link = g.append("g").selectAll<SVGLineElement, D3Link>("line")
      .data(links)
      .join("line")
      .attr("stroke", "rgba(245,200,66,0.25)")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4,4")
      .attr("marker-end", "url(#arrow)");

    // Node groups
    const node = g.append("g").selectAll<SVGGElement, D3Node>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer");

    node.each(function (d) {
      const el = d3.select(this);
      const cfg = NODE_COLORS[d.type];

      // Glow filter
      el.append("circle")
        .attr("r", cfg.r + 6)
        .attr("fill", d.type === "main" ? "rgba(245,200,66,0.08)" : "rgba(79,195,247,0.06)")
        .attr("class", "glow-ring");

      el.append("circle")
        .attr("r", cfg.r)
        .attr("fill", cfg.fill)
        .attr("stroke", cfg.stroke)
        .attr("stroke-width", d.type === "main" ? 3 : 1.5)
        .style("filter", d.type === "main" ? "drop-shadow(0 0 8px rgba(245,200,66,0.5))" : "none");

      const words = d.label.split(" ");
      const lines: string[] = [];
      let cur = "";
      for (const w of words) {
        const test = cur ? cur + " " + w : w;
        if (test.length > 10 && cur) { lines.push(cur); cur = w; }
        else cur = test;
      }
      if (cur) lines.push(cur);

      const textEl = el.append("text")
        .attr("text-anchor", "middle")
        .attr("pointer-events", "none")
        .attr("fill", cfg.text)
        .attr("font-size", d.type === "main" ? "11px" : d.type === "sub" ? "9px" : "8px")
        .attr("font-weight", d.type === "main" ? "bold" : "600")
        .attr("font-family", "system-ui, sans-serif");

      const lineH = d.type === "main" ? 13 : 11;
      const startY = -((lines.length - 1) * lineH) / 2;
      lines.forEach((line, i) => {
        textEl.append("tspan")
          .attr("x", 0)
          .attr("y", startY + i * lineH)
          .text(line);
      });
    });

    // Tooltip & click
    node
      .on("mouseover", (event, d) => {
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top - 12, text: d.description, label: d.label, visible: true });
      })
      .on("mousemove", (event) => {
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip((prev) => ({ ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top - 12 }));
      })
      .on("mouseout", () => setTooltip((prev) => ({ ...prev, visible: false })))
      .on("click", (_, d) => onNodeClick(d.label));

    // Drag
    const drag = d3.drag<SVGGElement, D3Node>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null; d.fy = null;
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    node.call(drag as any);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as D3Node).x ?? 0)
        .attr("y1", (d) => (d.source as D3Node).y ?? 0)
        .attr("x2", (d) => (d.target as D3Node).x ?? 0)
        .attr("y2", (d) => (d.target as D3Node).y ?? 0);
      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { simulation.stop(); };
  }, [graphData, onNodeClick]);

  if (!graphData && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 py-10">
        <div className="w-20 h-20 rounded-2xl bg-[#1a2340] border border-[rgba(245,200,66,0.2)] flex items-center justify-center">
          <svg className="w-10 h-10 text-[#f5c842]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" strokeWidth={2} />
            <circle cx="4" cy="6" r="2" strokeWidth={2} />
            <circle cx="20" cy="6" r="2" strokeWidth={2} />
            <circle cx="4" cy="18" r="2" strokeWidth={2} />
            <circle cx="20" cy="18" r="2" strokeWidth={2} />
            <line x1="12" y1="9" x2="4" y2="7" strokeWidth={1.5} />
            <line x1="12" y1="9" x2="20" y2="7" strokeWidth={1.5} />
            <line x1="12" y1="15" x2="4" y2="17" strokeWidth={1.5} />
            <line x1="12" y1="15" x2="20" y2="17" strokeWidth={1.5} />
          </svg>
        </div>
        <div className="text-center">
          <h3 className="text-[#f0f4ff] font-bold text-base">Concept Mind Map</h3>
          <p className="text-[#8892a4] text-sm mt-1.5 max-w-xs leading-relaxed">
            Visualise the key concepts and their connections from your document.
          </p>
        </div>
        {error && (
          <p className="text-[#f87171] text-sm text-center max-w-xs">{error}</p>
        )}
        <button onClick={generate} className="flex items-center gap-2 px-5 py-2.5 bg-[#f5c842] text-[#0a0f1e] rounded-xl font-bold text-sm hover:bg-[#ffd84d] shadow-[0_0_20px_rgba(245,200,66,0.3)] transition-all active:scale-95">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Generate Mind Map
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-[#f5c842]/20" />
          <div className="absolute inset-0 rounded-full border-2 border-t-[#f5c842] animate-spin" />
        </div>
        <p className="text-[#f5c842] font-semibold text-sm">Building mind map...</p>
        <div className="flex gap-3 mt-2">
          {["Main Topic", "Subtopics", "Connections"].map((t, i) => (
            <div key={i} className="skeleton-shimmer h-7 rounded-lg bg-[#1a2340] px-3 text-transparent text-xs">{t}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-1 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#f5c842]" />
            <span className="text-[#8892a4] text-xs">Main topic</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border border-[#4fc3f7] bg-[#0d1835]" />
            <span className="text-[#8892a4] text-xs">Subtopic</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full border border-[rgba(245,200,66,0.4)] bg-[#0d1835]" />
            <span className="text-[#8892a4] text-xs">Detail</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={generate} title="Regenerate" className="w-7 h-7 rounded-lg bg-[#1a2340] border border-[rgba(245,200,66,0.15)] text-[#8892a4] hover:text-[#f0f4ff] hover:border-[rgba(245,200,66,0.3)] flex items-center justify-center transition-all text-xs">
            ↺
          </button>
          <button onClick={exportPNG} className="flex items-center gap-1.5 px-3 py-1 bg-[#f5c842] text-[#0a0f1e] rounded-lg text-xs font-bold hover:bg-[#ffd84d] transition-all">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            PNG
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden rounded-xl bg-[#060d1a] border border-[rgba(245,200,66,0.08)]">
        <svg ref={svgRef} className="w-full h-full" style={{ userSelect: "none" }} />

        {/* Tooltip */}
        {tooltip.visible && (
          <div
            className="absolute pointer-events-none z-10 max-w-[200px] bg-[#111827] border border-[rgba(245,200,66,0.3)] rounded-lg px-3 py-2 shadow-xl"
            style={{ left: tooltip.x + 14, top: tooltip.y - 40, transform: "translateY(-50%)" }}
          >
            <p className="text-[#f5c842] text-xs font-bold mb-0.5">{tooltip.label}</p>
            <p className="text-[#f0f4ff] text-xs leading-relaxed">{tooltip.text}</p>
          </div>
        )}

        <p className="absolute bottom-2 left-2 text-[#8892a4] text-xs pointer-events-none">
          Scroll to zoom · Drag nodes · Click to chat
        </p>
      </div>
    </div>
  );
}
