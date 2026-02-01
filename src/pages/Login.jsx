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
  const [method, setMethod] = useState("phone"); 
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Set default to +63 to match your Registration behavior
  const [identifier, setIdentifier] = useState("+63"); 
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);

  // --- CLEANUP RECAPTCHA ON UNMOUNT OR METHOD CHANGE ---
  useEffect(() => {
    return () => {
      clearRecaptcha();
    };
  }, [method]);

  // Sync method changes with the input default
  useEffect(() => {
    if (method === "phone") {
        setIdentifier("+63");
    } else {
        setIdentifier("");
    }
    setConfirmationResult(null);
  }, [method]);

  const clearRecaptcha = () => {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
    // Manually clear the DOM element just in case
    const container = document.getElementById("recaptcha-container-login");
    if (container) container.innerHTML = "";
  };

  const formatPhone = (input) => {
    let num = input.trim().replace(/\s+/g, '');
    if (num.startsWith('0')) {
      return '+63' + num.substring(1);
    }
    return num;
  };

  // --- UPDATED LOGIC 1: CHECK ADMINS COLLECTION TOO ---
  const checkUserExists = async (contactValue) => {
    const finalIdentifier = method === "phone" ? formatPhone(contactValue) : contactValue;
    
    // Check Applicants
    const qApp = query(collection(db, "applicants"), where("contact", "==", finalIdentifier));
    // Check Employers
    const qEmp = query(collection(db, "employers"), where("contact", "==", finalIdentifier));
    
    // NEW: Check Admins (Assuming admins have an 'email' field or 'contact' field matching the input)
    // Note: Usually admins login via email, so we check the 'email' field if method is email
    const qAdmin = query(collection(db, "admins"), where("email", "==", finalIdentifier));

    const [snapApp, snapEmp, snapAdmin] = await Promise.all([getDocs(qApp), getDocs(qEmp), getDocs(qAdmin)]);
    
    // Return true if found in ANY of the three collections
    return !snapApp.empty || !snapEmp.empty || !snapAdmin.empty;
  };

  // --- UPDATED LOGIC 2: ROUTE TO ADMIN DASHBOARD ---
  const routeUserToDashboard = async (uid) => {
    try {
        // 1. Check Admin (Priority Check)
        const adminRef = doc(db, "admins", uid);
        const adminSnap = await getDoc(adminRef);
        
        if (adminSnap.exists()) {
            navigate("/admin-dashboard"); // Routes to your AdminDashboard.jsx
            return;
        }

        // 2. Check Applicant
        const appRef = doc(db, "applicants", uid);
        const appSnap = await getDoc(appRef);
        
        if (appSnap.exists()) {
            navigate("/applicant-dashboard");
            return;
        }

        // 3. Check Employer
        const empRef = doc(db, "employers", uid);
        const empSnap = await getDoc(empRef);

        if (empSnap.exists()) {
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
    // 1. Clear any existing instance first
    clearRecaptcha();

    // 2. Check if the DOM element exists
    const container = document.getElementById("recaptcha-container-login");
    if (!container) {
        console.error("Recaptcha container not found in DOM");
        return;
    }

    // 3. Create new Verifier
    window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container-login", { 
        size: "invisible",
        callback: (response) => {
            // reCAPTCHA solved - allow signInWithPhoneNumber.
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
      
      if (!userCredential.user.emailVerified && identifier !== "admin@livelimatch.com") {
  await signOut(auth);
  alert("Please verify your email first.");
  setLoading(false);
  return;
}
      
      await routeUserToDashboard(userCredential.user.uid);
      
    } catch (err) {
      console.error(err);
      alert("Invalid Email or Password.");
    }
    setLoading(false);
  };

  const handlePhoneSignIn = async (e) => {
    e.preventDefault();
    const finalPhone = formatPhone(identifier);

    if (finalPhone.length < 12) return alert("Invalid phone number.");
    
    setLoading(true);
    try {
      const exists = await checkUserExists(identifier);
      if (!exists) {
        alert("Account not existing. Please register first.");
        setLoading(false);
        return;
      }

      // Initialize Recaptcha right before sending
      setupRecaptcha();
      
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, finalPhone, appVerifier);
      setConfirmationResult(confirmation);
    } catch (err) {
      console.error("SMS Error:", err);
      // Generic error message if we fail early
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
              onClick={() => setMethod("phone")} 
              className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${method === 'phone' ? 'bg-white text-blue-900 shadow-md' : 'text-slate-400'}`}
            >
              PHONE
            </button>
            <button 
              onClick={() => setMethod("email")} 
              className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${method === 'email' ? 'bg-white text-blue-900 shadow-md' : 'text-slate-400'}`}
            >
              EMAIL
            </button>
          </div>

          {method === "email" ? (
            <form onSubmit={handleEmailLogin} className="space-y-5">
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
              <button disabled={loading} className="w-full py-5 bg-blue-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/30 active:scale-95 transition-all mt-4 hover:bg-blue-800">
                {loading ? "Authenticating..." : "Sign In"}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              {!confirmationResult ? (
                <form onSubmit={handlePhoneSignIn} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Phone Number</label>
                    <input 
                        type="tel" 
                        required 
                        value={identifier}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-900 font-bold tracking-wider transition-all" 
                        onChange={(e) => setIdentifier(e.target.value)} 
                    />
                  </div>
                  {/* RECAPTCHA CONTAINER IS HERE */}
                  <div id="recaptcha-container-login"></div>
                  
                  <button disabled={loading} className="w-full py-5 bg-blue-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/30 active:scale-95 transition-all mt-2 hover:bg-blue-800">
                    {loading ? "Sending..." : "Send Login Code"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in fade-in zoom-in duration-300">
                  <p className="text-center text-xs font-bold text-slate-400">Code sent to <span className="text-blue-900">{identifier}</span></p>
                  <input type="text" placeholder="000000" maxLength="6" className="w-full px-5 py-5 border-2 border-blue-100 rounded-2xl text-center text-4xl font-black tracking-[0.5em] outline-none focus:border-blue-900 bg-blue-50/30 transition-all text-blue-900" onChange={(e) => setOtp(e.target.value)} />
                  <button disabled={loading} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-green-600/30 active:scale-95 transition-all hover:bg-green-700">
                    {loading ? "Verifying..." : "Verify & Login"}
                  </button>
                  <button type="button" onClick={() => { setConfirmationResult(null); clearRecaptcha(); }} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600">Change Number</button>
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
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">© 2026 Barangay Bogtong Livelihood Portal</p>
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