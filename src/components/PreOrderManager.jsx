import React, { useState, useEffect } from "react";
import { C, GLASS_TYPES, API_BASE_URL } from "../utils/constants";
import { useToast } from "./ToastContext";

const inpStyle = { padding: "12px", borderRadius: 10, border: "1px solid #1a2540", background: "#050810", color: "#dde6f0", fontSize: 14, outline: "none", width: "100%" };

// Filter out the 3 designs from the Coating (Glass Type) top grid
const COATING_TYPES = GLASS_TYPES.filter(g => 
  !["progressive", "bifocal_moon", "bifocal_d"].includes(g.id)
);

// 🚀 THE ULTIMATE FIX: The IDs now perfectly match Heatmap.jsx (bifocal_moon & bifocal_d)
const LENS_DESIGNS = [
  { id: "single_vision", name: "সিঙ্গেল ভিশন", sub: "Single Vision" },
  { id: "bifocal_moon", name: "মুন বাইফোকাল", sub: "Moon Bifocal" },
  { id: "bifocal_d", name: "ডি-বাইফোকাল", sub: "D-Bifocal" },
  { id: "progressive", name: "প্রগ্রেসিভ", sub: "Progressive/Varilux" },
  { id: "high_index", name: "হাই ইনডেক্স", sub: "High Index" },
  { id: "polycarbonate", name: "পলিকার্বোনেট", sub: "Polycarbonate" }
];

// AUTO-GENERATE POWER ARRAYS (0.25 steps)
const generatePowers = (min, max) => {
  const powers = [];
  for (let i = min; i <= max; i += 0.25) {
    if (i === 0) powers.push("0.00");
    else if (i > 0) powers.push(`+${i.toFixed(2)}`);
    else powers.push(i.toFixed(2));
  }
  return powers;
};

const SPH_OPTIONS = generatePowers(-20, 20);
const CYL_OPTIONS = generatePowers(-6, 6);

