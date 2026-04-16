// src/components/LabelPrint.jsx
import React, { useState, useMemo } from "react";
import { GLASS_TYPES, buildUPCEBars, parseKey, genBC, C } from "../utils/constants";
import { useToast } from "./ToastContext"; // 👈 Integrated Toasts
import Skeleton from "./Skeleton"; // 👈 Integrated Skeletons
import { OptiLogo } from "./Icons"; // 👈 Integrated Logo

// --- SVG BARCODE GENERATOR FOR LABELS ---
function upceSVGString(code, height = 45) {
  const { bars, digits } = buildUPCEBars(code);
  const quietUnits = 7;
  const X = 1.8;
  const W = (bars.reduce((s, b) => s + b.u, 0) + quietUnits * 2) * X;
  let x = quietUnits * X;
  let rects = "";
  
  bars.forEach((b, i) => {
    if (b.dark) {
      rects += `<rect x="${x.toFixed(2)}" y="2" width="${Math.max(b.u * X, 0.8).toFixed(2)}" height="${(i < 3 || i >= bars.length - 6) ? height - 10 : height - 15}" fill="#000"/>`;
    }
    x += b.u * X;
  });

  const numStr = digits.join("");
  const textElements = `
    <text x="${quietUnits * X - 2}" y="${height - 2}" text-anchor="end" font-size="8" font-family="monospace" fill="#000">0</text>
    <text x="${(quietUnits + 3) * X}" y="${height - 2}" font-size="9" font-family="monospace" fill="#000" letter-spacing="3">${numStr.slice(0, 3)}</text>
    <text x="${(quietUnits + 22) * X}" y="${height - 2}" font-size="9" font-family="monospace" fill="#000" letter-spacing="3">${numStr.slice(3, 6)}</text>
  `;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(1)}" height="${height}"><rect width="${W.toFixed(1)}" height="${height}" fill="#fff"/>${rects}${textElements}</svg>`;
}

