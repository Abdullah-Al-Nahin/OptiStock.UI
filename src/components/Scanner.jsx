// src/components/Scanner.jsx
import React, { useState, useMemo, useRef, useCallback } from "react";
import { C, GLASS_TYPES, parseKey, makeKey, genBC, today, buildUPCEBars } from "../utils/constants";
import { useToast } from "./ToastContext"; // 👈 Integrated Toasts
import { OptiLogo } from "./Icons"; // 👈 Integrated Logo

// --- INLINE STYLES ---
const inp = {width:"100%", padding:"12px 14px", borderRadius:10, border:"1px solid #1a2540", background:"#0a0e1a", color:"#dde6f0", fontSize:14, outline:"none", fontFamily:"inherit"};
const card = (extra={}) => ({background:"#0f1424", border:"1px solid #1a2540", borderRadius:16, padding:20, ...extra});

// --- BARCODE RENDERER ---
function BarcodeStrip({ code, height=58 }) {
  const { bars, digits, check } = useMemo(() => buildUPCEBars(code), [code]);
  const X = 2.2; const quietUnits = 7; let x = quietUnits * X; const rects = [];
  bars.forEach((b, i) => { if (b.dark) rects.push({x, w: b.u * X, h: (i < 3 || i >= bars.length - 6) ? height - 12 : height - 19, y: 2}); x += b.u * X; });
  const symW = (bars.reduce((s,b)=>s+b.u, 0) + quietUnits*2) * X;
  return (
    <svg width={symW} height={height} style={{display:"block", background:"#fff", borderRadius:4, margin:"0 auto"}}>
      <rect width={symW} height={height} fill="#ffffff"/>
      {rects.map((r,i) => <rect key={i} x={r.x.toFixed(2)} y={r.y} width={Math.max(r.w, 0.8).toFixed(2)} height={r.h} fill="#000"/>)}
      <text x={quietUnits*X-1} y={height-2} textAnchor="end" fontSize={8} fontFamily="monospace" fill="#000">0</text>
      <text x={(quietUnits+3)*X} y={height-2} fontSize={8} fontFamily="monospace" fill="#000" letterSpacing={2.5}>{digits.join("").slice(0,3)}</text>
      <text x={(quietUnits+24)*X+1} y={height-2} fontSize={8} fontFamily="monospace" fill="#000" letterSpacing={2.5}>{digits.join("").slice(3,6)}</text>
      <text x={(quietUnits+42)*X+2} y={height-2} textAnchor="start" fontSize={8} fontFamily="monospace" fill="#000">{check}</text>
    </svg>
  );
}

