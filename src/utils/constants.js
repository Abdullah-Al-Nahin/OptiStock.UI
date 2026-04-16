// src/utils/constants.js
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const GLASS_TYPES = [
  { id:"white",        name:"হোয়াইট",       sub:"সাধারণ সাদা",         accent:"#94a3b8", bg:"#0d1117", tag:"WH" },
  { id:"bluecut",      name:"ব্লু কাট",      sub:"Blue Cut / Anti-UV",   accent:"#38bdf8", bg:"#040e1a", tag:"BC" },
  { id:"photosun",     name:"ফটোক্রোমিক",   sub:"Photochromic",          accent:"#fbbf24", bg:"#140e00", tag:"PS" },
  { id:"mc",           name:"এমসি",          sub:"MC / Multi-Coat",       accent:"#4ade80", bg:"#001208", tag:"MC" },
  { id:"progressive",  name:"প্রগ্রেসিভ",   sub:"Progressive / Varilux", accent:"#c084fc", bg:"#0a0515", tag:"PR" },
  { id:"bifocal_moon", name:"মুন বাইফোকাল",  sub:"Moon Bifocal",          accent:"#fb923c", bg:"#130600", tag:"BM" },
  { id:"bifocal_d",    name:"ডি-বাইফোকাল",   sub:"D-Bifocal",             accent:"#f472b6", bg:"#160010", tag:"BD" },
];

export const IN_SUB  = [{id:"import",label:"আমদানি",icon:"🚢"},{id:"purchase",label:"ক্রয়",icon:"🛒"}];
export const OUT_SUB = [{id:"sale",label:"পাইকারি",icon:"💰"},{id:"use",label:"খুচরা",icon:"🏪"},{id:"broken",label:"ভাঙা",icon:"💔"}];

export const SM = {
  import:  {label:"আমদানি", icon:"🚢", color:"#2dd4bf", dir:"in"},
  purchase:{label:"ক্রয়", icon:"🛒", color:"#4ade80", dir:"in"},
  sale:    {label:"পাইকারি", icon:"💰", color:"#fb7185", dir:"out"},
  use:     {label:"খুচরা", icon:"🏪", color:"#fb923c", dir:"out"},
  broken:  {label:"ভাঙা", icon:"💔", color:"#e879f9", dir:"out"},
};

const buildSPH = () => { const r=[]; for(let i=-2000;i<=2000;i+=25) r.push({value:i/100,label:(i>=0?"+":"")+(i/100).toFixed(2)}); return r; };
const buildCYL = () => { const r=[{value:0,label:"0.00 (Sph Only)"}]; for(let i=25;i<=600;i+=25) r.push({value:i/100,label:"+"+(i/100).toFixed(2)}); for(let i=-25;i>=-600;i-=25) r.push({value:i/100,label:(i/100).toFixed(2)}); return r; };
const buildADD = () => { const r=[{value:0,label:"N/A"}]; for(let i=75;i<=400;i+=25) r.push({value:i/100,label:"+"+(i/100).toFixed(2)}); return r; };

export const SPH_LIST = buildSPH(); 
export const CYL_LIST = buildCYL(); 
export const ADD_LIST = buildADD();

export const C = { 
  bg0:"#050810", bg1:"#0a0e1a", bg2:"#0f1424", bdr:"#1a2540", 
  cyan:"#22d3ee", green:"#4ade80", teal:"#2dd4bf", red:"#f87171", 
  rose:"#fb7185", yellow:"#fbbf24", purple:"#c084fc", pink:"#e879f9", 
  muted:"#4a5568", txt:"#dde6f0", txts:"#4a5a70", faint:"#0f1828"
};

// V6 Fix: Bulletproof Key Generator (Strips formatting so strings never mismatch)
export const makeKey = (sph, cyl, add, design = "single_vision") => {
  const s = (Number(sph) || 0).toFixed(2);
  const c = (Number(cyl) || 0).toFixed(2);
  const a = (Number(add) || 0).toFixed(2);
  return `${s}|${c}|${a}|${design}`;
};

