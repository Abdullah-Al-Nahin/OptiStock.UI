// src/components/AdminPanel.jsx
import { C } from "../utils/constants";
import React, { useState, useEffect } from "react";
import { useToast } from "./ToastContext"; 
import Skeleton from "./Skeleton"; 
import { OptiLogo } from "./Icons"; 

const PERMISSIONS = [
  { id: "dashboard", label: "ড্যাশবোর্ড (Dashboard)", icon: "◈" },
  { id: "entry", label: "স্টক এন্ট্রি (Stock Entry)", icon: "⊕" },
  { id: "heatmap", label: "হিটম্যাপ (Heatmap)", icon: "⊞" },
  { id: "scanner", label: "স্ক্যানার (Scanner)", icon: "◫" },
  { id: "print", label: "লেবেল প্রিন্ট (Label Print)", icon: "🏷️" },
  { id: "invoices", label: "ইনভয়েস (Invoices)", icon: "🧾" },
  { id: "browser", label: "ব্রাউজার (Browser)", icon: "≡" },
  { id: "report", label: "রিপোর্ট (Reports)", icon: "◎" }
];

const inp = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #1a2540", background: "#050810", color: "#dde6f0", fontSize: 13, outline: "none", transition: "all 0.2s" };
const lbl = { fontSize: 10, color: "#4a5a70", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".7px", fontWeight: 900 };