export default function Scanner({ authUser, stock, setStock, txns, setTxns }) {
  const toast = useToast();
  const [inputVal, setInputVal] = useState(""); 
  const [result, setResult] = useState(null); 
  const [loading, setLoading] = useState(false); // 👈 Added loading state
  const [log, setLog] = useState([]); 
  const [adjQty, setAdjQty] = useState(1); 
  const [showList, setShowList] = useState(false); 
  const inputRef = useRef(null);
  
  // 1. Map known barcodes
  const bcMap = useMemo(() => {
    const map = {};
    const addEntry = (bc, entry) => { if (bc) map[bc.toUpperCase()] = entry; };
    
    GLASS_TYPES.forEach(g => {
      Object.entries(stock[g.id]||{}).forEach(([key, qty]) => {
        const {sph, cyl, add} = parseKey(key); 
        const bc = genBC(g.tag, sph, cyl, parseFloat(add)||0);
        addEntry(bc, {glassType:g.id, glassName:g.name, sph, cyl, add: parseFloat(add)>0 ? "+"+parseFloat(add).toFixed(2) : "N/A", barcode:bc, stockKey:key, qty});
      });
    });

    txns.forEach(tx => {
      if (tx.barcode && !map[tx.barcode.toUpperCase()]) {
        const addVal = tx.add==="N/A" ? "0" : tx.add.toString().replace("+",""); 
        const key = makeKey(tx.sph, tx.cyl, addVal); 
        const q = stock[tx.glassType]?.[key] ?? 0;
        addEntry(tx.barcode, {glassType:tx.glassType, glassName:tx.glassName, sph:tx.sph, cyl:tx.cyl, add:tx.add, barcode:tx.barcode, stockKey:key, qty:q});
      }
    });
    return map;
  }, [stock, txns]);

  const allBarcodes = useMemo(() => Object.keys(bcMap), [bcMap]);

  const doSearch = useCallback((raw) => {
    const c = (raw || inputVal).trim().toUpperCase(); 
    if (!c) return;
    
    const found = bcMap[c]; 
    const time = new Date().toLocaleTimeString("en-GB",{hour:"2-digit", minute:"2-digit", second:"2-digit"});
    
    if (found) {
      const q = stock[found.glassType]?.[found.stockKey] ?? 0;
      setResult({...found, qty:q}); 
      setLog(p => [{code:c, found:true, name:found.glassName, sph:found.sph, cyl:found.cyl, qty:q, time}, ...p.slice(0,19)]);
    } else {
      setResult({notFound:true, code:c}); 
      setLog(p => [{code:c, found:false, time}, ...p.slice(0,19)]);
      toast.warning("বারকোডটি স্টকে পাওয়া যায়নি!");
    }
    
    setInputVal(c); 
    setTimeout(() => inputRef.current && inputRef.current.select(), 60);
  }, [inputVal, bcMap, stock, toast]);

  // --- 🌐 UPDATED: CLOUD-CONNECTED ADJUST FUNCTION ---
  const adjust = async (dir) => {
    if (!result || result.notFound) return;
    const curQ = stock[result.glassType]?.[result.stockKey] ?? 0;
    
    if (dir < 0 && curQ < adjQty) {
      toast.error("স্টক অপর্যাপ্ত!");
      return;
    }
    
    setLoading(true);
    const newQ = Math.max(0, curQ + dir * adjQty);

    const cloudTx = {
      direction: dir > 0 ? "in" : "out",
      subtype: dir > 0 ? "purchase" : "sale",
      glassTypeId: result.glassType,
      glassName: result.glassName,
      sph: parseFloat(result.sph),
      cyl: parseFloat(result.cyl),
      add: result.add === "N/A" ? "0.00" : result.add.toString().replace("+",""),
      qty: adjQty,
      unitPrice: 0,
      totalPrice: 0,
      barcode: result.barcode,
      customerName: "Scanner Quick Action"
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/Transactions`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authUser.token}` 
        },
        body: JSON.stringify(cloudTx)
      });

      if (!response.ok) throw new Error("Cloud sync failed!");

      toast.success(dir > 0 ? "স্টক ইন করা হয়েছে" : "স্টক আউট সম্পন্ন");

      setStock(prev => {
        const gStock = prev[result.glassType] || {};
        return { ...prev, [result.glassType]: { ...gStock, [result.stockKey]: newQ } };
      });

      setTxns(prev => [{
        ...cloudTx,
        id: Date.now(),
        time: new Date().toLocaleTimeString("en-GB"),
        date: today
      }, ...prev]);

      setResult(r => ({...r, qty:newQ}));
      setLog(p => [{code:result.barcode, found:true, name:result.glassName, sph:result.sph, cyl:result.cyl, qty:newQ, time:new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}, ...p.slice(0,19)]);

    } catch (err) {
      toast.error("সার্ভারে কানেক্ট করা সম্ভব হচ্ছে না!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
        
        <div className="flex flex-col gap-6">
          <div style={card()}>
            <div className="text-sm font-black text-[#e8f4ff] mb-4 flex items-center gap-2"><span>📷</span> বারকোড স্ক্যানার</div>
            <div className="flex gap-2 mb-6">
              <input ref={inputRef} value={inputVal} onChange={e => setInputVal(e.target.value.toUpperCase())} onKeyDown={e => { if(e.key==="Enter") { e.preventDefault(); doSearch(inputVal); }}} placeholder="স্ক্যানার দিয়ে অথবা টাইপ করে বারকোড দিন..." style={{...inp, flex:1, border:"2px solid #1a3a5c", color:C.green}}/>
              <button onClick={() => doSearch(inputVal)} className="bg-gradient-to-br from-[#0ea5e9] to-[#0369a1] border-none rounded-xl px-8 text-white font-black cursor-pointer shadow-lg active:scale-95 transition-all">সার্চ</button>
            </div>
            
            <div className="text-[10px] text-[#2a5a80] mb-3 font-bold uppercase tracking-widest">স্টকে থাকা বারকোড ({allBarcodes.length}টি)</div>
            <div className="flex flex-wrap gap-2 overflow-hidden transition-all duration-300" style={{maxHeight: showList ? 400 : 36}}>
              {allBarcodes.map(bc => (
                <button key={bc} onClick={() => { setInputVal(bc); doSearch(bc); }} className="bg-[#060f1e] border border-[#1a3a5c] rounded-lg px-3 py-1.5 text-[#22d3ee] text-[10px] cursor-pointer hover:bg-[#1a3a5c] transition-colors">{bc}</button>
              ))}
            </div>
            {allBarcodes.length > 10 && (
              <button onClick={()=>setShowList(!showList)} className="mt-3 bg-none border-none text-[#0ea5e9] text-[10px] cursor-pointer font-black uppercase tracking-widest">
                {showList ? "▲ সংকুচিত করুন" : "▼ সব বারকোড দেখুন"}
              </button>
            )}
          </div>

          {result && !result.notFound && (
            <div style={card({border: "1px solid #00d9a040", background: "linear-gradient(180deg, #0f1424, #060f1e)"})}>
              <div className="flex justify-between items-start mb-8">
                <span className="text-lg font-black text-[#00d9a0] flex items-center gap-2"><span>✅</span> লেন্স পাওয়া গেছে</span>
                <div className="text-right">
                  <div className="text-5xl font-black font-mono leading-none" style={{color: result.qty === 0 ? C.red : result.qty <= 3 ? C.yellow : "#00d9a0"}}>{result.qty}</div>
                  <div className="text-[10px] text-[#4a5a70] uppercase font-bold tracking-widest mt-2">বর্তমান মজুদ (Stock)</div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[["গ্লাস", result.glassName, C.cyan], ["SPH", result.sph, "#f472b6"], ["CYL", result.cyl, "#a3e635"], ["ADD", result.add, C.purple], ["বারকোড", result.barcode, C.teal]].map(([l,v,c]) => (
                  <div key={l} className="bg-[#050810] rounded-xl p-4 border border-[#1a3a5c]">
                    <div className="text-[9px] text-[#4a5a70] font-black uppercase tracking-widest mb-1">{l}</div>
                    <div className="text-sm font-black font-mono" style={{color: c}}>{v}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 items-center p-4 bg-[#050810] rounded-2xl border border-[#1a3a5c] mb-8">
                <span className="text-[11px] text-[#4a5568] font-black uppercase tracking-widest ml-2">পরিমাণ:</span>
                <div className="flex items-center gap-1 bg-[#1a3a5c] rounded-xl p-1">
                   <button onClick={()=>setAdjQty(p=>Math.max(1,p-1))} className="w-10 h-10 rounded-lg bg-[#0f1424] border-none text-[#c8dff0] cursor-pointer text-xl font-black active:scale-90 transition-all">−</button>
                   <span className="text-2xl font-black text-[#e8f4ff] min-w-[50px] text-center font-mono">{adjQty}</span>
                   <button onClick={()=>setAdjQty(p=>p+1)} className="w-10 h-10 rounded-lg bg-[#0f1424] border-none text-[#c8dff0] cursor-pointer text-xl font-black active:scale-90 transition-all">+</button>
                </div>
                <div className="flex-1"/>
                <div className="flex gap-3">
                  <button onClick={()=>adjust(-1)} disabled={loading} className="bg-[#f8717110] border border-[#f8717140] rounded-xl px-8 py-4 text-[#f87171] font-black cursor-pointer uppercase tracking-widest hover:bg-[#f87171] hover:text-white transition-all disabled:opacity-50">📤 আউট</button>
                  <button onClick={()=>adjust(1)} disabled={loading} className="bg-gradient-to-r from-[#00d9a0] to-[#059669] border-none rounded-xl px-8 py-4 text-[#060f1e] font-black cursor-pointer uppercase tracking-widest active:scale-95 transition-all shadow-lg disabled:opacity-50">📥 ইন</button>
                </div>
              </div>

              <div className="pt-6 border-t border-[#1a3a5c] flex justify-center opacity-80">
                <BarcodeStrip code={result.barcode} height={60}/>
              </div>
            </div>
          )}
        </div>

        <div style={card({overflowY:"auto", maxHeight:800, display:"flex", flexDirection:"column"})}>
          <div className="text-[11px] font-black text-[#22d3ee] uppercase tracking-widest mb-6 flex items-center gap-2"><span>⏱</span> স্ক্যানার লগ</div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
            {log.length === 0 ? (
              <div className="text-center text-xs text-[#4a5568] py-20 italic">স্ক্যান ইতিহাস খালি</div>
            ) : (
              log.map((s,i) => (
                <div key={i} className={`p-4 rounded-xl border transition-all ${i===0 ? "bg-[#060f1e] border-[#0ea5e9]/30" : "bg-transparent border-[#1a3a5c]/40"} ${s.found ? "" : "border-[#f8717130]"}`}>
                  <div className="flex justify-between gap-2 mb-2">
                    <span className="text-[11px] font-black font-mono" style={{color: s.found ? "#00d9a0" : C.red}}>{s.code}</span>
                    <span className="text-[9px] text-[#4a5a70] font-bold">{s.time}</span>
                  </div>
                  {s.found && (
                    <div className="text-[10px] text-[#c8dff0] mt-2 flex justify-between items-end">
                      <div>
                        <div className="font-bold">{s.name}</div>
                        <div className="text-[#4a5a70] font-mono mt-0.5">S{s.sph} C{s.cyl}</div>
                      </div>
                      <div className="font-black text-[#0ea5e9] bg-[#0ea5e9]/10 px-2 py-1 rounded">মজুদ: {s.qty}</div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- STANDARDIZED A QUANTUM PROJECT BRANDING --- */}
      <div className="pt-10 border-t border-[#1a2540] flex items-center justify-center gap-4 opacity-40">
        <OptiLogo className="w-6 h-6 grayscale" />
        <div className="text-[10px] font-black text-[#4a5568] uppercase tracking-[0.4em]">
          A <span className="text-[#0ea5e9]">QUANTUM</span> Project
        </div>
      </div>
    </div>
  );
}