// V6 Fix: Re-formats the key back into beautiful UI text when reading from DB
export const parseKey = (k) => { 
  const [sph,cyl,add,design] = k.split("|"); 
  const s = Number(sph); const c = Number(cyl); const a = Number(add);
  return {
    sph: (s>0?"+":"")+s.toFixed(2), 
    cyl: (c>0?"+":"")+c.toFixed(2), 
    add: (a>0?"+":"")+a.toFixed(2), 
    design: design || "single_vision"
  }; 
};

export const fmtTk = (n) => n ? "৳"+parseFloat(n).toLocaleString("en",{minimumFractionDigits:2,maximumFractionDigits:2}) : "—";
export const today = new Date().toISOString().split("T")[0];

const DESIGN_TAGS = { single_vision:"", bifocal_moon:"-BM", bifocal_d:"-BD", progressive:"-PR", high_index:"-HI", polycarbonate:"-PC" };

export const genBC = (tag, sph, cyl, add, design = "single_vision") => {
  const n = parseFloat(sph) || 0; 
  const cn = Math.abs(Math.round((parseFloat(cyl)||0)*100)).toString().padStart(3,"0");
  const sp = (n>=0?"P":"M")+Math.abs(Math.round(n*100)).toString().padStart(3,"0"); 
  const an = parseFloat(add)||0;
  const dTag = DESIGN_TAGS[design] || "";
  return `${tag||"XX"}-${sp}-C${cn}${an>0 ? "-A"+Math.round(an*100).toString().padStart(3,"0") : ""}${dTag}`;
};

export function buildUPCEBars(str) {
  const L_PAT = [[3,2,1,1],[2,2,2,1],[2,1,2,2],[1,4,1,1],[1,1,3,2],[1,2,3,1],[1,1,1,4],[1,3,1,2],[1,2,1,3],[3,1,1,2]];
  const G_PAT = L_PAT.map(p => [...p].reverse());
  const UPCE_PARITY = [[0,0,0,1,1,1],[0,0,1,0,1,1],[0,0,1,1,0,1],[0,0,1,1,1,0],[0,1,0,0,1,1],[0,1,1,0,0,1],[0,1,1,1,0,0],[0,1,0,1,0,1],[0,1,0,1,1,0],[0,1,1,0,1,0]];
  let h = 5381; for(let i=0;i<(str||"").length;i++) h=((h<<5)+h+(str||"").charCodeAt(i))&0x7fffffff;
  const d = []; for(let i=0;i<6;i++){ h=(h*1664525+1013904223)&0x7fffffff; d.push(Math.abs(h)%10); }
  const check = (10 - (((d[0]+d[2]+d[4])*3 + (d[1]+d[3]+d[5])) % 10)) % 10;
  const bars = [{u:1,dark:true},{u:1,dark:false},{u:1,dark:true}];
  d.forEach((digit, i) => { (UPCE_PARITY[check][i]===1?G_PAT[digit]:L_PAT[digit]).forEach((u, j) => bars.push({u, dark: j%2===0})); });
  [1,1,1,1,1,1].forEach((u, i) => bars.push({u, dark: i%2!==0}));
  return { bars, digits: d, check };
}
// --- RBAC MOCK DATABASE (For testing Login & Permissions) ---
export const MOCK_USERS = [
  {
    id: "EMP-001",
    name: "অ্যাডমিন (Super Admin)",
    username: "admin",
    password: "123", // In production, this is hashed by C#
    role: "Admin",
    // Admin gets access to everything
    allowedTabs: ["dashboard", "entry", "heatmap", "scanner", "print", "invoices", "browser", "report", "admin"]
  },
  {
    id: "EMP-002",
    name: "করিম (Staff)",
    username: "karim",
    password: "123",
    role: "Staff",
    // Karim is restricted! He cannot see the Heatmap, Dashboard, or Reports.
    allowedTabs: ["entry", "scanner", "print", "invoices"] 
  }
];