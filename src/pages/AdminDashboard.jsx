import { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config"; 
import { 
  collection, query, onSnapshot, 
  doc, updateDoc, deleteDoc, orderBy, 
  addDoc, serverTimestamp, arrayUnion 
} from "firebase/firestore";

import { 
  HomeIcon, UsersIcon, BriefcaseIcon, 
  CheckBadgeIcon, XMarkIcon, ShieldCheckIcon,
  ArrowLeftOnRectangleIcon, MagnifyingGlassIcon,
  MapPinIcon, TrashIcon, EyeIcon, 
  BuildingOfficeIcon, ChartBarIcon,
  ChevronLeftIcon, ChevronRightIcon,
  SunIcon, MoonIcon, FunnelIcon,
  BellIcon, MegaphoneIcon, PaperAirplaneIcon,
  Bars3Icon, ChatBubbleLeftRightIcon, UserCircleIcon,
  ArrowPathIcon, PhoneIcon, EnvelopeIcon, IdentificationIcon
} from "@heroicons/react/24/outline";

// --- STATIC DATA ---
const PUROK_LIST = [
  "Sagur", "Ampungan", "Centro 1", "Centro 2", "Centro 3", "Bypass Road", "Boundary"
];

const PUROK_STYLES = {
  "Sagur": "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-300",
  "Ampungan": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-300",
  "Centro 1": "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-300",
  "Centro 2": "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20 dark:text-fuchsia-300",
  "Centro 3": "bg-pink-500/10 text-pink-600 border-pink-500/20 dark:text-pink-300",
  "Bypass Road": "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-300",
  "Boundary": "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-300",
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [darkMode, setDarkMode] = useState(false);
  
  // Modals
  const [selectedProof, setSelectedProof] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null); 

  const [seenTabs, setSeenTabs] = useState(["Overview"]); 
  const [verificationSubTab, setVerificationSubTab] = useState("pending"); 

  // Data States
  const [applicants, setApplicants] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [tickets, setTickets] = useState([]); 
  
  // Filtered States
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [rejectedUsers, setRejectedUsers] = useState([]);

  // Help & Support
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState("");
  const chatEndRef = useRef(null);

  // Announcement Form
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceBody, setAnnounceBody] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [sitioFilter, setSitioFilter] = useState("");

  // --- DATA FETCHING ---
  useEffect(() => {
    // 1. Users
    const unsubApplicants = onSnapshot(collection(db, "users"), (snap) => 
      setApplicants(snap.docs.map(d => ({ id: d.id, type: 'applicant', ...d.data() }))));
    
    // 2. Employers
    const unsubEmployers = onSnapshot(collection(db, "employers"), (snap) => 
      setEmployers(snap.docs.map(d => ({ id: d.id, type: 'employer', ...d.data() }))));
    
    // 3. Jobs
    const unsubJobs = onSnapshot(query(collection(db, "jobs"), orderBy("createdAt", "desc")), (snap) => 
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    // 4. Support Tickets (Real-time)
    const unsubTickets = onSnapshot(query(collection(db, "support_tickets"), orderBy("lastUpdated", "desc")), (snap) => {
        setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 5. Announcements (Real-time)
    const unsubAnnouncements = onSnapshot(query(collection(db, "announcements"), orderBy("createdAt", "desc")), (snap) => {
        setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubApplicants(); unsubEmployers(); unsubJobs(); unsubTickets(); unsubAnnouncements(); };
  }, []);

  // --- DERIVED STATE ---
  useEffect(() => {
    const allUsers = [...applicants, ...employers];
    
    // Pending
    const pending = allUsers.filter(u => u.verificationStatus === 'pending' || !u.verificationStatus);
    setPendingVerifications(pending);

    // Rejected
    const rejected = allUsers.filter(u => u.verificationStatus === 'rejected');
    setRejectedUsers(rejected);

  }, [applicants, employers]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedTicket]);

  useEffect(() => {
    if (!seenTabs.includes(activeTab)) {
        setSeenTabs(prev => [...prev, activeTab]);
    }
  }, [activeTab]);

  // --- ACTIONS ---
  const handleVerifyUser = async (user, actionType) => {
    const collectionName = user.type === 'employer' ? 'employers' : 'users';
    const isApprove = actionType === 'verified';
    
    let confirmMsg = "";
    if (actionType === 'verified') confirmMsg = `APPROVE ${user.firstName}?`;
    else if (actionType === 'rejected') confirmMsg = `REJECT ${user.firstName}?`;
    else confirmMsg = `RESTORE ${user.firstName} to Pending?`;

    if(confirm(confirmMsg)) {
      try {
        await updateDoc(doc(db, collectionName, user.id), { 
          verificationStatus: actionType, 
          verificationDate: new Date(),
          isVerified: isApprove 
        });
      } catch (err) { alert("Error: " + err.message); }
    }
  };

  const handleDeleteJob = async (jobId) => {
    if(confirm("Permanently delete this job?")) await deleteDoc(doc(db, "jobs", jobId));
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "announcements"), {
            title: announceTitle,
            body: announceBody,
            date: new Date().toLocaleDateString(),
            createdAt: serverTimestamp(),
            author: "Admin"
        });
        setAnnounceTitle("");
        setAnnounceBody("");
        alert("Announcement Posted!");
    } catch (err) {
        alert("Error posting announcement: " + err.message);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if(!replyText.trim() || !selectedTicket) return;
    
    try {
        const ticketRef = doc(db, "support_tickets", selectedTicket.id);
        await updateDoc(ticketRef, {
            messages: arrayUnion({
                sender: 'admin',
                text: replyText,
                timestamp: new Date()
            }),
            lastUpdated: serverTimestamp(),
            status: 'admin_replied' 
        });
        setReplyText("");
    } catch (err) {
        console.error("Error replying:", err);
        const updated = tickets.map(t => t.id === selectedTicket.id ? {...t, messages: [...t.messages, {sender:'admin', text: replyText}]} : t);
        setTickets(updated);
        setSelectedTicket(updated.find(t => t.id === selectedTicket.id));
        setReplyText("");
    }
  };

  // --- STATS LOGIC ---
  const verifiedApplicants = applicants.filter(u => u.verificationStatus === 'verified').length;
  const verifiedEmployers = employers.filter(e => e.verificationStatus === 'verified').length;

  const pendingAppCount = applicants.filter(u => u.verificationStatus === 'pending' || !u.verificationStatus).length;
  const pendingEmpCount = employers.filter(e => e.verificationStatus === 'pending' || !e.verificationStatus).length;
  const openTicketCount = tickets.filter(t => t.status === 'open' || t.status === 'new').length;

  const stats = {
    verifiedApplicants,
    verifiedEmployers,
    activeJobs: jobs.length,
    totalPending: pendingVerifications.length,
    cawayanResidents: "3,176"
  };

  // --- FIXED CHART CALCULATIONS ---
  // Ensure these are treated as numbers
  const vApps = Number(stats.verifiedApplicants || 0);
  const vEmps = Number(stats.verifiedEmployers || 0);
  const maxChartVal = Math.max(vApps, vEmps, 1);

  const applicantHeight = (vApps / maxChartVal) * 100;
  const employerHeight = (vEmps / maxChartVal) * 100;

  // --- STYLES ---
  const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${darkMode 
    ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' 
    : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;
  
  const glassCard = `backdrop-blur-md border rounded-2xl transition-all duration-300 group hover:-translate-y-1 ${darkMode
    ? 'bg-slate-800/40 border-white/5 hover:bg-slate-800/60 hover:border-blue-500/30'
    : 'bg-white/40 border-white/60 hover:bg-white/70 hover:border-blue-300/50 hover:shadow-lg'}`;

  const glassInput = `w-full bg-transparent border-none outline-none text-sm font-bold placeholder-slate-400 ${darkMode ? 'text-white' : 'text-slate-800'}`;

  const getBadge = (tabName, count) => seenTabs.includes(tabName) ? 0 : count;

  return (
    <div className={`relative min-h-screen font-sans selection:bg-blue-500/30 overflow-x-hidden select-none cursor-default ${darkMode ? 'bg-slate-950' : 'bg-slate-100'}`}>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* --- BACKGROUND --- */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-40 animate-pulse ${darkMode ? 'bg-blue-900' : 'bg-blue-300'}`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-40 animate-pulse delay-1000 ${darkMode ? 'bg-purple-900' : 'bg-purple-300'}`}></div>
      </div>

      {/* --- MOBILE HEADER TOGGLE --- */}
      <div className="lg:hidden fixed top-4 left-4 z-[60]">
        <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-3 rounded-2xl shadow-lg backdrop-blur-md border ${darkMode ? 'bg-slate-800/80 border-white/10 text-white' : 'bg-white/80 border-white/20 text-slate-800'}`}
        >
            {isSidebarOpen ? <XMarkIcon className="w-6 h-6"/> : <Bars3Icon className="w-6 h-6"/>}
        </button>
      </div>

      {/* --- SIDEBAR --- */}
      <aside 
        className={`fixed top-0 left-0 h-full lg:top-4 lg:left-4 lg:bottom-4 lg:h-auto z-50 rounded-r-3xl lg:rounded-3xl flex flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${glassPanel}
        ${isSidebarOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0 lg:w-24'}`}
      >
        <div className="h-24 flex items-center justify-center relative mt-8 lg:mt-0">
            <div className={`flex items-center gap-3 transition-all duration-300 ${!isSidebarOpen && 'lg:scale-0 lg:opacity-0 lg:absolute'}`}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <ShieldCheckIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="font-black text-lg tracking-tight leading-none">LIVELI<br/><span className="text-blue-500">MATCH</span></h1>
                </div>
            </div>
            <div className={`hidden lg:block absolute transition-all duration-300 ${isSidebarOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 cursor-pointer" onClick={() => setIsSidebarOpen(true)}>
                    <ShieldCheckIcon className="w-6 h-6 text-white" />
                </div>
            </div>
        </div>

        <nav className="flex-1 px-4 space-y-3 py-4 overflow-y-auto no-scrollbar">
            <NavBtn active={activeTab==="Overview"} onClick={()=>{setActiveTab("Overview"); setIsSidebarOpen(false)}} icon={<HomeIcon className="w-6 h-6"/>} label="Overview" open={isSidebarOpen} dark={darkMode} />
            
            <NavBtn 
                active={activeTab==="Verifications"} 
                onClick={()=>{setActiveTab("Verifications"); setIsSidebarOpen(false)}} 
                icon={<CheckBadgeIcon className="w-6 h-6"/>} 
                label="Verifications" 
                open={isSidebarOpen} 
                dark={darkMode}
                badge={getBadge("Verifications", stats.totalPending)} 
                badgeColor="bg-red-500"
            />

            <NavBtn 
                active={activeTab==="Help"} 
                onClick={()=>{setActiveTab("Help"); setIsSidebarOpen(false)}} 
                icon={<ChatBubbleLeftRightIcon className="w-6 h-6"/>} 
                label="Help & Support" 
                open={isSidebarOpen} 
                dark={darkMode}
                badge={getBadge("Help", openTicketCount)} 
                badgeColor="bg-orange-500"
            />
            
             <NavBtn 
                active={activeTab==="Announcements"} 
                onClick={()=>{setActiveTab("Announcements"); setIsSidebarOpen(false)}} 
                icon={<MegaphoneIcon className="w-6 h-6"/>} 
                label="Announcements" 
                open={isSidebarOpen} 
                dark={darkMode}
            />
            
            <div className={`h-px mx-4 my-2 ${darkMode ? 'bg-white/10' : 'bg-slate-900/10'}`}></div>
            
            <p className={`px-4 text-[10px] font-black uppercase tracking-widest opacity-50 mb-2 transition-all ${!isSidebarOpen && 'lg:hidden'}`}>Database</p>
            
            <NavBtn 
                active={activeTab==="Applicants"} 
                onClick={()=>{setActiveTab("Applicants"); setIsSidebarOpen(false)}} 
                icon={<UsersIcon className="w-6 h-6"/>} 
                label="Applicants" 
                open={isSidebarOpen} 
                dark={darkMode}
                badge={getBadge("Applicants", pendingAppCount)}
                badgeColor="bg-blue-500"
            />
            <NavBtn 
                active={activeTab==="Employers"} 
                onClick={()=>{setActiveTab("Employers"); setIsSidebarOpen(false)}} 
                icon={<BuildingOfficeIcon className="w-6 h-6"/>} 
                label="Employers" 
                open={isSidebarOpen} 
                dark={darkMode}
                badge={getBadge("Employers", pendingEmpCount)}
                badgeColor="bg-purple-500"
            />
            <NavBtn 
                active={activeTab==="Jobs"} 
                onClick={()=>{setActiveTab("Jobs"); setIsSidebarOpen(false)}} 
                icon={<BriefcaseIcon className="w-6 h-6"/>} 
                label="Job Board" 
                open={isSidebarOpen} 
                dark={darkMode}
            />
        </nav>

        <div className="p-4 space-y-3">
             <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all duration-300 ${darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'} ${!isSidebarOpen && 'lg:justify-center'}`}
            >
                {darkMode ? <SunIcon className="w-6 h-6 text-amber-400"/> : <MoonIcon className="w-6 h-6 text-slate-600"/>}
                {isSidebarOpen && <span className="text-xs font-bold">Switch Theme</span>}
             </button>

             <button 
                onClick={() => signOut(auth)}
                className={`w-full p-3 rounded-2xl flex items-center gap-3 text-red-500 transition-all duration-300 hover:bg-red-500/10 ${!isSidebarOpen && 'lg:justify-center'}`}
            >
                <ArrowLeftOnRectangleIcon className="w-6 h-6"/>
                {isSidebarOpen && <span className="text-xs font-bold">Logout</span>}
             </button>
        </div>

        <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`hidden lg:flex absolute top-1/2 -right-4 translate-y-[-50%] w-8 h-8 rounded-full items-center justify-center shadow-lg backdrop-blur-md border border-white/20 z-50 transition-all hover:scale-110 ${darkMode ? 'bg-slate-800 text-white' : 'bg-white text-blue-900'}`}
        >
            {isSidebarOpen ? <ChevronLeftIcon className="w-4 h-4"/> : <ChevronRightIcon className="w-4 h-4"/>}
        </button>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className={`relative z-10 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] p-4 lg:p-8 pt-20 lg:pt-8 ${isSidebarOpen ? 'lg:ml-80' : 'lg:ml-32'}`}>
        
        {/* Floating Header */}
        <header className={`mb-6 lg:mb-8 flex items-center justify-between p-4 rounded-2xl ${glassPanel}`}>
            <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl hidden md:block ${darkMode ? 'bg-white/5' : 'bg-blue-50'}`}>
                    {activeTab === "Overview" && <HomeIcon className="w-6 h-6 text-blue-500"/>}
                    {activeTab === "Verifications" && <CheckBadgeIcon className="w-6 h-6 text-blue-500"/>}
                    {activeTab === "Announcements" && <MegaphoneIcon className="w-6 h-6 text-blue-500"/>}
                    {activeTab === "Help" && <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-500"/>}
                    {(activeTab === "Applicants" || activeTab === "Employers") && <UsersIcon className="w-6 h-6 text-blue-500"/>}
                    {activeTab === "Jobs" && <BriefcaseIcon className="w-6 h-6 text-blue-500"/>}
                </div>
                <div>
                    <h2 className={`text-xl lg:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>{activeTab}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Admin Workspace</p>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="relative cursor-pointer group" onClick={() => setActiveTab("Verifications")}>
                    <BellIcon className={`w-7 h-7 ${darkMode ? 'text-white' : 'text-slate-600'}`}/>
                    {getBadge("Verifications", stats.totalPending) > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full animate-bounce shadow-md">
                            {stats.totalPending}
                        </div>
                    )}
                </div>
            </div>
        </header>

        {/* TAB CONTENT: OVERVIEW */}
        {activeTab === "Overview" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    <div className={`col-span-1 md:col-span-2 p-6 rounded-3xl border backdrop-blur-md flex items-center justify-between ${darkMode ? 'bg-gradient-to-r from-blue-900/40 to-slate-900/40 border-blue-500/20' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border-blue-200'} relative overflow-hidden group`}>
                        <div className="relative z-10">
                            <h3 className={`text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats.cawayanResidents}</h3>
                            <p className={`text-xs font-bold uppercase tracking-widest mt-2 ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>Total Residents of Cawayan Bogtong</p>
                        </div>
                        <MapPinIcon className={`w-24 h-24 absolute -right-4 -bottom-4 opacity-10 rotate-12 ${darkMode ? 'text-white' : 'text-blue-900'}`}/>
                    </div>
                    <GlassStat title="Verified Applicants" value={stats.verifiedApplicants} icon={<UsersIcon className="w-6 h-6"/>} color="blue" dark={darkMode} />
                    <GlassStat title="Verified Employers" value={stats.verifiedEmployers} icon={<BuildingOfficeIcon className="w-6 h-6"/>} color="purple" dark={darkMode} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Analytics Bar Chart - FIXED */}
                    <div className={`lg:col-span-2 p-6 lg:p-8 rounded-3xl ${glassPanel} flex flex-col justify-between`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                            <div className="flex items-center gap-3">
                                <ChartBarIcon className="w-6 h-6 text-purple-500"/>
                                <div>
                                    <h3 className="font-bold text-lg">Platform Engagement</h3>
                                    <p className="text-[10px] opacity-50 uppercase font-bold">
                                    {vApps} Applicants • {vEmps} Employers
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4 text-xs font-bold">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Applicants</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Employers</div>
                            </div>
                        </div>

                        {/* CSS Chart Container */}
                        <div className="flex h-40 lg:h-48 items-end gap-8 lg:gap-12 px-4 border-b border-gray-500/10 pb-2">
                            
                            {/* Applicant Bar (Blue) */}
                            <div className="flex-1 flex flex-col justify-end group h-full">
                                <div className="flex flex-col justify-end h-full">
                                    <div className={`text-center font-bold text-lg mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                        {vApps}
                                    </div>
                                    <div 
                                        style={{ height: `${applicantHeight}%`, minHeight: '4px' }} 
                                        className={`w-full rounded-t-xl relative overflow-hidden transition-all duration-500 ${vApps > 0 ? 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)]' : 'bg-slate-200 dark:bg-slate-800 opacity-20'}`}
                                    >
                                    </div>
                                </div>
                            </div>

                            {/* Employer Bar (Purple) */}
                            <div className="flex-1 flex flex-col justify-end group h-full">
                                <div className="flex flex-col justify-end h-full">
                                    <div className={`text-center font-bold text-lg mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                        {vEmps}
                                    </div>
                                    <div 
                                        style={{ height: `${employerHeight}%`, minHeight: '4px' }} 
                                        className={`w-full rounded-t-xl relative overflow-hidden transition-all duration-500 ${vEmps > 0 ? 'bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'bg-slate-200 dark:bg-slate-800 opacity-20'}`}
                                    >
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    <div className={`p-6 lg:p-8 rounded-3xl ${glassPanel} overflow-y-auto no-scrollbar max-h-[400px]`}>
                        <div className="flex items-center gap-3 mb-6">
                            <UsersIcon className="w-6 h-6 text-blue-500"/>
                            <h3 className="font-bold text-lg">Purok Breakdown</h3>
                        </div>
                        <div className="space-y-5">
                             {PUROK_LIST.map(purok => {
                                // Count both Applicants AND Employers
                                const count = [...applicants, ...employers].filter(u => u.verificationStatus === 'verified' && u.sitio === purok).length;
                                const total = stats.verifiedApplicants + stats.verifiedEmployers || 1;
                                const percent = (count / total) * 100;
                                return (
                                    <div key={purok}>
                                        <div className="flex justify-between text-xs font-bold mb-2 opacity-80">
                                            <span>{purok}</span>
                                            <span>{count}</span>
                                        </div>
                                        <div className={`h-2 w-full rounded-full overflow-hidden ${darkMode ? 'bg-white/10' : 'bg-black/5'}`}>
                                            <div style={{ width: `${percent}%` }} className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* TAB CONTENT: HELP & SUPPORT */}
        {activeTab === "Help" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)] animate-in fade-in zoom-in-95 duration-500">
                {/* TICKET LIST */}
                <div className={`lg:col-span-1 rounded-3xl overflow-hidden flex flex-col ${glassPanel}`}>
                    <div className="p-6 border-b border-gray-500/10">
                        <h3 className="font-bold text-lg">Support Inbox</h3>
                        <p className="text-xs opacity-50 font-bold uppercase mt-1">{tickets.length} total tickets</p>
                    </div>
                    {tickets.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                             <ChatBubbleLeftRightIcon className="w-12 h-12 mb-2"/>
                             <p className="text-sm font-bold">No active tickets</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2">
                            {tickets.map(t => (
                                <div 
                                    key={t.id} 
                                    onClick={() => setSelectedTicket(t)}
                                    className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedTicket?.id === t.id ? 'bg-blue-500/10 border-blue-500' : `border-transparent hover:bg-black/5 dark:hover:bg-white/5`}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>{t.user || "User"}</h4>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${t.status === 'open' || t.status === 'new' ? 'bg-orange-500/20 text-orange-500' : 'bg-emerald-500/20 text-emerald-500'}`}>{t.status || 'open'}</span>
                                    </div>
                                    <p className="text-xs font-bold opacity-60 mb-2">{t.type || "Support"}</p>
                                    <p className="text-xs opacity-50 truncate">
                                        {t.messages && t.messages.length > 0 ? t.messages[t.messages.length - 1].text : 'No messages'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* CHAT AREA */}
                <div className={`lg:col-span-2 rounded-3xl overflow-hidden flex flex-col ${glassPanel} relative`}>
                    {selectedTicket ? (
                        <>
                            <div className="p-4 border-b border-gray-500/10 flex justify-between items-center bg-white/5 backdrop-blur-sm z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold shadow-md">
                                        <UserCircleIcon className="w-6 h-6"/>
                                    </div>
                                    <div>
                                        <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{selectedTicket.user}</h4>
                                        <p className="text-xs opacity-50 font-bold uppercase">{selectedTicket.type}</p>
                                    </div>
                                </div>
                                <button onClick={()=>setSelectedTicket(null)} className="lg:hidden p-2"><XMarkIcon className="w-6 h-6"/></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                                {selectedTicket.messages && selectedTicket.messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${msg.sender === 'admin' 
                                            ? 'bg-blue-600 text-white rounded-tr-sm shadow-blue-500/20 shadow-lg' 
                                            : `rounded-tl-sm ${darkMode ? 'bg-white/10 text-white' : 'bg-white text-slate-800 shadow-sm'}`}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            <div className="p-4 border-t border-gray-500/10 bg-white/5 backdrop-blur-sm">
                                <form onSubmit={handleSendReply} className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Type your reply..." 
                                        className={`flex-1 p-3 rounded-xl border-none outline-none text-sm font-medium ${darkMode ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-white text-slate-800 shadow-inner'}`}
                                    />
                                    <button type="submit" className="p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20">
                                        <PaperAirplaneIcon className="w-5 h-5"/>
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                            <ChatBubbleLeftRightIcon className="w-24 h-24 mb-4"/>
                            <p className="font-bold text-lg">Select a ticket to respond</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* TAB CONTENT: ANNOUNCEMENTS */}
        {activeTab === "Announcements" && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className={`lg:col-span-1 p-6 rounded-3xl ${glassPanel} h-fit`}>
                    <div className="flex items-center gap-3 mb-6">
                        <MegaphoneIcon className="w-6 h-6 text-pink-500"/>
                        <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>New Announcement</h3>
                    </div>
                    <form onSubmit={handlePostAnnouncement} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase opacity-50 ml-1">Title</label>
                            <input 
                                value={announceTitle}
                                onChange={(e)=>setAnnounceTitle(e.target.value)}
                                required
                                className={`w-full p-4 rounded-xl mt-1 border outline-none font-bold ${darkMode ? 'bg-slate-800/50 border-white/10 focus:border-pink-500 text-white' : 'bg-white/50 border-white/40 focus:border-pink-500 text-slate-800'}`} 
                                placeholder="What's happening?"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase opacity-50 ml-1">Details</label>
                            <textarea 
                                value={announceBody}
                                onChange={(e)=>setAnnounceBody(e.target.value)}
                                required
                                rows="6"
                                className={`w-full p-4 rounded-xl mt-1 border outline-none text-sm ${darkMode ? 'bg-slate-800/50 border-white/10 focus:border-pink-500 text-white' : 'bg-white/50 border-white/40 focus:border-pink-500 text-slate-800'}`} 
                                placeholder="Type your announcement here..."
                            ></textarea>
                        </div>
                        <button type="submit" className="w-full py-3 rounded-xl bg-pink-500 text-white font-black uppercase tracking-widest shadow-lg shadow-pink-500/30 hover:bg-pink-600 transition-all flex items-center justify-center gap-2">
                            <PaperAirplaneIcon className="w-5 h-5"/> Post
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <h3 className={`font-bold text-xl px-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Recent Announcements</h3>
                    {announcements.length === 0 ? (
                        <div className={`p-12 rounded-3xl border-dashed border-2 flex flex-col items-center justify-center ${darkMode ? 'border-white/10' : 'border-black/5'}`}>
                            {/* Fixed Dark Mode Icon/Text */}
                            <MegaphoneIcon className={`w-12 h-12 mb-2 ${darkMode ? 'text-white opacity-20' : 'text-black opacity-20'}`}/>
                            <p className={`font-bold ${darkMode ? 'text-white opacity-40' : 'text-black opacity-40'}`}>No announcements yet.</p>
                        </div>
                    ) : (
                        announcements.map(ann => (
                            <div key={ann.id} className={`p-6 rounded-2xl relative overflow-hidden group ${glassCard}`}>
                                <div className="absolute top-0 left-0 w-1 h-full bg-pink-500"></div>
                                <div className="flex justify-between items-start mb-2 pl-2">
                                    <h4 className={`font-black text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>{ann.title}</h4>
                                    <span className="text-[10px] font-bold opacity-40 uppercase bg-black/5 dark:bg-white/5 px-2 py-1 rounded">{ann.date}</span>
                                </div>
                                <p className="text-sm opacity-70 pl-2 leading-relaxed whitespace-pre-wrap">{ann.body}</p>
                            </div>
                        ))
                    )}
                </div>
             </div>
        )}

        {/* TAB CONTENT: VERIFICATIONS (With Rejected Sub-Tab) */}
        {activeTab === "Verifications" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* SUB-TABS (Pending | Rejected) */}
                <div className="flex gap-4 mb-6 border-b border-gray-500/10 pb-2">
                    <button 
                        onClick={()=>setVerificationSubTab("pending")}
                        className={`text-sm font-black uppercase tracking-widest pb-2 transition-all ${verificationSubTab === "pending" ? 'text-blue-500 border-b-2 border-blue-500' : 'opacity-40 hover:opacity-100'}`}
                    >
                        Pending Requests ({pendingVerifications.length})
                    </button>
                    <button 
                        onClick={()=>setVerificationSubTab("rejected")}
                        className={`text-sm font-black uppercase tracking-widest pb-2 transition-all ${verificationSubTab === "rejected" ? 'text-red-500 border-b-2 border-red-500' : 'opacity-40 hover:opacity-100'}`}
                    >
                        Rejected History ({rejectedUsers.length})
                    </button>
                </div>

                {verificationSubTab === "pending" ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
                        {pendingVerifications.length === 0 && (
                            <div className={`col-span-full py-20 flex flex-col items-center justify-center rounded-3xl ${glassPanel} border-dashed`}>
                                <ShieldCheckIcon className="w-16 h-16 text-emerald-500 mb-4 opacity-50"/>
                                <p className="font-bold opacity-50">All Clear! No pending requests.</p>
                            </div>
                        )}
                        {pendingVerifications.map(user => (
                            <div key={user.id} className={`p-6 ${glassCard} relative overflow-hidden`}>
                                <div className="flex flex-col sm:flex-row gap-5 relative z-10">
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 overflow-hidden shrink-0 shadow-inner">
                                        {user.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-black opacity-30 text-2xl">?</div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className={`font-black text-xl truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>{user.firstName} {user.lastName}</h3>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${user.type === 'employer' ? 'bg-purple-500/20 text-purple-500' : 'bg-blue-500/20 text-blue-500'}`}>{user.type}</span>
                                        </div>
                                        <p className="text-xs font-bold opacity-50 mt-1 flex items-center gap-1"><MapPinIcon className="w-3 h-3"/> {user.sitio || "No address"}</p>
                                        
                                        <button 
                                            onClick={() => setSelectedProof(user.residencyProofUrl || user.businessPermitUrl)}
                                            className={`mt-4 w-full py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold border transition-all ${darkMode ? 'border-white/10 hover:bg-white/5' : 'border-black/5 hover:bg-black/5'}`}
                                        >
                                            <EyeIcon className="w-4 h-4"/> View ID / Proof
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-4 relative z-10">
                                    <button onClick={() => handleVerifyUser(user, 'rejected')} className="flex-1 py-3 rounded-xl border border-red-500/30 text-red-500 font-bold text-xs uppercase hover:bg-red-500/10 transition-colors">Reject</button>
                                    <button onClick={() => handleVerifyUser(user, 'verified')} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-colors">Approve</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // REJECTED VIEW
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
                        {rejectedUsers.length === 0 && (
                             <div className={`col-span-full py-20 flex flex-col items-center justify-center rounded-3xl ${glassPanel} border-dashed`}>
                                <TrashIcon className="w-16 h-16 text-slate-400 mb-4 opacity-30"/>
                                <p className="font-bold opacity-50">Trash is empty.</p>
                            </div>
                        )}
                        {rejectedUsers.map(user => (
                            <div key={user.id} className={`p-6 ${glassCard} relative overflow-hidden opacity-75 hover:opacity-100`}>
                                 <div className="flex justify-between items-center mb-4">
                                     <h3 className={`font-black text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>{user.firstName} {user.lastName} <span className="text-xs font-normal opacity-50">({user.type})</span></h3>
                                     <span className="text-[10px] font-bold uppercase bg-red-500 text-white px-2 py-1 rounded">Rejected</span>
                                 </div>
                                 <button 
                                    onClick={() => handleVerifyUser(user, 'pending')}
                                    className="w-full py-2 rounded-xl border border-blue-500/30 text-blue-500 hover:bg-blue-500 hover:text-white transition-all font-bold text-xs uppercase flex items-center justify-center gap-2"
                                 >
                                    <ArrowPathIcon className="w-4 h-4"/> Restore to Pending
                                 </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* TAB CONTENT: LISTS */}
        {(activeTab !== "Overview" && activeTab !== "Verifications" && activeTab !== "Announcements" && activeTab !== "Help") && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className={`p-2 rounded-2xl flex flex-col md:flex-row items-center justify-between ${glassPanel} gap-4 md:gap-0`}>
                    <div className="flex items-center gap-3 px-4 flex-1 w-full md:w-auto">
                        <MagnifyingGlassIcon className="w-5 h-5 opacity-50"/>
                        <input 
                            type="text" 
                            placeholder={`Search in ${activeTab}...`} 
                            className={glassInput}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {activeTab !== "Jobs" && (
                        <div className={`flex items-center gap-2 px-4 w-full md:w-auto border-t md:border-t-0 md:border-l pt-2 md:pt-0 ${darkMode ? 'border-white/10' : 'border-black/5'}`}>
                            <FunnelIcon className="w-4 h-4 opacity-50"/>
                            <select 
                                className={`bg-transparent border-none outline-none text-xs font-bold cursor-pointer uppercase tracking-wide w-full md:w-auto ${darkMode ? 'text-white' : 'text-slate-800'}`}
                                onChange={(e) => setSitioFilter(e.target.value)}
                            >
                                <option value="">All Sitios</option>
                                {PUROK_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(activeTab === "Jobs" ? jobs : (activeTab === "Applicants" ? applicants : employers))
                        .filter(item => {
                            if(activeTab === "Jobs") return item.title.toLowerCase().includes(searchTerm.toLowerCase());
                            return item.verificationStatus === 'verified' && (!sitioFilter || item.sitio === sitioFilter);
                        })
                        .map(item => (
                            <div 
                                key={item.id} 
                                // Click Handler for Details
                                onClick={() => { if(activeTab !== "Jobs") setSelectedUserDetail(item) }}
                                className={`p-6 ${glassCard} ${activeTab !== "Jobs" ? 'cursor-pointer' : ''}`}
                            >
                                {activeTab === "Jobs" ? (
                                    <>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                                <BriefcaseIcon className="w-6 h-6"/>
                                            </div>
                                            <button onClick={() => handleDeleteJob(item.id)} className="text-slate-400 hover:text-red-500 transition-colors"><TrashIcon className="w-5 h-5"/></button>
                                        </div>
                                        <h4 className={`font-black text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>{item.title}</h4>
                                        <p className="text-xs font-bold opacity-50 mb-4">{item.employerName} • {item.salary}</p>
                                        <div className="flex gap-2">
                                            <span className="px-2 py-1 rounded-md text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">{item.type}</span>
                                            <span className="px-2 py-1 rounded-md text-[10px] font-black uppercase bg-slate-500/10 text-slate-500 border border-slate-500/20">{item.sitio}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border-2 border-white/20 shadow-md">
                                            {item.profilePic ? <img src={item.profilePic} className="w-full h-full object-cover"/> : null}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className={`font-bold text-sm truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.firstName} {item.lastName}</h4>
                                            <div className={`mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-bold border truncate ${PUROK_STYLES[item.sitio] || 'bg-slate-100 text-slate-500'}`}>
                                                {item.sitio}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleVerifyUser(item, 'rejected'); }} 
                                            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                        >
                                            <XMarkIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    }
                </div>
            </div>
        )}

      </main>

      {/* --- PROOF MODAL --- */}
      {selectedProof && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedProof(null)}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>
            <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center animate-in zoom-in-95 duration-300">
                <img src={selectedProof} className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl border border-white/20 mb-6" />
                <button className="px-8 py-3 rounded-full bg-white text-slate-900 font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                    <XMarkIcon className="w-4 h-4"/> Close Viewer
                </button>
            </div>
        </div>
      )}

      {/* --- USER DETAIL CARD MODAL (UPDATED) --- */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedUserDetail(null)}>
             <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>
             
             <div 
                onClick={(e) => e.stopPropagation()}
                className={`relative w-full max-w-md p-8 rounded-3xl shadow-2xl border animate-in zoom-in-95 duration-300 flex flex-col items-center ${darkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-white/50 text-slate-900'}`}
             >
                <div className="w-24 h-24 rounded-3xl bg-slate-200 overflow-hidden shadow-lg mb-6">
                    {selectedUserDetail.profilePic 
                        ? <img src={selectedUserDetail.profilePic} className="w-full h-full object-cover"/> 
                        : <div className="w-full h-full flex items-center justify-center text-4xl font-black opacity-20">?</div>}
                </div>
                
                <h2 className="text-2xl font-black mb-1">{selectedUserDetail.firstName} {selectedUserDetail.lastName}</h2>
                <div className="flex gap-2 mb-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-500/10 text-blue-500`}>{selectedUserDetail.type}</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${darkMode ? 'border-white/10' : 'border-black/10'}`}>{selectedUserDetail.sitio}</span>
                </div>

                <div className="w-full space-y-4">
                    {/* Updated to fetch CONTACT info */}
                    <div className={`p-4 rounded-xl flex items-center gap-4 ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                        <IdentificationIcon className="w-5 h-5 opacity-50"/>
                        <span className="text-sm font-bold opacity-80">{selectedUserDetail.contact || "No contact info provided"}</span>
                    </div>
                    {selectedUserDetail.bio && (
                        <div className={`p-4 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                            <p className="text-xs font-bold uppercase opacity-40 mb-2">Bio / Description</p>
                            <p className="text-sm opacity-80 leading-relaxed">{selectedUserDetail.bio}</p>
                        </div>
                    )}
                </div>

                <button onClick={() => setSelectedUserDetail(null)} className="mt-8 px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest border border-current opacity-50 hover:opacity-100 transition-opacity">
                    Close Details
                </button>
             </div>
        </div>
      )}

    </div>
  );
}

// --- SUB COMPONENTS ---

function NavBtn({ active, onClick, icon, label, open, dark, badge, badgeColor }) {
    return (
        <button 
            onClick={onClick}
            title={!open ? label : ''}
            className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 group relative overflow-hidden
            ${active 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                : `${dark ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'}`
            } ${!open && 'lg:justify-center'}`}
        >
            <div className={`absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent z-0 pointer-events-none`}></div>
            <div className="relative z-10 shrink-0">{icon}</div>
            <span className={`relative z-10 font-bold text-xs uppercase tracking-widest whitespace-nowrap overflow-hidden transition-all duration-300 ${!open ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'}`}>
                {label}
            </span>
            {(badge > 0 && open) && <span className={`absolute right-3 ${badgeColor || 'bg-red-500'} text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm z-10`}>{badge}</span>}
            {(badge > 0 && !open) && <span className={`hidden lg:block absolute top-2 right-2 w-2.5 h-2.5 ${badgeColor || 'bg-red-500'} rounded-full border-2 border-white dark:border-slate-900 animate-pulse z-10`}></span>}
            {(badge > 0 && !open) && <span className={`lg:hidden absolute right-3 ${badgeColor || 'bg-red-500'} text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm z-10`}>{badge}</span>}
        </button>
    )
}

function GlassStat({ title, value, icon, color, dark }) {
    const colors = {
        blue: "text-blue-500 bg-blue-500/20",
        purple: "text-purple-500 bg-purple-500/20",
        emerald: "text-emerald-500 bg-emerald-500/20",
        amber: "text-amber-500 bg-amber-500/20",
    }

    return (
        <div className={`p-6 rounded-3xl border backdrop-blur-md transition-all duration-300 group hover:-translate-y-1 ${dark 
            ? 'bg-slate-800/40 border-white/5 hover:bg-slate-800/60' 
            : 'bg-white/40 border-white/50 hover:bg-white/60 hover:shadow-xl'}`}
        >
            <div className="flex justify-between items-start">
                <div>
                    <h3 className={`text-4xl lg:text-3xl xl:text-4xl font-black tracking-tight ${dark ? 'text-white' : 'text-slate-800'}`}>{value}</h3>
                    <p className={`text-[10px] font-bold uppercase tracking-widest opacity-50 mt-1 ${dark ? 'text-white' : 'text-slate-800'}`}>{title}</p>
                </div>
                <div className={`p-3 rounded-2xl ${colors[color]} shadow-inner`}>
                    {icon}
                </div>
            </div>
        </div>
    )
}