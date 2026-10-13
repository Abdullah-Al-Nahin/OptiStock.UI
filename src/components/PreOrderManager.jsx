import React, { useState, useEffect, useMemo } from "react";
import { C, CATEGORIES, API_BASE_URL, ADD_LIST } from "../utils/constants";
import { useToast } from "./ToastContext";

const inpStyle = { padding: "12px", borderRadius: 10, border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)", fontSize: 14, outline: "none", width: "100%" };

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

// Helper functions for naming and power format
const getMatName = (id) => CATEGORIES.materials.find(m => m.id === id)?.n || id;
const getCoatName = (id) => CATEGORIES.coatings.find(c => c.id === id)?.n || id;
const getColName = (id) => CATEGORIES.colors.find(c => c.id === id)?.n || id;
const getDesName = (id) => CATEGORIES.designs.find(d => d.id === id)?.n || id;

const formatSph = (sph) => {
  const n = parseFloat(sph || 0);
  return n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2);
};

const formatCyl = (cyl) => {
  const n = parseFloat(cyl || 0);
  return n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2);
};

const formatAdd = (add) => {
  const n = parseFloat(add || 0);
  return n > 0 ? `+${n.toFixed(2)}` : "—";
};

const formatAxis = (axis) => {
  if (axis === null || axis === undefined || axis === "") return "—";
  return `${axis}°`;
};

