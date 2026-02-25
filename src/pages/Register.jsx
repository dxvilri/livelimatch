import { useState } from "react";
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
import Toast from "../components/Toast"; 

export default function Register() {
  const navigate = useNavigate();

  // --- UI & STEP CONTROL STATES ---
  const [role, setRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); 
  
  // Custom Toast State
  const [toast, setToast] = useState({ show: false, message: "", type: "error" });

  // States for business & file upload
  const [hasBusiness, setHasBusiness] = useState(false);
  const [proofFiles, setProofFiles] = useState([]); 

  // States for OTP Verification (In Step 2)
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);

  // --- DATA STATES ---
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    phoneNumber: "", 
    firstName: "",
    middleName: "",
    lastName: "",
    sitio: "", 
    businessName: "",
  });

  const PUROK_LIST = [
    "Sagur", "Ampungan", "Centro 1", "Centro 2", "Centro 3", "Bypass Road", "Boundary"
  ];

  // --- HELPER FUNCTIONS ---
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

  const checkDuplicate = async (field, value) => {
    const qApp = query(collection(db, "applicants"), where(field, "==", value));
    const qEmp = query(collection(db, "employers"), where(field, "==", value));
    const [snapApp, snapEmp] = await Promise.all([getDocs(qApp), getDocs(qEmp)]);
    return !snapApp.empty || !snapEmp.empty;
  };

  // --- DUPLICATE NAME CHECK (Robust: Removes spaces and ignores caps) ---
  const checkNameExists = async () => {
    const normalizeName = (name) => (name || "").replace(/\s+/g, '').toLowerCase();

    const fName = normalizeName(formData.firstName);
    const mName = normalizeName(formData.middleName);
    const lName = normalizeName(formData.lastName);
    
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

      if (dataFName === fName && dataMName === mName && dataLName === lName && data.status !== 'rejected') {
          duplicateFound = true;
      }
    };
    
    appSnap.forEach(evaluateDoc);
    empSnap.forEach(evaluateDoc);

    return duplicateFound;
  };

  // --- MULTI-FILE UPLOAD LOGIC ---
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


  // --- STEP 2 SUBMIT (CHECKS ALL DUPLICATES, CREATES ACCOUNT & SENDS OTP) ---
  const handleStep2Next = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 0. Check Name Duplicate First (Blocks spam accounts immediately)
      const isNameTaken = await checkNameExists();
      if (isNameTaken) {
         triggerToast("An account with this exact First, Middle, and Last Name already exists.", "error");
         setLoading(false); return;
      }

      // 1. Check if email exists
      const emailExists = await checkDuplicate("email", formData.email);
      if (emailExists) {
        triggerToast("Email is already in use.", "error");
        setLoading(false); return;
      }

      // 2. Check if phone exists
      const finalPhone = formData.phoneNumber ? formatPhone(formData.phoneNumber) : "";
      if (finalPhone) {
        const phoneExists = await checkDuplicate("contact", finalPhone);
        if (phoneExists) {
            triggerToast("Phone number is already registered to another account.", "error");
            setLoading(false); return;
        }
      }

      // 3. Create or Log In the User
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

      // 4. Send OTP if phone provided
      if (finalPhone) {
          if (userObj.phoneNumber === finalPhone) {
              setStep(3);
              setLoading(false); return;
          }

          if (!window.recaptchaVerifier) {
              window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-register', { size: 'invisible' });
          }

          try {
              const confirmation = await linkWithPhoneNumber(userObj, finalPhone, window.recaptchaVerifier);
              setConfirmationResult(confirmation);
              setShowOtpInput(true); 
          } catch (smsErr) {
              console.error("SMS Error:", smsErr);
              triggerToast("Failed to send SMS OTP. Please check your number.", "error");
              if (window.recaptchaVerifier) {
                  window.recaptchaVerifier.clear();
                  window.recaptchaVerifier = null;
              }
          }
      } else {
          setStep(3);
      }
    } catch (err) {
        console.error(err);
        triggerToast("An unexpected error occurred.", "error");
    }
    setLoading(false);
  };

  // --- VERIFY OTP FUNCTION ---
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        await confirmationResult.confirm(otp);
        setShowOtpInput(false);
        setStep(3); 
    } catch (err) {
        console.error(err);
        triggerToast("Invalid OTP code. Please try again.", "error");
    }
    setLoading(false);
  };

  // --- FINAL SUBMIT (UPLOADS FILES & FIRESTORE) ---
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

    // Capitalize names before saving
    const formattedFirstName = capitalizeName(formData.firstName.trim());
    const formattedMiddleName = capitalizeName(formData.middleName.trim());
    const formattedLastName = capitalizeName(formData.lastName.trim());

    try {
        // Upload All Selected Files to Firebase Storage
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

        // Clear everything out
        await signOut(auth);
        if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
        }

        // Show Success Toast and Delay Navigation so they can read it
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

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-gray-800 font-sans overflow-x-hidden relative">
      
      {/* RENDER TOAST IF ACTIVE */}
      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast({ show: false, message: "", type: "error" })} 
        />
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
          
          {step > 1 && (
            <button 
              onClick={() => {
                if (showOtpInput) setShowOtpInput(false);
                else setStep(step - 1);
              }} 
              className="absolute left-10 top-10 text-slate-400 hover:text-blue-900 text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              ← Back
            </button>
          )}

          <div className="flex justify-center space-x-2 mb-10 mt-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-700 ${step >= s ? 'w-8 bg-blue-900' : 'w-2 bg-slate-100'}`} />
            ))}
          </div>

          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {step === 1 && "Start Your Journey"}
              {step === 2 && !showOtpInput && "Account Details"}
              {step === 2 && showOtpInput && "Verify Phone Number"}
              {step === 3 && "Final Verification"}
            </h2>
            <p className="text-blue-600 text-[10px] mt-2 font-black uppercase tracking-[0.2em]">
              Step {step} of 3
            </p>
          </div>

          {/* STEP 1: ROLE */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setRole("applicant")} className={`group py-8 rounded-[2.5rem] border-2 transition-all duration-500 font-black flex flex-col items-center gap-3 ${role === 'applicant' ? 'border-blue-900 bg-blue-50 text-blue-900 scale-[1.05] shadow-xl shadow-blue-900/10' : 'border-slate-100 bg-slate-50/50 text-slate-400 hover:border-blue-200'}`}>
                    <span className="text-4xl group-hover:scale-110 transition-transform">👷</span>
                    <span className="text-[10px] uppercase tracking-widest">Job Seeker</span>
                </button>
                <button onClick={() => setRole("employer")} className={`group py-8 rounded-[2.5rem] border-2 transition-all duration-500 font-black flex flex-col items-center gap-3 ${role === 'employer' ? 'border-blue-900 bg-blue-50 text-blue-900 scale-[1.05] shadow-xl shadow-blue-900/10' : 'border-slate-100 bg-slate-50/50 text-slate-400 hover:border-blue-200'}`}>
                    <span className="text-4xl group-hover:scale-110 transition-transform">💼</span>
                    <span className="text-[10px] uppercase tracking-widest">Employer</span>
                </button>
              </div>
              {role && (
                <div className="space-y-4 animate-in zoom-in-95 duration-500">
                  <button onClick={() => setStep(2)} className="w-full py-5 bg-blue-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/30 active:scale-95 transition-all">Continue</button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CREDENTIALS & OTP VERIFICATION */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                <div id="recaptcha-register"></div>
                
                {!showOtpInput ? (
                    <form onSubmit={handleStep2Next} className="space-y-4">
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">First Name *</label>
                          <input name="firstName" required placeholder="Juan" value={formData.firstName} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-900 transition-all font-medium" onChange={handleInputChange} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Last Name *</label>
                          <input name="lastName" required placeholder="Dela Cruz" value={formData.lastName} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-900 transition-all font-medium" onChange={handleInputChange} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Middle Name *</label>
                        <input name="middleName" required placeholder="Reyes" value={formData.middleName} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-900 transition-all font-medium" onChange={handleInputChange} />
                      </div>

                      <div className="space-y-1 mt-2">
                        <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Email Address *</label>
                        <input name="email" type="email" placeholder="name@example.com" value={formData.email} required className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-900 transition-all font-medium" onChange={handleInputChange} />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Password *</label>
                        <div className="relative">
                          <input name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.password} required className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-900 transition-all font-medium" onChange={handleInputChange} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-600 uppercase">{showPassword ? "Hide" : "Show"}</button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Phone Number (Optional)</label>
                        <div className="flex w-full bg-slate-50 border-2 border-slate-100 rounded-2xl focus-within:border-blue-900 transition-all overflow-hidden">
                          <div className="px-4 py-4 bg-slate-100 text-slate-500 font-black border-r-2 border-slate-100 flex items-center justify-center">
                            +63
                          </div>
                          <input 
                            name="phoneNumber" 
                            type="tel" 
                            maxLength="10"
                            placeholder="9123456789" 
                            value={formData.phoneNumber} 
                            className="w-full px-4 py-4 bg-transparent outline-none font-medium tracking-wider" 
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              setFormData({ ...formData, phoneNumber: val });
                            }} 
                          />
                        </div>
                      </div>

                      <button disabled={loading} type="submit" className="w-full py-5 bg-blue-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/30 active:scale-95 transition-all flex justify-center items-center mt-2">
                          {loading ? "Verifying..." : "Next Step"}
                      </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in fade-in zoom-in duration-300">
                        <div className="text-center">
                            <p className="text-xs font-bold text-slate-500 mb-2">Code sent to <span className="text-blue-900 font-black">+63 {formData.phoneNumber}</span></p>
                        </div>
                        <input 
                            type="text" 
                            placeholder="000000" 
                            maxLength="6" 
                            value={otp}
                            className="w-full px-5 py-5 border-2 border-blue-100 rounded-2xl text-center text-4xl font-black tracking-[0.5em] outline-none focus:border-blue-900 bg-blue-50/30 transition-all text-blue-900" 
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
                        />
                        <button disabled={loading || otp.length < 6} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-green-600/30 active:scale-95 transition-all hover:bg-green-700 flex justify-center items-center">
                            {loading ? "Verifying..." : "Verify & Proceed"}
                        </button>
                    </form>
                )}
            </div>
          )}

          {/* STEP 3: LOCATION, MULTI-PROOF & BUSINESS */}
          {step === 3 && (
            <form onSubmit={handleFinalSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest block mb-2">Select Purok *</label>
                <div className="grid grid-cols-2 gap-3">
                  {PUROK_LIST.map((sName) => (
                      <button type="button" key={sName} onClick={() => setFormData({ ...formData, sitio: sName })} className={`py-4 rounded-2xl border-2 font-black text-xs transition-all tracking-widest ${formData.sitio === sName ? 'border-blue-900 bg-blue-50 text-blue-900 shadow-md scale-105' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}>
                        {sName.toUpperCase()}
                      </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 mt-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest flex justify-between">
                    <span>Proof of Residency *</span>
                    <span className="text-blue-500">{proofFiles.length}/3 Files</span>
                </label>
                <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
                  Only residents of Brgy. Cawayan Bogtong are allowed. Please upload up to 3 files (e.g. <strong className="text-blue-900">Front ID, Back ID, Latest Billing</strong>).
                </p>
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-xs outline-none focus:border-blue-900 transition-all font-medium 
                  file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-blue-900 file:text-white hover:file:bg-blue-800" 
                />

                {/* Render Selected Files List */}
                {proofFiles.length > 0 && (
                  <div className="mt-3 space-y-2 animate-in fade-in duration-300">
                    {proofFiles.map((file, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-600 truncate pr-4">{file.name}</span>
                        <button 
                            type="button" 
                            onClick={() => removeFile(idx)} 
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors flex shrink-0"
                            title="Remove file"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {role === "employer" && (
                <div className="space-y-4 pt-2">
                    <div onClick={() => setHasBusiness(!hasBusiness)} className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${hasBusiness ? 'border-blue-900 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${hasBusiness ? 'bg-blue-900 border-blue-900' : 'border-slate-300'}`}>
                            {hasBusiness && <span className="text-white text-xs font-bold">✓</span>}
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-widest ${hasBusiness ? 'text-blue-900' : 'text-slate-400'}`}>I have a registered business</span>
                    </div>

                    {hasBusiness && (
                        <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                            <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Company Name *</label>
                            <input name="businessName" required placeholder="Bogtong Enterprises" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-900 transition-all font-medium" onChange={handleInputChange} />
                        </div>
                    )}
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-4 text-center">
                <p className="text-[9px] text-blue-800 font-black uppercase leading-relaxed tracking-wider">
                  Verification by the Admin takes <span className="text-blue-600">1 to 3 working days</span>. You will receive an email once approved.
                </p>
              </div>
              
              <button disabled={loading || !formData.sitio || proofFiles.length === 0} type="submit" className="w-full py-5 bg-blue-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/30 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-30">
                {loading ? (
                  <span className="flex items-center gap-2">
                     <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     Submitting...
                  </span>
                ) : "Complete Registration"}
              </button>
            </form>
          )}

          <div className="mt-10 text-center border-t border-slate-100 pt-8">
            <p className="text-xs font-bold text-slate-400">Already have an account? <span onClick={() => navigate("/login")} className="text-blue-600 ml-1 cursor-pointer font-black hover:underline">Sign In</span></p>
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
        .animation-delay-2000 { animation-delay: 2s; }
      `}} />
    </div>
  );
}