import { useState } from "react";
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  signOut 
} from "firebase/auth";
import { auth, db, storage } from "../firebase/config";
import { doc, setDoc, getDocs, collection, query, where, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  // --- UI & STEP CONTROL STATES ---
  const [role, setRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); 
  
  // States for business & file upload
  const [hasBusiness, setHasBusiness] = useState(false);
  const [proofFile, setProofFile] = useState(null);

  // --- DATA STATES ---
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    phoneNumber: "", 
    firstName: "",
    lastName: "",
    sitio: "", 
    businessName: "",
  });

  // --- STATIC DATA: BARANGAY CAWAYAN BOGTONG PUROKS ---
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

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!proofFile) {
      alert("Please upload a proof of residency to proceed.");
      return;
    }

    setLoading(true);
    try {
      // 1. Check if email already exists
      const exists = await checkDuplicate("email", formData.email);
      if (exists) {
        alert("Email already in use.");
        setLoading(false);
        return;
      }

      // 2. Create User Account
      const res = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const userUid = res.user.uid;

      // 3. Upload Proof of Residency to Firebase Storage
      const fileExtension = proofFile.name.split('.').pop();
      const proofRef = ref(storage, `proofOfResidency/${userUid}.${fileExtension}`);
      await uploadBytes(proofRef, proofFile);
      const proofUrl = await getDownloadURL(proofRef);

      // 5. Save to Firestore with 'pending' status
      const collectionName = role === "applicant" ? "applicants" : "employers";
      
      await setDoc(doc(db, collectionName, userUid), {
        uid: userUid,
        role: role,
        email: formData.email,
        contact: formData.phoneNumber || "",
        firstName: formData.firstName,
        lastName: formData.lastName,
        sitio: formData.sitio,
        proofOfResidencyUrl: proofUrl,
        status: "pending", // Requires Admin Approval
        createdAt: new Date().toISOString(),
        ...(role === "employer" && hasBusiness && { businessName: formData.businessName })
      });

      // 6. TRIGGER CUSTOM EMAIL VIA FIRESTORE 'MAIL' COLLECTION
      await addDoc(collection(db, "mail"), {
        to: formData.email,
        message: {
          subject: "Registration Received - Livelimatch Verification",
          html: `
            <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
              <h2 style="color: #1e3a8a;">Hello ${formData.firstName},</h2>
              <p>We received your registration for the Brgy. Cawayan Bogtong Livelimatch portal.</p>
              <p>Your account is currently <strong style="color: #ea580c;">PENDING</strong>. Our admin will verify your proof of residency within 1 to 3 working days.</p>
              <p>We will send you another email as soon as your account is approved.</p>
              <br>
              <p>Thank you,<br><strong>Livelimatch Admin Team</strong></p>
            </div>
          `
        }
      });

      // 7. Sign out the unverified user and show notice
      await signOut(auth);
      alert(
        "Registration submitted successfully!\n\n" +
        "We have sent you an email notice. Your account is currently PENDING. Admin verification will take 1 to 3 working days to confirm your residency in Brgy. Cawayan Bogtong.\n\n" +
        "You will receive an email confirmation once approved."
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
              {step === 2 && "Account Details"}
              {step === 3 && "Residency Check"}
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
                  <button onClick={() => setStep(2)} className="w-full py-5 bg-blue-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/30 active:scale-95 transition-all">Continue</button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CREDENTIALS */}
          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-1">
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
                <input name="phoneNumber" type="tel" placeholder="09123456789" value={formData.phoneNumber} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-900 transition-all font-medium" onChange={handleInputChange} />
              </div>

              <button type="submit" className="w-full py-5 bg-blue-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/30 active:scale-95 transition-all">Next Step</button>
            </form>
          )}

          {/* STEP 3: LOCATION & PROOF (BARANGAY CAWAYAN BOGTONG) */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest block mb-2">Select Purok *</label>
                <div className="grid grid-cols-2 gap-3">
                  {PUROK_LIST.map((sName) => {
                    return (
                      <button key={sName} onClick={() => setFormData({ ...formData, sitio: sName })} className={`py-4 rounded-2xl border-2 font-black text-xs transition-all tracking-widest ${formData.sitio === sName ? 'border-blue-900 bg-blue-50 text-blue-900 shadow-md scale-105' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}>
                        {sName.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 mt-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest block">Proof of Residency *</label>
                <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
                  Only residents of Brgy. Cawayan Bogtong are allowed. Please upload a <strong className="text-blue-900">Certificate of Residency, Latest Billing, or Valid Government ID</strong>.
                </p>
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={(e) => setProofFile(e.target.files[0])}
                  className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-xs outline-none focus:border-blue-900 transition-all font-medium 
                  file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-blue-900 file:text-white hover:file:bg-blue-800" 
                />
              </div>

              <button disabled={!formData.sitio || !proofFile} onClick={() => setStep(4)} className="w-full py-5 bg-blue-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/30 active:scale-95 transition-all disabled:opacity-30">Confirm Location & Proof</button>
            </div>
          )}

          {/* STEP 4: PROFILE */}
          {step === 4 && (
            <form onSubmit={handleFinalSubmit} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">First Name *</label>
                  <input name="firstName" required placeholder="John" value={formData.firstName} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-900 transition-all font-medium" onChange={handleInputChange} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Last Name *</label>
                  <input name="lastName" required placeholder="Doe" value={formData.lastName} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-900 transition-all font-medium" onChange={handleInputChange} />
                </div>
              </div>
              
              {role === "employer" && (
                <div className="space-y-4">
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
              
              <button disabled={loading} className="w-full py-5 bg-blue-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/30 active:scale-95 transition-all flex items-center justify-center gap-2">
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

      {/* MATCHED FOOTER */}
      <footer className="bg-slate-50 py-12 border-t border-slate-100 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <p className="text-xl font-black text-blue-900 tracking-tighter">LIVELI<span className="text-blue-500">MATCH</span></p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">© 2026 Barangay Cawayan Bogtong Livelihood Portal</p>
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