export default function AdminPanel({ authUser }) {
  const toast = useToast(); 
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "Staff", allowedTabs: [] });
  const [editPass, setEditPass] = useState({ username: null, val: "" });
  const [loading, setLoading] = useState(true);

  // Safe default for VITE API URL
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  // --- 🌐 FETCH USERS ---
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/Admin/users`, {
        headers: { "Authorization": `Bearer ${authUser.token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        if (response.status === 403) toast.error("403 Forbidden: আপনার এই ডাটা দেখার অনুমতি নেই!");
        else if (response.status === 401) toast.warning("401 Unauthorized: সেশন শেষ, আবার লগইন করুন।");
        else console.error("Server Error:", response.status);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
      toast.error("সার্ভারের সাথে কানেক্ট করা যাচ্ছে না!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authUser?.token) fetchUsers();
  }, [authUser]);

  const handleCheckbox = (id) => {
    setForm(prev => {
      const tabs = prev.allowedTabs.includes(id) ? prev.allowedTabs.filter(t => t !== id) : [...prev.allowedTabs, id];
      return { ...prev, allowedTabs: tabs };
    });
  };

  // --- 🌐 CREATE USER ---
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!form.name || !form.username || !form.password) return toast.warning("সব তথ্য পূরণ করুন!");
    if (form.role === "Staff" && form.allowedTabs.length === 0) return toast.warning("স্টাফদের অন্তত একটি মডিউলের পারমিশন দিতে হবে!");

    const newUserPayload = {
      employeeId: "EMP-" + Math.floor(100 + Math.random() * 900),
      name: form.name,
      username: form.username.toLowerCase(),
      passwordHash: form.password, 
      role: form.role,
      allowedTabs: form.role === "Admin" 
        ? "dashboard,entry,heatmap,scanner,print,invoices,browser,report,admin" 
        : form.allowedTabs.join(',')
    };

    try {
      // FIX: Removed the rogue "h" from the URL string
      const response = await fetch(`${API_URL}/api/Admin/users`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authUser.token}` 
        },
        body: JSON.stringify(newUserPayload)
      });

      if (response.ok) {
        toast.success("নতুন ইউজার সফলভাবে তৈরি হয়েছে!");
        fetchUsers(); 
        setForm({ name: "", username: "", password: "", role: "Staff", allowedTabs: [] });
      } else {
        if (response.status === 403) return toast.error("403 Forbidden: আপনার অ্যাকাউন্ট তৈরির অনুমতি নেই।");
        if (response.status === 401) return toast.warning("401 Unauthorized: সেশন শেষ, আবার লগইন করুন।");

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const errData = await response.json();
            if (errData.errors) {
                const firstError = Object.values(errData.errors)[0][0];
                toast.warning(`ডাটা সমস্যা: ${firstError}`);
            } else {
                toast.error(`${errData.message || "সার্ভার ডাটা গ্রহণ করেনি।"}`);
            }
        } else {
            toast.error(`সার্ভার এরর: HTTP ${response.status}`);
        }
      }
    } catch (err) {
      toast.error("নেটওয়ার্ক কানেকশন এরর! সার্ভার চালু আছে কিনা চেক করুন।");
    }
  };

  // --- 🌐 DELETE USER ---
  const handleDeleteUser = async (id, name, username) => {
    if (username === "admin") return toast.error("সুপার অ্যাডমিন ডিলিট করা সম্ভব নয়!");
    
    if (window.confirm(`আপনি কি নিশ্চিত যে আপনি ${name}-এর অ্যাকাউন্ট মুছে ফেলতে চান?`)) {
      try {
        const response = await fetch(`${API_URL}/api/Admin/users/${username}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${authUser.token}` }
        });
        
        if (response.ok) {
          toast.success("অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে!");
          fetchUsers();
        } else {
           if (response.status === 403) toast.error("403 Forbidden: ডিলিট করার অনুমতি নেই।");
           else if (response.status === 404) toast.warning("ইউজার খুঁজে পাওয়া যায়নি!");
           else toast.error(`ডিলিট ব্যর্থ হয়েছে: HTTP ${response.status}`);
        }
      } catch (err) { 
        toast.error("সার্ভার কানেকশন এরর!"); 
      }
    }
  };

  // --- 🌐 UPDATE PASSWORD ---
  const handleSavePassword = async (username) => {
    if (!editPass.val) return toast.warning("পাসওয়ার্ড ফাঁকা রাখা যাবে ক্যামনে?");
    
    try {
      const response = await fetch(`${API_URL}/api/Admin/users/${username}/password`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authUser.token}` 
        },
        body: JSON.stringify({ newPassword: editPass.val })
      });

      if (response.ok) {
        toast.success("পাসওয়ার্ড সফলভাবে আপডেট হয়েছে!");
        setEditPass({ username: null, val: "" }); 
      } else {
        toast.error("পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে!");
      }
    } catch (err) {
      toast.error("সার্ভার কানেকশন এরর!");
    }
  };

  // 🚀 SHOW SKELETON LOADERS WHILE FETCHING
  if (loading) {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-500 pb-10 flex flex-col gap-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-8">
          <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-6 shadow-2xl h-fit">
            <Skeleton className="h-6 w-64 mb-8 opacity-20 rounded" />
            <div className="grid grid-cols-2 gap-6 mb-6">
              <Skeleton className="h-12 w-full opacity-10 rounded-xl" />
              <Skeleton className="h-12 w-full opacity-10 rounded-xl" />
              <Skeleton className="h-12 w-full opacity-10 rounded-xl" />
              <Skeleton className="h-12 w-full opacity-10 rounded-xl" />
            </div>
            <Skeleton className="h-32 w-full opacity-10 rounded-xl mb-6" />
            <Skeleton className="h-14 w-full opacity-20 rounded-xl" />
          </div>
          <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-6 shadow-2xl h-[750px]">
            <Skeleton className="h-6 w-40 mb-6 opacity-20 rounded" />
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full opacity-10 rounded-xl" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 pb-10 flex flex-col gap-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-8">
        
        {/* LEFT: FORM */}
        <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-8 shadow-2xl h-fit">
          <h2 className="text-lg font-black text-[#0ea5e9] mb-8 flex items-center gap-2"><span>⚙️</span> নতুন এমপ্লয়ি অ্যাকাউন্ট তৈরি করুন</h2>
          
          <form onSubmit={handleCreateUser}>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <label style={lbl}>পুরো নাম</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={inp} placeholder="Rahim Uddin" className="focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/30" />
              </div>
              <div>
                <label style={lbl}>ইউজারনেম</label>
                <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value.toLowerCase()})} style={inp} placeholder="rahim_01" className="focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/30" />
              </div>
              <div>
                <label style={lbl}>পাসওয়ার্ড</label>
                <input type="text" value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={inp} placeholder="••••••••" className="focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/30" />
              </div>
              <div>
                <label style={lbl}>রোল</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value, allowedTabs: []})} style={inp} className="focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/30 cursor-pointer">
                  <option value="Staff">Staff (স্টাফ)</option>
                  <option value="Admin">Admin (অ্যাডমিন)</option>
                </select>
              </div>
            </div>

            <div className={`transition-all duration-500 overflow-hidden ${form.role === "Admin" ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"}`}>
              <div className="p-5 bg-[#050810] border border-[#1a2540] rounded-2xl mb-8">
                <label style={lbl}>মডিউল পারমিশন</label>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {PERMISSIONS.map(p => (
                    <label key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all active:scale-95 ${form.allowedTabs.includes(p.id) ? "bg-[#0ea5e9]/10 border-[#0ea5e9]/50 shadow-[0_0_10px_rgba(14,165,233,0.1)]" : "bg-[#0a0e1a] border-[#1a2540] hover:border-[#4a5a70]"}`}>
                      <input type="checkbox" checked={form.allowedTabs.includes(p.id)} onChange={() => handleCheckbox(p.id)} className="w-4 h-4 accent-[#0ea5e9] cursor-pointer" />
                      <span className={`text-xs font-black ${form.allowedTabs.includes(p.id) ? "text-[#0ea5e9]" : "text-[#94a3b8]"}`}>{p.icon} {p.label.split(' ')[0]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" className="w-full py-4 rounded-2xl font-black uppercase tracking-widest bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] text-white shadow-xl active:scale-95 transition-all hover:brightness-110">
              + অ্যাকাউন্ট তৈরি করুন
            </button>
          </form>
        </div>

        {/* RIGHT: LIST */}
        <div className="bg-[#0f1424] border border-[#1a2540] rounded-2xl p-6 shadow-2xl flex flex-col h-[750px]">
          <div className="flex justify-between items-center mb-6 border-b border-[#1a2540] pb-4">
            <h3 className="text-sm font-black text-[#e8f4ff] uppercase tracking-widest">👥 এমপ্লয়ি ডিরেক্টরি</h3>
            <span className="text-[10px] bg-[#1a2540] text-[#dde6f0] px-3 py-1.5 rounded-full font-black shadow-inner">Total: {users.length}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
            {users.map((u) => (
              <div key={u.username} className="bg-[#060f1e] border border-[#1a3a5c] p-4 rounded-2xl relative group transition-all hover:border-[#0ea5e9]/50 hover:shadow-[0_0_20px_rgba(14,165,233,0.05)]">
                {u.username !== "admin" && (
                  <button onClick={() => handleDeleteUser(u.employeeId, u.name, u.username)} className="absolute top-4 right-4 bg-[#f87171]/10 text-[#f87171] hover:bg-[#f87171] hover:text-white border border-[#f87171]/30 w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all active:scale-90">🗑️</button>
                )}
                
                <div className="flex justify-between items-start mb-4 pr-10">
                  <div>
                    <div className="text-sm font-black text-[#dde6f0]">{u.name}</div>
                    <div className="text-[10px] text-[#4a5568] font-mono font-bold mt-1">ID: {u.employeeId}</div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-md text-[9px] font-black border uppercase tracking-wider ${u.role === "Admin" ? "bg-[#c084fc]/10 text-[#c084fc] border-[#c084fc]/30" : "bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/30"}`}>{u.role}</div>
                </div>
                
                <div className="bg-[#050810] border border-[#1a2540] rounded-xl p-3 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#4a5a70] font-bold">User:</span><span className="text-[#0ea5e9] font-black">@{u.username}</span>
                  </div>
                  
                  {/* ✨ INLINE PASSWORD RESET UI */}
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#4a5a70] font-bold">Pass:</span>
                    {editPass.username === u.username ? (
                      <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                        <input 
                          type="text" 
                          value={editPass.val} 
                          onChange={e => setEditPass({...editPass, val: e.target.value})}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSavePassword(u.username);
                            if (e.key === 'Escape') setEditPass({username: null, val: ""});
                          }}
                          className="bg-[#0a0e1a] border border-[#0ea5e9] text-[#dde6f0] px-2 py-1 rounded text-[10px] w-24 outline-none focus:ring-1 focus:ring-[#0ea5e9] shadow-inner"
                          placeholder="New Pass..."
                          autoFocus
                        />
                        <button onClick={() => handleSavePassword(u.username)} className="bg-[#4ade80] text-black px-2 py-1 rounded font-black shadow-lg hover:bg-[#22c55e] active:scale-95 transition-all">সেভ</button>
                        <button onClick={() => setEditPass({username: null, val: ""})} className="text-[#f87171] hover:text-white px-2 font-bold bg-[#f87171]/10 rounded hover:bg-[#f87171] transition-all">✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[#f472b6] tracking-[0.2em]">••••••••</span>
                        <button onClick={() => setEditPass({username: u.username, val: ""})} className="text-[#0ea5e9] text-[10px] font-black hover:underline ml-2 uppercase tracking-widest bg-[#0ea5e9]/10 px-2 py-0.5 rounded">
                          রিসেট
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1a2540] mt-4">
                  <div className="flex flex-wrap gap-1.5">
                    {(u.allowedTabs || "").split(',').map(tab => {
                       if(!tab) return null;
                       return <span key={tab} className="bg-[#1a2540] text-[#c8dff0] px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider">{tab}</span>
                    })}
                  </div>
                </div>
              </div>
            ))}
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