export default function PreOrderManager({ authUser }) {
  const toast = useToast();
  const [subTab, setSubTab] = useState("entry"); 
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [glassType, setGlassType] = useState(COATING_TYPES[0]?.id || "white");
  const [design, setDesign] = useState(LENS_DESIGNS[0].id);
  const [sph, setSph] = useState(""); 
  const [cyl, setCyl] = useState(""); 
  const [axis, setAxis] = useState("");
  const [addVal, setAddVal] = useState("");
  const [qty, setQty] = useState("");

  const [fulfillModal, setFulfillModal] = useState({ open: false, orderId: null, price: "" });

  const fetchPendingOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/PreOrders`, {
        headers: { "Authorization": `Bearer ${authUser.token}` }
      });
      if (res.ok) setPendingOrders(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (subTab === "pending") fetchPendingOrders();
  }, [subTab]);

  const handleEntry = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/PreOrders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authUser.token}` },
        body: JSON.stringify({
          glassTypeId: glassType,
          design: design,
          sph: parseFloat(sph || 0),
          cyl: parseFloat(cyl || 0),
          axis: axis === "" ? null : parseInt(axis, 10),
          add: parseFloat(addVal || 0),
          qty: parseInt(qty || 1, 10)
        })
      });
      if (!response.ok) throw new Error("প্রি-অর্ডার সেভ করতে সমস্যা হয়েছে!");
      toast.success("প্রি-অর্ডার সফলভাবে সেভ হয়েছে!");
      
      setSph(""); setCyl(""); setAxis(""); setAddVal(""); setQty("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFulfill = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/PreOrders/${fulfillModal.orderId}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authUser.token}` },
        body: JSON.stringify({ purchasePrice: parseFloat(fulfillModal.price) })
      });
      if (!res.ok) throw new Error("স্টক ইন করতে সমস্যা হয়েছে!");
      
      toast.success("সফলভাবে স্টক ইন করা হয়েছে!");
      setFulfillModal({ open: false, orderId: null, price: "" });
      fetchPendingOrders(); 
      setTimeout(() => window.location.reload(), 1500); 
    } catch (err) {
      toast.error(err.message);
    }
  };

  const activeGlass = COATING_TYPES.find(g => g.id === glassType);
  const activeDesign = LENS_DESIGNS.find(d => d.id === design);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 pb-10">
      
      <div className="flex bg-[#0f1424] p-1.5 rounded-xl border border-[#1a2540] w-fit shadow-xl">
        <button onClick={() => setSubTab("entry")} className={`px-6 py-2.5 rounded-lg text-xs font-black tracking-widest uppercase transition-all ${subTab === "entry" ? "bg-[#0ea5e9] text-white shadow-lg" : "text-[#4a5a70] hover:text-[#dde6f0]"}`}>নতুন প্রি-অর্ডার</button>
        <button onClick={() => setSubTab("pending")} className={`px-6 py-2.5 rounded-lg text-xs font-black tracking-widest uppercase transition-all ${subTab === "pending" ? "bg-[#0ea5e9] text-white shadow-lg" : "text-[#4a5a70] hover:text-[#dde6f0]"}`}>
          পেন্ডিং তালিকা {pendingOrders.length > 0 && <span className="ml-2 bg-[#f87171] text-white px-2 py-0.5 rounded-full">{pendingOrders.length}</span>}
        </button>
      </div>

      {subTab === "entry" && (
        <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-8 shadow-xl">
          <h2 className="text-[#0ea5e9] font-black text-lg mb-6 uppercase tracking-widest flex items-center gap-2"><span>📦</span> নতুন প্রি-অর্ডার এন্ট্রি</h2>
          
          <form onSubmit={handleEntry}>
            
            <div className="border border-[#1a2540] rounded-2xl p-6 mb-8 bg-[#0a0f1c]">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9] shadow-[0_0_8px_#0ea5e9]"></span>
                <h3 className="text-xs font-black text-[#0ea5e9] uppercase tracking-widest">লেন্স টাইপ নির্বাচন</h3>
              </div>
              
              <div className="text-[11px] text-[#4a5a70] font-black mb-3 uppercase tracking-widest ml-1">কোটিং:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {COATING_TYPES.map(g => (
                  <div 
                    key={g.id} 
                    onClick={() => setGlassType(g.id)}
                    className={`p-4 rounded-xl border cursor-pointer flex items-center gap-4 transition-all ${
                      glassType === g.id 
                        ? "border-[#0ea5e9] bg-[#0ea5e9]/5 shadow-[0_0_15px_rgba(14,165,233,0.1)]" 
                        : "border-[#1a2540] bg-[#050810] hover:border-[#4a5a70]"
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" style={{background: g.accent || '#94a3b8', color: g.accent || '#94a3b8'}}></span>
                    <div>
                      <div className="font-bold text-[#dde6f0] text-sm">{g.name}</div>
                      <div className="text-[10px] text-[#4a5a70] mt-0.5">{g.subName || g.name}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-[#4a5a70] font-black mb-3 uppercase tracking-widest ml-1">লেন্স ডিজাইন</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {LENS_DESIGNS.map(d => (
                  <div 
                    key={d.id} 
                    onClick={() => setDesign(d.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      design === d.id 
                        ? "border-[#0ea5e9] bg-[#0ea5e9]/5 shadow-[0_0_15px_rgba(14,165,233,0.1)]" 
                        : "border-[#1a2540] bg-[#050810] hover:border-[#4a5a70]"
                    }`}
                  >
                    <div className={`font-bold text-sm ${design === d.id ? "text-[#0ea5e9]" : "text-[#dde6f0]"}`}>{d.name}</div>
                    <div className="text-[10px] text-[#4a5a70] mt-0.5">{d.sub}</div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl border border-[#1a2540] bg-[#050810] flex items-center gap-3 mt-4">
                <span className="text-[10px] text-[#4a5a70] font-black uppercase tracking-widest mr-2">নির্বাচিত লেন্স</span>
                <span className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]" style={{background: activeGlass?.accent || '#94a3b8', color: activeGlass?.accent || '#94a3b8'}}></span>
                <span className="font-bold text-[#dde6f0] text-sm">{activeGlass?.name}</span>
                <span className="text-[#4a5a70] font-black text-sm mx-1">+</span>
                <span className="font-bold text-[#0ea5e9] text-sm">{activeDesign?.name || design}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="space-y-2">
                <label className="block text-[10px] text-[#4a5a70] font-black mb-2 uppercase tracking-widest ml-1">পরিমাণ (Qty)</label>
                <input required type="number" min="1" placeholder="1" value={qty} onChange={e => setQty(e.target.value)} style={inpStyle} className="transition-all focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/30" />
              </div>
              
              <div className="space-y-2">
                <label className="block text-[10px] text-[#f472b6] font-black mb-2 uppercase tracking-widest ml-1">SPH</label>
                <select required value={sph} onChange={e => setSph(e.target.value)} style={inpStyle} className="transition-all focus:border-[#f472b6] focus:ring-1 focus:ring-[#f472b6]/30 font-mono">
                  <option value="" disabled>নির্বাচন করুন</option>
                  {SPH_OPTIONS.map(val => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-[10px] text-[#a3e635] font-black mb-2 uppercase tracking-widest ml-1">CYL</label>
                <select required value={cyl} onChange={e => setCyl(e.target.value)} style={inpStyle} className="transition-all focus:border-[#a3e635] focus:ring-1 focus:ring-[#a3e635]/30 font-mono">
                  <option value="" disabled>নির্বাচন করুন</option>
                  {CYL_OPTIONS.map(val => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-[10px] text-[#38bdf8] font-black mb-2 uppercase tracking-widest ml-1">AXIS</label>
                <input type="number" placeholder="90" value={axis} onChange={e => setAxis(e.target.value)} style={inpStyle} className="transition-all focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30 font-mono" />
              </div>

              <div className="space-y-2 lg:col-span-1">
                <label className="block text-[10px] text-[#c084fc] font-black mb-2 uppercase tracking-widest ml-1">ADD (Optional)</label>
                <input type="number" step="0.25" placeholder="0.00" value={addVal} onChange={e => setAddVal(e.target.value)} style={inpStyle} className="transition-all focus:border-[#c084fc] focus:ring-1 focus:ring-[#c084fc]/30 font-mono" />
              </div>
            </div>

            <button disabled={loading} type="submit" className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-black py-4 rounded-xl shadow-lg transition-all tracking-widest uppercase disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? "সেভ হচ্ছে..." : "প্রি-অর্ডার নিশ্চিত করুন"}
            </button>
            
          </form>
        </div>
      )}

      {subTab === "pending" && (
        <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#0a1526] border-b-2 border-[#1a3a5c]">
                <tr>
                  <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest w-32 text-center">অ্যাকশন</th>
                  <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest">গ্লাস</th>
                  <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">SPH</th>
                  <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">CYL</th>
                  <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">AXIS</th>
                  <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">ADD</th>
                  <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">পরিমাণ</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.map((order, i) => (
                  <tr key={order.id} className={`border-b border-[#1a2540] hover:bg-[#0f1828] transition-colors ${i % 2 === 0 ? 'bg-transparent' : 'bg-[#050810]'}`}>
                    <td className="p-5 text-center">
                      <button 
                        onClick={() => setFulfillModal({ open: true, orderId: order.id, price: "" })} 
                        className="bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-[#10b981] hover:text-white transition-all shadow-sm"
                      >
                        + স্টক ইন
                      </button>
                    </td>
                    <td className="p-5 font-bold text-[#dde6f0]">
                      <div className="flex items-center gap-3">
                         <span className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]" style={{background: GLASS_TYPES.find(g => g.id === order.glassTypeId)?.accent || "#0ea5e9", color: GLASS_TYPES.find(g => g.id === order.glassTypeId)?.accent || "#0ea5e9"}}></span>
                         <span>{GLASS_TYPES.find(g => g.id === order.glassTypeId)?.name || order.glassTypeId}</span>
                       </div>
                      <div className="text-[10px] text-[#4a5a70] tracking-widest uppercase font-bold mt-1 ml-5">
                         {LENS_DESIGNS.find(d => d.id === order.design)?.name || order.design}
                      </div>
                    </td>
                    <td className="p-5 text-center font-mono font-black text-[#f472b6] text-base">{order.sph > 0 ? `+${order.sph.toFixed(2)}` : order.sph.toFixed(2)}</td>
                    <td className="p-5 text-center font-mono font-black text-[#a3e635] text-base">{order.cyl > 0 ? `+${order.cyl.toFixed(2)}` : order.cyl.toFixed(2)}</td>
                    <td className="p-5 text-center font-mono font-black text-[#38bdf8] text-base">{order.axis || "—"}</td>
                    <td className="p-5 text-center font-mono font-black text-[#c084fc] text-base">{order.add > 0 ? `+${order.add.toFixed(2)}` : "—"}</td>
                    <td className="p-5 text-center font-mono font-black text-xl text-white">{order.qty}</td>
                  </tr>
                ))}
                {pendingOrders.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-20 text-center">
                      <div className="text-4xl mb-4 opacity-20">📦</div>
                      <div className="text-[#c8dff0] font-black text-lg mb-1">কোনো পেন্ডিং অর্ডার নেই</div>
                      <div className="text-xs text-[#4a5a70] italic">সব প্রি-অর্ডার সম্পূর্ণ হয়েছে</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {fulfillModal.open && (
        <div className="fixed inset-0 bg-[#000000cc] backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-white font-black text-lg mb-2 flex items-center gap-2"><span>📥</span> স্টক ইন করুন</h3>
            <p className="text-[#4a5a70] text-[11px] font-bold mb-6 uppercase tracking-wider">এই লেন্সটির প্রতি পিসের ক্রয় মূল্য (Purchase Price) লিখুন।</p>
            <form onSubmit={handleFulfill}>
              <input autoFocus required type="number" step="any" placeholder="৳ 0.00" value={fulfillModal.price} onChange={e => setFulfillModal({ ...fulfillModal, price: e.target.value })} style={inpStyle} className="mb-6 font-mono text-xl transition-all focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/30" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setFulfillModal({ open: false, orderId: null, price: "" })} className="flex-1 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-[#1a2540] text-[#dde6f0] hover:bg-[#253454] transition-all">বাতিল</button>
                <button type="submit" className="flex-1 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-[#10b981] text-white hover:bg-[#059669] shadow-lg transition-all">নিশ্চিত করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}