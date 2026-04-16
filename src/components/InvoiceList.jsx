// src/components/InvoiceList.jsx
import React, { useMemo } from "react";
import { C, fmtTk, buildUPCEBars, SM } from "../utils/constants";
import { useToast } from "./ToastContext"; 
import { OptiLogo } from "./Icons"; 
import Skeleton from "./Skeleton";

// --- SVG BARCODE GENERATOR ---
function upceSVGString(code, height=58, showText=true) {
  const { bars, digits } = buildUPCEBars(code || "000000");
  const quietUnits = 7; const X = 2; const W = (bars.reduce((s,b)=>s+b.u, 0) + quietUnits*2) * X;
  let x = quietUnits * X; let rects = "";
  bars.forEach((b, i) => { if (b.dark) rects += `<rect x="${x.toFixed(2)}" y="2" width="${Math.max(b.u*X,0.8).toFixed(2)}" height="${(i<3||i>=bars.length-6)?height-12:height-19}" fill="#000"/>`; x += b.u * X; });
  
  let textElements = "";
  if(showText) {
      const numStr = digits.join("");
      textElements = `
        <text x="${quietUnits*X-2}" y="${height-2}" text-anchor="end" font-size="9" font-family="monospace" fill="#000">0</text>
        <text x="${(quietUnits+3)*X}" y="${height-2}" font-size="10" font-family="monospace" fill="#000" letter-spacing="4">${numStr.slice(0,3)}</text>
        <text x="${(quietUnits+24)*X}" y="${height-2}" font-size="10" font-family="monospace" fill="#000" letter-spacing="4">${numStr.slice(3,6)}</text>
        <text x="${x+2}" y="${height-2}" font-size="9" font-family="monospace" fill="#000">1</text>
      `;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(1)}" height="${height}"><rect width="${W.toFixed(1)}" height="${height}" fill="#fff"/>${rects}${textElements}</svg>`;
}

