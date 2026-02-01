import { useState } from "react";
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  signOut 
} from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  // --- UI & STEP CONTROL STATES ---
  const [role, setRole] = useState("");
  const [method, setMethod] = useState("phone");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); 
  
  // New State for optional business name
  const [hasBusiness, setHasBusiness] = useState(false);

  // --- DATA STATES ---
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    phoneNumber: "+63",
    firstName: "",
    lastName: "",
    sitio: "", 
    businessName: "",
  });

  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);

  // --- STATIC DATA: BARANGAY BOGTONG PUROKS ---
  const PUROK_LIST = [
    "Sagur", "Ampungan", "Centro 1", "Centro 2", "Centro 3", "Bypass Road", "Boundary"
  ];

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const checkDuplicate = async (field, value) => {
    const qApp = query(collection(db, "applicants"), where(field, "==", value));
    const qEmp = query(collection(db, "employers"), where(field, "==", value));
    const [snapApp, snapEmp] = await Promise.all([getDocs(qApp), getDocs(qEmp)]);
    return !snapApp.empty || !snapEmp.empty;
  };

  const setupRecaptcha = (containerId) => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { 
        size: "invisible"
      });
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (formData.phoneNumber.length < 12) return alert("Invalid phone number.");
    setLoading(true);
    
    try {
      const exists = await checkDuplicate("contact", formData.phoneNumber);
      if (exists) {
        alert("Phone number already registered.");
        setLoading(false);
        return;
      }
      
      setupRecaptcha("recaptcha-container-reg");
      const confirmation = await signInWithPhoneNumber(auth, formData.phoneNumber, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
    } catch (err) { 
      console.error(err);
      alert(err.message); 
      if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
      setStep(3); 
    } catch (err) { 
      alert("Invalid OTP code. Please try again."); 
    }
    setLoading(false);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let userUid;

      if (method === "email") {
        const exists = await checkDuplicate("contact", formData.email);
        if (exists) {
          alert("Email already in use.");
          setLoading(false);
          return;
        }
        const res = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        userUid = res.user.uid;
        await sendEmailVerification(res.user);
      } else {
        userUid = auth.currentUser.uid;
      }

      const collectionName = role === "applicant" ? "applicants" : "employers";
      
      await setDoc(doc(db, collectionName, userUid), {
        uid: userUid,
        role: role,
        firstName: formData.firstName,
        lastName: formData.lastName,
        contact: method === "email" ? formData.email : formData.phoneNumber,
        sitio: formData.sitio,
        createdAt: new Date().toISOString(),
        // Only save business name if the toggle was checked
        ...(role === "employer" && hasBusiness && { businessName: formData.businessName })
      });

      await signOut(auth);
      alert(method === "email" 
        ? "Success! Please verify your email before logging in." 
        : "Success! Registration complete. Please log in."
      );
      navigate("/login");
    } catch (err) { 
      console.error(err);
      alert(err.message); 
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-gray-800 font-sans overflow-x-hidden relative">
      
      {/* HEADER */}
      <header className="w-full h-20 bg-white/70 backdrop-blur-xl border-b border-slate-100 fixed top-0 left-0 z-50 flex items-center">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 flex justify-center sm:justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-blue-900 shrink-0 cursor-pointer" onClick={() => navigate("/")}>
            LIVELI<span className="text-blue-500">MATCH</span>
          </h1>
        </div>
      </header>

      {/* BACKGROUND DECORATIONS */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 -left-20 w-125 h-125 bg-blue-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-15 animate-blob"></div>
        <div className="absolute bottom-0 -right-20 w-125 h-125 bg-purple-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-15 animate-blob animation-delay-2000"></div>
      </div>

      {/* MAIN CONTENT */}
      <main className="grow flex items-center justify-center pt-24 sm:pt-32 pb-12 px-4 relative z-10">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-2xl rounded-[3rem] sm:rounded-[3.5rem] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.08)] p-8 sm:p-12 border border-white relative z-20">
          
          {/* NAVIGATION */}
          {step > 1 && (
            <button 
              onClick={() => setStep(step - 1)} 
              className="absolute left-10 top-10 text-slate-400 hover:text-blue-900 text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              ← Back
            </button>
          )}

          {/* STEP INDICATOR */}
          <div className="flex justify-center space-x-2 mb-10 mt-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-700 ${step >= s ? 'w-8 bg-blue-900' : 'w-2 bg-slate-100'}`} />
            ))}
          </div>

          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {step === 1 && "Start Your Journey"}
              {step === 2 && "Security Check"}
              {step === 3 && "Your Location"}
              {step === 4 && "Final Profile"}
            </h2>
            <p className="text-blue-600 text-[10px] mt-2 font-black uppercase tracking-[0.2em]">
              Step {step} of 4
            </p>
          </div>

          {/* STEP 1: ROLE */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={() => setRole("applicant")} 
                    className={`group py-8 rounded-[2.5rem] border-2 transition-all duration-500 font-black flex flex-col items-center gap-3
                    ${role === 'applicant' 
                        ? 'border-blue-900 bg-blue-50 text-blue-900 scale-[1.05] shadow-xl shadow-blue-900/10' 
                        : 'border-slate-100 bg-slate-50/50 text-slate-400 hover:border-blue-200'}`}
                >
                    <span className="text-4xl group-hover:scale-110 transition-transform">👷</span>
                    <span className="text-[10px] uppercase tracking-widest">Job Seeker</span>
                </button>

                <button 
                    onClick={() => setRole("employer")} 
                    className={`group py-8 rounded-[2.5rem] border-2 transition-all duration-500 font-black flex flex-col items-center gap-3
                    ${role === 'employer' 
                        ? 'border-blue-900 bg-blue-50 text-blue-900 scale-[1.05] shadow-xl shadow-blue-900/10' 
                        : 'border-slate-100 bg-slate-50/50 text-slate-400 hover:border-blue-200'}`}
                >
                    <span className="text-4xl group-hover:scale-110 transition-transform">💼</span>
                    <span className="text-[10px] uppercase tracking-widest">Employer</span>
                </button>
              </div>

              {role && (
                <div className="space-y-4 animate-in zoom-in-95 duration-500">
                  <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
                    <button onClick={() => setMethod("phone")} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${method === 'phone' ? 'bg-white text-blue-900 shadow-md' : 'text-slate-400'}`}>PHONE</button>
                    <button onClick={() => setMethod("email")} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${method === 'email' ? 'bg-white text-blue-900 shadow-md' : 'text-slate-400'}`}>EMAIL</button>
                  </div>
                  <button onClick={() => setStep(2)} className="w-full py-5 bg-blue-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/30 active:scale-95 transition-all">Continue</button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SECURITY */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
              {method === "email" ? (
                <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Email Address</label>
                    <input name="email" type="email" placeholder="name@example.com" required className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-900 transition-all font-medium" onChange={handleInputChange} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Password</label>
                    <div className="relative">
                      <input name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" required className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-900 transition-all font-medium" onChange={handleInputChange} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-600 uppercase">{showPassword ? "Hide" : "Show"}</button>
                    </div>
                  </div>
                  <button type="submit" className="w-full py-5 bg-blue-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/30 active:scale-95 transition-all">Next Step</button>
                </form>
              ) : (
                <div className="space-y-4">
                  {!confirmationResult ? (
                    <form onSubmit={handleSendOtp} className="space-y-5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Phone Number</label>
                        <input name="phoneNumber" type="tel" value={formData.phoneNumber} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-900 font-bold tracking-wider" onChange={handleInputChange} />
                      </div>
                      <div id="recaptcha-container-reg"></div>
                      <button disabled={loading} className="w-full py-5 bg-blue-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/30 active:scale-95 transition-all">
                        {loading ? "Sending..." : "Send Code"}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-6 text-center">
                      <p className="text-xs font-bold text-slate-400">Code sent to <span className="text-blue-900">{formData.phoneNumber}</span></p>
                      <input type="text" placeholder="000000" maxLength="6" className="w-full px-5 py-5 border-2 border-blue-100 rounded-2xl text-center text-4xl font-black tracking-[0.5em] outline-none focus:border-blue-900 bg-blue-50/30 text-blue-900" onChange={(e) => setOtp(e.target.value)} />
                      <button disabled={loading} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-green-600/30 active:scale-95 transition-all">Verify OTP</button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: LOCATION (UPDATED PUROKS) */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-2 gap-3">
                {PUROK_LIST.map((sName) => {
                  return (
                    <button key={sName} onClick={() => setFormData({ ...formData, sitio: sName })} className={`py-4 rounded-2xl border-2 font-black text-xs transition-all tracking-widest ${formData.sitio === sName ? 'border-blue-900 bg-blue-50 text-blue-900 shadow-md scale-105' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}>
                      {sName.toUpperCase()}
                    </button>
                  );
                })}
              </div>
              <button disabled={!formData.sitio} onClick={() => setStep(4)} className="w-full py-5 bg-blue-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/30 active:scale-95 transition-all disabled:opacity-30">Confirm Location</button>
            </div>
          )}

          {/* STEP 4: PROFILE */}
          {step === 4 && (
            <form onSubmit={handleFinalSubmit} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">First Name</label>
                  <input name="firstName" required placeholder="John" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-900 transition-all font-medium" onChange={handleInputChange} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Last Name</label>
                  <input name="lastName" required placeholder="Doe" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-900 transition-all font-medium" onChange={handleInputChange} />
                </div>
              </div>
              
              {role === "employer" && (
                <div className="space-y-4">
                    {/* TOGGLE FOR BUSINESS NAME */}
                    <div 
                        onClick={() => setHasBusiness(!hasBusiness)} 
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${hasBusiness ? 'border-blue-900 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}
                    >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${hasBusiness ? 'bg-blue-900 border-blue-900' : 'border-slate-300'}`}>
                            {hasBusiness && <span className="text-white text-xs font-bold">✓</span>}
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-widest ${hasBusiness ? 'text-blue-900' : 'text-slate-400'}`}>I have a registered business</span>
                    </div>

                    {hasBusiness && (
                        <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                            <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Company Name</label>
                            <input name="businessName" required placeholder="Bogtong Enterprises" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-900 transition-all font-medium" onChange={handleInputChange} />
                        </div>
                    )}
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-4 text-center">
                <p className="text-[9px] text-blue-800 font-black uppercase leading-relaxed tracking-wider">
                  You are registering as a {role}.
                </p>
              </div>
              <button disabled={loading} className="w-full py-5 bg-blue-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/30 active:scale-95 transition-all">
                {loading ? "Registering..." : "Complete Registration"}
              </button>
            </form>
          )}

          <div className="mt-10 text-center border-t border-slate-100 pt-8">
            <p className="text-xs font-bold text-slate-400">Already have an account? <span onClick={() => navigate("/login")} className="text-blue-600 ml-1 cursor-pointer font-black hover:underline">Sign In</span></p>
          </div>
        </div>
      </main>

      {/* MATCHED FOOTER */}
      <footer className="bg-slate-50 py-12 border-t border-slate-100 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <p className="text-xl font-black text-blue-900 tracking-tighter">LIVELI<span className="text-blue-500">MATCH</span></p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">© 2026 Barangay Bogtong Livelihood Portal</p>
          </div>
          <div className="flex gap-10">
            <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-900 transition-colors">Privacy Policy</button>
            <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-900 transition-colors">Terms of Use</button>
            <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-900 transition-colors">Help Center</button>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 10s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
      `}} />
    </div>
  );
}