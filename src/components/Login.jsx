import React, { useState } from "react";
import { OptiLogo } from "./Icons";
import { useToast } from "./ToastContext";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // Safe default for VITE API URL
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/Auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "লগইন ব্যর্থ হয়েছে");
      }

      const userData = await response.json();
      localStorage.setItem("optistock_user", JSON.stringify(userData));
      
      toast.success(`স্বাগতম, ${userData.name}!`);
      onLogin(userData);

    } catch (err) {
      toast.error(err.message || "সার্ভার কানেকশন এরর!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050810] relative overflow-hidden font-sans">
      
      {/* --- QUANTUM BACKGROUND ANIMATION --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-[#0ea5e9] rounded-full blur-[120px] opacity-[0.07] animate-drift-slow"></div>
        <div className="absolute bottom-[10%] right-[20%] w-[600px] h-[600px] bg-[#c084fc] rounded-full blur-[150px] opacity-[0.05] animate-drift-reverse"></div>
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `linear-gradient(#dde6f0 1px, transparent 1px), linear-gradient(90deg, #dde6f0 1px, transparent 1px)`, backgroundSize: '40px 40px' }}></div>
      </div>

      {/* --- LOGIN CARD --- */}
      <div className="group bg-[#0a0e1a]/80 backdrop-blur-2xl border border-[#1a2540] p-10 rounded-[2.5rem] shadow-[0_25px_80px_-15px_rgba(0,0,0,0.7)] w-full max-w-md z-10 animate-in zoom-in-95 duration-700 relative overflow-hidden">
        
        {/* ✨ NEW: TOP RIGHT INFO ICON & TOOLTIP */}
        <div className="absolute top-6 right-6 z-20">
          <div className="relative flex items-center justify-center group/info">
            {/* The Icon */}
            <div className="w-6 h-6 rounded-full border border-[#1a2540] text-[#4a5a70] flex items-center justify-center text-[10px] font-black cursor-help transition-all group-hover/info:border-[#0ea5e9] group-hover/info:text-[#0ea5e9] bg-[#050810]">
              i
            </div>
            
            {/* The Tooltip Card */}
            <div className="absolute top-full right-0 mt-3 w-48 p-4 bg-[#0f172a] border border-[#1e293b] rounded-2xl shadow-2xl opacity-0 scale-95 translate-y-2 pointer-events-none group-hover/info:opacity-100 group-hover/info:scale-100 group-hover/info:translate-y-0 transition-all duration-300 backdrop-blur-xl">
               <div className="text-[10px] font-black text-[#0ea5e9] uppercase tracking-widest mb-1">About Us</div>
               <div className="text-xs font-bold text-[#dde6f0] leading-relaxed">
                 QUANTUM is a specialized industrial software lab.
               </div>
               {/* Tiny Arrow */}
               <div className="absolute -top-1 right-2 w-2 h-2 bg-[#0f172a] border-t border-l border-[#1e293b] rotate-45"></div>
            </div>
          </div>
        </div>

        {/* Logo & Branding */}
        <div className="text-center mb-10 relative">
          <div className="relative inline-block mb-4">
             <div className="absolute inset-0 bg-[#0ea5e9] blur-2xl opacity-20 animate-pulse"></div>
             <OptiLogo className="w-16 h-16 relative" />
          </div>
          <h1 className="text-3xl font-black text-[#e8f4ff] tracking-tighter uppercase">
            OptiStock <span className="text-[#0ea5e9]">PRO</span>
          </h1>
          <p className="text-[10px] text-[#4a5a70] uppercase font-black tracking-[0.3em] mt-2">
            Secure Access Portal
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] text-[#4a5a70] uppercase tracking-widest font-black mb-2 ml-1">
              ইউজারনেম (Username)
            </label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#050810]/50 border border-[#1a2540] text-[#dde6f0] px-5 py-4 rounded-2xl focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/20 transition-all placeholder:opacity-20 text-sm"
              placeholder="e.g. admin"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] text-[#4a5a70] uppercase tracking-widest font-black mb-2 ml-1">
              পাসওয়ার্ড (Password)
            </label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#050810]/50 border border-[#1a2540] text-[#dde6f0] px-5 py-4 rounded-2xl focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/20 transition-all placeholder:opacity-20 text-sm"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all text-xs text-white shadow-xl active:scale-95
              ${loading 
                ? 'bg-[#1a2540] text-[#4a5a70] cursor-not-allowed' 
                : 'bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] hover:shadow-[#0ea5e9]/20 hover:brightness-110'
              }`}
          >
            {loading ? "ভেরিফাই করা হচ্ছে..." : "লগইন করুন (Login)"}
          </button>
        </form>

        <div className="mt-12 pt-6 border-t border-[#1a2540]/50 text-center">
          <div className="text-[10px] text-[#4a5568] font-black tracking-[0.4em] uppercase">
            A <span className="text-[#0ea5e9]">QUANTUM</span> Project
          </div>
        </div>
      </div>

      <style>{`
        @keyframes drift-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -50px) scale(1.1); }
        }
        @keyframes drift-reverse {
          0%, 100% { transform: translate(0, 0) scale(1.1); }
          50% { transform: translate(-40px, 40px) scale(1); }
        }
        .animate-drift-slow { animation: drift-slow 15s ease-in-out infinite; }
        .animate-drift-reverse { animation: drift-reverse 20s ease-in-out infinite; }
      `}</style>
    </div>
  );
}