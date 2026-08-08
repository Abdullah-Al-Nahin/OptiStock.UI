// src/components/StockBrowser.jsx
import React, { useState, useMemo } from "react";
import { C, GLASS_TYPES, parseKey, genBC, API_BASE_URL } from "../utils/constants";
import Skeleton from "./Skeleton"; 
import { OptiLogo } from "./Icons"; 
import { useToast } from "./ToastContext"; 

const inpStyle = { padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)", fontSize: 13, outline: "none", width: "100%" };

export default function StockBrowser({ stock, setStock, authUser }) {
  const toast = useToast();
  const [filterGlass, setFilterGlass] = useState("all");
  const [filterSph, setFilterSph] = useState("");
  const [filterCyl, setFilterCyl] = useState("");
  const [filterAxis, setFilterAxis] = useState("");
  const [inStockOnly, setInStockOnly] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false); 

  const resetFilters = () => {
    setFilterGlass("all"); setFilterSph(""); setFilterCyl(""); setFilterAxis(""); setInStockOnly(true);
  };

  const tableData = useMemo(() => {
    if (!stock) return [];
    let list = [];
    
    GLASS_TYPES.forEach(g => {
      if (filterGlass !== "all" && g.id !== filterGlass) return;
      
      const gStock = stock[g.id] || {};
      Object.entries(gStock).forEach(([key, qty]) => {
        if (inStockOnly && qty <= 0) return;
        
        const parsed = parseKey(key);
        const sph = parsed.sph;
        const cyl = parsed.cyl;
        const add = parsed.add;
        let design = parsed.design;

        // 🚀 ROBUST AXIS EXTRACTOR AND DESIGN CLEANER
        let axisVal = 0;
        const axMatch = key.match(/(?:_)?ax(\d+)/i);
        if (axMatch) {
          axisVal = parseInt(axMatch[1], 10);
        }
        
        // Strip out the AX90/AX70 from the design name for the backend & UI
        const rawDbDesign = design.replace(/(?:_)?ax\d+/i, ''); 
        const cleanDesign = rawDbDesign.replace(/_/g, " ").trim().toUpperCase();
        
        // Match partial strings for fast typing
        if (filterSph && !sph.includes(filterSph)) return;
        if (filterCyl && !cyl.includes(filterCyl)) return;
        if (filterAxis && !axisVal.toString().includes(filterAxis)) return;

        list.push({
          id: key + g.id,
          glassId: g.id,
          glassName: g.name, tag: g.tag, accent: g.accent,
          sph, cyl, add, axis: axisVal, qty,
          barcode: genBC(g.tag, sph, cyl, add, design),
          design: cleanDesign,
          // 🚀 RAW VALUES FOR THE C# BACKEND DELETION
          rawSph: parseFloat(sph),
          rawCyl: parseFloat(cyl),
          rawAdd: parseFloat(add),
          rawAxis: axisVal,
          rawDesign: rawDbDesign,
          rawKey: key 
        });
      });
    });

    // Sort by Quantity (Highest first), then alphabetically by power
    return list.sort((a, b) => b.qty - a.qty || a.sph.localeCompare(b.sph));
  }, [stock, filterGlass, filterSph, filterCyl, filterAxis, inStockOnly]);

  // --- 🚀 THE DELETE FUNCTION ---
  const handleDelete = async (item) => {
    if (!window.confirm("আপনি কি নিশ্চিত যে এই এন্ট্রিটি ডাটাবেস থেকে মুছে ফেলতে চান?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/StockEntries/remove`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authUser.token}` 
        },
        body: JSON.stringify({
          GlassTypeId: item.glassId,
          Sph: item.rawSph,
          Cyl: item.rawCyl,
          Add: item.rawAdd,
          Axis: item.rawAxis,
          Design: item.rawDesign
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "মুছে ফেলতে সমস্যা হয়েছে!");
      }

      // 💥 INSTANT UI UPDATE: Remove the item from React state immediately 
      setStock(prev => {
        const newState = { ...prev };
        if (newState[item.glassId]) {
          const updatedGlassType = { ...newState[item.glassId] };
          delete updatedGlassType[item.rawKey]; 
          newState[item.glassId] = updatedGlassType;
        }
        return newState;
      });

      toast.success("এন্ট্রি সফলভাবে ডাটাবেস থেকে মুছে ফেলা হয়েছে!");
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // 🚀 SHOW SKELETON LOADERS WHILE DATA IS LOADING
  if (!stock || Object.keys(stock).length === 0) {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 pb-10">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xl">
           <Skeleton className="h-12 w-full opacity-20 rounded-xl" />
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xl min-h-[500px]">
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-14 w-full opacity-10 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 pb-10">
      
      {/* FILTER SECTION */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xl">
        <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-5 flex items-center gap-2"><span>🔍</span> ফিল্টার ও অনুসন্ধান</h3>
        
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-48">
            <label className="block text-[10px] text-[var(--text-muted)] font-black mb-2 uppercase tracking-widest ml-1">গ্লাস টাইপ</label>
            <select value={filterGlass} onChange={e => setFilterGlass(e.target.value)} style={inpStyle} className="transition-all focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/30">
              <option value="all">সব টাইপ</option>
              {GLASS_TYPES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <div className="w-28">
            <label className="block text-[10px] text-[#f472b6] font-black mb-2 uppercase tracking-widest ml-1">SPH</label>
            <input type="text" placeholder="-1.50" value={filterSph} onChange={e => setFilterSph(e.target.value)} style={inpStyle} className="transition-all focus:border-[#f472b6] focus:ring-1 focus:ring-[#f472b6]/30 font-mono" />
          </div>

          <div className="w-28">
            <label className="block text-[10px] text-[#a3e635] font-black mb-2 uppercase tracking-widest ml-1">CYL</label>
            <input type="text" placeholder="-0.75" value={filterCyl} onChange={e => setFilterCyl(e.target.value)} style={inpStyle} className="transition-all focus:border-[#a3e635] focus:ring-1 focus:ring-[#a3e635]/30 font-mono" />
          </div>

          <div className="w-28">
            <label className="block text-[10px] text-[#38bdf8] font-black mb-2 uppercase tracking-widest ml-1">AXIS</label>
            <input type="text" placeholder="90" value={filterAxis} onChange={e => setFilterAxis(e.target.value)} style={inpStyle} className="transition-all focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30 font-mono" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer mb-3 mr-2 p-2 rounded-lg hover:bg-[var(--border-color)]/30 transition-colors">
            <input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} className="w-4 h-4 accent-[#0ea5e9] bg-[var(--bg-main)] border-[var(--border-color)] rounded cursor-pointer" />
            <span className="text-xs font-black text-[var(--text-main)] uppercase tracking-widest">শুধু স্টক আছে</span>
          </label>

          <div className="bg-[var(--bg-main)] border border-[var(--border-color)] text-[#0ea5e9] px-4 py-2.5 rounded-xl font-black text-sm flex items-center mb-0.5 shadow-lg">
            {tableData.length} আইটেম
          </div>

          <div className="flex-1"></div>

          <button onClick={resetFilters} className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[#f87171] hover:bg-[#f87171]/10 px-4 py-2.5 rounded-xl transition-all mb-0.5 flex items-center gap-2">
            ✕ রিসেট
          </button>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto max-h-[700px] custom-scrollbar">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-[var(--bg-nav)] border-b-2 border-[var(--border-color)] sticky top-0 z-10 shadow-md">
              <tr>
                <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest">গ্লাস</th>
                <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">SPH</th>
                <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">CYL</th>
                <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">AXIS</th>
                <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">ADD</th>
                <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest">বারকোড</th>
                <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">স্টক</th>
                <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">অবস্থা</th>
                <th className="p-5 text-[11px] font-black text-[#f87171] uppercase tracking-widest text-center w-16">মুছুন</th>
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 ? (
                <tr>
                   <td colSpan="9" className="p-20 text-center">
                      <div className="text-4xl mb-4 opacity-20">🔎</div>
                      <div className="text-[var(--text-main)] font-black text-lg mb-1">কোনো লেন্স পাওয়া যায়নি</div>
                      <div className="text-xs text-[var(--text-muted)] italic">ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন</div>
                   </td>
                </tr>
              ) : (
                tableData.map((item, i) => (
                  <tr key={item.id} className={`border-b border-[var(--border-color)] hover:bg-[var(--bg-nav)] transition-colors ${i % 2 === 0 ? 'bg-transparent' : 'bg-[var(--bg-main)]'}`}>
                    <td className="p-5 font-bold">
                       <div className="flex items-center gap-3">
                         <span className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]" style={{background: item.accent, color: item.accent}}></span>
                         <span className="text-[var(--text-main)]">{item.glassName}</span>
                       </div>
                       <div className="text-[10px] text-[var(--text-muted)] mt-1 ml-5 font-bold tracking-widest">{item.design}</div>
                    </td>
                    <td className="p-5 text-center font-mono font-black text-[#f472b6] text-base">{item.sph}</td>
                    <td className="p-5 text-center font-mono font-black text-[#a3e635] text-base">{item.cyl}</td>
                    <td className="p-5 text-center font-mono font-black text-[#38bdf8] text-base">
                      {item.cyl === "0.00" || item.cyl === "0" ? "—" : `${item.axis}°`}
                    </td>
                    <td className="p-5 text-center font-mono font-black text-[var(--text-muted)] text-base">{item.add === "0.00" || item.add === "0" ? "N/A" : <span className="text-[#c084fc]">{item.add}</span>}</td>
                    <td className="p-5">
                      <span className="bg-[#064e3b]/40 border border-[#059669]/50 text-[#34d399] px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold tracking-widest shadow-inner">
                        {item.barcode}
                      </span>
                    </td>
                    <td className="p-5 text-center font-mono font-black text-[var(--text-main)] text-xl">{item.qty}</td>
                    <td className="p-5 text-center">
                      {item.qty === 0 ? (
                        <span className="bg-[#f87171]/10 border border-[#f87171]/30 text-[#f87171] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">স্টক আউট</span>
                      ) : item.qty <= 5 ? (
                        <span className="bg-[#fbbf24]/10 border border-[#fbbf24]/30 text-[#fbbf24] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">সীমিত</span>
                      ) : (
                        <span className="bg-[#4ade80]/10 border border-[#4ade80]/30 text-[#4ade80] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">✓ উপলব্ধ</span>
                      )}
                    </td>
                    
                    {/* DUSTBIN BUTTON COLUMN */}
                    <td className="p-5 text-center">
                      <button 
                        onClick={() => handleDelete(item)}
                        disabled={isDeleting}
                        title="এই লেন্সটি ডাটাবেস থেকে মুছে ফেলুন"
                        className="w-8 h-8 rounded-lg bg-[#f87171]/10 text-[#f87171] hover:bg-[#f87171] hover:text-white border border-[#f87171]/30 transition-all flex items-center justify-center shadow-sm mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-10 border-t border-[var(--border-color)] flex items-center justify-center gap-4 opacity-40">
        <OptiLogo className="w-6 h-6 grayscale" />
        <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em]">
          A <span className="text-[#0ea5e9]">QUANTUM</span> Project
        </div>
      </div>

    </div>
  );
}