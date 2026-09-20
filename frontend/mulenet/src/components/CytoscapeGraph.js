"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import cytoscape from "cytoscape";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  SlidersHorizontal,
  ShieldAlert,
  X,
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  GitCommit,
  Play
} from "lucide-react";
import WhyFlaggedPanel from "@/components/WhyFlaggedPanel";
import MoneyFlowReplay from "@/components/MoneyFlowReplay";

export default function CytoscapeGraph({
  graphData,
  fraudRings = [],
  onSelectAccount,
  onInvestigateAccount,
  selectedAccountId,
  activeRingFilter = "ALL",
  hideCleanNodes = true,
  onToggleHideClean
}) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [traceMode, setTraceMode] = useState(null); // null | "IN" | "OUT" | "FULL"
  const [isReplaying, setIsReplaying] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !graphData || !graphData.nodes || graphData.nodes.length === 0) return;

    let visibleNodes = graphData.nodes;
    let visibleEdges = graphData.edges;

    // Filter 1: By selected ring
    if (activeRingFilter && activeRingFilter !== "ALL") {
      const activeRingObj = fraudRings.find((r) => r.ring_id === activeRingFilter);
      const ringNodeIds = new Set(
        graphData.nodes
          .filter(
            (n) =>
              n.data.ring_id === activeRingFilter ||
              (activeRingObj && activeRingObj.member_accounts?.includes(n.data.id))
          )
          .map((n) => n.data.id)
      );

      visibleNodes = graphData.nodes.filter((n) => ringNodeIds.has(n.data.id));

      if (activeRingObj && activeRingObj.member_accounts && activeRingObj.member_accounts.length > 0) {
        const order = activeRingObj.member_accounts;
        visibleNodes = [...visibleNodes].sort((a, b) => {
          const idxA = order.indexOf(a.data.id);
          const idxB = order.indexOf(b.data.id);
          return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
        });
      }

      visibleEdges = graphData.edges.filter(
        (e) => ringNodeIds.has(e.data.source) && ringNodeIds.has(e.data.target)
      );
    } else if (hideCleanNodes) {
      // Filter 2: Hide clean accounts
      const fraudNodeIds = new Set(
        graphData.nodes
          .filter((n) => {
            const isSafeEntity = n.data.role === "MERCHANT" || n.data.role === "PAYROLL" || n.data.risk_level === "LOW";
            if (isSafeEntity) return false;
            return n.data.is_suspicious || n.data.ring_id !== null || n.data.suspicion_score >= 40;
          })
          .map((n) => n.data.id)
      );

      visibleNodes = graphData.nodes.filter((n) => fraudNodeIds.has(n.data.id));
      visibleEdges = graphData.edges.filter(
        (e) => fraudNodeIds.has(e.data.source) && fraudNodeIds.has(e.data.target)
      );
    }

    // Determine layout
    const activeRingObj = fraudRings.find((r) => r.ring_id === activeRingFilter);
    let layoutConfig = {
      name: "cose",
      animate: false,
      padding: 60,
      componentSpacing: 160,
      nodeRepulsion: 1200000,
      idealEdgeLength: 130,
      edgeElasticity: 100,
      nestingFactor: 1.2
    };

    if (activeRingObj) {
      const pattern = activeRingObj.primary_pattern || "";
      if (pattern.includes("Cycle") || pattern.includes("Circular")) {
        layoutConfig = {
          name: "circle",
          padding: 70,
          avoidOverlap: true,
          radius: Math.max(130, visibleNodes.length * 34)
        };
      } else if (pattern.includes("Shell") || pattern.includes("Chain")) {
        layoutConfig = {
          name: "breadthfirst",
          directed: true,
          padding: 60,
          spacingFactor: 1.6,
          roots: [activeRingObj.orchestrator || visibleNodes[0]?.data.id]
        };
      } else if (pattern.includes("Smurf") || pattern.includes("Fan")) {
        const hubId =
          activeRingObj.orchestrator ||
          visibleNodes.find((n) => n.data.role === "AGGREGATOR")?.data.id ||
          activeRingObj.member_accounts?.find((id) => id.includes("AGGREGATOR")) ||
          visibleNodes[0]?.data.id;

        layoutConfig = {
          name: "concentric",
          padding: 60,
          concentric: (node) => (node.id() === hubId ? 2 : 1),
          levelWidth: () => 1
        };
      }
    }

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements: [...visibleNodes, ...visibleEdges],
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "font-size": "11px",
            "font-family": "monospace",
            "font-weight": "500",
            color: "#0F172A",
            "text-valign": "bottom",
            "text-margin-y": "6px",
            "text-background-opacity": 0.95,
            "text-background-color": "#FFFFFF",
            "text-background-padding": "2px",
            "text-background-shape": "roundrectangle",
            width: "32px",
            height: "32px",
            "border-width": "1.5px",
            "border-color": "#CBD5E1",
            "transition-property": "background-color, border-color, width, height, opacity",
            "transition-duration": "0.15s"
          }
        },
        // Semantic Node Colors: Red (Critical), Orange (High), Amber (Elevated), Neutral Gray (Normal)
        {
          selector: 'node[risk_level = "CRITICAL"]',
          style: {
            "background-color": "#DC2626",
            "border-color": "#991B1B",
            "border-width": "2.5px",
            width: "38px",
            height: "38px"
          }
        },
        {
          selector: 'node[risk_level = "HIGH"]',
          style: {
            "background-color": "#EA580C",
            "border-color": "#C2410C",
            "border-width": "2px",
            width: "34px",
            height: "34px"
          }
        },
        {
          selector: 'node[risk_level = "MEDIUM"]',
          style: {
            "background-color": "#D97706",
            "border-color": "#B45309",
            "border-width": "2px",
            width: "30px",
            height: "30px"
          }
        },
        {
          selector: 'node[role = "AGGREGATOR"]',
          style: {
            "background-color": "#DC2626",
            "border-color": "#7F1D1D",
            "border-width": "3px",
            width: "44px",
            height: "44px"
          }
        },
        {
          selector: 'node[role = "MERCHANT"], node[role = "PAYROLL"]',
          style: {
            "background-color": "#F1F5F9",
            "border-color": "#CBD5E1",
            width: "26px",
            height: "26px",
            color: "#475569"
          }
        },
        {
          selector: 'node[role = "NORMAL"], node[risk_level = "LOW"]',
          style: {
            "background-color": "#F8FAFC",
            "border-color": "#E2E8F0",
            width: "20px",
            height: "20px",
            color: "#64748B"
          }
        },
        // Selected node - Crisp high-contrast outline
        {
          selector: "node:selected, node.selected",
          style: {
            "border-color": "#0F172A",
            "border-width": "3.5px",
            width: "42px",
            height: "42px"
          }
        },
        // Dimmed when another is inspected
        {
          selector: "node.dimmed",
          style: {
            opacity: 0.15
          }
        },
        // Edges: Normal flow subtle gray, Suspicious flow red, Selected flow dark slate
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": "#DC2626",
            "target-arrow-color": "#DC2626",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            "arrow-scale": 1.0,
            label: (ele) => {
              const amt = ele.data("amount");
              if (!amt) return "";
              return amt >= 1000 ? `$${(amt / 1000).toFixed(amt % 1000 === 0 ? 0 : 1)}k` : `$${Math.round(amt)}`;
            },
            "font-size": "9px",
            "font-family": "monospace",
            "font-weight": "500",
            color: "#0F172A",
            "text-background-opacity": 0.95,
            "text-background-color": "#FFFFFF",
            "text-background-padding": "2px",
            "text-background-shape": "roundrectangle"
          }
        },
        {
          selector: "edge[!is_suspicious]",
          style: {
            width: 1.0,
            "line-color": "#CBD5E1",
            "target-arrow-color": "#94A3B8",
            label: ""
          }
        },
        // Selected flow - Dark slate
        {
          selector: "edge:selected, edge.highlighted",
          style: {
            width: 3.0,
            "line-color": "#0F172A",
            "target-arrow-color": "#0F172A"
          }
        },
        // Incoming edges (Cobalt blue directional trail)
        {
          selector: "edge.edge-incoming",
          style: {
            width: 3.0,
            "line-color": "#2563EB",
            "target-arrow-color": "#2563EB",
            "arrow-scale": 1.2,
            opacity: 1.0,
            label: (ele) => {
              const amt = ele.data("amount");
              if (!amt) return "";
              const formatted = amt >= 100000 ? `₹${(amt / 100000).toFixed(1)}L` : (amt >= 1000 ? `₹${(amt / 1000).toFixed(1)}k` : `₹${Math.round(amt)}`);
              return `IN: ${formatted}`;
            },
            color: "#2563EB",
            "font-size": "9px",
            "font-weight": "600",
            "text-background-opacity": 0.95,
            "text-background-color": "#FFFFFF"
          }
        },
        // Outgoing edges (Orange directional trail)
        {
          selector: "edge.edge-outgoing",
          style: {
            width: 3.0,
            "line-color": "#EA580C",
            "target-arrow-color": "#EA580C",
            "arrow-scale": 1.2,
            opacity: 1.0,
            label: (ele) => {
              const amt = ele.data("amount");
              if (!amt) return "";
              const formatted = amt >= 100000 ? `₹${(amt / 100000).toFixed(1)}L` : (amt >= 1000 ? `₹${(amt / 1000).toFixed(1)}k` : `₹${Math.round(amt)}`);
              return `OUT: ${formatted}`;
            },
            color: "#EA580C",
            "font-size": "9px",
            "font-weight": "600",
            "text-background-opacity": 0.95,
            "text-background-color": "#FFFFFF"
          }
        },
        // Ring Member Boundary Halo
        {
          selector: "node.ring-halo",
          style: {
            "border-color": "#DC2626",
            "border-width": "2.5px",
            "border-style": "dashed",
            opacity: 1.0
          }
        },
        // Active Trace Traversal Styles
        {
          selector: "node.trace-active",
          style: {
            "border-color": "#2563EB",
            "border-width": "3px",
            opacity: 1.0
          }
        },
        {
          selector: "edge.trace-active",
          style: {
            width: 3.5,
            "line-color": "#2563EB",
            "target-arrow-color": "#2563EB",
            opacity: 1.0
          }
        },
        {
          selector: "node.dimmed",
          style: {
            opacity: 0.12
          }
        },
        {
          selector: "edge.dimmed",
          style: {
            opacity: 0.08
          }
        }
      ],
      layout: layoutConfig
    });

    // Tap on node
    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      setSelectedElement({ type: "node", data: node.data() });
      setTraceMode(null);

      cy.elements().removeClass("highlighted dimmed selected edge-incoming edge-outgoing ring-halo trace-active");
      node.addClass("selected");

      // Highlight incoming edges with cyan
      const inEdges = node.incomers("edge");
      inEdges.addClass("edge-incoming");
      inEdges.sources().addClass("highlighted");

      // Highlight outgoing edges with amber
      const outEdges = node.outgoers("edge");
      outEdges.addClass("edge-outgoing");
      outEdges.targets().addClass("highlighted");

      // Ring boundary highlight if belongs to a ring
      const rId = node.data("ring_id");
      if (rId) {
        cy.nodes(`[ring_id = "${rId}"]`).addClass("ring-halo");
      }

      // Dim everything not connected to the selected node or its ring
      const neighborhood = node.neighborhood();
      const ringNodes = rId ? cy.nodes(`[ring_id = "${rId}"]`) : cy.collection();
      const activeSet = node.union(neighborhood).union(ringNodes);
      cy.elements().difference(activeSet).addClass("dimmed");

      if (onSelectAccount) {
        onSelectAccount(node.data().id);
      }
    });

    // Tap on edge
    cy.on("tap", "edge", (evt) => {
      const edge = evt.target;
      setSelectedElement({ type: "edge", data: edge.data() });
      setTraceMode(null);
      cy.elements().removeClass("highlighted dimmed selected edge-incoming edge-outgoing ring-halo trace-active");
      edge.addClass("highlighted");
      edge.source().addClass("highlighted");
      edge.target().addClass("highlighted");
    });

    // Tap on canvas background
    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        setSelectedElement(null);
        cy.elements().removeClass("highlighted dimmed selected");
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [graphData, activeRingFilter, hideCleanNodes, fraudRings]);

  // Center on selected account
  useEffect(() => {
    if (!cyRef.current || !selectedAccountId) return;
    const node = cyRef.current.getElementById(selectedAccountId);
    if (node && node.length > 0) {
      cyRef.current.elements().removeClass("selected dimmed highlighted");
      node.addClass("selected");
      const neighborhood = node.neighborhood();
      neighborhood.nodes().addClass("highlighted");
      neighborhood.edges().addClass("highlighted");
      cyRef.current.elements().difference(node.union(neighborhood)).addClass("dimmed");

      cyRef.current.animate({
        center: { eles: node },
        zoom: 1.5,
        duration: 300
      });
      setSelectedElement({ type: "node", data: node.data() });
    }
  }, [selectedAccountId]);

  const handleZoomIn = () => cyRef.current && cyRef.current.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current && cyRef.current.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current && cyRef.current.fit(undefined, 40);
  const handleReset = () => {
    if (cyRef.current) {
      cyRef.current.reset();
      cyRef.current.elements().removeClass("highlighted dimmed selected edge-incoming edge-outgoing ring-halo trace-active");
      setSelectedElement(null);
      setTraceMode(null);
    }
  };

  const handleTraceIn = () => {
    if (!cyRef.current || !selectedElement || selectedElement.type !== "node") return;
    const cy = cyRef.current;
    const node = cy.getElementById(selectedElement.data.id);
    if (!node.length) return;

    cy.elements().removeClass("highlighted dimmed selected edge-incoming edge-outgoing ring-halo trace-active");
    node.addClass("selected");

    const ancestors = node.predecessors();
    ancestors.nodes().addClass("trace-active");
    ancestors.edges().addClass("edge-incoming");

    const activeSet = node.union(ancestors);
    cy.elements().difference(activeSet).addClass("dimmed");
    cy.fit(activeSet, 60);
    setTraceMode("IN");
  };

  const handleTraceOut = () => {
    if (!cyRef.current || !selectedElement || selectedElement.type !== "node") return;
    const cy = cyRef.current;
    const node = cy.getElementById(selectedElement.data.id);
    if (!node.length) return;

    cy.elements().removeClass("highlighted dimmed selected edge-incoming edge-outgoing ring-halo trace-active");
    node.addClass("selected");

    const descendants = node.successors();
    descendants.nodes().addClass("trace-active");
    descendants.edges().addClass("edge-outgoing");

    const activeSet = node.union(descendants);
    cy.elements().difference(activeSet).addClass("dimmed");
    cy.fit(activeSet, 60);
    setTraceMode("OUT");
  };

  const handleTraceFull = () => {
    if (!cyRef.current || !selectedElement || selectedElement.type !== "node") return;
    const cy = cyRef.current;
    const node = cy.getElementById(selectedElement.data.id);
    if (!node.length) return;

    cy.elements().removeClass("highlighted dimmed selected edge-incoming edge-outgoing ring-halo trace-active");
    node.addClass("selected");

    const ancestors = node.predecessors();
    const descendants = node.successors();

    ancestors.nodes().addClass("trace-active");
    ancestors.edges().addClass("edge-incoming");
    descendants.nodes().addClass("trace-active");
    descendants.edges().addClass("edge-outgoing");

    const activeSet = node.union(ancestors).union(descendants);
    cy.elements().difference(activeSet).addClass("dimmed");
    cy.fit(activeSet, 60);
    setTraceMode("FULL");
  };

  const handleResetTrace = () => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    cy.elements().removeClass("highlighted dimmed selected edge-incoming edge-outgoing ring-halo trace-active");
    setSelectedElement(null);
    setTraceMode(null);
    cy.fit(undefined, 30);
  };

  const handleClearTrace = handleResetTrace;

  const activeRingInfo = fraudRings.find((r) => r.ring_id === activeRingFilter);

  // Compute sequential hops for active ring replay
  const replayHops = useMemo(() => {
    const targetRing = activeRingInfo || fraudRings[0];
    if (!targetRing || !targetRing.member_accounts || targetRing.member_accounts.length < 2) {
      return [];
    }
    const members = targetRing.member_accounts;
    const count = members.length;
    const total = targetRing.total_funds_routed || 5000000;
    const avg = Math.round(total / Math.max(1, count - 1));
    const list = [];
    for (let i = 0; i < members.length - 1; i++) {
      const hopRetained = Math.round(avg * 0.005);
      list.push({
        hop_number: i + 1,
        from_account: members[i],
        to_account: members[i + 1],
        amount: avg - i * hopRetained,
        time_delta_hours: i === 0 ? 0 : 3.5,
        time_delta_display: i === 0 ? "Initial Hop" : "+3.5 hrs",
        timestamp: `2026-09-01T${String(10 + i * 3).padStart(2, "0")}:00:00Z`,
        retained_amount: hopRetained,
        retained_percent: 0.5
      });
    }
    return list;
  }, [activeRingInfo, fraudRings]);

  // Synchronized canvas animation when replay steps through hops
  const handleReplayActiveHop = (idx, hop) => {
    if (!cyRef.current || !hop) return;
    const cy = cyRef.current;
    const fromNode = cy.getElementById(hop.from_account);
    const toNode = cy.getElementById(hop.to_account);
    const connectingEdges = cy.edges(`[source = "${hop.from_account}"][target = "${hop.to_account}"]`);

    cy.elements().removeClass("highlighted dimmed selected edge-incoming edge-outgoing ring-halo trace-active");

    if (fromNode.length) fromNode.addClass("selected");
    if (toNode.length) toNode.addClass("trace-active");
    if (connectingEdges.length) connectingEdges.addClass("edge-outgoing");

    const activeGroup = fromNode.union(toNode).union(connectingEdges);
    cy.elements().difference(activeGroup).addClass("dimmed");

    if (activeGroup.length) {
      cy.animate({
        fit: { eles: activeGroup, padding: 80 },
        duration: 400
      });
    }
  };

  return (
    <div className="relative w-full h-full min-h-[660px] bg-white rounded-[4px] overflow-hidden border border-[#E2E8F0] flex flex-col shadow-2xs">
      {/* Top Visualizer Status Bar */}
      <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#475569] z-10">
        <div className="flex items-center gap-2">
          {activeRingInfo ? (
            <>
              <span className="font-mono text-xs font-semibold bg-white text-[#0F172A] border border-[#E2E8F0] px-2 py-0.5 rounded-[3px] shadow-2xs">
                {activeRingInfo.ring_id}
              </span>
              <span className="font-semibold text-[#0F172A]">{activeRingInfo.primary_pattern}</span>
              <span className="text-[#64748B] font-mono">
                ({activeRingInfo.member_count} accounts • ${Number(activeRingInfo.total_funds_routed).toLocaleString()})
              </span>
            </>
          ) : (
            <>
              <ShieldAlert size={14} className="text-[#2563EB]" />
              <span className="font-semibold text-[#0F172A] tracking-wide uppercase text-xs">Directed Transaction Graph</span>
              <span className="text-[#64748B] hidden sm:inline font-mono">
                {hideCleanNodes
                  ? "• Suspicious network topology filtered"
                  : "• Complete network (including benign accounts)"}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Replay Money Flow Button */}
          {replayHops.length > 0 && (
            <button
              onClick={() => setIsReplaying(!isReplaying)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-medium cursor-pointer border transition ${
                isReplaying
                  ? "bg-[#F1F5F9] text-[#2563EB] border-[#2563EB]"
                  : "bg-white text-[#475569] border-[#E2E8F0] hover:text-[#0F172A] hover:border-[#CBD5E1]"
              }`}
            >
              <Play size={11} className="text-[#2563EB]" />
              <span>{isReplaying ? "Hide Replay" : "Replay Money Flow"}</span>
            </button>
          )}

          {/* Noise Filter Toggle */}
          {onToggleHideClean && (
            <button
              onClick={onToggleHideClean}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-medium cursor-pointer border transition ${
                hideCleanNodes
                  ? "bg-white text-[#0F172A] border-[#E2E8F0] hover:border-[#CBD5E1]"
                  : "bg-amber-50 text-amber-800 border-amber-300"
              }`}
            >
              <SlidersHorizontal size={11} />
              <span>{hideCleanNodes ? "Noise Filter: On" : "Noise Filter: Off"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Cytoscape Canvas Container */}
      <div className="relative flex-1 w-full min-h-[580px] bg-[#F8FAFC]">
        <div ref={containerRef} className="w-full h-full min-h-[580px]" />

        {/* Floating Attack Replay HUD Overlay */}
        {isReplaying && replayHops.length > 0 && (
          <div className="absolute top-4 right-4 z-20 w-80 max-w-[90vw]">
            <MoneyFlowReplay
              hops={replayHops}
              currencySymbol="₹"
              ringId={activeRingInfo?.ring_id || fraudRings[0]?.ring_id}
              onActiveHopChange={handleReplayActiveHop}
              compact={true}
            />
          </div>
        )}

        {/* Floating Zoom / Pan Controls */}
        <div className="absolute top-4 left-4 flex flex-col gap-1 bg-white p-1 rounded-[4px] border border-[#E2E8F0] shadow-sm z-10">
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-[3px] transition cursor-pointer"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-[3px] transition cursor-pointer"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={handleFit}
            title="Fit to Screen"
            className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-[3px] transition cursor-pointer"
          >
            <Maximize2 size={15} />
          </button>
          <button
            onClick={handleReset}
            title="Reset View"
            className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-[3px] transition cursor-pointer"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Legend Overlay at bottom of canvas */}
        <div className="absolute bottom-3 left-4 bg-white/95 backdrop-blur px-3 py-1.5 rounded-[4px] border border-[#E2E8F0] shadow-sm text-xs flex flex-wrap items-center gap-3 z-10 font-mono">
          <span className="text-[#64748B] text-[10px] uppercase tracking-wider">LEGEND:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E2E8F0] border border-[#CBD5E1]" />
            <span className="text-[#64748B] text-[11px]">NORMAL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#D97706]" />
            <span className="text-amber-700 text-[11px] font-semibold">ELEVATED</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#EA580C]" />
            <span className="text-orange-700 text-[11px] font-semibold">HIGH RISK</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
            <span className="text-red-700 text-[11px] font-semibold">CRITICAL</span>
          </div>
          <div className="flex items-center gap-1.5 pl-2 border-l border-[#E2E8F0]">
            <span className="w-3 h-0.5 bg-[#0F172A]" />
            <span className="text-[#0F172A] text-[11px] font-semibold">SELECTED FLOW</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#DC2626]" />
            <span className="text-red-700 text-[11px] font-semibold">SUSPICIOUS FLOW</span>
          </div>
        </div>

        {/* Floating Tracing Toolbar when node selected */}
        {selectedElement && selectedElement.type === "node" && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/95 backdrop-blur border border-[#E2E8F0] p-1.5 rounded-md shadow-md z-20 font-mono text-xs text-[#0F172A]">
            <span className="text-[10px] text-[#64748B] uppercase px-1">Traverse:</span>
            <button
              onClick={handleTraceIn}
              title="Where did this money come from?"
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition cursor-pointer border ${
                traceMode === "IN"
                  ? "bg-[#F1F5F9] text-[#2563EB] border-[#2563EB] font-semibold"
                  : "bg-white text-[#475569] border-[#E2E8F0] hover:text-[#0F172A] hover:border-[#CBD5E1]"
              }`}
            >
              <ArrowDownLeft size={12} className="text-[#64748B]" />
              <span>Trace In</span>
            </button>
            <button
              onClick={handleTraceOut}
              title="Where did this money go?"
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition cursor-pointer border ${
                traceMode === "OUT"
                  ? "bg-[#F1F5F9] text-[#2563EB] border-[#2563EB] font-semibold"
                  : "bg-white text-[#475569] border-[#E2E8F0] hover:text-[#0F172A] hover:border-[#CBD5E1]"
              }`}
            >
              <ArrowUpRight size={12} className="text-[#64748B]" />
              <span>Trace Out</span>
            </button>
            <button
              onClick={handleTraceFull}
              title="Show complete money trail"
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition cursor-pointer border ${
                traceMode === "FULL"
                  ? "bg-[#F1F5F9] text-[#2563EB] border-[#2563EB] font-semibold"
                  : "bg-white text-[#475569] border-[#E2E8F0] hover:text-[#0F172A] hover:border-[#CBD5E1]"
              }`}
            >
              <GitCommit size={12} className="text-[#64748B]" />
              <span>Full Trail</span>
            </button>
            <button
              onClick={handleClearTrace}
              className="p-1 text-[#64748B] hover:text-[#0F172A] transition cursor-pointer ml-1"
              title="Clear Trace Mode"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Node / Edge Inspector Drawer */}
        {selectedElement && (
          <div className="absolute top-16 right-4 w-84 max-h-[calc(100%-80px)] overflow-y-auto bg-white border border-[#E2E8F0] rounded-md p-4 shadow-xl z-20 text-[#0F172A] space-y-3">
            <div className="flex items-start justify-between pb-2.5 border-b border-[#E2E8F0]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748B]">
                  {selectedElement.type === "node" ? "Entity Profile" : "Transaction Flow"}
                </span>
                <h4 className="text-sm font-semibold font-mono truncate max-w-[210px] text-[#0F172A]">
                  {selectedElement.type === "node"
                    ? selectedElement.data.id
                    : `${selectedElement.data.source} → ${selectedElement.data.target}`}
                </h4>
              </div>
              <button
                onClick={() => {
                  setSelectedElement(null);
                  if (cyRef.current) cyRef.current.elements().removeClass("highlighted dimmed selected edge-incoming edge-outgoing ring-halo trace-active");
                }}
                className="text-[#64748B] hover:text-[#0F172A] p-1 rounded hover:bg-[#F1F5F9] transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {selectedElement.type === "node" ? (
              <div className="space-y-3 text-xs">
                {/* Graph Traversal Tools Bar */}
                <div className="space-y-1.5 font-mono">
                  <span className="text-[#64748B] text-[10px] uppercase block">
                    Graph Traversal Tools:
                  </span>
                  <div className="grid grid-cols-3 gap-1 text-[11px]">
                    <button
                      onClick={handleTraceIn}
                      className={`py-1 px-1.5 rounded flex items-center justify-center gap-1 transition cursor-pointer border ${
                        traceMode === "IN" ? "bg-[#F1F5F9] text-[#2563EB] border-[#2563EB] font-semibold" : "bg-white text-[#475569] hover:text-[#0F172A] border-[#E2E8F0]"
                      }`}
                    >
                      <ArrowDownLeft size={11} className="text-[#64748B]" />
                      <span>Trace In</span>
                    </button>
                    <button
                      onClick={handleTraceOut}
                      className={`py-1 px-1.5 rounded flex items-center justify-center gap-1 transition cursor-pointer border ${
                        traceMode === "OUT" ? "bg-[#F1F5F9] text-[#2563EB] border-[#2563EB] font-semibold" : "bg-white text-[#475569] hover:text-[#0F172A] border-[#E2E8F0]"
                      }`}
                    >
                      <ArrowUpRight size={11} className="text-[#64748B]" />
                      <span>Trace Out</span>
                    </button>
                    <button
                      onClick={handleTraceFull}
                      className={`py-1 px-1.5 rounded flex items-center justify-center gap-1 transition cursor-pointer border ${
                        traceMode === "FULL" ? "bg-[#F1F5F9] text-[#2563EB] border-[#2563EB] font-semibold" : "bg-white text-[#475569] hover:text-[#0F172A] border-[#E2E8F0]"
                      }`}
                    >
                      <GitCommit size={11} className="text-[#64748B]" />
                      <span>Full Trail</span>
                    </button>
                  </div>
                </div>

                {/* Primary Action: Launch Investigation Room */}
                <button
                  onClick={() => onInvestigateAccount && onInvestigateAccount(selectedElement.id)}
                  className="w-full py-2 px-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Activity size={13} />
                  <span>Open in Investigation Room</span>
                </button>

                {/* "Why Flagged?" Evidence Panel */}
                <WhyFlaggedPanel
                  score={selectedElement.data.suspicion_score}
                  riskLevel={selectedElement.data.risk_level}
                  scoreBreakdown={selectedElement.data.score_breakdown}
                  evidencePoints={selectedElement.data.evidence_points || selectedElement.data.flags}
                  role={selectedElement.data.role}
                  compact={true}
                />

                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#64748B]">Classification:</span>
                  <span className="text-[#0F172A] bg-[#F8FAFC] px-2 py-0.5 rounded border border-[#E2E8F0]">
                    {selectedElement.data.role}
                  </span>
                </div>

                {selectedElement.data.ring_id && (
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-[#64748B]">Ring Identifier:</span>
                    <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 font-semibold">
                      {selectedElement.data.ring_id}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0] font-mono">
                  <div className="bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0]">
                    <span className="text-[#64748B] text-[10px] block">Inflow</span>
                    <span className="text-[#0F172A] font-semibold text-xs">
                      ${Number(selectedElement.data.total_received || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0]">
                    <span className="text-[#64748B] text-[10px] block">Outflow</span>
                    <span className="text-[#0F172A] font-semibold text-xs">
                      ${Number(selectedElement.data.total_sent || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Volume:</span>
                  <span className="font-mono font-semibold text-[#0F172A]">
                    ${Number(selectedElement.data.amount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Risk Status:</span>
                  <span
                    className={`font-mono text-xs px-2 py-0.5 rounded ${
                      selectedElement.data.is_suspicious
                        ? "bg-red-50 text-red-700 border border-red-200 font-semibold"
                        : "bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0]"
                    }`}
                  >
                    {selectedElement.data.is_suspicious ? "SUSPICIOUS" : "NORMAL"}
                  </span>
                </div>
                {selectedElement.data.ring_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Associated Ring:</span>
                    <span className="text-[#0F172A] font-mono font-medium">{selectedElement.data.ring_id}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
