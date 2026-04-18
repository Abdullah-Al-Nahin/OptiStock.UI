// src/components/Feedback.jsx
import React, { useState, useRef } from "react";
import { useToast } from "./ToastContext"; 

const inp = { width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid #1a2540", background: "#050810", color: "#dde6f0", fontSize: 13, outline: "none", transition: "all 0.2s" };
const lbl = { fontSize: 10, color: "#4a5a70", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".7px", fontWeight: 900 };

export default function Feedback() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState(""); // 👈 NEW: Email state
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const fileInputRef = useRef(null);

  // --- Handle File Selection & Preview ---
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.warning("ফাইল সাইজ ৫ এমবি এর নিচে হতে হবে!");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Submit Natively to the Iframe ---
  const handleSubmit = (e) => {
    // 👈 NEW: Added email to the validation check
    if (!name.trim() || !email.trim() || !message.trim()) {
      e.preventDefault(); 
      toast.warning("নাম, ইমেইল এবং সমস্যার বিবরণ লিখতে হবে!");
      return;
    }
    
    setLoading(true);
    setSubmitted(true);
  };

  // This fires when the invisible iframe finishes receiving the FormSubmit "Thank You" page
  const handleIframeLoad = () => {
    if (submitted) {
      toast.success("ফিডব্যাক এবং স্ক্রিনশট সফলভাবে পাঠানো হয়েছে!");
      setLoading(false);
      setSubmitted(false);
      setName("");
      setEmail(""); // 👈 NEW: Reset email field
      setMessage("");
      removeFile();
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 pb-10 flex flex-col items-center">
      
      {/* 🚀 THE SECRET IFRAME */}
      <iframe name="hidden_iframe" id="hidden_iframe" style={{ display: "none" }} onLoad={handleIframeLoad}></iframe>

      <div className="bg-[#0f1424] border border-[#1a2540] rounded-[2rem] p-10 shadow-2xl w-full max-w-2xl relative overflow-hidden">
        
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#f43f5e] rounded-full blur-[120px] opacity-[0.05] pointer-events-none"></div>

        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-[#e8f4ff] mb-2 uppercase tracking-wide">
            বাগ রিপোর্ট ও ফিডব্যাক
          </h2>
          <p className="text-xs text-[#4a5a70] tracking-wider uppercase font-bold">
            Direct Line to Quantum Labs
          </p>
        </div>

        {/* 🚀 NATIVE HTML FORM */}
        <form 
          action="https://formsubmit.co/0quantumlabs@gmail.com" 
          method="POST" 
          encType="multipart/form-data" 
          target="hidden_iframe"
          onSubmit={handleSubmit}
          className="space-y-6 relative z-10"
        >
          {/* FORMSUBMIT CONFIGURATIONS */}
          <input type="hidden" name="_subject" value="OptiStock Beta: Bug Report with Screenshot 📸" />
          <input type="hidden" name="_captcha" value="false" />
          <input type="hidden" name="_template" value="table" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label style={lbl}>আপনার নাম (Name) <span className="text-[#f43f5e]">*</span></label>
              <input 
                type="text" 
                name="Name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required 
                style={inp} 
                placeholder="Beta Tester Name" 
                className="focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/30"
              />
            </div>

            {/* 👈 NEW: Email Input Field */}
            <div>
              <label style={lbl}>আপনার ইমেইল (Email) <span className="text-[#f43f5e]">*</span></label>
              <input 
                type="email" 
                name="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                style={inp} 
                placeholder="tester@example.com" 
                className="focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/30"
              />
            </div>
          </div>

          <div>
            <label style={lbl}>সমস্যার বিবরণ (Problem Description) <span className="text-[#f43f5e]">*</span></label>
            <textarea 
              name="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows="5" 
              style={{...inp, resize: "none"}} 
              placeholder="Please describe what happened..."
              className="focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/30 custom-scrollbar"
            ></textarea>
          </div>

          <div>
            <label style={lbl}>স্ক্রিনশট (Optional - Up to 5MB)</label>
            
            {previewUrl ? (
              <div className="relative inline-block border border-[#1a2540] rounded-xl overflow-hidden group shadow-lg">
                <img src={previewUrl} alt="Preview" className="h-32 w-auto object-cover opacity-80" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <button type="button" onClick={removeFile} className="bg-[#f43f5e] text-white px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95 shadow-xl">
                    রিমুভ করুন (Remove)
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#050810] border border-dashed border-[#1a2540] rounded-2xl p-6 text-center hover:border-[#0ea5e9]/50 transition-all group">
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center gap-3 w-full h-full">
                  <div className="w-12 h-12 rounded-full bg-[#0a0e1a] border border-[#1a2540] flex items-center justify-center group-hover:bg-[#0ea5e9]/10 group-hover:text-[#0ea5e9] transition-all text-xl">
                    📸
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#dde6f0]">ছবি নির্বাচন করুন</span>
                    <p className="text-[10px] text-[#4a5a70] mt-1">PNG, JPG (Max 5MB)</p>
                  </div>
                </label>
              </div>
            )}
            
            <input 
              id="file-upload"
              type="file" 
              name="attachment" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg" 
              style={{ display: "none" }} 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full mt-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all text-xs text-white shadow-xl
              ${loading 
                ? 'bg-[#1a2540] text-[#4a5a70] cursor-not-allowed' 
                : 'bg-gradient-to-r from-[#e11d48] to-[#f43f5e] hover:shadow-[#f43f5e]/20 hover:brightness-110 active:scale-95'
              }`}
          >
            {loading ? "ছবি ও ইমেইল আপলোড হচ্ছে..." : "রিপোর্ট সাবমিট করুন"}
          </button>

          <p className="text-[9px] text-[#4a5568] text-center font-bold uppercase tracking-widest mt-4">
            🔒 Uses standard POST protocol to preserve image attachments.
          </p>
        </form>
      </div>
    </div>
  );
}