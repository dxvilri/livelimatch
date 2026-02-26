import { useState, useEffect } from "react";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  linkWithPhoneNumber,
  RecaptchaVerifier
} from "firebase/auth";
import { auth, db, storage } from "../firebase/config";
import { doc, setDoc, getDocs, collection, query, where, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { EyeIcon, EyeSlashIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import Toast from "../components/Toast"; 

export default function Register() {
  const navigate = useNavigate();

  // --- UI & STEP CONTROL STATES ---
  const [role, setRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); 
  
  const [toast, setToast] = useState({ show: false, message: "", type: "error" });

  const [hasBusiness, setHasBusiness] = useState(false);
  const [proofFiles, setProofFiles] = useState([]); 

  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);

  // --- DATA STATES (Added Suffix) ---
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    phoneNumber: "", 
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "", 
    sitio: "", 
    businessName: "",
  });

  const PUROK_LIST = [
    "Sagur", "Ampungan", "Centro 1", "Centro 2", "Centro 3", "Bypass Road", "Boundary"
  ];

  // --- DARK MODE ---
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const triggerToast = (message, type = "error") => {
    setToast({ show: true, message, type });
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const formatPhone = (input) => {
    if (!input) return "";
    let num = input.replace(/\D/g, ''); 
    return "+63" + num;
  };

  const capitalizeName = (str) => {
    if (!str) return "";
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // UPDATED: Now includes admin collection & empty string protection
  const checkDuplicate = async (field, value) => {
    if (!value) return false; 
    
    const qApp = query(collection(db, "applicants"), where(field, "==", value));
    const qEmp = query(collection(db, "employers"), where(field, "==", value));
    const qAdmin = query(collection(db, "admins"), where(field, "==", value));
    
    const [snapApp, snapEmp, snapAdmin] = await Promise.all([getDocs(qApp), getDocs(qEmp), getDocs(qAdmin)]);
    
    return !snapApp.empty || !snapEmp.empty || !snapAdmin.empty;
  };

  const checkNameExists = async () => {
    const normalizeName = (name) => (name || "").replace(/\s+/g, '').toLowerCase();

    const fName = normalizeName(formData.firstName);
    const mName = normalizeName(formData.middleName);
    const lName = normalizeName(formData.lastName);
    const sName = normalizeName(formData.suffix);
    
    const [appSnap, empSnap] = await Promise.all([
      getDocs(collection(db, "applicants")),
      getDocs(collection(db, "employers"))
    ]);

    let duplicateFound = false;

    const evaluateDoc = (doc) => {
      const data = doc.data();
      const dataFName = normalizeName(data.firstName);
      const dataMName = normalizeName(data.middleName);
      const dataLName = normalizeName(data.lastName);
      const dataSName = normalizeName(data.suffix || "");

      if (dataFName === fName && dataMName === mName && dataLName === lName && dataSName === sName && data.status !== 'rejected') {
          duplicateFound = true;
      }
    };
    
    appSnap.forEach(evaluateDoc);
    empSnap.forEach(evaluateDoc);

    return duplicateFound;
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (proofFiles.length + selected.length > 3) {
      triggerToast("You can only upload a maximum of 3 files.", "error");
      return;
    }
    setProofFiles([...proofFiles, ...selected]);
  };

  const removeFile = (indexToRemove) => {
    setProofFiles(proofFiles.filter((_, index) => index !== indexToRemove));
  };

  // NEW: Resend OTP Logic
  const handleResendOtp = async () => {
    setLoading(true);
    try {
      if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
      }
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-register', { size: 'invisible' });
      
      const confirmation = await linkWithPhoneNumber(auth.currentUser, formatPhone(formData.phoneNumber), window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      triggerToast("OTP resent successfully!", "info");
    } catch (err) {
      triggerToast("Failed to resend SMS OTP. Please try again.", "error");
      if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
      }
    }
    setLoading(false);
  };

  // --- STEP 3 SUBMIT ---
  const handleStep3Next = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const isNameTaken = await checkNameExists();
      if (isNameTaken) {
         triggerToast("An account with this exact Full Name already exists.", "error");
         setLoading(false); return;
      }

      const emailExists = await checkDuplicate("email", formData.email);
      if (emailExists) {
        triggerToast("Email is already in use.", "error");
        setLoading(false); return;
      }

      const finalPhone = formData.phoneNumber ? formatPhone(formData.phoneNumber) : "";
      if (finalPhone) {
        const phoneExists = await checkDuplicate("contact", finalPhone);
        if (phoneExists) {
            triggerToast("Phone number is already registered to another account.", "error");
            setLoading(false); return;
        }
      }

      let userObj = auth.currentUser;
      if (!userObj || userObj.email !== formData.email) {
          try {
              const res = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
              userObj = res.user;
          } catch (err) {
              if (err.code === "auth/email-already-in-use") {
                  try {
                      const res = await signInWithEmailAndPassword(auth, formData.email, formData.password);
                      userObj = res.user;
                  } catch (signInErr) {
                      triggerToast("This email is taken or password incorrect.", "error");
                      setLoading(false); return;
                  }
              } else {
                  triggerToast(err.message, "error");
                  setLoading(false); return;
              }
          }
      }

      if (finalPhone) {
          if (userObj.phoneNumber === finalPhone) {
              setStep(5);
              setLoading(false); return;
          }

          // FIX: Always clear and recreate the verifier here
          if (window.recaptchaVerifier) {
              window.recaptchaVerifier.clear();
              window.recaptchaVerifier = null;
          }
          window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-register', { size: 'invisible' });

          try {
              const confirmation = await linkWithPhoneNumber(userObj, finalPhone, window.recaptchaVerifier);
              setConfirmationResult(confirmation);
              setStep(4); 
          } catch (smsErr) {
              console.error("SMS Error:", smsErr);
              if (smsErr.code === 'auth/credential-already-in-use') {
                  triggerToast("This phone number is already used by another account.", "error");
              } else {
                  triggerToast("Failed to send SMS OTP. Please check your number.", "error");
              }
              
              if (window.recaptchaVerifier) {
                  window.recaptchaVerifier.clear();
                  window.recaptchaVerifier = null;
              }
          }
      } else {
          setStep(5);
      }
    } catch (err) {
        console.error(err);
        triggerToast("An unexpected error occurred.", "error");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        await confirmationResult.confirm(otp);
        setStep(5); 
    } catch (err) {
        console.error(err);
        triggerToast("Invalid OTP code. Please try again.", "error");
    }
    setLoading(false);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (proofFiles.length === 0) {
      triggerToast("Please upload at least 1 proof of residency.", "error");
      return;
    }
    setLoading(true);
    
    const userObj = auth.currentUser;
    const userUid = userObj.uid;
    const finalPhone = formData.phoneNumber ? formatPhone(formData.phoneNumber) : "";

    const formattedFirstName = capitalizeName(formData.firstName.trim());
    const formattedMiddleName = capitalizeName(formData.middleName.trim());
    const formattedLastName = capitalizeName(formData.lastName.trim());
    const formattedSuffix = capitalizeName(formData.suffix.trim());

    try {
        const uploadedUrls = [];
        for (let i = 0; i < proofFiles.length; i++) {
            const file = proofFiles[i];
            const fileExtension = file.name.split('.').pop();
            const proofRef = ref(storage, `proofOfResidency/${userUid}_file${i + 1}.${fileExtension}`);
            await uploadBytes(proofRef, file);
            const url = await getDownloadURL(proofRef);
            uploadedUrls.push(url);
        }

        const collectionName = role === "applicant" ? "applicants" : "employers";
        
        await setDoc(doc(db, collectionName, userUid), {
            uid: userUid,
            role: role,
            email: formData.email,
            contact: finalPhone || "",
            firstName: formattedFirstName,
            middleName: formattedMiddleName, 
            lastName: formattedLastName,
            suffix: formattedSuffix, 
            sitio: formData.sitio,
            proofOfResidencyUrls: uploadedUrls,
            proofOfResidencyUrl: uploadedUrls[0],
            status: "pending", 
            createdAt: new Date().toISOString(),
            ...(role === "employer" && hasBusiness && { businessName: formData.businessName })
        });

        await addDoc(collection(db, "mail"), {
            to: formData.email,
            message: {
                subject: "Registration Received - Livelimatch Verification",
                html: `
                    <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                        <h2 style="color: #1e3a8a;">Hello ${formattedFirstName},</h2>
                        <p>We received your registration for the Brgy. Cawayan Bogtong Livelimatch portal.</p>
                        <p>Your account is currently <strong style="color: #ea580c;">PENDING</strong>. Our admin will verify your proof of residency within 1 to 3 working days.</p>
                        <p>We will send you another email as soon as your account is approved.</p>
                        <br>
                        <p>Thank you,<br><strong>Livelimatch Admin Team</strong></p>
                    </div>
                `
            }
        });

        await signOut(auth);
        if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
        }

        triggerToast("Registration successful! Your account is pending admin verification.", "info");
        setTimeout(() => {
            navigate("/login");
        }, 3500); 

    } catch (err) {
        console.error(err);
        triggerToast(err.message, "error");
        setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 5 && !formData.phoneNumber) setStep(3);
    else setStep(step - 1);
  };

  const inputStyle = `w-full p-3.5 rounded-2xl outline-none border transition-all font-bold text-sm shadow-inner backdrop-blur-md select-text cursor-text 
    ${darkMode ? 'bg-slate-800/50 border-white/10 focus:border-blue-500 text-white' : 'bg-white/60 border-white/60 focus:bg-white/90 focus:border-blue-400 text-blue-900 placeholder-blue-400/60'}`;
  const labelStyle = `block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`;

  return (
    <div className={`flex flex-col h-screen overflow-hidden relative font-sans select-none cursor-default transition-colors duration-500 
      ${darkMode ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white' : 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 text-blue-900'}`}>
      
      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast({ show: false, message: "", type: "error" })} 
        />
      )}

      <div className={`absolute -right-10 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none rotate-12 transition-transform duration-500 z-0 
        ${darkMode ? 'text-white/30' : 'text-blue-500'}`}>
          <UserPlusIcon className="w-[30rem] h-[30rem] md:w-[45rem] md:h-[45rem]" />
      </div>

      <header className={`w-full h-16 shrink-0 z-50 flex items-center transition-all duration-300 border-b 
        ${darkMode ? 'border-white/10' : 'border-blue-200/50'}`}>
        <div className="max-w-7xl mx-auto w-full px-6 flex justify-start sm:justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-black tracking-tighter shrink-0 cursor-pointer" onClick={() => navigate("/")}>
            LIVELI<span className="text-blue-600 dark:text-blue-500">MATCH</span>
          </h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-start px-8 md:px-16 lg:px-24 relative z-10 overflow-hidden pb-24 md:pb-0">
        <div 
          className={`w-full max-w-sm md:max-w-3xl flex flex-col md:flex-row rounded-[2rem] relative overflow-hidden transition-all duration-300 shadow-2xl border backdrop-blur-xl md:h-[420px] md:min-h-[420px]
            ${darkMode 
              ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]' 
              : 'bg-white/60 border-white/60 shadow-[0_20px_50px_-10px_rgba(37,99,235,0.15)]'}`}
        >
          
          <div className="hidden md:flex w-2/5 p-8 flex-col justify-start relative z-10">
              {step > 1 && (
                <button 
                  onClick={handleBack} 
                  className={`self-start mb-4 text-[10px] font-black uppercase tracking-widest transition-colors ${darkMode ? 'text-slate-400 hover:text-white' : 'text-blue-600/60 hover:text-blue-900'}`}
                >
                  ← Back
                </button>
              )}
              
              <div className={step === 1 ? 'mt-8' : ''}>
                <h2 className={`text-3xl font-black tracking-tight mb-2 ${darkMode ? 'text-white' : 'text-blue-900'}`}>
                  {step === 1 && "Start Your Journey"}
                  {step === 2 && "Personal Details"}
                  {step === 3 && "Account Security"}
                  {step === 4 && "Verify Phone"}
                  {step === 5 && "Final Step"}
                </h2>
                <p className={`text-[10px] font-bold uppercase tracking-widest opacity-70 mb-4 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  Step {step} of 5
                </p>
                <p className={`text-xs font-medium leading-relaxed opacity-80 ${darkMode ? 'text-slate-300' : 'text-blue-900'}`}>
                  {step === 1 && "Choose how you want to use the platform to begin."}
                  {step === 2 && "Enter your full legal name exactly as it appears on your ID."}
                  {step === 3 && "Set up your login credentials and contact details."}
                  {step === 4 && "Enter the 6-digit code sent to your mobile device."}
                  {step === 5 && "Verify your residency in Brgy. Cawayan Bogtong to proceed."}
                </p>
              </div>

              <div className="flex space-x-2 mt-auto pb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div key={s} className={`h-1.5 rounded-full transition-all duration-700 ${step >= s ? 'w-6 bg-blue-600' : (darkMode ? 'w-2 bg-slate-700' : 'w-2 bg-white/50')}`} />
                ))}
              </div>
          </div>

          <div className={`w-full md:w-3/5 flex flex-col p-6 md:p-8 relative z-10 md:border-l ${darkMode ? 'md:bg-slate-900/40 md:border-white/10' : 'md:bg-white/40 md:border-white/50'}`}>
              
              <div className="md:hidden flex flex-col mb-6">
                  <div className="flex justify-between items-center mb-4">
                      {step > 1 ? (
                        <button onClick={handleBack} className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-blue-600/60'}`}>← Back</button>
                      ) : <div></div>}
                      <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Step {step} of 5</p>
                  </div>
                  <h2 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-blue-900'}`}>
                    {step === 1 && "Start Your Journey"}
                    {step === 2 && "Personal Details"}
                    {step === 3 && "Account Security"}
                    {step === 4 && "Verify Phone"}
                    {step === 5 && "Final Step"}
                  </h2>
              </div>

              <div className="flex-1 flex flex-col justify-start">
                  
                  {/* FIX: Moved Recaptcha to always be in the DOM */}
                  <div id="recaptcha-register"></div>

                  {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setRole("applicant")} className={`group py-8 rounded-[2rem] border transition-all duration-300 flex flex-col items-center gap-3 
                            ${role === 'applicant' ? (darkMode ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/20') : (darkMode ? 'bg-slate-800/50 border-white/10 text-slate-400 hover:border-white/30 hover:text-white' : 'bg-white/60 border-white/60 text-blue-900 hover:border-blue-300')}`}>
                            <span className="text-4xl group-hover:scale-110 transition-transform">👷</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Job Seeker</span>
                        </button>
                        <button onClick={() => setRole("employer")} className={`group py-8 rounded-[2rem] border transition-all duration-300 flex flex-col items-center gap-3 
                            ${role === 'employer' ? (darkMode ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/20') : (darkMode ? 'bg-slate-800/50 border-white/10 text-slate-400 hover:border-white/30 hover:text-white' : 'bg-white/60 border-white/60 text-blue-900 hover:border-blue-300')}`}>
                            <span className="text-4xl group-hover:scale-110 transition-transform">💼</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Employer</span>
                        </button>
                      </div>
                      <div className="pt-4">
                        <button disabled={!role} onClick={() => setStep(2)} className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                          ${darkMode ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'}`}>
                          Continue
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelStyle}>First Name *</label>
                            <input name="firstName" required placeholder="Juan" value={formData.firstName} className={inputStyle} onChange={handleInputChange} />
                          </div>
                          <div>
                            <label className={labelStyle}>Last Name *</label>
                            <input name="lastName" required placeholder="Dela Cruz" value={formData.lastName} className={inputStyle} onChange={handleInputChange} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelStyle}>Middle Name *</label>
                            <input name="middleName" required placeholder="Reyes" value={formData.middleName} className={inputStyle} onChange={handleInputChange} />
                          </div>
                          <div>
                            <label className={labelStyle}>Suffix (Opt)</label>
                            <input name="suffix" placeholder="Jr, Sr, III" value={formData.suffix} className={inputStyle} onChange={handleInputChange} />
                          </div>
                        </div>
                        <div className="pt-3">
                          <button type="submit" className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 flex justify-center items-center gap-3
                            ${darkMode ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'}`}>
                            Next Step
                          </button>
                        </div>
                    </form>
                  )}

                  {step === 3 && (
                    <form onSubmit={handleStep3Next} className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div>
                          <label className={labelStyle}>Email Address *</label>
                          <input name="email" type="email" placeholder="name@example.com" value={formData.email} required className={inputStyle} onChange={handleInputChange} />
                        </div>
                        <div>
                          <label className={labelStyle}>Password *</label>
                          <div className="relative">
                            <input name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.password} required className={inputStyle} onChange={handleInputChange} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-blue-600'}`}>
                              {showPassword ? <EyeSlashIcon className="w-4 h-4"/> : <EyeIcon className="w-4 h-4"/>}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className={labelStyle}>Phone (Optional)</label>
                          <div className={`flex w-full rounded-2xl border transition-all shadow-inner backdrop-blur-md overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50 
                            ${darkMode ? 'bg-slate-800/50 border-white/10 focus-within:border-blue-500 text-white' : 'bg-white/60 border-white/60 focus-within:bg-white/90 focus-within:border-blue-400 text-blue-900'}`}>
                            <div className={`px-4 py-3.5 font-black border-r flex items-center justify-center ${darkMode ? 'bg-slate-900/50 border-white/10 text-slate-400' : 'bg-white/50 border-white/60 text-blue-700'}`}>
                              +63
                            </div>
                            <input 
                              name="phoneNumber" 
                              type="tel" 
                              maxLength="10"
                              placeholder="9123456789" 
                              value={formData.phoneNumber} 
                              className="w-full px-4 py-3.5 bg-transparent outline-none font-bold text-sm tracking-widest select-text cursor-text placeholder-current/40" 
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setFormData({ ...formData, phoneNumber: val });
                              }} 
                            />
                          </div>
                        </div>
                        <div className="pt-2">
                          <button disabled={loading} type="submit" className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3
                            ${darkMode ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'}`}>
                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Create & Continue"}
                          </button>
                        </div>
                    </form>
                  )}

                  {step === 4 && (
                    <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500 pt-6">
                        <p className={`text-center text-[10px] font-black uppercase tracking-widest mb-3 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                          Code sent to <span className={darkMode ? 'text-white' : 'text-blue-900'}>+63 {formData.phoneNumber}</span>
                        </p>
                        <input 
                            type="text" 
                            placeholder="000000" 
                            maxLength="6" 
                            value={otp}
                            className={`w-full p-4 rounded-2xl text-center text-4xl font-black tracking-[0.5em] outline-none border transition-all shadow-inner backdrop-blur-md select-text cursor-text 
                              ${darkMode ? 'bg-slate-800/50 border-white/10 focus:border-blue-500 text-white' : 'bg-white/40 border-white/60 focus:bg-white/90 focus:border-blue-400 text-blue-900'}`} 
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
                        />
                        <div className="pt-4">
                          <button disabled={loading || otp.length < 6} className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3
                            ${darkMode ? 'bg-green-600 text-white hover:bg-green-500 shadow-green-500/20' : 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/30'}`}>
                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Verify Phone"}
                          </button>
                        </div>
                        
                        <div className="flex justify-center items-center mt-4">
                            <button type="button" onClick={handleResendOtp} disabled={loading} className={`text-[10px] font-black uppercase tracking-widest transition-all ${darkMode ? 'text-slate-400 hover:text-white' : 'text-blue-600 opacity-60 hover:opacity-100'}`}>
                                Resend Code
                            </button>
                        </div>
                    </form>
                  )}

                  {step === 5 && (
                    <form onSubmit={handleFinalSubmit} className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div>
                        <label className={labelStyle}>Select Purok *</label>
                        <div className="flex flex-wrap gap-2">
                          {PUROK_LIST.map((sName) => (
                              <button type="button" key={sName} onClick={() => setFormData({ ...formData, sitio: sName })} 
                                className={`px-3 py-2.5 rounded-xl border transition-all font-black text-[9px] uppercase tracking-widest flex-grow text-center
                                ${formData.sitio === sName ? (darkMode ? 'bg-blue-600 border-blue-500 text-white shadow-md' : 'bg-blue-600 border-blue-600 text-white shadow-lg') : (darkMode ? 'bg-slate-800/50 border-white/10 text-slate-400 hover:bg-slate-700' : 'bg-white/60 border-white/60 text-blue-900 hover:bg-white/90')}`}>
                                {sName}
                              </button>
                          ))}
                        </div>
                      </div>

                      <div className={`p-3 rounded-2xl border transition-colors ${darkMode ? 'bg-slate-800/50 border-white/10' : 'bg-white/60 border-white/60 shadow-inner'}`}>
                        <label className={`text-[10px] font-black uppercase tracking-widest flex justify-between mb-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                            <span>Proof of Residency *</span>
                            <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>{proofFiles.length}/3 Files</span>
                        </label>
                        <p className={`text-[9px] mb-2 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Brgy. Cawayan Bogtong only. (e.g. <strong className={darkMode ? 'text-white' : 'text-blue-900'}>Front ID, Back ID</strong>).
                        </p>
                        <input 
                          type="file" 
                          accept="image/*,application/pdf"
                          multiple
                          onChange={handleFileChange}
                          className={`w-full px-2 py-1.5 border rounded-xl text-xs outline-none transition-all font-medium 
                          ${darkMode ? 'bg-slate-900/50 border-white/10 text-slate-300' : 'bg-white/50 border-white/60 text-blue-900'}
                          file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[9px] file:font-black file:uppercase file:tracking-widest file:transition-colors
                          ${darkMode ? 'file:bg-blue-600 file:text-white hover:file:bg-blue-500' : 'file:bg-blue-600 file:text-white hover:file:bg-blue-700'}`} 
                        />
                        {proofFiles.length > 0 && (
                          <div className="mt-2 space-y-1.5 animate-in fade-in duration-300">
                            {proofFiles.map((file, idx) => (
                              <div key={idx} className={`flex justify-between items-center px-2.5 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <span className={`text-[10px] font-bold truncate pr-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{file.name}</span>
                                <button type="button" onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-500 transition-colors">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {role === "employer" && (
                        <div className="space-y-2 pt-1">
                            <div onClick={() => setHasBusiness(!hasBusiness)} className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${hasBusiness ? (darkMode ? 'border-blue-500 bg-blue-900/20' : 'border-blue-400 bg-blue-50') : (darkMode ? 'border-white/10 bg-slate-800/50' : 'border-white/60 bg-white/60')}`}>
                                <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-colors ${hasBusiness ? 'bg-blue-600 border-blue-600' : (darkMode ? 'border-slate-600' : 'border-slate-300')}`}>
                                    {hasBusiness && <span className="text-white text-[10px] font-bold">✓</span>}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${hasBusiness ? (darkMode ? 'text-blue-300' : 'text-blue-800') : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>I have a registered business</span>
                            </div>
                            {hasBusiness && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <input name="businessName" required placeholder="Company Name" className={`${inputStyle} py-3 text-xs`} onChange={handleInputChange} />
                                </div>
                            )}
                        </div>
                      )}
                      
                      <div className="pt-2">
                        <button disabled={loading || !formData.sitio || proofFiles.length === 0} type="submit" className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex justify-center items-center gap-3
                          ${darkMode ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'}`}>
                          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Complete Registration"}
                        </button>
                      </div>
                    </form>
                  )}
              </div>

              <div className={`mt-auto text-center border-t pt-4 relative z-10 ${darkMode ? 'border-white/10' : 'border-white/50'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Already have an account? 
                  <span onClick={() => navigate("/login")} className={`ml-2 cursor-pointer hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>Sign In</span>
                </p>
              </div>

          </div>
        </div>
      </main>

      <footer className={`w-full h-14 shrink-0 border-t flex items-center transition-colors duration-300 
        ${darkMode ? 'border-white/10' : 'border-blue-200/50'}`}>
        <div className="max-w-7xl mx-auto w-full px-6 flex justify-start items-center">
        </div>
      </footer>
    </div>
  );
}