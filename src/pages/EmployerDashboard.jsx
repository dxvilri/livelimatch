import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config"; 
import { 
  collection, query, where, onSnapshot, 
  addDoc, serverTimestamp, setDoc, doc, updateDoc, deleteDoc, getDoc, getDocs, getCountFromServer 
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// --- HOOKS & COMPONENTS ---
import { useChat } from "../hooks/useChat"; 
import ChatSystem from "../components/ChatSystem"; 

import { 
  BriefcaseIcon, ArrowLeftOnRectangleIcon, XMarkIcon, 
  Bars3BottomRightIcon, MapPinIcon, SunIcon, MoonIcon, 
  ChevronRightIcon, ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon, TrashIcon, CheckCircleIcon, CameraIcon, PencilSquareIcon, 
  PlusIcon, UsersIcon, ClockIcon, UserIcon, AcademicCapIcon,
  CurrencyDollarIcon, CalendarDaysIcon, BoltIcon,
  UserCircleIcon, SparklesIcon, FunnelIcon,
  ChartBarIcon, UserPlusIcon, PresentationChartLineIcon,
  BuildingOfficeIcon, BellIcon, QuestionMarkCircleIcon, IdentificationIcon, EyeIcon,
  LockClosedIcon, ExclamationTriangleIcon 
} from "@heroicons/react/24/outline";

// --- STATIC DATA ---
const PUROK_LIST = [
  "Sagur", "Ampungan", "Centro 1", "Centro 2", "Centro 3", "Bypass Road", "Boundary"
];

const ADMIN_EMAIL = "admin@livelimatch.com";

const JOB_TYPES = [
  { id: "Full-time", icon: <BriefcaseIcon className="w-5 h-5"/>, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { id: "Part-time", icon: <ClockIcon className="w-5 h-5"/>, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { id: "Contract", icon: <CalendarDaysIcon className="w-5 h-5"/>, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { id: "One-time", icon: <BoltIcon className="w-5 h-5"/>, color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20" }
];

const getAvatarUrl = (user) => {
  if (!user) return null;
  return user.profilePic || user.photoURL || user.photoUrl || user.avatar || user.image || null;
};

export default function EmployerDashboard() {
  const { userData } = useAuth(); 
  const [activeTab, setActiveTab] = useState("Discover"); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [loading, setLoading] = useState(false); 
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // --- INITIALIZE CHAT SYSTEM ---
  const chat = useChat(auth.currentUser, isMobile);
  const { 
    conversations, activeChat, openChat, 
    setIsBubbleVisible 
  } = chat;

  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
        
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  // --- STYLES ---
  const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${darkMode 
    ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' 
    : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;
  
  const glassCard = `backdrop-blur-md border rounded-2xl transition-all duration-300 group hover:-translate-y-1 ${darkMode
    ? 'bg-slate-800/40 border-white/5 hover:bg-slate-800/60 hover:border-blue-500/30'
    : 'bg-white/40 border-white/60 hover:bg-white/70 hover:border-blue-300/50 hover:shadow-lg'}`;

  const glassInput = `w-full bg-transparent border-none outline-none text-sm font-bold placeholder-slate-400 ${darkMode ? 'text-white' : 'text-slate-800'}`;

  // --- NAVIGATION STYLES (ICON ONLY + GLOW + SHINE) ---
  const glassNavBtn = `relative p-3 rounded-xl transition-all duration-500 ease-out group hover:-translate-y-1 overflow-hidden ${
      darkMode 
      ? 'text-slate-400 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' 
      : 'text-slate-400 hover:text-blue-500 hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]'
  }`;
  
  const activeGlassNavBtn = `relative p-3 rounded-xl transition-all duration-500 ease-out scale-125 -translate-y-1 overflow-hidden ${
      darkMode
      ? 'text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.8)]'
      : 'text-blue-600 drop-shadow-[0_0_15px_rgba(37,99,235,0.6)]'
  }`;

  const [myPostedJobs, setMyPostedJobs] = useState([]); 
  const [receivedApplications, setReceivedApplications] = useState([]); 
  const [searchTerm, setSearchTerm] = useState("");
    
  // -- DISCOVER TALENT STATES --
  const [discoverTalents, setDiscoverTalents] = useState([]);
  const [talentSearch, setTalentSearch] = useState("");
  const [talentSitioFilter, setTalentSitioFilter] = useState(""); 
  const [selectedTalent, setSelectedTalent] = useState(null); 
  const [hoveredTalent, setHoveredTalent] = useState(null); 
  const hoverTimerRef = useRef(null); 

  const [applicantSearch, setApplicantSearch] = useState("");
  const [selectedApplication, setSelectedApplication] = useState(null); 
  const [modalApplicant, setModalApplicant] = useState(null); 
  const [modalJob, setModalJob] = useState(null); 
  const [modalLoading, setModalLoading] = useState(false);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);
  const [isPurokPopupOpen, setIsPurokPopupOpen] = useState(false);
  const [jobForm, setJobForm] = useState({ title: "", sitio: "", salary: "", type: "Full-time", description: "" });
  const [profileImage, setProfileImage] = useState(null);
  const [imgScale, setImgScale] = useState(1);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // --- UPDATED EMPLOYER DATA STATE ---
  const [employerData, setEmployerData] = useState({ 
      firstName: "", lastName: "", sitio: "", title: "Employer", 
      aboutMe: "", workExperience: "", education: "", 
      verificationStatus: "pending" 
  });
  
  const [chatSearch, setChatSearch] = useState(""); 
  const [adminUser, setAdminUser] = useState(null);
  const [analyticsData, setAnalyticsData] = useState({ totalEmployers: 0, sitioStats: [] });

  // --- ACCESS CONTROL CHECK ---
  const isVerified = employerData.verificationStatus === 'verified';

  // --- SCROLL LOCK EFFECT ---
  useEffect(() => {
    if (isJobModalOpen || selectedApplication || selectedTalent || isEditingImage) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isJobModalOpen, selectedApplication, selectedTalent, isEditingImage]);

  // --- DATA FETCHING ---
  useEffect(() => {
      const fetchAdmin = async () => {
          let q = query(collection(db, "employers"), where("email", "==", ADMIN_EMAIL));
          let snap = await getDocs(q);
          if (snap.empty) { q = query(collection(db, "applicants"), where("email", "==", ADMIN_EMAIL)); snap = await getDocs(q); }
          if (!snap.empty) { const docData = snap.docs[0].data(); setAdminUser({ id: snap.docs[0].id, ...docData }); }
      };
      fetchAdmin();
  }, []);

  useEffect(() => {
      if (activeTab === "Support" && adminUser) {
          openChat({
              id: adminUser.id,
              name: `${adminUser.firstName || 'Admin'} ${adminUser.lastName || 'Support'}`,
              profilePic: getAvatarUrl(adminUser)
          });
      }
  }, [activeTab, adminUser]);

   useEffect(() => {
     if(activeTab === "Discover" || activeTab === "Analytics") {
        const fetchTalents = async () => {
            try {
                const q = query(collection(db, "applicants"));
                const querySnapshot = await getDocs(q);
                const talents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const validTalents = talents.filter(t => t.firstName || t.lastName);
                setDiscoverTalents(validTalents);
                
                const empSnapshot = await getCountFromServer(collection(db, "employers"));
                setAnalyticsData(prev => ({...prev, totalEmployers: empSnapshot.data().count}));

                const jobsSnapshot = await getDocs(collection(db, "jobs"));
                const allJobs = jobsSnapshot.docs.map(d => d.data());
                
                const stats = {};
                allJobs.forEach(job => {
                    if(job.sitio) {
                        stats[job.sitio] = (stats[job.sitio] || 0) + 1;
                    }
                });
                const sortedStats = Object.entries(stats)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a,b) => b.count - a.count);
                
                setAnalyticsData(prev => ({...prev, sitioStats: sortedStats}));

            } catch (err) { console.error("Error fetching data", err); }
        };
        fetchTalents();
     }
   }, [activeTab]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const userRef = doc(db, "employers", auth.currentUser.uid);
    const setOnline = async () => { try { await setDoc(userRef, { isOnline: true }, { merge: true }); } catch(e) {} };
    setOnline();
    const unsubProfile = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.profilePic) setProfileImage(data.profilePic);
        if (data.imgScale) setImgScale(data.imgScale);
        setEmployerData(prev => ({
            ...prev,
            firstName: data.firstName || userData?.firstName || "",
            lastName: data.lastName || userData?.lastName || "",
            sitio: data.sitio || data.location || "", 
            title: data.title || "Employer", 
            aboutMe: data.aboutMe || "",
            workExperience: data.workExperience || "",
            education: data.education || "",
            verificationStatus: data.verificationStatus || "pending" 
        }));
      }
    });
    return () => { unsubProfile(); setDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true }).catch(console.error); };
  }, [auth.currentUser, userData]);

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const qJobs = query(collection(db, "jobs"), where("employerId", "==", auth.currentUser.uid));
    const unsubJobs = onSnapshot(qJobs, (snap) => {
      const jobsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      jobsData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setMyPostedJobs(jobsData);
    });
    const qApps = query(collection(db, "applications"), where("employerId", "==", auth.currentUser.uid));
    const unsubApps = onSnapshot(qApps, (snap) => {
      const appsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      appsData.sort((a, b) => (b.appliedAt?.seconds || 0) - (a.appliedAt?.seconds || 0));
      setReceivedApplications(appsData);
    });
    
    return () => { unsubJobs(); unsubApps(); };
  }, [auth.currentUser]);


  // --- HANDLERS ---
  const handleTalentMouseEnter = (user) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => { setHoveredTalent(user); }, 3000);
  };
  const handleTalentMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredTalent(null);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setProfileImage(reader.result); setIsEditingImage(true); };
      reader.readAsDataURL(file);
    }
  };
  const dataURLtoBlob = (dataurl) => {
    try {
      const arr = dataurl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while(n--) u8arr[n] = bstr.charCodeAt(n);
      return new Blob([u8arr], {type:mime});
    } catch (e) { return null; }
  };
  const saveProfileImage = async () => {
    if (!auth.currentUser || !profileImage) return;
    setLoading(true);
    try {
      const storage = getStorage(auth.app);
      const storageRef = ref(storage, `company_logos/${auth.currentUser.uid}`);
      const blob = dataURLtoBlob(profileImage);
      if (!blob) throw new Error("Failed to process image data.");
      const uploadTask = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(uploadTask.ref);
      await setDoc(doc(db, "employers", auth.currentUser.uid), {
        profilePic: downloadURL, imgScale: imgScale, uid: auth.currentUser.uid, updatedAt: serverTimestamp()
      }, { merge: true });
      setIsEditingImage(false);
      alert("Profile picture updated successfully!");
    } catch (err) { alert(`Error: ${err.message}`); } 
    finally { setLoading(false); }
  };
  const handleSaveProfile = async () => {
    setLoading(true);
    try {
        await setDoc(doc(db, "employers", auth.currentUser.uid), {
            title: employerData.title || "Employer", aboutMe: employerData.aboutMe,
            workExperience: employerData.workExperience, education: employerData.education, updatedAt: serverTimestamp()
        }, { merge: true });
        setIsEditingProfile(false);
    } catch (err) { alert("Error saving profile: " + err.message); } 
    finally { setLoading(false); }
  };
  
  // --- VERIFICATION CHECK ON OPENING JOB MODAL ---
  const handleOpenJobModal = (job = null) => {
    if (!isVerified) return alert("Your account is pending verification. You cannot post jobs yet.");
    
    if (job) {
      setEditingJobId(job.id);
      setJobForm({ title: job.title, sitio: job.sitio || "", salary: job.salary, type: job.type, description: job.description });
    } else {
      setEditingJobId(null);
      setJobForm({ title: "", sitio: "", salary: "", type: "Full-time", description: "" });
    }
    setIsJobModalOpen(true);
  };

  const handleSaveJob = async () => {
    if (!jobForm.title || !jobForm.salary) return alert("Title and Salary are required.");
    setLoading(true);
    try {
      const jobData = {
        ...jobForm, employerId: auth.currentUser.uid, employerName: `${employerData.firstName} ${employerData.lastName}`, 
        employerLogo: profileImage || "", updatedAt: serverTimestamp(), status: "active"
      };
      if (editingJobId) await updateDoc(doc(db, "jobs", editingJobId), jobData);
      else await addDoc(collection(db, "jobs"), { ...jobData, createdAt: serverTimestamp() });
      setIsJobModalOpen(false); setActiveTab("Listings");
    } catch (err) { alert("Error saving job: " + err.message); } 
    finally { setLoading(false); }
  };
  const handleDeleteJob = async (jobId) => {
    if (window.confirm("Are you sure? This will hide the job from applicants.")) {
      try { await deleteDoc(doc(db, "jobs", jobId)); } catch (err) { alert("Error deleting job: " + err.message); }
    }
  };
  const handleViewApplication = async (app) => {
    setModalLoading(true); setModalApplicant(null); setModalJob(null); setSelectedApplication(app);
    try {
        if (!app.isViewed) updateDoc(doc(db, "applications", app.id), { isViewed: true }).catch(err => console.error(err));
        
        if (app.applicantId) { 
            const userSnap = await getDoc(doc(db, "applicants", app.applicantId)); 
            if (userSnap.exists()) {
                const fetchedData = userSnap.data();
                setModalApplicant(fetchedData); 
            }
        }
        if (app.jobId) { const jobSnap = await getDoc(doc(db, "jobs", app.jobId)); if (jobSnap.exists()) setModalJob(jobSnap.data()); }
    } catch (err) { alert("Could not load details."); } finally { setModalLoading(false); }
  };
  const handleUpdateApplicationStatus = async (appId, newStatus) => {
    if (!window.confirm(`Mark this applicant as ${newStatus}?`)) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "applications", appId), { status: newStatus, isReadByApplicant: false });
      if (selectedApplication?.id === appId) setSelectedApplication(prev => ({ ...prev, status: newStatus }));
    } catch (err) { alert("Error updating status: " + err.message); } finally { setLoading(false); }
  };
  const handleDeleteApplication = async (appId) => {
    if (!window.confirm("Delete this application?")) return;
    setLoading(true);
    try { await deleteDoc(doc(db, "applications", appId)); if (selectedApplication?.id === appId) setSelectedApplication(null); } catch (err) { alert("Error deleting: " + err.message); } finally { setLoading(false); }
  };

  const handleStartChatFromExternal = (userObj) => {
    if (!isVerified) return alert("Your account must be verified to send messages.");
    openChat(userObj);
    setActiveTab("Messages");
    setIsBubbleVisible(false);
  };

  const displayName = `${employerData.firstName} ${employerData.lastName}`.trim() || "Employer";

  const filteredJobs = myPostedJobs.filter(job => job.title.toLowerCase().includes(searchTerm.toLowerCase()) || (job.sitio && job.sitio.toLowerCase().includes(searchTerm.toLowerCase())));
  const filteredChats = conversations.filter(c => {
      const otherId = c.participants.find(p => p !== auth.currentUser.uid);
      const name = c.names[otherId] || "User";
      return name.toLowerCase().includes(chatSearch.toLowerCase());
  });

  const filteredApps = receivedApplications.filter(app => app.applicantName.toLowerCase().includes(applicantSearch.toLowerCase()) || app.jobTitle.toLowerCase().includes(applicantSearch.toLowerCase()));
  const filteredTalents = discoverTalents.filter(user => {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(talentSearch.toLowerCase()) || (user.skills && user.skills.toLowerCase().includes(talentSearch.toLowerCase()));
    const matchesSitio = talentSitioFilter ? (user.sitio === talentSitioFilter) : true;
    return matchesSearch && matchesSitio;
  });

  const pendingApplications = filteredApps.filter(app => app.status === 'pending');
  const acceptedApplications = filteredApps.filter(app => app.status === 'accepted');
  const hasNewApps = receivedApplications.some(app => app.status === 'pending' && !app.isViewed);
  const hasGlobalUnread = conversations.some(c => (c[`unread_${auth.currentUser?.uid}`] || 0) > 0);

  const unreadMsgCount = conversations.reduce((acc, curr) => acc + (curr[`unread_${auth.currentUser?.uid}`] || 0), 0);
  const newAppCount = receivedApplications.filter(a => a.status === 'pending' && !a.isViewed).length;
  const totalNotifications = unreadMsgCount + newAppCount;

  const ProfilePicComponent = ({ sizeClasses = "w-12 h-12", isCollapsed = false }) => (
    <div className={`relative group shrink-0 ${sizeClasses} rounded-2xl overflow-hidden shadow-lg border select-none ${darkMode ? 'border-white/10 bg-slate-800' : 'border-slate-200 bg-slate-100'}`}>
      {profileImage ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover transition-transform duration-300" style={{ transform: `scale(${imgScale})` }} /> : <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-black text-lg">{employerData.firstName ? employerData.firstName.charAt(0) : "E"}</div>}
      {!isCollapsed && <button onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"><CameraIcon className="w-5 h-5 text-white" /></button>}
    </div>
  );

  const getJobStyle = (type) => { const found = JOB_TYPES.find(j => j.id === type); if (found) return found; return { icon: <BoltIcon className="w-6 h-6"/>, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' }; };
  
  const formatTime = (ts) => { if (!ts) return "Just now"; const date = ts?.toDate ? ts.toDate() : new Date(); return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };

return (
    <div className={`relative min-h-screen transition-colors duration-500 font-sans pb-24 md:pb-0 select-none cursor-default overflow-x-hidden ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
      
      {/* --- ADDED SHINE ANIMATION STYLE --- */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; } 
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes glass-shine {
          0% { transform: translateX(-150%) skewX(-20deg); opacity: 0; }
          40% { opacity: 0.6; }
          100% { transform: translateX(250%) skewX(-20deg); opacity: 0; }
        }
        .shine-effect::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            to right, 
            transparent 0%, 
            rgba(255, 255, 255, 0.4) 50%, 
            transparent 100%
          );
          transform: translateX(-150%);
          animation: glass-shine 0.6s ease-out;
          pointer-events: none;
        }
        
        @keyframes content-wipe {
          0% { opacity: 0; transform: translateY(10px) scale(0.99); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-content {
          animation: content-wipe 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
      
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

      {/* --- BACKGROUND BLOBS --- */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-40 animate-pulse ${darkMode ? 'bg-blue-900' : 'bg-blue-300'}`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-40 animate-pulse delay-1000 ${darkMode ? 'bg-purple-900' : 'bg-purple-300'}`}></div>
      </div>

      {/* --- VERIFICATION WARNING BANNER --- */}
      {!isVerified && (
          <div className="fixed top-0 left-0 right-0 z-[110] bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-xl animate-in slide-in-from-top duration-500">
              <ExclamationTriangleIcon className="w-5 h-5 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-wide">
                  Account {employerData.verificationStatus}. Features limited until verification.
              </p>
          </div>
      )}

      {/* JOB MODAL (Glassmorphism) */}
      {isJobModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
            <div className={`max-w-3xl w-full p-5 sm:p-10 rounded-[3rem] border shadow-2xl overflow-y-auto max-h-[70vh] sm:max-h-[90vh] hide-scrollbar ${glassPanel}`}>
                <h3 className="text-2xl font-black mb-8 uppercase tracking-widest text-center">{editingJobId ? 'Edit Listing' : 'Create Job Listing'}</h3>
                {/* ... Job Form Inputs ... */}
                <div className="space-y-6">
                  <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-2">Select Job Type</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {JOB_TYPES.map((type) => (
                             <button key={type.id} onClick={() => setJobForm({...jobForm, type: type.id})} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${jobForm.type === type.id ? `bg-blue-600 border-blue-600 text-white shadow-lg scale-105` : `${darkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:border-slate-400 hover:bg-slate-100'}`}`}>
                                   <span className={jobForm.type === type.id ? 'text-white' : type.color}>{type.icon}</span>
                                   <span className="text-[10px] font-black uppercase tracking-widest">{type.id}</span>
                             </button>
                          ))}
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-2">Job Title</label><input type="text" placeholder="e.g. Sales Associate" value={jobForm.title} onChange={e => setJobForm({...jobForm, title: e.target.value})} className={`w-full p-4 rounded-2xl font-bold bg-transparent border-2 outline-none focus:border-blue-500 transition-colors select-text ${darkMode ? 'border-white/10' : 'border-slate-300'}`} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-2">Salary / Rate</label><div className="relative"><input type="text" placeholder="e.g. 500" value={jobForm.salary} onChange={e => setJobForm({...jobForm, salary: e.target.value})} className={`w-full p-4 pl-12 rounded-2xl font-bold bg-transparent border-2 outline-none focus:border-blue-500 transition-colors select-text ${darkMode ? 'border-white/10' : 'border-slate-300'}`} /><span className="absolute left-4 top-1/2 -translate-y-1/2 font-black opacity-30">PHP</span></div></div>
                  </div>
                  <div className="space-y-2 relative">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-2">Location (Sitio/Purok)</label>
                      <button onClick={() => setIsPurokPopupOpen(true)} className={`w-full p-4 rounded-2xl font-bold bg-transparent border-2 flex justify-between items-center outline-none focus:border-blue-500 transition-colors cursor-pointer text-left ${darkMode ? 'border-white/10 bg-slate-900' : 'border-slate-300 bg-white'}`}><span>{jobForm.sitio || "Select a location..."}</span><MapPinIcon className="w-5 h-5 text-blue-500 pointer-events-none" /></button>
                      {isPurokPopupOpen && (
                          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setIsPurokPopupOpen(false)}>
                             <div className={`w-full max-sm p-6 rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border border-white/10' : 'bg-white border border-slate-300'}`} onClick={e => e.stopPropagation()}>
                                  <h4 className="text-center font-black uppercase tracking-widest mb-6 opacity-60">Choose Location</h4>
                                  <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto hide-scrollbar">{PUROK_LIST.map(p => (<button key={p} onClick={() => { setJobForm({...jobForm, sitio: p}); setIsPurokPopupOpen(false); }} className={`p-4 rounded-xl font-bold transition-all ${jobForm.sitio === p ? 'bg-blue-600 text-white' : darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100'}`}>{p}</button>))}</div>
                                  <button onClick={() => setIsPurokPopupOpen(false)} className="mt-6 w-full py-3 rounded-xl font-black uppercase text-[10px] tracking-widest text-red-500 border border-red-500/20 hover:bg-red-500/10">Cancel</button>
                             </div>
                          </div>
                      )}
                  </div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-2">Description & Requirements</label><textarea placeholder="Describe the role..." value={jobForm.description} onChange={e => setJobForm({...jobForm, description: e.target.value})} className={`w-full h-40 p-4 rounded-2xl font-medium bg-transparent border-2 resize-none outline-none focus:border-blue-500 transition-colors select-text ${darkMode ? 'border-white/10' : 'border-slate-300'}`} /></div>
                </div>
                <div className="flex gap-4 mt-10 border-t pt-6 border-dashed border-slate-500/20"><button onClick={() => setIsJobModalOpen(false)} className="flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] border border-red-500/30 text-red-500 hover:bg-red-500/10 active:scale-95 transition-transform">Cancel</button><button onClick={handleSaveJob} className="flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">{loading ? 'Publishing...' : 'Publish Job Listing'}</button></div>
            </div>
        </div>
      )}

      {/* Editing Image Modal */}
      {isEditingImage && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className={`max-w-md w-full p-10 rounded-[3rem] border animate-in zoom-in duration-300 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-300'}`}>
            <h3 className="text-xl font-black mb-8 uppercase tracking-widest text-center cursor-default select-none">Set Profile Picture</h3>
            <div className="w-56 h-56 mx-auto rounded-full overflow-hidden border-4 border-blue-500 shadow-2xl relative mb-10 select-none"><img src={profileImage} className="w-full h-full object-cover" style={{ transform: `scale(${imgScale})` }} alt="Crop preview" /></div>
            <div className="space-y-8">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest cursor-default select-none"><span>Adjust Zoom</span><span className="text-blue-500">{Math.round(imgScale * 100)}%</span></div>
              <input type="range" min="1" max="4" step="0.01" value={imgScale} onChange={(e) => setImgScale(parseFloat(e.target.value))} className="w-full h-2 bg-blue-500/10 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              <div className="flex gap-4"><button onClick={() => { setIsEditingImage(false); }} className="flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-red-500/20 text-red-500 hover:bg-red-500/5 transition-all active:scale-95">Cancel</button><button onClick={saveProfileImage} className="flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all active:scale-95">{loading ? 'Saving...' : 'Set Picture'}</button></div>
            </div>
          </div>
        </div>
      )}
      
      {/* HEADER */}
      <header className={`fixed top-0 left-0 right-0 z-40 h-20 px-6 flex items-center justify-between transition-all duration-300 backdrop-blur-xl border-b ${darkMode ? 'bg-slate-900/80 border-white/5' : 'bg-white/80 border-slate-200'} ${(isMobile && activeTab === "Messages" && activeChat) ? '-translate-y-full' : 'translate-y-0'} ${!isVerified ? 'top-10' : 'top-0'}`}>
            <div className="flex items-center gap-3">
                 <h1 className={`font-black text-lg tracking-tight leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>LIVELI<span className="text-blue-500">MATCH</span></h1>
            </div>

            <div className="hidden lg:flex items-center gap-24">
                <button onClick={() => setActiveTab("Discover")} className={activeTab === "Discover" ? activeGlassNavBtn + " shine-effect" : glassNavBtn}>
                    <SparklesIcon className="w-7 h-7 relative z-10" />
                </button>
                <button onClick={() => setActiveTab("Listings")} className={activeTab === "Listings" ? activeGlassNavBtn + " shine-effect" : glassNavBtn}>
                    <BriefcaseIcon className="w-7 h-7 relative z-10" />
                </button>
                <button onClick={() => setActiveTab("Applicants")} className={`relative ${activeTab === "Applicants" ? activeGlassNavBtn + " shine-effect" : glassNavBtn}`}>
                    <UsersIcon className="w-7 h-7 relative z-10" />
                    {hasNewApps && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 border-2 border-white rounded-full animate-pulse z-20"></span>}
                </button>
                <button onClick={() => setActiveTab("Messages")} className={`relative ${activeTab === "Messages" ? activeGlassNavBtn + " shine-effect" : glassNavBtn}`}>
                    <ChatBubbleLeftRightIcon className="w-7 h-7 relative z-10" />
                    {hasGlobalUnread && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse z-20"></span>}
                </button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative">
                    <button onClick={() => setIsNotifOpen(!isNotifOpen)} className={`relative p-2 rounded-full transition-all active:scale-95 ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
                        <BellIcon className="w-6 h-6" />
                        {totalNotifications > 0 && (
                            <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-slate-900 rounded-full animate-pulse"></span>
                        )}
                    </button>
                    {isNotifOpen && (
                        <div className={`absolute right-0 top-12 w-64 rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200'}`}>
                             <div className="p-3 border-b border-white/5 font-black text-xs uppercase tracking-widest opacity-50">Notifications</div>
                             <div className="p-2 space-y-1">
                                 <button onClick={() => { setActiveTab("Messages"); setIsNotifOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm font-bold ${unreadMsgCount > 0 ? 'text-blue-500 bg-blue-500/10' : 'opacity-50'}`}>
                                             <span>Unread Messages</span>
                                             <span className="bg-blue-500 text-white text-[10px] px-1.5 rounded-full">{unreadMsgCount}</span>
                                 </button>
                                 <button onClick={() => { setActiveTab("Applicants"); setIsNotifOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm font-bold ${newAppCount > 0 ? 'text-amber-500 bg-amber-500/10' : 'opacity-50'}`}>
                                             <span>New Applicants</span>
                                             <span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full">{newAppCount}</span>
                                 </button>
                                 {totalNotifications === 0 && <div className="text-center py-4 opacity-30 text-xs font-bold uppercase">No new notifications</div>}
                             </div>
                        </div>
                    )}
                </div>

                <div onClick={() => setActiveTab("Profile")} className="cursor-pointer group">
                    <div className={`w-10 h-10 rounded-full overflow-hidden border-2 shadow-sm transition-transform active:scale-95 ${darkMode ? 'border-slate-600 group-hover:border-white' : 'border-white group-hover:border-blue-500'}`}>
                        {profileImage ? <img src={profileImage} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold">{employerData.firstName ? employerData.firstName.charAt(0) : "E"}</div>}
                    </div>
                </div>
                
                 <button onClick={() => setIsSidebarOpen(true)} className={`p-2 rounded-xl transition-colors ${darkMode ? 'text-white hover:bg-white/10' : 'text-slate-900 hover:bg-slate-100'}`}>
                    <Bars3BottomRightIcon className="w-7 h-7" />
                 </button>
            </div>
      </header>

      {/* RIGHT SIDEBAR */}
      <aside 
        className={`fixed top-0 right-0 h-full w-64 z-[100] rounded-l-3xl flex flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${glassPanel} 
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}`}
      >
        <div className="h-24 flex items-center justify-center relative mt-8 cursor-pointer" onClick={() => { setActiveTab("Profile"); setIsSidebarOpen(false); }}>
            <div className={`flex items-center gap-3 p-2 pr-4 rounded-2xl transition-all duration-300 hover:bg-white/10 group`}>
                <ProfilePicComponent sizeClasses="w-12 h-12" isCollapsed={true} />
                <div className="text-left overflow-hidden">
                    <h1 className="font-black text-sm tracking-tight leading-none truncate max-w-[120px]">{employerData.firstName || "User"} {employerData.lastName || ""}</h1>
                    <p className="text-[10px] opacity-60 font-bold uppercase tracking-wider group-hover:text-blue-500 transition-colors">View Profile</p>
                </div>
            </div>
             <button onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(false); }} className="absolute top-0 right-4 p-2 opacity-50 hover:opacity-100"><XMarkIcon className="w-6 h-6" /></button>
        </div>

        <nav className="flex-1 px-4 space-y-3 py-4 overflow-y-auto no-scrollbar">
            <NavBtn active={activeTab==="Analytics"} onClick={()=>{setActiveTab("Analytics"); setIsSidebarOpen(false)}} icon={<PresentationChartLineIcon className="w-6 h-6"/>} label="Analytics" open={true} dark={darkMode} />
            <div className={`h-px mx-4 my-2 ${darkMode ? 'bg-white/10' : 'bg-slate-900/10'}`}></div>
            <NavBtn active={activeTab==="Support"} onClick={()=>{setActiveTab("Support"); setIsSidebarOpen(false)}} icon={<QuestionMarkCircleIcon className="w-6 h-6"/>} label="Help & Support" open={true} dark={darkMode} />
            <div className={`h-px mx-4 my-2 ${darkMode ? 'bg-white/10' : 'bg-slate-900/10'}`}></div>
            <NavBtn active={activeTab==="Profile"} onClick={()=>{setActiveTab("Profile"); setIsSidebarOpen(false)}} icon={<UserCircleIcon className="w-6 h-6"/>} label="Profile" open={true} dark={darkMode} />
        </nav>

        <div className="p-4 space-y-3">
             <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all duration-300 ${darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}
            >
                {darkMode ? <SunIcon className="w-6 h-6 text-amber-400"/> : <MoonIcon className="w-6 h-6 text-slate-600"/>}
                <span className="text-xs font-bold whitespace-nowrap">Switch Theme</span>
             </button>

             <button 
                onClick={() => signOut(auth)}
                className={`w-full p-3 rounded-2xl flex items-center gap-3 text-red-500 transition-all duration-300 hover:bg-red-500/10`}
            >
                <ArrowLeftOnRectangleIcon className="w-6 h-6"/>
                <span className="text-xs font-bold whitespace-nowrap">Logout</span>
             </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className={`relative z-10 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] p-4 lg:p-8 ${(isMobile && activeTab === "Messages" && activeChat) ? 'pt-0' : 'pt-24 lg:pt-28'}`}>
        
        {!(isMobile && (activeTab === "Support" || activeChat)) && (
        <header className={`mb-6 lg:mb-8 flex items-center justify-between p-4 rounded-2xl ${glassPanel}`}>
            <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl hidden md:block ${darkMode ? 'bg-white/5' : 'bg-blue-50'}`}>
                    {activeTab === "Discover" && <SparklesIcon className="w-6 h-6 text-blue-500"/>}
                    {activeTab === "Listings" && <BriefcaseIcon className="w-6 h-6 text-blue-500"/>}
                    {activeTab === "Applicants" && <UsersIcon className="w-6 h-6 text-blue-500"/>}
                    {activeTab === "Messages" && <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-500"/>}
                    {activeTab === "Profile" && <UserCircleIcon className="w-6 h-6 text-blue-500"/>}
                    {activeTab === "Analytics" && <PresentationChartLineIcon className="w-6 h-6 text-blue-500"/>}
                    {activeTab === "Support" && <QuestionMarkCircleIcon className="w-6 h-6 text-blue-500"/>}
                </div>
                <div>
                    <h2 className={`text-xl lg:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>{activeTab === "Profile" ? "Profile" : activeTab === "Support" ? "Help & Support" : activeTab}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Employer Workspace</p>
                </div>
            </div>
        </header>
        )}

        {/* PROFILE TAB */}
        {activeTab === "Profile" && (
            <div key="Profile" className="animate-content space-y-6">
                <div className={`relative p-8 md:p-10 rounded-[2.5rem] border overflow-hidden ${glassPanel}`}>
                    <div className="absolute top-8 right-8 z-20">
                        <button onClick={(e) => { e.stopPropagation(); if(isEditingProfile) handleSaveProfile(); else setIsEditingProfile(true); }} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 ${isEditingProfile ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/20'}`}>{isEditingProfile ? <>{loading ? 'Saving...' : 'Save Changes'}</> : <><PencilSquareIcon className="w-4 h-4" /> Edit Profile</>}</button>
                    </div>
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="w-32 h-32 shrink-0 rounded-[2rem] border-2 border-dashed border-slate-500/20 p-2 select-none"><ProfilePicComponent sizeClasses="w-full h-full" isCollapsed={!isEditingProfile} /></div>
                        <div className="space-y-4 w-full pt-2">
                            <div>
                                <h2 className="text-3xl font-black tracking-tight cursor-default mb-2">{displayName}</h2>
                                {isEditingProfile ? <input type="text" value={employerData.title} onChange={(e) => setEmployerData({...employerData, title: e.target.value})} className={`bg-transparent border-b-2 outline-none font-bold text-sm uppercase tracking-wider w-full md:w-1/2 select-text ${darkMode ? 'border-white/20 text-blue-400' : 'border-slate-400 text-blue-600'}`} placeholder="Enter Title" /> : <p className="text-blue-500 font-bold text-sm uppercase tracking-wider cursor-default">{employerData.title || "Employer"}</p>}
                            </div>
                            <div className="flex flex-wrap gap-6 text-xs font-bold text-slate-500 cursor-default select-none mt-4">
                                <div className="flex items-center gap-2"><MapPinIcon className="w-4 h-4" /><span className={!employerData.sitio ? 'opacity-50 italic' : ''}>{employerData.sitio || "Sitio/Purok not set in registration"}</span></div>
                                <div className="flex items-center gap-2"><span className="text-slate-500">{userData?.contact}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className={`col-span-1 lg:col-span-2 p-8 rounded-[2.5rem] ${glassPanel}`}>
                        <div className="flex items-center gap-3 mb-4"><UserIcon className="w-5 h-5 text-blue-500" /><h3 className={`font-black uppercase tracking-widest text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>About Me</h3></div>
                        {isEditingProfile ? <textarea value={employerData.aboutMe} onChange={(e) => setEmployerData({...employerData, aboutMe: e.target.value})} placeholder="Tell candidates a bit about yourself..." className={`w-full h-32 p-4 rounded-xl text-sm bg-transparent border resize-none outline-none select-text ${darkMode ? 'border-white/20 text-slate-300' : 'border-slate-300 text-slate-600'}`} /> : <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{employerData.aboutMe || "No information added yet."}</p>}
                    </div>
                    <div className={`p-8 rounded-[2.5rem] ${glassPanel}`}>
                        <div className="flex items-center gap-3 mb-4"><BriefcaseIcon className="w-5 h-5 text-amber-500" /><h3 className={`font-black uppercase tracking-widest text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>Work Experience</h3></div>
                        {isEditingProfile ? <textarea value={employerData.workExperience} onChange={(e) => setEmployerData({...employerData, workExperience: e.target.value})} placeholder="List your relevant work experience..." className={`w-full h-32 p-4 rounded-xl text-sm bg-transparent border resize-none outline-none select-text ${darkMode ? 'border-white/20 text-slate-300' : 'border-slate-300 text-slate-600'}`} /> : <p className={`text-sm leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{employerData.workExperience || "No experience listed."}</p>}
                    </div>
                    <div className={`p-8 rounded-[2.5rem] ${glassPanel}`}>
                        <div className="flex items-center gap-3 mb-4"><AcademicCapIcon className="w-5 h-5 text-purple-500" /><h3 className={`font-black uppercase tracking-widest text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>Education</h3></div>
                        {isEditingProfile ? <textarea value={employerData.education} onChange={(e) => setEmployerData({...employerData, education: e.target.value})} placeholder="List your education background..." className={`w-full h-32 p-4 rounded-xl text-sm bg-transparent border resize-none outline-none select-text ${darkMode ? 'border-white/20 text-slate-300' : 'border-slate-300 text-slate-600'}`} /> : <p className={`text-sm leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{employerData.education || "No education listed."}</p>}
                    </div>
                </div>
            </div>
        )}

        {/* SUPPORT TAB - Simplified to just show message */}
        {activeTab === "Support" && (
            <div key="Support" className={`animate-content h-[calc(100vh-200px)] md:h-[calc(100vh-10rem)] flex flex-col items-center justify-center rounded-[2.5rem] overflow-hidden relative shadow-xl ${glassPanel}`}>
                <div className="text-center p-10">
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 mx-auto ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        <QuestionMarkCircleIcon className="w-16 h-16 opacity-50 text-blue-500"/>
                    </div>
                    <h3 className="text-2xl font-black mb-2">Support Chat Active</h3>
                    <p className="max-w-xs mx-auto text-xs font-bold uppercase tracking-wide opacity-60">Check the chat window in the bottom right corner to speak with an Admin.</p>
                </div>
            </div>
        )}
        
        {/* DISCOVER TALENT TAB */}
        {activeTab === "Discover" && (
            <div key="Discover" className="animate-content">
                <div className="space-y-6 mb-8">
                      {/* --- QUICK STATS (UPDATED: Uniform in Light Mode, Varied in Dark Mode) --- */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mt-4 md:mt-8">
                        
                        {/* 1. CANDIDATES */}
                        <div 
                            onClick={() => setActiveTab("Discover")} 
                            className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer 
                            ${darkMode 
                                ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/20 border backdrop-blur-xl' 
                                : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'
                            }`}
                        >
                            <div className="relative z-10">
                                <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{discoverTalents.length}</h3>
                                <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>Candidates</p>
                            </div>
                            <UsersIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-900'}`}/>
                        </div>

                        {/* 2. LISTINGS */}
                        <div 
                            onClick={() => setActiveTab("Listings")} 
                            className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer 
                            ${darkMode 
                                ? 'bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20 border backdrop-blur-xl' 
                                : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'
                            }`}
                        >
                            <div className="relative z-10">
                                <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{myPostedJobs.length}</h3>
                                <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-purple-200' : 'text-blue-800'}`}>Listings</p>
                            </div>
                            <BriefcaseIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-900'}`}/>
                        </div>

                        {/* 3. PENDING */}
                        <div 
                            onClick={() => setActiveTab("Applicants")} 
                            className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer 
                            ${darkMode 
                                ? 'bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/20 border backdrop-blur-xl' 
                                : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'
                            }`}
                        >
                            <div className="relative z-10">
                                <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{receivedApplications.filter(a => a.status === 'pending').length}</h3>
                                <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-amber-200' : 'text-blue-800'}`}>Pending</p>
                            </div>
                            <ClockIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-900'}`}/>
                        </div>

                        {/* 4. UNREAD MSGS */}
                        <div 
                            onClick={() => setActiveTab("Messages")} 
                            className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer 
                            ${darkMode 
                                ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 border-pink-500/20 border backdrop-blur-xl' 
                                : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'
                            }`}
                        >
                            <div className="relative z-10">
                                <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{unreadMsgCount}</h3>
                                <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-pink-200' : 'text-blue-800'}`}>Unread Msgs</p>
                            </div>
                            <ChatBubbleLeftRightIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-900'}`}/>
                        </div>
                      </div>

                    <div className={`flex items-center p-1.5 rounded-2xl border shadow-sm max-w-2xl ${glassPanel}`}>
                        <div className="relative flex-1 min-w-[150px]">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="Search name or skill..." value={talentSearch} onChange={(e) => setTalentSearch(e.target.value)} className={glassInput + " pl-9 pr-4 py-2.5"} />
                        </div>
                        <div className={`w-px h-6 mx-2 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                        <div className="relative min-w-[140px] md:min-w-[160px]">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10"><FunnelIcon className="w-4 h-4 text-blue-500" /></div>
                            <select value={talentSitioFilter} onChange={(e) => setTalentSitioFilter(e.target.value)} className={`w-full bg-transparent pl-9 pr-8 py-2.5 outline-none font-bold text-xs appearance-none cursor-pointer transition-colors relative z-0 ${darkMode ? 'text-white hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'} rounded-xl`}>
                                <option value="" className={darkMode ? 'bg-slate-900' : 'bg-white'}>All Locations</option>
                                {PUROK_LIST.map(p => <option key={p} value={p} className={darkMode ? 'bg-slate-900' : 'bg-white'}>{p}</option>)}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><div className={`w-5 h-5 rounded-md flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}><ChevronRightIcon className="w-3 h-3 rotate-90 opacity-70"/></div></div>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                    {filteredTalents.length > 0 ? filteredTalents.map(user => {
                        const pic = getAvatarUrl(user);
                        return (
                            <div key={user.id} onClick={() => setSelectedTalent(user)} onMouseEnter={() => handleTalentMouseEnter(user)} onMouseLeave={handleTalentMouseLeave} className={`group relative p-4 md:p-5 ${glassCard} flex flex-col items-center text-center cursor-pointer`}>
                                <div className="absolute top-3 right-3 md:top-4 md:right-4 z-10"><span className={`flex h-2.5 w-2.5 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'} shadow-sm`}></span></div>
                                <div className="w-14 h-14 md:w-16 md:h-16 mb-3 md:mb-4 rounded-[1rem] md:rounded-[1.5rem] overflow-hidden shadow-lg border-2 border-slate-100 dark:border-slate-800">
                                    {pic ? <img src={pic} alt={user.firstName} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-lg font-black">{user.firstName ? user.firstName.charAt(0) : "U"}</div>}
                                </div>
                                <h3 className={`text-xs md:text-sm font-black mb-0.5 truncate w-full ${darkMode ? 'text-white' : 'text-slate-900'}`}>{user.firstName} {user.lastName}</h3>
                                <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 truncate w-full">{user.title || "Applicant"}</p>
                                <p className={`text-[9px] line-clamp-2 mb-3 px-1 min-h-[2.5em] leading-tight ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{user.bio || user.aboutMe || "No bio available."}</p>
                                <div className={`mt-auto mb-3 md:mb-4 px-2 py-1 rounded-full text-[8px] md:text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 max-w-full ${darkMode ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-500'}`}><MapPinIcon className="w-3 h-3 shrink-0" /><span className="truncate">{user.sitio || user.location || "Remote"}</span></div>
                                <button onClick={(e) => { e.stopPropagation(); handleStartChatFromExternal({ id: user.id, name: `${user.firstName} ${user.lastName}`, profilePic: pic || null }); }} className="w-full py-2 rounded-xl font-black text-[9px] uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"><ChatBubbleLeftRightIcon className="w-3 h-3" /> <span className="hidden md:inline">Message</span><span className="md:hidden">Chat</span></button>
                            </div>
                        );
                    }) : (
                        <div className="col-span-full text-center py-20"><SparklesIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" /><p className="opacity-50 font-black uppercase text-xs tracking-[0.3em] select-none cursor-default">No talents found</p></div>
                    )}
                </div>
            </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "Analytics" && (
            <div key="Analytics" className="animate-content space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-8 rounded-[2.5rem] relative overflow-hidden ${glassPanel}`}>
                        <div className="absolute right-0 top-0 opacity-5 p-4 transform rotate-12"><UsersIcon className="w-32 h-32"/></div>
                        <div className="relative z-10">
                            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl inline-block mb-4"><UserPlusIcon className="w-8 h-8"/></div>
                            <h3 className="text-4xl font-black mb-1">{discoverTalents.length}</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Applicants Registered</p>
                        </div>
                    </div>
                      <div className={`p-8 rounded-[2.5rem] relative overflow-hidden ${glassPanel}`}>
                        <div className="absolute right-0 top-0 opacity-5 p-4 transform rotate-12"><BuildingOfficeIcon className="w-32 h-32"/></div>
                        <div className="relative z-10">
                            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl inline-block mb-4"><BriefcaseIcon className="w-8 h-8"/></div>
                            <h3 className="text-4xl font-black mb-1">{analyticsData.totalEmployers || "15+"}</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Employers Using Platform</p>
                        </div>
                    </div>
                </div>
                <div className={`p-8 rounded-[2.5rem] ${glassPanel}`}>
                    <div className="flex items-center gap-3 mb-8"><ChartBarIcon className="w-6 h-6 text-green-500" /><h3 className="font-black text-lg uppercase tracking-wider">Sitios with Highest Job Opportunities</h3></div>
                    <div className="space-y-4">
                        {analyticsData.sitioStats.length > 0 ? analyticsData.sitioStats.map((item, index) => (
                            <div key={item.name} className="relative">
                                <div className="flex justify-between items-end mb-1 text-xs font-bold opacity-80"><span>{item.name}</span><span>{item.count} Jobs</span></div>
                                <div className={`w-full h-4 rounded-full overflow-hidden ${darkMode ? 'bg-white/5' : 'bg-slate-100'}`}><div style={{ width: `${(item.count / analyticsData.sitioStats[0].count) * 100}%` }} className={`h-full rounded-full ${index === 0 ? 'bg-green-500' : index === 1 ? 'bg-blue-500' : 'bg-slate-400'}`}></div></div>
                            </div>
                        )) : (<div className="text-center py-10 opacity-50 font-black text-xs uppercase tracking-widest">No job data available yet</div>)}
                    </div>
                </div>
            </div>
        )}

        {/* MANAGE LISTINGS TAB - UPDATED WITH NEON GLOW STYLE */}
        {activeTab === "Listings" && (
          <div key="Listings" className="animate-content">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
                <div className={`relative group flex items-center p-3 rounded-2xl border transition-all duration-300 w-full md:max-w-md ${darkMode ? 'bg-slate-900/50 border-white/10 focus-within:border-blue-500/50 focus-within:shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-white/60 border-slate-200 focus-within:border-blue-400 focus-within:shadow-lg'}`}>
                    <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 ml-2 group-focus-within:text-blue-500 transition-colors" />
                    <input type="text" placeholder="Search your listings..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm font-bold ml-3 placeholder-slate-400" />
                </div>
                <button onClick={() => handleOpenJobModal()} className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] transition-all active:scale-95 w-full md:w-auto justify-center group transform hover:-translate-y-1">
                    <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" /> Post New Job
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.length > 0 ? filteredJobs.map(job => {
                const applicantCount = receivedApplications.filter(a => a.jobId === job.id).length;
                const style = getJobStyle(job.type);
                return (
                  <div key={job.id} className={`group relative p-6 rounded-[2rem] border overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl shine-effect ${darkMode ? 'bg-slate-800/40 border-white/5 hover:border-blue-500/30' : 'bg-white/60 border-white/60 hover:border-blue-300/50'}`}>
                      {/* Decorative Background Glow */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-[50px] rounded-full pointer-events-none -mr-10 -mt-10"></div>

                      <div className="relative z-10 flex flex-col h-full">
                          <div className="flex justify-between items-start mb-6">
                               <div className={`backdrop-blur-md px-3 py-1.5 rounded-xl border flex items-center gap-2 shadow-sm ${style.bg} ${style.border}`}>
                                   <span className={`${style.color} scale-90`}>{style.icon}</span>
                                   <span className={`text-[10px] font-black uppercase tracking-widest ${style.color}`}>{job.type}</span>
                               </div>
                               <div className="relative">
                                   <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></span>
                                   <span className="relative flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span>
                               </div>
                          </div>
                          
                          <div className="mb-6 space-y-2">
                              <h3 className={`text-xl font-black leading-tight line-clamp-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{job.title}</h3>
                              <div className="flex items-center gap-2 text-slate-400">
                                  <MapPinIcon className="w-4 h-4 text-blue-500" />
                                  <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">{job.sitio || "No Location"}</p>
                              </div>
                          </div>

                          <div className="mb-8">
                               <div className="flex flex-col">
                                   <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Salary / Rate</p>
                                   <p className={`text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r ${darkMode ? 'from-white to-slate-400' : 'from-slate-900 to-slate-600'}`}>₱ {job.salary}</p>
                               </div>
                          </div>

                          <div className="mt-auto pt-6 border-t border-dashed border-slate-500/20 flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                   <div className="flex -space-x-2">
                                      {[...Array(Math.min(3, applicantCount))].map((_, i) => (
                                          <div key={i} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shadow-lg ${darkMode ? 'bg-slate-800 border-slate-900 text-white' : 'bg-slate-100 border-white text-slate-600'}`}>?</div>
                                      ))}
                                      {applicantCount === 0 && <div className={`w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}><span className="text-[10px] opacity-50">0</span></div>}
                                   </div>
                                   {applicantCount > 0 && <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Applicants</span>}
                               </div>
                               
                               <div className="flex gap-2">
                                   <button onClick={() => handleOpenJobModal(job)} className={`p-3 rounded-full transition-all duration-300 group/btn hover:scale-110 ${darkMode ? 'bg-white/5 hover:bg-blue-500 hover:text-white text-slate-400' : 'bg-slate-100 hover:bg-blue-500 hover:text-white text-slate-500'}`}>
                                        <PencilSquareIcon className="w-4 h-4" />
                                   </button>
                                   <button onClick={() => handleDeleteJob(job.id)} className={`p-3 rounded-full transition-all duration-300 group/btn hover:scale-110 ${darkMode ? 'bg-white/5 hover:bg-red-500 hover:text-white text-slate-400' : 'bg-slate-100 hover:bg-red-500 hover:text-white text-slate-500'}`}>
                                        <TrashIcon className="w-4 h-4" />
                                   </button>
                               </div>
                          </div>
                      </div>
                  </div>
                );
              }) : (
                <div className="col-span-full flex flex-col items-center justify-center py-32 opacity-50">
                    <div className="w-24 h-24 rounded-full bg-slate-500/10 flex items-center justify-center mb-6 animate-pulse">
                        <BriefcaseIcon className="w-10 h-10 text-slate-400" />
                    </div>
                    <p className="font-black uppercase text-xs tracking-[0.3em] text-slate-500">No jobs posted yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* APPLICANTS TAB */}
        {activeTab === "Applicants" && (
          <div key="Applicants" className="animate-content space-y-10">
            <div className={`flex items-center p-1.5 rounded-2xl border shadow-sm w-full md:w-96 ${glassPanel}`}>
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Search applicant or job..." value={applicantSearch} onChange={(e) => setApplicantSearch(e.target.value)} className={glassInput + " pl-9 pr-4 py-2.5"} />
                </div>
            </div>
            <section className="space-y-6">
                <div className="flex items-center gap-3"><ClockIcon className="w-5 h-5 text-amber-500" /><h3 className="font-black text-sm uppercase tracking-[0.2em] text-amber-500 select-none cursor-default">Pending Review ({pendingApplications.length})</h3><div className="flex-1 h-px bg-amber-500/10"></div></div>
                <div className="space-y-4">{pendingApplications.length > 0 ? pendingApplications.map(app => (<ApplicantCard key={app.id} app={app} darkMode={darkMode} onAccept={() => handleUpdateApplicationStatus(app.id, 'accepted')} onReject={() => handleUpdateApplicationStatus(app.id, 'rejected')} onDelete={() => handleDeleteApplication(app.id)} onView={() => handleViewApplication(app)} />)) : (<div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 select-none cursor-default">No pending applications found</p></div>)}</div>
            </section>
            <section className="space-y-6">
                <div className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-blue-500" /><h3 className="font-black text-sm uppercase tracking-[0.2em] text-blue-500 select-none cursor-default">Accepted Candidates ({acceptedApplications.length})</h3><div className="flex-1 h-px bg-blue-500/10"></div></div>
                <div className="space-y-4">{acceptedApplications.length > 0 ? acceptedApplications.map(app => (<ApplicantCard key={app.id} app={app} darkMode={darkMode} isAccepted={true} onChat={() => handleStartChatFromExternal({ id: app.applicantId, name: app.applicantName, profilePic: app.applicantProfilePic || null })} onView={() => handleViewApplication(app)} onDelete={() => handleDeleteApplication(app.id)} unreadCount={conversations.find(c => c.chatId.includes(app.applicantId))?.[`unread_${auth.currentUser.uid}`] || 0} />)) : (<div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 select-none cursor-default">No accepted candidates found</p></div>)}</div>
            </section>
          </div>
        )}

        {/* MESSAGES TAB - NOW USES DATA FROM THE HOOK */}
        {activeTab === "Messages" && (
          <div key="Messages" className="animate-content h-[calc(100vh-100px)] md:h-[calc(100vh-2rem)] flex flex-col pb-2">
            <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0 relative">
                <div className={`w-full rounded-[2.5rem] border md:flex flex-col overflow-hidden shadow-xl ${glassPanel}`}>
                    <div className="p-5 pb-2 shrink-0">
                         {isMobile && <h2 className={`text-2xl font-black mb-4 px-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Chats</h2>}
                        <div className={`flex items-center p-1.5 rounded-2xl border ${darkMode ? 'bg-slate-800 border-transparent focus-within:border-blue-500/50' : 'bg-white border-slate-200 focus-within:border-blue-300'}`}>
                            <div className="relative flex-1">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input placeholder="Search chats..." value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} className="w-full bg-transparent pl-9 pr-4 py-1.5 outline-none font-bold text-xs" />
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1 hide-scrollbar">
                        {filteredChats.map(c => {
                            const otherId = c.participants.find(p => p !== auth.currentUser.uid);
                            const name = c.names?.[otherId] || "User";
                            const otherPic = c.profilePics?.[otherId];
                            const unread = c[`unread_${auth.currentUser.uid}`] || 0;
                            const isActive = activeChat?.id === otherId;
                            return (
                                <button key={c.chatId} onClick={() => openChat({ id: otherId, name, profilePic: otherPic })} className={`w-full p-4 rounded-[1.5rem] flex items-center gap-4 transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : darkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-200 text-slate-600'}`}>
                                    <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-lg font-black shrink-0 overflow-hidden ${!isActive ? (darkMode ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600') : 'bg-white/20 text-white'}`}>{otherPic ? <img src={otherPic} alt={name} className="w-full h-full object-cover" /> : name.charAt(0)}</div>
                                    <div className="flex-1 text-left overflow-hidden"><div className="flex justify-between items-center mb-1"><span className={`font-black text-sm truncate ${isActive ? 'text-white' : darkMode ? 'text-white' : 'text-slate-900'}`}>{name}</span>{unread > 0 && <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm border border-white/20"></span>}</div><div className="flex justify-between items-center"><span className={`text-xs truncate max-w-[85%] font-medium ${isActive ? 'text-blue-100' : 'opacity-60'}`}>{c.lastMessage}</span><span className={`text-[9px] font-bold ${isActive ? 'text-blue-100' : 'opacity-40'}`}>{formatTime(c.lastTimestamp)}</span></div></div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
          </div>
        )}
      </main>

      {/* APPLICANT/TALENT MODAL - UPDATED PADDING & HEIGHT FOR MOBILE FIT */}
      {selectedApplication && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedApplication(null)}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>
             
             <div 
                onClick={(e) => e.stopPropagation()}
                className={`relative w-full max-w-md p-5 sm:p-8 rounded-3xl shadow-2xl border animate-in zoom-in-95 duration-300 flex flex-col items-center overflow-y-auto max-h-[70vh] sm:max-h-[90vh] hide-scrollbar ${darkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-white/50 text-slate-900'}`}
             >
                <button onClick={() => setSelectedApplication(null)} className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                    <XMarkIcon className="w-5 h-5"/>
                </button>

                {modalLoading ? (
                   <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                       <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                       <p className="text-[10px] font-black uppercase tracking-widest">Loading Applicant...</p>
                   </div>
                ) : (
                  <>
                    {/* UPDATED: REMOVED FRAME */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-sm mb-4 shrink-0">
                        {(modalApplicant?.profilePic || selectedApplication.applicantProfilePic) 
                            ? <img src={modalApplicant?.profilePic || selectedApplication.applicantProfilePic} className="w-full h-full object-cover"/> 
                            : <div className="w-full h-full bg-slate-200 flex items-center justify-center text-4xl font-black opacity-20">?</div>}
                    </div>
                    
                    <h2 className="text-2xl font-black mb-1 text-center">{selectedApplication.applicantName}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-4">{modalApplicant?.title || "Applicant"}</p>

                    <div className="flex gap-2 mb-6 flex-wrap justify-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${darkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-slate-50'}`}>{modalApplicant?.sitio || "No Location"}</span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-500/10 text-blue-500`}>Applying for: {selectedApplication.jobTitle}</span>
                    </div>

                    <div className="w-full space-y-4 mb-8">
                        <div className={`p-4 rounded-xl flex items-center gap-4 ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                            <IdentificationIcon className="w-5 h-5 opacity-50"/>
                            <span className="text-sm font-bold opacity-80">{modalApplicant?.contact || "No contact info provided"}</span>
                        </div>
                        
                        <div className={`p-4 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                            <p className="text-xs font-bold uppercase opacity-40 mb-2 text-blue-500">About Applicant</p>
                            <p className="text-sm opacity-80 leading-relaxed whitespace-pre-wrap">{modalApplicant?.bio || modalApplicant?.aboutMe || "No bio information provided."}</p>
                        </div>
                        
                        {(modalApplicant?.workExperience || modalApplicant?.education) && (
                            <div className={`p-4 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                                {modalApplicant?.workExperience && (
                                    <div className="mb-4">
                                        <p className="text-xs font-bold uppercase opacity-40 mb-1 text-purple-500">Experience</p>
                                        <p className="text-sm opacity-80 leading-relaxed whitespace-pre-wrap">{modalApplicant.workExperience}</p>
                                    </div>
                                )}
                                {modalApplicant?.education && (
                                    <div>
                                        <p className="text-xs font-bold uppercase opacity-40 mb-1 text-amber-500">Education</p>
                                        <p className="text-sm opacity-80 leading-relaxed whitespace-pre-wrap">{modalApplicant.education}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="w-full flex gap-3">
                        {selectedApplication.status === 'pending' ? (
                            <>
                                <button onClick={() => handleUpdateApplicationStatus(selectedApplication.id, 'rejected')} className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest border border-red-500/30 text-red-500 hover:bg-red-500/10 active:scale-95 transition-transform">Reject</button>
                                <button onClick={() => handleUpdateApplicationStatus(selectedApplication.id, 'accepted')} className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">Accept</button>
                            </>
                        ) : (
                            <button onClick={() => { handleStartChatFromExternal({ id: selectedApplication.applicantId, name: selectedApplication.applicantName, profilePic: selectedApplication.applicantProfilePic || null }); setSelectedApplication(null); }} className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">Send Message</button>
                        )}
                    </div>
                  </>
                )}
             </div>
        </div>
      )}

      {selectedTalent && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedTalent(null)}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>
             
             <div 
                onClick={(e) => e.stopPropagation()}
                className={`relative w-full max-w-md p-5 sm:p-8 rounded-3xl shadow-2xl border animate-in zoom-in-95 duration-300 flex flex-col items-center overflow-y-auto max-h-[70vh] sm:max-h-[90vh] hide-scrollbar ${darkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-white/50 text-slate-900'}`}
             >
                <button onClick={() => setSelectedTalent(null)} className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                    <XMarkIcon className="w-5 h-5"/>
                </button>

                {/* UPDATED: REMOVED FRAME */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-sm mb-4 shrink-0">
                    {(getAvatarUrl(selectedTalent) || selectedTalent.profilePic) 
                        ? <img src={getAvatarUrl(selectedTalent) || selectedTalent.profilePic} className="w-full h-full object-cover"/> 
                        : <div className="w-full h-full bg-slate-200 flex items-center justify-center text-4xl font-black opacity-20">{selectedTalent.firstName?.charAt(0)}</div>}
                </div>
                
                <h2 className="text-2xl font-black mb-1 text-center">{selectedTalent.firstName} {selectedTalent.lastName}</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-4">{selectedTalent.title || "Applicant"}</p>

                <div className="flex gap-2 mb-6 flex-wrap justify-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${darkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-slate-50'}`}>{selectedTalent.sitio || "No Location"}</span>
                     <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${darkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-slate-50'}`}>{selectedTalent.isOnline ? "Online" : "Offline"}</span>
                </div>

                <div className="w-full space-y-4 mb-8">
                     <div className={`p-4 rounded-xl flex items-center gap-4 ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                        {selectedTalent.contact && selectedTalent.contact.startsWith('+63') ? <IdentificationIcon className="w-5 h-5 opacity-50"/> : <IdentificationIcon className="w-5 h-5 opacity-50"/>}
                        <span className="text-sm font-bold opacity-80 truncate">{selectedTalent.contact || "No contact info"}</span>
                    </div>
                    
                    <div className={`p-4 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                        <p className="text-xs font-bold uppercase opacity-40 mb-2 text-blue-500">About Candidate</p>
                        <p className="text-sm opacity-80 leading-relaxed whitespace-pre-wrap">{selectedTalent.bio || selectedTalent.aboutMe || "No bio provided."}</p>
                    </div>

                     <div className={`p-4 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                         <div className="mb-4">
                            <p className="text-xs font-bold uppercase opacity-40 mb-1 text-purple-500">Experience</p>
                            <p className="text-sm opacity-80 leading-relaxed whitespace-pre-wrap">{selectedTalent.workExperience || "No experience listed."}</p>
                         </div>
                         <div>
                            <p className="text-xs font-bold uppercase opacity-40 mb-1 text-amber-500">Education</p>
                            <p className="text-sm opacity-80 leading-relaxed whitespace-pre-wrap">{selectedTalent.education || "No education listed."}</p>
                         </div>
                    </div>
                </div>

                <button onClick={() => { handleStartChatFromExternal({ id: selectedTalent.id, name: `${selectedTalent.firstName} ${selectedTalent.lastName}`, profilePic: getAvatarUrl(selectedTalent) }); setSelectedTalent(null); }} className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2">
                    <ChatBubbleLeftRightIcon className="w-4 h-4"/> Start Conversation
                </button>
             </div>
        </div>
      )}

      {/* --- REPLACED ENTIRE CHAT BLOCK WITH THE NEW SYSTEM COMPONENT --- */}
      <ChatSystem 
          chat={chat} 
          currentUser={auth.currentUser} 
          darkMode={darkMode} 
      />
      
      {/* MOBILE BOTTOM NAV - UPDATED WITH GLOW & SHINE EFFECT */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t px-6 py-3 flex justify-around items-center z-[80] transition-transform duration-300 backdrop-blur-xl ${isMobile && activeTab === "Messages" && activeChat ? 'translate-y-full' : 'translate-y-0'} ${darkMode ? 'bg-slate-900/70 border-white/10' : 'bg-white/70 border-white/20'}`}>
        <MobileNavItem icon={<SparklesIcon className="w-6 h-6" />} active={activeTab === "Discover"} onClick={() => setActiveTab("Discover")} />
        <MobileNavItem icon={<BriefcaseIcon className="w-6 h-6" />} active={activeTab === "Listings"} onClick={() => setActiveTab("Listings")} />
        <MobileNavItem icon={<div className="relative"><UsersIcon className="w-6 h-6" />{hasNewApps && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white animate-pulse"></span>}</div>} active={activeTab === "Applicants"} onClick={() => setActiveTab("Applicants")} />
        <MobileNavItem icon={<div className="relative"><ChatBubbleLeftRightIcon className="w-6 h-6" />{hasGlobalUnread && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}</div>} active={activeTab === "Messages"} onClick={() => setActiveTab("Messages")} />
      </nav>
    </div>
  );
}

function ApplicantCard({ app, darkMode, onAccept, onReject, onView, onChat, onDelete, isAccepted, unreadCount }) {
  return (
    <div className={`p-4 md:p-8 rounded-[2.5rem] border-l-8 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 transition-all relative overflow-hidden group hover:shadow-xl backdrop-blur-md ${darkMode ? 'bg-slate-900/60 border-white/5' : 'bg-white/60 border-white/40 shadow-md'} ${isAccepted ? 'border-l-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'border-l-amber-500'}`}>
      <div className="flex items-start gap-4 md:gap-5">
        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-[1.2rem] flex items-center justify-center text-xl md:text-2xl shadow-inner select-none overflow-hidden shrink-0 ${isAccepted ? 'bg-blue-500/10' : 'bg-amber-500/10'}`}>{app.applicantProfilePic ? <img src={app.applicantProfilePic} alt={app.applicantName} className="w-full h-full object-cover"/> : <span>{isAccepted ? '🤝' : '📄'}</span>}</div>
        <div><div className="flex items-center gap-2"><h4 className={`font-black text-base md:text-lg leading-none select-none cursor-default ${darkMode ? 'text-white' : 'text-slate-900'}`}>{app.applicantName}</h4>{app.status === 'pending' && !app.isViewed && <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span></span>}</div><p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 md:mt-2 select-none cursor-default truncate max-w-[200px]">{app.jobTitle}</p></div>
      </div>
      <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
        <button onClick={onView} className={`flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-3 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${darkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><EyeIcon className="w-4 h-4" /> View</button>
        {!isAccepted ? (<><button title="Reject" onClick={onReject} className={`flex-1 md:flex-none justify-center flex p-3 rounded-2xl transition-all active:scale-95 ${darkMode ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}><XMarkIcon className="w-5 h-5" /></button><button title="Accept" onClick={onAccept} className={`flex-1 md:flex-none justify-center flex p-3 rounded-2xl transition-all active:scale-95 ${darkMode ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}><CheckCircleIcon className="w-5 h-5" /></button></>) : (<button onClick={onChat} className="flex-1 md:flex-none justify-center flex bg-blue-600 text-white p-3 rounded-2xl shadow-lg relative hover:bg-blue-500 transition-colors active:scale-95"><ChatBubbleLeftRightIcon className="w-5 h-5" />{unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[7px] font-bold">{unreadCount}</span>}</button>)}
        <div className={`w-px h-6 mx-1 ${darkMode ? 'bg-white/10' : 'bg-slate-300'}`}></div>
        <button title="Delete Application" onClick={(e) => { e.stopPropagation(); onDelete(); }} className={`flex-none p-3 rounded-2xl transition-all active:scale-95 group-hover:opacity-100 opacity-60 ${darkMode ? 'text-slate-500 hover:text-red-500 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}><TrashIcon className="w-5 h-5" /></button>
      </div>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick, darkMode, open, badge, badgeColor }) {
  // Use className instead of conditional rendering for shine effect
  // The 'shine-effect' class handles the pseudo-element animation
  return (
    <button onClick={onClick} title={!open ? label : ''} className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 group relative overflow-hidden ${active ? 'bg-transparent' : `${darkMode ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'}`} ${!open && 'lg:justify-center'}`}>
        <div className={`relative z-10 shrink-0 ${active ? 'text-blue-600 dark:text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]' : ''}`}>{icon}</div>
        <span className={`relative z-10 font-bold text-xs uppercase tracking-widest whitespace-nowrap overflow-hidden transition-all duration-300 ${!open ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'} ${active ? 'text-blue-600 dark:text-blue-400' : ''}`}>{label}</span>
        {(badge > 0 && open) && <span className={`absolute right-3 ${badgeColor || 'bg-red-500'} text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm z-10`}>{badge}</span>}
        {(badge > 0 && !open) && <span className={`hidden lg:block absolute top-2 right-2 w-2.5 h-2.5 ${badgeColor || 'bg-red-500'} rounded-full border-2 border-white dark:border-slate-900 animate-pulse z-10`}></span>}
        {(badge > 0 && !open) && <span className={`lg:hidden absolute right-3 ${badgeColor || 'bg-red-500'} text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm z-10`}>{badge}</span>}
    </button>
  );
}

// --- UPDATED MOBILE NAV ITEM TO MATCH GLOW & SHINE THEME ---
function MobileNavItem({ icon, active, onClick }) {
  return (
    <button onClick={onClick} className={`relative p-2 rounded-full transition-all duration-500 ease-out overflow-hidden ${active ? 'scale-125 text-blue-600 dark:text-blue-400 drop-shadow-[0_0_15px_rgba(37,99,235,0.6)] dark:drop-shadow-[0_0_15px_rgba(96,165,250,0.8)] shine-effect' : 'text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-white hover:scale-110 hover:-translate-y-1'}`}>
      <div className="relative z-10">{icon}</div>
    </button>
  );
}