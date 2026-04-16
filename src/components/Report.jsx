// src/components/Report.jsx
import React, { useState, useMemo } from "react";
import { C, GLASS_TYPES, fmtTk, today, SM, buildUPCEBars } from "../utils/constants";
import Skeleton, { CardSkeleton } from "./Skeleton"; // 👈 Integrated Skeletons
import { OptiLogo } from "./Icons"; // 👈 Integrated Logo

const inp = { padding: "8px 12px", borderRadius: 8, border: "1px solid #1a2540", background: "#050810", color: "#dde6f0", fontSize: 12, outline: "none" };

// --- MINI BARCODE GENERATOR FOR PDF TABLES ---
function getMiniBarcode(code) {
  const { bars } = buildUPCEBars(code || "000000");
  const X = 1.2; let x = 0; let rects = "";
  bars.forEach(b => { if (b.dark) rects += `<rect x="${x.toFixed(2)}" y="0" width="${(b.u*X).toFixed(2)}" height="18" fill="#000"/>`; x += b.u * X; });
  return `<svg width="${x.toFixed(1)}" height="18">${rects}</svg>`;
}

export default function Report({ txns }) {
  const [dateRange, setDateRange] = useState({ start: today, end: today });
  const [reportType, setReportType] = useState("daily");
  const [filterGlass, setFilterGlass] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const setDatePreset = (type) => {
    setReportType(type);
    const d = new Date();
    if (type === "daily") setDateRange({ start: today, end: today });
    if (type === "monthly") {
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      setDateRange({ start, end });
    }
    if (type === "yearly") {
      const start = new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0];
      const end = new Date(d.getFullYear(), 11, 31).toISOString().split('T')[0];
      setDateRange({ start, end });
    }
  };

  // --- THE ENTERPRISE FINANCIAL ENGINE ---
  const reportData = useMemo(() => {
    if (!txns || txns.length === 0) return null;

    // 🚀 1. Data Normalizer (Bridges C# Backend format to React UI format)
    const normalizedTxns = (txns || []).map(t => {
      const dt = t.timestamp ? new Date(t.timestamp) : new Date();
      return {
        ...t,
        date: t.date || dt.toISOString().split('T')[0],
        time: t.time || dt.toTimeString().split(' ')[0].substring(0,5),
        glassType: t.glassType || t.glassTypeId, 
        add: t.add || "N/A"
      };
    });

    const costMap = {};
    normalizedTxns.forEach(t => {
      if (t.direction === "in" && (t.subtype === "purchase" || t.subtype === "import")) {
        if (!costMap[t.barcode]) costMap[t.barcode] = { qty: 0, cost: 0 };
        costMap[t.barcode].qty += t.qty;
        costMap[t.barcode].cost += t.totalPrice;
      }
    });
    
    const getAvgCost = (bc) => costMap[bc] && costMap[bc].qty > 0 ? costMap[bc].cost / costMap[bc].qty : 0;

    const filteredTxns = normalizedTxns.filter(t => {
      const matchDate = t.date >= dateRange.start && t.date <= dateRange.end;
      const matchGlass = filterGlass === "all" || t.glassType === filterGlass;
      const matchType = filterType === "all" || t.subtype === filterType;
      return matchDate && matchGlass && matchType;
    });

    let sumImport = 0, sumPurchase = 0, sumSale = 0, sumUse = 0, sumBroken = 0;
    let revSales = 0, costPurchases = 0;
    let totalCogs = 0, totalUseLoss = 0, totalBrokenLoss = 0;
    const glassPL = {};
    const comboPL = {};

    filteredTxns.forEach(t => {
      if (t.subtype === "import") sumImport += t.qty;
      if (t.subtype === "purchase") { sumPurchase += t.qty; costPurchases += t.totalPrice; }
      if (t.subtype === "sale") { sumSale += t.qty; revSales += t.totalPrice; }
      if (t.subtype === "use") sumUse += t.qty;
      if (t.subtype === "broken") sumBroken += t.qty;

      const avgCost = getAvgCost(t.barcode);
      const isOut = t.direction === "out";
      
      if (!glassPL[t.glassType]) glassPL[t.glassType] = { name: t.glassName, rev: 0, qtySold: 0, cogs: 0, useLoss: 0, brokenLoss: 0 };
      const comboKey = `${t.glassName}|S${t.sph} C${t.cyl} ${t.add !== "N/A" ? "A"+t.add : ""}`;
      if (!comboPL[comboKey]) comboPL[comboKey] = { name: t.glassName, pwr: `S${t.sph} C${t.cyl}`, buyQty: 0, sellQty: 0, rev: 0, avgCost, cogs: 0 };

      if (t.direction === "in") comboPL[comboKey].buyQty += t.qty;
      if (isOut) {
        if (t.subtype === "sale") {
          const itemCogs = t.qty * avgCost;
          totalCogs += itemCogs;
          glassPL[t.glassType].rev += t.totalPrice; glassPL[t.glassType].cogs += itemCogs;
          comboPL[comboKey].sellQty += t.qty; comboPL[comboKey].rev += t.totalPrice; comboPL[comboKey].cogs += itemCogs;
        }
        if (t.subtype === "use") { const uLoss = t.qty * avgCost; totalUseLoss += uLoss; glassPL[t.glassType].useLoss += uLoss; }
        if (t.subtype === "broken") { const bLoss = t.qty * avgCost; totalBrokenLoss += bLoss; glassPL[t.glassType].brokenLoss += bLoss; }
      }
    });

    const grossProfit = revSales - totalCogs;
    const netProfit = grossProfit - totalUseLoss - totalBrokenLoss;
    const margin = revSales > 0 ? (netProfit / revSales) * 100 : 0;

    return {
      sumImport, sumPurchase, sumSale, sumUse, sumBroken, revSales, costPurchases,
      totalCogs, grossProfit, totalUseLoss, totalBrokenLoss, netProfit, margin,
      glassPL: Object.values(glassPL),
      comboPL: Object.values(comboPL).filter(c => c.sellQty > 0 || c.buyQty > 0),
      filteredTxns
    };
  }, [txns, dateRange, filterGlass, filterType]);

  // --- STATS HELPER ---
  const counts = {
    all: reportData?.filteredTxns?.length || 0,
    import: reportData?.filteredTxns?.filter(t => t.subtype === "import").length || 0,
    purchase: reportData?.filteredTxns?.filter(t => t.subtype === "purchase").length || 0,
    sale: reportData?.filteredTxns?.filter(t => t.subtype === "sale").length || 0,
    use: reportData?.filteredTxns?.filter(t => t.subtype === "use").length || 0,
    broken: reportData?.filteredTxns?.filter(t => t.subtype === "broken").length || 0,
  };

  // --- 📊 EXCEL / CSV EXPORT ENGINE ---
  const exportToCSV = () => {
    if (!reportData || reportData.filteredTxns.length === 0) return alert("এক্সপোর্ট করার জন্য কোনো তথ্য নেই!");

    const headers = ["তারিখ", "সময়", "ধরন", "গ্লাস", "এসপিএইচ (SPH)", "সিলিন্ডার (CYL)", "অ্যাড (ADD)", "বারকোড", "পরিমাণ", "একক মূল্য", "মোট মূল্য", "গ্রাহক/বিবরণ"];
    const rows = reportData.filteredTxns.map(tx => {
      const calcUnitPrice = tx.unitPrice > 0 ? tx.unitPrice : (tx.totalPrice > 0 && tx.qty > 0 ? tx.totalPrice / tx.qty : 0);
      return [
        tx.date, tx.time, SM[tx.subtype]?.label || tx.subtype, tx.glassName, tx.sph, tx.cyl, tx.add, tx.barcode,
        tx.direction === "in" ? tx.qty : -tx.qty,
        calcUnitPrice, tx.totalPrice || 0, (tx.customerName || tx.note || "—").replace(/,/g, " ")
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `OptiStock_Report_${dateRange.start}_to_${dateRange.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- ADVANCED PDF PRINT ENGINE ---
  const executePrint = (printMode) => {
    let printList = [];
    let titleStr = "সম্পূর্ণ রিপোর্ট";

    if (printMode === "all" || printMode === "grouped") {
      printList = reportData.filteredTxns;
    } else {
      printList = reportData.filteredTxns.filter(t => t.subtype === printMode);
      titleStr = `${SM[printMode]?.label || printMode} রিপোর্ট`;
    }

    if (printList.length === 0) return alert("প্রিন্ট করার জন্য কোনো তথ্য নেই!");

    let stIn = 0, stOut = 0, pRev = 0, pCost = 0;
    printList.forEach(t => {
      if (t.direction === "in") { stIn += t.qty; pCost += t.totalPrice || 0; }
      if (t.direction === "out") { 
        stOut += t.qty; 
        if(t.subtype === "sale" || t.subtype === "use") pRev += t.totalPrice || 0; 
      }
    });
    const pLoss = pRev - pCost; 

    const generateRows = (dataList) => {
      return dataList.map(t => {
        const sm = SM[t.subtype] || {};
        const cColor = sm.color || "#000";
        return `
          <tr>
            <td>${t.date}</td><td>${t.time}</td>
            <td><span class="pill" style="color:${cColor}; border-color:${cColor}55; background-color:${cColor}11;">${sm.label || t.subtype}</span></td>
            <td><strong>${t.glassName}</strong></td>
            <td style="font-family:monospace; font-weight:bold;">S${t.sph} C${t.cyl} ${t.add !== "N/A" ? `A${t.add}` : ""}</td>
            <td style="padding-top:6px;">${getMiniBarcode(t.barcode)}</td>
            <td style="font-family:monospace; font-size:9px; color:#0ea5e9;">${t.barcode}</td>
            <td style="font-weight:bold; color:${t.direction === "in" ? "#16a34a" : "#e11d48"}; font-size:13px;">${t.direction === "in" ? "+" : "-"}${t.qty}</td>
            <td>${t.unitPrice > 0 ? fmtTk(t.unitPrice) : "—"}</td>
            <td style="font-weight:bold;">${t.totalPrice > 0 ? fmtTk(t.totalPrice) : "—"}</td>
            <td style="font-size:10px; color:#475569;">${t.customerName || t.note || "—"}</td>
          </tr>
        `;
      }).join("");
    };

    let tableHtml = "";
    if (printMode === "grouped") {
      ["import", "purchase", "sale", "use", "broken"].forEach(type => {
        const typeList = printList.filter(t => t.subtype === type);
        if (typeList.length > 0) {
          tableHtml += `
            <h3 style="margin-top:30px; color:${SM[type]?.color}; border-bottom:2px solid ${SM[type]?.color}33; padding-bottom:5px;">${SM[type]?.label} (${typeList.length} টি)</h3>
            <table><thead><tr><th>তারিখ</th><th>সময়</th><th>ধরন</th><th>গ্লাস</th><th>প্রেসক্রিপশন</th><th>বারকোড</th><th>কোড</th><th>পরিমাণ</th><th>একক মূল্য</th><th>মোট মূল্য</th><th>গ্রাহক/বিবরণ</th></tr></thead><tbody>${generateRows(typeList)}</tbody></table>
          `;
        }
      });
    } else {
      tableHtml = `<table><thead><tr><th>তারিখ</th><th>সময়</th><th>ধরন</th><th>গ্লাস</th><th>প্রেসক্রিপশন</th><th>বারকোড</th><th>কোড</th><th>পরিমাণ</th><th>একক মূল্য</th><th>মোট মূল্য</th><th>গ্রাহক/বিবরণ</th></tr></thead><tbody>${generateRows(printList)}</tbody></table>`;
    }

    const html = `<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Report</title><style>
        body { font-family: 'Segoe UI', sans-serif; padding: 30px; color: #333; }
        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0ea5e9; padding-bottom: 10px; margin-bottom: 20px; }
        .stats-row { display: flex; justify-content: space-between; margin-bottom: 25px; }
        .stat-box { border-left: 3px solid #e2e8f0; padding-left: 15px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { border-bottom: 2px solid #cbd5e1; padding: 8px 5px; text-align: left; color: #64748b; font-size: 9px; }
        td { border-bottom: 1px solid #f1f5f9; padding: 10px 5px; vertical-align: middle; }
        .pill { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: bold; border: 1px solid; }
        .footer { margin-top: 40px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        @media print { @page { size: landscape; margin: 10mm; } }
      </style></head><body>
      <div class="header"><div><h1>OptiStock PRO <span>v6</span></h1><p>চশমার গ্লাস ম্যানেজমেন্ট সিস্টেম</p></div><div class="header-right"><h2>${titleStr}</h2><p>পরিসর: ${dateRange.start} → ${dateRange.end}</p></div></div>
      <div class="stats-row">
        <div class="stat-box" style="border-color: #22c55e;"><h3 style="color:#16a34a">${stIn}</h3><p>স্টক ইন</p></div>
        <div class="stat-box" style="border-color: #ef4444;"><h3 style="color:#dc2626">${stOut}</h3><p>স্টক আউট</p></div>
        <div class="stat-box" style="border-color: #f59e0b;"><h3 style="color:#d97706">${fmtTk(pRev)}</h3><p>বিক্রয় আয়</p></div>
        <div class="stat-box" style="border-color: #3b82f6;"><h3 style="color:#2563eb">${fmtTk(pCost)}</h3><p>ক্রয় ব্যয়</p></div>
        <div class="stat-box" style="border-color: #8b5cf6;"><h3 style="color:${pLoss >= 0 ? '#16a34a' : '#dc2626'}">${fmtTk(Math.abs(pLoss))}</h3><p>${pLoss >= 0 ? 'লাভ' : 'ক্ষতি'}</p></div>
      </div>
      ${tableHtml}
      <div class="footer"><div>OptiStock PRO v6 — A <span style="font-weight:bold; color:#0ea5e9;">QUANTUM</span> Project</div><div>মোট ${printList.length} টি রেকর্ড</div></div>
      <script>window.onload = function() { window.print(); }</script></body></html>`;
    
    const win = window.open("", "_blank"); win.document.write(html); win.document.close();
  };

  // 🚀 SHOW SKELETON LOADERS WHILE DATA IS EMPTY
  if (!reportData) {
    return (
      <div className="space-y-6 pb-10">
        <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-5 shadow-xl"><Skeleton className="h-20 w-full rounded-xl opacity-20" /></div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">{[...Array(7)].map((_, i) => <CardSkeleton key={i} />)}</div>
        <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-5 shadow-xl"><Skeleton className="h-64 w-full rounded-xl opacity-10" /></div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 pb-10">
      
      {/* --- 1. FILTER CONTROLS --- */}
      <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-5 shadow-xl">
        <h3 className="text-[10px] text-[#4a5a70] uppercase font-black tracking-widest mb-4 flex items-center gap-2"><span>◎</span> রিপোর্টের ধরন</h3>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex bg-[#050810] border border-[#1a2540] rounded-lg overflow-hidden">
            {[{id:"daily", l:"দৈনিক", i:"🗓️"}, {id:"monthly", l:"মাসিক", i:"📅"}, {id:"yearly", l:"বার্ষিক", i:"📊"}, {id:"custom", l:"কাস্টম", i:"🔎"}].map(btn => (
              <button key={btn.id} onClick={() => setDatePreset(btn.id)} className={`px-4 py-2 text-xs font-bold transition-colors ${reportType === btn.id ? "bg-[#1a3a5c] text-[#22d3ee]" : "text-[#4a5a70] hover:text-[#dde6f0]"}`}>{btn.i} {btn.l}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-[#050810] border border-[#1a2540] px-3 py-1.5 rounded-lg">
            <span className="text-xs text-[#22d3ee]">🗓️</span>
            <input type="date" value={dateRange.start} onChange={e => {setDateRange({...dateRange, start: e.target.value}); setReportType("custom");}} className="bg-transparent text-[#dde6f0] text-xs outline-none font-mono" />
            <span className="text-[#4a5a70]">—</span>
            <input type="date" value={dateRange.end} onChange={e => {setDateRange({...dateRange, end: e.target.value}); setReportType("custom");}} className="bg-transparent text-[#dde6f0] text-xs outline-none font-mono" />
          </div>
        </div>
        <div className="flex gap-4">
          <div><label className="block text-[9px] text-[#4a5a70] font-bold mb-1">গ্লাস টাইপ</label><select value={filterGlass} onChange={e => setFilterGlass(e.target.value)} style={inp} className="w-48"><option value="all">সব গ্লাস</option>{GLASS_TYPES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
          <div><label className="block text-[9px] text-[#4a5a70] font-bold mb-1">লেনদেনের ধরন</label><select value={filterType} onChange={e => setFilterType(e.target.value)} style={inp} className="w-48"><option value="all">সব ধরন</option><option value="purchase">ক্রয়</option><option value="sale">পাইকারি বিক্রয়</option><option value="use">খুচরা বিক্রয়</option></select></div>
        </div>
      </div>

      {/* --- 2. TOP SUMMARY METRICS --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { l: "আমদানি", v: reportData.sumImport, i: "🚢", c: "#22d3ee" },
          { l: "ক্রয়", v: reportData.sumPurchase, i: "🛒", c: "#4ade80" },
          { l: "পাইকারি বিক্রয়", v: reportData.sumSale, i: "💰", c: "#fb923c" },
          { l: "খুচরা বিক্রয়", v: reportData.sumUse, i: "🏪", c: "#f472b6" },
          { l: "ভাঙা", v: reportData.sumBroken, i: "💔", c: "#e879f9" },
          { l: "মোট বিক্রয় আয়", v: fmtTk(reportData.revSales), i: "💵", c: "#fbbf24", tk:true },
          { l: "ক্রয় ব্যয়", v: fmtTk(reportData.costPurchases), i: "📄", c: "#38bdf8", tk:true }
        ].map((c, i) => (
          <div key={i} className="bg-[#0f1424] border border-[#1a2540] rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-1 w-full" style={{background: `linear-gradient(90deg, transparent, ${c.c})`, opacity:0.3}}></div>
            <div className="text-xl mb-2 opacity-80">{c.i}</div>
            <div><div className={`font-black ${c.tk ? "text-base" : "text-3xl"} font-mono`} style={{color: c.c}}>{c.v}</div><div className="text-[9px] text-[#4a5a70] uppercase font-bold mt-1">{c.l}</div></div>
          </div>
        ))}
      </div>

      {/* --- 3. P&L ANALYSIS --- */}
      <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-black text-[#e8f4ff] mb-4 flex items-center gap-2"><span>📊</span> লাভ/ক্ষতি বিশ্লেষণ</h3>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-[#050810] border border-[#1a2540] p-4 rounded-xl"><div className="text-sm mb-1">💰</div><div className="text-lg font-mono font-black text-[#4ade80]">{fmtTk(reportData.revSales)}</div><div className="text-[8px] text-[#4a5a70] font-bold">মোট বিক্রয় আয়</div></div>
          <div className="bg-[#050810] border border-[#1a2540] p-4 rounded-xl"><div className="text-sm mb-1">📄</div><div className="text-lg font-mono font-black text-[#fbbf24]">{fmtTk(reportData.totalCogs)}</div><div className="text-[8px] text-[#4a5a70] font-bold">COGS</div></div>
          <div className="bg-[#050810] border border-[#1a2540] p-4 rounded-xl"><div className="text-sm mb-1">📈</div><div className="text-lg font-mono font-black text-[#22d3ee]">{fmtTk(reportData.grossProfit)}</div><div className="text-[8px] text-[#4a5a70] font-bold">গ্রস মুনাফা</div></div>
          <div className="bg-[#050810] border border-[#1a2540] p-4 rounded-xl"><div className="text-sm mb-1">🔧</div><div className="text-lg font-mono font-black text-[#fb923c]">- {fmtTk(reportData.totalUseLoss)}</div><div className="text-[8px] text-[#4a5a70] font-bold">ব্যবহারে ক্ষতি</div></div>
          <div className="bg-[#050810] border border-[#1a2540] p-4 rounded-xl"><div className="text-sm mb-1">💔</div><div className="text-lg font-mono font-black text-[#f87171]">- {fmtTk(reportData.totalBrokenLoss)}</div><div className="text-[8px] text-[#4a5a70] font-bold">ভাঙায় ক্ষতি</div></div>
          <div className="bg-[#1a2540] border border-[#2a3a5c] p-4 rounded-xl relative overflow-hidden"><div className="text-sm mb-1">❌</div><div className={`text-xl font-mono font-black ${reportData.netProfit >= 0 ? "text-[#4ade80]" : "text-[#f87171]"}`}>{reportData.netProfit >= 0 ? "" : "-"}{fmtTk(Math.abs(reportData.netProfit))}</div><div className="text-[8px] text-[#94a3b8] font-bold">নিট লাভ/ক্ষতি</div></div>
        </div>
        <div className="mb-6">
          <div className="flex justify-between text-[10px] text-[#4a5a70] font-bold mb-2"><span>গ্রস প্রফিট মার্জিন</span><span className="text-[#fbbf24] font-black text-sm">{reportData.margin.toFixed(1)}%</span></div>
          <div className="w-full bg-[#050810] rounded-full h-2 overflow-hidden border border-[#1a2540]"><div className="h-full bg-gradient-to-r from-[#fb923c] to-[#fbbf24] rounded-full transition-all duration-1000" style={{width: `${Math.max(0, Math.min(100, reportData.margin))}%`}}></div></div>
          <div className="flex justify-between text-[8px] text-[#4a5a70] mt-1 font-mono"><span>0%</span><span>লক্ষ্য: ২০%</span><span>100%</span></div>
        </div>
      </div>

      {/* --- 4. REPORT EXPORT UI --- */}
      <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <h3 className="text-base font-black text-[#e8f4ff] mb-6 flex items-center gap-2">📄 রিপোর্ট এক্সপোর্ট</h3>
        <div className="mb-6">
          <div className="text-[10px] text-[#4a5a70] font-bold uppercase tracking-widest mb-3"><span>▸</span> একসাথে সব ধরন</div>
          <div className="flex flex-wrap gap-4">
            <button onClick={() => executePrint("all")} className="bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] text-white px-6 py-3 rounded-lg font-black tracking-widest shadow-lg hover:opacity-90 active:scale-95 transition-all text-xs flex items-center gap-2">📄 সম্পূর্ণ রিপোর্ট PDF</button>
            <button onClick={() => executePrint("grouped")} className="bg-[#050810] border border-[#1a2540] text-[#fbbf24] px-6 py-3 rounded-lg font-black tracking-widest hover:bg-[#fbbf24]/10 transition-all text-xs flex items-center gap-2">📂 সব ধরন আলাদাভাবে (PDF)</button>
            <button onClick={exportToCSV} className="bg-gradient-to-r from-[#16a34a] to-[#22c55e] text-white px-6 py-3 rounded-lg font-black tracking-widest shadow-lg hover:opacity-90 active:scale-95 transition-all text-xs lg:ml-auto flex items-center gap-2">📊 এক্সেল (CSV) ডাউনলোড</button>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#4a5a70] font-bold uppercase tracking-widest mb-3"><span>▸</span> আলাদা ধরন অনুযায়ী</div>
          <div className="flex flex-wrap gap-3">
            {["import", "purchase", "sale", "use", "broken"].map(id => (
              <button key={id} onClick={() => executePrint(id)} disabled={counts[id] === 0} className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-xs font-bold ${counts[id] > 0 ? `bg-[#0a0e1a] border-[#1a3a5c] text-[#dde6f0] hover:bg-[#1a2540] cursor-pointer` : `bg-[#050810] opacity-50 cursor-not-allowed`}`}>{SM[id]?.icon} {SM[id]?.label} ({counts[id]})</button>
            ))}
          </div>
        </div>
      </div>

      {/* --- 5. TRANSACTION LEDGER --- */}
      <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-5 shadow-xl">
        <h3 className="text-xs font-black text-[#4a5a70] mb-4 uppercase tracking-widest">মোট {counts.all} টি লেনদেন (Ledger)</h3>
        <div className="overflow-x-auto border border-[#1a2540] rounded-xl max-h-[500px] custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#060f1e] border-b-2 border-[#1a3a5c] sticky top-0 z-10">
              <tr><th className="p-3 text-[10px] font-black text-[#2a5a80] uppercase">তারিখ</th><th className="p-3 text-[10px] font-black text-[#2a5a80] uppercase">সময়</th><th className="p-3 text-[10px] font-black text-[#2a5a80] uppercase">ধরন</th><th className="p-3 text-[10px] font-black text-[#2a5a80] uppercase">গ্লাস</th><th className="p-3 text-[10px] font-black text-[#2a5a80] uppercase">প্রেসক্রিপশন</th><th className="p-3 text-[10px] font-black text-[#2a5a80] uppercase text-center">পরিমাণ</th><th className="p-3 text-[10px] font-black text-[#2a5a80] uppercase">একক মূল্য</th><th className="p-3 text-[10px] font-black text-[#2a5a80] uppercase">মোট</th><th className="p-3 text-[10px] font-black text-[#2a5a80] uppercase">গ্রাহক/বিবরণ</th></tr>
            </thead>
            <tbody>
              {reportData.filteredTxns.length === 0 ? <tr><td colSpan="10" className="p-6 text-center text-[#4a5a70] italic">কোনো লেনদেন নেই</td></tr> :
                reportData.filteredTxns.map((tx) => {
                  const sm = SM[tx.subtype]||{};
                  return (
                    <tr key={tx.id} className="border-b border-[#1a2540] hover:bg-[#1a2540]/30 transition-colors bg-[#050810]">
                      <td className="p-3 font-mono text-[#94a3b8]">{tx.date}</td><td className="p-3 font-mono text-[#64748b]">{tx.time}</td>
                      <td className="p-3"><span style={{background:(sm.color||"#fff")+"22", color:sm.color||"#fff"}} className="text-[9px] font-black px-2 py-0.5 rounded border border-current">{sm.icon} {sm.label}</span></td>
                      <td className="p-3 font-bold text-[#dde6f0]">{tx.glassName}</td>
                      <td className="p-3 font-mono font-bold text-[#22d3ee]"><span className="text-[#f472b6]">S</span>{tx.sph} <span className="text-[#a3e635] ml-1">C</span>{tx.cyl} {tx.add !== "N/A" && <span className="text-[#c084fc] ml-1">A{tx.add}</span>}</td>
                      <td className={`p-3 text-center font-mono font-black text-sm ${tx.direction === "in" ? "text-[#4ade80]" : "text-[#f87171]"}`}>{tx.direction === "in" ? "+" : "-"}{tx.qty}</td>
                      <td className="p-3 font-mono text-[#64748b]">{tx.unitPrice > 0 ? fmtTk(tx.unitPrice) : "—"}</td>
                      <td className="p-3 font-mono font-bold text-[#fbbf24]">{tx.totalPrice > 0 ? fmtTk(tx.totalPrice) : "—"}</td>
                      <td className="p-3 text-[10px] text-[#94a3b8]">{tx.customerName || tx.note || "—"}</td>
                    </tr>
                  )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- A QUANTUM PROJECT BRANDING --- */}
      <div className="pt-10 border-t border-[#1a2540] flex items-center justify-center gap-4 opacity-40">
        <OptiLogo className="w-6 h-6 grayscale" />
        <div className="text-[10px] font-black text-[#4a5568] uppercase tracking-[0.4em]">A <span className="text-[#0ea5e9]">QUANTUM</span> Project</div>
      </div>

    </div>
  );
}