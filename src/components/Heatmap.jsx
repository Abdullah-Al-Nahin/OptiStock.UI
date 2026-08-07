// src/components/Heatmap.jsx
import React, { useState, useMemo, useRef, useEffect } from "react";
import { 
  C, GLASS_TYPES, makeKey, parseKey, genBC, buildUPCEBars, SPH_LIST, CYL_LIST 
} from "../utils/constants";
import { useToast } from "./ToastContext"; 
import { OptiLogo } from "./Icons"; 

function BarcodeStrip({ code, height=58 }) {
  const { bars, digits, check } = useMemo(() => buildUPCEBars(code), [code]);
  const X = 2.2; const quietUnits = 7; let x = quietUnits * X;
  const rects = [];
  bars.forEach((b, i) => { if (b.dark) rects.push({x, w: b.u * X, h: (i<3 || i>=bars.length-6) ? height-12 : height-19}); x += b.u * X; });
  const numStr = digits.join("");
  return (
    <svg width={(bars.reduce((s,b)=>s+b.u, 0) + quietUnits*2) * X} height={height} style={{background:"#fff",borderRadius:4,display:"inline-block"}}>
      {rects.map((r,i) => <rect key={i} x={r.x} y={2} width={r.w} height={r.h} fill="#000"/>)}
      <text x={quietUnits*X-2} y={height-2} textAnchor="end" fontSize={9} fontFamily="monospace" fill="#000">0</text>
      <text x={(quietUnits+3)*X} y={height-2} fontSize={10} fontFamily="monospace" fill="#000" letterSpacing={4}>{numStr.slice(0,3)}</text>
      <text x={(quietUnits+24)*X} y={height-2} fontSize={10} fontFamily="monospace" fill="#000" letterSpacing={4}>{numStr.slice(3,6)}</text>
      <text x={x+2} y={height-2} fontSize={9} fontFamily="monospace" fill="#000">{check}</text>
    </svg>
  );
}

const DESIGNS = [
  {id:"single_vision", name:"সিঙ্গেল ভিশন",  sub:"Single Vision"},
  {id:"bifocal_moon",  name:"মুন বাইফোকাল",  sub:"Moon Bifocal"},
  {id:"bifocal_d",     name:"ডি-বাইফোকাল",   sub:"D-Bifocal"},
  {id:"progressive",   name:"প্রগ্রেসিভ",    sub:"Progressive/Varilux"},
  {id:"high_index",    name:"হাই ইনডেক্স",   sub:"High Index"},
  {id:"polycarbonate", name:"পলিকার্বোনেট",  sub:"Polycarbonate"},
];

const HM_SPHS = SPH_LIST.map(item => item.label);
const HM_CYLS = CYL_LIST.map(item => item.value === 0 ? "0.00" : (item.value > 0 ? "+" : "") + item.value.toFixed(2));

// 🚀 EVERY 10 DEGREES FROM 0 TO 180
const AXIS_OPTIONS = Array.from({ length: 19 }, (_, i) => i * 10);