export default function PreOrderManager({ authUser }) {
  const toast = useToast();
  const [subTab, setSubTab] = useState("entry"); 
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [material, setMaterial] = useState(CATEGORIES.materials[0].id);
  const [coating, setCoating] = useState(CATEGORIES.coatings[0].id);
  const [color, setColor] = useState(CATEGORIES.colors[0].id);
  const [design, setDesign] = useState(CATEGORIES.designs[0].id);
  const [sph, setSph] = useState(""); 
  const [cyl, setCyl] = useState(""); 
  const [axis, setAxis] = useState("");
  const [addVal, setAddVal] = useState("");
  const [qty, setQty] = useState("");
  
  const showAdd = ["progressive", "bifocal_moon", "bifocal_d"].includes(design);

  // Modals & Selection States
  const [fulfillModal, setFulfillModal] = useState({ open: false, orderId: null, price: "" });
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMaterial, setFilterMaterial] = useState("all");

  // Print Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printFormat, setPrintFormat] = useState("a4"); // "a4" | "pos"
  const [groupByMaterial, setGroupByMaterial] = useState(true);
  const [runnerName, setRunnerName] = useState("");
  const [printScope, setPrintScope] = useState("auto"); // "auto" | "selected" | "all"

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
          glassTypeId: `${material}_${coating}_${color}`,
          material: material,
          coating: coating,
          color: color,
          design: design,
          sph: parseFloat(sph || 0),
          cyl: parseFloat(cyl || 0),
          axis: axis === "" ? null : parseInt(axis, 10),
          add: showAdd ? parseFloat(addVal || 0) : 0,
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

  // Delete pre-order
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("আপনি কি নিশ্চিত এই প্রি-অর্ডারটি মুছে ফেলতে চান?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/PreOrders/${orderId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authUser.token}` }
      });
      if (!res.ok) throw new Error("প্রি-অর্ডার মুছতে সমস্যা হয়েছে!");
      toast.success("প্রি-অর্ডার সফলভাবে মুছে ফেলা হয়েছে!");
      setPendingOrders(prev => prev.filter(o => o.id !== orderId));
      setSelectedIds(prev => prev.filter(id => id !== orderId));
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Filter pending orders
  const filteredOrders = useMemo(() => {
    return pendingOrders.filter(order => {
      const matchMat = filterMaterial === "all" || order.material === filterMaterial;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchMat;

      const mat = (getMatName(order.material) || "").toLowerCase();
      const coat = (getCoatName(order.coating) || "").toLowerCase();
      const col = (getColName(order.color) || "").toLowerCase();
      const des = (getDesName(order.design) || "").toLowerCase();
      const sphStr = formatSph(order.sph).toLowerCase();
      const cylStr = formatCyl(order.cyl).toLowerCase();
      const axisStr = String(order.axis || "");

      const matchQ = mat.includes(q) || coat.includes(q) || col.includes(q) || des.includes(q) || sphStr.includes(q) || cylStr.includes(q) || axisStr.includes(q);
      return matchMat && matchQ;
    });
  }, [pendingOrders, filterMaterial, searchQuery]);

  // Selection handlers
  const isAllSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedIds.includes(o.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const filteredSet = new Set(filteredOrders.map(o => o.id));
      setSelectedIds(prev => prev.filter(id => !filteredSet.has(id)));
    } else {
      const set = new Set([...selectedIds, ...filteredOrders.map(o => o.id)]);
      setSelectedIds(Array.from(set));
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Get orders to print based on scope
  const getOrdersToPrint = () => {
    if (printScope === "selected" && selectedIds.length > 0) {
      return pendingOrders.filter(o => selectedIds.includes(o.id));
    }
    if (printScope === "all") {
      return filteredOrders;
    }
    // "auto" mode: if some are selected, use selected; otherwise use all filtered
    if (selectedIds.length > 0) {
      return pendingOrders.filter(o => selectedIds.includes(o.id));
    }
    return filteredOrders;
  };

  // --- PRINT ENGINE FOR PURCHASING RUNNERS ---
  const handlePrintExecution = () => {
    const listToPrint = getOrdersToPrint();
    if (!listToPrint || listToPrint.length === 0) {
      toast.error("প্রিন্ট করার জন্য কোনো অর্ডার পাওয়া যায়নি!");
      return;
    }

    const totalDistinct = listToPrint.length;
    const totalPcs = listToPrint.reduce((acc, o) => acc + (parseInt(o.qty, 10) || 1), 0);
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true });
    const slipId = `REQ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`;
    const runner = runnerName.trim() || "নির্দিষ্ট নয়";

    // Build Rows
    const renderTableRow = (order, idx) => `
      <tr>
        <td style="text-align:center; font-weight:bold; color:#4b5563; padding:8px 4px;">${idx}</td>
        <td style="text-align:center; padding:8px 4px;">
          <div style="width:16px; height:16px; border:2px solid #1f2937; border-radius:3px; margin:0 auto;"></div>
        </td>
        <td style="padding:8px 8px;">
          <div style="font-weight:bold; font-size:12px; color:#111827;">${getMatName(order.material)}</div>
          <div style="font-size:10.5px; color:#4b5563; margin-top:2px;">
            ${getCoatName(order.coating)} • ${getColName(order.color)}
            ${order.design ? ` • <span style="font-weight:600; color:#1d4ed8;">${getDesName(order.design)}</span>` : ""}
          </div>
        </td>
        <td style="text-align:center; font-family:'Courier New', monospace; font-size:13px; font-weight:bold; color:#0f172a; padding:8px 4px;">
          <span style="display:inline-block; padding:2px 6px; background:#f1f5f9; border-radius:4px; border:1px solid #cbd5e1;">${formatSph(order.sph)}</span>
        </td>
        <td style="text-align:center; font-family:'Courier New', monospace; font-size:13px; font-weight:bold; color:#0f172a; padding:8px 4px;">
          <span style="display:inline-block; padding:2px 6px; background:#f1f5f9; border-radius:4px; border:1px solid #cbd5e1;">${formatCyl(order.cyl)}</span>
        </td>
        <td style="text-align:center; font-family:'Courier New', monospace; font-size:12px; font-weight:bold; color:#1e293b; padding:8px 4px;">
          ${formatAxis(order.axis)}
        </td>
        <td style="text-align:center; font-family:'Courier New', monospace; font-size:12px; font-weight:bold; color:#6d28d9; padding:8px 4px;">
          ${formatAdd(order.add)}
        </td>
        <td style="text-align:center; font-size:14px; font-weight:900; color:#111827; background:#f8fafc; padding:8px 4px;">
          ${order.qty}
        </td>
        <td style="text-align:center; border-left:1px dashed #cbd5e1; padding:8px 6px; color:#9ca3af; font-size:11px;">
          ৳ ________
        </td>
        <td style="text-align:center; border-left:1px dashed #cbd5e1; padding:8px 6px; color:#9ca3af; font-size:11px;">
          ৳ ________
        </td>
        <td style="border-left:1px dashed #cbd5e1; padding:8px 6px; color:#9ca3af; font-size:10px;">
          ________________
        </td>
      </tr>
    `;

    let tableBody = "";
    if (groupByMaterial) {
      const groups = {};
      listToPrint.forEach(item => {
        const mat = item.material || "other";
        if (!groups[mat]) groups[mat] = [];
        groups[mat].push(item);
      });

      let runningIdx = 1;
      Object.keys(groups).forEach(matId => {
        const items = groups[matId];
        const matName = getMatName(matId);
        const groupQty = items.reduce((s, it) => s + (parseInt(it.qty, 10) || 1), 0);

        tableBody += `
          <tr style="background:#e0f2fe; border-top:2px solid #0284c7; border-bottom:1px solid #bae6fd;">
            <td colspan="11" style="padding:7px 10px; font-weight:900; font-size:12px; color:#0369a1;">
              🧊 ${matName} — <span style="font-weight:normal; font-size:11px; color:#0c4a6e;">(${items.length}টি আইটেম, সর্বমোট ${groupQty} পিস)</span>
            </td>
          </tr>
        `;
        items.forEach(it => {
          tableBody += renderTableRow(it, runningIdx++);
        });
      });
    } else {
      listToPrint.forEach((o, i) => {
        tableBody += renderTableRow(o, i + 1);
      });
    }

    // HTML Output for Standard A4
    const a4Html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset='UTF-8'>
      <title>লেন্স ক্রয় তালিকা - ${slipId}</title>
      <style>
        @media print {
          @page { size: A4 portrait; margin: 8mm 10mm 10mm 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #111827; background: #fff; margin: 0; padding: 15px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 12px; }
        .title h1 { margin: 0; font-size: 22px; color: #0369a1; text-transform: uppercase; font-weight: 900; letter-spacing: 0.5px; }
        .title p { margin: 3px 0 0; font-size: 11px; color: #4b5563; font-weight: 600; }
        .badge { display: inline-block; background: #0284c7; color: #fff; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px; margin-top: 5px; text-transform: uppercase; }
        .meta { text-align: right; font-size: 11px; color: #374151; line-height: 1.5; }
        .meta strong { color: #111827; }
        
        .runner-box { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 14px; margin-bottom: 12px; font-size: 11px; font-weight: 600; }
        .runner-box span.val { color: #0369a1; font-weight: 800; }
        
        .stats-strip { display: flex; gap: 12px; margin-bottom: 14px; }
        .stat-card { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; background: #f8fafc; }
        .stat-card .val { font-size: 16px; font-weight: 900; color: #0284c7; }
        .stat-card .lbl { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-top: 2px; }
        
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px; }
        th { background: #0f172a; color: #ffffff; padding: 8px 5px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #0f172a; }
        td { border: 1px solid #e2e8f0; vertical-align: middle; }
        tr:nth-child(even) { background-color: #fcfcfc; }
        
        .guidelines { margin-top: 15px; padding: 10px 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; font-size: 10.5px; color: #92400e; }
        .guidelines strong { color: #78350f; }
        
        .signatures { display: flex; justify-content: space-between; margin-top: 45px; padding-top: 10px; }
        .sig-block { width: 190px; text-align: center; border-top: 1px dashed #64748b; padding-top: 5px; font-size: 10.5px; color: #374151; font-weight: 700; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">
          <h1>OptiStock PRO</h1>
          <p>চশমার লেন্স ক্রয় ও রিকুইজিশন মেমো (Lens Purchase Order Sheet)</p>
          <span class="badge">অফিসিয়াল ক্রয় স্লিপ</span>
        </div>
        <div class="meta">
          <div>স্মারক নং: <strong>${slipId}</strong></div>
          <div>তারিখ: <strong>${dateStr}</strong></div>
          <div>সময়: <strong>${timeStr}</strong></div>
          <div>প্রস্তুতকারক: <strong>${authUser?.name || "অ্যাডমিন"}</strong></div>
        </div>
      </div>

      <div class="runner-box">
        <div>সংগ্রহকারী কর্মচারী: <span class="val">${runner}</span></div>
        <div>পাইকারি মার্কেট / দোকান: <span class="val">___________________________</span></div>
        <div>স্ট্যাটাস: <span class="val" style="color:#d97706;">পেন্ডিং সংগ্রহ</span></div>
      </div>

      <div class="stats-strip">
        <div class="stat-card">
          <div class="val">${totalDistinct} টি</div>
          <div class="lbl">মোট আইটেম / পাওয়ার প্রকার</div>
        </div>
        <div class="stat-card">
          <div class="val">${totalPcs} পিস</div>
          <div class="lbl">সর্বমোট লেন্সের সংখ্যা</div>
        </div>
        <div class="stat-card">
          <div class="val" style="color:#10b981;">৳ _________________</div>
          <div class="lbl">মোট ক্রয় ব্যয় (দোকানদার মেমো অনুযায়ী)</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:4%;">#</th>
            <th style="width:6%;">চেক [✓]</th>
            <th style="width:30%;">লেন্সের বিবরণ</th>
            <th style="width:10%;">SPH</th>
            <th style="width:10%;">CYL</th>
            <th style="width:7%;">AXIS</th>
            <th style="width:7%;">ADD</th>
            <th style="width:6%;">পরিমাণ</th>
            <th style="width:9%;">ক্রয় দর</th>
            <th style="width:9%;">মোট টাকা</th>
            <th style="width:12%;">সরবরাহকারী/ভাউচার</th>
          </tr>
        </thead>
        <tbody>
          ${tableBody}
        </tbody>
        <tfoot>
          <tr style="background:#f1f5f9; font-weight:bold;">
            <td colspan="7" style="padding:8px 10px; text-align:right; font-size:11px;">সর্বমোট লেন্স সংখ্যা:</td>
            <td style="text-align:center; font-size:14px; font-weight:900; color:#0284c7; padding:8px 4px;">${totalPcs} পিস</td>
            <td colspan="3" style="padding:8px 10px; font-size:10px; color:#4b5563;">প্রকৃত ক্রয় দর লিখে মেমো অফিসে জমা দিন</td>
          </tr>
        </tfoot>
      </table>

      <div class="guidelines">
        <strong>⚠️ সংগ্রহকারী কর্মচারীর জন্য বিশেষ নির্দেশনা:</strong>
        <ol style="margin:4px 0 0 16px; padding:0; line-height:1.5;">
          <li>লেন্স ক্রয়ের সময় প্রতিটি প্যাকেটের পাওয়ার মার্কিং (SPH, CYL, AXIS) কাগজের সাথে নির্ভুলভাবে মিলিয়ে নিন।</li>
          <li>লেন্সের গ্লাসে কোনো দাগ, স্ক্র্যাচ (Scratch), বুদ্বুদ বা কোটিংয়ের ত্রুটি থাকলে গ্রহণ করবেন না।</li>
          <li>পাইকারি দোকান/ল্যাব থেকে মূল ক্যাশ মেমো বা ভাউচার সংগ্রহ করে ক্রয় সম্পন্ন হলে অফিসে জমা দিন।</li>
        </ol>
      </div>

      <div class="signatures">
        <div class="sig-block">প্রস্তুতকারকের স্বাক্ষর</div>
        <div class="sig-block">সংগ্রহকারী কর্মচারীর স্বাক্ষর</div>
        <div class="sig-block">স্টক রিসিভার ও ভেরিফায়ার</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>`;

    // Thermal / POS (80mm) Slip Format
    const posRows = listToPrint.map((o, idx) => `
      <div style="border-bottom:1px dashed #000; padding:6px 0;">
        <div style="display:flex; justify-content:space-between; font-weight:bold;">
          <span>[ ] #${idx + 1} ${getMatName(o.material)}</span>
          <span style="font-size:13px; font-weight:900;">${o.qty} পিস</span>
        </div>
        <div style="font-size:10px; margin-top:2px;">${getCoatName(o.coating)} • ${getColName(o.color)} • ${getDesName(o.design)}</div>
        <div style="font-family:monospace; font-weight:bold; font-size:12px; margin-top:3px;">
          SPH: ${formatSph(o.sph)} | CYL: ${formatCyl(o.cyl)} | AX: ${formatAxis(o.axis)} | ADD: ${formatAdd(o.add)}
        </div>
        <div style="font-size:10px; margin-top:3px; color:#333;">দর: ৳ _______ | মোট: ৳ _______</div>
      </div>
    `).join("");

    const posHtml = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset='UTF-8'>
      <title>লেন্স ক্রয় স্লিপ - ${slipId}</title>
      <style>
        @media print {
          @page { size: 80mm auto; margin: 3mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body { width: 74mm; margin: 0 auto; padding: 4px; font-family: monospace; font-size: 11px; color: #000; }
        .text-center { text-align: center; }
        hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
      </style>
    </head>
    <body>
      <div class="text-center">
        <h3 style="margin:0; font-size:16px;">OPTISTOCK PRO</h3>
        <p style="margin:2px 0; font-size:11px;">লেন্স ক্রয় রিকুইজিশন স্লিপ</p>
        <p style="margin:2px 0; font-size:9px;">${dateStr} - ${timeStr}</p>
        <p style="margin:2px 0; font-size:9px;">স্মারক: ${slipId}</p>
      </div>
      <hr/>
      <div>কর্মচারী: <b>${runner}</b></div>
      <div>মোট আইটেম: <b>${totalDistinct} টি</b> | মোট লেন্স: <b>${totalPcs} পিস</b></div>
      <hr/>
      ${posRows}
      <hr/>
      <div style="font-size:12px; font-weight:bold; display:flex; justify-content:space-between;">
        <span>সর্বমোট লেন্স:</span>
        <span>${totalPcs} পিস</span>
      </div>
      <div style="font-size:10px; margin-top:8px; text-align:center;">
        * সংগ্রহ করার সময় পাওয়ার ও স্ক্র্যাচ চেক করুন *
      </div>
      <br/><br/>
      <div style="text-align:center; border-top:1px dashed #000; padding-top:4px; font-size:10px;">
        সংগ্রহকারীর স্বাক্ষর
      </div>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>`;

    const htmlToPrint = printFormat === "pos" ? posHtml : a4Html;
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("পপ-আপ উইন্ডো ব্লক করা হয়েছে! ব্রাউজারের পপ-আপ অ্যালাউ করুন।");
      return;
    }
    win.document.write(htmlToPrint);
    win.document.close();
    setPrintModalOpen(false);
  };

  // --- WHATSAPP FORMAT CLIPBOARD COPY ---
  const handleCopyWhatsApp = () => {
    const listToShare = getOrdersToPrint();
    if (!listToShare || listToShare.length === 0) {
      toast.error("কপি করার জন্য কোনো অর্ডার পাওয়া যায়নি!");
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true });
    const totalPcs = listToShare.reduce((acc, o) => acc + (parseInt(o.qty, 10) || 1), 0);

    let text = `📦 *লেন্স ক্রয়ের তালিকা (OptiStock PRO)*\n`;
    text += `📅 তারিখ: ${dateStr}, ${timeStr}\n`;
    if (runnerName.trim()) text += `👤 দায়িত্বপ্রাপ্ত: ${runnerName.trim()}\n`;
    text += `-------------------------------------------\n`;

    listToShare.forEach((o, i) => {
      const mat = getMatName(o.material);
      const coat = getCoatName(o.coating);
      const col = getColName(o.color);
      const des = getDesName(o.design);
      const sph = formatSph(o.sph);
      const cyl = formatCyl(o.cyl);
      const axis = o.axis ? `${o.axis}°` : "—";
      const add = o.add > 0 ? `+${parseFloat(o.add).toFixed(2)}` : "—";

      text += `${i + 1}. *${mat}* [${coat} • ${col}]\n`;
      text += `   ডিজাইন: ${des}\n`;
      text += `   👓 SPH: *${sph}* | CYL: *${cyl}* | AXIS: *${axis}* | ADD: *${add}*\n`;
      text += `   📦 পরিমাণ: *${o.qty} পিস*\n\n`;
    });

    text += `-------------------------------------------\n`;
    text += `📊 সর্বমোট: *${listToShare.length}টি প্রকার (${totalPcs} পিস লেন্স)*\n`;
    text += `⚠️ *দয়া করে পাওয়ার ও স্ক্র্যাচ চেক করে সংগ্রহ করবেন।*`;

    navigator.clipboard.writeText(text).then(() => {
      toast.success("হোয়াটসঅ্যাপ তালিকা সফলভাবে ক্লিপবোর্ডে কপি হয়েছে!");
    }).catch(() => {
      toast.error("কপিতে সমস্যা হয়েছে!");
    });
  };

  const activeMat = CATEGORIES.materials.find(m => m.id === material);
  const activeCoat = CATEGORIES.coatings.find(c => c.id === coating);
  const activeCol = CATEGORIES.colors.find(c => c.id === color);

  const totalPendingPcs = pendingOrders.reduce((sum, o) => sum + (parseInt(o.qty, 10) || 1), 0);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 pb-10">
      
      {/* TABS SELECTOR */}
      <div className="flex bg-[var(--bg-card)] p-1.5 rounded-xl border border-[var(--border-color)] w-fit shadow-xl">
        <button onClick={() => setSubTab("entry")} className={`px-6 py-2.5 rounded-lg text-xs font-black tracking-widest uppercase transition-all ${subTab === "entry" ? "bg-[#0ea5e9] text-white shadow-lg" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}>নতুন প্রি-অর্ডার</button>
        <button onClick={() => setSubTab("pending")} className={`px-6 py-2.5 rounded-lg text-xs font-black tracking-widest uppercase transition-all ${subTab === "pending" ? "bg-[#0ea5e9] text-white shadow-lg" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}>
          পেন্ডিং তালিকা {pendingOrders.length > 0 && <span className="ml-2 bg-[#f87171] text-white px-2 py-0.5 rounded-full">{pendingOrders.length}</span>}
        </button>
      </div>

      {/* SUB-TAB 1: ENTRY */}
      {subTab === "entry" && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-8 shadow-xl">
          <h2 className="text-[#0ea5e9] font-black text-lg mb-6 uppercase tracking-widest flex items-center gap-2"><span>📦</span> নতুন প্রি-অর্ডার এন্ট্রি</h2>
          
          <form onSubmit={handleEntry}>
            <div className="border border-[var(--border-color)] rounded-2xl p-6 mb-8 bg-[var(--bg-main)]">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9] shadow-[0_0_8px_#0ea5e9]"></span>
                <h3 className="text-xs font-black text-[#0ea5e9] uppercase tracking-widest">লেন্স টাইপ নির্বাচন</h3>
              </div>
              
              <div className="text-[11px] text-[var(--text-muted)] font-black mb-3 uppercase tracking-widest ml-1">১. ম্যাটেরিয়াল (Material):</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {CATEGORIES.materials.map(m => (
                  <div key={m.id} onClick={() => setMaterial(m.id)} className={`p-3 rounded-xl border cursor-pointer flex flex-col items-center justify-center gap-2 transition-all ${material === m.id ? "border-[#0ea5e9] bg-[#0ea5e9]/5 shadow-sm" : "border-[var(--border-color)] bg-[var(--bg-card)] opacity-70 hover:opacity-100"}`}>
                    <span className="w-3 h-3 rounded-full" style={{background: m.color}}></span>
                    <div className="font-bold text-xs text-center">{m.n}</div>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-[var(--text-muted)] font-black mb-3 uppercase tracking-widest ml-1">২. কোটিং (Coating):</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {CATEGORIES.coatings.map(c => (
                  <div key={c.id} onClick={() => setCoating(c.id)} className={`p-3 rounded-xl border cursor-pointer transition-all ${coating === c.id ? "border-[#4ade80] bg-[#4ade80]/5 shadow-sm" : "border-[var(--border-color)] bg-[var(--bg-card)] opacity-70 hover:opacity-100"}`}>
                    <div className={`font-bold text-xs ${coating === c.id ? "text-[#4ade80]" : "text-[var(--text-main)]"}`}>{c.n}</div>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-[var(--text-muted)] font-black mb-3 uppercase tracking-widest ml-1">৩. কালার (Color):</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {CATEGORIES.colors.map(c => (
                  <div key={c.id} onClick={() => setColor(c.id)} className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2 ${color === c.id ? "border-[#fbbf24] bg-[#fbbf24]/5 shadow-sm" : "border-[var(--border-color)] bg-[var(--bg-card)] opacity-70 hover:opacity-100"}`}>
                    <span className="text-lg">{c.icon}</span>
                    <div className={`font-bold text-xs ${color === c.id ? "text-[#fbbf24]" : "text-[var(--text-main)]"}`}>{c.n}</div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-wrap items-center gap-3 mt-4">
                <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest mr-2">নির্বাচিত লেন্স:</span>
                <span className="font-bold text-[var(--text-main)] text-sm">{activeMat?.n}</span>
                <span className="text-[var(--text-muted)] font-black text-sm mx-1">+</span>
                <span className="font-bold text-[#4ade80] text-sm">{activeCoat?.n}</span>
                <span className="text-[var(--text-muted)] font-black text-sm mx-1">+</span>
                <span className="font-bold text-[#fbbf24] text-sm">{activeCol?.n}</span>
              </div>
              
              <div className="mt-6 text-[11px] text-[var(--text-muted)] font-black mb-3 uppercase tracking-widest ml-1">৪. লেন্স ডিজাইন (Lens Design):</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CATEGORIES.designs.map(d => (
                  <div key={d.id} onClick={() => setDesign(d.id)} className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2 ${design === d.id ? "border-[#818cf8] bg-[#818cf8]/5 shadow-sm" : "border-[var(--border-color)] bg-[var(--bg-card)] opacity-70 hover:opacity-100"}`}>
                    <span className="text-lg">{d.icon}</span>
                    <div className={`font-bold text-xs ${design === d.id ? "text-[#818cf8]" : "text-[var(--text-main)]"}`}>{d.n}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="space-y-2">
                <label className="block text-[10px] text-[var(--text-muted)] font-black mb-2 uppercase tracking-widest ml-1">পরিমাণ (Qty)</label>
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

              {showAdd && (
                <div className="space-y-2 lg:col-span-1 animate-in slide-in-from-left-4">
                  <label className="block text-[10px] text-[#c084fc] font-black mb-2 uppercase tracking-widest ml-1">ADD (পাওয়ার)</label>
                  <select required value={addVal} onChange={e => setAddVal(e.target.value)} style={inpStyle} className="transition-all focus:border-[#c084fc] focus:ring-1 focus:ring-[#c084fc]/30 font-mono">
                    <option value="" disabled>নির্বাচন করুন</option>
                    {ADD_LIST.map(val => (
                      <option key={val.label} value={val.label}>{val.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button disabled={loading} type="submit" className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-black py-4 rounded-xl shadow-lg transition-all tracking-widest uppercase disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? "সেভ হচ্ছে..." : "প্রি-অর্ডার নিশ্চিত করুন"}
            </button>
          </form>
        </div>
      )}

      {/* SUB-TAB 2: PENDING ORDERS LIST */}
      {subTab === "pending" && (
        <div className="space-y-4">
          
          {/* ACTION & FILTER TOOLBAR */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
            
            {/* SEARCH & MATERIAL FILTER */}
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <input 
                  type="text" 
                  placeholder="পাওয়ার বা লেন্সের নাম দিয়ে খুঁজুন (যেমন: -1.50, CR-39)..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)] text-xs rounded-xl px-4 py-2.5 outline-none focus:border-[#0ea5e9]"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]">✕</button>
                )}
              </div>

              <select 
                value={filterMaterial} 
                onChange={e => setFilterMaterial(e.target.value)}
                className="bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)] text-xs rounded-xl px-3 py-2.5 outline-none focus:border-[#0ea5e9]"
              >
                <option value="all">সব ম্যাটেরিয়াল</option>
                {CATEGORIES.materials.map(m => (
                  <option key={m.id} value={m.id}>{m.n}</option>
                ))}
              </select>
            </div>

            {/* STATS & PRINT ACTIONS */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-3 px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-xs font-bold">
                <span className="text-[var(--text-muted)]">মোট: <strong className="text-[var(--text-main)]">{pendingOrders.length}</strong> প্রকার</span>
                <span className="text-[var(--text-muted)]">•</span>
                <span className="text-[var(--text-muted)]">পরিমাণ: <strong className="text-[#0ea5e9] font-mono">{totalPendingPcs}</strong> পিস</span>
                {selectedIds.length > 0 && (
                  <>
                    <span className="text-[var(--text-muted)]">•</span>
                    <span className="text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded-full font-mono font-black">{selectedIds.length} সিলেক্টেড</span>
                  </>
                )}
              </div>

              {/* WHATSAPP COPY BUTTON */}
              <button 
                onClick={handleCopyWhatsApp}
                title="হোয়াটসঅ্যাপে তালিকা শেয়ার করতে কপি করুন"
                className="px-4 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase border border-[#22c55e]/30 bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e] hover:text-white transition-all flex items-center gap-2 shadow-sm"
              >
                <span>📋</span> হোয়াটসঅ্যাপ কপি
              </button>

              {/* PRINT LIST BUTTON */}
              <button 
                onClick={() => setPrintModalOpen(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] text-white hover:opacity-90 shadow-lg active:scale-95 transition-all flex items-center gap-2"
              >
                <span>🖨️</span> ক্রয় তালিকা প্রিন্ট {selectedIds.length > 0 ? `(${selectedIds.length})` : `(${filteredOrders.length})`}
              </button>
            </div>

          </div>

          {/* ORDERS TABLE */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[var(--bg-nav)] border-b-2 border-[var(--border-color)]">
                  <tr>
                    <th className="p-4 text-center w-12">
                      <input 
                        type="checkbox" 
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded cursor-pointer accent-[#0ea5e9]"
                        title="সবগুলো নির্বাচন করুন"
                      />
                    </th>
                    <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest w-36 text-center">অ্যাকশন</th>
                    <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest">গ্লাস ও স্পেসিফিকেশন</th>
                    <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">SPH</th>
                    <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">CYL</th>
                    <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">AXIS</th>
                    <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">ADD</th>
                    <th className="p-5 text-[11px] font-black text-[#22d3ee] uppercase tracking-widest text-center">পরিমাণ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order, i) => {
                    const isSelected = selectedIds.includes(order.id);
                    return (
                      <tr key={order.id} className={`border-b border-[var(--border-color)] hover:bg-[var(--bg-nav)] transition-colors ${isSelected ? 'bg-[#0ea5e9]/5' : (i % 2 === 0 ? 'bg-transparent' : 'bg-[var(--bg-main)]')}`}>
                        <td className="p-4 text-center">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(order.id)}
                            className="w-4 h-4 rounded cursor-pointer accent-[#0ea5e9]"
                          />
                        </td>
                        <td className="p-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => setFulfillModal({ open: true, orderId: order.id, price: "" })} 
                              className="bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider hover:bg-[#10b981] hover:text-white transition-all shadow-sm"
                            >
                              + স্টক ইন
                            </button>
                            <button 
                              onClick={() => handleDeleteOrder(order.id)}
                              title="প্রি-অর্ডার মুছে ফেলুন"
                              className="bg-[#f87171]/10 text-[#f87171] border border-[#f87171]/30 px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#f87171] hover:text-white transition-all shadow-sm"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                        <td className="p-5 font-bold text-[var(--text-main)]">
                          <div className="flex items-center gap-2.5">
                             <span className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]" style={{background: CATEGORIES.materials.find(m => m.id === order.material)?.color || "#0ea5e9"}}></span>
                             <span className="text-sm">{getMatName(order.material)}</span>
                           </div>
                          <div className="text-[10.5px] text-[var(--text-muted)] tracking-wider font-semibold mt-1 ml-5 flex items-center gap-2">
                             <span>{getCoatName(order.coating)}</span>
                             <span>•</span>
                             <span>{getColName(order.color)}</span>
                             {order.design && (
                               <>
                                 <span>•</span>
                                 <span className="text-[#818cf8] font-bold">{getDesName(order.design)}</span>
                               </>
                             )}
                          </div>
                        </td>
                        <td className="p-5 text-center font-mono font-black text-[#f472b6] text-base">{formatSph(order.sph)}</td>
                        <td className="p-5 text-center font-mono font-black text-[#a3e635] text-base">{formatCyl(order.cyl)}</td>
                        <td className="p-5 text-center font-mono font-black text-[#38bdf8] text-base">{formatAxis(order.axis)}</td>
                        <td className="p-5 text-center font-mono font-black text-[#c084fc] text-base">{formatAdd(order.add)}</td>
                        <td className="p-5 text-center font-mono font-black text-xl text-[var(--text-main)]">{order.qty}</td>
                      </tr>
                    );
                  })}
                  
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan="8" className="p-16 text-center">
                        <div className="text-4xl mb-3 opacity-20">📦</div>
                        <div className="text-[var(--text-main)] font-black text-base mb-1">
                          {searchQuery || filterMaterial !== "all" ? "কোনো মিল পাওয়া যায়নি" : "কোনো পেন্ডিং অর্ডার নেই"}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] italic">
                          {searchQuery || filterMaterial !== "all" ? "ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন" : "সব প্রি-অর্ডার সম্পূর্ণ হয়েছে"}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: STOCK IN / FULFILL */}
      {fulfillModal.open && (
        <div className="fixed inset-0 bg-[#000000cc] backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-[var(--text-main)] font-black text-lg mb-2 flex items-center gap-2"><span>📥</span> স্টক ইন করুন</h3>
            <p className="text-[var(--text-muted)] text-[11px] font-bold mb-6 uppercase tracking-wider">এই লেন্সটির প্রতি পিসের ক্রয় মূল্য (Purchase Price) লিখুন।</p>
            <form onSubmit={handleFulfill}>
              <input autoFocus required type="number" step="any" placeholder="৳ 0.00" value={fulfillModal.price} onChange={e => setFulfillModal({ ...fulfillModal, price: e.target.value })} style={inpStyle} className="mb-6 font-mono text-xl transition-all focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/30" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setFulfillModal({ open: false, orderId: null, price: "" })} className="flex-1 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-[var(--border-color)] text-[var(--text-main)] hover:opacity-80 transition-all">বাতিল</button>
                <button type="submit" className="flex-1 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-[#10b981] text-white hover:bg-[#059669] shadow-lg transition-all">নিশ্চিত করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PRINT REQUISITION LIST MODAL */}
      {printModalOpen && (
        <div className="fixed inset-0 bg-[#000000cc] backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 space-y-6">
            
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🖨️</span>
                <div>
                  <h3 className="text-[var(--text-main)] font-black text-base">লেন্স ক্রয়ের রিকুইজিশন তালিকা প্রিন্ট</h3>
                  <p className="text-[var(--text-muted)] text-xs">কর্মচারীর জন্য বাজার থেকে লেন্স ক্রয়ের প্রিন্টেবল শিট</p>
                </div>
              </div>
              <button onClick={() => setPrintModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-xl font-bold">✕</button>
            </div>

            {/* FORMAT CHOICE */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)] block">১. প্রিন্ট ফরম্যাট নির্বাচন করুন:</label>
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => setPrintFormat("a4")}
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${printFormat === "a4" ? "border-[#0ea5e9] bg-[#0ea5e9]/10 shadow-sm" : "border-[var(--border-color)] bg-[var(--bg-main)] opacity-70 hover:opacity-100"}`}
                >
                  <span className="text-2xl">📄</span>
                  <div>
                    <div className="font-bold text-xs text-[var(--text-main)]">A4 রিকুইজিশন শিট</div>
                    <div className="text-[10px] text-[var(--text-muted)]">পূর্ণাঙ্গ টেবিল, সাইন ও নোট সহ</div>
                  </div>
                </div>

                <div 
                  onClick={() => setPrintFormat("pos")}
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${printFormat === "pos" ? "border-[#0ea5e9] bg-[#0ea5e9]/10 shadow-sm" : "border-[var(--border-color)] bg-[var(--bg-main)] opacity-70 hover:opacity-100"}`}
                >
                  <span className="text-2xl">🧾</span>
                  <div>
                    <div className="font-bold text-xs text-[var(--text-main)]">৮০মিমি POS স্লিপ</div>
                    <div className="text-[10px] text-[var(--text-muted)]">পকেট সাইজ ক্যাশমেমো প্রিন্টার</div>
                  </div>
                </div>
              </div>
            </div>

            {/* RUNNER NAME */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)] block">২. সংগ্রহকারী কর্মচারীর নাম (ঐচ্ছিক):</label>
              <input 
                type="text" 
                placeholder="যেমন: রহিম / সজল..." 
                value={runnerName} 
                onChange={e => setRunnerName(e.target.value)}
                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)] text-sm rounded-xl px-4 py-3 outline-none focus:border-[#0ea5e9]"
              />
            </div>

            {/* PRINT SCOPE & GROUPING */}
            <div className="space-y-3 bg-[var(--bg-main)] border border-[var(--border-color)] p-4 rounded-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--text-main)]">প্রিন্ট হবে:</span>
                <span className="font-mono font-black text-[#0ea5e9]">
                  {selectedIds.length > 0 ? `নির্বাচিত ${selectedIds.length}টি অর্ডার (${getOrdersToPrint().reduce((s, o) => s + (parseInt(o.qty, 10) || 1), 0)} পিস)` : `সবগুলো ${filteredOrders.length}টি অর্ডার (${filteredOrders.reduce((s, o) => s + (parseInt(o.qty, 10) || 1), 0)} পিস)`}
                </span>
              </div>

              {selectedIds.length > 0 && (
                <div className="flex gap-4 pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-[var(--text-main)]">
                    <input type="radio" name="scope" checked={printScope === "selected" || printScope === "auto"} onChange={() => setPrintScope("selected")} />
                    শুধু নির্বাচিত ({selectedIds.length}টি)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-[var(--text-main)]">
                    <input type="radio" name="scope" checked={printScope === "all"} onChange={() => setPrintScope("all")} />
                    সবগুলো ({filteredOrders.length}টি)
                  </label>
                </div>
              )}

              <label className="flex items-center gap-2.5 pt-2 border-t border-[var(--border-color)] cursor-pointer text-xs font-semibold text-[var(--text-main)]">
                <input 
                  type="checkbox" 
                  checked={groupByMaterial} 
                  onChange={e => setGroupByMaterial(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#0ea5e9]"
                />
                ম্যাটেরিয়াল অনুযায়ী গ্রুপ করে সাজান (বাজারে ক্রয়ের সুবিধার্থে)
              </label>
            </div>

            {/* ACTIONS */}
            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setPrintModalOpen(false)}
                className="flex-1 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-[var(--border-color)] text-[var(--text-main)] hover:opacity-80 transition-all"
              >
                বাতিল
              </button>
              <button 
                type="button" 
                onClick={handlePrintExecution}
                className="flex-1 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] text-white hover:opacity-90 shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <span>🖨️</span> এখনই প্রিন্ট করুন
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}