export default function InvoiceList({ txns }) {
  const toast = useToast();
  
  const sales = useMemo(() => {
    if (!txns) return null; 
    
    return txns
      .map(t => {
        const dt = t.timestamp ? new Date(t.timestamp) : new Date();
        return {
          ...t,
          id: t.id || t.Id || Math.random().toString(), 
          date: t.date || dt.toISOString().split('T')[0],
          time: t.time || dt.toTimeString().split(' ')[0].substring(0,5),
          add: t.add || "N/A",
          invoiceNo: t.invoiceNo || "INV-0000",
          barcode: t.barcode || "000000"
        };
      })
      .filter(t => t.subtype === "sale" || t.subtype === "use")
      .sort((a, b) => {
        const timeA = new Date(a.timestamp || `${a.date}T${a.time}`).getTime();
        const timeB = new Date(b.timestamp || `${b.date}T${b.time}`).getTime();
        return timeB - timeA; 
      });
  }, [txns]);

  // --- ORIGINAL WORKING PRINT ENGINE RESTORED ---
  const printInvoice = (tx) => {
    const bcProduct = upceSVGString(tx.barcode, 50, true);
    const bcInvoice = upceSVGString(tx.invoiceNo, 50, true);
    
    const cName = tx.customerName && tx.customerName.trim() !== "" ? tx.customerName : "সাধারণ গ্রাহক";
    const subLabel = SM[tx.subtype]?.label || "বিক্রয়";
    
    const html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset='UTF-8'>
      <title>Invoice ${tx.invoiceNo}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #38bdf8; padding-bottom: 10px; margin-bottom: 20px; }
        .logo { display: flex; align-items: center; gap: 10px; }
        .logo h1 { margin: 0; color: #0284c7; font-size: 26px; }
        .logo span { font-size: 14px; color: #64748b; font-weight: normal; }
        .logo p { margin: 2px 0 0 0; font-size: 11px; color: #94a3b8; }
        .inv-details { text-align: right; }
        .inv-details h2 { margin: 0; color: #0284c7; font-size: 20px; }
        .inv-details p { margin: 5px 0 0 0; font-size: 11px; color: #64748b; font-weight: bold; }
        .pill { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; border: 1px solid #fca5a5; color: #e11d48; margin-top: 5px; }
        
        .customer { margin-bottom: 20px; }
        .customer p { font-size: 11px; color: #64748b; margin: 0 0 2px 0; font-weight: bold; }
        .customer h3 { font-size: 18px; margin: 0; color: #1e293b; display: flex; align-items: center; gap: 5px; }
        
        .barcodes { display: flex; gap: 40px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px 20px; margin-bottom: 30px; justify-content: flex-start; }
        .bc-box { text-align: center; }
        .bc-box span { display: block; font-size: 10px; color: #64748b; margin-bottom: 5px; font-weight: bold; letter-spacing: 1px; }
        .bc-box div.text { font-family: monospace; font-size: 9px; color: #475569; margin-top: 3px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { border-bottom: 2px solid #e2e8f0; padding: 10px; text-align: left; font-size: 12px; color: #94a3b8; font-weight: normal; }
        td { padding: 15px 10px; border-bottom: 1px solid #f1f5f9; font-size: 14px; font-weight: bold; color: #1e293b; }
        
        .totals { width: 300px; margin-left: auto; }
        .tot-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9; }
        .tot-row.discount { color: #22c55e; }
        .tot-row.grand { font-size: 16px; color: #1e293b; border-bottom: none; border-top: 1px solid #cbd5e1; padding-top: 10px; margin-top: 5px; }
        
        .signatures { display: flex; justify-content: space-between; margin-top: 80px; font-size: 11px; color: #64748b; }
        .sig-line { border-top: 1px solid #cbd5e1; width: 150px; text-align: center; padding-top: 8px; }
        .footer { margin-top: 30px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; align-items: flex-end; }
      </style>
    </head>
    <body>
      
      <div class="header">
        <div class="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
          <div>
            <h1>OptiStock PRO <span>v6</span></h1>
            <p>চশমার গ্লাস ম্যানেজমেন্ট</p>
          </div>
        </div>
        <div class="inv-details">
          <h2>ইনভয়েস # ${tx.invoiceNo}</h2>
          <p>${tx.date} | ${tx.time}</p>
          <div class="pill">${subLabel}</div>
        </div>
      </div>
      
      <div class="customer">
        <p>গ্রাহক</p>
        <h3>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          ${cName}
        </h3>
      </div>
      
      <div class="barcodes">
        <div class="bc-box">
          <span>পণ্য বারকোড</span>
          ${bcProduct}
          <div class="text">${tx.barcode}</div>
        </div>
        <div class="bc-box">
          <span>ইনভয়েস বারকোড</span>
          ${bcInvoice}
          <div class="text">${tx.invoiceNo}</div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>গ্লাস</th>
            <th>প্রেসক্রিপশন</th>
            <th>পরিমাণ</th>
            <th>একক মূল্য</th>
            <th style="text-align:right;">মোট মূল্য</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong style="font-size:15px;">${tx.glassName || "Unknown"}</strong>
              <div style="font-size:11px;color:#64748b;margin-top:2px;">${tx.glassDesign ? tx.glassDesign.replace("_", " ").toUpperCase() : ""}</div>
            </td>
            <td style="font-family:monospace;font-size:13px;">
              <span style="color:#e11d48">S</span>${tx.sph} <span style="color:#16a34a;margin-left:5px;">C</span>${tx.cyl} ${tx.add!=="N/A"?"<span style='color:#9333ea;margin-left:5px;'>A</span>"+tx.add:""}
            </td>
            <td style="font-size:14px;">${tx.qty} পিস</td>
            <td style="font-size:14px;">${fmtTk(tx.unitPrice || 0)}</td>
            <td style="text-align:right;font-size:15px;color:#000;">${fmtTk(tx.totalPrice || 0)}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="totals">
        <div class="tot-row">
          <span>উপমোট</span>
          <span>${fmtTk(tx.totalPrice || 0)}</span>
        </div>
        <div class="tot-row discount">
          <span>ডিসকাউন্ট</span>
          <span>৳0.00</span>
        </div>
        <div class="tot-row grand">
          <span>সর্বমোট</span>
          <span>${fmtTk(tx.totalPrice || 0)}</span>
        </div>
      </div>
      
      <div class="signatures">
        <div class="sig-line">ক্রেতার স্বাক্ষর</div>
        <div class="sig-line">বিক্রেতার স্বাক্ষর</div>
      </div>
      
      <div class="footer">
        <div>ধন্যবাদ আমাদের সাথে কেনাকাটার জন্য!</div>
        <div style="text-align: right;">
           <strong style="color:#1e293b;">OptiStock PRO v6</strong><br/>
           <span style="font-size:8px; color:#94a3b8; letter-spacing:1.5px; font-weight:bold;">A <span style="color:#0ea5e9;">QUANTUM</span> PROJECT</span>
        </div>
      </div>
      
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>`;
    
    const win = window.open("", "_blank"); 
    win.document.write(html); 
    win.document.close();
  };

  if (!sales) {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-500 pb-10">
        <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-6 shadow-2xl min-h-[600px]">
          <Skeleton className="h-8 w-64 mb-8 opacity-20" />
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl opacity-10" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 pb-10">
      <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-6 shadow-2xl min-h-[600px] flex flex-col justify-between">
        
        <div>
          <h2 className="text-lg font-black text-[#22d3ee] mb-6 flex items-center gap-2"><span>🧾</span> ইনভয়েস তালিকা (Sales & Receipts)</h2>
          
          {sales.length === 0 ? (
            <div className="text-center py-32 border-2 border-dashed border-[#1a2540] rounded-2xl bg-[#060f1e]/50">
              <div className="text-5xl mb-4 opacity-30">🧾</div>
              <div className="text-[#c8dff0] font-black text-lg mb-2">কোনো ইনভয়েস পাওয়া যায়নি</div>
              <div className="text-sm text-[#4a5a70]">স্টক আউট (খুচরা বা পাইকারি) করলে এখানে স্বয়ংক্রিয়ভাবে ইনভয়েস তৈরি হবে।</div>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#1a2540] rounded-2xl custom-scrollbar max-h-[600px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#0a1526] z-10 shadow-md">
                  <tr className="border-b-2 border-[#1a3a5c]">
                    <th className="p-4 text-[10px] font-black text-[#22d3ee] uppercase tracking-widest whitespace-nowrap">ইনভয়েস নং</th>
                    <th className="p-4 text-[10px] font-black text-[#22d3ee] uppercase tracking-widest">তারিখ ও সময়</th>
                    <th className="p-4 text-[10px] font-black text-[#22d3ee] uppercase tracking-widest">গ্রাহক</th>
                    <th className="p-4 text-[10px] font-black text-[#22d3ee] uppercase tracking-widest">লেন্স ও পাওয়ার</th>
                    <th className="p-4 text-[10px] font-black text-[#22d3ee] uppercase tracking-widest text-center">পরিমাণ</th>
                    <th className="p-4 text-[10px] font-black text-[#22d3ee] uppercase tracking-widest text-right">মোট মূল্য</th>
                    <th className="p-4 text-[10px] font-black text-[#22d3ee] uppercase tracking-widest text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((tx, i) => (
                    <tr key={tx.id} className={`border-b border-[#1a2540] hover:bg-[#0f1828] transition-colors ${i%2===0 ? 'bg-transparent' : 'bg-[#050810]'}`}>
                      <td className="p-4 font-mono text-sm font-bold text-[#c8dff0]">{tx.invoiceNo}</td>
                      <td className="p-4">
                        <div className="text-xs text-[#dde6f0] font-bold">{tx.date}</div>
                        <div className="text-[10px] text-[#4a5a70]">{tx.time}</div>
                      </td>
                      <td className="p-4 text-xs font-bold text-[#c8dff0]">
                        {tx.customerName || "সাধারণ গ্রাহক"}
                      </td>
                      <td className="p-4">
                        <div className="text-xs font-bold text-[#dde6f0]">{tx.glassName}</div>
                        <div className="text-[10px] font-mono text-[#4a5568] mt-1">
                          <span className="text-[#f472b6]">S</span>{tx.sph} <span className="text-[#a3e635] ml-1">C</span>{tx.cyl} {tx.add !== "N/A" && <span className="text-[#c084fc] ml-1">A{tx.add}</span>}
                        </div>
                      </td>
                      <td className="p-4 font-mono font-black text-[#4ade80] text-center text-lg">{tx.qty}</td>
                      <td className="p-4 text-right font-bold text-[#fbbf24] text-sm">{fmtTk(tx.totalPrice || 0)}</td>
                      <td className="p-4 text-center">
                        <button onClick={() => printInvoice(tx)} className="bg-[#0ea5e9]/10 border border-[#0ea5e9]/30 text-[#0ea5e9] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#0ea5e9] hover:text-[#0f1424] transition-all cursor-pointer shadow-lg active:scale-95 whitespace-nowrap">
                          🖨️ প্রিন্ট করুন
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* --- STANDARDIZED A QUANTUM PROJECT BRANDING --- */}
        <div className="pt-10 border-t border-[#1a2540] flex items-center justify-center gap-4 opacity-40 mt-8">
          <OptiLogo className="w-6 h-6 grayscale" />
          <div className="text-[10px] font-black text-[#4a5568] uppercase tracking-[0.4em]">
            A <span className="text-[#0ea5e9]">QUANTUM</span> Project
          </div>
        </div>

      </div>
    </div>
  );
}