export default function Heatmap({ authUser, stock, setStock, txns, setTxns }) {
  const toast = useToast();
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  // Clean up coatings so designs don't appear as rows in the top table
  const targetCoatings = ["হোয়াইট", "ব্লু কাট", "ফটোক্রোমিক", "এমসি"];
  const displayCoatings = GLASS_TYPES.filter(g => targetCoatings.includes(g.name));
  const finalCoatings = displayCoatings.length > 0 ? displayCoatings : GLASS_TYPES.slice(0, 4);

  const [hmGlass, setHmGlass] = useState(finalCoatings[0]?.id || "");
  const [hmDesign, setHmDesign] = useState("single_vision");
  const [hmAxis, setHmAxis] = useState(0); 
  const [hmSel, setHmSel] = useState(null);

  const gridRef = useRef(null);
  const activeG = GLASS_TYPES.find(g => g.id === hmGlass) || finalCoatings[0] || {};

  // Mathematical Top Table Calculation
  const getDesignTotalStock = (glassId, designId) => {
    const gStock = stock[glassId] || {};
    return Object.entries(gStock)
      .filter(([k, v]) => {
        if (v <= 0) return false;
        try {
          const parsed = parseKey(k);
          return parsed.design.toLowerCase().includes(designId.toLowerCase());
        } catch {
          return k.toLowerCase().includes(designId.toLowerCase());
        }
      })
      .reduce((s, [, v]) => s + v, 0);
  };

  // Deep Float Scanning for Heatmap Matrix Grid
  const getStockDetails = (sph, cyl) => {
    const gStock = stock[hmGlass] || {};
    let foundQty = 0;
    let foundKey = null;

    Object.entries(gStock).forEach(([k, v]) => {
      if (v <= 0) return;
      try {
        const parsed = parseKey(k);
        // Safely parse numbers so +0.25 and 0.25 match perfectly
        const matchSph = parseFloat(parsed.sph) === parseFloat(sph);
        const matchCyl = parseFloat(parsed.cyl) === parseFloat(cyl);
        
        if (matchSph && matchCyl && parsed.design.toLowerCase().includes(hmDesign.toLowerCase())) {
          let itemAxis = 0;
          const axMatch = parsed.design.match(/(?:_)?ax(\d+)/i) || k.match(/(?:_)?ax(\d+)/i);
          if (axMatch) {
            itemAxis = parseInt(axMatch[1], 10);
          }
          
          const hasCyl = parseFloat(cyl) !== 0;
          if (!hasCyl || itemAxis === hmAxis) {
            foundQty += v;
            foundKey = k;
          }
        }
      } catch(e) {
        // Fallback for totally corrupted keys
      }
    });

    const baseKey = makeKey(sph, cyl, "0.00", hmDesign);
    const fallbackKey = parseFloat(cyl) !== 0 ? `${baseKey}_ax${hmAxis}` : baseKey;
    return { qty: foundQty, stockKey: foundKey || fallbackKey };
  };

  // SMART AUTO-SCROLL
  const hmSelRef = useRef(hmSel);
  useEffect(() => { hmSelRef.current = hmSel; }, [hmSel]);

  useEffect(() => {
    let targetIndex = -1;
    const currentSel = hmSelRef.current;

    if (currentSel) {
      const { qty, stockKey } = getStockDetails(currentSel.sph, currentSel.cyl);
      setHmSel({ ...currentSel, qty, stockKey });
      targetIndex = HM_SPHS.findIndex(s => parseFloat(s) === parseFloat(currentSel.sph));
    } else {
      for (let i = 0; i < HM_SPHS.length; i++) {
        const sph = HM_SPHS[i];
        for (const cyl of HM_CYLS) {
          const { qty } = getStockDetails(sph, cyl);
          if (qty > 0) {
            targetIndex = i;
            break;
          }
        }
        if (targetIndex !== -1) break;
      }
    }

    if (targetIndex !== -1) {
      setTimeout(() => {
        const rowEl = document.getElementById(`sph-row-${targetIndex}`);
        if (rowEl && gridRef.current) {
          gridRef.current.scrollTo({ top: rowEl.offsetTop - 60, behavior: 'smooth' });
        }
      }, 150);
    }
  }, [hmGlass, hmDesign, hmAxis, stock]); 


  const quickAdjustStock = async (delta) => {
    if (!hmSel) return;
    const currentQty = stock[hmGlass]?.[hmSel.stockKey] || 0;
    if (currentQty + delta < 0) return toast.error("স্টক শূন্যের নিচে নামানো সম্ভব নয়!"); 
    
    const direction = delta > 0 ? "in" : "out";
    const subtype = delta > 0 ? "purchase" : "sale";
    const hasCyl = hmSel.cyl !== "0.00" && hmSel.cyl !== "0";

    const newTx = {
      direction: direction,
      subtype: subtype,
      glassTypeId: hmGlass, 
      glassName: activeG.name,
      sph: parseFloat(hmSel.sph), 
      cyl: parseFloat(hmSel.cyl), 
      axis: hasCyl ? hmAxis : null,
      add: "0.00",
      qty: Math.abs(delta),
      unitPrice: 0,
      totalPrice: 0,
      barcode: hmSel.barcode,
      customerName: "Quick Adjust (Heatmap)"
    };

    try {
      const response = await fetch(`${API_URL}/api/Transactions`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authUser.token}` 
        },
        body: JSON.stringify(newTx)
      });

      if (!response.ok) throw new Error("সার্ভার ডাটা গ্রহণ করেনি!");

      setStock(prev => {
        const gStock = prev[hmGlass] || {};
        return { ...prev, [hmGlass]: { ...gStock, [hmSel.stockKey]: currentQty + delta } };
      });

      const timestamp = new Date().toISOString();
      setTxns(prev => [{
        ...newTx, 
        id: Date.now(), 
        timestamp,
        date: timestamp.split('T')[0],
        time: new Date().toLocaleTimeString("en-GB").substring(0, 5)
      }, ...prev]);

      setHmSel(prev => ({ ...prev, qty: prev.qty + delta }));
      toast.success(delta > 1 ? "স্টক সফলভাবে বৃদ্ধি পেয়েছে" : "স্টক অ্যাডজাস্ট হয়েছে");

    } catch (err) {
      toast.error("ডাটাবেসে সিঙ্ক করতে সমস্যা হয়েছে!");
      console.error(err);
    }
  };

  const cellBg = (q) => { if(q===null||q===0)return"#060c14"; if(q<=2)return"#7c1d0e"; if(q<=5)return"#854d0e"; if(q<=10)return"#14532d"; return"#0f3d22"; };
  const cellFg = (q) => { if(q===null||q===0)return"#1e3a5c"; if(q<=2)return"#fca5a5"; if(q<=5)return"#fde68a"; if(q<=10)return"#86efac"; return"#4ade80"; };

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500 pb-10">
      
      {/* 1. MATRIX SELECTION */}
      <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-6 shadow-2xl">
        <div className="text-sm font-black text-[#22d3ee] mb-4 flex items-center gap-2">
          <span>◈</span> লেন্স টাইপ নির্বাচন — পাওয়ার হিটম্যাপ
        </div>

        <div className="grid grid-cols-[auto_1fr] border border-[#1a2540] rounded-xl overflow-hidden">
          <div className="bg-[#060f1e] border-r border-b border-[#1a2540] p-4 flex items-center justify-center">
            <div className="text-[9px] text-[#2a5a80] text-center leading-relaxed font-bold tracking-widest uppercase">কোটিং<br/>↕<br/>ডিজাইন →</div>
          </div>

          <div className="grid grid-cols-6 bg-[#060f1e] border-b border-[#1a2540]">
            {DESIGNS.map(d => (
              <button key={d.id} onClick={()=>{setHmDesign(d.id); setHmSel(null);}}
                className={`py-3 px-1 border-r border-[#1a2540] transition-all border-b-2 ${hmDesign===d.id ? "bg-[#07202e] border-b-[#22d3ee]" : "border-b-transparent hover:bg-[#0a1526]"}`}>
                <div className={`text-[10px] font-black ${hmDesign===d.id ? "text-[#22d3ee]" : "text-[#94a3b8]"}`}>{d.name}</div>
                <div className="text-[8px] text-[#4a5568]">{d.sub}</div>
              </button>
            ))}
          </div>

          {finalCoatings.map((coat) => {
            const isSelCoat = hmGlass === coat.id;
            return (
              <React.Fragment key={coat.id}>
                <button onClick={()=>{setHmGlass(coat.id); setHmSel(null);}}
                  className={`p-3 text-left border-r-2 border-b border-[#1a2540] transition-all min-w-[120px] ${isSelCoat ? "bg-[#0a0e1a]" : "bg-[#060f1e] hover:bg-[#0a1526]"}`}
                  style={{borderRightColor: isSelCoat ? coat.accent : C.bdr}}>
                  <div className={`text-[11px] font-black ${isSelCoat ? "text-white" : "text-[#c8dff0]"}`} style={{color: isSelCoat ? coat.accent : undefined}}>{coat.name}</div>
                  <div className="text-[9px] text-[#4a5568]">{coat.subName || coat.tag}</div>
                </button>

                <div className="grid grid-cols-6 border-b border-[#1a2540]">
                  {DESIGNS.map(des => {
                    const stk = getDesignTotalStock(coat.id, des.id);
                    const isActive = hmGlass === coat.id && hmDesign === des.id;
                    const stockColor = stk === 0 ? "#4a5568" : stk <= 5 ? C.yellow : C.green;
                    return (
                      <button key={des.id} onClick={()=>{setHmGlass(coat.id); setHmDesign(des.id); setHmSel(null);}}
                        className={`p-3 border-r border-[#1a2540] transition-all flex flex-col items-center justify-center ${isActive ? "bg-[#0c1626] ring-2 ring-[#22d3ee] ring-inset z-10" : "bg-[#060f1e] hover:bg-[#0a1526]"}`}>
                        <div className="text-xl font-black font-mono leading-none" style={{color:stockColor}}>{stk}</div>
                        <div className="text-[8px] font-bold mt-1" style={{color:stockColor+"aa"}}>পিস</div>
                      </button>
                    );
                  })}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 2. SPH x CYL HEATMAP GRID */}
      <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        
        {/* 🚀 RESPONSIVE 10-DEGREE AXIS SCROLLER */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div className="text-sm font-black text-[#e8f4ff] flex items-center gap-2 whitespace-nowrap">
            {activeG.name} <span className="text-[#4a5568]">·</span> <span className="text-[#22d3ee]">{DESIGNS.find(d=>d.id===hmDesign)?.name}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#050810] p-1.5 rounded-xl border border-[#1a2540] max-w-full overflow-x-auto custom-scrollbar shadow-inner">
            <span className="text-[10px] text-[#38bdf8] font-black uppercase px-3 py-1 border-r border-[#1a2540] sticky left-0 bg-[#050810] z-10">Axis:</span>
            <div className="flex items-center gap-1 px-1">
              {AXIS_OPTIONS.map(ax => (
                <button 
                  key={ax} 
                  onClick={() => setHmAxis(ax)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all flex-shrink-0 ${hmAxis === ax ? "bg-[#38bdf8] text-[#050810] shadow-md" : "text-[#8a99ad] hover:text-white hover:bg-[#1a2540]"}`}
                >
                  {ax}°
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div ref={gridRef} className="overflow-auto max-h-[600px] border border-[#1a2540] rounded-xl bg-[#0f1424] custom-scrollbar relative scroll-smooth">
          <div className="inline-block min-w-max p-2">
            <div className="flex sticky top-0 z-20 bg-[#0f1424] pb-2 mb-2 border-b border-[#1a2540]">
              <div className="w-[60px] sticky left-0 z-30 bg-[#0f1424] text-right pr-3 flex-shrink-0 flex items-end justify-end border-r border-[#1a2540]">
                <span className="text-[8px] font-black text-[#4a5a70] uppercase">S \ C</span>
              </div>
              {HM_CYLS.map(c => (
                <div key={c} className="w-[42px] mx-[1px] text-center text-[10px] font-mono font-black text-[#38bdf8] flex-shrink-0 flex items-end justify-center">
                  {c === "0.00" ? "Sph" : c}
                </div>
              ))}
            </div>

            {HM_SPHS.map((sph, index) => (
              <div key={sph} id={`sph-row-${index}`} className="flex items-center mb-[2px]">
                <div className="w-[60px] h-[26px] sticky left-0 z-10 bg-[#0f1424] text-[10px] font-mono font-black text-right pr-3 flex-shrink-0 flex items-center justify-end border-r border-[#1a2540]" style={{color:parseFloat(sph)<0?"#f472b6":"#60a5fa"}}>
                  {sph}
                </div>
                {HM_CYLS.map(cyl => {
                  const { qty: q, stockKey } = getStockDetails(sph, cyl);
                  const selKey = sph+"|"+cyl;
                  const isSel = hmSel?.key === selKey;
                  return (
                    <button key={cyl} onClick={() => setHmSel(isSel ? null : {key:selKey, sph, cyl, glassId:hmGlass, qty:q, barcode:genBC(activeG.tag,sph,cyl,"0.00",hmDesign), stockKey})}
                      className="w-[42px] h-[26px] mx-[1px] rounded flex items-center justify-center transition-colors flex-shrink-0"
                      style={{background: isSel ? "#1d4ed8" : cellBg(q), border: `1px solid ${isSel ? "#60a5fa" : "#ffffff06"}`, zIndex: isSel ? 5 : 1}}>
                      <span className="text-[10px] font-black font-mono" style={{color: isSel ? "#fff" : cellFg(q)}}>{q > 0 ? q : "·"}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {hmSel && (
          <div className="absolute bottom-0 left-0 right-0 bg-[#0a0e1a]/95 backdrop-blur-md border-t border-[#22d3ee]/50 p-6 shadow-2xl flex items-center gap-8 animate-in slide-in-from-bottom-8 z-50">
            <BarcodeStrip code={hmSel.barcode} height={60} />
            <div className="flex-1">
              <div className="text-[9px] text-[#22d3ee] uppercase tracking-widest font-black mb-1">নির্বাচিত পাওয়ার (Axis: {hmAxis}°)</div>
              <div className="text-2xl font-black text-[#dde6f0] font-mono">
                <span className="text-[#f472b6] text-lg mr-1">S</span>{hmSel.sph} 
                <span className="text-[#a3e635] text-lg ml-4 mr-1">C</span>{hmSel.cyl}
                <span className="text-[#38bdf8] text-lg ml-4 mr-1">Ax</span>{hmAxis}°
              </div>
            </div>
            <div className="flex items-center gap-6 bg-[#050810] p-3 rounded-xl border border-[#1a2540]">
              <div className="text-center px-4 border-r border-[#1a2540]">
                <div className="text-[9px] text-[#4a5568] uppercase font-black tracking-widest mb-1">বর্তমান স্টক</div>
                <div className={`text-3xl font-mono font-black ${hmSel.qty > 0 ? "text-[#4ade80]" : "text-[#f87171]"}`}>{hmSel.qty}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => quickAdjustStock(-1)} className="w-12 h-12 rounded-xl bg-[#f87171]/10 border border-[#f87171]/30 text-[#f87171] text-2xl font-bold hover:bg-[#f87171] hover:text-white transition-all active:scale-95">−</button>
                <button onClick={() => quickAdjustStock(1)} className="w-12 h-12 rounded-xl bg-[#4ade80]/10 border border-[#4ade80]/30 text-[#4ade80] text-2xl font-bold hover:bg-[#4ade80] hover:text-black transition-all active:scale-95">+</button>
              </div>
            </div>
            <button onClick={() => setHmSel(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#1a2540] text-[#dde6f0] flex items-center justify-center hover:bg-[#f87171] transition-all">✕</button>
          </div>
        )}
      </div>

      <div className="pt-10 border-t border-[#1a2540] flex items-center justify-center gap-4 opacity-40">
        <OptiLogo className="w-6 h-6 grayscale" />
        <div className="text-[10px] font-black text-[#4a5568] uppercase tracking-[0.4em]">
          A <span className="text-[#0ea5e9]">QUANTUM</span> Project
        </div>
      </div>
    </div>
  );
}