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

export default function Login() {
  const navigate = useNavigate();
  const [method, setMethod] = useState("email"); // Defaulting to email
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Custom Modal State for Pending Users
  const [showPendingModal, setShowPendingModal] = useState(false);
  
  const [identifier, setIdentifier] = useState(""); 
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);

  // --- CLEANUP & RESET ON METHOD CHANGE ---
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

  // Utility to format input specifically to the expected Firebase Phone string
  const formatPhone = (input) => {
    if (!input) return "";
    let num = input.replace(/\D/g, ''); // Strip non-digits
    return "+63" + num;
  };

  const checkUserExists = async (contactValue) => {
    const finalIdentifier = method === "phone" ? formatPhone(contactValue) : contactValue;
    const searchField = method === "email" ? "email" : "contact";
    
    // Check Applicants
    const qApp = query(collection(db, "applicants"), where(searchField, "==", finalIdentifier));
    // Check Employers
    const qEmp = query(collection(db, "employers"), where(searchField, "==", finalIdentifier));
    // Check Admins
    const qAdmin = query(collection(db, "admins"), where("email", "==", finalIdentifier));

    const [snapApp, snapEmp, snapAdmin] = await Promise.all([getDocs(qApp), getDocs(qEmp), getDocs(qAdmin)]);
    
    return !snapApp.empty || !snapEmp.empty || !snapAdmin.empty;
  };

  const routeUserToDashboard = async (uid) => {
    try {
        // 1. Check Admin
        const adminRef = doc(db, "admins", uid);
        const adminSnap = await getDoc(adminRef);
        
        if (adminSnap.exists()) {
            navigate("/admin-dashboard");
            return;
        }

        // 2. Check Applicant
        const appRef = doc(db, "applicants", uid);
        const appSnap = await getDoc(appRef);
        
        if (appSnap.exists()) {
            const data = appSnap.data();
            if (data.status === "pending") {
                await signOut(auth); // Sign them back out
                setShowPendingModal(true); // Show the custom themed popup
                return;
            }
            navigate("/applicant-dashboard");
            return;
        }

        // 3. Check Employer
        const empRef = doc(db, "employers", uid);
        const empSnap = await getDoc(empRef);

        if (empSnap.exists()) {
            const data = empSnap.data();
            if (data.status === "pending") {
                await signOut(auth); // Sign them back out
                setShowPendingModal(true); // Show the custom themed popup
                return;
            }
            navigate("/employer-dashboard");
            return;
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
        callback: () => {
            console.log("Recaptcha verified");
        },
        "expired-callback": () => {
            alert("Recaptcha expired. Please try again.");
            setLoading(false);
        }
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
    if (identifier.length !== 10) {
        alert("Please enter exactly 10 digits for your phone number.");
        return;
    }

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
      console.error("SMS Error:", err);
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
      console.error(err);
      alert("Invalid OTP code. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-gray-800 font-sans overflow-x-hidden relative">
      
      {/* --- CUSTOM PENDING VERIFICATION MODAL --- */}
      {showPendingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white/90 backdrop-blur-2xl rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-white text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-orange-50 border-2 border-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl shadow-inner">
              ⏳
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Verification Pending</h3>
            <p className="text-[11px] text-slate-500 mb-6 font-bold leading-relaxed uppercase tracking-widest">
              We sent an Email notice regarding the process of your account's verification.
            </p>
            <button 
              onClick={() => setShowPendingModal(false)}
              className="w-full py-4 bg-blue-900 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/30 active:scale-95 transition-all"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      <header className="w-full h-20 bg-white/70 backdrop-blur-xl border-b border-slate-100 fixed top-0 left-0 z-50 flex items-center">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 flex justify-center sm:justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-blue-900 shrink-0 cursor-pointer" onClick={() => navigate("/")}>
            LIVELI<span className="text-blue-500">MATCH</span>
          </h1>
        </div>
      </header>

      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 -left-20 w-125 h-125 bg-blue-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-15 animate-blob"></div>
        <div className="absolute bottom-0 -right-20 w-125 h-125 bg-purple-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-15 animate-blob animation-delay-2000"></div>
      </div>

      <main className="grow flex items-center justify-center pt-24 sm:pt-32 pb-12 px-4 relative z-10">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-2xl rounded-[3rem] sm:rounded-[3.5rem] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.08)] p-8 sm:p-12 border border-white relative z-20">
          <div className="text-center mb-10">
            <div className="inline-block px-4 py-1.5 bg-blue-50 rounded-full text-blue-600 text-[10px] font-black uppercase tracking-widest mb-4">
              Community Access
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome Back</h2>
          </div>

          <div className="flex bg-slate-100/50 p-1.5 rounded-2xl mb-8 border border-slate-200/50">
            <button 
              onClick={() => setMethod("email")} 
              className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${method === 'email' ? 'bg-white text-blue-900 shadow-md' : 'text-slate-400'}`}
            >
              EMAIL
            </button>
            <button 
              onClick={() => setMethod("phone")} 
              className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${method === 'phone' ? 'bg-white text-blue-900 shadow-md' : 'text-slate-400'}`}
            >
              PHONE
            </button>
          </div>

          {method === "email" ? (
            <form onSubmit={handleEmailLogin} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Email Address</label>
                <input type="email" required placeholder="name@example.com" value={identifier} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-900 transition-all font-medium" onChange={(e) => setIdentifier(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required placeholder="••••••••" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-900 transition-all font-medium" onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-600 uppercase">{showPassword ? "Hide" : "Show"}</button>
                </div>
              </div>
              <button disabled={loading} className="w-full py-5 bg-blue-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/30 active:scale-95 transition-all mt-4 hover:bg-blue-800 flex justify-center items-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Authenticating...
                  </>
                ) : "Sign In"}
              </button>
            </form>
          ) : (
            <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-500">
              {!confirmationResult ? (
                <form onSubmit={handlePhoneSignIn} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Phone Number</label>
                    <div className="flex w-full bg-slate-50 border-2 border-slate-100 rounded-2xl focus-within:border-blue-900 transition-all overflow-hidden">
                      <div className="px-4 py-4 bg-slate-100 text-slate-500 font-black border-r-2 border-slate-100 flex items-center justify-center">
                        +63
                      </div>
                      <input 
                          type="tel" 
                          required 
                          maxLength="10"
                          placeholder="9123456789" 
                          value={identifier}
                          className="w-full px-4 py-4 bg-transparent outline-none font-bold tracking-wider" 
                          onChange={(e) => {
                             const val = e.target.value.replace(/\D/g, '');
                             setIdentifier(val);
                          }} 
                      />
                    </div>
                  </div>
                  <div id="recaptcha-container-login"></div>
                  
                  <button disabled={loading || identifier.length !== 10} className="w-full py-5 bg-blue-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/30 active:scale-95 transition-all mt-2 hover:bg-blue-800 disabled:opacity-50">
                    {loading ? "Sending..." : "Send Login Code"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in fade-in zoom-in duration-300">
                  <p className="text-center text-xs font-bold text-slate-400">Code sent to <span className="text-blue-900 font-black">+63 {identifier}</span></p>
                  <input 
                      type="text" 
                      placeholder="000000" 
                      maxLength="6" 
                      value={otp}
                      className="w-full px-5 py-5 border-2 border-blue-100 rounded-2xl text-center text-4xl font-black tracking-[0.5em] outline-none focus:border-blue-900 bg-blue-50/30 transition-all text-blue-900" 
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
                  />
                  <button disabled={loading || otp.length < 6} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-green-600/30 active:scale-95 transition-all hover:bg-green-700 disabled:opacity-50">
                    {loading ? "Verifying..." : "Verify & Login"}
                  </button>
                  <button type="button" onClick={() => { setConfirmationResult(null); clearRecaptcha(); setOtp(""); }} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600">Change Number</button>
                </form>
              )}
            </div>
          )}

          <div className="mt-10 text-center border-t border-slate-100 pt-8">
            <p className="text-xs font-bold text-slate-400">New to Livelimatch? <span onClick={() => navigate("/register")} className="text-blue-600 ml-1 cursor-pointer font-black hover:underline">Create an account</span></p>
          </div>
        </div>
      </main>

      <footer className="bg-slate-50 py-12 border-t border-slate-100 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <p className="text-xl font-black text-blue-900 tracking-tighter">LIVELI<span className="text-blue-500">MATCH</span></p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">© 2026 Barangay Cawayan Bogtong Livelihood Portal</p>
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
      `}} />
    </div>
  );
}