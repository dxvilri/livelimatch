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
import { collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { EnvelopeIcon, PhoneIcon, ArrowRightOnRectangleIcon, EyeIcon, EyeSlashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Toast from "../components/Toast"; 

export default function LandingPage() {
  const navigate = useNavigate();

  // --- 1. MOUNT / UNMOUNT CLEANUP ---
  useEffect(() => {
    // Force Light Mode
    document.documentElement.classList.remove('dark');
    localStorage.setItem("theme", "light");

    // DESTROY any lingering global recaptcha from other pages on load
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch(e){}
      window.recaptchaVerifier = null;
    }

    // DESTROY it when leaving the Landing Page
    return () => {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch(e){}
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const [toast, setToast] = useState({ show: false, message: "", type: "error" });
  const triggerToast = (message, type = "error") => setToast({ show: true, message, type });

  // --- LEGAL / INFO MODALS STATE ---
  const [activeModal, setActiveModal] = useState(null); // 'privacy', 'terms', 'help', or null

  // Prevent background scrolling when a legal modal is open
  useEffect(() => {
      if (activeModal) document.body.style.overflow = "hidden";
      else document.body.style.overflow = "";
      return () => { document.body.style.overflow = ""; };
  }, [activeModal]);

  // --- CONTACT ADMIN STATES ---
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const handleSendContactMessage = async (e) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      return triggerToast("Please fill out all fields.", "error");
    }
    
    setIsSendingMessage(true);
    try {
      // Save directly to the support_tickets collection so Admin sees it
      await addDoc(collection(db, "support_tickets"), {
        ticketId: Math.floor(1000 + Math.random() * 9000).toString(),
        user: `${contactName} (Guest)`,
        userId: "guest",
        guestEmail: contactEmail, // Save email so admin can reply
        type: "Guest Inquiry",
        status: "new",
        lastUpdated: serverTimestamp(),
        messages: [{
            sender: 'user',
            text: contactMessage,
            timestamp: new Date()
        }]
      });

      triggerToast("Message sent successfully! We will email you back shortly.", "info");
      setContactName("");
      setContactEmail("");
      setContactMessage("");
      setActiveModal(null); // Close the modal after sending
    } catch (err) {
      console.error(err);
      triggerToast("Failed to send message. Please try again.", "error");
    } finally {
      setIsSendingMessage(false);
    }
  };

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

  // --- CLEANUP STATES ON MODE SWITCH ---
  useEffect(() => {
    setLoginConfirmation(null);
    setRegisterConfirmation(null);
    setLoginOtp("");
    setRegisterOtp("");
  }, [authMode, loginMethod]);

  // --- 2. UNIQUE RECAPTCHA INITIALIZATION ---
  const initRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      const container = document.getElementById("recaptcha-landing-page");
      if (container) container.innerHTML = "";

      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-landing-page", { 
        size: "invisible",
        callback: () => console.log("Recaptcha verified"),
        "expired-callback": () => { triggerToast("Recaptcha expired. Please try again.", "error"); setLoading(false); }
      });
    }
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
    if (!value) return false;
    const qApp = query(collection(db, "applicants"), where(field, "==", value));
    const qEmp = query(collection(db, "employers"), where(field, "==", value));
    const qAdmin = query(collection(db, "admins"), where(field, "==", value));
    
    const [snapApp, snapEmp, snapAdmin] = await Promise.all([getDocs(qApp), getDocs(qEmp), getDocs(qAdmin)]);
    return !snapApp.empty || !snapEmp.empty || !snapAdmin.empty;
  };

  // --- RESEND OTP LOGIC ---
  const handleResendLoginOtp = async () => {
    setLoading(true);
    try {
      initRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, formatPhone(loginIdentifier), window.recaptchaVerifier);
      setLoginConfirmation(confirmation);
      triggerToast("OTP resent successfully!", "info");
    } catch (err) {
      console.error("Resend SMS Error:", err);
      triggerToast("Failed to resend SMS code.", "error");
      if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; }
    }
    setLoading(false);
  };

  const handleResendRegisterOtp = async () => {
    setLoading(true);
    try {
      initRecaptcha();
      const confirmation = await linkWithPhoneNumber(auth.currentUser, formatPhone(registerData.phoneNumber), window.recaptchaVerifier);
      setRegisterConfirmation(confirmation);
      triggerToast("OTP resent successfully!", "info");
    } catch (err) {
      console.error("Resend SMS Error:", err);
      triggerToast("Failed to resend SMS OTP.", "error");
      if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; }
    }
    setLoading(false);
  };

  // --- LOGIN LOGIC ---
  const routeUserToDashboard = async (user) => {
    const uid = user.uid;
    const email = user.email;

    try {
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
      if (!exists) { triggerToast("Account not existing. Please register first.", "error"); setLoading(false); return; }
      const userCredential = await signInWithEmailAndPassword(auth, loginIdentifier, loginPassword);
      await routeUserToDashboard(userCredential.user);
    } catch (err) { triggerToast("Invalid Email or Password.", "error"); }
    setLoading(false);
  };

  const handlePhoneLogin = async (e) => {
    e.preventDefault();
    if (loginIdentifier.length !== 10) return triggerToast("Please enter exactly 10 digits.", "error");
    const finalPhone = formatPhone(loginIdentifier);
    setLoading(true);
    try {
      const exists = await checkDuplicate("contact", finalPhone);
      if (!exists) { triggerToast("Account not existing. Please register first.", "error"); setLoading(false); return; }
      
      initRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, finalPhone, window.recaptchaVerifier);
      setLoginConfirmation(confirmation);
    } catch (err) { 
      console.error("Firebase SMS Error:", err);
      triggerToast(err.message || "Failed to send SMS code.", "error"); 
      if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; }
    }
    setLoading(false);
  };

  const handleVerifyLoginOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await loginConfirmation.confirm(loginOtp);
      await routeUserToDashboard(result.user);
    } catch (err) { triggerToast("Invalid OTP code.", "error"); }
    setLoading(false);
  };

  // --- REGISTER LOGIC ---
  const handleRegisterInputChange = (e) => setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (proofFiles.length + selected.length > 3) return triggerToast("Maximum of 3 files allowed.", "error");
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

      if (duplicateFound) { triggerToast("An account with this exact Name already exists.", "error"); setLoading(false); return; }
      if (await checkDuplicate("email", registerData.email)) { triggerToast("Email is already in use.", "error"); setLoading(false); return; }

      const finalPhone = registerData.phoneNumber ? formatPhone(registerData.phoneNumber) : "";
      if (finalPhone && await checkDuplicate("contact", finalPhone)) { triggerToast("Phone number is already registered.", "error"); setLoading(false); return; }

      let userObj = auth.currentUser;
      let isNewAccount = false;

      if (!userObj || userObj.email !== registerData.email) {
          try {
              const res = await createUserWithEmailAndPassword(auth, registerData.email, registerData.password);
              userObj = res.user;
              isNewAccount = true;
          } catch (err) {
              if (err.code === "auth/email-already-in-use") {
                  try {
                      const res = await signInWithEmailAndPassword(auth, registerData.email, registerData.password);
                      userObj = res.user;
                  } catch (signInErr) { triggerToast("This email is taken or password incorrect.", "error"); setLoading(false); return; }
              } else { triggerToast(err.message, "error"); setLoading(false); return; }
          }
      }

      if (finalPhone) {
          if (userObj.phoneNumber === finalPhone) { setRegisterStep(5); setLoading(false); return; }
          
          try {
              initRecaptcha();
              const confirmation = await linkWithPhoneNumber(userObj, finalPhone, window.recaptchaVerifier);
              setRegisterConfirmation(confirmation);
              setRegisterStep(4);
          } catch (smsErr) { 
              console.error("Firebase SMS Error:", smsErr);
              if (isNewAccount && userObj) {
                  await userObj.delete().catch(()=>console.log("Cleanup failed"));
                  await signOut(auth);
              }
              if (smsErr.code === 'auth/credential-already-in-use') {
                  triggerToast("This phone number is already used by another account.", "error");
              } else {
                  triggerToast(smsErr.message || "Failed to send SMS OTP.", "error"); 
              }
              if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; }
          }
      } else { setRegisterStep(5); }
    } catch (err) { triggerToast("An unexpected error occurred.", "error"); }
    setLoading(false);
  };

  const handleVerifyRegisterOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await registerConfirmation.confirm(registerOtp); setRegisterStep(5); } 
    catch (err) { triggerToast("Invalid OTP code.", "error"); }
    setLoading(false);
  };

  const handleFinalRegisterSubmit = async (e) => {
    e.preventDefault();
    if (proofFiles.length === 0) return triggerToast("Please upload at least 1 proof of residency.", "error");
    setLoading(true);
    
    const userUid = auth.currentUser.uid;
    const finalPhone = registerData.phoneNumber ? formatPhone(registerData.phoneNumber) : "";
    const formattedFirstName = capitalizeName(registerData.firstName.trim());

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
            firstName: formattedFirstName,
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
                subject: "Registration Received - Livelimatch Verification Pending",
                html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <div style="background-color: #2563eb; padding: 24px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px;">LIVELI<span style="color: #93c5fd;">MATCH</span></h1>
                    </div>
                    <div style="padding: 32px; background-color: #ffffff; color: #334155; line-height: 1.6;">
                        <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Hello ${formattedFirstName},</h2>
                        <p>Thank you for registering with <strong>Livelimatch</strong>, the official job-matching portal for Barangay Cawayan Bogtong.</p>
                        <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                            <p style="margin: 0; color: #9a3412;"><strong>Account Status: <span style="color: #ea580c;">PENDING VERIFICATION</span></strong></p>
                            <p style="margin: 8px 0 0 0; font-size: 14px; color: #c2410c;">Our admin team is currently reviewing your proof of residency. This ensures a secure community for everyone.</p>
                        </div>
                        <p><strong>What happens next?</strong></p>
                        <ul style="padding-left: 20px; color: #475569;">
                            <li style="margin-bottom: 8px;">The review process typically takes 1 to 3 working days.</li>
                            <li style="margin-bottom: 8px;">We will send you another email the moment your account is approved.</li>
                            <li>Once approved, you will have full access to view and apply for local opportunities.</li>
                        </ul>
                        <p style="margin-top: 24px;">If you have any questions, simply reply to this email.</p>
                        <p style="margin-bottom: 0;">Warm regards,<br><strong style="color: #2563eb;">The Livelimatch Admin Team</strong></p>
                    </div>
                    <div style="background-color: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 12px;">
                        <p style="margin: 0;">© ${new Date().getFullYear()} Barangay Cawayan Bogtong Livelihood Portal. All rights reserved.</p>
                    </div>
                </div>
                `
            }
        });

        await signOut(auth);
        if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; }
        triggerToast("Registration successful! Pending admin verification.", "info");
        setTimeout(() => { setAuthMode('login'); setRegisterStep(1); }, 3000); 
    } catch (err) { triggerToast(err.message, "error"); }
    setLoading(false);
  };

  const handleRegisterBack = () => {
    if (registerStep === 5 && !registerData.phoneNumber) setRegisterStep(3);
    else setRegisterStep(registerStep - 1);
  };

  // Reusable Styles
  const inputStyle = `w-full p-3.5 rounded-2xl outline-none border transition-all font-bold text-sm shadow-inner backdrop-blur-md select-text cursor-text bg-white/60 border-white/60 focus:bg-white/90 focus:border-blue-400 text-blue-900 placeholder-blue-400/60`;
  const labelStyle = `block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 text-blue-800`;

  return (
    <div className="flex flex-col min-h-screen font-sans selection:bg-blue-500/30 selection:text-blue-200 overflow-x-hidden transition-colors duration-500 bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 text-blue-900">
      
      {/* 🟢 UNIQUE ID GUARANTEES NO CONFLICTS 🟢 */}
      <div id="recaptcha-landing-page"></div>

      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ show: false, message: "", type: "error" })} />}

      {/* HEADER */}
      <header className="w-full h-20 fixed top-0 left-0 z-40 flex items-center transition-all duration-300 border-b backdrop-blur-md border-blue-200/50 bg-white/50">
        <div className="max-w-7xl mx-auto w-full px-6 flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-black tracking-tighter shrink-0 cursor-pointer" onClick={() => navigate("/")}>
            LIVELI<span className="text-blue-600">MATCH</span>
          </h1>
        </div>
      </header>

      <main className="grow">
        {/* HERO SECTION */}
        <section className="relative min-h-screen flex items-center pt-20 px-6">
          
          <div className="absolute top-20 -left-20 lg:w-125 lg:h-125 bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] animate-blob transition-opacity duration-500 opacity-10"></div>
          <div className="absolute top-40 -right-20 lg:w-125 lg:h-125 bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000 transition-opacity duration-500 opacity-10"></div>

          <div className="max-w-7xl mx-auto w-full relative z-10">
            <div className="grid lg:grid-cols-12 gap-16 items-center">
              
              {/* Left Side: Hero Text */}
              <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
                <h2 className="text-5xl md:text-6xl lg:text-8xl font-black leading-[1.05] tracking-tight text-blue-950">
                  Connecting <br className="hidden lg:block" />
                  <span className="text-blue-600 relative inline-block">
                    Talent
                    <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 338 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 9C118.5 -1.5 219.5 -1.5 335 9" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
                    </svg>
                  </span> to Opportunity.
                </h2>
                
                <p className="text-lg lg:text-xl font-medium max-w-xl leading-relaxed mx-auto lg:mx-0 text-blue-900/80">
                  The official job-matching portal for Barangay Cawayan Bogtong residents. 
                  Simple, secure, and built specifically for our community's livelihood.
                </p>

                {/* MOBILE ONLY BUTTONS (Navigates to dedicated pages) */}
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 justify-center lg:hidden">
                  <button onClick={() => navigate('/register')} className="w-full sm:w-auto px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:-translate-y-1 transition-all active:scale-95 bg-blue-600 text-white shadow-xl shadow-blue-600/30 hover:bg-blue-700">
                    Get Started!
                  </button>
                  <button onClick={() => navigate('/login')} className="w-full sm:w-auto px-10 py-5 border rounded-2xl font-black text-sm uppercase tracking-widest hover:-translate-y-1 transition-all bg-white/60 text-blue-900 border-white/60 hover:border-blue-400 hover:bg-white/90 shadow-sm">
                    Resume Session
                  </button>
                </div>
              </div>

              {/* Right Side: DESKTOP AUTH MODAL (HIDDEN ON MOBILE) */}
              <div className="lg:col-span-5 relative hidden lg:flex justify-center items-center pb-24 lg:pb-0">
                 <div className="hidden lg:block absolute inset-0 rounded-[4rem] blur-2xl -rotate-6 transition-opacity duration-500 bg-gradient-to-tr from-blue-200/50 to-purple-200/50"></div>
                 
                 <div className="relative w-full max-w-sm flex flex-col p-6 md:p-8 rounded-[2rem] shadow-2xl border backdrop-blur-xl transition-all duration-300 lg:h-[480px] overflow-hidden bg-white/60 border-white/60 shadow-[0_20px_50px_-10px_rgba(37,99,235,0.15)]">
                    
                    {/* SCROLLABLE INNER CONTENT */}
                    <div className="h-full lg:overflow-y-auto overflow-x-hidden pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-blue-900/10">

                        {/* --- LOGIN MODE --- */}
                        {authMode === 'login' && (
                          <div className="flex-1 flex flex-col animate-in fade-in duration-500 min-h-full">
                            <div className="mb-6 text-center">
                                <h2 className="text-2xl font-black tracking-tight mb-1 text-blue-900">Secure Login</h2>
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 text-blue-700">Access your account</p>
                            </div>

                            <div className="flex p-1 rounded-xl mb-5 border bg-white/60 border-white/60 shadow-inner">
                              <button onClick={() => setLoginMethod("email")} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all flex justify-center items-center gap-2 ${loginMethod === 'email' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-blue-700 hover:bg-white/50'}`}><EnvelopeIcon className="w-4 h-4"/> EMAIL</button>
                              <button onClick={() => setLoginMethod("phone")} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all flex justify-center items-center gap-2 ${loginMethod === 'phone' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-blue-700 hover:bg-white/50'}`}><PhoneIcon className="w-4 h-4"/> PHONE</button>
                            </div>

                            {loginMethod === "email" ? (
                              <form onSubmit={handleEmailLogin} className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div><label className={labelStyle}>Email Address</label><input type="email" required placeholder="name@example.com" value={loginIdentifier} onChange={(e) => setLoginIdentifier(e.target.value)} className={inputStyle} /></div>
                                <div><label className={labelStyle}>Password</label><div className="relative"><input type={showPassword ? "text" : "password"} required placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className={inputStyle} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 hover:text-blue-600">{showPassword ? <EyeSlashIcon className="w-4 h-4"/> : <EyeIcon className="w-4 h-4"/>}</button></div></div>
                                <div className="pt-2"><button disabled={loading} className="w-full py-3.5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3 bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30">{loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><ArrowRightOnRectangleIcon className="w-5 h-5"/> Sign In</>}</button></div>
                              </form>
                            ) : (
                              <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-300">
                                {!loginConfirmation ? (
                                  <form onSubmit={handlePhoneLogin} className="space-y-3">
                                    <div><label className={labelStyle}>Phone Number</label><div className="flex w-full rounded-2xl border transition-all shadow-inner backdrop-blur-md overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50 bg-white/60 border-white/60 focus-within:bg-white/90 focus-within:border-blue-400 text-blue-900"><div className="px-4 py-3.5 font-black border-r flex items-center justify-center bg-white/50 border-white/60 text-blue-700">+63</div><input type="tel" required maxLength="10" placeholder="9123456789" value={loginIdentifier} onChange={(e) => setLoginIdentifier(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-3.5 bg-transparent outline-none font-bold text-sm tracking-widest select-text cursor-text placeholder-current/40" /></div></div>
                                    <div className="pt-2"><button disabled={loading || loginIdentifier.length !== 10} className="w-full py-3.5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3 bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30">{loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Send Login Code"}</button></div>
                                  </form>
                                ) : (
                                  <form onSubmit={handleVerifyLoginOtp} className="space-y-3 animate-in fade-in zoom-in duration-300">
                                      <p className="text-center text-[10px] font-black uppercase tracking-widest mb-3 text-blue-800">Code sent to <span className="text-blue-900">+63 {loginIdentifier}</span></p>
                                      <input type="text" placeholder="000000" maxLength="6" value={loginOtp} onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, ''))} className="w-full p-4 rounded-2xl text-center text-4xl font-black tracking-[0.5em] outline-none border transition-all shadow-inner backdrop-blur-md select-text cursor-text bg-white/40 border-white/60 focus:bg-white/90 focus:border-blue-400 text-blue-900" />
                                      <div className="pt-2">
                                          <button disabled={loading || loginOtp.length < 6} className="w-full py-3.5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3 bg-green-600 text-white hover:bg-green-700 shadow-green-600/30">{loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Verify & Login"}</button>
                                      </div>
                                      <div className="flex justify-between items-center mt-3 px-2">
                                          <button type="button" onClick={handleResendLoginOtp} disabled={loading} className="text-[10px] font-black uppercase tracking-widest transition-all text-blue-600 opacity-60 hover:opacity-100">Resend Code</button>
                                          <button type="button" onClick={() => { setLoginConfirmation(null); if(window.recaptchaVerifier){window.recaptchaVerifier.clear(); window.recaptchaVerifier=null;} setLoginOtp(""); }} className="text-[10px] font-black uppercase tracking-widest transition-all text-blue-600 opacity-60 hover:opacity-100">Change Number</button>
                                      </div>
                                  </form>
                                )}
                              </div>
                            )}

                            <div className="mt-auto text-center border-t pt-4 lg:pt-4 pt-8 border-white/50">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">New here? <span onClick={() => setAuthMode('register')} className="ml-2 cursor-pointer hover:underline text-blue-700">Create an account</span></p>
                            </div>
                          </div>
                        )}

                        {/* --- REGISTER MODE --- */}
                        {authMode === 'register' && (
                          <div className="flex-1 flex flex-col animate-in fade-in duration-500 min-h-full">
                            <div className="flex flex-col mb-6">
                                <div className="flex justify-between items-center mb-4">
                                    {registerStep > 1 ? (<button onClick={handleRegisterBack} className="text-[10px] font-black uppercase tracking-widest text-blue-600/60">← Back</button>) : <div></div>}
                                    <div className="flex space-x-1">{[1,2,3,4,5].map(s => <div key={s} className={`h-1 rounded-full transition-all duration-700 ${registerStep >= s ? 'w-3 bg-blue-600' : 'w-1 bg-white/50'}`}/>)}</div>
                                </div>
                                <h2 className="text-2xl font-black tracking-tight text-blue-900">{registerStep === 1 && "Start Your Journey"}{registerStep === 2 && "Personal Details"}{registerStep === 3 && "Account Security"}{registerStep === 4 && "Verify Phone"}{registerStep === 5 && "Final Step"}</h2>
                            </div>

                            {registerStep === 1 && (
                              <div className="space-y-4">
                                <button onClick={() => setRegisterRole("applicant")} className={`w-full group py-6 rounded-[2rem] border transition-all duration-300 flex flex-col items-center gap-2 ${registerRole === 'applicant' ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/20' : 'bg-white/60 border-white/60 text-blue-900'}`}><span className="text-3xl group-hover:scale-110 transition-transform">👷</span><span className="text-[10px] font-black uppercase tracking-widest">Job Seeker</span></button>
                                <button onClick={() => setRegisterRole("employer")} className={`w-full group py-6 rounded-[2rem] border transition-all duration-300 flex flex-col items-center gap-2 ${registerRole === 'employer' ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/20' : 'bg-white/60 border-white/60 text-blue-900'}`}><span className="text-3xl group-hover:scale-110 transition-transform">💼</span><span className="text-[10px] font-black uppercase tracking-widest">Employer</span></button>
                                <button disabled={!registerRole} onClick={() => setRegisterStep(2)} className="w-full py-4 mt-2 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 bg-blue-600 text-white">Continue</button>
                              </div>
                            )}

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
                                  <button type="submit" className="w-full py-4 mt-2 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 bg-blue-600 text-white">Next Step</button>
                              </form>
                            )}

                            {registerStep === 3 && (<form onSubmit={handleRegisterStep3Next} className="space-y-3"><div><label className={labelStyle}>Email *</label><input name="email" type="email" required placeholder="name@example.com" value={registerData.email} className={inputStyle} onChange={handleRegisterInputChange} /></div><div><label className={labelStyle}>Password *</label><div className="relative"><input name="password" type={showPassword ? "text" : "password"} required placeholder="••••••••" value={registerData.password} className={inputStyle} onChange={handleRegisterInputChange} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 hover:text-blue-600">{showPassword ? <EyeSlashIcon className="w-4 h-4"/> : <EyeIcon className="w-4 h-4"/>}</button></div></div><div><label className={labelStyle}>Phone (Optional)</label><div className="flex w-full rounded-2xl border transition-all shadow-inner backdrop-blur-md overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50 bg-white/60 border-white/60 focus-within:bg-white/90 focus-within:border-blue-400 text-blue-900"><div className="px-4 py-3.5 font-black border-r flex items-center justify-center bg-white/50 border-white/60 text-blue-700">+63</div><input name="phoneNumber" type="tel" maxLength="10" placeholder="9123456789" value={registerData.phoneNumber} className="w-full px-4 py-3.5 bg-transparent outline-none font-bold text-sm tracking-widest select-text cursor-text placeholder-current/40" onChange={(e) => setRegisterData({...registerData, phoneNumber: e.target.value.replace(/\D/g, '')})} /></div></div><button disabled={loading} type="submit" className="w-full py-4 mt-2 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3 bg-blue-600 text-white">{loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Create & Continue"}</button></form>)}
                            
                            {registerStep === 4 && (
                              <form onSubmit={handleVerifyRegisterOtp} className="space-y-4 pt-6">
                                  <p className="text-center text-[10px] font-black uppercase tracking-widest mb-3 text-blue-800">Code sent to <span className="text-blue-900">+63 {registerData.phoneNumber}</span></p>
                                  <input type="text" placeholder="000000" maxLength="6" value={registerOtp} onChange={(e) => setRegisterOtp(e.target.value.replace(/\D/g, ''))} className="w-full p-4 rounded-2xl text-center text-4xl font-black tracking-[0.5em] outline-none border transition-all shadow-inner backdrop-blur-md select-text cursor-text bg-white/40 border-white/60 focus:bg-white/90 focus:border-blue-400 text-blue-900" />
                                  <button disabled={loading || registerOtp.length < 6} className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3 bg-green-600 text-white">{loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Verify Phone"}</button>
                                  <div className="flex justify-center items-center mt-4">
                                      <button type="button" onClick={handleResendRegisterOtp} disabled={loading} className="text-[10px] font-black uppercase tracking-widest transition-all text-blue-600 opacity-60 hover:opacity-100">Resend Code</button>
                                  </div>
                              </form>
                            )}

                            {registerStep === 5 && (<form onSubmit={handleFinalRegisterSubmit} className="space-y-3"><div><label className={labelStyle}>Select Purok *</label><div className="flex flex-wrap gap-2">{PUROK_LIST.map((sName) => (<button type="button" key={sName} onClick={() => setRegisterData({ ...registerData, sitio: sName })} className={`px-3 py-2.5 rounded-xl border transition-all font-black text-[9px] uppercase tracking-widest flex-grow text-center ${registerData.sitio === sName ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white/60 border-white/60 text-blue-900 hover:bg-white/90'}`}>{sName}</button>))}</div></div><div className="p-3 rounded-2xl border transition-colors bg-white/60 border-white/60 shadow-inner"><label className="text-[10px] font-black uppercase tracking-widest flex justify-between mb-1 text-blue-800"><span>Proof of Residency *</span><span className="text-blue-600">{proofFiles.length}/3</span></label><input type="file" accept="image/*,application/pdf" multiple onChange={handleFileChange} className="w-full px-2 py-1.5 border rounded-xl text-xs outline-none transition-all font-medium bg-white/50 border-white/60 text-blue-900 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[9px] file:font-black file:uppercase file:tracking-widest file:transition-colors file:bg-blue-600 file:text-white hover:file:bg-blue-700" />{proofFiles.length > 0 && (<div className="mt-2 space-y-1.5">{proofFiles.map((file, idx) => (<div key={idx} className="flex justify-between items-center px-2.5 py-1.5 rounded-lg border bg-white border-slate-200 shadow-sm"><span className="text-[10px] font-bold truncate pr-4 text-slate-600">{file.name}</span><button type="button" onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-500"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></button></div>))}</div>)}</div>{registerRole === "employer" && (<div className="space-y-2 pt-1"><div onClick={() => setHasBusiness(!hasBusiness)} className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${hasBusiness ? 'border-blue-400 bg-blue-50' : 'border-white/60 bg-white/60'}`}><div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-colors ${hasBusiness ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>{hasBusiness && <span className="text-white text-[10px] font-bold">✓</span>}</div><span className={`text-[10px] font-black uppercase tracking-widest ${hasBusiness ? 'text-blue-800' : 'text-slate-500'}`}>I have a registered business</span></div>{hasBusiness && <input name="businessName" required placeholder="Company Name" className={`${inputStyle} py-3 text-xs`} onChange={handleRegisterInputChange} />}</div>)}<div className="pt-2"><button disabled={loading || !registerData.sitio || proofFiles.length === 0} type="submit" className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex justify-center items-center gap-3 bg-blue-600 text-white">{loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Complete"}</button></div></form>)}

                            <div className="mt-auto text-center border-t pt-4 lg:pt-4 pt-8 border-white/50">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Already have an account? <span onClick={() => setAuthMode('login')} className="ml-2 cursor-pointer hover:underline text-blue-700">Sign In</span></p>
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
            <h3 className="text-3xl font-black uppercase tracking-tight text-blue-950">Why Choose Livelimatch?</h3>
          </div>
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
              {[
                { title: "Localized Jobs", desc: "Find work opportunities directly inside Barangay Cawayan Bogtong and nearby areas.", icon: "📍" },
                { title: "User-Friendly", desc: "Clean and simple interface for residents who are not tech-savvy.", icon: "✨" },
                { title: "Secure Profile", desc: "Every account is verified by email or phone to ensure community safety.", icon: "🛡️" }
              ].map((feature, idx) => (
                <div key={idx} className="group p-10 rounded-[3rem] transition-all duration-500 border text-center lg:text-left backdrop-blur-sm bg-white/40 border-white/50 hover:border-white/80 hover:bg-white/70 shadow-xl shadow-blue-900/5">
                  
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform duration-500 mx-auto lg:mx-0 border shadow-inner bg-white/60 border-white/60">
                    {feature.icon}
                  </div>
                  
                  <h4 className="text-xl font-black mb-4 text-blue-950">{feature.title}</h4>
                  <p className="leading-relaxed font-medium text-blue-900/70">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="w-full py-12 border-t transition-colors duration-300 relative z-10 mt-auto border-blue-200/50 bg-white/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <p className="text-xl font-black tracking-tighter leading-none">LIVELI<span className="text-blue-600">MATCH</span></p>
            <p className="text-[8px] font-bold uppercase tracking-widest mt-2 opacity-60 text-blue-900">© {new Date().getFullYear()} Barangay Cawayan Bogtong Livelihood Portal</p>
          </div>
          <div className="flex gap-6 sm:gap-10">
            <button onClick={() => setActiveModal('privacy')} className="text-[10px] font-black uppercase tracking-widest transition-colors text-slate-500 hover:text-blue-900">Privacy Policy</button>
            <button onClick={() => setActiveModal('terms')} className="text-[10px] font-black uppercase tracking-widest transition-colors text-slate-500 hover:text-blue-900">Terms of Use</button>
            <button onClick={() => setActiveModal('help')} className="text-[10px] font-black uppercase tracking-widest transition-colors text-slate-500 hover:text-blue-900">Help Center</button>
          </div>
        </div>
      </footer>

      {/* --- LEGAL MODALS OVERLAYS --- */}
      {activeModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-blue-950/40 animate-in fade-in duration-300" onClick={() => setActiveModal(null)}>
          <div 
            className="relative w-full max-w-2xl bg-white/90 border border-white shadow-2xl rounded-[2.5rem] p-6 sm:p-10 max-h-[85vh] overflow-y-auto hide-scrollbar animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-800">
                <XMarkIcon className="w-6 h-6"/>
            </button>
            
            {activeModal === 'privacy' && (
              <div className="text-blue-950 space-y-5">
                <h2 className="text-3xl font-black tracking-tight mb-2">Privacy Policy</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 opacity-80">Last Updated: {new Date().getFullYear()}</p>
                <div className="space-y-4 text-sm font-medium leading-relaxed opacity-90 pb-4">
                  <p>Welcome to Livelimatch. We respect your privacy and are committed to protecting your personal data, especially as a resident of Barangay Cawayan Bogtong.</p>
                  <h3 className="text-lg font-black pt-2">1. Information We Collect</h3>
                  <p>When you register, we collect your full name, contact information (email/phone), your designated Purok within Barangay Cawayan Bogtong, and uploaded proof of residency (e.g., ID or Brgy Clearance).</p>
                  <h3 className="text-lg font-black pt-2">2. How We Use Your Data</h3>
                  <p>Your data is used strictly for:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Verifying that you are a legitimate resident of Barangay Cawayan Bogtong.</li>
                    <li>Connecting Job Seekers with local Employers.</li>
                    <li>Facilitating the LiveliMarket local marketplace.</li>
                  </ul>
                  <h3 className="text-lg font-black pt-2">3. Data Security</h3>
                  <p>Your proof of residency documents are securely stored in our encrypted database and are only accessible by authorized Barangay Administrators for verification purposes. They are never shared publicly.</p>
                  <h3 className="text-lg font-black pt-2">4. Your Rights</h3>
                  <p>You have the right to request the deletion of your account and personal data at any time by contacting our administrators or using the help center ticket system.</p>
                </div>
              </div>
            )}

            {activeModal === 'terms' && (
              <div className="text-blue-950 space-y-5">
                <h2 className="text-3xl font-black tracking-tight mb-2">Terms of Use</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 opacity-80">Effective Date: {new Date().getFullYear()}</p>
                <div className="space-y-4 text-sm font-medium leading-relaxed opacity-90 pb-4">
                  <p>By using Livelimatch, you agree to these terms designed to keep our local community safe.</p>
                  <h3 className="text-lg font-black pt-2">1. Eligibility</h3>
                  <p>This platform is strictly restricted to the residents of <strong>Barangay Cawayan Bogtong</strong>. Any attempt by non-residents to bypass verification will result in permanent suspension.</p>
                  <h3 className="text-lg font-black pt-2">2. User Conduct</h3>
                  <p>Users must maintain respectful and professional behavior when posting jobs, applying, or chatting. The LiveliMarket is for legitimate local livelihood products only. Posting illegal, harmful, or misleading content is strictly prohibited.</p>
                  <h3 className="text-lg font-black pt-2">3. Admin Rights</h3>
                  <p>The Barangay Administrators reserve the right to reject, suspend, or terminate any account that violates community guidelines, posts fraudulent job listings, or engages in inappropriate behavior in the chat.</p>
                  <h3 className="text-lg font-black pt-2">4. Liability</h3>
                  <p>Livelimatch serves as a bridge between individuals. The platform and its administrators are not legally responsible for employment disputes, unpaid wages, or transactions made in LiveliMarket. Users must practice standard caution.</p>
                </div>
              </div>
            )}

            {activeModal === 'help' && (
              <div className="text-blue-950 space-y-5 pb-4">
                <h2 className="text-3xl font-black tracking-tight mb-2">Help Center</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 opacity-80">Support & Guidance</p>
                
                <div className="space-y-6 text-sm font-medium leading-relaxed opacity-90 pt-2">
                  <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl">
                    <h3 className="text-lg font-black text-blue-900 mb-2">How to get Verified?</h3>
                    <ol className="list-decimal pl-4 space-y-2 text-blue-800">
                      <li>Create an account and fill out your personal information.</li>
                      <li>Upload a clear photo of your <strong>Barangay Clearance</strong>, valid ID with Cawayan Bogtong address, or Cedula.</li>
                      <li>Wait 1-3 business days for our Admin to review and approve your account.</li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-lg font-black pt-2">Forgot Password?</h3>
                    <p>If you signed up with an email, you can reset your password using the Firebase authentication prompt, or you can log in securely using your phone number via OTP (One-Time Password) without needing a password.</p>
                  </div>
                </div>

                {/* --- CONTACT ADMIN FORM --- */}
                <div className="bg-white/60 border border-white shadow-inner p-5 rounded-2xl mt-6">
                  <h3 className="text-lg font-black text-blue-900 mb-3 flex items-center gap-2">
                    <EnvelopeIcon className="w-5 h-5" /> Contact Admin
                  </h3>
                  <p className="text-xs text-blue-800/80 mb-4 font-medium">Use this form to report bugs, malicious users, or request assistance if you cannot log in.</p>
                  
                  <form onSubmit={handleSendContactMessage} className="space-y-3">
                    <input 
                      required 
                      placeholder="Your Name" 
                      value={contactName} 
                      onChange={e => setContactName(e.target.value)} 
                      className={inputStyle} 
                    />
                    <input 
                      type="email" 
                      required 
                      placeholder="Your Email" 
                      value={contactEmail} 
                      onChange={e => setContactEmail(e.target.value)} 
                      className={inputStyle} 
                    />
                    <textarea 
                      required 
                      rows="3" 
                      placeholder="Describe your issue, report, or concern..." 
                      value={contactMessage} 
                      onChange={e => setContactMessage(e.target.value)} 
                      className={`${inputStyle} resize-none`} 
                    />
                    <button 
                      disabled={isSendingMessage} 
                      type="submit" 
                      className="w-full py-3.5 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center"
                    >
                      {isSendingMessage ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        "Send Message"
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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