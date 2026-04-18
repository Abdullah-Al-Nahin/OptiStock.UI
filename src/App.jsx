// src/App.jsx
import React, { useState, useMemo, useEffect } from "react";
import { C, GLASS_TYPES, fmtTk, today, makeKey, API_BASE_URL } from "./utils/constants"; 
import { useToast } from "./components/ToastContext"; 

// --- IMPORTING OUR MODULAR COMPONENTS ---
import Login from "./components/Login"; 
import Dashboard from "./components/Dashboard";
import StockEntry from "./components/StockEntry";
import Heatmap from "./components/Heatmap";
import Scanner from "./components/Scanner";
import InvoiceList from "./components/InvoiceList";
import Report from "./components/Report";
import StockBrowser from "./components/StockBrowser";
import LabelPrint from "./components/LabelPrint";
import AdminPanel from "./components/AdminPanel";
import Feedback from "./components/Feedback"; 
import { OptiLogo } from "./components/Icons"; 

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null, errorInfo: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { this.setState({ errorInfo }); console.error("Crash:", error, errorInfo); }
  render() {
    if (this.state.hasError) return (
      <div style={{padding:40,background:"#0a0e1a",color:"#f87171",minHeight:"100vh",fontFamily:"monospace"}}>
        <h2 style={{borderBottom:"1px solid #f8717140", paddingBottom:10}}>⚠️ OPTISTOCK CRASHED!</h2>
        <p style={{fontSize:18, marginTop:20}}><strong>Error:</strong> {this.state.error?.toString()}</p>
        <pre style={{marginTop:20,background:"#050810",padding:20,borderRadius:8, border:"1px solid #1a2540"}}>{this.state.errorInfo?.componentStack}</pre>
        <button onClick={() => window.location.reload()} style={{marginTop: 20, padding: "10px 20px", background: "#f87171", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold"}}>রিলোড করুন (Reload)</button>
      </div>
    );
    return this.props.children;
  }
}

const ALL_TABS = [
  {id:"dashboard", icon:"◈", label:"ড্যাশবোর্ড"},
  {id:"entry",     icon:"⊕", label:"স্টক এন্ট্রি"},
  {id:"heatmap",   icon:"⊞", label:"হিটম্যাপ"},
  {id:"scanner",   icon:"◫", label:"বারকোড স্ক্যানার"},
  {id:"print",     icon:"🏷️", label:"লেবেল প্রিন্ট"},
  {id:"invoices",  icon:"🧾", label:"ইনভয়েস তালিকা"},
  {id:"browser",   icon:"≡", label:"স্টক ব্রাউজার"},
  {id:"report",    icon:"◎", label:"রিপোর্ট"},
  {id:"admin",     icon:"⚙️", label:"অ্যাডমিন প্যানেল"},
  {id:"feedback",  icon:"💬", label:"ফিডব্যাক"} 
];

function MainApp({ authUser, onLogout }) {
  const toast = useToast(); 
  const [stock, setStock] = useState({});
  const [txns, setTxns] = useState([]);
  const [tab, setTab] = useState(authUser.allowedTabs[0] || "entry"); 
  const [loading, setLoading] = useState(true);

  // --- 🌐 FETCH CLOUD DATA WITH JWT 🌐 ---
  useEffect(() => {
    const fetchCloudData = async () => {
      setLoading(true);
      try {
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authUser.token}`
        };

        const txResponse = await fetch(`${API_BASE_URL}/api/Transactions?pageSize=100`, { headers }); 
        
        if (txResponse.ok) {
          const result = await txResponse.json();
          const cloudTxns = result.data || []; 
          
          const formattedTxns = cloudTxns.map(tx => ({
            ...tx,
            id: tx.id,
            date: tx.timestamp.split('T')[0], 
            time: new Date(tx.timestamp).toLocaleTimeString("en-GB").substring(0, 5), 
            glassType: tx.glassTypeId, 
            add: tx.add || "N/A"
          }));
          setTxns(formattedTxns);
        } else {
           if(txResponse.status === 401) onLogout();
           throw new Error("লেনদেন ডাটা লোড ব্যর্থ হয়েছে");
        }

        const stockResponse = await fetch(`${API_BASE_URL}/api/StockEntries`, { headers }); 
        
        if (stockResponse.ok) {
          const cloudStock = await stockResponse.json();
          const newStockState = {};
          
          cloudStock.forEach(entry => {
            if (!newStockState[entry.glassTypeId]) newStockState[entry.glassTypeId] = {};
            
            const formatPower = (num) => (num === 0 ? "0.00" : num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2));
            const sphStr = formatPower(entry.sph);
            const cylStr = formatPower(entry.cyl);
            const addStr = entry.add === 0 ? "0.00" : entry.add.toFixed(2);
            
            const inferredDesign = entry.add > 0 ? "progressive" : "single_vision";
            const key = makeKey(sphStr, cylStr, addStr, inferredDesign);
            
            newStockState[entry.glassTypeId][key] = entry.qty;
          });
          setStock(newStockState);
        } else {
           throw new Error("স্টক ডাটা লোড ব্যর্থ হয়েছে");
        }

      } catch (error) {
        console.error("Cloud Fetch Error:", error);
        toast.error("সার্ভারের সাথে কানেকশন বিচ্ছিন্ন হয়েছে!"); 
      } finally {
        setLoading(false);
      }
    };

    fetchCloudData();
  }, [authUser.token]); 

  const visibleTabs = ALL_TABS.filter(t => t.id === "feedback" || authUser.allowedTabs.includes(t.id));

  // --- 🌐 GLOBAL HEADER LIVE STATS (DYNAMIC) ---
  const stats = useMemo(() => {
    let total = 0; 
    Object.values(stock).forEach(glassObj => {
      Object.values(glassObj).forEach(qty => { if(qty > 0) total += qty; });
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const todayTx = txns.filter(t => t.date === todayStr);

    const sum = (arr, sub) => arr.filter(t => t.subtype === sub).reduce((s, t) => s + t.qty, 0);
    const sumIn = (arr) => arr.filter(t => t.direction === "in").reduce((s, t) => s + t.qty, 0);

    return {
      total, 
      todayPurchase: sumIn(todayTx), 
      todayWholesale: sum(todayTx, "sale"), 
      todayRetail: sum(todayTx, "use")
    };
  }, [stock, txns]);

  return (
    <div style={{fontFamily:"sans-serif", minHeight:"100vh", background:C.bg0, color:C.txt, overflowX:"hidden", width:"100%"}}>
      
      {/* GLOBAL HEADER */}
      <div style={{background:"rgba(10,14,26,0.8)", backdropFilter:"blur(12px)", borderBottom:"1px solid "+C.bdr, padding:"12px 24px", display:"flex", flexWrap:"wrap", alignItems:"center", gap:15, position:"sticky", top:0, zIndex:50}}>
        <OptiLogo className="w-8 h-8" />
        <div style={{flexGrow: 1}}>
          <div style={{fontSize:18, fontWeight:900, color:C.cyan, letterSpacing:"-0.5px"}}>OptiStock <span style={{fontSize:11, color:C.muted, fontWeight:500}}>PRO v6</span></div>
          <div style={{fontSize:8, color:"#4a5a70", fontWeight:900, letterSpacing:"2px", textTransform:"uppercase"}}>
             A <span style={{color:C.cyan}}>QUANTUM</span> Project
          </div>
        </div>
        
        {/* LIVE VIEW WIDGETS */}
        <div style={{display:"flex", gap:15, alignItems:"center", flexWrap:"wrap"}}>
          <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
            {[
              {l:"ক্রয়", v:stats.todayPurchase, c:C.green},
              {l:"পাইকারি", v:stats.todayWholesale, c:C.rose},
              {l:"খুচরা", v:stats.todayRetail, c:"#fb923c"}
            ].map(k => (
              <div key={k.l} style={{background:k.c+"11", border:"1px solid "+k.c+"33", borderRadius:8, padding:"4px 10px", textAlign:"center", minWidth:45}}>
                <div style={{fontSize:13, fontWeight:900, color:k.c}}>{k.v}</div>
                <div style={{fontSize:7, color:C.txts, fontWeight:"bold", textTransform:"uppercase"}}>{k.l}</div>
              </div>
            ))}
            <div style={{background:C.cyan+"11", border:"1px solid "+C.cyan+"44", borderRadius:8, padding:"4px 10px", textAlign:"center", minWidth:55, boxShadow:"0 0 15px "+C.cyan+"11"}}>
              <div style={{fontSize:13, fontWeight:900, color:C.cyan}}>{stats.total}</div>
              <div style={{fontSize:7, color:C.txts, fontWeight:"bold", textTransform:"uppercase"}}>মোট স্টক</div>
            </div>
          </div>

          <div style={{borderLeft:"1px solid #1a2540", paddingLeft:15, display:"flex", alignItems:"center", gap:12}}>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11, fontWeight:900, color:"#fff"}}>{authUser.name}</div>
              <div style={{fontSize:8, color: authUser.role === "Admin" ? C.purple : C.green, textTransform:"uppercase", fontWeight:900, letterSpacing:0.5}}>{authUser.role}</div>
            </div>
            <button onClick={onLogout} style={{background:"#1a2540", border:"1px solid #f8717133", color:"#f87171", padding:"6px 10px", borderRadius:8, cursor:"pointer", fontSize:10, fontWeight:"bold", transition:"all 0.2s"}} onMouseOver={(e)=>e.target.style.background="#f8717111"} onMouseOut={(e)=>e.target.style.background="#1a2540"}>
              লগআউট 🚪
            </button>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="custom-scrollbar" style={{display:"flex", background:C.bg1, borderBottom:"1px solid "+C.bdr, padding:"0 20px", overflowX:"auto", whiteSpace:"nowrap", WebkitOverflowScrolling:"touch", gap:5}}>
        {visibleTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} 
            style={{padding:"14px 20px", background:"none", border:"none", borderBottom:"3px solid "+(tab===t.id?C.cyan:"transparent"), cursor:"pointer", color:tab===t.id?C.cyan:C.muted, fontSize:12, fontWeight:tab===t.id?900:600, transition:"all 0.3s", display:"flex", alignItems:"center", gap:8}}>
            <span style={{opacity: tab===t.id?1:0.5, fontSize:14}}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* MAIN VIEW CONTENT */}
      <div style={{padding:24, maxWidth:1600, margin:"0 auto", width:"100%"}}>
        {tab === "dashboard" && <Dashboard stock={stock} txns={txns} />}
        {tab === "entry" && <StockEntry authUser={authUser} stock={stock} setStock={setStock} txns={txns} setTxns={setTxns} />}
        {tab === "heatmap" && <Heatmap authUser={authUser} stock={stock} setStock={setStock} txns={txns} setTxns={setTxns} />}
        {tab === "scanner" && <Scanner authUser={authUser} stock={stock} setStock={setStock} txns={txns} setTxns={setTxns} />}
        {tab === "print" && <LabelPrint stock={stock} />}
        {tab === "invoices" && <InvoiceList txns={txns} />}
        {tab === "browser" && <StockBrowser stock={stock} />}
        {tab === "report" && <Report txns={txns} />}
        {tab === "admin" && <AdminPanel authUser={authUser} />}
        {tab === "feedback" && <Feedback />}
      </div>
    </div>
  );
}

export default function App() {
  const [authUser, setAuthUser] = useState(() => {
    const saved = localStorage.getItem("optistock_user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogout = () => {
    localStorage.removeItem("optistock_user");
    setAuthUser(null);
  };

  return (
    <ErrorBoundary>
      {!authUser ? (
        <Login onLogin={setAuthUser} />
      ) : (
        <MainApp authUser={authUser} onLogout={handleLogout} />
      )}
    </ErrorBoundary>
  );
}