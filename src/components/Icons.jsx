import React from "react";

export const OptiLogo = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Outer Lens Ring */}
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" className="text-[#0ea5e9] opacity-20" />
    <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#0ea5e9]" />
    
    {/* Inner Precision Iris */}
    <path d="M12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#22d3ee]" />
    
    {/* Quantum Beam */}
    <path d="M14 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#4ade80]" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" className="text-[#4ade80]" />
    
    {/* Tech Accents */}
    <path d="M12 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-[#0ea5e9] opacity-40" />
    <path d="M12 20V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-[#0ea5e9] opacity-40" />
  </svg>
);