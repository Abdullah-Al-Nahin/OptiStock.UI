// src/components/Dashboard.jsx
import React, { useMemo } from "react";
import { C, GLASS_TYPES, fmtTk, today } from "../utils/constants";
import Skeleton, { CardSkeleton } from "./Skeleton"; 
import { OptiLogo } from "./Icons"; 

export default function Dashboard({ stock, txns }) {
  
  // --- MASTER ANALYTICS ENGINE ---
  const stats = useMemo(() => {
    // 🚀 1. Data Normalizer (Bridges C# Backend to UI)
    const normalizedTxns = (txns || [])
      .map(t => {
        const dt = t.timestamp ? new Date(t.timestamp) : new Date();
        return {
          ...t,
          id: t.id || t.Id || Math.random().toString(),
          date: t.date || dt.toISOString().split('T')[0],
          time: t.time || dt.toTimeString().split(' ')[0].substring(0,5),
          glassType: t.glassType || t.glassTypeId, 
          add: t.add || "N/A"
        };
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp || `${a.date}T${a.time}`).getTime();
        const timeB = new Date(b.timestamp || `${b.date}T${b.time}`).getTime();
        return timeB - timeA;
      });

    // 2. Stock Metrics by Glass Type
    let totalStock = 0;
    let inStockItems = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0; 
    
    const glassStats = GLASS_TYPES.map(g => ({ ...g, qty: 0, combos: 0 }));

    GLASS_TYPES.forEach((g, idx) => {
      const gStock = (stock && stock[g.id]) || {};
      const entries = Object.values(gStock);
      
      entries.forEach(qty => {
        if (qty > 0) {
          totalStock += qty;
          glassStats[idx].qty += qty;
          glassStats[idx].combos += 1;
          inStockItems++;
          if (qty <= 3) lowStockItems++;
        } else if (qty === 0) {
          outOfStockItems++;
        }
      });
    });

    // 3. Transaction Metrics (Today & Month)
    const currentMonth = today.substring(0, 7);
    let todayImport = 0, todayPurchase = 0, todayWholesale = 0, todayRetail = 0, todayRev = 0;
    let monthRev = 0, monthQty = 0, monthCost = 0;
    
    const revByCategory = GLASS_TYPES.reduce((acc, g) => ({ ...acc, [g.id]: 0 }), {});

    normalizedTxns.forEach(t => {
      if (t.date === today) {
        if (t.subtype === "import") todayImport += t.qty;
        if (t.subtype === "purchase") todayPurchase += t.qty;
        if (t.subtype === "sale") { todayWholesale += t.qty; todayRev += t.totalPrice; }
        if (t.subtype === "use") { todayRetail += t.qty; todayRev += t.totalPrice; }
      }
      
      if (t.date.startsWith(currentMonth)) {
        if (t.direction === "out" && (t.subtype === "sale" || t.subtype === "use")) {
          monthRev += t.totalPrice;
          monthQty += t.qty;
          if(revByCategory[t.glassType] !== undefined) revByCategory[t.glassType] += t.totalPrice;
        }
        if (t.direction === "in") monthCost += t.totalPrice;
      }
    });

    // 4. Revenue Progress Bars
    const maxRev = Math.max(...Object.values(revByCategory), 1);
    const revBars = GLASS_TYPES.map(g => ({
      id: g.id,
      name: g.name,
      accent: g.accent,
      revenue: revByCategory[g.id] || 0,
      percent: ((revByCategory[g.id] || 0) / maxRev) * 100,
      totalPercent: monthRev > 0 ? ((revByCategory[g.id] || 0) / monthRev) * 100 : 0
    })).sort((a,b) => b.revenue - a.revenue).filter(r => r.revenue > 0);

    return {
      totalStock, inStockItems, lowStockItems, outOfStockItems, glassStats,
      todayImport, todayPurchase, todayWholesale, todayRetail, todayRev,
      monthRev, monthQty, monthCost, dailyAvgRev: monthRev / (new Date().getDate() || 1),
      revBars,
      recentTxns: normalizedTxns.slice(0, 10)
    };
  }, [stock, txns]);

  // 🚀 SHOW SKELETON LOADERS WHILE DATA IS LOADING
  if (!txns || txns.length === 0) {
    return (
      <div className="space-y-6 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[...Array(7)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-8 h-[350px]">
            <Skeleton className="w-48 h-4 mb-6" />
            <Skeleton className="w-full h-full rounded-xl opacity-20" />
          </div>
          <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-8 h-[350px] flex flex-col items-center justify-center">
            <Skeleton className="w-32 h-32 rounded-full mb-6" />
            <Skeleton className="w-24 h-4 mb-2" />
            <Skeleton className="w-24 h-4" />
          </div>
        </div>
        <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-6 h-[400px]">
           <Skeleton className="w-full h-full rounded-xl opacity-10" />
        </div>
      </div>
    );
  }

  // --- SVG DONUT CHART CALCULATION ---
  const totalItems = stats.inStockItems + stats.lowStockItems + stats.outOfStockItems || 1;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeInStock = (stats.inStockItems / totalItems) * circumference;
  const strokeLowStock = (stats.lowStockItems / totalItems) * circumference;
  const strokeOutStock = (stats.outOfStockItems / totalItems) * circumference;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 pb-10">
      
      {/* --- ROW 1: TOP SUMMARY CARDS --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { label: "মোট মজুদ", val: stats.totalStock, icon: "📦", color: "#22d3ee" },
          { label: "আজ আমদানি", val: stats.todayImport, icon: "🚢", color: "#f472b6" },
          { label: "আজ ক্রয়", val: stats.todayPurchase, icon: "🛒", color: "#4ade80" },
          { label: "আজ পাইকারি বিক্রয়", val: stats.todayWholesale, icon: "💰", color: "#fb923c" },
          { label: "আজ খুচরা বিক্রয়", val: stats.todayRetail, icon: "🏪", color: "#f87171" },
          { label: "মোট বিক্রয় আয়", val: fmtTk(stats.todayRev), icon: "💵", color: "#fbbf24", isTk: true },
          { label: "কম স্টক", val: stats.lowStockItems, icon: "⚠️", color: "#fb7185" }
        ].map((c, i) => (
          <div key={i} className="bg-[#0f1424] border border-[#1a2540] rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#1a3a5c] transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div className="text-xl opacity-80 group-hover:scale-110 transition-transform">{c.icon}</div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/5 to-transparent absolute -top-2 -right-2"></div>
            </div>
            <div>
              <div className={`font-black ${c.isTk ? "text-lg" : "text-3xl"} font-mono`} style={{color: c.color}}>{c.val}</div>
              <div className="text-[9px] text-[#4a5a70] uppercase font-bold tracking-widest mt-1">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* --- ROW 2: GLASS TYPE INVENTORY --- */}
      <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-4 shadow-xl">
        <h3 className="text-[10px] text-[#4a5a70] uppercase font-black tracking-widest mb-3 flex items-center gap-2"><span>◈</span> গ্লাস টাইপ অনুযায়ী মজুদ</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {stats.glassStats.map(g => (
            <div key={g.id} className="bg-[#050810] border border-[#1a2540] rounded-xl p-3 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1" style={{backgroundColor: g.accent}}></div>
              <div className="flex justify-between items-center mb-4 mt-1">
                <div className="text-[11px] font-black text-[#dde6f0]">{g.name} <span className="text-[8px] bg-[#1a2540] px-1 rounded ml-1 text-white">{g.tag}</span></div>
              </div>
              <div>
                <div className="text-2xl font-black font-mono" style={{color: g.accent}}>{g.qty}</div>
                <div className="text-[9px] text-[#4a5a70] font-bold">{g.combos} কম্বিনেশন</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- ROW 3: CHARTS SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-5 shadow-xl flex flex-col">
          <h3 className="text-xs font-black text-[#dde6f0] mb-1 flex items-center gap-2"><span>📈</span> Monthly Sales vs Target (BDT)</h3>
          <p className="text-[9px] text-[#4a5a70] mb-6">গত ১২ মাসের মাসিক বিক্রয় ও লক্ষ্যমাত্রা</p>
          <div className="flex-1 relative min-h-[200px] border-b border-l border-[#1a2540] flex items-end pt-10">
            <div className="absolute left-[-30px] bottom-0 h-full flex flex-col justify-between text-[8px] text-[#4a5a70] font-mono pb-6">
              <span>3K</span><span>2K</span><span>1K</span><span>0K</span>
            </div>
            <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5"/>
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <polyline points="0,150 1000,80" fill="none" stroke="#4ade80" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />
              <polygon points="0,195 850,195 980,40 1000,40 1000,200 0,200" fill="url(#lineGrad)" />
              <polyline points="0,195 850,195 980,40" fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="980" cy="40" r="5" fill="#0f1424" stroke="#22d3ee" strokeWidth="3" />
            </svg>
            <div className="absolute bottom-[-25px] w-full flex justify-between text-[9px] text-[#4a5a70] font-mono px-2">
              <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span className="text-[#22d3ee] font-bold">Dec</span>
            </div>
          </div>
          <div className="mt-8 flex gap-4 text-[9px] font-bold">
            <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#22d3ee]"></span> <span className="text-[#dde6f0]">মাসিক বিক্রয়</span></div>
            <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#4ade80]" style={{borderBottom:"1px dashed #000"}}></span> <span className="text-[#4ade80]">লক্ষ্যমাত্রা</span></div>
          </div>
        </div>

        <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-5 shadow-xl flex flex-col">
          <h3 className="text-[10px] font-black text-[#4a5a70] uppercase tracking-widest mb-4 flex items-center gap-2"><span>◉</span> Stock Status</h3>
          <div className="flex-1 flex flex-col items-center justify-center relative mb-6">
            <svg width="140" height="140" viewBox="0 0 100 100" className="transform -rotate-90">
              <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#1a2540" strokeWidth="12" />
              <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#4ade80" strokeWidth="12" strokeDasharray={`${strokeInStock} ${circumference}`} strokeDashoffset="0" />
              <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#fbbf24" strokeWidth="12" strokeDasharray={`${strokeLowStock} ${circumference}`} strokeDashoffset={-strokeInStock} />
              <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#f87171" strokeWidth="12" strokeDasharray={`${strokeOutStock} ${circumference}`} strokeDashoffset={-(strokeInStock + strokeLowStock)} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full">
              <div className="text-2xl font-black text-white">{totalItems}</div>
              <div className="text-[6px] text-[#4a5a70] uppercase font-bold tracking-widest mt-1 text-center leading-tight">মোট আইটেম</div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-[#050810] border border-[#1a2540] p-2 rounded-lg">
              <div className="flex items-center gap-2 text-[10px] text-[#dde6f0] font-bold"><span className="w-2 h-2 rounded-full bg-[#4ade80]"></span> In Stock</div>
              <div className="text-xs font-mono font-black text-[#4ade80]">{stats.inStockItems}</div>
            </div>
            <div className="flex justify-between items-center bg-[#050810] border border-[#1a2540] p-2 rounded-lg">
              <div className="flex items-center gap-2 text-[10px] text-[#dde6f0] font-bold"><span className="w-2 h-2 rounded-full bg-[#fbbf24]"></span> Low Stock</div>
              <div className="text-xs font-mono font-black text-[#fbbf24]">{stats.lowStockItems}</div>
            </div>
            <div className="flex justify-between items-center bg-[#050810] border border-[#1a2540] p-2 rounded-lg">
              <div className="flex items-center gap-2 text-[10px] text-[#dde6f0] font-bold"><span className="w-2 h-2 rounded-full bg-[#f87171]"></span> Out of Stock</div>
              <div className="text-xs font-mono font-black text-[#f87171]">{stats.outOfStockItems}</div>
            </div>
          </div>
        </div>
      </div>

      {/* --- ROW 4: ANALYTICS & LISTS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-5 shadow-xl">
          <h3 className="text-[10px] font-black text-[#4a5a70] uppercase tracking-widest mb-6">গ্লাস টাইপ — বিক্রয় আয়</h3>
          <div className="space-y-5">
            {stats.revBars.length === 0 ? <div className="text-[10px] text-[#4a5a70] italic">তথ্য নেই</div> : stats.revBars.map(bar => (
              <div key={bar.id}>
                <div className="flex justify-between items-end mb-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[#dde6f0]"><span className="w-1.5 h-1.5 rounded-full" style={{background: bar.accent}}></span> {bar.name}</div>
                  <div className="text-xs font-black font-mono text-white">{fmtTk(bar.revenue)}</div>
                </div>
                <div className="w-full bg-[#050810] rounded-full h-1.5 flex items-center relative">
                  <div className="h-1.5 rounded-full transition-all duration-1000" style={{width: `${bar.percent}%`, backgroundColor: bar.accent}}></div>
                  <span className="absolute right-0 -bottom-4 text-[7px] text-[#4a5a70] font-mono">{bar.totalPercent.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-5 shadow-xl">
          <h3 className="text-[10px] font-black text-[#4a5a70] uppercase tracking-widest mb-6">এই মাসের সারাংশ</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 border-b border-[#1a2540]">
              <div className="flex items-center gap-3 text-[11px] text-[#dde6f0] font-bold"><span className="opacity-70">💰</span> বিক্রয় আয়</div>
              <div className="text-sm font-black font-mono text-[#4ade80]">{fmtTk(stats.monthRev)}</div>
            </div>
            <div className="flex justify-between items-center p-3 border-b border-[#1a2540]">
              <div className="flex items-center gap-3 text-[11px] text-[#dde6f0] font-bold"><span className="opacity-70">📦</span> বিক্রয় পিস</div>
              <div className="text-sm font-black font-mono text-[#22d3ee]">{stats.monthQty} <span className="text-[9px]">পিস</span></div>
            </div>
            <div className="flex justify-between items-center p-3 border-b border-[#1a2540]">
              <div className="flex items-center gap-3 text-[11px] text-[#dde6f0] font-bold"><span className="opacity-70">🛒</span> ক্রয় ব্যয়</div>
              <div className="text-sm font-black font-mono text-[#fb923c]">{fmtTk(stats.monthCost)}</div>
            </div>
            <div className="flex justify-between items-center p-3">
              <div className="flex items-center gap-3 text-[11px] text-[#dde6f0] font-bold"><span className="opacity-70">📊</span> গড় দৈনিক</div>
              <div className="text-sm font-black font-mono text-[#c084fc]">{fmtTk(stats.dailyAvgRev)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* --- ROW 5: RECENT TRANSACTIONS --- */}
      <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-5 shadow-xl">
        <h3 className="text-[10px] font-black text-[#4a5a70] uppercase tracking-widest mb-4 flex items-center gap-2"><span>⏱</span> সাম্প্রতিক ১০টি লেনদেন</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.recentTxns.length === 0 ? <div className="text-[10px] text-[#4a5a70] italic p-4">কোনো লেনদেন পাওয়া যায়নি।</div> : stats.recentTxns.map((tx) => (
            <div key={tx.id} className="bg-[#050810] border border-[#1a3a5c] p-3 rounded-xl flex justify-between items-center hover:border-[#1a2540] transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-[#dde6f0]">{tx.glassName}</span>
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${tx.direction === "in" ? "bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/30" : "bg-[#f87171]/10 text-[#f87171] border-[#f87171]/30"}`}>
                    {tx.subtype === "purchase" ? "ক্রয়" : tx.subtype === "import" ? "আমদানি" : tx.subtype === "sale" ? "পাইকারি" : tx.subtype === "use" ? "খুচরা" : "ভাঙা"}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-[#4a5568]">
                  <span className="text-[#f472b6]">S</span>{tx.sph} <span className="text-[#a3e635]">C</span>{tx.cyl} {tx.add !== "N/A" && <span className="text-[#c084fc] ml-1">A{tx.add}</span>}
                </div>
                <div className="text-[8px] font-mono text-[#4a5568] mt-0.5">◫ {tx.barcode}</div>
              </div>
              <div className="text-right">
                <div className={`font-mono font-black text-sm ${tx.direction === "in" ? "text-[#4ade80]" : "text-[#f87171]"}`}>
                  {tx.direction === "in" ? "+" : "-"}{tx.qty}
                </div>
                <div className="text-[10px] text-[#fbbf24] font-bold mt-0.5">{fmtTk(tx.totalPrice)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- A QUANTUM PROJECT BRANDING --- */}
      <div className="pt-10 border-t border-[#1a2540] flex items-center justify-center gap-4 opacity-40">
        <OptiLogo className="w-6 h-6 grayscale" />
        <div className="text-[10px] font-black text-[#4a5568] uppercase tracking-[0.4em]">
          A <span className="text-[#0ea5e9]">QUANTUM</span> Project
        </div>
      </div>

    </div>
  );
}