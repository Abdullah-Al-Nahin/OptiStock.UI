// src/components/StockEntry.jsx
import React, { useState, useMemo, useEffect } from "react";
import { 
  IN_SUB, OUT_SUB, SM, SPH_LIST, CYL_LIST, ADD_LIST, 
  C, makeKey, genBC, fmtTk, today, buildUPCEBars
} from "../utils/constants";
import { useToast } from "./ToastContext"; 
import Skeleton from "./Skeleton"; 
import { OptiLogo } from "./Icons"; 

const inp = {width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #1a2540",background:"#0a0e1a",color:"#dde6f0",fontSize:13,outline:"none",fontFamily:"inherit"};
const lbl = {fontSize:10,color:"#4a5a70",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:".7px",fontWeight:700};

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
  {id:"single_vision", n:"সিঙ্গেল ভিশন"}, {id:"bifocal_moon", n:"মুন বাইফোকাল"}, 
  {id:"bifocal_d", n:"ডি-বাইফোকাল"}, {id:"progressive", n:"প্রগ্রেসিভ"}, 
  {id:"high_index", n:"হাই ইনডেক্স"}, {id:"polycarbonate", n:"পলিকার্বোনেট"}
];

export default function StockEntry({ authUser, stock, setStock, txns, setTxns }) {
  const toast = useToast();
  // Safe default for VITE API URL
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  const [form, setForm] = useState({
    direction: "in", subtype: "purchase", glassType: "", glassDesign: "single_vision",
    sph: "-1.50", cyl: "0.00", add: "0.00", qty: "1", unitPrice: "", note: "", customerName: "" 
  });

  const [dbGlassTypes, setDbGlassTypes] = useState([]);
  const [isLoadingGlasses, setIsLoadingGlasses] = useState(true);

  useEffect(() => {
    const fetchGlassTypes = async () => {
      try {
        const response = await fetch(`${API_URL}/api/GlassTypes`, {
            headers: { "Authorization": `Bearer ${authUser.token}` }
        });
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setDbGlassTypes(data);
        
        // Auto-select the first glass type if none is selected
        if (data.length > 0) {
            setForm(prev => ({ ...prev, glassType: data[0].id }));
        }
      } catch (err) {
        toast.error("গ্লাসের তথ্য লোড করা সম্ভব হয়নি!");
      } finally {
        setIsLoadingGlasses(false);
      }
    };
    fetchGlassTypes();
  }, [authUser.token, API_URL]);

  const showAdd = ["progressive","bifocal_moon","bifocal_d"].includes(form.glassDesign);
  const entryKey = makeKey(form.sph, form.cyl, showAdd ? form.add : "0.00", form.glassDesign);
  const curStock = stock[form.glassType]?.[entryKey] || 0;
  const unitPriceNum = parseFloat(form.unitPrice) || 0;
  const totalPrice = unitPriceNum * parseInt(form.qty || 1);

  const handleEntry = async () => {
    const qty = parseInt(form.qty);
    if (!qty || qty < 1) return toast.warning("সঠিক পরিমাণ দিন!");
    const isIn = form.direction === "in";
    if (!isIn && curStock < qty) return toast.error(`স্টক অপর্যাপ্ত! বর্তমানে আছে মাত্র ${curStock} পিস।`);

    const gt = dbGlassTypes.find(g => g.id === form.glassType);
    if (!gt) return toast.warning("গ্লাসের ডাটা লোড হচ্ছে, অপেক্ষা করুন।");

    const bc = genBC(gt.tag, form.sph, form.cyl, showAdd ? form.add : "0.00", form.glassDesign);
    const invNo = !isIn ? "INV-" + Math.floor(1000 + Math.random() * 9000) : "";

    const newTransaction = {
      direction: form.direction,
      subtype: form.subtype,
      glassTypeId: form.glassType, 
      glassName: gt.name,
      sph: parseFloat(form.sph),
      cyl: parseFloat(form.cyl),
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
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authUser.token}` 
        },
        body: JSON.stringify(newTransaction)
      });

      if (!response.ok) throw new Error("সার্ভারে ডাটা সেভ হতে সমস্যা হয়েছে!");

      toast.success("এন্ট্রি সফলভাবে সম্পন্ন হয়েছে!");
      setStock(prev => {
        const gStock = prev[form.glassType] || {};
        return { ...prev, [form.glassType]: { ...gStock, [entryKey]: (gStock[entryKey] || 0) + (isIn ? qty : -qty) } };
      });

      const timestamp = new Date().toISOString();
      setTxns(prev => [{
        ...newTransaction, 
        id: Date.now(), 
        timestamp,
        date: timestamp.split('T')[0],
        time: new Date().toLocaleTimeString("en-GB").substring(0, 5)
      }, ...prev]);
      
      setForm(f => ({ ...f, qty: "1", unitPrice: "", note: "", customerName: "" }));
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-10 pb-10">
      
      {/* MAIN TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* LEFT: FORM SECTION */}
        <div className="lg:col-span-3 bg-[#0f1424] p-6 rounded-2xl border border-[#1a2540] shadow-2xl">
          <h2 className="text-lg font-black text-[#22d3ee] mb-6 flex items-center gap-2">⊕ স্টক এন্ট্রি ফর্ম</h2>

          <div className="mb-6">
            <div style={lbl}>এন্ট্রির ধরন</div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {[{v:"in", l:"⬇ স্টক ইন", c:C.green}, {v:"out", l:"⬆ স্টক আউট", c:C.red}].map(d => (
                <button key={d.v} onClick={() => setForm({...form, direction: d.v, subtype: d.v==="in"?"purchase":"sale"})} 
                  style={{padding:"12px", borderRadius:"8px", border:`2px solid ${form.direction===d.v ? d.c : C.bdr}`, background: form.direction===d.v ? d.c+"14" : "transparent", color: form.direction===d.v ? d.c : C.muted, fontWeight: "bold", cursor:"pointer", transition: "all 0.2s"}}>
                  {d.l}
                </button>
              ))}
            </div>
            
            <div style={lbl}>{form.direction==="in" ? "ইনের ধরন" : "আউটের ধরন"}</div>
            <div className={`grid ${form.direction==="out" ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
              {(form.direction==="in" ? IN_SUB : OUT_SUB).map(st => {
                const sm = SM[st.id]; const isActive = form.subtype === st.id;
                return (
                  <button key={st.id} onClick={() => setForm({...form, subtype: st.id})} 
                    style={{padding:"10px", borderRadius:"8px", border:`2px solid ${isActive ? sm.color : C.bdr}`, background: isActive ? sm.color+"14" : "transparent", color: isActive ? sm.color : C.muted, cursor:"pointer", transition: "all 0.2s"}}>
                    <div className="text-xl mb-1">{sm.icon}</div>
                    <div className="text-[10px] font-bold">{sm.label}</div>
                  </button>
                );
              })}
            </div>

            {form.direction === "out" && (
              <div className="mt-5 animate-in slide-in-from-top-2">
                <div style={{...lbl, color:"#f472b6"}}>গ্রাহকের নাম (ঐচ্ছিক)</div>
                <input type="text" placeholder="গ্রাহকের নাম লিখুন..." value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} style={{...inp, border:"1px solid #f472b640"}} />
              </div>
            )}
          </div>

          <div className="bg-[#050810] p-4 rounded-xl border border-[#1a2540] mb-6">
            <h3 className="text-[10px] font-black text-[#22d3ee] uppercase tracking-widest mb-4">◈ লেন্স টাইপ নির্বাচন</h3>
            <div style={lbl}>কোটিং</div>
            {isLoadingGlasses ? (
              <div className="grid grid-cols-2 gap-3 mb-5">
                 <Skeleton className="h-14 w-full opacity-10" />
                 <Skeleton className="h-14 w-full opacity-10" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-5">
                {dbGlassTypes.map(g => (
                  <button key={g.id} onClick={() => setForm({...form, glassType: g.id})} style={{padding:"10px", borderRadius:"8px", border:`2px solid ${form.glassType===g.id ? g.accentColor : C.bdr}`, background: form.glassType===g.id ? g.accentColor+"14" : "#0a0e1a", textAlign:"left", display:"flex", gap:"10px", alignItems:"center", cursor:"pointer", transition: "all 0.2s"}}>
                    <div style={{width:10, height:10, borderRadius:"50%", background: g.accentColor}}/>
                    <div>
                      <div style={{fontSize:"11px", fontWeight:"bold", color: form.glassType===g.id ? g.accentColor : "#fff"}}>{g.name}</div>
                      <div style={{fontSize:"9px", color:C.txts}}>{g.subName}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div style={lbl}>লেন্স ডিজাইন</div>
            <div className="grid grid-cols-3 gap-3">
              {DESIGNS.map(d => (
                <button key={d.id} onClick={() => setForm({...form, glassDesign: d.id})} style={{padding:"8px", borderRadius:"8px", border:`2px solid ${form.glassDesign===d.id ? C.cyan : C.bdr}`, background: form.glassDesign===d.id ? "#07202e" : "#0a0e1a", color: form.glassDesign===d.id ? C.cyan : C.txt, fontSize:"10px", fontWeight:"bold", cursor:"pointer", transition: "all 0.2s"}}>
                  {d.n}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#050810] p-4 rounded-xl border border-[#1a2540] mb-6">
            <h3 className="text-[10px] font-black text-[#22d3ee] uppercase tracking-widest mb-4">◈ প্রেসক্রিপশন পাওয়ার</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><label style={{...lbl, color:"#f472b6"}}>SPH</label>
                <select value={form.sph} onChange={e => setForm({...form, sph: e.target.value})} style={inp}>
                  <optgroup label="── মাইনাস ──">{SPH_LIST.filter(p=>p.value<0).reverse().map(p=><option key={p.label} value={p.label}>{p.label}</option>)}</optgroup>
                  <optgroup label="── প্লাস ──">{SPH_LIST.filter(p=>p.value>=0).map(p=><option key={p.label} value={p.label}>{p.label}</option>)}</optgroup>
                </select>
              </div>
              <div><label style={{...lbl, color:"#a3e635"}}>CYL</label>
                <select value={form.cyl} onChange={e => setForm({...form, cyl: e.target.value})} style={inp}>{CYL_LIST.map(c => <option key={c.value} value={c.value===0?"0.00":c.value>0?"+"+c.value.toFixed(2):c.value.toFixed(2)}>{c.label}</option>)}</select>
              </div>
            </div>
            <div className="bg-[#0a0e1a] p-3 rounded-lg border border-[#1a2540] text-center">
               <div className="text-[8px] text-[#4a5a70] uppercase mb-2">বারকোড প্রিভিউ</div>
               <BarcodeStrip code={genBC(dbGlassTypes.find(g=>g.id===form.glassType)?.tag||"XX", form.sph, form.cyl, showAdd ? form.add : "0.00", form.glassDesign)} height={50} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div><div style={lbl}>পরিমাণ</div><input type="number" min="1" value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} style={inp} /></div>
            <div><div style={{...lbl, color: form.direction==="in" ? C.green : C.rose}}>{form.direction==="in" ? "ক্রয় মূল্য" : "বিক্রয় মূল্য"}</div><input type="number" placeholder="০.০০" value={form.unitPrice} onChange={e => setForm({...form, unitPrice: e.target.value})} style={inp} /></div>
            <div><div style={lbl}>মোট মূল্য</div><div style={{...inp, color: form.direction==="in" ? C.green : C.rose, fontWeight:"bold"}}>{fmtTk(totalPrice)}</div></div>
          </div>

          <button onClick={handleEntry} className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-white text-sm shadow-lg transition-all active:scale-95
            ${form.direction === "in" ? "bg-gradient-to-r from-[#16a34a] to-[#22c55e]" : "bg-gradient-to-r from-[#dc2626] to-[#f87171]"}`}>
            {SM[form.subtype].icon} {form.direction==="in" ? "স্টক ইন নিশ্চিত করুন" : "স্টক আউট নিশ্চিত করুন"}
          </button>
        </div>

        {/* RIGHT: RECENT TRANSACTIONS */}
        <div className="lg:col-span-2 bg-[#0f1424] p-6 rounded-2xl border border-[#1a2540] flex flex-col h-[850px]">
          <h3 className="text-xs font-black text-[#22d3ee] uppercase tracking-widest mb-6 flex items-center gap-2"><span>⏱</span> সাম্প্রতিক লেনদেন</h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
            {txns.length === 0 ? (
              <div className="opacity-50 text-center text-sm italic text-[#4a5568] py-20">নতুন এন্ট্রি করলে এখানে দেখা যাবে...</div>
            ) : (
              txns.map((tx) => {
                 const sm = SM[tx.subtype]||{};
                 return (
                  <div key={tx.id} className="bg-[#050810] border border-[#1a2540] p-4 rounded-xl flex justify-between items-center animate-in slide-in-from-right-4 duration-300">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{background:sm.color+"22", color:sm.color}} className="text-[10px] font-black px-2 py-0.5 rounded-md border border-current">{sm.label}</span>
                        <span className="text-xs font-bold text-[#dde6f0]">{tx.glassName}</span>
                      </div>
                      <div className="text-[9px] font-mono text-[#4a5568]">◫ {tx.barcode}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono font-black text-lg ${tx.direction === "in" ? "text-[#4ade80]" : "text-[#f87171]"}`}>
                        {tx.direction === "in" ? "+" : "-"}{tx.qty}
                      </div>
                    </div>
                  </div>
                 )
              })
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