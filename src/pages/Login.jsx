import { useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  signInWithPhoneNumber, 
  RecaptchaVerifier,
  signOut
} from "firebase/auth";
import { auth, db } from "../firebase/config";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { EnvelopeIcon, PhoneIcon, ArrowRightOnRectangleIcon, EyeIcon, EyeSlashIcon, LockClosedIcon } from "@heroicons/react/24/outline";

export default function Login() {
  const navigate = useNavigate();
  const [method, setMethod] = useState("email");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [identifier, setIdentifier] = useState(""); 
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    setIdentifier("");
    setConfirmationResult(null);
    setOtp("");
    clearRecaptcha();
  }, [method]);

  const clearRecaptcha = () => {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
    const container = document.getElementById("recaptcha-container-login");
    if (container) container.innerHTML = "";
  };

  const formatPhone = (input) => {
    if (!input) return "";
    let num = input.replace(/\D/g, ''); 
    return "+63" + num;
  };

  const checkUserExists = async (contactValue) => {
    const finalIdentifier = method === "phone" ? formatPhone(contactValue) : contactValue;
    const searchField = method === "email" ? "email" : "contact";
    
    const qApp = query(collection(db, "applicants"), where(searchField, "==", finalIdentifier));
    const qEmp = query(collection(db, "employers"), where(searchField, "==", finalIdentifier));
    const qAdmin = query(collection(db, "admins"), where("email", "==", finalIdentifier));

    const [snapApp, snapEmp, snapAdmin] = await Promise.all([getDocs(qApp), getDocs(qEmp), getDocs(qAdmin)]);
    
    return !snapApp.empty || !snapEmp.empty || !snapAdmin.empty;
  };

  const routeUserToDashboard = async (uid) => {
    try {
        const adminRef = doc(db, "admins", uid);
        const adminSnap = await getDoc(adminRef);
        if (adminSnap.exists()) return navigate("/admin-dashboard");

        const appRef = doc(db, "applicants", uid);
        const appSnap = await getDoc(appRef);
        if (appSnap.exists()) {
            const data = appSnap.data();
            if (data.status === "pending" || data.verificationStatus === "pending") {
                await signOut(auth); 
                setShowPendingModal(true); 
                return;
            }
            return navigate("/applicant-dashboard");
        }

        const empRef = doc(db, "employers", uid);
        const empSnap = await getDoc(empRef);
        if (empSnap.exists()) {
            const data = empSnap.data();
            if (data.status === "pending" || data.verificationStatus === "pending") {
                await signOut(auth); 
                setShowPendingModal(true); 
                return;
            }
            return navigate("/employer-dashboard");
        }

        alert("Profile not found. Please contact support.");
    } catch (error) {
        console.error("Routing Error:", error);
        alert("Error loading profile.");
    }
  };

  const setupRecaptcha = () => {
    clearRecaptcha();
    const container = document.getElementById("recaptcha-container-login");
    if (!container) return;

    window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container-login", { 
        size: "invisible",
        callback: () => console.log("Recaptcha verified"),
        "expired-callback": () => { alert("Recaptcha expired. Please try again."); setLoading(false); }
    });
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const exists = await checkUserExists(identifier);
      if (!exists) {
        alert("Account not existing. Please register first.");
        setLoading(false);
        return;
      }
      const userCredential = await signInWithEmailAndPassword(auth, identifier, password);
      await routeUserToDashboard(userCredential.user.uid);
    } catch (err) {
      console.error(err);
      alert("Invalid Email or Password.");
    }
    setLoading(false);
  };

  const handlePhoneSignIn = async (e) => {
    e.preventDefault();
    if (identifier.length !== 10) return alert("Please enter exactly 10 digits for your phone number.");
    
    const finalPhone = formatPhone(identifier);
    setLoading(true);
    try {
      const exists = await checkUserExists(identifier);
      if (!exists) {
        alert("Account not existing. Please register first.");
        setLoading(false);
        return;
      }
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, finalPhone, appVerifier);
      setConfirmationResult(confirmation);
    } catch (err) {
      alert(err.message || "Failed to send SMS code."); 
      clearRecaptcha();
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      await routeUserToDashboard(result.user.uid);
    } catch (err) {
      alert("Invalid OTP code. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden relative font-sans select-none cursor-default transition-colors duration-500 
      ${darkMode ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white' : 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 text-blue-900'}`}>

      {/* Large Background Watermark (Right side, high opacity) */}
      <div className={`absolute -right-10 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none rotate-12 transition-transform duration-500 z-0 
        ${darkMode ? 'text-white/30' : 'text-blue-500'}`}>
          <LockClosedIcon className="w-[30rem] h-[30rem] md:w-[45rem] md:h-[45rem]" />
      </div>

      {/* Pending Modal */}
      {showPendingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl border text-center animate-in zoom-in-95 duration-300 ${darkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white/90 backdrop-blur-2xl border-white text-slate-900'}`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner ${darkMode ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-orange-50 border-2 border-orange-100 text-orange-500'}`}>
              ⏳
            </div>
            <h3 className="text-2xl font-black mb-2 tracking-tight">Verification Pending</h3>
            <p className="text-[10px] mb-8 font-bold leading-relaxed uppercase tracking-widest opacity-60">
              We sent an Email notice regarding the process of your account's verification. Please wait for an Admin to approve your account.
            </p>
            <button 
              onClick={() => setShowPendingModal(false)}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/30 active:scale-95 transition-all hover:bg-blue-500"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`w-full h-16 shrink-0 z-50 flex items-center transition-all duration-300 border-b 
        ${darkMode ? 'border-white/10' : 'border-blue-200/50'}`}>
        <div className="max-w-7xl mx-auto w-full px-6 flex justify-center sm:justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-black tracking-tighter shrink-0 cursor-pointer" onClick={() => navigate("/")}>
            LIVELI<span className="text-blue-600 dark:text-blue-500">MATCH</span>
          </h1>
        </div>
      </header>

      {/* Main Content: Left Aligned, Rectangular Split Card */}
      <main className="flex-1 flex items-center justify-start px-8 md:px-16 lg:px-24 relative z-10 overflow-hidden">
        
        {/* FROSTED GLASS RECTANGULAR CARD */}
        {/* On Mobile: Vertical, Max-w-sm. On Desktop: Horizontal, Max-w-3xl */}
        <div 
          className={`w-full max-w-sm md:max-w-3xl flex flex-col md:flex-row rounded-[2rem] relative overflow-hidden transition-all duration-300 shadow-2xl border backdrop-blur-xl
            ${darkMode 
              ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]' 
              : 'bg-white/60 border-white/60 shadow-[0_20px_50px_-10px_rgba(37,99,235,0.15)]'}`}
        >
          
          {/* DESKTOP LEFT SIDE: Branding / Welcome Message (Compact) */}
          <div className="hidden md:flex w-2/5 p-8 flex-col justify-center relative z-10">
              <h2 className={`text-3xl font-black tracking-tight mb-2 ${darkMode ? 'text-white' : 'text-blue-900'}`}>
                  Secure Login
              </h2>
              <p className={`text-[10px] font-bold uppercase tracking-widest opacity-70 mb-4 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  Access the portal
              </p>
              <p className={`text-xs font-medium leading-relaxed opacity-80 ${darkMode ? 'text-slate-300' : 'text-blue-900'}`}>
                  Welcome back. Sign in to connect with your community.
              </p>
          </div>

          {/* RIGHT SIDE (or full width on mobile): Form Area */}
          <div className={`w-full md:w-3/5 flex flex-col justify-center p-6 md:p-8 relative z-10 md:border-l ${darkMode ? 'md:bg-slate-900/40 md:border-white/10' : 'md:bg-white/40 md:border-white/50'}`}>
              
              {/* Mobile Header (Hidden on Desktop) */}
              <div className="md:hidden mb-6 text-center">
                  <h2 className={`text-2xl font-black tracking-tight mb-1 ${darkMode ? 'text-white' : 'text-blue-900'}`}>Secure Login</h2>
              </div>

              {/* Toggle Buttons */}
              <div className={`flex p-1 rounded-xl mb-5 border ${darkMode ? 'bg-slate-800/50 border-white/10' : 'bg-white/60 border-white/60 shadow-inner'}`}>
                <button 
                  onClick={() => setMethod("email")} 
                  className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all flex justify-center items-center gap-2 ${method === 'email' ? (darkMode ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-600 text-white shadow-lg') : (darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-blue-700 hover:bg-white/50')}`}
                >
                  <EnvelopeIcon className="w-4 h-4"/> EMAIL
                </button>
                <button 
                  onClick={() => setMethod("phone")} 
                  className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all flex justify-center items-center gap-2 ${method === 'phone' ? (darkMode ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-600 text-white shadow-lg') : (darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-blue-700 hover:bg-white/50')}`}
                >
                  <PhoneIcon className="w-4 h-4"/> PHONE
                </button>
              </div>

              {/* Email Form */}
              {method === "email" ? (
                <form onSubmit={handleEmailLogin} className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Email Address</label>
                    <input 
                      type="email" 
                      required 
                      placeholder="name@example.com" 
                      value={identifier} 
                      onChange={(e) => setIdentifier(e.target.value)} 
                      className={`w-full p-3.5 rounded-2xl outline-none border transition-all font-bold text-sm shadow-inner backdrop-blur-md select-text cursor-text 
                        ${darkMode ? 'bg-slate-800/50 border-white/10 focus:border-blue-500 text-white' : 'bg-white/60 border-white/60 focus:bg-white/90 focus:border-blue-400 text-blue-900 placeholder-blue-400/60'}`} 
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Password</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required 
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)} 
                        className={`w-full p-3.5 pr-12 rounded-2xl outline-none border transition-all font-bold text-sm shadow-inner backdrop-blur-md select-text cursor-text 
                          ${darkMode ? 'bg-slate-800/50 border-white/10 focus:border-blue-500 text-white' : 'bg-white/60 border-white/60 focus:bg-white/90 focus:border-blue-400 text-blue-900 placeholder-blue-400/60'}`} 
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-blue-600'}`}>
                         {showPassword ? <EyeSlashIcon className="w-4 h-4"/> : <EyeIcon className="w-4 h-4"/>}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button disabled={loading} className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3
                      ${darkMode ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'}`}>
                      {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><ArrowRightOnRectangleIcon className="w-5 h-5"/> Sign In</>}
                    </button>
                  </div>
                </form>
              ) : (
                // Phone Form
                <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-500">
                  {!confirmationResult ? (
                    <form onSubmit={handlePhoneSignIn} className="space-y-3">
                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Phone Number</label>
                        <div className={`flex w-full rounded-2xl border transition-all shadow-inner backdrop-blur-md overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50 
                          ${darkMode ? 'bg-slate-800/50 border-white/10 focus-within:border-blue-500 text-white' : 'bg-white/60 border-white/60 focus-within:bg-white/90 focus-within:border-blue-400 text-blue-900'}`}>
                          <div className={`px-4 py-3.5 font-black border-r flex items-center justify-center ${darkMode ? 'bg-slate-900/50 border-white/10 text-slate-400' : 'bg-white/50 border-white/60 text-blue-700'}`}>
                            +63
                          </div>
                          <input 
                              type="tel" 
                              required 
                              maxLength="10"
                              placeholder="9123456789" 
                              value={identifier}
                              onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); setIdentifier(val); }} 
                              className="w-full px-4 py-3.5 bg-transparent outline-none font-bold text-sm tracking-widest select-text cursor-text placeholder-current/40" 
                          />
                        </div>
                      </div>
                      <div id="recaptcha-container-login"></div>
                      
                      <div className="pt-2">
                        <button disabled={loading || identifier.length !== 10} className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3
                          ${darkMode ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'}`}>
                          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Send Login Code"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-3 animate-in fade-in zoom-in duration-300">
                      <p className={`text-center text-[10px] font-black uppercase tracking-widest mb-3 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                        Code sent to <span className={darkMode ? 'text-white' : 'text-blue-900'}>+63 {identifier}</span>
                      </p>
                      
                      <input 
                          type="text" 
                          placeholder="000000" 
                          maxLength="6" 
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
                          className={`w-full p-4 rounded-2xl text-center text-4xl font-black tracking-[0.5em] outline-none border transition-all shadow-inner backdrop-blur-md select-text cursor-text 
                            ${darkMode ? 'bg-slate-800/50 border-white/10 focus:border-blue-500 text-white' : 'bg-white/40 border-white/60 focus:bg-white/90 focus:border-blue-400 text-blue-900'}`} 
                      />
                      
                      <div className="pt-2">
                        <button disabled={loading || otp.length < 6} className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3
                          ${darkMode ? 'bg-green-600 text-white hover:bg-green-500 shadow-green-500/20' : 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/30'}`}>
                          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Verify & Login"}
                        </button>
                      </div>

                      <button type="button" onClick={() => { setConfirmationResult(null); clearRecaptcha(); setOtp(""); }} className={`w-full mt-2 text-[10px] font-black uppercase tracking-widest transition-all ${darkMode ? 'text-slate-400 hover:text-white' : 'text-blue-600 opacity-60 hover:opacity-100'}`}>Change Number</button>
                    </form>
                  )}
                </div>
              )}

              <div className={`mt-5 text-center border-t pt-4 relative z-10 ${darkMode ? 'border-white/10' : 'border-white/50'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  New to Livelimatch? 
                  <span onClick={() => navigate("/register")} className={`ml-2 cursor-pointer hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>Create an account</span>
                </p>
              </div>

          </div>
        </div>
      </main>

      {/* Footer (Transparent to show gradient) */}
      <footer className={`w-full h-14 shrink-0 border-t flex items-center justify-center relative z-10 transition-colors duration-300 
        ${darkMode ? 'border-white/10' : 'border-blue-200/50'}`}>
        <div className="flex flex-col items-center text-center">
            <p className="text-base font-black tracking-tighter leading-none">LIVELI<span className="text-blue-600 dark:text-blue-500">MATCH</span></p>
            <p className={`text-[8px] font-bold uppercase tracking-widest mt-1 ${darkMode ? 'opacity-40' : 'opacity-60'}`}>© 2026 Barangay Cawayan Bogtong</p>
        </div>
      </footer>
    </div>
  );
}