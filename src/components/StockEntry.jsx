// src/components/StockEntry.jsx
import React, { useState, useMemo, useEffect } from "react";
import { 
  IN_SUB, OUT_SUB, SM, SPH_LIST, CYL_LIST, ADD_LIST,
  C, makeKey, genBC, fmtTk, buildUPCEBars, CATEGORIES
} from "../utils/constants";
import { useToast } from "./ToastContext"; 
import Skeleton from "./Skeleton"; 
import { OptiLogo } from "./Icons"; 

const inp = {width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid var(--border-color)",background:"var(--bg-main)",color:"var(--text-main)",fontSize:13,outline:"none",fontFamily:"inherit"};
const lbl = {fontSize:10,color:"var(--text-muted)",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:".7px",fontWeight:700};

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



const TXN_TYPES = [
  { id: "import", n: "আমদানি", icon: "🚢", type: "in", color: "#2dd4bf" },
  { id: "purchase", n: "ক্রয়", icon: "🛒", type: "in", color: "#4ade80" },
  { id: "sale", n: "পাইকারি", icon: "💰", type: "out", color: "#fb7185" },
  { id: "use", n: "খুচরা", icon: "🏪", type: "out", color: "#fb923c" }
];

export default function StockEntry({ authUser, stock, setStock, txns, setTxns }) {
  const toast = useToast();
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  const [form, setForm] = useState({
    subtype: "purchase", // Will also dictate direction
    material: "cr39", coating: "white", color: "clear", glassDesign: "single_vision",
    sph: "-1.50", cyl: "0.00", axis: "90", add: "0.00", qty: "1", unitPrice: "", note: "", customerName: "" 
  });

  const activeTxnType = TXN_TYPES.find(t => t.id === form.subtype) || TXN_TYPES[1];
  const direction = activeTxnType.type;

  const showAdd = ["progressive","bifocal_moon","bifocal_d"].includes(form.glassDesign);
  
  const hasCylVal = form.cyl && parseFloat(form.cyl) !== 0;
  const currentAxis = hasCylVal ? (parseInt(form.axis, 10) || 0) : 0;
  
  // Create a robust glass ID for the new model (temporarily using combined string)
  const syntheticGlassId = `${form.material}_${form.coating}_${form.color}`;
  
  const baseKey = makeKey(form.sph, form.cyl, showAdd ? form.add : "0.00", form.glassDesign);
  const entryKey = `${baseKey}_ax${currentAxis}`;
  
  const curStock = stock[syntheticGlassId]?.[entryKey] || 0;
  const unitPriceNum = parseFloat(form.unitPrice) || 0;
  const totalPrice = unitPriceNum * parseInt(form.qty || 1);

  const handleEntry = async () => {
    const qty = parseInt(form.qty);
    if (!qty || qty < 1) return toast.warning("সঠিক পরিমাণ দিন!");
    const isIn = direction === "in";
    if (!isIn && curStock < qty) return toast.error(`স্টক অপর্যাপ্ত! বর্তমানে আছে মাত্র ${curStock} পিস।`);

    // Get display names
    const mName = CATEGORIES.materials.find(m => m.id === form.material)?.n;
    const cName = CATEGORIES.coatings.find(c => c.id === form.coating)?.n;
    const clName = CATEGORIES.colors.find(c => c.id === form.color)?.n;
    const dName = CATEGORIES.designs.find(d => d.id === form.glassDesign)?.n;

    const syntheticGlassName = `${mName} - ${cName} - ${clName}`;
    const bc = genBC("XX", form.sph, form.cyl, showAdd ? form.add : "0.00", form.glassDesign);
    const invNo = !isIn ? "INV-" + Math.floor(1000 + Math.random() * 9000) : "";

    const newTransaction = {
      direction: direction,
      subtype: form.subtype,
      glassTypeId: syntheticGlassId, // Temporarily using combined ID
      glassName: syntheticGlassName, // e.g. "CR-39 - White - Clear"
      material: form.material, // FOR OPTION 2
      coating: form.coating,   // FOR OPTION 2
      color: form.color,       // FOR OPTION 2
      design: form.glassDesign, 
      sph: parseFloat(form.sph),
      cyl: parseFloat(form.cyl),
      axis: hasCylVal ? currentAxis : null,
      add: showAdd ? form.add : "0.00",
      qty: qty,
      unitPrice: unitPriceNum,
      totalPrice: totalPrice,
      barcode: bc, 
      customerName: form.customerName,
      invoiceNo: invNo 
    };

    try {
      const response = await fetch(`${API_URL}/api/Transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTransaction)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to submit transaction.");
      }

      const savedTxn = await response.json();

      toast.success("এন্ট্রি সফলভাবে সম্পন্ন হয়েছে!");
      setStock(prev => {
        const gStock = prev[syntheticGlassId] || {};
        return { ...prev, [syntheticGlassId]: { ...gStock, [entryKey]: (gStock[entryKey] || 0) + (isIn ? qty : -qty) } };
      });

      // Format time safely for the list
      const timestampDate = new Date(savedTxn.timestamp);
      setTxns(prev => [{
        ...savedTxn,
        date: timestampDate.toISOString().split('T')[0],
        time: timestampDate.toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }, ...prev]);
      
      setForm(f => ({ ...f, qty: "1", unitPrice: "", note: "", customerName: "" }));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const SectionTitle = ({ icon, text, color }) => (
    <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color }}>
      <span>{icon}</span> {text}
    </h3>
  );

  const OptionGrid = ({ items, selKey, cols = 2 }) => (
    <div className={`grid grid-cols-${cols} gap-2 mb-5`}>
      {items.map(item => {
        const isSel = form[selKey] === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setForm(p => ({ ...p, [selKey]: item.id }))}
            className="flex items-center gap-2 p-2 rounded-lg border text-left transition-all duration-200"
            style={{
              borderColor: isSel ? item.color : "var(--border-color)",
              background: isSel ? `${item.color}15` : "var(--bg-main)",
            }}
          >
            {item.icon && (
              <div className="flex-shrink-0 text-sm w-5 text-center">
                {item.icon}
              </div>
            )}
            <div>
              <div className="text-[11px] font-bold" style={{ color: isSel ? item.color : "var(--text-main)" }}>
                {item.n}
              </div>
              <div className="text-[9px]" style={{ color: isSel ? item.color : "var(--text-muted)" }}>
                {item.sub}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-10 pb-10">
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* LEFT: FORM SECTION */}
        <div className="lg:col-span-3 bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-color)] shadow-2xl">
          
          {/* TOP BUTTONS: ENTRY TYPE */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {TXN_TYPES.map(t => {
              const isSel = form.subtype === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setForm({ ...form, subtype: t.id })}
                  className="flex flex-col items-center justify-center py-3 rounded-xl border transition-all"
                  style={{
                    borderColor: isSel ? t.color : "var(--border-color)",
                    background: isSel ? `${t.color}15` : "var(--bg-main)",
                    color: isSel ? t.color : "var(--text-muted)",
                    boxShadow: isSel ? `0 0 15px ${t.color}20` : "none"
                  }}
                >
                  <div className="text-xl mb-1">{t.icon}</div>
                  <div className="text-xs font-bold">{t.n}</div>
                </button>
              );
            })}
          </div>

          {direction === "out" && (
            <div className="mb-6 animate-in slide-in-from-top-2">
              <div style={{...lbl, color:"#f472b6"}}>গ্রাহকের নাম (ঐচ্ছিক)</div>
              <input type="text" placeholder="গ্রাহকের নাম লিখুন..." value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} style={{...inp, border:"1px solid #f472b640"}} />
            </div>
          )}

          <div className="bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border-color)] mb-6">
            <SectionTitle icon="🧪" text="উপাদান (MATERIAL)" color="#34d399" />
            <OptionGrid items={CATEGORIES.materials} selKey="material" cols={2} />

            <SectionTitle icon="🎨" text="কোটিং (COATING)" color="#f472b6" />
            <OptionGrid items={CATEGORIES.coatings} selKey="coating" cols={2} />

            <SectionTitle icon="🌈" text="রং / টিন্ট (COLOR)" color="#38bdf8" />
            <OptionGrid items={CATEGORIES.colors} selKey="color" cols={3} />

            <SectionTitle icon="🔍" text="লেন্স ডিজাইন" color="#818cf8" />
            <OptionGrid items={CATEGORIES.designs} selKey="glassDesign" cols={2} />
          </div>

          <div className="bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border-color)] mb-6">
            <h3 className="text-[10px] font-black text-[#22d3ee] uppercase tracking-widest mb-4 flex items-center gap-2"><span>◈</span> প্রেসক্রিপশন পাওয়ার</h3>
            
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex-1 min-w-[130px]">
                <label style={{...lbl, color:"#f472b6"}}>SPH (SPHERE)</label>
                <select value={form.sph} onChange={e => setForm({...form, sph: e.target.value})} style={inp}>
                  <optgroup label="── মাইনাস ──">{SPH_LIST.filter(p=>p.value<0).reverse().map(p=><option key={p.label} value={p.label}>{p.label}</option>)}</optgroup>
                  <optgroup label="── প্লাস ──">{SPH_LIST.filter(p=>p.value>=0).map(p=><option key={p.label} value={p.label}>{p.label}</option>)}</optgroup>
                </select>
              </div>
              
              <div className="flex-1 min-w-[130px]">
                <label style={{...lbl, color:"#a3e635"}}>CYL (CYLINDER)</label>
                <select value={form.cyl} onChange={e => setForm({...form, cyl: e.target.value})} style={inp}>
                  {CYL_LIST.map(c => <option key={c.value} value={c.value===0?"0.00":c.value>0?"+"+c.value.toFixed(2):c.value.toFixed(2)}>{c.label}</option>)}
                </select>
              </div>
              
              <div className="flex-1 min-w-[130px]">
                <label style={{...lbl, color:"#38bdf8"}}>AXIS (ডিগ্রী 0-180)</label>
                <input 
                  type="number" 
                  min="0" 
                  max="180" 
                  placeholder="90" 
                  value={form.axis} 
                  onChange={e => setForm({...form, axis: e.target.value})} 
                  style={{...inp, opacity: !hasCylVal ? 0.4 : 1}} 
                  disabled={!hasCylVal}
                />
              </div>

              {showAdd && (
                <div className="flex-1 min-w-[130px] animate-in zoom-in duration-300">
                  <label style={{...lbl, color:"#c084fc"}}>ADD POWER</label>
                  <select 
                    value={form.add} 
                    onChange={e => setForm({...form, add: e.target.value})} 
                    style={{...inp, borderColor: "#c084fc40"}}
                  >
                    {ADD_LIST.map(a => <option key={a.value} value={a.value===0?"0.00":a.value>0?"+"+a.value.toFixed(2):a.value.toFixed(2)}>{a.label}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-color)] text-center">
               <div className="text-[8px] text-[var(--text-muted)] uppercase mb-2">বারকোড প্রিভিউ</div>
               <BarcodeStrip code={genBC("XX", form.sph, form.cyl, showAdd ? form.add : "0.00", form.glassDesign)} height={50} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div><div style={lbl}>পরিমাণ</div><input type="number" min="1" value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} style={inp} /></div>
            <div><div style={{...lbl, color: direction==="in" ? C.green : C.rose}}>{direction==="in" ? "ক্রয় মূল্য" : "বিক্রয় মূল্য"}</div><input type="number" placeholder="০.০০" value={form.unitPrice} onChange={e => setForm({...form, unitPrice: e.target.value})} style={inp} /></div>
            <div><div style={lbl}>মোট মূল্য</div><div style={{...inp, color: direction==="in" ? C.green : C.rose, fontWeight:"bold"}}>{fmtTk(totalPrice)}</div></div>
          </div>

          <button onClick={handleEntry} className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-white text-sm shadow-lg transition-all active:scale-95
            ${direction === "in" ? "bg-gradient-to-r from-[#16a34a] to-[#22c55e]" : "bg-gradient-to-r from-[#dc2626] to-[#f87171]"}`}>
            {activeTxnType.icon} {direction==="in" ? "স্টক ইন নিশ্চিত করুন" : "স্টক আউট নিশ্চিত করুন"}
          </button>
        </div>

        {/* RIGHT: RECENT TRANSACTIONS */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-color)] flex flex-col h-[850px]">
          <h3 className="text-xs font-black text-[#22d3ee] uppercase tracking-widest mb-6 flex items-center gap-2"><span>⏱</span> সাম্প্রতিক লেনদেন</h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
            {txns.length === 0 ? (
              <div className="opacity-50 text-center text-sm italic text-[var(--text-muted)] py-20">নতুন এন্ট্রি করলে এখানে দেখা যাবে...</div>
            ) : (
              txns.map((tx) => {
                 const tType = TXN_TYPES.find(t => t.id === tx.subtype) || { color: "#94a3b8", n: tx.subtype };
                 return (
                  <div key={tx.id} className="bg-[var(--bg-main)] border border-[var(--border-color)] p-4 rounded-xl flex justify-between items-center animate-in slide-in-from-right-4 duration-300">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{background:tType.color+"22", color:tType.color}} className="text-[10px] font-black px-2 py-0.5 rounded-md border border-current">{tType.n}</span>
                        <span className="text-xs font-bold text-[var(--text-main)]">{tx.glassName}</span>
                      </div>
                      <div className="text-[9px] font-mono text-[var(--text-muted)]">◫ {tx.barcode} {tx.axis !== null && tx.axis !== undefined ? `| Axis: ${tx.axis}°` : ""}</div>
                    </div>
                    <div className="text-right flex flex-col items-end justify-center">
                      <div className={`font-mono font-black text-lg ${tx.direction === "in" ? "text-[#4ade80]" : "text-[#f87171]"}`}>
                        {tx.direction === "in" ? "+" : "-"}{tx.qty}
                      </div>
                      <div className="text-[8px] text-[var(--text-muted)] font-mono mt-1 tracking-widest">{tx.time}</div>
                    </div>
                  </div>
                 )
              })
            )}
          </div>
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