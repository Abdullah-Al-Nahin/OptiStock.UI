// src/components/StockBrowser.jsx
import React, { useState, useMemo } from "react";
import { C, GLASS_TYPES, parseKey, genBC } from "../utils/constants";
import Skeleton from "./Skeleton"; // 👈 Integrated Skeletons
import { OptiLogo } from "./Icons"; // 👈 Integrated Logo

const inpStyle = { padding: "10px 14px", borderRadius: 10, border: "1px solid #1a2540", background: "#050810", color: "#dde6f0", fontSize: 13, outline: "none", width: "100%" };

export default function StockBrowser({ stock }) {
  const [filterGlass, setFilterGlass] = useState("all");
  const [filterSph, setFilterSph] = useState("");
  const [filterCyl, setFilterCyl] = useState("");
  const [inStockOnly, setInStockOnly] = useState(true);

  const resetFilters = () => {
    setFilterGlass("all"); setFilterSph(""); setFilterCyl(""); setInStockOnly(true);
  };

  const tableData = useMemo(() => {
    if (!stock) return [];
    let list = [];
    
    GLASS_TYPES.forEach(g => {
      if (filterGlass !== "all" && g.id !== filterGlass) return;
      
      const gStock = stock[g.id] || {};
      Object.entries(gStock).forEach(([key, qty]) => {
        if (inStockOnly && qty <= 0) return;
        
        const { sph, cyl, add, design } = parseKey(key);
        
        // Match partial strings for fast typing (e.g. typing "-1" matches "-1.50")
        if (filterSph && !sph.includes(filterSph)) return;
        if (filterCyl && !cyl.includes(filterCyl)) return;

        list.push({
          id: key + g.id,
          glassName: g.name, tag: g.tag, accent: g.accent,
          sph, cyl, add, qty,
          barcode: genBC(g.tag, sph, cyl, add, design),
          design: design.replace("_", " ").toUpperCase()
        });
      });
    });

    // Sort by Quantity (Highest first), then alphabetically by power
    return list.sort((a, b) => b.qty - a.qty || a.sph.localeCompare(b.sph));
  }, [stock, filterGlass, filterSph, filterCyl, inStockOnly]);

  // 🚀 SHOW SKELETON LOADERS WHILE DATA IS LOADING
  if (!stock || Object.keys(stock).length === 0) {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 pb-10">
        <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-6 shadow-xl">
           <Skeleton className="h-12 w-full opacity-20 rounded-xl" />
        </div>
        <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-6 shadow-xl min-h-[500px]">
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
      <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-6 shadow-xl">
        <h3 className="text-xs font-black text-[#4a5a70] uppercase tracking-widest mb-5 flex items-center gap-2"><span>🔍</span> ফিল্টার ও অনুসন্ধান</h3>
        
        <div className="flex flex-wrap items-end gap-5">
          <div className="w-56">
            <label className="block text-[10px] text-[#4a5a70] font-black mb-2 uppercase tracking-widest ml-1">গ্লাস টাইপ</label>
            <select value={filterGlass} onChange={e => setFilterGlass(e.target.value)} style={inpStyle} className="transition-all focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/30">
              <option value="all">সব টাইপ</option>
              {GLASS_TYPES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <div className="w-32">
            <label className="block text-[10px] text-[#f472b6] font-black mb-2 uppercase tracking-widest ml-1">SPH</label>
            <input type="text" placeholder="-1.50" value={filterSph} onChange={e => setFilterSph(e.target.value)} style={inpStyle} className="transition-all focus:border-[#f472b6] focus:ring-1 focus:ring-[#f472b6]/30 font-mono" />
          </div>

          <div className="w-32">
            <label className="block text-[10px] text-[#a3e635] font-black mb-2 uppercase tracking-widest ml-1">CYL</label>
            <input type="text" placeholder="-0.75" value={filterCyl} onChange={e => setFilterCyl(e.target.value)} style={inpStyle} className="transition-all focus:border-[#a3e635] focus:ring-1 focus:ring-[#a3e635]/30 font-mono" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer mb-3 mr-4 p-2 rounded-lg hover:bg-[#1a2540]/30 transition-colors">
            <input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} className="w-4 h-4 accent-[#0ea5e9] bg-[#050810] border-[#1a2540] rounded cursor-pointer" />
            <span className="text-xs font-black text-[#dde6f0] uppercase tracking-widest">শুধু স্টক আছে</span>
          </label>

          <div className="bg-[#1a3a5c]/30 border border-[#0ea5e9]/30 text-[#0ea5e9] px-5 py-2.5 rounded-xl font-black text-sm flex items-center mb-0.5 shadow-lg">
            {tableData.length} আইটেম
          </div>

          <div className="flex-1"></div>

          <button onClick={resetFilters} className="text-[11px] font-black uppercase tracking-widest text-[#4a5a70] hover:text-[#f87171] hover:bg-[#f87171]/10 px-4 py-2.5 rounded-xl transition-all mb-0.5 flex items-center gap-2">
            ✕ রিসেট
          </button>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto max-h-[700px] custom-scrollbar">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-[#0a1526] border-b-2 border-[#1a3a5c] sticky top-0 z-10 shadow-md">
              <tr>
                <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest">গ্লাস</th>
                <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">SPH</th>
                <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">CYL</th>
                <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">ADD</th>
                <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest">বারকোড</th>
                <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">স্টক</th>
                <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">অবস্থা</th>
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 ? (
                <tr>
                   <td colSpan="7" className="p-20 text-center">
                      <div className="text-4xl mb-4 opacity-20">🔎</div>
                      <div className="text-[#c8dff0] font-black text-lg mb-1">কোনো লেন্স পাওয়া যায়নি</div>
                      <div className="text-xs text-[#4a5a70] italic">ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন</div>
                   </td>
                </tr>
              ) : (
                tableData.map((item, i) => (
                  <tr key={item.id} className={`border-b border-[#1a2540] hover:bg-[#0f1828] transition-colors ${i % 2 === 0 ? 'bg-transparent' : 'bg-[#050810]'}`}>
                    <td className="p-5 font-bold">
                       <div className="flex items-center gap-3">
                         <span className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]" style={{background: item.accent, color: item.accent}}></span>
                         <span className="text-[#dde6f0]">{item.glassName}</span>
                       </div>
                       <div className="text-[10px] text-[#4a5a70] mt-1 ml-5 font-bold tracking-widest">{item.design}</div>
                    </td>
                    <td className="p-5 text-center font-mono font-black text-[#f472b6] text-base">{item.sph}</td>
                    <td className="p-5 text-center font-mono font-black text-[#a3e635] text-base">{item.cyl}</td>
                    <td className="p-5 text-center font-mono font-black text-[#4a5568] text-base">{item.add === "0.00" || item.add === "0" ? "N/A" : <span className="text-[#c084fc]">{item.add}</span>}</td>
                    <td className="p-5">
                      <span className="bg-[#064e3b]/40 border border-[#059669]/50 text-[#34d399] px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold tracking-widest shadow-inner">
                        {item.barcode}
                      </span>
                    </td>
                    <td className="p-5 text-center font-mono font-black text-[#dde6f0] text-xl">{item.qty}</td>
                    <td className="p-5 text-center">
                      {item.qty === 0 ? (
                        <span className="bg-[#f87171]/10 border border-[#f87171]/30 text-[#f87171] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">স্টক আউট</span>
                      ) : item.qty <= 5 ? (
                        <span className="bg-[#fbbf24]/10 border border-[#fbbf24]/30 text-[#fbbf24] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">সীমিত</span>
                      ) : (
                        <span className="bg-[#4ade80]/10 border border-[#4ade80]/30 text-[#4ade80] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">✓ উপলব্ধ</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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