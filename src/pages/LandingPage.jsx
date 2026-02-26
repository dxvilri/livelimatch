import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  signInWithEmailAndPassword, 
  signInWithPhoneNumber, 
  createUserWithEmailAndPassword,
  linkWithPhoneNumber,
  RecaptchaVerifier,
  signOut
} from "firebase/auth";
import { auth, db, storage } from "../firebase/config";
import { collection, query, where, getDocs, doc, getDoc, setDoc, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { EnvelopeIcon, PhoneIcon, ArrowRightOnRectangleIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import Toast from "../components/Toast"; 

export default function LandingPage() {
  const navigate = useNavigate();

  // --- DARK MODE STATE ---
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const [toast, setToast] = useState({ show: false, message: "", type: "error" });
  const triggerToast = (message, type = "error") => setToast({ show: true, message, type });

  // --- AUTH MODE STATE ('login' or 'register') ---
  const [authMode, setAuthMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- LOGIN STATES ---
  const [loginMethod, setLoginMethod] = useState("email");
  const [loginIdentifier, setLoginIdentifier] = useState(""); 
  const [loginPassword, setLoginPassword] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginConfirmation, setLoginConfirmation] = useState(null);

  // --- REGISTER STATES ---
  const [registerStep, setRegisterStep] = useState(1);
  const [registerRole, setRegisterRole] = useState("");
  const [hasBusiness, setHasBusiness] = useState(false);
  const [proofFiles, setProofFiles] = useState([]);
  const [registerOtp, setRegisterOtp] = useState("");
  const [registerConfirmation, setRegisterConfirmation] = useState(null);
  const [registerData, setRegisterData] = useState({
    email: "", password: "", phoneNumber: "", firstName: "",
    middleName: "", lastName: "", suffix: "", sitio: "", businessName: "",
  });

  const PUROK_LIST = ["Sagur", "Ampungan", "Centro 1", "Centro 2", "Centro 3", "Bypass Road", "Boundary"];

  // --- CLEANUP & RESET ON MODE SWITCH ---
  useEffect(() => {
    clearRecaptcha();
    setLoginConfirmation(null);
    setRegisterConfirmation(null);
    setLoginOtp("");
    setRegisterOtp("");
  }, [authMode, loginMethod]);

  const clearRecaptcha = () => {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
    const containerL = document.getElementById("recaptcha-landing-login");
    const containerR = document.getElementById("recaptcha-landing-register");
    if (containerL) containerL.innerHTML = "";
    if (containerR) containerR.innerHTML = "";
  };

  const formatPhone = (input) => {
    if (!input) return "";
    let num = input.replace(/\D/g, ''); 
    return "+63" + num;
  };

  const capitalizeName = (str) => {
    if (!str) return "";
    return str.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
  };

  const checkDuplicate = async (field, value) => {
    const qApp = query(collection(db, "applicants"), where(field, "==", value));
    const qEmp = query(collection(db, "employers"), where(field, "==", value));
    const [snapApp, snapEmp] = await Promise.all([getDocs(qApp), getDocs(qEmp)]);
    return !snapApp.empty || !snapEmp.empty;
  };

  // --- LOGIN LOGIC ---
  const routeUserToDashboard = async (user) => {
    const uid = user.uid;
    const email = user.email;

    try {
        // Fix: Check Admin Collection by Email
        if (email) {
            const adminQ = query(collection(db, "admins"), where("email", "==", email));
            const adminSnapByEmail = await getDocs(adminQ);
            if (!adminSnapByEmail.empty) return navigate("/admin-dashboard");
        }

        const adminRef = doc(db, "admins", uid);
        const adminSnap = await getDoc(adminRef);
        if (adminSnap.exists()) return navigate("/admin-dashboard");

        const appRef = doc(db, "applicants", uid);
        const appSnap = await getDoc(appRef);
        if (appSnap.exists()) {
            const data = appSnap.data();
            if (data.status === "pending" || data.verificationStatus === "pending") {
                await signOut(auth); triggerToast("Account pending verification.", "error"); return;
            }
            return navigate("/applicant-dashboard");
        }

        const empRef = doc(db, "employers", uid);
        const empSnap = await getDoc(empRef);
        if (empSnap.exists()) {
            const data = empSnap.data();
            if (data.status === "pending" || data.verificationStatus === "pending") {
                await signOut(auth); triggerToast("Account pending verification.", "error"); return;
            }
            return navigate("/employer-dashboard");
        }
        triggerToast("Profile not found. Please contact support.", "error");
    } catch (error) {
        console.error("Routing Error:", error);
        triggerToast("Error loading profile.", "error");
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const exists = await checkDuplicate("email", loginIdentifier);
      if (!exists) { triggerToast("Account not existing. Please register first."); setLoading(false); return; }
      const userCredential = await signInWithEmailAndPassword(auth, loginIdentifier, loginPassword);
      await routeUserToDashboard(userCredential.user);
    } catch (err) { triggerToast("Invalid Email or Password.", "error"); }
    setLoading(false);
  };

  const handlePhoneLogin = async (e) => {
    e.preventDefault();
    if (loginIdentifier.length !== 10) return triggerToast("Please enter exactly 10 digits.");
    const finalPhone = formatPhone(loginIdentifier);
    setLoading(true);
    try {
      const exists = await checkDuplicate("contact", finalPhone);
      if (!exists) { triggerToast("Account not existing. Please register first."); setLoading(false); return; }
      
      clearRecaptcha();
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-landing-login", { size: "invisible" });
      const confirmation = await signInWithPhoneNumber(auth, finalPhone, window.recaptchaVerifier);
      setLoginConfirmation(confirmation);
    } catch (err) { triggerToast("Failed to send SMS code."); clearRecaptcha(); }
    setLoading(false);
  };

  const handleVerifyLoginOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await loginConfirmation.confirm(loginOtp);
      await routeUserToDashboard(result.user);
    } catch (err) { triggerToast("Invalid OTP code."); }
    setLoading(false);
  };

  // --- REGISTER LOGIC ---
  const handleRegisterInputChange = (e) => setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (proofFiles.length + selected.length > 3) return triggerToast("Maximum of 3 files allowed.");
    setProofFiles([...proofFiles, ...selected]);
  };

  const removeFile = (indexToRemove) => setProofFiles(proofFiles.filter((_, index) => index !== indexToRemove));

  const handleRegisterStep3Next = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const normalizeName = (name) => (name || "").replace(/\s+/g, '').toLowerCase();
      const fName = normalizeName(registerData.firstName);
      const mName = normalizeName(registerData.middleName);
      const lName = normalizeName(registerData.lastName);
      const sName = normalizeName(registerData.suffix);
      
      const [appSnap, empSnap] = await Promise.all([getDocs(collection(db, "applicants")), getDocs(collection(db, "employers"))]);
      let duplicateFound = false;
      const evaluateDoc = (d) => {
        const data = d.data();
        if (normalizeName(data.firstName) === fName && 
            normalizeName(data.middleName) === mName && 
            normalizeName(data.lastName) === lName && 
            normalizeName(data.suffix || "") === sName && 
            data.status !== 'rejected') duplicateFound = true;
      };
      appSnap.forEach(evaluateDoc); empSnap.forEach(evaluateDoc);

      if (duplicateFound) { triggerToast("An account with this exact Name already exists."); setLoading(false); return; }
      if (await checkDuplicate("email", registerData.email)) { triggerToast("Email is already in use."); setLoading(false); return; }

      const finalPhone = registerData.phoneNumber ? formatPhone(registerData.phoneNumber) : "";
      if (finalPhone && await checkDuplicate("contact", finalPhone)) { triggerToast("Phone number is already registered."); setLoading(false); return; }

      let userObj = auth.currentUser;
      if (!userObj || userObj.email !== registerData.email) {
          try {
              const res = await createUserWithEmailAndPassword(auth, registerData.email, registerData.password);
              userObj = res.user;
          } catch (err) {
              if (err.code === "auth/email-already-in-use") {
                  try {
                      const res = await signInWithEmailAndPassword(auth, registerData.email, registerData.password);
                      userObj = res.user;
                  } catch (signInErr) { triggerToast("This email is taken or password incorrect."); setLoading(false); return; }
              } else { triggerToast(err.message); setLoading(false); return; }
          }
      }

      if (finalPhone) {
          if (userObj.phoneNumber === finalPhone) { setRegisterStep(5); setLoading(false); return; }
          clearRecaptcha();
          window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-landing-register', { size: 'invisible' });
          try {
              const confirmation = await linkWithPhoneNumber(userObj, finalPhone, window.recaptchaVerifier);
              setRegisterConfirmation(confirmation);
              setRegisterStep(4);
          } catch (smsErr) { triggerToast("Failed to send SMS OTP."); clearRecaptcha(); }
      } else { setRegisterStep(5); }
    } catch (err) { triggerToast("An unexpected error occurred."); }
    setLoading(false);
  };

  const handleVerifyRegisterOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await registerConfirmation.confirm(registerOtp); setRegisterStep(5); } 
    catch (err) { triggerToast("Invalid OTP code."); }
    setLoading(false);
  };

  const handleFinalRegisterSubmit = async (e) => {
    e.preventDefault();
    if (proofFiles.length === 0) return triggerToast("Please upload at least 1 proof of residency.");
    setLoading(true);
    
    const userUid = auth.currentUser.uid;
    const finalPhone = registerData.phoneNumber ? formatPhone(registerData.phoneNumber) : "";

    try {
        const uploadedUrls = [];
        for (let i = 0; i < proofFiles.length; i++) {
            const file = proofFiles[i];
            const fileExtension = file.name.split('.').pop();
            const proofRef = ref(storage, `proofOfResidency/${userUid}_file${i + 1}.${fileExtension}`);
            await uploadBytes(proofRef, file);
            uploadedUrls.push(await getDownloadURL(proofRef));
        }

        const collectionName = registerRole === "applicant" ? "applicants" : "employers";
        
        await setDoc(doc(db, collectionName, userUid), {
            uid: userUid, role: registerRole, email: registerData.email, contact: finalPhone || "",
            firstName: capitalizeName(registerData.firstName.trim()),
            middleName: capitalizeName(registerData.middleName.trim()), 
            lastName: capitalizeName(registerData.lastName.trim()),
            suffix: capitalizeName(registerData.suffix.trim()),
            sitio: registerData.sitio, proofOfResidencyUrls: uploadedUrls, proofOfResidencyUrl: uploadedUrls[0],
            status: "pending", createdAt: new Date().toISOString(),
            ...(registerRole === "employer" && hasBusiness && { businessName: registerData.businessName })
        });

        await addDoc(collection(db, "mail"), {
            to: registerData.email,
            message: {
                subject: "Registration Received - Livelimatch Verification",
                html: `<p>We received your registration. Your account is PENDING admin verification.</p>`
            }
        });

        await signOut(auth);
        clearRecaptcha();
        triggerToast("Registration successful! Pending admin verification.", "info");
        setTimeout(() => { setAuthMode('login'); setRegisterStep(1); }, 3000); 
    } catch (err) { triggerToast(err.message); }
    setLoading(false);
  };

  const handleRegisterBack = () => {
    if (registerStep === 5 && !registerData.phoneNumber) setRegisterStep(3);
    else setRegisterStep(registerStep - 1);
  };

  // Reusable Styles
  const inputStyle = `w-full p-3.5 rounded-2xl outline-none border transition-all font-bold text-sm shadow-inner backdrop-blur-md select-text cursor-text 
    ${darkMode ? 'bg-slate-800/50 border-white/10 focus:border-blue-500 text-white' : 'bg-white/60 border-white/60 focus:bg-white/90 focus:border-blue-400 text-blue-900 placeholder-blue-400/60'}`;
  const labelStyle = `block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`;

  return (
    <div className={`flex flex-col min-h-screen font-sans selection:bg-blue-500/30 selection:text-blue-200 overflow-x-hidden transition-colors duration-500 
      ${darkMode ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white' : 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 text-blue-900'}`}>
      
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ show: false, message: "", type: "error" })} />}

      {/* HEADER */}
      <header className={`w-full h-20 fixed top-0 left-0 z-50 flex items-center transition-all duration-300 border-b backdrop-blur-md 
        ${darkMode ? 'border-white/10 bg-slate-900/50' : 'border-blue-200/50 bg-white/50'}`}>
        <div className="max-w-7xl mx-auto w-full px-6 flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-black tracking-tighter shrink-0 cursor-pointer" onClick={() => navigate("/")}>
            LIVELI<span className="text-blue-600 dark:text-blue-500">MATCH</span>
          </h1>
        </div>
      </header>

      <main className="grow">
        {/* HERO SECTION */}
        <section className="relative min-h-screen flex items-center pt-20 px-6">
          
          <div className={`absolute top-20 -left-20 lg:w-125 lg:h-125 bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] animate-blob transition-opacity duration-500 ${darkMode ? 'opacity-20' : 'opacity-10'}`}></div>
          <div className={`absolute top-40 -right-20 lg:w-125 lg:h-125 bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000 transition-opacity duration-500 ${darkMode ? 'opacity-20' : 'opacity-10'}`}></div>

          <div className="max-w-7xl mx-auto w-full relative z-10">
            <div className="grid lg:grid-cols-12 gap-16 items-center">
              
              {/* Left Side: Hero Text */}
              <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
                <h2 className={`text-5xl md:text-6xl lg:text-8xl font-black leading-[1.05] tracking-tight ${darkMode ? 'text-white' : 'text-blue-950'}`}>
                  Connecting <br className="hidden lg:block" />
                  <span className="text-blue-600 dark:text-blue-500 relative inline-block">
                    Talent
                    <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 338 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 9C118.5 -1.5 219.5 -1.5 335 9" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
                    </svg>
                  </span> to Opportunity.
                </h2>
                
                <p className={`text-lg lg:text-xl font-medium max-w-xl leading-relaxed mx-auto lg:mx-0 ${darkMode ? 'text-slate-300' : 'text-blue-900/80'}`}>
                  The official job-matching portal for Barangay Cawayan Bogtong residents. 
                  Simple, secure, and built specifically for our community's livelihood.
                </p>

                {/* MOBILE ONLY BUTTONS */}
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 justify-center lg:hidden">
                  <button onClick={() => navigate("/register")} className={`w-full sm:w-auto px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:-translate-y-1 transition-all active:scale-95 ${darkMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500' : 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 hover:bg-blue-700'}`}>
                    Get Started!
                  </button>
                  <button onClick={() => navigate("/login")} className={`w-full sm:w-auto px-10 py-5 border rounded-2xl font-black text-sm uppercase tracking-widest hover:-translate-y-1 transition-all ${darkMode ? 'bg-transparent text-white border-white/20 hover:border-white/50 hover:bg-white/5' : 'bg-white/60 text-blue-900 border-white/60 hover:border-blue-400 hover:bg-white/90 shadow-sm'}`}>
                    Resume Session
                  </button>
                </div>
              </div>

              {/* Right Side: DESKTOP AUTH MODAL (FIXED SIZE) */}
              <div className="lg:col-span-5 relative hidden lg:flex justify-center items-center">
                 <div className={`absolute inset-0 rounded-[4rem] blur-2xl -rotate-6 transition-opacity duration-500 ${darkMode ? 'bg-gradient-to-tr from-blue-900/40 to-purple-900/40 opacity-50' : 'bg-gradient-to-tr from-blue-200/50 to-purple-200/50'}`}></div>
                 
                 {/* SHARED GLASS CARD CONTAINER - FIXED SIZE */}
                 <div className={`relative w-full max-w-sm flex flex-col p-6 md:p-8 rounded-[2rem] shadow-2xl border backdrop-blur-xl transition-all duration-300 h-[480px] overflow-hidden
                    ${darkMode ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]' : 'bg-white/60 border-white/60 shadow-[0_20px_50px_-10px_rgba(37,99,235,0.15)]'}`}>
                    
                    {/* SCROLLABLE INNER CONTENT */}
                    <div className={`h-full overflow-y-auto overflow-x-hidden pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full ${darkMode ? '[&::-webkit-scrollbar-thumb]:bg-white/10' : '[&::-webkit-scrollbar-thumb]:bg-blue-900/10'}`}>

                        {/* --- LOGIN MODE --- */}
                        {authMode === 'login' && (
                          <div className="flex-1 flex flex-col animate-in fade-in duration-500 min-h-full">
                            <div className="mb-6 text-center">
                                <h2 className={`text-2xl font-black tracking-tight mb-1 ${darkMode ? 'text-white' : 'text-blue-900'}`}>Secure Login</h2>
                                <p className={`text-[10px] font-bold uppercase tracking-widest opacity-60 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Access your account</p>
                            </div>

                            <div className={`flex p-1 rounded-xl mb-5 border ${darkMode ? 'bg-slate-800/50 border-white/10' : 'bg-white/60 border-white/60 shadow-inner'}`}>
                              <button onClick={() => setLoginMethod("email")} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all flex justify-center items-center gap-2 ${loginMethod === 'email' ? (darkMode ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-600 text-white shadow-lg') : (darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-blue-700 hover:bg-white/50')}`}><EnvelopeIcon className="w-4 h-4"/> EMAIL</button>
                              <button onClick={() => setLoginMethod("phone")} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all flex justify-center items-center gap-2 ${loginMethod === 'phone' ? (darkMode ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-600 text-white shadow-lg') : (darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-blue-700 hover:bg-white/50')}`}><PhoneIcon className="w-4 h-4"/> PHONE</button>
                            </div>

                            {loginMethod === "email" ? (
                              <form onSubmit={handleEmailLogin} className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div><label className={labelStyle}>Email Address</label><input type="email" required placeholder="name@example.com" value={loginIdentifier} onChange={(e) => setLoginIdentifier(e.target.value)} className={inputStyle} /></div>
                                <div><label className={labelStyle}>Password</label><div className="relative"><input type={showPassword ? "text" : "password"} required placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className={inputStyle} /><button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-blue-600'}`}>{showPassword ? <EyeSlashIcon className="w-4 h-4"/> : <EyeIcon className="w-4 h-4"/>}</button></div></div>
                                <div className="pt-2"><button disabled={loading} className={`w-full py-3.5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3 ${darkMode ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'}`}>{loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><ArrowRightOnRectangleIcon className="w-5 h-5"/> Sign In</>}</button></div>
                              </form>
                            ) : (
                              <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-300">
                                {!loginConfirmation ? (
                                  <form onSubmit={handlePhoneLogin} className="space-y-3">
                                    <div><label className={labelStyle}>Phone Number</label><div className={`flex w-full rounded-2xl border transition-all shadow-inner backdrop-blur-md overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50 ${darkMode ? 'bg-slate-800/50 border-white/10 focus-within:border-blue-500 text-white' : 'bg-white/60 border-white/60 focus-within:bg-white/90 focus-within:border-blue-400 text-blue-900'}`}><div className={`px-4 py-3.5 font-black border-r flex items-center justify-center ${darkMode ? 'bg-slate-900/50 border-white/10 text-slate-400' : 'bg-white/50 border-white/60 text-blue-700'}`}>+63</div><input type="tel" required maxLength="10" placeholder="9123456789" value={loginIdentifier} onChange={(e) => setLoginIdentifier(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-3.5 bg-transparent outline-none font-bold text-sm tracking-widest select-text cursor-text placeholder-current/40" /></div></div>
                                    <div id="recaptcha-landing-login"></div>
                                    <div className="pt-2"><button disabled={loading || loginIdentifier.length !== 10} className={`w-full py-3.5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3 ${darkMode ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'}`}>{loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Send Login Code"}</button></div>
                                  </form>
                                ) : (
                                  <form onSubmit={handleVerifyLoginOtp} className="space-y-3 animate-in fade-in zoom-in duration-300"><p className={`text-center text-[10px] font-black uppercase tracking-widest mb-3 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Code sent to <span className={darkMode ? 'text-white' : 'text-blue-900'}>+63 {loginIdentifier}</span></p><input type="text" placeholder="000000" maxLength="6" value={loginOtp} onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, ''))} className={`w-full p-4 rounded-2xl text-center text-4xl font-black tracking-[0.5em] outline-none border transition-all shadow-inner backdrop-blur-md select-text cursor-text ${darkMode ? 'bg-slate-800/50 border-white/10 focus:border-blue-500 text-white' : 'bg-white/40 border-white/60 focus:bg-white/90 focus:border-blue-400 text-blue-900'}`} /><div className="pt-2"><button disabled={loading || loginOtp.length < 6} className={`w-full py-3.5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3 ${darkMode ? 'bg-green-600 text-white hover:bg-green-500 shadow-green-500/20' : 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/30'}`}>{loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Verify & Login"}</button></div><button type="button" onClick={() => { setLoginConfirmation(null); clearRecaptcha(); setLoginOtp(""); }} className={`w-full mt-2 text-[10px] font-black uppercase tracking-widest transition-all ${darkMode ? 'text-slate-400 hover:text-white' : 'text-blue-600 opacity-60 hover:opacity-100'}`}>Change Number</button></form>
                                )}
                              </div>
                            )}

                            <div className={`mt-auto text-center border-t pt-4 ${darkMode ? 'border-white/10' : 'border-white/50'}`}>
                              <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>New here? <span onClick={() => setAuthMode('register')} className={`ml-2 cursor-pointer hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>Create an account</span></p>
                            </div>
                          </div>
                        )}

                        {/* --- REGISTER MODE --- */}
                        {authMode === 'register' && (
                          <div className="flex-1 flex flex-col animate-in fade-in duration-500 min-h-full">
                            <div className="flex flex-col mb-6">
                                <div className="flex justify-between items-center mb-4">
                                    {registerStep > 1 ? (<button onClick={handleRegisterBack} className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-blue-600/60'}`}>← Back</button>) : <div></div>}
                                    <div className="flex space-x-1">{[1,2,3,4,5].map(s => <div key={s} className={`h-1 rounded-full transition-all duration-700 ${registerStep >= s ? 'w-3 bg-blue-600' : (darkMode ? 'w-1 bg-slate-700' : 'w-1 bg-white/50')}`}/>)}</div>
                                </div>
                                <h2 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-blue-900'}`}>{registerStep === 1 && "Start Your Journey"}{registerStep === 2 && "Personal Details"}{registerStep === 3 && "Account Security"}{registerStep === 4 && "Verify Phone"}{registerStep === 5 && "Final Step"}</h2>
                            </div>

                            {registerStep === 1 && (
                              <div className="space-y-4">
                                <button onClick={() => setRegisterRole("applicant")} className={`w-full group py-6 rounded-[2rem] border transition-all duration-300 flex flex-col items-center gap-2 ${registerRole === 'applicant' ? (darkMode ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/20') : (darkMode ? 'bg-slate-800/50 border-white/10 text-slate-400 hover:text-white' : 'bg-white/60 border-white/60 text-blue-900')}`}><span className="text-3xl group-hover:scale-110 transition-transform">👷</span><span className="text-[10px] font-black uppercase tracking-widest">Job Seeker</span></button>
                                <button onClick={() => setRegisterRole("employer")} className={`w-full group py-6 rounded-[2rem] border transition-all duration-300 flex flex-col items-center gap-2 ${registerRole === 'employer' ? (darkMode ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/20') : (darkMode ? 'bg-slate-800/50 border-white/10 text-slate-400 hover:text-white' : 'bg-white/60 border-white/60 text-blue-900')}`}><span className="text-3xl group-hover:scale-110 transition-transform">💼</span><span className="text-[10px] font-black uppercase tracking-widest">Employer</span></button>
                                <button disabled={!registerRole} onClick={() => setRegisterStep(2)} className={`w-full py-4 mt-2 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 ${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`}>Continue</button>
                              </div>
                            )}

                            {/* ADDED SUFFIX TO STEP 2 */}
                            {registerStep === 2 && (
                              <form onSubmit={(e) => { e.preventDefault(); setRegisterStep(3); }} className="space-y-4">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div><label className={labelStyle}>First Name *</label><input name="firstName" required placeholder="Juan" value={registerData.firstName} className={inputStyle} onChange={handleRegisterInputChange} /></div>
                                    <div><label className={labelStyle}>Last Name *</label><input name="lastName" required placeholder="Dela Cruz" value={registerData.lastName} className={inputStyle} onChange={handleRegisterInputChange} /></div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div><label className={labelStyle}>Middle Name *</label><input name="middleName" required placeholder="Reyes" value={registerData.middleName} className={inputStyle} onChange={handleRegisterInputChange} /></div>
                                    <div><label className={labelStyle}>Suffix (Opt)</label><input name="suffix" placeholder="Jr, Sr, III" value={registerData.suffix} className={inputStyle} onChange={handleRegisterInputChange} /></div>
                                  </div>
                                  <button type="submit" className={`w-full py-4 mt-2 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 ${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`}>Next Step</button>
                              </form>
                            )}

                            {registerStep === 3 && (<form onSubmit={handleRegisterStep3Next} className="space-y-3"><div id="recaptcha-landing-register"></div><div><label className={labelStyle}>Email *</label><input name="email" type="email" required placeholder="name@example.com" value={registerData.email} className={inputStyle} onChange={handleRegisterInputChange} /></div><div><label className={labelStyle}>Password *</label><div className="relative"><input name="password" type={showPassword ? "text" : "password"} required placeholder="••••••••" value={registerData.password} className={inputStyle} onChange={handleRegisterInputChange} /><button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-blue-600'}`}>{showPassword ? <EyeSlashIcon className="w-4 h-4"/> : <EyeIcon className="w-4 h-4"/>}</button></div></div><div><label className={labelStyle}>Phone (Optional)</label><div className={`flex w-full rounded-2xl border transition-all shadow-inner backdrop-blur-md overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50 ${darkMode ? 'bg-slate-800/50 border-white/10 focus-within:border-blue-500 text-white' : 'bg-white/60 border-white/60 focus-within:bg-white/90 focus-within:border-blue-400 text-blue-900'}`}><div className={`px-4 py-3.5 font-black border-r flex items-center justify-center ${darkMode ? 'bg-slate-900/50 border-white/10 text-slate-400' : 'bg-white/50 border-white/60 text-blue-700'}`}>+63</div><input name="phoneNumber" type="tel" maxLength="10" placeholder="9123456789" value={registerData.phoneNumber} className="w-full px-4 py-3.5 bg-transparent outline-none font-bold text-sm tracking-widest select-text cursor-text placeholder-current/40" onChange={(e) => setRegisterData({...registerData, phoneNumber: e.target.value.replace(/\D/g, '')})} /></div></div><button disabled={loading} type="submit" className={`w-full py-4 mt-2 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3 ${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`}>{loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Create & Continue"}</button></form>)}
                            {registerStep === 4 && (<form onSubmit={handleVerifyRegisterOtp} className="space-y-4 pt-6"><p className={`text-center text-[10px] font-black uppercase tracking-widest mb-3 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Code sent to <span className={darkMode ? 'text-white' : 'text-blue-900'}>+63 {registerData.phoneNumber}</span></p><input type="text" placeholder="000000" maxLength="6" value={registerOtp} onChange={(e) => setRegisterOtp(e.target.value.replace(/\D/g, ''))} className={`w-full p-4 rounded-2xl text-center text-4xl font-black tracking-[0.5em] outline-none border transition-all shadow-inner backdrop-blur-md select-text cursor-text ${darkMode ? 'bg-slate-800/50 border-white/10 focus:border-blue-500 text-white' : 'bg-white/40 border-white/60 focus:bg-white/90 focus:border-blue-400 text-blue-900'}`} /><button disabled={loading || registerOtp.length < 6} className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3 ${darkMode ? 'bg-green-600 text-white' : 'bg-green-600 text-white'}`}>{loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Verify Phone"}</button></form>)}
                            {registerStep === 5 && (<form onSubmit={handleFinalRegisterSubmit} className="space-y-3"><div><label className={labelStyle}>Select Purok *</label><div className="flex flex-wrap gap-2">{PUROK_LIST.map((sName) => (<button type="button" key={sName} onClick={() => setRegisterData({ ...registerData, sitio: sName })} className={`px-3 py-2.5 rounded-xl border transition-all font-black text-[9px] uppercase tracking-widest flex-grow text-center ${registerData.sitio === sName ? (darkMode ? 'bg-blue-600 border-blue-500 text-white shadow-md' : 'bg-blue-600 border-blue-600 text-white shadow-lg') : (darkMode ? 'bg-slate-800/50 border-white/10 text-slate-400 hover:bg-slate-700' : 'bg-white/60 border-white/60 text-blue-900 hover:bg-white/90')}`}>{sName}</button>))}</div></div><div className={`p-3 rounded-2xl border transition-colors ${darkMode ? 'bg-slate-800/50 border-white/10' : 'bg-white/60 border-white/60 shadow-inner'}`}><label className={`text-[10px] font-black uppercase tracking-widest flex justify-between mb-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}><span>Proof of Residency *</span><span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>{proofFiles.length}/3</span></label><input type="file" accept="image/*,application/pdf" multiple onChange={handleFileChange} className={`w-full px-2 py-1.5 border rounded-xl text-xs outline-none transition-all font-medium ${darkMode ? 'bg-slate-900/50 border-white/10 text-slate-300' : 'bg-white/50 border-white/60 text-blue-900'} file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[9px] file:font-black file:uppercase file:tracking-widest file:transition-colors ${darkMode ? 'file:bg-blue-600 file:text-white hover:file:bg-blue-500' : 'file:bg-blue-600 file:text-white hover:file:bg-blue-700'}`} />{proofFiles.length > 0 && (<div className="mt-2 space-y-1.5">{proofFiles.map((file, idx) => (<div key={idx} className={`flex justify-between items-center px-2.5 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}><span className={`text-[10px] font-bold truncate pr-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{file.name}</span><button type="button" onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-500"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></button></div>))}</div>)}</div>{registerRole === "employer" && (<div className="space-y-2 pt-1"><div onClick={() => setHasBusiness(!hasBusiness)} className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${hasBusiness ? (darkMode ? 'border-blue-500 bg-blue-900/20' : 'border-blue-400 bg-blue-50') : (darkMode ? 'border-white/10 bg-slate-800/50' : 'border-white/60 bg-white/60')}`}><div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-colors ${hasBusiness ? 'bg-blue-600 border-blue-600' : (darkMode ? 'border-slate-600' : 'border-slate-300')}`}>{hasBusiness && <span className="text-white text-[10px] font-bold">✓</span>}</div><span className={`text-[10px] font-black uppercase tracking-widest ${hasBusiness ? (darkMode ? 'text-blue-300' : 'text-blue-800') : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>I have a registered business</span></div>{hasBusiness && <input name="businessName" required placeholder="Company Name" className={`${inputStyle} py-3 text-xs`} onChange={handleRegisterInputChange} />}</div>)}<div className="pt-2"><button disabled={loading || !registerData.sitio || proofFiles.length === 0} type="submit" className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex justify-center items-center gap-3 ${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`}>{loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Complete"}</button></div></form>)}

                            <div className={`mt-auto text-center border-t pt-4 ${darkMode ? 'border-white/10' : 'border-white/50'}`}>
                              <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Already have an account? <span onClick={() => setAuthMode('login')} className={`ml-2 cursor-pointer hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>Sign In</span></p>
                            </div>
                          </div>
                        )}

                    </div>
                 </div>
              </div>

            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="py-24 px-6 relative z-10">
          <div className="max-w-7xl mx-auto text-center mb-16">
            <h3 className={`text-3xl font-black uppercase tracking-tight ${darkMode ? 'text-white' : 'text-blue-950'}`}>Why Choose Livelimatch?</h3>
          </div>
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
              {[
                { title: "Localized Jobs", desc: "Find work opportunities directly inside Barangay Cawayan Bogtong and nearby areas.", icon: "📍" },
                { title: "User-Friendly", desc: "Clean and simple interface for residents who are not tech-savvy.", icon: "✨" },
                { title: "Secure Profile", desc: "Every account is verified by email or phone to ensure community safety.", icon: "🛡️" }
              ].map((feature, idx) => (
                <div key={idx} className={`group p-10 rounded-[3rem] transition-all duration-500 border text-center lg:text-left backdrop-blur-sm
                  ${darkMode ? 'bg-slate-900/30 border-white/5 hover:border-white/20 hover:bg-slate-800/50 shadow-lg' : 'bg-white/40 border-white/50 hover:border-white/80 hover:bg-white/70 shadow-xl shadow-blue-900/5'}`}>
                  
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform duration-500 mx-auto lg:mx-0 border shadow-inner
                    ${darkMode ? 'bg-slate-800/50 border-white/10' : 'bg-white/60 border-white/60'}`}>
                    {feature.icon}
                  </div>
                  
                  <h4 className={`text-xl font-black mb-4 ${darkMode ? 'text-white' : 'text-blue-950'}`}>{feature.title}</h4>
                  <p className={`leading-relaxed font-medium ${darkMode ? 'text-slate-400' : 'text-blue-900/70'}`}>{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className={`w-full py-12 border-t transition-colors duration-300 relative z-10 mt-auto
        ${darkMode ? 'border-white/10 bg-slate-900/20 backdrop-blur-sm' : 'border-blue-200/50 bg-white/20 backdrop-blur-sm'}`}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <p className="text-xl font-black tracking-tighter leading-none">LIVELI<span className="text-blue-600 dark:text-blue-500">MATCH</span></p>
            <p className={`text-[8px] font-bold uppercase tracking-widest mt-2 ${darkMode ? 'opacity-40 text-slate-300' : 'opacity-60 text-blue-900'}`}>© 2026 Barangay Cawayan Bogtong Livelihood Portal</p>
          </div>
          <div className="flex gap-6 sm:gap-10">
            <button className={`text-[10px] font-black uppercase tracking-widest transition-colors ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-blue-900'}`}>Privacy Policy</button>
            <button className={`text-[10px] font-black uppercase tracking-widest transition-colors ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-blue-900'}`}>Terms of Use</button>
            <button className={`text-[10px] font-black uppercase tracking-widest transition-colors ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-blue-900'}`}>Help Center</button>
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