import { useState, useEffect, useRef, cloneElement } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db, storage } from "../firebase/config"; 
import { useToast } from "../context/ToastContext"; 
import { 
  collection, query, onSnapshot, 
  doc, updateDoc, deleteDoc, orderBy, 
  addDoc, serverTimestamp, arrayUnion 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; 

import { 
  HomeIcon, UsersIcon, BriefcaseIcon, 
  CheckBadgeIcon, XMarkIcon, ShieldCheckIcon,
  ArrowLeftOnRectangleIcon, MagnifyingGlassIcon,
  MapPinIcon, TrashIcon, EyeIcon, CheckCircleIcon,
  BuildingOfficeIcon, ChartBarIcon,
  ChevronLeftIcon, ChevronRightIcon,
  SunIcon, MoonIcon, FunnelIcon,
  BellIcon, MegaphoneIcon, PaperAirplaneIcon,
  Bars3Icon, ChatBubbleLeftRightIcon, UserCircleIcon,
  ArrowPathIcon, PhoneIcon, EnvelopeIcon, DocumentIcon,
  TagIcon, AcademicCapIcon, Cog8ToothIcon, WrenchScrewdriverIcon, 
  ClockIcon, CalendarDaysIcon, BoltIcon, UserGroupIcon, ArchiveBoxIcon
} from "@heroicons/react/24/outline";

// --- STATIC DATA & THEME CONSTANTS ---
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

const JOB_CATEGORIES = [
    { id: "EDUCATION", label: "Education" },
    { id: "AGRICULTURE", label: "Agriculture" },
    { id: "AUTOMOTIVE", label: "Automotive" },
    { id: "CARPENTRY", label: "Carpentry" },
    { id: "HOUSEHOLD", label: "Household Service" },
    { id: "CUSTOMER_SERVICE", label: "Customer Service" }
];

const getJobStyle = (type) => {
    const types = {
        "Full-time": { icon: <BriefcaseIcon className="w-5 h-5"/>, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
        "Part-time": { icon: <ClockIcon className="w-5 h-5"/>, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
        "Contract": { icon: <CalendarDaysIcon className="w-5 h-5"/>, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
        "One-time": { icon: <BoltIcon className="w-5 h-5"/>, color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20" }
    };
    return types[type] || types["Full-time"];
};

const getCatStyles = (id) => {
    const iconMap = {
        'EDUCATION': AcademicCapIcon,
        'AGRICULTURE': SunIcon,
        'AUTOMOTIVE': Cog8ToothIcon,
        'CARPENTRY': WrenchScrewdriverIcon,
        'HOUSEHOLD': HomeIcon,
        'CUSTOMER_SERVICE': UserGroupIcon,
    };
    return { icon: iconMap[id] || TagIcon };
};

const getCardTheme = (categoryId, isDark) => {
    const darkColors = {
        'EDUCATION': { text: 'text-blue-400', bgLight: 'bg-blue-400/10', border: 'border-blue-400/30', cardBg: 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(96,165,250,0.25)]' },
        'AGRICULTURE': { text: 'text-green-400', bgLight: 'bg-green-400/10', border: 'border-green-400/30', cardBg: 'bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(74,222,128,0.25)]' },
        'AUTOMOTIVE': { text: 'text-slate-400', bgLight: 'bg-slate-400/10', border: 'border-slate-400/30', cardBg: 'bg-gradient-to-br from-slate-500/20 to-slate-500/5 border border-slate-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(148,163,184,0.25)]' },
        'CARPENTRY': { text: 'text-yellow-400', bgLight: 'bg-yellow-400/10', border: 'border-yellow-400/30', cardBg: 'bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(250,204,21,0.25)]' },
        'HOUSEHOLD': { text: 'text-pink-400', bgLight: 'bg-pink-400/10', border: 'border-pink-400/30', cardBg: 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 border border-pink-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(244,114,182,0.25)]' },
        'CUSTOMER_SERVICE': { text: 'text-purple-400', bgLight: 'bg-purple-400/10', border: 'border-purple-400/30', cardBg: 'bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(192,132,252,0.25)]' },
    };
    const fallbackDark = { text: 'text-slate-400', bgLight: 'bg-slate-400/10', border: 'border-slate-400/30', cardBg: 'bg-gradient-to-br from-slate-500/20 to-slate-500/5 border border-slate-500/20 backdrop-blur-xl shadow-sm', hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(148,163,184,0.25)]' };

    if (isDark) {
        const cat = darkColors[categoryId] || fallbackDark;
        return {
            title: cat.text, location: cat.text, salaryLabel: cat.text, salaryValue: cat.text, currency: `${cat.text} opacity-70`,
            badge: `${cat.bgLight} ${cat.text} ${cat.border}`, saveIdle: `${cat.text} opacity-50 hover:opacity-100 hover:bg-white/10`,
            borderColor: cat.border, bgIcon: cat.text, cardBg: cat.cardBg, hoverShadow: cat.hoverShadow, descText: 'text-slate-300'
        };
    } else {
        return {
            title: 'text-white drop-shadow-md', location: 'text-blue-100', salaryLabel: 'text-blue-200', salaryValue: 'text-white', currency: 'text-blue-200',
            badge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]', 
            saveIdle: 'text-white/70 hover:bg-white/20 hover:text-white transition-colors',
            borderColor: 'border-white/20', bgIcon: 'text-white', 
            cardBg: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700 shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] ring-1 ring-inset ring-white/40',
            hoverShadow: 'hover:shadow-[0_15px_30px_-5px_rgba(37,99,235,0.5)]', descText: 'text-blue-50 drop-shadow-sm'
        };
    }
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("Overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [darkMode, setDarkMode] = useState(false);
  
  // Custom Confirm Modal
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: "", message: "", onConfirm: null, isDestructive: false, confirmText: "Confirm" });
  
  const requestConfirm = (title, message, onConfirm, isDestructive = false, confirmText = "Confirm") => {
      setConfirmDialog({ isOpen: true, title, message, onConfirm, isDestructive, confirmText });
  };
  const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));

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
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketFilter, setTicketFilter] = useState("active"); // active, open, closed, archived
  const [isTicketDropdownOpen, setIsTicketDropdownOpen] = useState(false);
  const chatEndRef = useRef(null);

  // Announcement Form
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceBody, setAnnounceBody] = useState("");
  const [announceFiles, setAnnounceFiles] = useState([]);
  const [isPostingAnn, setIsPostingAnn] = useState(false);

  // Unified Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [sitioFilter, setSitioFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Clear filters when switching tabs
  useEffect(() => {
      setSearchTerm("");
      setSitioFilter("");
      setCategoryFilter("");
      setUserTypeFilter("");
      setIsFilterDropdownOpen(false);
      setIsTicketDropdownOpen(false);
  }, [activeTab]);

  // --- DATA FETCHING ---
  useEffect(() => {
    const unsubApplicants = onSnapshot(collection(db, "applicants"), (snap) => 
    setApplicants(snap.docs.map(d => ({ id: d.id, type: 'applicant', ...d.data() }))));
    
    const unsubEmployers = onSnapshot(collection(db, "employers"), (snap) => 
      setEmployers(snap.docs.map(d => ({ id: d.id, type: 'employer', ...d.data() }))));
    
    const unsubJobs = onSnapshot(query(collection(db, "jobs"), orderBy("createdAt", "desc")), (snap) => 
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubTickets = onSnapshot(query(collection(db, "support_tickets"), orderBy("lastUpdated", "desc")), (snap) => {
        setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubAnnouncements = onSnapshot(query(collection(db, "announcements"), orderBy("createdAt", "desc")), (snap) => {
        setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubApplicants(); unsubEmployers(); unsubJobs(); unsubTickets(); unsubAnnouncements(); };
  }, []);

  // --- DERIVED STATE ---
  useEffect(() => {
    const allUsers = [...applicants, ...employers];
    const pending = allUsers.filter(u => u.status === 'pending' || u.verificationStatus === 'pending' || (!u.status && !u.verificationStatus));
    setPendingVerifications(pending);
    const rejected = allUsers.filter(u => u.status === 'rejected' || u.verificationStatus === 'rejected');
    setRejectedUsers(rejected);
  }, [applicants, employers]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedTicket]);

  useEffect(() => {
    if (!seenTabs.includes(activeTab)) {
        setSeenTabs(prev => [...prev, activeTab]);
    }
  }, [activeTab]);

  // Support Inbox Filtering Logic
  const filteredTickets = tickets.filter(t => {
      const reqNum = `Request #${t.ticketId || t.id.slice(0, 6).toUpperCase()}`;
      const searchClean = ticketSearch.toLowerCase().replace('request', '').replace('#', '').trim();
      const matchesSearch = reqNum.toLowerCase().includes(searchClean);

      // 'active' shows open and closed, but hides archived
      if (ticketFilter === 'active') return matchesSearch && t.status !== 'archived';
      if (ticketFilter === 'open') return matchesSearch && (t.status === 'open' || t.status === 'new' || t.status === 'admin_replied');
      if (ticketFilter === 'closed') return matchesSearch && t.status === 'closed';
      if (ticketFilter === 'archived') return matchesSearch && t.status === 'archived';
      
      return matchesSearch;
  });

  // Verification Search Logic
  const filteredPending = pendingVerifications.filter(u => {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      const matchesSearch = name.includes(searchTerm.toLowerCase());
      const matchesType = userTypeFilter ? u.type === userTypeFilter : true;
      return matchesSearch && matchesType;
  });

  const filteredRejected = rejectedUsers.filter(u => {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      const matchesSearch = name.includes(searchTerm.toLowerCase());
      const matchesType = userTypeFilter ? u.type === userTypeFilter : true;
      return matchesSearch && matchesType;
  });

  // --- ACTIONS ---
  const handleVerifyUser = (user, actionType) => {
    const collectionName = user.type === 'employer' ? 'employers' : 'applicants';
    const isApprove = actionType === 'verified';
    
    let confirmMsg = "";
    let isDestructive = actionType === 'rejected';
    if (actionType === 'verified') confirmMsg = `APPROVE ${user.firstName} and send confirmation email?`;
    else if (actionType === 'rejected') confirmMsg = `REJECT ${user.firstName}?`;
    else confirmMsg = `RESTORE ${user.firstName} to Pending?`;

    requestConfirm(
        actionType === 'verified' ? "Approve User" : actionType === 'rejected' ? "Reject User" : "Restore User",
        confirmMsg,
        async () => {
            try {
                await updateDoc(doc(db, collectionName, user.id), { 
                  status: actionType, 
                  verificationStatus: actionType, 
                  verificationDate: new Date().toISOString(),
                  isVerified: isApprove 
                });

                if (isApprove && user.email) {
                  await addDoc(collection(db, "mail"), {
                    to: user.email,
                    message: {
                      subject: "Account Verified - Welcome to Livelimatch!",
                      html: `
                        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
                            <div style="background-color: #2563eb; padding: 24px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px;">LIVELI<span style="color: #93c5fd;">MATCH</span></h1>
                            </div>
                            <div style="padding: 32px; background-color: #ffffff; color: #334155; line-height: 1.6;">
                                <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Congratulations ${user.firstName}!</h2>
                                <p>Your residency in Brgy. Cawayan Bogtong has been successfully verified.</p>
                                
                                <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                                    <p style="margin: 0; color: #166534;"><strong>Account Status: <span style="color: #16a34a;">VERIFIED & ACTIVE</span></strong></p>
                                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #15803d;">You now have full access to explore opportunities and connect with the community.</p>
                                </div>
        
                                <p><strong>Next Steps:</strong></p>
                                <ul style="padding-left: 20px; color: #475569;">
                                    <li style="margin-bottom: 8px;">Log in to your account using your registered credentials.</li>
                                    <li style="margin-bottom: 8px;">Complete your profile to stand out.</li>
                                    <li>Start exploring localized jobs or posting opportunities.</li>
                                </ul>
                                
                                <div style="text-align: center; margin: 32px 0;">
                                    <a href="https://livelimatch-portal.web.app/login" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; text-transform: uppercase; font-size: 14px; letter-spacing: 1px;">Access Dashboard</a>
                                </div>
        
                                <p style="margin-bottom: 0;">Welcome aboard,<br><strong style="color: #2563eb;">The Livelimatch Admin Team</strong></p>
                            </div>
                            <div style="background-color: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 12px;">
                                <p style="margin: 0;">© ${new Date().getFullYear()} Barangay Cawayan Bogtong Livelihood Portal. All rights reserved.</p>
                            </div>
                        </div>
                      `
                    }
                  });
                  showToast(`Success! User approved and welcome email sent to ${user.email}.`, "success");
                } else if (isApprove && !user.email) {
                  showToast(`User approved, but no email was found on file to send a notification.`, "info");
                } else if (!isApprove) {
                  showToast(`User successfully ${actionType}.`, "success");
                }

            } catch (err) { showToast("Error: " + err.message, "error"); }
        },
        isDestructive,
        actionType === 'verified' ? "Approve" : actionType === 'rejected' ? "Reject" : "Restore"
    );
  };

  const handleDeleteJob = (jobId) => {
    requestConfirm("Delete Job", "Permanently delete this job?", async () => {
        try {
            await deleteDoc(doc(db, "jobs", jobId));
            showToast("Job successfully deleted.", "success");
        } catch(err) { showToast("Error deleting job.", "error"); }
    }, true, "Delete");
  };

  const handleDeleteAnnouncement = (annId) => {
    requestConfirm("Delete Announcement", "Are you sure you want to delete this announcement?", async () => {
        try {
            await deleteDoc(doc(db, "announcements", annId));
            showToast("Announcement deleted.", "success");
        } catch(err) { showToast("Error deleting: " + err.message, "error"); }
    }, true, "Delete");
  };

  const handleArchiveTicket = async (ticketId) => {
      try {
          await updateDoc(doc(db, "support_tickets", ticketId), { 
              status: 'archived', 
              lastUpdated: serverTimestamp() 
          });
          if (selectedTicket && selectedTicket.id === ticketId) {
              setSelectedTicket(null);
          }
          showToast("Ticket archived successfully.", "success");
      } catch(err) {
          showToast("Error archiving ticket: " + err.message, "error");
      }
  };

  // --- ANNOUNCEMENT MEDIA LOGIC ---
  const handleAnnounceFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (announceFiles.length + selected.length > 3) {
      showToast("You can only upload a maximum of 3 files.", "error");
      return;
    }
    setAnnounceFiles([...announceFiles, ...selected]);
  };

  const removeAnnounceFile = (index) => {
    setAnnounceFiles(announceFiles.filter((_, i) => i !== index));
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    setIsPostingAnn(true);
    try {
        const uploadedUrls = [];
        
        for (let i = 0; i < announceFiles.length; i++) {
            const file = announceFiles[i];
            const fileExtension = file.name.split('.').pop();
            const uniqueName = `announcements/${Date.now()}_${i}.${fileExtension}`;
            const fileRef = ref(storage, uniqueName);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            uploadedUrls.push({ url, type: file.type, name: file.name });
        }

        await addDoc(collection(db, "announcements"), {
            title: announceTitle,
            body: announceBody,
            media: uploadedUrls,
            date: new Date().toLocaleDateString(),
            createdAt: serverTimestamp(),
            author: "Admin"
        });
        
        setAnnounceTitle("");
        setAnnounceBody("");
        setAnnounceFiles([]);
        showToast("Announcement Posted!", "success");
    } catch (err) {
        showToast("Error posting announcement: " + err.message, "error");
    }
    setIsPostingAnn(false);
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

        if (selectedTicket.userId === "guest" && selectedTicket.guestEmail) {
            await addDoc(collection(db, "mail"), {
                to: selectedTicket.guestEmail,
                message: {
                    subject: `Re: Your Support Inquiry (Livelimatch Request #${selectedTicket.ticketId || selectedTicket.id.slice(0,6).toUpperCase()})`,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                            <h2>Response from Livelimatch Admin</h2>
                            <p>Hello,</p>
                            <p>You recently contacted us regarding Request #${selectedTicket.ticketId || selectedTicket.id.slice(0,6).toUpperCase()}:</p>
                            <blockquote style="background: #f8fafc; border-left: 4px solid #cbd5e1; padding: 12px; margin-bottom: 20px;">
                                <em>"${selectedTicket.messages[0]?.text || ""}"</em>
                            </blockquote>
                            <p><strong>Admin Reply:</strong></p>
                            <p style="font-size: 16px; color: #2563eb; font-weight: bold;">${replyText}</p>
                            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
                            <p style="font-size: 12px; color: #666;">If you have further questions, please submit a new ticket on our website.</p>
                        </div>
                    `
                }
            });
        }

        setReplyText("");
    } catch (err) {
        console.error("Error replying:", err);
        showToast("Error replying: " + err.message, "error");
    }
  };

  // --- STATS LOGIC ---
  const verifiedApplicants = applicants.filter(u => u.status === 'verified' || u.verificationStatus === 'verified').length;
  const verifiedEmployers = employers.filter(e => e.status === 'verified' || e.verificationStatus === 'verified').length;

  const pendingAppCount = applicants.filter(u => u.status === 'pending' || u.verificationStatus === 'pending' || (!u.status && !u.verificationStatus)).length;
  const pendingEmpCount = employers.filter(e => e.status === 'pending' || e.verificationStatus === 'pending' || (!e.status && !e.verificationStatus)).length;
  const openTicketCount = tickets.filter(t => t.status !== 'closed' && t.status !== 'archived').length;

  const stats = {
    verifiedApplicants,
    verifiedEmployers,
    activeJobs: jobs.length,
    totalPending: pendingVerifications.length,
    cawayanResidents: "3,176"
  };

  const vApps = Number(stats.verifiedApplicants || 0);
  const vEmps = Number(stats.verifiedEmployers || 0);
  const maxChartVal = Math.max(vApps, vEmps, 1);
  const applicantHeight = (vApps / maxChartVal) * 100;
  const employerHeight = (vEmps / maxChartVal) * 100;

  // --- STYLES ---
  const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${darkMode 
    ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]' 
    : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]'}`;
  
  const glassCard = `backdrop-blur-md border rounded-2xl transition-all duration-300 group hover:-translate-y-1 ${darkMode
    ? 'bg-slate-800/40 border-white/5 hover:bg-slate-800/60 hover:border-blue-500/30'
    : 'bg-white/40 border-white/60 hover:bg-white/70 hover:border-blue-300/50 hover:shadow-lg'}`;

  const glassInput = `w-full flex-1 bg-transparent outline-none font-bold text-xs ${darkMode ? 'text-white placeholder-slate-400' : 'text-slate-800 placeholder-slate-500'}`;

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
                    <h1 className={`font-black text-lg tracking-tight leading-none ${darkMode ? 'text-white' : 'text-slate-800'}`}>LIVELI<br/><span className="text-blue-500">MATCH</span></h1>
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
            
            <p className={`px-4 text-[10px] font-black uppercase tracking-widest opacity-50 mb-2 transition-all ${!isSidebarOpen && 'lg:hidden'} ${darkMode ? 'text-white' : 'text-slate-800'}`}>Database</p>
            
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
                className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all duration-300 ${darkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-slate-800'} ${!isSidebarOpen && 'lg:justify-center'}`}
            >
                {darkMode ? <SunIcon className="w-6 h-6 text-amber-400"/> : <MoonIcon className="w-6 h-6 text-slate-600"/>}
                {isSidebarOpen && <span className="text-xs font-bold">Switch Theme</span>}
             </button>

             <button 
                onClick={async () => {
                    await signOut(auth);
                    navigate("/"); 
                }}
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
                    <p className={`text-[10px] font-bold uppercase tracking-widest opacity-50 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Admin Workspace</p>
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
                    <div className={`lg:col-span-2 p-6 lg:p-8 rounded-3xl ${glassPanel} flex flex-col justify-between`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                            <div className="flex items-center gap-3">
                                <ChartBarIcon className="w-6 h-6 text-purple-500"/>
                                <div>
                                    <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>Platform Engagement</h3>
                                    <p className={`text-[10px] opacity-50 uppercase font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                    {vApps} Applicants • {vEmps} Employers
                                    </p>
                                </div>
                            </div>
                            <div className={`flex gap-4 text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Applicants</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Employers</div>
                            </div>
                        </div>

                        <div className="flex h-40 lg:h-48 items-end gap-8 lg:gap-12 px-4 border-b border-gray-500/10 pb-2">
                            <div className="flex-1 flex flex-col justify-end group h-full">
                                <div className="flex flex-col justify-end h-full">
                                    <div className={`text-center font-bold text-lg mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{vApps}</div>
                                    <div style={{ height: `${applicantHeight}%`, minHeight: '4px' }} className={`w-full rounded-t-xl relative overflow-hidden transition-all duration-500 ${vApps > 0 ? 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)]' : 'bg-slate-200 dark:bg-slate-800 opacity-20'}`}></div>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col justify-end group h-full">
                                <div className="flex flex-col justify-end h-full">
                                    <div className={`text-center font-bold text-lg mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{vEmps}</div>
                                    <div style={{ height: `${employerHeight}%`, minHeight: '4px' }} className={`w-full rounded-t-xl relative overflow-hidden transition-all duration-500 ${vEmps > 0 ? 'bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'bg-slate-200 dark:bg-slate-800 opacity-20'}`}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`p-6 lg:p-8 rounded-3xl ${glassPanel} overflow-y-auto no-scrollbar max-h-[400px]`}>
                        <div className="flex items-center gap-3 mb-6">
                            <UsersIcon className="w-6 h-6 text-blue-500"/>
                            <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>Purok Breakdown</h3>
                        </div>
                        <div className="space-y-5">
                             {PUROK_LIST.map(purok => {
                                const count = [...applicants, ...employers].filter(u => (u.status === 'verified' || u.verificationStatus === 'verified') && u.sitio === purok).length;
                                const total = stats.verifiedApplicants + stats.verifiedEmployers || 1;
                                const percent = (count / total) * 100;
                                return (
                                    <div key={purok}>
                                        <div className={`flex justify-between text-xs font-bold mb-2 opacity-80 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
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
                    
                    <div className="p-4 border-b border-gray-500/10 space-y-4">
                        <div className="px-2">
                            <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>Support Inbox</h3>
                        </div>
                        
                        {/* --- SEARCH BAR & FILTER (Matches Discover Tab style) --- */}
                        <div className={`w-full flex items-center p-1.5 rounded-2xl border shadow-sm ${darkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white/60 border-slate-200 text-slate-800'}`}>
                            <MagnifyingGlassIcon className={`ml-3 w-5 h-5 shrink-0 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                            <input 
                                type="text" 
                                placeholder="Search Request #..." 
                                value={ticketSearch}
                                onChange={(e) => setTicketSearch(e.target.value)} 
                                className={`${glassInput} pl-3 pr-2 py-2.5`} 
                            />
                            
                            <div className={`w-px h-6 mx-1 shrink-0 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                            
                            <div className="relative shrink-0 pr-1">
                                <button 
                                    onClick={() => setIsTicketDropdownOpen(!isTicketDropdownOpen)} 
                                    className={`p-2 md:px-4 md:py-2 flex items-center gap-2 rounded-xl transition-colors relative ${darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'} ${ticketFilter !== 'active' ? (darkMode ? 'text-blue-400' : 'text-blue-600') : 'text-slate-400'}`}
                                >
                                    <FunnelIcon className="w-5 h-5 shrink-0" />
                                    <span className="hidden md:block text-xs font-bold whitespace-nowrap">
                                        {ticketFilter === 'active' ? "Active Tickets" : ticketFilter === 'open' ? "Open Only" : ticketFilter === 'closed' ? "Closed Only" : "Archived"}
                                    </span>
                                    {ticketFilter !== 'active' && <span className={`absolute top-1.5 right-1.5 md:right-2 w-2 h-2 rounded-full border ${darkMode ? 'bg-red-500 border-slate-900' : 'bg-red-500 border-white'}`}></span>}
                                </button>

                                {isTicketDropdownOpen && (
                                    <div className={`absolute top-full right-0 mt-3 w-48 z-[60] rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                        <div className="max-h-60 overflow-y-auto p-2 space-y-1.5 hide-scrollbar">
                                            
                                            <button onClick={() => { setTicketFilter("active"); setIsTicketDropdownOpen(false); }} className={`relative w-full text-left p-3 rounded-xl transition-all duration-300 group border ${ticketFilter === 'active' ? (darkMode ? 'bg-blue-400/10 border-blue-400 text-blue-400' : 'bg-blue-50 border-blue-600 text-blue-600') : `border-transparent ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}`}>
                                                <span className={`text-xs font-black block transition-colors ${ticketFilter === 'active' ? (darkMode ? 'text-blue-400' : 'text-blue-600') : darkMode ? 'text-white group-hover:text-blue-400' : 'text-slate-700 group-hover:text-blue-600'}`}>Active (Open & Closed)</span>
                                            </button>
                                            
                                            <button onClick={() => { setTicketFilter("open"); setIsTicketDropdownOpen(false); }} className={`relative w-full text-left p-3 rounded-xl transition-all duration-300 group border ${ticketFilter === 'open' ? (darkMode ? 'bg-orange-400/10 border-orange-400 text-orange-400' : 'bg-orange-50 border-orange-600 text-orange-600') : `border-transparent ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}`}>
                                                <span className={`text-xs font-black block transition-colors ${ticketFilter === 'open' ? (darkMode ? 'text-orange-400' : 'text-orange-600') : darkMode ? 'text-white group-hover:text-orange-400' : 'text-slate-700 group-hover:text-orange-600'}`}>Open Only</span>
                                            </button>

                                            <button onClick={() => { setTicketFilter("closed"); setIsTicketDropdownOpen(false); }} className={`relative w-full text-left p-3 rounded-xl transition-all duration-300 group border ${ticketFilter === 'closed' ? (darkMode ? 'bg-emerald-400/10 border-emerald-400 text-emerald-400' : 'bg-emerald-50 border-emerald-600 text-emerald-600') : `border-transparent ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}`}>
                                                <span className={`text-xs font-black block transition-colors ${ticketFilter === 'closed' ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') : darkMode ? 'text-white group-hover:text-emerald-400' : 'text-slate-700 group-hover:text-emerald-600'}`}>Closed Only</span>
                                            </button>

                                            <button onClick={() => { setTicketFilter("archived"); setIsTicketDropdownOpen(false); }} className={`relative w-full text-left p-3 rounded-xl transition-all duration-300 group border ${ticketFilter === 'archived' ? (darkMode ? 'bg-slate-500/20 border-slate-500 text-slate-300' : 'bg-slate-100 border-slate-400 text-slate-600') : `border-transparent ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}`}>
                                                <span className={`text-xs font-black block transition-colors ${ticketFilter === 'archived' ? (darkMode ? 'text-slate-300' : 'text-slate-600') : darkMode ? 'text-white group-hover:text-slate-400' : 'text-slate-700 group-hover:text-slate-500'}`}>Archived</span>
                                            </button>

                                        </div>
                                    </div>
                                )}
                                {isTicketDropdownOpen && <div className="fixed inset-0 z-[50]" onClick={() => setIsTicketDropdownOpen(false)}></div>}
                            </div>
                        </div>

                    </div>
                    
                    {filteredTickets.length === 0 ? (
                        <div className={`flex-1 flex flex-col items-center justify-center opacity-40 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                             <ChatBubbleLeftRightIcon className="w-12 h-12 mb-2"/>
                             <p className="text-sm font-bold">No tickets found</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2">
                            {filteredTickets.map(t => {
                                const reqNum = `Request #${t.ticketId || t.id.slice(0, 6).toUpperCase()}`;
                                return (
                                    <div 
                                        key={t.id} 
                                        onClick={() => setSelectedTicket(t)}
                                        className={`p-4 rounded-xl cursor-pointer transition-all border group relative ${selectedTicket?.id === t.id ? 'bg-blue-500/10 border-blue-500' : `border-transparent hover:bg-black/5 dark:hover:bg-white/5`}`}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className={`font-black text-sm tracking-wide ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                                {reqNum}
                                            </h4>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${t.status === 'closed' ? 'bg-emerald-500/20 text-emerald-500' : t.status === 'archived' ? 'bg-slate-500/20 text-slate-500' : 'bg-orange-500/20 text-orange-500'}`}>
                                                {t.status || 'open'}
                                            </span>
                                        </div>
                                        <p className={`text-xs opacity-60 truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                            {t.messages && t.messages.length > 0 ? t.messages[t.messages.length - 1].text : 'No messages'}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* CHAT AREA */}
                <div className={`lg:col-span-2 rounded-3xl overflow-hidden flex flex-col ${glassPanel} relative`}>
                    {selectedTicket ? (
                        <>
                            <div className="p-4 border-b border-gray-500/10 flex justify-between items-center bg-white/5 backdrop-blur-sm z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                                        <DocumentIcon className="w-5 h-5"/>
                                    </div>
                                    <div>
                                        <h4 className={`font-black tracking-wide ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                            Request #{selectedTicket.ticketId || selectedTicket.id.slice(0, 6).toUpperCase()}
                                        </h4>
                                        {selectedTicket.guestEmail && (
                                            <p className={`text-[10px] opacity-60 font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                                {selectedTicket.guestEmail}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* ARCHIVE BUTTON: Only show if ticket is closed */}
                                    {selectedTicket.status === 'closed' && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleArchiveTicket(selectedTicket.id);
                                            }}
                                            className="px-3 py-1.5 bg-slate-500/10 text-slate-500 hover:bg-slate-500 hover:text-white rounded-lg transition-all shadow-sm font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5"
                                            title="Archive Ticket"
                                        >
                                            <ArchiveBoxIcon className="w-4 h-4"/> Archive
                                        </button>
                                    )}

                                    <button onClick={()=>setSelectedTicket(null)} className={`lg:hidden p-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}><XMarkIcon className="w-6 h-6"/></button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                                {selectedTicket.messages && selectedTicket.messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${msg.sender === 'admin' 
                                            ? 'bg-blue-600 text-white rounded-tr-sm shadow-blue-500/20 shadow-lg' 
                                            : `rounded-tl-sm ${darkMode ? 'bg-white/10 text-white' : 'bg-white/60 text-slate-800 shadow-sm border border-black/5'}`}`}>
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
                                        disabled={selectedTicket.status === 'archived'}
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder={selectedTicket.status === 'archived' ? "This ticket is archived." : "Type your reply..."}
                                        className={`flex-1 p-3 rounded-xl border-none outline-none text-sm font-medium disabled:opacity-50 ${darkMode ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-white text-slate-800 shadow-inner'}`}
                                    />
                                    <button disabled={selectedTicket.status === 'archived'} type="submit" className="p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50">
                                        <PaperAirplaneIcon className="w-5 h-5"/>
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className={`flex-1 flex flex-col items-center justify-center opacity-30 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                            <ChatBubbleLeftRightIcon className="w-24 h-24 mb-4"/>
                            <p className="font-bold text-lg">Select a ticket to view details</p>
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
                            <label className={`text-xs font-bold uppercase opacity-50 ml-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Title</label>
                            <input 
                                value={announceTitle}
                                onChange={(e)=>setAnnounceTitle(e.target.value)}
                                required
                                className={`w-full p-4 rounded-xl mt-1 border outline-none font-bold ${darkMode ? 'bg-slate-800/50 border-white/10 focus:border-pink-500 text-white' : 'bg-white/50 border-white/40 focus:border-pink-500 text-slate-800'}`} 
                                placeholder="What's happening?"
                            />
                        </div>
                        <div>
                            <label className={`text-xs font-bold uppercase opacity-50 ml-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Details</label>
                            <textarea 
                                value={announceBody}
                                onChange={(e)=>setAnnounceBody(e.target.value)}
                                required
                                rows="6"
                                className={`w-full p-4 rounded-xl mt-1 border outline-none text-sm ${darkMode ? 'bg-slate-800/50 border-white/10 focus:border-pink-500 text-white' : 'bg-white/50 border-white/40 focus:border-pink-500 text-slate-800'}`} 
                                placeholder="Type your announcement here..."
                            ></textarea>
                        </div>
                        
                        {/* MULTIPLE MEDIA UPLOAD */}
                        <div className={`p-3 rounded-xl border ${darkMode ? 'border-white/10 bg-slate-800/50' : 'border-black/5 bg-white/50'}`}>
                            <label className={`flex justify-between items-center text-xs font-bold uppercase opacity-60 mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                <span>Attach Media (Optional)</span>
                                <span>{announceFiles.length}/3</span>
                            </label>
                            <input 
                                type="file" 
                                accept="image/*,video/*,application/pdf"
                                multiple
                                onChange={handleAnnounceFileChange}
                                className={`w-full text-xs outline-none transition-all font-medium 
                                ${darkMode ? 'text-slate-300' : 'text-slate-700'}
                                file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:transition-colors file:cursor-pointer
                                ${darkMode ? 'file:bg-pink-500/20 file:text-pink-400 hover:file:bg-pink-500/30' : 'file:bg-pink-100 file:text-pink-600 hover:file:bg-pink-200'}`} 
                            />
                            {announceFiles.length > 0 && (
                                <div className="mt-2 space-y-1.5">
                                    {announceFiles.map((f, i) => (
                                        <div key={i} className={`flex justify-between items-center px-3 py-2 rounded-lg border ${darkMode ? 'border-white/10 bg-black/20 text-slate-300' : 'border-black/5 bg-white text-slate-600'}`}>
                                            <span className="text-[10px] font-bold truncate pr-4">{f.name}</span>
                                            <button type="button" onClick={()=>removeAnnounceFile(i)} className="text-red-400 hover:text-red-600"><XMarkIcon className="w-4 h-4"/></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button disabled={isPostingAnn} type="submit" className="w-full py-3 rounded-xl bg-pink-500 text-white font-black uppercase tracking-widest shadow-lg shadow-pink-500/30 hover:bg-pink-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                            {isPostingAnn ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><PaperAirplaneIcon className="w-5 h-5"/> Post</>}
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <h3 className={`font-bold text-xl px-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Recent Announcements</h3>
                    {announcements.length === 0 ? (
                        <div className={`p-12 rounded-3xl border-dashed border-2 flex flex-col items-center justify-center ${darkMode ? 'border-white/10' : 'border-black/5'}`}>
                            <MegaphoneIcon className={`w-12 h-12 mb-2 ${darkMode ? 'text-white opacity-20' : 'text-black opacity-20'}`}/>
                            <p className={`font-bold ${darkMode ? 'text-white opacity-40' : 'text-black opacity-40'}`}>No announcements yet.</p>
                        </div>
                    ) : (
                        announcements.map(ann => (
                            <div key={ann.id} className={`p-6 rounded-2xl relative overflow-hidden group ${glassCard}`}>
                                <div className="absolute top-0 left-0 w-1 h-full bg-pink-500"></div>
                                <div className="flex justify-between items-start mb-2 pl-2">
                                    <div className="flex-1 pr-4">
                                        <h4 className={`font-black text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>{ann.title}</h4>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-bold opacity-40 uppercase px-2 py-1 rounded ${darkMode ? 'bg-white/5 text-white' : 'bg-black/5 text-slate-800'}`}>{ann.date}</span>
                                        <button 
                                            onClick={() => handleDeleteAnnouncement(ann.id)}
                                            className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                            title="Delete Announcement"
                                        >
                                            <TrashIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                </div>
                                <p className={`text-sm opacity-70 pl-2 leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-white' : 'text-slate-800'}`}>{ann.body}</p>
                                
                                {/* ATTACHMENTS VIEW */}
                                {ann.media && ann.media.length > 0 && (
                                    <div className="mt-4 pl-2 flex gap-3 overflow-x-auto no-scrollbar pb-2">
                                        {ann.media.map((file, i) => (
                                            <div 
                                                key={i} 
                                                onClick={() => setSelectedProof([file.url])} 
                                                className={`shrink-0 w-24 h-24 rounded-xl overflow-hidden cursor-pointer relative group border ${darkMode ? 'border-white/10 bg-slate-800' : 'border-black/5 bg-slate-100'}`}
                                            >
                                                {file.type.startsWith('image/') ? (
                                                    <img src={file.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                                ) : file.type.startsWith('video/') ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-blue-500 bg-blue-500/10">
                                                        <span className="text-2xl">▶</span>
                                                        <span className="text-[8px] font-black uppercase mt-1">Video</span>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-rose-500 bg-rose-500/10 p-2 text-center">
                                                        <DocumentIcon className="w-6 h-6 mb-1"/>
                                                        <span className="text-[8px] font-black uppercase line-clamp-2">PDF/Doc</span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <EyeIcon className="w-6 h-6 text-white"/>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
             </div>
        )}

        {/* TAB CONTENT: VERIFICATIONS */}
        {activeTab === "Verifications" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className={`flex gap-4 border-b pb-2 ${darkMode ? 'border-white/10' : 'border-black/10'}`}>
                    <button onClick={()=>setVerificationSubTab("pending")} className={`text-sm font-black uppercase tracking-widest pb-2 transition-all ${verificationSubTab === "pending" ? 'text-blue-500 border-b-2 border-blue-500' : `opacity-40 hover:opacity-100 ${darkMode ? 'text-white' : 'text-slate-800'}`}`}>Pending Requests ({pendingVerifications.length})</button>
                    <button onClick={()=>setVerificationSubTab("rejected")} className={`text-sm font-black uppercase tracking-widest pb-2 transition-all ${verificationSubTab === "rejected" ? 'text-red-500 border-b-2 border-red-500' : `opacity-40 hover:opacity-100 ${darkMode ? 'text-white' : 'text-slate-800'}`}`}>Rejected History ({rejectedUsers.length})</button>
                </div>

                {/* --- SEARCH BAR & FILTER (Matches Discover Tab style) --- */}
                <div className={`w-full flex items-center p-1.5 rounded-2xl border shadow-sm ${darkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white/60 border-slate-200 text-slate-800'}`}>
                    <MagnifyingGlassIcon className={`ml-3 w-5 h-5 shrink-0 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <input 
                        type="text" 
                        placeholder="Search name..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className={`${glassInput} pl-3 pr-2 py-2.5`} 
                    />
                    
                    <div className={`w-px h-6 mx-1 shrink-0 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    
                    <div className="relative shrink-0 pr-1">
                        <button 
                            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)} 
                            className={`p-2 md:px-4 md:py-2 flex items-center gap-2 rounded-xl transition-colors relative ${darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'} ${userTypeFilter ? (darkMode ? 'text-blue-400' : 'text-blue-600') : 'text-slate-400'}`}
                        >
                            <UsersIcon className="w-5 h-5 shrink-0" />
                            <span className="hidden md:block text-xs font-bold whitespace-nowrap">
                                {userTypeFilter === 'applicant' ? 'Applicants' : userTypeFilter === 'employer' ? 'Employers' : 'All Users'}
                            </span>
                            {userTypeFilter && <span className={`absolute top-1.5 right-1.5 md:right-2 w-2 h-2 rounded-full border ${darkMode ? 'bg-red-500 border-slate-900' : 'bg-red-500 border-white'}`}></span>}
                        </button>

                        {isFilterDropdownOpen && (
                            <div className={`absolute top-full right-0 mt-3 w-48 z-[60] rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                <div className="max-h-60 overflow-y-auto p-2 space-y-1.5 hide-scrollbar">
                                    <button onClick={() => { setUserTypeFilter(""); setIsFilterDropdownOpen(false); }} className={`relative w-full text-left p-3 rounded-xl transition-all duration-300 group border ${!userTypeFilter ? (darkMode ? 'bg-blue-400/10 border-blue-400 text-blue-400' : 'bg-blue-50 border-blue-600 text-blue-600') : `border-transparent ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}`}>
                                        <span className={`text-xs font-black block transition-colors ${!userTypeFilter ? (darkMode ? 'text-blue-400' : 'text-blue-600') : darkMode ? 'text-white group-hover:text-blue-400' : 'text-slate-700 group-hover:text-blue-600'}`}>All Users</span>
                                    </button>
                                    <button onClick={() => { setUserTypeFilter("applicant"); setIsFilterDropdownOpen(false); }} className={`relative w-full text-left p-3 rounded-xl transition-all duration-300 group border ${userTypeFilter === 'applicant' ? (darkMode ? 'bg-blue-400/10 border-blue-400 text-blue-400' : 'bg-blue-50 border-blue-600 text-blue-600') : `border-transparent ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}`}>
                                        <span className={`text-xs font-black block transition-colors ${userTypeFilter === 'applicant' ? (darkMode ? 'text-blue-400' : 'text-blue-600') : darkMode ? 'text-white group-hover:text-blue-400' : 'text-slate-700 group-hover:text-blue-600'}`}>Applicants Only</span>
                                    </button>
                                    <button onClick={() => { setUserTypeFilter("employer"); setIsFilterDropdownOpen(false); }} className={`relative w-full text-left p-3 rounded-xl transition-all duration-300 group border ${userTypeFilter === 'employer' ? (darkMode ? 'bg-blue-400/10 border-blue-400 text-blue-400' : 'bg-blue-50 border-blue-600 text-blue-600') : `border-transparent ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}`}>
                                        <span className={`text-xs font-black block transition-colors ${userTypeFilter === 'employer' ? (darkMode ? 'text-blue-400' : 'text-blue-600') : darkMode ? 'text-white group-hover:text-blue-400' : 'text-slate-700 group-hover:text-blue-600'}`}>Employers Only</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        {isFilterDropdownOpen && <div className="fixed inset-0 z-[50]" onClick={() => setIsFilterDropdownOpen(false)}></div>}
                    </div>
                </div>

                {verificationSubTab === "pending" ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
                        {filteredPending.length === 0 && (
                            <div className={`col-span-full py-20 flex flex-col items-center justify-center rounded-3xl ${glassPanel} border-dashed`}>
                                <ShieldCheckIcon className="w-16 h-16 text-emerald-500 mb-4 opacity-50"/>
                                <p className={`font-bold opacity-50 ${darkMode ? 'text-white' : 'text-slate-800'}`}>All Clear! No pending requests.</p>
                            </div>
                        )}
                        {filteredPending.map(user => (
                            <div key={user.id} className={`p-4 md:p-6 ${glassCard} relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className={`w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 shadow-md shrink-0 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                        {user.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover"/> : <div className={`w-full h-full flex items-center justify-center font-black opacity-30 text-xl ${darkMode ? 'text-white' : 'text-slate-800'}`}>?</div>}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className={`font-bold text-sm truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{user.firstName} {user.lastName}</h4>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${user.type === 'employer' ? 'text-purple-500 border-purple-500/30 bg-purple-500/10' : 'text-blue-500 border-blue-500/30 bg-blue-500/10'}`}>{user.type}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium opacity-70">
                                            <span className={`flex items-center gap-1 text-blue-600 dark:text-blue-400`}><EnvelopeIcon className="w-3 h-3"/> {user.email || "No Email"}</span>
                                            <span className={`flex items-center gap-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}><MapPinIcon className="w-3 h-3"/> {user.sitio || "No address"}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <button 
                                        onClick={() => {
                                            const files = user.proofOfResidencyUrls?.length 
                                                ? user.proofOfResidencyUrls 
                                                : (user.proofOfResidencyUrl || user.residencyProofUrl || user.businessPermitUrl ? [user.proofOfResidencyUrl || user.residencyProofUrl || user.businessPermitUrl] : []);
                                            setSelectedProof(files);
                                        }} 
                                        className={`p-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold border transition-all w-full md:w-auto ${darkMode ? 'border-white/10 hover:bg-white/5 text-white' : 'border-black/10 hover:bg-black/5 text-slate-800'}`}
                                    >
                                        <EyeIcon className="w-4 h-4"/> Files
                                    </button>
                                    <button onClick={() => handleVerifyUser(user, 'rejected')} className="p-2 px-3 rounded-xl border border-red-500/30 text-red-500 font-bold text-xs uppercase hover:bg-red-500/10 transition-colors w-full md:w-auto text-center justify-center flex">Reject</button>
                                    <button onClick={() => handleVerifyUser(user, 'verified')} className="p-2 px-4 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-colors w-full md:w-auto text-center justify-center flex">Approve</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
                        {filteredRejected.length === 0 && (
                             <div className={`col-span-full py-20 flex flex-col items-center justify-center rounded-3xl ${glassPanel} border-dashed`}>
                                <TrashIcon className="w-16 h-16 text-slate-400 mb-4 opacity-30"/>
                                <p className={`font-bold opacity-50 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Trash is empty.</p>
                            </div>
                        )}
                        {filteredRejected.map(user => (
                            <div key={user.id} className={`p-4 md:p-6 ${glassCard} relative overflow-hidden opacity-75 hover:opacity-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
                                 <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className={`w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 shadow-md shrink-0 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                        {user.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover"/> : <div className={`w-full h-full flex items-center justify-center font-black opacity-30 text-xl ${darkMode ? 'text-white' : 'text-slate-800'}`}>?</div>}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className={`font-bold text-sm truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{user.firstName} {user.lastName}</h4>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${user.type === 'employer' ? 'text-purple-500 border-purple-500/30 bg-purple-500/10' : 'text-blue-500 border-blue-500/30 bg-blue-500/10'}`}>{user.type}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold uppercase bg-red-500 text-white px-2 py-0.5 rounded">Rejected</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => handleVerifyUser(user, 'pending')} className="w-full md:w-auto py-2 px-4 rounded-xl border border-blue-500/30 text-blue-500 hover:bg-blue-500 hover:text-white transition-all font-bold text-xs uppercase flex items-center justify-center gap-2">
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
                
                {/* --- SEARCH BAR & FILTER (Matches Discover Tab style) --- */}
                <div className={`w-full flex items-center p-1.5 rounded-2xl border shadow-sm ${darkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white/60 border-slate-200 text-slate-800'}`}>
                    <MagnifyingGlassIcon className={`ml-3 w-5 h-5 shrink-0 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <input 
                        type="text" 
                        placeholder={`Search in ${activeTab}...`} 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className={`${glassInput} pl-3 pr-2 py-2.5`} 
                    />
                    
                    {activeTab !== "Jobs" && (
                        <>
                            <div className={`w-px h-6 mx-1 shrink-0 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                            <div className="relative shrink-0 pr-1">
                                <button 
                                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)} 
                                    className={`p-2 md:px-4 md:py-2 flex items-center gap-2 rounded-xl transition-colors relative ${darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'} ${sitioFilter ? (darkMode ? 'text-blue-400' : 'text-blue-600') : 'text-slate-400'}`}
                                >
                                    <MapPinIcon className="w-5 h-5 shrink-0" />
                                    <span className="hidden md:block text-xs font-bold whitespace-nowrap">{sitioFilter || "All Locations"}</span>
                                    {sitioFilter && <span className={`absolute top-1.5 right-1.5 md:right-2 w-2 h-2 rounded-full border ${darkMode ? 'bg-red-500 border-slate-900' : 'bg-red-500 border-white'}`}></span>}
                                </button>

                                {isFilterDropdownOpen && (
                                    <div className={`absolute top-full right-0 mt-3 w-56 z-[60] rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                        <div className="max-h-60 overflow-y-auto p-2 space-y-1 hide-scrollbar">
                                            <button onClick={() => { setSitioFilter(""); setIsFilterDropdownOpen(false); }} className={`w-full text-left p-3 rounded-xl transition-colors ${!sitioFilter ? (darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600') : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-50'}`}>
                                                <span className="text-xs font-bold block">All Locations</span>
                                            </button>
                                            {PUROK_LIST.map(p => (
                                                <button key={p} onClick={() => { setSitioFilter(p); setIsFilterDropdownOpen(false); }} className={`w-full text-left p-3 rounded-xl transition-colors ${sitioFilter === p ? (darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600') : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-50'}`}>
                                                    <span className="text-xs font-bold block">{p}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {isFilterDropdownOpen && <div className="fixed inset-0 z-[50]" onClick={() => setIsFilterDropdownOpen(false)}></div>}
                            </div>
                        </>
                    )}

                    {activeTab === "Jobs" && (
                        <>
                            <div className={`w-px h-6 mx-1 shrink-0 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                            <div className="relative shrink-0 pr-1">
                                <button 
                                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)} 
                                    className={`p-2 md:px-4 md:py-2 flex items-center gap-2 rounded-xl transition-colors relative ${darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'} ${categoryFilter ? (darkMode ? 'text-blue-400' : 'text-blue-600') : 'text-slate-400'}`}
                                >
                                    {(() => {
                                        const ActiveIcon = categoryFilter ? getCatStyles(categoryFilter).icon : TagIcon;
                                        return <ActiveIcon className="w-5 h-5 shrink-0" />;
                                    })()}
                                    <span className="hidden md:block text-xs font-bold whitespace-nowrap">
                                        {categoryFilter ? (JOB_CATEGORIES.find(c => c.id === categoryFilter)?.label || categoryFilter) : "All Categories"}
                                    </span>
                                    {categoryFilter && <span className={`absolute top-1.5 right-1.5 md:right-2 w-2 h-2 rounded-full border ${darkMode ? 'bg-red-500 border-slate-900' : 'bg-red-500 border-white'}`}></span>}
                                </button>

                                {isFilterDropdownOpen && (
                                    <div className={`absolute top-full right-0 mt-3 w-64 z-[60] rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                        <div className="max-h-60 overflow-y-auto p-2 space-y-1.5 hide-scrollbar">
                                            <button onClick={() => { setCategoryFilter(""); setIsFilterDropdownOpen(false); }} className={`relative overflow-hidden w-full text-left p-3 rounded-xl transition-all duration-300 group border backdrop-blur-sm ${!categoryFilter ? (darkMode ? 'bg-blue-400/10 border-blue-400 text-blue-400' : 'bg-blue-50 border-blue-600 text-blue-600') : `border-transparent ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}`}>
                                                <div className="flex items-center gap-3 relative z-10">
                                                    <TagIcon className={`w-5 h-5 transition-colors ${!categoryFilter ? (darkMode ? 'text-blue-400' : 'text-blue-600') : 'text-slate-400'}`} />
                                                    <span className={`text-xs font-black block transition-colors ${!categoryFilter ? (darkMode ? 'text-blue-400' : 'text-blue-600') : darkMode ? 'text-white group-hover:text-blue-400' : 'text-slate-700 group-hover:text-blue-600'}`}>All Categories</span>
                                                </div>
                                            </button>
                                            
                                            {JOB_CATEGORIES.map(c => {
                                                const catStyle = getCatStyles(c.id);
                                                const CatIcon = catStyle.icon;
                                                const isSelected = categoryFilter === c.id;
                                                // Dynamic active/hover states based on darkmode logic
                                                const activeClass = darkMode ? 'bg-blue-400/10 border-blue-400' : 'bg-blue-10/10 border-blue-600';
                                                const hoverClass = darkMode ? 'hover:border-blue-400/50 hover:bg-slate-800' : 'hover:border-blue-600/50 hover:bg-slate-50';
                                                const textClass = isSelected ? (darkMode ? 'text-blue-400' : 'text-blue-600') : (darkMode ? 'text-white group-hover:text-blue-400' : 'text-slate-700 group-hover:text-blue-600');
                                                const iconClass = isSelected ? (darkMode ? 'text-blue-400' : 'text-blue-600') : 'text-slate-400 group-hover:text-blue-400';

                                                return (
                                                    <button key={c.id} onClick={() => { setCategoryFilter(c.id); setIsFilterDropdownOpen(false); }} className={`relative overflow-hidden w-full text-left p-3 rounded-xl transition-all duration-300 group border backdrop-blur-sm ${isSelected ? activeClass : `border-transparent ${hoverClass}`}`}>
                                                        <div className="flex items-center gap-3 relative z-10">
                                                            <CatIcon className={`w-5 h-5 transition-colors ${iconClass}`} />
                                                            <div className="flex flex-col">
                                                                <span className={`text-xs font-black block transition-colors ${textClass}`}>{c.label}</span>
                                                            </div>
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                                {isFilterDropdownOpen && <div className="fixed inset-0 z-[50]" onClick={() => setIsFilterDropdownOpen(false)}></div>}
                            </div>
                        </>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(activeTab === "Jobs" ? jobs : (activeTab === "Applicants" ? applicants : employers))
                        .filter(item => {
                            if(activeTab === "Jobs") {
                                const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
                                const matchesCat = categoryFilter ? item.category === categoryFilter : true;
                                return matchesSearch && matchesCat;
                            }
                            const matchesSearch = `${item.firstName} ${item.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
                            const isVerifiedUser = (item.status === 'verified' || item.verificationStatus === 'verified');
                            const matchesSitio = sitioFilter ? item.sitio === sitioFilter : true;
                            return isVerifiedUser && matchesSearch && matchesSitio;
                        })
                        .map(item => {
                            if (activeTab === "Jobs") {
                                const catStyle = getCatStyles(item.category);
                                const CatIcon = catStyle.icon;
                                const theme = getCardTheme(item.category, darkMode);
                                const typeStyle = getJobStyle(item.type);
                                const applicantCount = item.applicationCount || 0;
                                
                                return (
                                    <div key={item.id} className={`relative p-5 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 ${theme.hoverShadow} flex flex-col justify-between min-h-[260px] ${theme.cardBg} w-full`}>
                                        
                                        <div className={`absolute -right-4 bottom-0 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform duration-500 pointer-events-none ${theme.bgIcon}`}>
                                            <CatIcon className="w-40 h-40 md:w-48 md:h-48" />
                                        </div>

                                        <div className="relative z-10 flex flex-col h-full">
                                            <div className="flex justify-between items-start gap-4 mb-2">
                                                <h3 className={`font-black text-xl leading-tight line-clamp-2 pt-1 ${theme.title}`}>{item.title}</h3>
                                                <button onClick={() => handleDeleteJob(item.id)} className={`p-2 rounded-full transition-colors shrink-0 -mt-1 -mr-1 ${theme.saveIdle} hover:text-red-500 hover:bg-red-500/20 dark:hover:bg-red-500/20`} title="Delete Job">
                                                    <TrashIcon className="w-5 h-5"/>
                                                </button>
                                            </div>
                                            
                                            <div className={`flex items-center gap-1.5 mb-3 ${theme.location}`}>
                                                <MapPinIcon className="w-4 h-4 shrink-0" />
                                                <p className="text-[11px] font-bold uppercase tracking-wide opacity-80 truncate">{item.employerName} • {item.sitio || "No Location"}</p>
                                            </div>

                                            <p className={`text-xs mb-4 line-clamp-3 leading-relaxed ${theme.descText}`}>
                                                {item.description || "No description provided for this job."}
                                            </p>

                                            <div className="flex flex-wrap items-center gap-2 mb-6">
                                                {item.category && (
                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide flex items-center gap-1 shadow-sm ${theme.badge}`}>
                                                        <CatIcon className="w-3 h-3" />
                                                        {JOB_CATEGORIES.find(c => c.id === item.category)?.label || item.category}
                                                    </span>
                                                )}
                                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide flex items-center gap-1 shadow-sm ${theme.badge}`}>
                                                    {cloneElement(typeStyle.icon, { className: "w-3 h-3 scale-75" })}
                                                    {item.type}
                                                </span>
                                            </div>

                                            <div className={`mt-auto pt-4 border-t flex flex-wrap items-end justify-between gap-3 ${theme.borderColor}`}>
                                                <div className="mb-1">
                                                    <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${theme.salaryLabel}`}>Salary</p>
                                                    <div className="flex items-center gap-1">
                                                        <span className={`text-sm font-black ${theme.currency}`}>₱</span>
                                                        <span className={`text-lg font-black leading-none ${theme.salaryValue}`}>{item.salary}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className={`flex items-center gap-1.5 mr-1 ${theme.salaryLabel}`} title={`${applicantCount} Applicants`}>
                                                    <UsersIcon className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{applicantCount} {item.capacity > 0 ? `/ ${item.capacity}` : ''} Applicants</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            } else {
                                return (
                                    <div key={item.id} onClick={() => setSelectedUserDetail(item)} className={`p-6 ${glassCard} cursor-pointer`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 shadow-md shrink-0 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                                {item.profilePic ? <img src={item.profilePic} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-black opacity-30 text-xl">?</div>}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className={`font-bold text-sm truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.firstName} {item.lastName}</h4>
                                                <div className={`mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-bold border truncate ${PUROK_STYLES[item.sitio] || 'bg-slate-100 text-slate-500'}`}>{item.sitio}</div>
                                            </div>
                                            {/* Note: Instead of Reject on the card, Admin uses the Detail Modal for verified users. */}
                                            <button className="p-2 rounded-xl text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                                                <EyeIcon className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    </div>
                                );
                            }
                        })
                    }
                </div>
            </div>
        )}

      </main>

      {/* --- MULTIPLE MEDIA / PROOF VIEWER MODAL (VERTICAL SCROLL) --- */}
      {selectedProof && selectedProof.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md" onClick={() => setSelectedProof(null)}>
            <div className="relative max-w-5xl w-full max-h-[95vh] flex flex-col items-center animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                
                {/* Modal Header */}
                <div className="w-full flex justify-between items-center mb-4 px-4">
                    <h3 className="text-white font-black text-xl tracking-widest uppercase shadow-sm">File Viewer ({selectedProof.length})</h3>
                    <button onClick={() => setSelectedProof(null)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </div>
                
                {/* VERTICAL SCROLL CONTAINER */}
                <div className="w-full overflow-y-auto flex flex-col gap-10 p-4 pb-8 scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-black/20 [&::-webkit-scrollbar-thumb]:bg-white/40 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {selectedProof.map((url, i) => {
                        const isPdf = url.toLowerCase().includes('.pdf');
                        const isVideo = url.toLowerCase().match(/\.(mp4|mov|webm|ogg)$/i) || url.includes('video%2F');
                        
                        return (
                            <div key={i} className="flex flex-col items-center relative group w-full">
                                <span className="absolute top-4 left-4 md:left-auto md:right-4 bg-black/60 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full z-10 backdrop-blur-md">
                                    File {i + 1} of {selectedProof.length}
                                </span>
                                
                                {isPdf ? (
                                    <iframe src={url} className="w-full md:w-[800px] h-[75vh] rounded-2xl bg-white shadow-2xl border-4 border-white/20" />
                                ) : isVideo ? (
                                    <video src={url} controls className="w-full md:max-w-[800px] max-h-[75vh] object-contain rounded-2xl shadow-2xl border-4 border-white/20 bg-black" />
                                ) : (
                                    <img src={url} className="w-auto max-w-full md:max-w-[800px] max-h-[85vh] object-contain rounded-2xl shadow-2xl border-4 border-white/20 bg-black/20" alt={`Attached File ${i+1}`} />
                                )}
                                
                                <a href={url} target="_blank" rel="noreferrer" className="mt-4 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all flex items-center gap-2">
                                    <EyeIcon className="w-4 h-4"/> Open in New Tab
                                </a>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
      )}

      {/* --- USER DETAIL CARD MODAL --- */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedUserDetail(null)}>
             <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>
             <div onClick={(e) => e.stopPropagation()} className={`relative w-full max-w-md p-8 rounded-3xl shadow-2xl border animate-in zoom-in-95 duration-300 flex flex-col items-center ${darkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-white/50 text-slate-900'}`}>
                <div className={`w-24 h-24 rounded-3xl overflow-hidden shadow-lg mb-6 shrink-0 ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    {selectedUserDetail.profilePic ? <img src={selectedUserDetail.profilePic} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-4xl font-black opacity-20">?</div>}
                </div>
                <h2 className="text-2xl font-black mb-1">{selectedUserDetail.firstName} {selectedUserDetail.lastName}</h2>
                <div className="flex gap-2 mb-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-500/10 text-blue-500`}>{selectedUserDetail.type}</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${darkMode ? 'border-white/10' : 'border-black/10'}`}>{selectedUserDetail.sitio}</span>
                </div>
                <div className="w-full space-y-4">
                    <div className={`p-4 rounded-xl flex items-center gap-4 ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                        <EnvelopeIcon className="w-5 h-5 opacity-50"/>
                        <span className="text-sm font-bold opacity-80">{selectedUserDetail.email || "No email provided"}</span>
                    </div>
                    {selectedUserDetail.contact && (
                        <div className={`p-4 rounded-xl flex items-center gap-4 ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                            <PhoneIcon className="w-5 h-5 opacity-50"/>
                            <span className="text-sm font-bold opacity-80">{selectedUserDetail.contact}</span>
                        </div>
                    )}
                    {selectedUserDetail.bio && (
                        <div className={`p-4 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                            <p className="text-xs font-bold uppercase opacity-40 mb-2">Bio / Description</p>
                            <p className="text-sm opacity-80 leading-relaxed">{selectedUserDetail.bio}</p>
                        </div>
                    )}

                    <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                        <button onClick={() => {
                                handleVerifyUser(selectedUserDetail, 'rejected');
                                setSelectedUserDetail(null);
                            }} 
                            className="w-full py-3 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs uppercase flex items-center justify-center gap-2"
                        >
                            <XMarkIcon className="w-4 h-4"/> Suspend / Reject User
                        </button>
                    </div>

                </div>
                <button onClick={() => setSelectedUserDetail(null)} className="mt-6 px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest border border-current opacity-50 hover:opacity-100 transition-opacity">Close Details</button>
             </div>
        </div>
      )}

      {/* =========================================================
          GLOBAL CONFIRMATION MODAL
          ========================================================= */}
      {confirmDialog.isOpen && (
          <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 ${darkMode ? 'bg-slate-950/80' : 'bg-slate-900/60'}`} onClick={closeConfirm}>
              <div onClick={e => e.stopPropagation()} className={`w-full max-w-sm p-6 md:p-8 rounded-[2.5rem] shadow-2xl border animate-in zoom-in-95 duration-300 flex flex-col items-center text-center ${darkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-white/60 text-slate-900'}`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${confirmDialog.isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {confirmDialog.isDestructive ? <TrashIcon className="w-8 h-8"/> : <CheckCircleIcon className="w-8 h-8"/>}
                  </div>
                  <h3 className="text-xl font-black mb-2 tracking-tight">{confirmDialog.title}</h3>
                  <p className={`text-sm font-medium mb-8 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{confirmDialog.message}</p>
                  <div className="flex gap-3 w-full">
                      <button onClick={closeConfirm} className={`flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 ${darkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>Cancel</button>
                      <button onClick={() => { confirmDialog.onConfirm(); closeConfirm(); }} className={`flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg text-white ${confirmDialog.isDestructive ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}>{confirmDialog.confirmText}</button>
                  </div>
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
            {(badge > 0 && !open) && <span className={`hidden lg:block absolute top-2 right-2 w-2 h-2 ${badgeColor || 'bg-red-500'} rounded-full animate-pulse z-10 shadow-sm`}></span>}
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