export default function LabelPrint({ stock }) {
  const toast = useToast();
  const [selGlass, setSelGlass] = useState(GLASS_TYPES[0].id);
  const [printQueue, setPrintQueue] = useState([]); 
  const [copiesInput, setCopiesInput] = useState({}); 

  // Extract available stock
  const availableItems = useMemo(() => {
    const items = [];
    const gType = GLASS_TYPES.find(g => g.id === selGlass);
    if (!gType || !stock[selGlass]) return items;

    Object.entries(stock[selGlass]).forEach(([key, qty]) => {
      if (qty > 0) {
        const { sph, cyl, add, design } = parseKey(key);
        const bc = genBC(gType.tag, sph, cyl, add, design);
        let pwrStr = `S${sph} C${cyl}`;
        if (add !== "0.00" && add !== "0" && add !== "+0.00") pwrStr += ` A${add}`;
        
        items.push({
          key, barcode: bc, glassName: gType.name, design: design.replace("_", " ").toUpperCase(),
          power: pwrStr, stockQty: qty
        });
      }
    });
    return items.sort((a, b) => a.power.localeCompare(b.power)); 
  }, [stock, selGlass]);

  const addToQueue = (item) => {
    const copies = parseInt(copiesInput[item.key]) || 1;
    if (copies <= 0) return toast.warning("সঠিক সংখ্যা দিন");

    setPrintQueue(prev => {
      const existing = prev.find(p => p.barcode === item.barcode);
      if (existing) {
        return prev.map(p => p.barcode === item.barcode ? { ...p, copies: p.copies + copies } : p);
      }
      return [...prev, { barcode: item.barcode, glassName: item.glassName, design: item.design, power: item.power, copies }];
    });
    
    toast.success(`${item.power} কিউতে যোগ করা হয়েছে`);
    setCopiesInput(prev => ({ ...prev, [item.key]: "" }));
  };

  const removeQueueItem = (bc) => {
    setPrintQueue(prev => prev.filter(p => p.barcode !== bc));
    toast.info("কিউ থেকে সরানো হয়েছে");
  };

  const clearQueue = () => {
    setPrintQueue([]);
    toast.info("প্রিন্ট কিউ সাফ করা হয়েছে");
  };

  const totalStickers = printQueue.reduce((sum, item) => sum + item.copies, 0);

  const printLabels = () => {
    if (printQueue.length === 0) return toast.error("প্রিন্ট কিউ খালি!");

    let stickersHtml = "";
    printQueue.forEach(item => {
      const bcSvg = upceSVGString(item.barcode, 45);
      for (let i = 0; i < item.copies; i++) {
        stickersHtml += `
          <div class="sticker">
            <div class="s-head">OptiStock PRO</div>
            <div class="s-name">${item.glassName} <span style="font-size:7px; color:#666;">${item.design}</span></div>
            <div class="s-pwr">${item.power}</div>
            <div class="s-bc">${bcSvg}</div>
            <div class="s-bctxt">${item.barcode}</div>
          </div>
        `;
      }
    });

    const html = `<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Labels</title><style>
        body { font-family: sans-serif; margin: 0; padding: 10px; background: #fff; }
        .page { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; justify-content: center; }
        .sticker { width: 180px; height: 95px; border: 1px dashed #ccc; border-radius: 4px; padding: 6px; box-sizing: border-box; text-align: center; display: flex; flex-direction: column; justify-content: space-between; page-break-inside: avoid; }
        .s-head { font-size: 8px; font-weight: bold; color: #aaa; text-transform: uppercase; letter-spacing: 1.5px; }
        .s-name { font-size: 10px; font-weight: bold; color: #000; margin-top: 2px; }
        .s-pwr { font-size: 12px; font-weight: 900; color: #000; font-family: monospace; }
        .s-bc { display: flex; justify-content: center; }
        .s-bctxt { font-size: 7px; font-family: monospace; color: #555; }
        @media print { @page { margin: 10mm; size: A4; } .sticker { border: 1px solid #eee; } }
      </style></head><body><div class="page">${stickersHtml}</div>
      <script>window.onload = function() { window.print(); window.close(); }</script></body></html>`;
    
    const win = window.open("", "_blank"); 
    win.document.write(html); 
    win.document.close();
  };

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
        
        {/* LEFT: INVENTORY SELECTION */}
        <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-6 shadow-2xl flex flex-col h-[800px]">
          <h2 className="text-lg font-black text-[#22d3ee] mb-6 flex items-center gap-2"><span>🏷️</span> লেবেল প্রিন্ট জেনারেটর</h2>
          
          <div className="flex gap-2 overflow-x-auto pb-4 mb-2 custom-scrollbar">
            {GLASS_TYPES.map(g => (
              <button key={g.id} onClick={() => setSelGlass(g.id)} 
                className={`px-5 py-2.5 rounded-xl text-xs font-black border whitespace-nowrap transition-all active:scale-95 ${selGlass === g.id ? "bg-[#1a3a5c] border-[#22d3ee] text-[#22d3ee] shadow-[0_0_15px_rgba(34,211,238,0.2)]" : "bg-[#060f1e] border-[#1a2540] text-[#4a5a70] hover:text-[#dde6f0]"}`}>
                {g.name}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto border border-[#1a2540] rounded-2xl bg-[#060f1e] custom-scrollbar">
            {!stock[selGlass] ? (
               <div className="p-6 space-y-4">
                  {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full opacity-10 rounded-lg" />)}
               </div>
            ) : availableItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#4a5a70] p-10 text-center">
                <div className="text-5xl mb-4 opacity-20">📦</div>
                <div className="text-sm font-bold uppercase tracking-widest opacity-40">এই ক্যাটাগরিতে কোনো স্টক নেই</div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#0a1526] z-10">
                  <tr>
                    <th className="p-4 text-[10px] font-black text-[#2a5a80] uppercase tracking-widest border-b border-[#1a2540]">পাওয়ার (Power)</th>
                    <th className="p-4 text-[10px] font-black text-[#2a5a80] uppercase tracking-widest border-b border-[#1a2540] text-center">স্টক</th>
                    <th className="p-4 text-[10px] font-black text-[#2a5a80] uppercase tracking-widest border-b border-[#1a2540] text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {availableItems.map((item, i) => (
                    <tr key={item.key} className={`border-b border-[#1a2540] hover:bg-[#0f1828] transition-colors ${i % 2 === 0 ? 'bg-transparent' : 'bg-[#050810]'}`}>
                      <td className="p-4">
                         <div className="font-mono font-black text-[#dde6f0] text-sm">{item.power}</div>
                         <div className="text-[10px] text-[#4a5a70] font-bold mt-0.5">{item.design}</div>
                      </td>
                      <td className="p-4 text-center font-mono font-black text-[#4ade80] bg-[#4ade80]/5">{item.stockQty}</td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <input type="number" min="1" placeholder="1" 
                            value={copiesInput[item.key] || ""} 
                            onChange={(e) => setCopiesInput({ ...copiesInput, [item.key]: e.target.value })}
                            className="w-14 bg-[#0a0e1a] border border-[#1a2540] rounded-lg text-center text-xs text-[#22d3ee] font-black outline-none focus:border-[#22d3ee]"
                          />
                          <button onClick={() => addToQueue(item)} className="bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/30 hover:bg-[#0ea5e9] hover:text-white px-4 py-2 rounded-lg text-xs font-black transition-all active:scale-90">
                            + ADD
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT: PRINT QUEUE */}
        <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-6 shadow-2xl flex flex-col h-[800px]">
          <div className="flex justify-between items-center mb-6 border-b border-[#1a2540] pb-4">
            <h3 className="text-sm font-black text-[#e8f4ff] uppercase tracking-widest flex items-center gap-2"><span>🖨️</span> প্রিন্ট কিউ (Queue)</h3>
            {printQueue.length > 0 && (
              <button onClick={clearQueue} className="text-[10px] bg-[#f87171]/10 text-[#f87171] px-2 py-1 rounded hover:bg-[#f87171] hover:text-white transition-all font-black uppercase">সাফ</button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {printQueue.length === 0 ? (
              <div className="text-center text-[#4a5a70] text-xs italic mt-20 opacity-50">কিউতে কোনো লেবেল নেই।</div>
            ) : (
              <div className="space-y-3">
                {printQueue.map((item, i) => (
                  <div key={i} className="bg-[#060f1e] border border-[#1a3a5c] p-4 rounded-2xl flex justify-between items-center group animate-in slide-in-from-right-4">
                    <div>
                      <div className="text-[9px] text-[#4a5a70] font-black uppercase tracking-wider">{item.glassName}</div>
                      <div className="font-mono font-black text-[#22d3ee] text-base">{item.power}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-[#1a3a5c] px-3 py-1 rounded-lg text-xs font-black text-white">{item.copies} টি</div>
                      <button onClick={() => removeQueueItem(item.barcode)} className="text-[#4a5a70] hover:text-[#f87171] text-xl transition-colors">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-[#1a2540]">
            <div className="flex justify-between items-end mb-6">
              <div className="text-[10px] text-[#4a5a70] font-black uppercase tracking-widest">মোট স্টিকার সংখ্যা:</div>
              <div className="text-4xl font-black font-mono text-[#4ade80] drop-shadow-[0_0_10px_rgba(74,222,128,0.2)]">{totalStickers}</div>
            </div>
            <button 
              onClick={printLabels} 
              disabled={printQueue.length === 0}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] transition-all text-xs active:scale-95 shadow-xl
                ${printQueue.length > 0 
                  ? 'bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] text-white hover:brightness-110' 
                  : 'bg-[#1a2540] text-[#4a5a70] cursor-not-allowed opacity-50'}`}
            >
              প্রিন্ট শুরু করুন 🖨️
            </button>
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