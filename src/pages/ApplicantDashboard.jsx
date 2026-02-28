import { useState, useEffect, useRef, cloneElement } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { createPortal } from "react-dom";
import {
  collection, query, where, onSnapshot, orderBy,
  addDoc, serverTimestamp, setDoc, doc, updateDoc, increment, deleteDoc, 
  getDoc, getDocs, writeBatch, arrayUnion
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// --- HOOKS ---
import { useChat } from "../hooks/useChat"; 

// --- ICONS ---
import {
  BriefcaseIcon, ArrowLeftOnRectangleIcon, XMarkIcon,
  Bars3BottomRightIcon, MapPinIcon, SunIcon, MoonIcon,
  ChevronLeftIcon, ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon, PaperAirplaneIcon, EyeIcon,
  TrashIcon, CheckCircleIcon, CameraIcon, PencilSquareIcon,
  PlusIcon, UsersIcon, ClockIcon, UserIcon, AcademicCapIcon,
  CalendarDaysIcon, BoltIcon,
  EllipsisHorizontalIcon, PaperClipIcon, ArrowUturnLeftIcon,
  PhotoIcon, DocumentIcon, UserCircleIcon,
  SparklesIcon, EnvelopeIcon, PhoneIcon, 
  MegaphoneIcon, CpuChipIcon, TagIcon, StarIcon as StarIconOutline,
  QuestionMarkCircleIcon, BellIcon, ChevronDownIcon, ChatBubbleOvalLeftEllipsisIcon, IdentificationIcon, LockClosedIcon, BookmarkIcon,
  EllipsisVerticalIcon, Cog8ToothIcon, WrenchScrewdriverIcon, HomeIcon, UserGroupIcon
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

// --- SUB-COMPONENTS ---
import FindJobsTab from "../components/dashboard/applicant/FindJobsTab";
import SavedJobsTab from "../components/dashboard/applicant/SavedJobsTab";
import ApplicationsTab from "../components/dashboard/applicant/ApplicationsTab";
import MessagesTab from "../components/dashboard/applicant/MessagesTab";
import ProfileTab from "../components/dashboard/applicant/ProfileTab";
import RatingsTab from "../components/dashboard/applicant/RatingsTab";
import SupportTab from "../components/dashboard/applicant/SupportTab";
import AnnouncementsTab from "../components/dashboard/applicant/AnnouncementsTab";
import RateEmployerModal from "../components/dashboard/applicant/RateEmployerModal";
import MessageBubble from "../components/MessageBubble";
import { BOT_FAQ, getBotAutoReply } from "../utils/applicantConstants";

// --- CONSTANTS ---
const PUROK_LIST = [ "Sagur", "Ampungan", "Centro 1", "Centro 2", "Centro 3", "Bypass Road", "Boundary" ];

const JOB_CATEGORIES = [
    { id: "EDUCATION", label: "Education", examples: "Teachers, Tutors, Principals" },
    { id: "AGRICULTURE", label: "Agriculture", examples: "Corn/Rice Farmers, Livestock" },
    { id: "AUTOMOTIVE", label: "Automotive", examples: "Auto Mechanic, Motorcycle Mechanic" },
    { id: "CARPENTRY", label: "Carpentry", examples: "Carpenters, Furniture Makers" },
    { id: "HOUSEHOLD", label: "Household Service", examples: "Maids, Caregivers, Nanny" },
    { id: "CUSTOMER_SERVICE", label: "Customer Service", examples: "Cashiers, Saleslady, Baggers" }
];

const JOB_TYPES = [
  { id: "Full-time", icon: <BriefcaseIcon className="w-5 h-5"/>, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { id: "Part-time", icon: <ClockIcon className="w-5 h-5"/>, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { id: "Contract", icon: <CalendarDaysIcon className="w-5 h-5"/>, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { id: "One-time", icon: <BoltIcon className="w-5 h-5"/>, color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20" }
];

const getAvatarUrl = (user) => user?.profilePic || user?.photoURL || user?.avatar || user?.image || null;
const formatTime = (ts) => { if (!ts) return "Just now"; const date = ts?.toDate ? ts.toDate() : new Date(); return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
const formatDateTime = (ts) => { if (!ts) return "Just now"; const date = ts?.toDate ? ts.toDate() : new Date(); return date.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); };

const formatLastSeen = (timestamp) => {
    if (!timestamp) return { text: "Offline", isOnline: false };
    const now = new Date();
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMins = Math.floor((now - date) / 60000);
    
    if (diffMins < 3) return { text: "Active Now", isOnline: true };
    if (diffMins < 60) return { text: `Last seen ${diffMins}m ago`, isOnline: false };
    if (diffMins < 1440) return { text: `Last seen ${Math.floor(diffMins/60)}h ago`, isOnline: false };
    return { text: "Offline", isOnline: false };
};

const glassPanel = (darkMode) => `backdrop-blur-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;
const glassNavBtn = (darkMode) => `relative p-3 rounded-xl transition-all duration-300 ease-out group ${darkMode ? 'text-slate-400 hover:text-blue-400' : 'text-slate-400 hover:text-blue-600'}`;
const activeGlassNavBtn = (darkMode) => `relative p-3 rounded-xl transition-all duration-300 ease-out scale-110 -translate-y-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`;

export default function ApplicantDashboard() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState("FindJobs");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const togglePinMessage = async (msgId, currentPinnedStatus) => {
      try {
          await updateDoc(doc(db, "messages", msgId), { isPinned: !currentPinnedStatus });
      } catch (err) {
          console.error("Failed to pin message", err);
      }
  };

  // --- DATA ---
  const [availableJobs, setAvailableJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  
  // --- FILTERS ---
  const [jobSearch, setJobSearch] = useState("");
  const [jobLocationFilter, setJobLocationFilter] = useState("");
  const [jobCategoryFilter, setJobCategoryFilter] = useState(""); 
  const [isSitioDropdownOpen, setIsSitioDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [applicationSearch, setApplicationSearch] = useState("");

  // --- UI STATES ---
  const [lastReadAnnouncementId, setLastReadAnnouncementId] = useState(localStorage.getItem("lastReadAnnounceApp"));
  const [currentAnnounceIndex, setCurrentAnnounceIndex] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [viewingApplication, setViewingApplication] = useState(null);
  const [modalJobDetails, setModalJobDetails] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [isRatingEmployerModalOpen, setIsRatingEmployerModalOpen] = useState(false);
  const [selectedEmployerToRate, setSelectedEmployerToRate] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState('top');
  
  // Modal Views
  const [employerContact, setEmployerContact] = useState(null);
  const [modalRightView, setModalRightView] = useState("job"); // "job" | "profile" | "reputation"
  const [employerReviews, setEmployerReviews] = useState([]);
  const [employerAverageRating, setEmployerAverageRating] = useState(0);
  const [isFetchingEmployer, setIsFetchingEmployer] = useState(false);

  // --- PROFILE ---
  const [profileImage, setProfileImage] = useState(null);
  const [imgScale, setImgScale] = useState(1);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isProfileCategoryDropdownOpen, setIsProfileCategoryDropdownOpen] = useState(false);
  
  // New States for Resume
  const [resumeImageFile, setResumeImageFile] = useState(null);
  const [resumeDocFile, setResumeDocFile] = useState(null);

  const [applicantData, setApplicantData] = useState({
    firstName: "", lastName: "", sitio: "", title: "Job Seeker",
    bio: "", skills: "", education: "", experience: "",
    verificationStatus: "pending", category: "",
    resumeImageUrl: "", resumeFileUrl: ""
  });

  // --- RATINGS ---
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);

  // --- SUPPORT & CHAT ---
  const [supportTickets, setSupportTickets] = useState([]); 
  const [activeSupportTicket, setActiveSupportTicket] = useState(null); 
  const [ticketMessage, setTicketMessage] = useState("");
  const [supportAttachment, setSupportAttachment] = useState(null); 
  const [isSupportUploading, setIsSupportUploading] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [lastTicketCreatedAt, setLastTicketCreatedAt] = useState(0); 
  const [isBotTyping, setIsBotTyping] = useState(false);
  const ticketScrollRef = useRef(null);
  const supportFileRef = useRef(null);
  
  // Chat Bubble State
  const [isDesktopInboxVisible, setIsDesktopInboxVisible] = useState(false); 
  const [bubblePos, setBubblePos] = useState({ x: window.innerWidth - 80, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // --- USE CHAT HOOK ---
  const chat = useChat(auth.currentUser, isMobile);
  const { 
      conversations, activeChat, setActiveChat, openChat, closeChat, 
      sendMessage, messages, setOpenBubbles, openBubbles,
      isBubbleVisible, setIsBubbleVisible, isChatMinimized, setIsChatMinimized,
      isBubbleExpanded, setIsBubbleExpanded, activeBubbleView, setActiveBubbleView,
      scrollRef, unsendMessage
  } = chat;

  const [adminUser, setAdminUser] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [bubbleSearch, setBubbleSearch] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const chatFileRef = useRef(null);
  const bubbleFileRef = useRef(null); 
  const [isChatOptionsOpen, setIsChatOptionsOpen] = useState(false);

  // RESTORED DARK MODE FUNCTIONALITY
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // --- COMPUTED ---
  const isVerified = applicantData.verificationStatus === 'verified';
  const effectiveActiveChatUser = (isBubbleVisible && isMobile) ? openBubbles.find(b => b.id === activeBubbleView) : activeChat;
  const displayName = `${applicantData.firstName} ${applicantData.lastName}`.trim() || "Applicant";
  
  const filteredJobs = availableJobs.filter(job => {
      const hasApplied = myApplications.some(app => app.jobId === job.id);
      if (hasApplied) return false;
      const matchesSearch = job.title.toLowerCase().includes(jobSearch.toLowerCase()) || (job.employerName && job.employerName.toLowerCase().includes(jobSearch.toLowerCase()));
      const matchesLoc = jobLocationFilter ? job.sitio === jobLocationFilter : true;
      const matchesCategory = jobCategoryFilter ? job.category === jobCategoryFilter : true;
      return matchesSearch && matchesLoc && matchesCategory;
  });

  const displayAnnouncement = announcements[currentAnnounceIndex];
  const unreadMsgCount = conversations.reduce((acc, curr) => { const otherId = curr.participants?.find(p => p !== auth.currentUser?.uid); if (adminUser && otherId === adminUser.id) return acc; return acc + (curr[`unread_${auth.currentUser?.uid}`] || 0); }, 0);
  const latestAnnouncement = announcements.length > 0 ? announcements[0] : null;
  const hasNewAnnouncement = latestAnnouncement && String(latestAnnouncement.id) !== lastReadAnnouncementId;
  const hasUnreadUpdates = myApplications.some(app => app.isReadByApplicant === false && app.status !== 'pending');
  const totalNotifications = (hasUnreadUpdates ? 1 : 0) + (hasNewAnnouncement ? 1 : 0);
  
  const filteredChats = conversations.filter(c => { const otherId = c.participants?.find(p => p !== auth.currentUser?.uid); if (adminUser && otherId === adminUser.id) return false; const name = c.names?.[otherId] || "User"; return name.toLowerCase().includes(chatSearch.toLowerCase()); });
  const bubbleFilteredChats = conversations.filter(c => { const otherId = c.participants?.find(p => p !== auth.currentUser?.uid); if (adminUser && otherId === adminUser.id) return false; const name = c.names?.[otherId] || "User"; return name.toLowerCase().includes(bubbleSearch.toLowerCase()); });

  const isFullScreenPage = isMobile && ((activeTab === "Messages" && activeChat) || (activeTab === "Support" && isSupportOpen));

  // --- EFFECTS ---
  useEffect(() => {
    if (isBubbleExpanded || selectedJob || viewingApplication || isRatingEmployerModalOpen || lightboxUrl) {
        document.body.style.overflow = "hidden";
    } else {
        document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isBubbleExpanded, selectedJob, viewingApplication, isRatingEmployerModalOpen, lightboxUrl]);

  // Combined fetch for Employer Info + Reviews inside the modals
  useEffect(() => {
      const activeItem = selectedJob || viewingApplication;
      if (activeItem && activeItem.employerId) {
          const fetchEmployerInfoAndReviews = async () => {
              try {
                  const snap = await getDoc(doc(db, "employers", activeItem.employerId));
                  if (snap.exists()) {
                      setEmployerContact(snap.data());
                  }

                  const qReviews = query(collection(db, "reviews"), where("targetId", "==", activeItem.employerId));
                  const revSnap = await getDocs(qReviews);
                  let revs = revSnap.docs.map(d => ({id: d.id, ...d.data()}));
                  revs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                  setEmployerReviews(revs);
                  
                  if(revs.length > 0) {
                      const total = revs.reduce((acc, curr) => acc + (parseFloat(curr.rating) || 0), 0);
                      setEmployerAverageRating((total / revs.length).toFixed(1));
                  } else {
                      setEmployerAverageRating(0);
                  }

              } catch (err) {}
          };
          fetchEmployerInfoAndReviews();
      } else {
          setEmployerContact(null);
          setEmployerReviews([]);
          setEmployerAverageRating(0);
      }
  }, [selectedJob, viewingApplication]);

  // Reset Modal Tabs when closing/opening
  useEffect(() => {
      if (selectedJob || viewingApplication) {
          setModalRightView("job");
      }
  }, [selectedJob, viewingApplication]);

  useEffect(() => {
    if (activeTab === "Messages") {
        setIsBubbleVisible(false);
        setOpenBubbles([]); 
    } else {
        if (typeof setActiveChat === 'function') setActiveChat(null); 
    }
  }, [activeTab, setActiveChat, setIsBubbleVisible, setOpenBubbles]);

  useEffect(() => {
    if (announcements.length > 1) {
        const interval = setInterval(() => setCurrentAnnounceIndex(prev => (prev + 1) % announcements.length), 5000); 
        return () => clearInterval(interval);
    }
  }, [announcements.length]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if(activeTab === "FindJobs") {
        const fetchData = async () => {
            const q = query(collection(db, "jobs"), where("status", "==", "active"));
            const querySnapshot = await getDocs(q);
            setAvailableJobs(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchData();
    }
    if(activeTab === "Ratings") {
        const fetchReviews = () => {
            const q = query(collection(db, "reviews"), where("targetId", "==", auth.currentUser.uid));
            const unsub = onSnapshot(q, (snap) => {
                let revs = snap.docs.map(d => ({id: d.id, ...d.data()}));
                revs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setReviews(revs);
                if(revs.length > 0) {
                    const total = revs.reduce((acc, curr) => acc + (parseFloat(curr.rating) || 0), 0);
                    setAverageRating((total / revs.length).toFixed(1));
                } else {
                    setAverageRating(0);
                }
            });
            return unsub;
        };
        const unsubReviews = fetchReviews();
        return () => unsubReviews && unsubReviews();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsubProfile = onSnapshot(doc(db, "applicants", auth.currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.profilePic) setProfileImage(data.profilePic);
        if (data.imgScale) setImgScale(data.imgScale);
        setApplicantData(prev => ({ ...prev, ...data }));
      }
    });
    const qApps = query(collection(db, "applications"), where("applicantId", "==", auth.currentUser.uid));
    const unsubApps = onSnapshot(qApps, (snap) => setMyApplications(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.appliedAt?.seconds || 0) - (a.appliedAt?.seconds || 0))));
    const qSaved = query(collection(db, "saved_jobs"), where("userId", "==", auth.currentUser.uid));
    const unsubSaved = onSnapshot(qSaved, (snap) => setSavedJobs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qAnnouncements = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    const unsubAnnouncements = onSnapshot(qAnnouncements, (snap) => setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const ticketsQuery = query(collection(db, "support_tickets"), where("userId", "==", auth.currentUser.uid));
    const unsubTickets = onSnapshot(ticketsQuery, (snapshot) => {
        const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        tickets.sort((a, b) => (b.lastUpdated?.seconds || 0) - (a.lastUpdated?.seconds || 0));
        setSupportTickets(tickets);
        setActiveSupportTicket(curr => { if (!curr) return null; const updated = tickets.find(t => t.id === curr.id); return updated || curr; });
    });
    return () => { unsubProfile(); unsubApps(); unsubSaved(); unsubAnnouncements(); unsubTickets(); };
  }, [auth.currentUser]);

  // --- HANDLERS ---

  const handleToggleSaveJob = async (job) => { 
      const existing = savedJobs.find(s => s.jobId === job.id); 
      const isAppliedActive = myApplications.some(app => app.jobId === job.id && app.status !== 'withdrawn');
      if(isAppliedActive && existing) return alert("You cannot unsave a job you have an active application for.");
      try { 
          if(existing) await deleteDoc(doc(db, "saved_jobs", existing.id)); 
          else await addDoc(collection(db, "saved_jobs"), { userId: auth.currentUser.uid, jobId: job.id, jobData: job, savedAt: serverTimestamp() }); 
      } catch(err) { } 
  };

 const handleApplyToJob = async (job) => {
    if(!window.confirm(`Apply to ${job.title}?`)) return;
    setLoading(true);
    try {
        await addDoc(collection(db, "applications"), {
            jobId: job.id, jobTitle: job.title, employerId: job.employerId, employerName: job.employerName,
            employerLogo: job.employerLogo || "", applicantId: auth.currentUser.uid,
            applicantName: `${applicantData.firstName} ${applicantData.lastName}`,
            applicantProfilePic: profileImage || "", status: 'pending', appliedAt: serverTimestamp(),
            isViewed: false, isReadByApplicant: true, isRatedByApplicant: false
        });

        await updateDoc(doc(db, "jobs", job.id), { applicationCount: increment(1) });

        if (!savedJobs.some(s => s.jobId === job.id)) {
             await addDoc(collection(db, "saved_jobs"), { userId: auth.currentUser.uid, jobId: job.id, jobData: job, savedAt: serverTimestamp() });
        }
        alert("Application Sent!"); setSelectedJob(null);
    } catch(err) { alert("Error applying: " + err.message); } finally { setLoading(false); }
  };

  const handleWithdrawApplication = async (appId) => { 
      if(!window.confirm("Withdraw this application?")) return; 
      setLoading(true); 
      try { 
          const appDoc = await getDoc(doc(db, "applications", appId));
          if (appDoc.exists()) {
              const jobId = appDoc.data().jobId;
              if (jobId) await updateDoc(doc(db, "jobs", jobId), { applicationCount: increment(-1) });
          }

          await updateDoc(doc(db, "applications", appId), { status: 'withdrawn' }); 
          setViewingApplication(null); 
      } catch (err) { alert("Error: " + err.message); } finally { setLoading(false); } 
  };

  const handleDeleteApplication = async (appId) => {
      if(!window.confirm("Delete permanently?")) return;
      setLoading(true);
      try { await deleteDoc(doc(db, "applications", appId)); } catch (err) { alert("Error: " + err.message); } finally { setLoading(false); }
  };

  const handleViewAnnouncement = (annId) => { setActiveTab("Announcements"); setIsNotifOpen(false); setLastReadAnnouncementId(String(annId)); localStorage.setItem("lastReadAnnounceApp", String(annId)); };
  
  const getJobStyle = (type) => { 
      const found = JOB_TYPES.find(j => j.id === type); 
      if (found) return found; 
      return { icon: <BoltIcon className="w-6 h-6"/>, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' }; 
  };

  const handleSubmitEmployerRating = async (ratingData) => {
    if (!auth.currentUser || !selectedEmployerToRate) return;
    setLoading(true);
    try {
        await addDoc(collection(db, "reviews"), {
            targetId: selectedEmployerToRate.employerId, reviewerId: auth.currentUser.uid,
            rating: ratingData.rating, comment: ratingData.comment, type: 'employer_review', createdAt: serverTimestamp()
        });
        await updateDoc(doc(db, "applications", selectedEmployerToRate.id), { isRatedByApplicant: true });
        alert("Employer rated!"); setIsRatingEmployerModalOpen(false);
    } catch (error) { alert("Failed to rate."); } finally { setLoading(false); }
  };

  const handleStartChatFromExternal = (userObj) => {
      if (!isVerified) return alert("Verify account to message.");
      openChat(userObj); setIsChatMinimized(false); setActiveTab("Messages");
      setIsBubbleVisible(false); setIsBubbleExpanded(false); setIsDesktopInboxVisible(false);
  };

  const handleSaveProfile = async () => { 
    setLoading(true); 
    try { 
        let resumeImageUpdate = applicantData.resumeImageUrl || null;
        let resumeDocUpdate = applicantData.resumeFileUrl || null;
        let resumeNameUpdate = applicantData.resumeFileName || null;
        let newProfilePicUrl = applicantData.profilePic || null; 

        const storage = getStorage(auth.app);

        const avatarFile = fileInputRef.current?.files?.[0];
        if (isEditingImage && avatarFile) {
            const fileExt = avatarFile.name.split('.').pop();
            const avatarRef = ref(storage, `profilePics/${auth.currentUser.uid}_${Date.now()}.${fileExt}`);
            await uploadBytes(avatarRef, avatarFile);
            newProfilePicUrl = await getDownloadURL(avatarRef);
        }

        if (resumeImageFile) {
            const fileExt = resumeImageFile.name.split('.').pop();
            const imgRef = ref(storage, `resumes/${auth.currentUser.uid}_image_${Date.now()}.${fileExt}`);
            await uploadBytes(imgRef, resumeImageFile);
            resumeImageUpdate = await getDownloadURL(imgRef);
        }

        if (resumeDocFile) {
            const fileExt = resumeDocFile.name.split('.').pop();
            const docRef = ref(storage, `resumes/${auth.currentUser.uid}_doc_${Date.now()}.${fileExt}`);
            
            const metadata = {
                contentDisposition: `attachment; filename="${resumeDocFile.name}"`
            };

            await uploadBytes(docRef, resumeDocFile, metadata);
            resumeDocUpdate = await getDownloadURL(docRef);
            resumeNameUpdate = resumeDocFile.name; 
        }

        const updatedData = { 
            title: applicantData.title, 
            aboutMe: applicantData.bio, 
            education: applicantData.education, 
            workExperience: applicantData.experience, 
            category: applicantData.category, 
            resumeImageUrl: resumeImageUpdate,
            resumeFileUrl: resumeDocUpdate,
            resumeFileName: resumeNameUpdate,
            profilePic: newProfilePicUrl, 
            updatedAt: serverTimestamp() 
        };

        await setDoc(doc(db, "applicants", auth.currentUser.uid), updatedData, { merge: true }); 
        
        setApplicantData(prev => ({ ...prev, ...updatedData }));
        if (newProfilePicUrl) setProfileImage(newProfilePicUrl);

        setIsEditingProfile(false); 
        setIsEditingImage(false); 
        setResumeImageFile(null);
        setResumeDocFile(null);
        
        if (fileInputRef.current) fileInputRef.current.value = "";

    } catch (err) { 
        alert("Error saving profile: " + err.message); 
    } finally { 
        setLoading(false); 
    } 
  };

  // Chat & Support
  const handleSendMessageWrapper = async (e) => {
    e.preventDefault();
    const targetChat = activeChat || (isBubbleVisible && activeBubbleView !== 'inbox' ? openBubbles.find(b => b.id === activeBubbleView) : null);
    if (!targetChat) return;
    const myId = auth.currentUser.uid;
    const otherId = targetChat.id;
    const chatId = [myId, otherId].sort().join("_");
    let recipientName = targetChat.name;
    let recipientPic = targetChat.profilePic;
    if (!recipientName || recipientName === "User" || recipientName === "Employer" || !recipientPic) {
        try {
            const userSnap = await getDoc(doc(db, "employers", otherId));
            if (userSnap.exists()) {
                const d = userSnap.data();
                const realName = `${d.firstName || ""} ${d.lastName || ""}`.trim();
                if(realName) recipientName = realName;
                if(d.profilePic) recipientPic = d.profilePic;
            }
        } catch (err) {}
    }
    const conversationMetaUpdate = {
        [`names.${myId}`]: displayName || "Applicant", [`names.${otherId}`]: recipientName || "Employer",
        [`profilePics.${myId}`]: profileImage || null, [`profilePics.${otherId}`]: recipientPic || null,
        participants: [myId, otherId]
    };
    if (!attachment) {
        if (!newMessage.trim()) return;
        if (activeChat || effectiveActiveChatUser) { 
             await sendMessage(newMessage, null, replyingTo); 
        } 
        await setDoc(doc(db, "conversations", chatId), { chatId, lastMessage: newMessage, lastTimestamp: serverTimestamp(), [`unread_${otherId}`]: increment(1), ...conversationMetaUpdate }, { merge: true });
        setNewMessage(""); setReplyingTo(null);
    } else {
        setIsUploading(true);
        try {
            const storage = getStorage(auth.app);
            const storageRef = ref(storage, `chat_attachments/${chatId}/${Date.now()}_${attachment.name}`);
            const uploadTask = await uploadBytes(storageRef, attachment);
            const fileUrl = await getDownloadURL(uploadTask.ref);
            let fileType = attachment.type.startsWith('image/') ? 'image' : attachment.type.startsWith('video/') ? 'video' : 'file';
             await addDoc(collection(db, "messages"), {
                chatId, text: newMessage, senderId: auth.currentUser.uid, receiverId: otherId, createdAt: serverTimestamp(), 
                fileUrl: fileUrl || null, fileType: fileType, fileName: attachment.name,
                replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, senderName: replyingTo.senderId === auth.currentUser.uid ? "You" : recipientName, type: replyingTo.fileType || 'text' } : null
             });
             await setDoc(doc(db, "conversations", chatId), { chatId, lastMessage: `Sent a ${fileType}`, lastTimestamp: serverTimestamp(), [`unread_${otherId}`]: increment(1), ...conversationMetaUpdate }, { merge: true });
            setNewMessage(""); setAttachment(null); setReplyingTo(null); 
            if (chatFileRef.current) chatFileRef.current.value = ""; 
            if (bubbleFileRef.current) bubbleFileRef.current.value = ""; 
        } catch (err) { alert("Failed to send file."); } finally { setIsUploading(false); }
    }
  };

  const handleSupportFileSelect = (e) => { if (e.target.files[0]) setSupportAttachment(e.target.files[0]); };
  const handleSendFAQ = async (faq) => {
      const userMsg = { sender: 'user', text: faq.question, timestamp: new Date() };
      const botMsg = { sender: 'admin', text: `🤖 ${faq.answer}`, timestamp: new Date() };
      try {
          if (activeSupportTicket) {
               if(activeSupportTicket.status === 'closed') { alert("Ticket closed."); return; }
               await updateDoc(doc(db, "support_tickets", activeSupportTicket.id), { messages: arrayUnion(userMsg, botMsg), lastUpdated: serverTimestamp(), status: 'open' });
          } else {
              const ticketIdString = Math.floor(1000 + Math.random() * 9000).toString();
              const newTicketRef = await addDoc(collection(db, "support_tickets"), { ticketId: ticketIdString, user: displayName, userId: auth.currentUser.uid, type: 'Applicant', status: 'open', lastUpdated: serverTimestamp(), messages: [userMsg, botMsg] });
              setLastTicketCreatedAt(Date.now());
              const newTicketSnap = await getDoc(newTicketRef);
              setActiveSupportTicket({ id: newTicketRef.id, ...newTicketSnap.data() });
          }
      } catch (err) {}
  };
  
  const handleSendSupportMessage = async (e) => {
      e.preventDefault();
      if (!ticketMessage.trim() && !supportAttachment) return;
      const now = Date.now();
      
      if (!activeSupportTicket && (now - lastTicketCreatedAt < 5 * 60 * 1000)) return alert(`Please wait before opening a new ticket.`);
      
      setIsSupportUploading(true);
      try {
          let imageUrl = null;
          if (supportAttachment) {
             const storage = getStorage(auth.app);
             const storageRef = ref(storage, `support_attachments/${auth.currentUser.uid}/${Date.now()}_${supportAttachment.name}`);
             const uploadTask = await uploadBytes(storageRef, supportAttachment);
             imageUrl = await getDownloadURL(uploadTask.ref);
          }
          
          const userMsgObj = { sender: 'user', text: ticketMessage, imageUrl: imageUrl || null, timestamp: new Date() };
          const messagesToSave = [userMsgObj];
          const botReplyText = getBotAutoReply(ticketMessage, BOT_FAQ);
          
          if (botReplyText) {
              messagesToSave.push({
                  sender: 'admin', 
                  text: botReplyText, 
                  timestamp: new Date()
              });
          }

          if (activeSupportTicket) {
              await updateDoc(doc(db, "support_tickets", activeSupportTicket.id), { 
                  messages: arrayUnion(...messagesToSave), 
                  lastUpdated: serverTimestamp(), 
                  status: 'open' 
              });
          } else {
              const ticketIdString = Math.floor(1000 + Math.random() * 9000).toString();
              const newTicketRef = await addDoc(collection(db, "support_tickets"), { 
                  ticketId: ticketIdString, 
                  user: displayName, 
                  userId: auth.currentUser.uid, 
                  type: 'Applicant', 
                  status: 'open', 
                  lastUpdated: serverTimestamp(), 
                  messages: messagesToSave 
              });
              setLastTicketCreatedAt(now);
              const newTicketSnap = await getDoc(newTicketRef);
              setActiveSupportTicket({ id: newTicketRef.id, ...newTicketSnap.data() });
          }
          
          setTicketMessage(""); 
          setSupportAttachment(null); 
          if(supportFileRef.current) supportFileRef.current.value = ""; 

      } catch (err) {
          console.error(err);
      } finally { 
          setIsSupportUploading(false); 
      }
  };
  
  const handleCloseSupportTicket = async (id) => { if(!confirm("Close ticket?")) return; await updateDoc(doc(db, "support_tickets", id), { status: 'closed', lastUpdated: serverTimestamp() }); setActiveSupportTicket(null); setIsSupportOpen(false); };
  const handleDeleteTicket = async (id) => { if(confirm("Delete permanently?")) { await deleteDoc(doc(db, "support_tickets", id)); if(activeSupportTicket?.id === id) { setActiveSupportTicket(null); setIsSupportOpen(false); } } };

  // --- TOUCH HANDLERS FOR BUBBLE ---
  const handleTouchStart = (e) => { setIsDragging(true); const touch = e.touches[0]; dragOffset.current = { x: touch.clientX - bubblePos.x, y: touch.clientY - bubblePos.y }; };
  const handleTouchMove = (e) => { if (!isDragging) return; const touch = e.touches[0]; const bubbleSize = 56; let newX = touch.clientX - dragOffset.current.x; let newY = touch.clientY - dragOffset.current.y; newY = Math.max(0, Math.min(newY, window.innerHeight - 80)); newX = Math.max(0, Math.min(newX, window.innerWidth - bubbleSize)); setBubblePos({ x: newX, y: newY }); };
  const handleTouchEnd = () => { setIsDragging(false); const trashX = window.innerWidth / 2; const trashY = window.innerHeight - 80; const dist = Math.hypot((bubblePos.x + 28) - trashX, (bubblePos.y + 28) - trashY); if (dist < 60) { setIsBubbleVisible(false); setOpenBubbles([]); return; } if (bubblePos.x < window.innerWidth / 2) setBubblePos(prev => ({ ...prev, x: 0 })); else setBubblePos(prev => ({ ...prev, x: window.innerWidth - 56 })); };
  const markConversationAsRead = async (otherUserId) => { if (!auth.currentUser || !otherUserId) return; const chatId = [auth.currentUser.uid, otherUserId].sort().join("_"); try { await updateDoc(doc(db, "conversations", chatId), { [`unread_${auth.currentUser.uid}`]: 0 }); } catch (e) { } };
  const handleFileSelect = (e) => { if (e.target.files[0]) setAttachment(e.target.files[0]); };

  const getModalTheme = (categoryId, isDark) => {
      const darkColors = {
          'EDUCATION': { text: 'text-blue-400', bgLight: 'bg-blue-400/10', border: 'border-blue-400/30', btn: 'bg-blue-400 text-slate-900 hover:bg-blue-500', saveActive: 'bg-blue-400 border-blue-400 text-slate-900', saveIdle: 'hover:bg-blue-400/10 hover:text-blue-400 hover:border-blue-400/50' },
          'AGRICULTURE': { text: 'text-green-400', bgLight: 'bg-green-400/10', border: 'border-green-400/30', btn: 'bg-green-400 text-slate-900 hover:bg-green-500', saveActive: 'bg-green-400 border-green-400 text-slate-900', saveIdle: 'hover:bg-green-400/10 hover:text-green-400 hover:border-green-400/50' },
          'AUTOMOTIVE': { text: 'text-slate-400', bgLight: 'bg-slate-400/10', border: 'border-slate-400/30', btn: 'bg-slate-400 text-slate-900 hover:bg-slate-500', saveActive: 'bg-slate-400 border-slate-400 text-slate-900', saveIdle: 'hover:bg-slate-400/10 hover:text-slate-400 hover:border-slate-400/50' },
          'CARPENTRY': { text: 'text-yellow-400', bgLight: 'bg-yellow-400/10', border: 'border-yellow-400/30', btn: 'bg-yellow-400 text-slate-900 hover:bg-yellow-500', saveActive: 'bg-yellow-400 border-yellow-400 text-slate-900', saveIdle: 'hover:bg-yellow-400/10 hover:text-yellow-400 hover:border-yellow-400/50' },
          'HOUSEHOLD': { text: 'text-pink-400', bgLight: 'bg-pink-400/10', border: 'border-pink-400/30', btn: 'bg-pink-400 text-slate-900 hover:bg-pink-500', saveActive: 'bg-pink-400 border-pink-400 text-slate-900', saveIdle: 'hover:bg-pink-400/10 hover:text-pink-400 hover:border-pink-400/50' },
          'CUSTOMER_SERVICE': { text: 'text-purple-400', bgLight: 'bg-purple-400/10', border: 'border-purple-400/30', btn: 'bg-purple-400 text-slate-900 hover:bg-purple-500', saveActive: 'bg-purple-400 border-purple-400 text-slate-900', saveIdle: 'hover:bg-purple-400/10 hover:text-purple-400 hover:border-purple-400/50' },
      };
      const fallbackDark = { text: 'text-slate-400', bgLight: 'bg-slate-400/10', border: 'border-slate-400/30', btn: 'bg-slate-400 text-slate-900 hover:bg-slate-500', saveActive: 'bg-slate-400 border-slate-400 text-slate-900', saveIdle: 'hover:bg-slate-400/10 hover:text-slate-400 hover:border-slate-400/50' };

      if (isDark) {
          const cat = darkColors[categoryId] || fallbackDark;
          return {
              solid: cat.btn,
              badge: `${cat.bgLight} ${cat.border} ${cat.text}`,
              saveActive: cat.saveActive,
              saveIdle: `bg-slate-800 border-transparent text-slate-400 ${cat.saveIdle}`,
              appliedBtn: `${cat.bgLight} ${cat.text} ${cat.border} opacity-60` 
          };
      } else {
          return {
              solid: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 text-white',
              badge: 'bg-blue-50 border-blue-100 text-blue-600',
              saveActive: 'bg-blue-600 border-blue-600 text-white',
              saveIdle: 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200',
              appliedBtn: 'bg-green-50 text-green-600 border-green-200 opacity-80' 
          };
      }
  };

  return (
    <div className={`relative min-h-screen transition-colors duration-500 font-sans pb-24 md:pb-0 select-none cursor-default overflow-x-hidden ${darkMode ? 'bg-slate-950 text-white' : 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 text-blue-900'}`}>
      
      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .animate-content { animation: content-wipe 0.4s cubic-bezier(0.16, 1, 0.3, 1); } @keyframes content-wipe { 0% { opacity: 0; transform: translateY(10px) scale(0.99); } 100% { opacity: 1; transform: translateY(0) scale(1); } }`}</style>

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-40 h-20 px-6 flex items-center justify-between transition-all duration-300 backdrop-blur-xl border-b ${darkMode ? 'bg-slate-900/80 border-white/5' : 'bg-white/50 border-blue-200/50'} ${(isFullScreenPage) ? '-translate-y-full' : 'translate-y-0'} ${!isVerified && !isFullScreenPage ? 'top-10' : 'top-0'}`}>
          <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                <h1 className={`font-black text-xl sm:text-2xl tracking-tighter shrink-0 cursor-pointer ${darkMode ? 'text-white' : 'text-blue-900'}`}>
                    LIVELI<span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>MATCH</span>
                </h1>
            </div>
            </div>
           <div className="hidden lg:flex items-center gap-24">
                {['FindJobs', 'Saved', 'Applications', 'Messages'].map(tab => (
                    <button key={tab} onClick={() => isVerified && setActiveTab(tab)} className={`${activeTab === tab ? activeGlassNavBtn(darkMode) : glassNavBtn(darkMode)} ${!isVerified && 'opacity-50 cursor-not-allowed'}`}>
                        {tab === 'FindJobs' && <BriefcaseIcon className="w-7 h-7 relative z-10" />}
                        {tab === 'Saved' && <BookmarkIcon className="w-7 h-7 relative z-10" />}
                        {tab === 'Applications' && <div className="relative"><PaperAirplaneIcon className="w-7 h-7 relative z-10" />{hasUnreadUpdates && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse z-20"/>}</div>}
                        {tab === 'Messages' && <div className="relative"><ChatBubbleLeftRightIcon className="w-7 h-7 relative z-10" />{unreadMsgCount > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full font-bold">{unreadMsgCount}</span>}</div>}
                    </button>
                ))}
           </div>
           <div className="flex items-center gap-4">
                <div className="relative">
                    <button onClick={() => isVerified && setIsNotifOpen(!isNotifOpen)} className={`relative p-2 rounded-full transition-all ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-white/40 text-blue-900/60'} ${!isVerified && 'opacity-50 cursor-not-allowed'}`}>
                        <BellIcon className="w-6 h-6" />{totalNotifications > 0 && <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}
                    </button>
                    {isNotifOpen && isVerified && (
                        <div className={`fixed top-24 left-1/2 -translate-x-1/2 md:absolute md:top-12 md:left-auto md:right-0 md:translate-x-0 w-[90vw] md:w-80 rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 z-[100] ${darkMode ? 'bg-slate-800 border-white/10' : 'bg-white/90 border-white/60 backdrop-blur-xl'}`}>
                             <div className={`p-3 border-b font-black text-xs uppercase opacity-50 ${darkMode ? 'border-white/10' : 'border-slate-200 text-slate-500'}`}>Notifications</div>
                             <div className="p-2 space-y-1">
                                {hasNewAnnouncement && displayAnnouncement && (
                                    <button onClick={() => handleViewAnnouncement(displayAnnouncement.id)} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm font-bold text-red-500 bg-red-500/10">
                                        <div className="flex flex-col"><span className="text-[10px] uppercase opacity-70">Announcement</span><span className="truncate">{displayAnnouncement.title}</span></div>
                                        <span className="bg-red-500 w-2 h-2 rounded-full shrink-0"></span>
                                    </button>
                                )}
                                {hasUnreadUpdates && <button onClick={() => { setActiveTab("Applications"); setIsNotifOpen(false); }} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm font-bold text-red-500 bg-red-500/10"><span>Update on Application</span><span className="bg-red-500 w-2 h-2 rounded-full"></span></button>}
                                {!totalNotifications && <div className="p-4 text-center opacity-40 text-xs font-bold uppercase">No notifications</div>}
                             </div>
                        </div>
                    )}
                </div>

                <div onClick={() => setActiveTab("Profile")} className="cursor-pointer group">
                    <div className={`w-10 h-10 rounded-full overflow-hidden border-2 shadow-sm ${darkMode ? 'border-slate-600 group-hover:border-white' : 'border-white group-hover:border-blue-500'}`}>
                        {profileImage ? <img src={profileImage} className="w-full h-full object-cover" alt="pfp" /> : <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold">{applicantData.firstName?.charAt(0)}</div>}
                    </div>
                </div>
                <button onClick={() => setIsSidebarOpen(true)} className={`p-2 rounded-xl ${darkMode ? 'text-white hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}><Bars3BottomRightIcon className="w-7 h-7" /></button>
           </div>
      </header>

      {/* Sidebar */}
      <aside className={`fixed top-0 right-0 h-full w-64 z-[100] rounded-l-3xl flex flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${glassPanel(darkMode)} ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}`}>
           <div className="h-24 flex items-center justify-center relative mt-8 cursor-pointer" onClick={() => { setActiveTab("Profile"); setIsSidebarOpen(false); }}>
               <div className={`flex items-center gap-3 p-2 pr-4 rounded-2xl transition-colors group ${darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-50'}`}>
                   <div className="w-12 h-12 rounded-2xl overflow-hidden">{profileImage ? <img src={profileImage} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold">A</div>}</div>
                   <div><h1 className={`font-black text-sm tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{displayName}</h1><p className={`text-[10px] opacity-60 font-bold uppercase ${darkMode ? 'group-hover:text-blue-400' : 'group-hover:text-blue-600'}`}>View Profile</p></div>
               </div>
               <button onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(false); }} className={`absolute top-0 right-4 p-2 opacity-50 hover:opacity-100 ${darkMode ? 'text-white' : 'text-slate-600'}`}><XMarkIcon className="w-6 h-6" /></button>
           </div>
           <nav className="flex-1 px-4 space-y-3 py-4 overflow-y-auto no-scrollbar">
                <button onClick={() => { isVerified && setActiveTab("Ratings"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${activeTab === 'Ratings' ? (darkMode ? 'text-blue-400 bg-slate-800/50 shadow-sm border border-white/10' : 'text-blue-600 bg-white shadow-sm border border-slate-200') : (darkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50')}`}><StarIconOutline className="w-6 h-6"/><span className="font-bold text-xs uppercase tracking-widest">Ratings</span></button>
                <button onClick={() => { setActiveTab("Announcements"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${activeTab === 'Announcements' ? (darkMode ? 'text-blue-400 bg-slate-800/50 shadow-sm border border-white/10' : 'text-blue-600 bg-white shadow-sm border border-slate-200') : (darkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50')}`}><MegaphoneIcon className="w-6 h-6"/><span className="font-bold text-xs uppercase tracking-widest">Announcements</span></button>
                <button onClick={() => { setActiveTab("Support"); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${activeTab === 'Support' ? (darkMode ? 'text-blue-400 bg-slate-800/50 shadow-sm border border-white/10' : 'text-blue-600 bg-white shadow-sm border border-slate-200') : (darkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50')}`}><QuestionMarkCircleIcon className="w-6 h-6"/><span className="font-bold text-xs uppercase tracking-widest">Support</span></button>
           </nav>
           <div className="p-4 space-y-3">
               <button onClick={() => setDarkMode(!darkMode)} className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-colors ${darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>{darkMode ? <SunIcon className="w-6 h-6 text-amber-400"/> : <MoonIcon className="w-6 h-6 text-slate-600"/>}<span className="text-xs font-bold">Switch Theme</span></button>
               <button onClick={async () => { await signOut(auth); navigate("/"); }} className={`w-full p-3 rounded-2xl flex items-center gap-3 text-red-500 transition-colors ${darkMode ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}><ArrowLeftOnRectangleIcon className="w-6 h-6"/><span className="text-xs font-bold">Logout</span></button>
           </div>
      </aside>

      {/* Main Content Area */}
      <main className={`relative z-10 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${(isFullScreenPage) ? 'p-0 pt-0' : 'p-4 lg:p-8 pt-24 lg:pt-28'}`}>
        
        {/* === TITLE BAR HEADER (SUB-HEADER) === */}
        {!isFullScreenPage && (
            <header className={`mb-6 lg:mb-8 flex items-center justify-between p-4 md:p-5 rounded-[2rem] transition-all duration-300 relative overflow-hidden ${darkMode ? 'bg-slate-900 border border-white/10 shadow-sm' : 'bg-white/60 border border-white/60 shadow-xl backdrop-blur-xl'}`}>
                <div className="flex items-center gap-4 relative z-10">
                    <div className={`p-3 rounded-2xl hidden md:flex items-center justify-center shadow-sm ${darkMode ? 'bg-blue-400/10 text-blue-400 border border-blue-400/20' : 'bg-white border border-slate-200 text-blue-600'}`}>
                        {activeTab === "FindJobs" && <BriefcaseIcon className="w-6 h-6"/>}
                        {activeTab === "Saved" && <BookmarkIcon className="w-6 h-6"/>}
                        {activeTab === "Applications" && <PaperAirplaneIcon className="w-6 h-6"/>}
                        {activeTab === "Messages" && <ChatBubbleLeftRightIcon className="w-6 h-6"/>}
                        {activeTab === "Profile" && <UserCircleIcon className="w-6 h-6"/>}
                        {activeTab === "Ratings" && <StarIconOutline className="w-6 h-6"/>}
                        {activeTab === "Support" && <QuestionMarkCircleIcon className="w-6 h-6"/>}
                        {activeTab === "Announcements" && <MegaphoneIcon className="w-6 h-6"/>}
                    </div>
                    <div>
                        <h2 className={`text-xl lg:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-blue-900'}`}>{activeTab === "Support" ? "Help & Support" : activeTab === "FindJobs" ? "Find Jobs" : activeTab}</h2>
                        <p className={`text-[10px] font-bold uppercase tracking-widest opacity-60 ${darkMode ? 'text-slate-400' : 'text-blue-800'}`}>Applicant Workspace</p>
                    </div>
                </div>
            </header>
        )}

        {isVerified && activeTab === "FindJobs" && (
            <FindJobsTab 
                availableJobs={availableJobs}
                savedJobs={savedJobs}
                myApplications={myApplications}
                conversations={conversations}
                currentUser={auth.currentUser}
                applicantData={applicantData}
                jobSearch={jobSearch}
                setJobSearch={setJobSearch}
                jobLocationFilter={jobLocationFilter}
                setJobLocationFilter={setJobLocationFilter}
                jobCategoryFilter={jobCategoryFilter}
                setJobCategoryFilter={setJobCategoryFilter}
                isSitioDropdownOpen={isSitioDropdownOpen}
                setIsSitioDropdownOpen={setIsSitioDropdownOpen}
                isCategoryDropdownOpen={isCategoryDropdownOpen}
                setIsCategoryDropdownOpen={setIsCategoryDropdownOpen}
                onSelectJob={setSelectedJob}
                onToggleSave={handleToggleSaveJob}
                onApply={handleApplyToJob}
                handleViewAnnouncement={handleViewAnnouncement}
                displayAnnouncement={displayAnnouncement}
                darkMode={darkMode}
                setActiveTab={setActiveTab}
                PUROK_LIST={PUROK_LIST}
                JOB_CATEGORIES={JOB_CATEGORIES}
                getJobStyle={getJobStyle}
            />
        )}

        {isVerified && activeTab === "Saved" && (
            <SavedJobsTab 
                savedJobs={savedJobs}
                myApplications={myApplications}
                onToggleSave={handleToggleSaveJob}
                onSelectJob={setSelectedJob}
                onApply={handleApplyToJob}
                getJobStyle={getJobStyle}
                darkMode={darkMode}
                JOB_CATEGORIES={JOB_CATEGORIES}
            />
        )}

        {isVerified && activeTab === "Applications" && (
            <ApplicationsTab 
                myApplications={myApplications}
                applicationSearch={applicationSearch}
                setApplicationSearch={setApplicationSearch}
                handleWithdrawApplication={handleWithdrawApplication}
                handleDeleteApplication={handleDeleteApplication}
                handleViewApplicationDetails={(app) => { 
                    const fetchJob = async () => {
                        setModalLoading(true); setViewingApplication(app); setModalJobDetails(null);
                        
                        if (app.isReadByApplicant === false) {
                            try {
                                await updateDoc(doc(db, "applications", app.id), { isReadByApplicant: true });
                            } catch (err) {}
                        }

                        try { if (app.jobId) { const snap = await getDoc(doc(db, "jobs", app.jobId)); if(snap.exists()) setModalJobDetails(snap.data()); } } catch(e){} finally { setModalLoading(false); }
                    };
                    fetchJob();
                }}
                handleStartChatFromExternal={handleStartChatFromExternal}
                conversations={conversations}
                currentUser={auth.currentUser}
                darkMode={darkMode}
                onRateEmployer={(app) => { setSelectedEmployerToRate(app); setIsRatingEmployerModalOpen(true); }}
            />
        )}

        {isVerified && activeTab === "Messages" && (
            <MessagesTab 
                isMobile={isMobile}
                myProfileImage={profileImage || applicantData?.profilePic}
                activeChat={activeChat}
                togglePinMessage={togglePinMessage}
                chatStatus={activeChat ? formatLastSeen(conversations.find(c => c.chatId.includes(activeChat.id))?.lastTimestamp) : null}
                conversations={conversations}
                openChat={openChat}
                closeChat={closeChat}
                sendMessage={sendMessage}
                unsendMessage={chat.unsendMessage}
                messages={messages}
                setActiveChat={setActiveChat}
                currentUser={auth.currentUser}
                adminUser={adminUser}
                darkMode={darkMode}
                setLightboxUrl={setLightboxUrl}
                onMinimize={() => { 
                    setIsChatMinimized(true); 
                    setIsBubbleVisible(true); 
                    if(activeChat) { 
                        setOpenBubbles(prev => [...prev, activeChat].filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i)); 
                        setActiveBubbleView(activeChat.id); 
                    }
                    setBubblePos({ x: window.innerWidth - 80, y: 100 });
                    closeChat(); 
                    setActiveTab("FindJobs"); 
                }}
                isChatMinimized={isChatMinimized}
                setIsChatMinimized={setIsChatMinimized}
                isBubbleVisible={isBubbleVisible}
                setIsBubbleVisible={setIsBubbleVisible}
                openBubbles={openBubbles}
                setOpenBubbles={setOpenBubbles}
                activeBubbleView={activeBubbleView}
                setActiveBubbleView={setActiveBubbleView}
                markConversationAsRead={markConversationAsRead}
                bubbleSearch={bubbleSearch}
                setBubbleSearch={setBubbleSearch}
                isDesktopInboxVisible={isDesktopInboxVisible}
                setIsDesktopInboxVisible={setIsDesktopInboxVisible}
                chatSearch={chatSearch}
                setChatSearch={setChatSearch}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                attachment={attachment}
                setAttachment={setAttachment}
                isUploading={isUploading}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                chatFileRef={chatFileRef}
                bubbleFileRef={bubbleFileRef}
                scrollRef={scrollRef}
                handleSendMessageWrapper={handleSendMessageWrapper}
                handleFileSelect={handleFileSelect}
                formatTime={formatTime}
                getAvatarUrl={getAvatarUrl}
                isChatOptionsOpen={isChatOptionsOpen}
                setIsChatOptionsOpen={setIsChatOptionsOpen}
                
            />
        )}

        {activeTab === "Profile" && (
            <ProfileTab 
                applicantData={applicantData}
                setApplicantData={setApplicantData}
                profileImage={profileImage}
                setProfileImage={setProfileImage}
                imgScale={imgScale}
                setImgScale={setImgScale}
                isEditingProfile={isEditingProfile}
                setIsEditingProfile={setIsEditingProfile}
                fileInputRef={fileInputRef}
                isEditingImage={isEditingImage}
                setIsEditingImage={setIsEditingImage}
                loading={loading}
                setLoading={setLoading}
                handleSaveProfile={handleSaveProfile}
                currentUser={auth.currentUser}
                darkMode={darkMode}
                JOB_CATEGORIES={JOB_CATEGORIES}
                isProfileCategoryDropdownOpen={isProfileCategoryDropdownOpen}
                setIsProfileCategoryDropdownOpen={setIsProfileCategoryDropdownOpen}
                resumeImageFile={resumeImageFile}
                setResumeImageFile={setResumeImageFile}
                resumeDocFile={resumeDocFile}
                setResumeDocFile={setResumeDocFile}
                setLightboxUrl={setLightboxUrl}
            />
        )}

        {isVerified && activeTab === "Ratings" && (
            <RatingsTab currentUser={auth.currentUser} darkMode={darkMode} reviews={reviews} averageRating={averageRating} />
        )}

        {activeTab === "Support" && (
            <SupportTab 
                supportTickets={supportTickets}
                activeSupportTicket={activeSupportTicket}
                setActiveSupportTicket={setActiveSupportTicket}
                ticketMessage={ticketMessage}
                setTicketMessage={setTicketMessage}
                supportAttachment={supportAttachment}
                setSupportAttachment={setSupportAttachment}
                isSupportUploading={isSupportUploading}
                isSupportOpen={isSupportOpen}
                setIsSupportOpen={setIsSupportOpen}
                handleSendSupportMessage={handleSendSupportMessage}
                handleCloseSupportTicket={handleCloseSupportTicket}
                handleDeleteTicket={handleDeleteTicket}
                handleSendFAQ={handleSendFAQ}
                handleSupportFileSelect={handleSupportFileSelect}
                supportFileRef={supportFileRef}
                ticketScrollRef={ticketScrollRef}
                isBotTyping={isBotTyping}
                darkMode={darkMode}
                isMobile={isMobile}
                BOT_FAQ={BOT_FAQ}
            />
        )}

        {activeTab === "Announcements" && (
            <AnnouncementsTab announcements={announcements} darkMode={darkMode} />
        )}

      </main>

      {/* --- OVERLAYS: MODALS & BUBBLES --- */}
      
      {/* 1. JOB DETAILS MODAL */}
      {selectedJob && (() => {
          const theme = getModalTheme(selectedJob.category, darkMode);
          const typeStyle = getJobStyle(selectedJob.type);
          const isSaved = savedJobs.some(s => s.jobId === selectedJob.id);

          return (
            <div className={`fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm animate-in fade-in ${darkMode ? 'bg-slate-950/60' : 'bg-slate-900/40'}`} onClick={() => setSelectedJob(null)}>
                <div 
                   onClick={(e) => e.stopPropagation()}
                   className={`relative w-[92vw] sm:w-full max-w-md md:max-w-4xl p-5 sm:p-8 rounded-[2rem] border animate-in zoom-in-95 duration-300 flex flex-col md:flex-row md:items-start md:gap-8 overflow-y-auto md:overflow-hidden max-h-[85vh] md:h-[80vh] hide-scrollbar ${darkMode ? 'bg-slate-900 border-white/10 text-white shadow-2xl' : 'bg-white border-slate-200 text-slate-900 shadow-xl'}`}
                >
                    <button onClick={() => setSelectedJob(null)} className={`absolute top-4 right-4 z-10 p-2 rounded-full transition-colors ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                        <XMarkIcon className="w-5 h-5"/>
                    </button>
                    
                   {/* --- LEFT SIDE: Employer Info --- */}
                    <div className="flex flex-col items-center md:w-1/3 shrink-0 w-full mb-4 md:mb-0 pt-2">
                        <div 
                            className={`w-16 h-16 sm:w-32 sm:h-32 rounded-2xl sm:rounded-[2rem] overflow-hidden mb-3 sm:mb-4 shrink-0 shadow-inner cursor-pointer hover:opacity-80 transition-opacity ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}
                            onClick={() => setModalRightView('profile')}
                        >
                            {(employerContact?.profilePic || selectedJob.employerLogo) ? (
                                <img src={employerContact?.profilePic || selectedJob.employerLogo} alt={selectedJob.employerName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-blue-600 flex items-center justify-center text-3xl sm:text-4xl font-black text-white uppercase">{selectedJob.employerName?.charAt(0)}</div>
                            )}
                        </div>
                        
                        <h2 
                            onClick={() => setModalRightView('profile')}
                            className={`text-xl sm:text-2xl font-black mb-3 text-center leading-tight w-full cursor-pointer transition-colors ${darkMode ? 'hover:text-blue-400 text-white' : 'hover:text-blue-500 text-slate-900'}`}
                            title="View Employer Profile"
                        >
                            {selectedJob.employerName}
                        </h2>

                        <div className={`flex flex-col gap-4 text-xs font-bold w-full items-center text-center cursor-default select-none ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 w-full">
                                <div className="flex items-center gap-1.5">
                                    <MapPinIcon className="w-4 h-4 shrink-0" />
                                    <span className={!selectedJob.sitio ? 'opacity-50 italic' : ''}>{selectedJob.sitio || "Location not set"}</span>
                                </div>
                                {(() => {
                                    const emailInfo = employerContact?.email || selectedJob.email;
                                    const phoneInfo = employerContact?.contact || selectedJob.contact;
                                    return (
                                        <>
                                            {emailInfo && (
                                                <div className="flex items-center gap-1.5" title="Email">
                                                    <EnvelopeIcon className="w-4 h-4 shrink-0" />
                                                    <span className="truncate max-w-[150px]">{emailInfo}</span>
                                                </div>
                                            )}
                                            {phoneInfo && (
                                                <div className="flex items-center gap-1.5" title="Phone Number">
                                                    <PhoneIcon className="w-4 h-4 shrink-0" />
                                                    <span className="truncate max-w-[150px]">{phoneInfo}</span>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 w-full">
                                <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1.5 ${theme.badge}`}>
                                    <span className="scale-75 w-3.5 h-3.5 flex items-center justify-center">{typeStyle.icon}</span>
                                    {selectedJob.type}
                                </span>
                                {selectedJob.category && (() => {
                                    const getLocalCatIcon = (id) => {
                                        const map = { 'EDUCATION': AcademicCapIcon, 'AGRICULTURE': SunIcon, 'AUTOMOTIVE': Cog8ToothIcon, 'CARPENTRY': WrenchScrewdriverIcon, 'HOUSEHOLD': HomeIcon, 'CUSTOMER_SERVICE': UserGroupIcon };
                                        return map[id] || TagIcon;
                                    };
                                    const CatIcon = getLocalCatIcon(selectedJob.category);
                                    return (
                                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1.5 ${theme.badge}`}>
                                            <CatIcon className="w-3.5 h-3.5" />
                                            {JOB_CATEGORIES.find(c => c.id === selectedJob.category)?.label || selectedJob.category}
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* --- RIGHT SIDE: TABS AND CONTENT --- */}
                    <div className="w-full md:w-2/3 flex flex-col flex-1 min-h-[40vh] md:min-h-0 md:h-full overflow-visible md:overflow-hidden mt-4 md:mt-0">
                        
                        {/* Right Panel Tabs */}
                        <div className={`flex flex-wrap gap-2 p-1.5 rounded-2xl mb-4 shrink-0 border ${darkMode ? 'bg-slate-800/50 border-white/5' : 'bg-slate-100 border-transparent'}`}>
                            <button onClick={() => setModalRightView('job')} className={`flex-1 min-w-[80px] py-2 text-[10px] sm:text-xs font-bold rounded-xl transition-all ${modalRightView === 'job' ? (darkMode ? 'bg-slate-700 text-white shadow-sm border border-white/10' : 'bg-white text-blue-600 shadow-sm border border-slate-200') : (darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50')}`}>
                                Job Details
                            </button>
                            <button onClick={() => setModalRightView('profile')} className={`flex-1 min-w-[80px] py-2 text-[10px] sm:text-xs font-bold rounded-xl transition-all ${modalRightView === 'profile' ? (darkMode ? 'bg-slate-700 text-white shadow-sm border border-white/10' : 'bg-white text-blue-600 shadow-sm border border-slate-200') : (darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50')}`}>
                                Employer Profile
                            </button>
                            <button onClick={() => setModalRightView('reputation')} className={`flex-1 min-w-[80px] py-2 text-[10px] sm:text-xs font-bold rounded-xl transition-all ${modalRightView === 'reputation' ? (darkMode ? 'bg-slate-700 text-white shadow-sm border border-white/10' : 'bg-white text-blue-600 shadow-sm border border-slate-200') : (darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50')}`}>
                                Reputation
                            </button>
                        </div>

                        {/* Scrollable Content Area */}
                        <div className="flex-1 overflow-y-auto hide-scrollbar pb-2 pr-2">
                            
                            {modalRightView === 'job' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                    <div className={`p-5 rounded-2xl ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                        <p className={`text-[10px] font-black uppercase tracking-widest opacity-40 mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Job Title</p>
                                        <h2 className={`text-3xl sm:text-4xl font-black mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedJob.title}</h2>
                                    </div>

                                    <div className={`p-5 rounded-2xl flex items-center justify-between ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                        <div>
                                            <p className={`text-[10px] font-black uppercase tracking-widest opacity-40 mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Salary</p>
                                            <div className={`flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                <span className="text-xl font-black">₱</span>
                                                <span className="text-xl font-black">{selectedJob.salary}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`p-5 rounded-2xl flex-1 ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                        <p className={`text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Job Description</p>
                                        <p className={`text-sm opacity-90 leading-relaxed whitespace-pre-wrap font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{selectedJob.description || "No description provided."}</p>
                                    </div>
                                </div>
                            )}

                            {modalRightView === 'profile' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                    <div className={`p-5 rounded-2xl ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                        <p className={`text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>About the Employer</p>
                                        <p className={`text-sm opacity-90 leading-relaxed whitespace-pre-wrap font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{employerContact?.bio || "No description provided."}</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className={`p-4 rounded-2xl flex items-center gap-3 ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                            <EnvelopeIcon className={`w-5 h-5 opacity-80 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}/>
                                            <div className="overflow-hidden">
                                                <p className={`text-[10px] font-black uppercase tracking-widest opacity-40 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Email</p>
                                                <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>{employerContact?.email || selectedJob.email || "N/A"}</p>
                                            </div>
                                        </div>
                                        <div className={`p-4 rounded-2xl flex items-center gap-3 ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                            <PhoneIcon className={`w-5 h-5 opacity-80 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}/>
                                            <div className="overflow-hidden">
                                                <p className={`text-[10px] font-black uppercase tracking-widest opacity-40 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Contact</p>
                                                <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>{employerContact?.contact || selectedJob.contact || "N/A"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {modalRightView === 'reputation' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                    <div className={`p-6 rounded-3xl flex flex-col items-center justify-center text-center ${darkMode ? 'bg-blue-900/20 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}>
                                        <h3 className="text-5xl font-black text-amber-500 mb-2">{employerAverageRating}</h3>
                                        <div className="flex gap-1 mb-2 text-amber-500">
                                            {[1,2,3,4,5].map(star => (
                                                <span key={star}>{star <= Math.round(employerAverageRating) ? <StarIconSolid className="w-6 h-6"/> : <StarIconOutline className="w-6 h-6 opacity-30"/>}</span>
                                            ))}
                                        </div>
                                        <p className={`text-[10px] font-black uppercase tracking-widest opacity-40 mt-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Based on {employerReviews.length} Reviews</p>
                                    </div>

                                    <div className="space-y-4">
                                        {employerReviews.length === 0 ? (
                                            <p className={`text-center text-sm opacity-50 font-bold py-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No reviews yet.</p>
                                        ) : (
                                            employerReviews.map((review, idx) => (
                                                <div key={idx} className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-800/50 border-white/10' : 'bg-white border-slate-200'}`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex gap-0.5 text-amber-500">
                                                            {[1,2,3,4,5].map(star => (
                                                                <span key={star}>{star <= review.rating ? <StarIconSolid className="w-4 h-4"/> : <StarIconOutline className="w-4 h-4 opacity-30"/>}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <p className={`text-sm font-medium leading-relaxed ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>"{review.comment}"</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>

                       {/* --- THEMED ACTIONS (Pinned to bottom) --- */}
                        <div className={`w-full flex gap-3 pt-4 mt-2 shrink-0 border-t ${darkMode ? 'border-white/10' : 'border-slate-100'}`}>
                            {(() => {
                                const isAtCapacity = selectedJob.capacity > 0 && (selectedJob.applicationCount || 0) >= selectedJob.capacity;
                                const hasApplied = myApplications.some(app => app.jobId === selectedJob.id && app.status !== 'withdrawn' && app.status !== 'rejected');

                                if (hasApplied) {
                                    return (
                                        <button disabled className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest cursor-not-allowed border ${theme.appliedBtn}`}>
                                            Application Sent
                                        </button>
                                    );
                                } else if (isAtCapacity) {
                                    return (
                                        <button disabled className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest cursor-not-allowed border ${darkMode ? 'bg-slate-800/50 text-slate-500 border-white/10' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                            Capacity Reached
                                        </button>
                                    );
                                } else {
                                    return (
                                        <button onClick={() => handleApplyToJob(selectedJob)} className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all ${theme.solid}`}>
                                            Apply Now
                                        </button>
                                    );
                                }
                            })()}
                            
                            <button onClick={() => handleToggleSaveJob(selectedJob)} className={`flex-none p-4 rounded-xl transition-all border ${isSaved ? theme.saveActive : theme.saveIdle}`}>
                                <BookmarkIcon className={`w-6 h-6 ${isSaved ? 'fill-current' : ''}`}/>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          );
      })()}

      {/* 2. APPLICATION DETAILS MODAL */}
      {viewingApplication && (() => {
        const theme = getModalTheme(modalJobDetails?.category, darkMode);
        return (
        <div className={`fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm animate-in fade-in ${darkMode ? 'bg-slate-950/60' : 'bg-slate-900/40'}`} onClick={() => setViewingApplication(null)}>
            <div 
                className={`relative w-[92vw] sm:w-full max-w-md md:max-w-4xl p-5 sm:p-8 rounded-[2rem] border animate-in zoom-in-95 duration-300 flex flex-col md:flex-row md:items-start md:gap-8 overflow-y-auto md:overflow-hidden max-h-[85vh] md:h-[80vh] hide-scrollbar ${darkMode ? 'bg-slate-900 border-white/10 text-white shadow-2xl' : 'bg-white border-slate-200 text-slate-900 shadow-xl'}`} 
                onClick={e => e.stopPropagation()}
            >
                
                <button onClick={() => setViewingApplication(null)} className={`absolute top-4 right-4 z-20 p-2 rounded-full transition-colors border shadow-sm ${darkMode ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'}`}><XMarkIcon className="w-5 h-5"/></button>
                
                {/* --- LEFT SIDE: Employer Info --- */}
                <div className="flex flex-col items-center md:w-1/3 shrink-0 w-full mb-4 md:mb-0 pt-2">
                    <div 
                        className={`w-16 h-16 sm:w-32 sm:h-32 rounded-2xl sm:rounded-[2rem] overflow-hidden mb-3 sm:mb-4 shrink-0 shadow-inner cursor-pointer hover:opacity-80 transition-opacity ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}
                        onClick={() => setModalRightView('profile')}
                    >
                         {/* PRIORITY TO LIVE EMPLOYER DATA */}
                        {(employerContact?.profilePic || viewingApplication.employerLogo) ? (
                            <img src={employerContact?.profilePic || viewingApplication.employerLogo} alt={viewingApplication.employerName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-blue-600 flex items-center justify-center text-3xl sm:text-4xl font-black text-white uppercase">{viewingApplication.employerName?.charAt(0)}</div>
                        )}
                    </div>
                    
                    <h2 
                        onClick={() => setModalRightView('profile')}
                        className={`text-xl sm:text-2xl font-black mb-3 text-center leading-tight w-full cursor-pointer transition-colors ${darkMode ? 'hover:text-blue-400 text-white' : 'hover:text-blue-500 text-slate-900'}`}
                        title="View Employer Profile"
                    >
                        {viewingApplication.employerName}
                    </h2>
                    
                    {modalLoading ? (
                        <div className="w-full flex justify-center opacity-50 pt-2"><div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div></div>
                    ) : (
                        <div className={`flex flex-col gap-4 text-xs font-bold w-full items-center text-center cursor-default select-none ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 w-full">
                                <div className="flex items-center gap-1.5">
                                    <MapPinIcon className="w-4 h-4 shrink-0" />
                                    <span className={!modalJobDetails?.sitio ? 'opacity-50 italic' : ''}>{modalJobDetails?.sitio || "Location not set"}</span>
                                </div>
                                {(() => {
                                    const emailInfo = employerContact?.email || modalJobDetails?.email;
                                    const phoneInfo = employerContact?.contact || modalJobDetails?.contact;
                                    return (
                                        <>
                                            {emailInfo && (
                                                <div className="flex items-center gap-1.5" title="Email">
                                                    <EnvelopeIcon className="w-4 h-4 shrink-0" />
                                                    <span className="truncate max-w-[150px]">{emailInfo}</span>
                                                </div>
                                            )}
                                            {phoneInfo && (
                                                <div className="flex items-center gap-1.5" title="Phone Number">
                                                    <PhoneIcon className="w-4 h-4 shrink-0" />
                                                    <span className="truncate max-w-[150px]">{phoneInfo}</span>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            {(modalJobDetails?.type || modalJobDetails?.category) && (
                                <div className="mt-1 flex flex-wrap items-center justify-center gap-2 w-full">
                                    {modalJobDetails?.type && (() => {
                                        const typeStyle = getJobStyle(modalJobDetails.type);
                                        return (
                                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1.5 ${theme.badge}`}>
                                                <span className="scale-75 w-3.5 h-3.5 flex items-center justify-center">{typeStyle.icon}</span>
                                                {modalJobDetails.type}
                                            </span>
                                        )
                                    })()}
                                    {modalJobDetails?.category && (() => {
                                        const getLocalCatIcon = (id) => {
                                            const map = { 'EDUCATION': AcademicCapIcon, 'AGRICULTURE': SunIcon, 'AUTOMOTIVE': Cog8ToothIcon, 'CARPENTRY': WrenchScrewdriverIcon, 'HOUSEHOLD': HomeIcon, 'CUSTOMER_SERVICE': UserGroupIcon };
                                            return map[id] || TagIcon;
                                        };
                                        const CatIcon = getLocalCatIcon(modalJobDetails.category);
                                        return (
                                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1.5 ${theme.badge}`}>
                                                <CatIcon className="w-3.5 h-3.5" />
                                                {JOB_CATEGORIES.find(c => c.id === modalJobDetails.category)?.label || modalJobDetails.category}
                                            </span>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* --- RIGHT SIDE: TABS AND CONTENT --- */}
                <div className="w-full md:w-2/3 flex flex-col flex-1 min-h-[40vh] md:min-h-0 md:h-full overflow-visible md:overflow-hidden mt-4 md:mt-0">
                    
                    <div className={`flex flex-wrap gap-2 p-1.5 rounded-2xl mb-4 shrink-0 border ${darkMode ? 'bg-slate-800/50 border-white/5' : 'bg-slate-100 border-transparent'}`}>
                        <button onClick={() => setModalRightView('job')} className={`flex-1 min-w-[80px] py-2 text-[10px] sm:text-xs font-bold rounded-xl transition-all border ${modalRightView === 'job' ? (darkMode ? 'bg-slate-700 text-white shadow-sm border-white/10' : 'bg-white text-blue-600 shadow-sm border-slate-200') : (darkMode ? 'border-transparent text-slate-400 hover:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50')}`}>
                            Application
                        </button>
                        <button onClick={() => setModalRightView('profile')} className={`flex-1 min-w-[80px] py-2 text-[10px] sm:text-xs font-bold rounded-xl transition-all border ${modalRightView === 'profile' ? (darkMode ? 'bg-slate-700 text-white shadow-sm border-white/10' : 'bg-white text-blue-600 shadow-sm border-slate-200') : (darkMode ? 'border-transparent text-slate-400 hover:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50')}`}>
                            Employer Profile
                        </button>
                        <button onClick={() => setModalRightView('reputation')} className={`flex-1 min-w-[80px] py-2 text-[10px] sm:text-xs font-bold rounded-xl transition-all border ${modalRightView === 'reputation' ? (darkMode ? 'bg-slate-700 text-white shadow-sm border-white/10' : 'bg-white text-blue-600 shadow-sm border-slate-200') : (darkMode ? 'border-transparent text-slate-400 hover:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50')}`}>
                            Reputation
                        </button>
                    </div>

                    {modalLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50 py-20">
                            <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-white' : 'text-slate-900'}`}>Loading Details...</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 md:overflow-y-auto hide-scrollbar pb-2 md:pr-2">
                                {modalRightView === 'job' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                        <div className={`p-5 rounded-2xl ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                            <div className="flex justify-between items-start mb-1">
                                                <p className={`text-[10px] font-black uppercase tracking-widest opacity-40 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Job Title</p>
                                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${viewingApplication.status === 'accepted' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : viewingApplication.status === 'rejected' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : viewingApplication.status === 'withdrawn' ? 'bg-slate-500/10 text-slate-500 border border-slate-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${viewingApplication.status === 'accepted' ? 'bg-blue-500' : viewingApplication.status === 'rejected' ? 'bg-red-500' : viewingApplication.status === 'withdrawn' ? 'bg-slate-500' : 'bg-amber-500'}`}></span>
                                                    {viewingApplication.status}
                                                </div>
                                            </div>
                                            <h2 className={`text-3xl sm:text-4xl font-black mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{viewingApplication.jobTitle}</h2>
                                        </div>

                                        <div className={`p-5 rounded-2xl flex items-center justify-between ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                            <div>
                                                <p className={`text-[10px] font-black uppercase tracking-widest opacity-40 mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Salary</p>
                                                <div className={`flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                    <span className="text-xl font-black">₱</span>
                                                    <span className="text-xl font-black">{modalJobDetails?.salary || "N/A"}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`p-5 rounded-2xl flex-1 ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Job Description</p>
                                            <p className={`text-sm opacity-90 leading-relaxed whitespace-pre-wrap font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{modalJobDetails?.description || "Description not available."}</p>
                                        </div>
                                    </div>
                                )}

                                {modalRightView === 'profile' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                        <div className={`p-5 rounded-2xl ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>About the Employer</p>
                                            <p className={`text-sm opacity-90 leading-relaxed whitespace-pre-wrap font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{employerContact?.bio || "No description provided."}</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className={`p-4 rounded-2xl flex items-center gap-3 ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                                <EnvelopeIcon className={`w-5 h-5 opacity-80 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}/>
                                                <div className="overflow-hidden">
                                                    <p className={`text-[10px] font-black uppercase tracking-widest opacity-40 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Email</p>
                                                    <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>{employerContact?.email || modalJobDetails?.email || "N/A"}</p>
                                                </div>
                                            </div>
                                            <div className={`p-4 rounded-2xl flex items-center gap-3 ${darkMode ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                                                <PhoneIcon className={`w-5 h-5 opacity-80 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}/>
                                                <div className="overflow-hidden">
                                                    <p className={`text-[10px] font-black uppercase tracking-widest opacity-40 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Contact</p>
                                                    <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>{employerContact?.contact || modalJobDetails?.contact || "N/A"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {modalRightView === 'reputation' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                        <div className={`p-6 rounded-3xl flex flex-col items-center justify-center text-center ${darkMode ? 'bg-blue-900/20 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}>
                                            <h3 className="text-5xl font-black text-amber-500 mb-2">{employerAverageRating}</h3>
                                            <div className="flex gap-1 mb-2 text-amber-500">
                                                {[1,2,3,4,5].map(star => (
                                                    <span key={star}>{star <= Math.round(employerAverageRating) ? <StarIconSolid className="w-6 h-6"/> : <StarIconOutline className="w-6 h-6 opacity-30"/>}</span>
                                                ))}
                                            </div>
                                            <p className={`text-[10px] font-black uppercase tracking-widest opacity-40 mt-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Based on {employerReviews.length} Reviews</p>
                                        </div>

                                        <div className="space-y-4">
                                            {employerReviews.length === 0 ? (
                                                <p className={`text-center text-sm opacity-50 font-bold py-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No reviews yet.</p>
                                            ) : (
                                                employerReviews.map((review, idx) => (
                                                    <div key={idx} className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-800/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex gap-0.5 text-amber-500">
                                                                {[1,2,3,4,5].map(star => (
                                                                    <span key={star}>{star <= review.rating ? <StarIconSolid className="w-4 h-4"/> : <StarIconOutline className="w-4 h-4 opacity-30"/>}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <p className={`text-sm font-medium leading-relaxed ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>"{review.comment}"</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions (Pinned to bottom) */}
                            <div className={`flex gap-4 pt-4 mt-2 shrink-0 border-t ${darkMode ? 'border-white/10' : 'border-slate-100'}`}>
                                <button onClick={() => handleWithdrawApplication(viewingApplication.id)} className={`flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] border active:scale-95 transition-transform ${darkMode ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-500/30 text-red-600 hover:bg-red-50'}`}>
                                    {viewingApplication.status === 'rejected' || viewingApplication.status === 'withdrawn' ? 'Delete Record' : 'Withdraw Application'}
                                </button>
                                {viewingApplication.status === 'accepted' ? (
                                    <button onClick={() => { handleStartChatFromExternal({ id: viewingApplication.employerId, name: viewingApplication.employerName, profilePic: viewingApplication.employerLogo || null }); setViewingApplication(null); }} className={`flex-[2] py-4 rounded-xl font-black uppercase tracking-widest text-[10px] text-white hover:bg-blue-500 active:scale-95 transition-all ${darkMode ? 'bg-blue-600 shadow-lg shadow-blue-600/20' : 'bg-blue-600 shadow-lg shadow-blue-600/30'}`}>
                                        Message Employer
                                    </button>
                                ) : (
                                    <button disabled className={`flex-[2] py-4 rounded-xl font-black uppercase tracking-widest text-[10px] cursor-not-allowed border ${darkMode ? 'bg-slate-800/50 text-slate-500 border-white/10 opacity-60' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                        {viewingApplication.status === 'rejected' ? 'Application Rejected' : viewingApplication.status === 'withdrawn' ? 'Application Withdrawn' : 'Pending Review'}
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
        )
      })()}

      <RateEmployerModal 
        isOpen={isRatingEmployerModalOpen}
        onClose={() => setIsRatingEmployerModalOpen(false)}
        onSubmit={handleSubmitEmployerRating}
        employerName={selectedEmployerToRate?.employerName || "Employer"}
        darkMode={darkMode} 
      />

      {/* 4. CHAT BUBBLES OVERLAY */}
      {isBubbleVisible && (
        isMobile ? (
            <>
                {!isBubbleExpanded && (
                    <div style={{ top: bubblePos.y, left: bubblePos.x }} className="fixed z-[201] touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                        <div className="relative">
                            <button onClick={(e) => { if (!isDragging) { setIsBubbleExpanded(true); if(effectiveActiveChatUser) { openChat(effectiveActiveChatUser); markConversationAsRead(effectiveActiveChatUser.id); } } }} className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-90 overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-white/80 border border-white/60 backdrop-blur-md'}`}>
                                {activeBubbleView !== 'inbox' && effectiveActiveChatUser ? ((getAvatarUrl(effectiveActiveChatUser) || effectiveActiveChatUser.profilePic) ? <img src={getAvatarUrl(effectiveActiveChatUser) || effectiveActiveChatUser.profilePic} className="w-full h-full object-cover" alt="pfp" /> : <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg">{effectiveActiveChatUser.name.charAt(0)}</div>) : <ChatBubbleOvalLeftEllipsisIcon className={`w-7 h-7 ${darkMode ? 'text-white' : 'text-blue-600'}`} />}
                            </button>
                            {(() => { const activeUnread = activeBubbleView !== 'inbox' && effectiveActiveChatUser ? (conversations.find(c => c.chatId.includes(effectiveActiveChatUser.id))?.[`unread_${auth.currentUser.uid}`] || 0) : conversations.reduce((acc, curr) => acc + (curr[`unread_${auth.currentUser?.uid}`] || 0), 0); return activeUnread > 0 ? <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm pointer-events-none z-10 animate-in zoom-in border-none">{activeUnread}</span> : null; })()}
                        </div>
                    </div>
                )}
                {isDragging && <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] w-16 h-16 rounded-full flex items-center justify-center border-4 animate-in zoom-in backdrop-blur-md ${darkMode ? 'border-slate-500/30 bg-slate-800/40' : 'border-blue-400/30 bg-white/40'}`}><XMarkIcon className={`w-8 h-8 ${darkMode ? 'text-slate-400' : 'text-blue-600'}`} /></div>}
                {isBubbleExpanded && (
                    <div className={`fixed inset-0 z-[1000] flex flex-col backdrop-blur-sm animate-in fade-in duration-200 ${darkMode ? 'bg-black/60' : 'bg-slate-900/40'}`}>
                        <div className="pt-12 px-4 pb-4 flex items-center gap-4 overflow-x-auto hide-scrollbar pointer-events-auto">
                            {openBubbles.map((chat) => {
                                const unread = chat[`unread_${auth.currentUser.uid}`] || 0;
                                const chatPic = chat.profilePic || conversations.find(c => c.chatId.includes(chat.id))?.profilePics?.[chat.id];
                                return (
                                    <div key={chat.id} className="relative group flex flex-col items-center gap-1 shrink-0">
                                        <button onClick={() => { setActiveBubbleView(chat.id); openChat(chat); markConversationAsRead(chat.id); }} className={`w-14 h-14 rounded-full overflow-hidden shadow-lg transition-all border-2 ${darkMode ? 'border-white/10' : 'border-white/60'} ${activeBubbleView === chat.id ? 'scale-110 shadow-blue-500/50' : 'opacity-80'}`}>
                                            {chatPic ? <img src={chatPic} className="w-full h-full object-cover" alt="pfp" /> : <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">{chat.name.charAt(0)}</div>}
                                        </button>
                                        {unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full shadow-sm z-20 border-none">{unread}</span>}
                                        {activeBubbleView === chat.id && (<button onClick={(e) => { e.stopPropagation(); const newBubbles = openBubbles.filter(b => b.id !== chat.id); setOpenBubbles(newBubbles); if(activeBubbleView === chat.id) { setActiveBubbleView(newBubbles.length ? newBubbles[0].id : 'inbox'); } }} className={`absolute -top-1 -right-1 text-white rounded-full p-0.5 shadow-md animate-in zoom-in border-none ${darkMode ? 'bg-slate-500' : 'bg-slate-600'}`}><XMarkIcon className="w-3 h-3"/></button>)}
                                    </div>
                                );
                            })}
                            <div className="flex flex-col items-center gap-1 shrink-0">
                                <button onClick={() => setActiveBubbleView('inbox')} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all backdrop-blur-md border ${darkMode ? 'bg-slate-800/80 border-white/10' : 'bg-white/60 border-white/60'} ${activeBubbleView === 'inbox' ? 'scale-110 shadow-blue-500/30' : 'opacity-80'}`}><ChatBubbleOvalLeftEllipsisIcon className={`w-7 h-7 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} /></button>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col justify-end relative" onClick={() => setIsBubbleExpanded(false)}>
                            <div className={`w-full h-[80vh] rounded-t-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300 backdrop-blur-xl border ${darkMode ? 'bg-slate-900/90 border-white/10 text-white' : 'bg-white/80 border-white/60 text-blue-900'}`} onClick={(e) => e.stopPropagation()}>
                                {activeBubbleView === 'inbox' ? (
                                    <div className="flex flex-col h-full">
                                        <div className={`p-5 flex justify-between items-center border-b ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white/50 border-white/60'}`}>
                                            <h3 className={`font-black text-2xl ${darkMode ? 'text-white' : 'text-blue-900'}`}>Chats</h3>
                                            <button onClick={() => setIsBubbleExpanded(false)} className={`p-2 shadow-sm rounded-full ${darkMode ? 'bg-white/10 text-white' : 'bg-white/60 text-blue-600'}`}><ChevronDownIcon className="w-5 h-5"/></button> 
                                        </div>
                                        <div className={`px-5 py-3 border-b ${darkMode ? 'bg-slate-800/50 border-white/10' : 'bg-white/30 border-white/60'}`}><div className={`flex items-center p-2 rounded-xl border shadow-inner ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white/60 border-white/60'}`}><MagnifyingGlassIcon className={`w-4 h-4 ml-2 ${darkMode ? 'text-slate-400' : 'text-blue-400'}`} /><input value={bubbleSearch} onChange={(e) => setBubbleSearch(e.target.value)} placeholder="Search..." className={`bg-transparent border-none outline-none text-xs p-1.5 w-full font-bold ${darkMode ? 'text-white placeholder-slate-500' : 'text-blue-900 placeholder-blue-300'}`} /></div></div>
                                        <div className={`flex-1 overflow-y-auto p-2 hide-scrollbar ${darkMode ? 'bg-slate-900/30' : 'bg-white/30'}`}>
                                            {bubbleFilteredChats.map(c => {
                                                const otherId = c.participants.find(p => p !== auth.currentUser.uid);
                                                const name = c.names?.[otherId] || "User";
                                                const otherPic = c.profilePics?.[otherId];
                                                const unread = c[`unread_${auth.currentUser.uid}`] || 0;
                                                return (
                                                    <button key={c.chatId} onClick={() => { const userObj = { id: otherId, name, profilePic: otherPic }; if(!openBubbles.find(b => b.id === userObj.id)) { setOpenBubbles(prev => [userObj, ...prev]); } openChat(userObj); setActiveBubbleView(otherId); markConversationAsRead(otherId); }} className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-colors ${darkMode ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-white/50 text-blue-900'}`}>
                                                        <div className={`w-11 h-11 rounded-full overflow-hidden shrink-0 shadow-inner border flex items-center justify-center ${darkMode ? 'bg-slate-800 border-white/10 text-blue-400' : 'bg-white/60 border-white/60 text-blue-600'}`}>{otherPic ? <img src={otherPic} className="w-full h-full object-cover" alt="other-pfp" /> : <span className="font-bold">{name.charAt(0)}</span>}</div>
                                                        <div className="flex-1 text-left overflow-hidden">
                                                            <div className="flex justify-between items-center"><span className="font-black text-sm truncate">{name}</span><span className={`text-[9px] font-bold opacity-60 ${darkMode ? 'text-slate-400' : 'text-blue-600'}`}>{formatTime(c.lastTimestamp)}</span></div>
                                                            <div className="flex justify-between items-center"><p className="text-[11px] truncate font-medium opacity-70">{c.lastMessage}</p>{unread > 0 && <span className="min-w-[14px] h-[14px] flex items-center justify-center bg-blue-500 text-white text-[9px] rounded-full px-1 font-bold">{unread}</span>}</div>
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    effectiveActiveChatUser && (
                                        <>
                                            <div className={`p-4 flex justify-between items-center shrink-0 border-b ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white/50 border-white/60'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full overflow-hidden shadow-inner ${darkMode ? 'bg-slate-800 text-blue-400' : 'bg-white/60 text-blue-600'}`}>{(getAvatarUrl(effectiveActiveChatUser) || effectiveActiveChatUser.profilePic) ? <img src={getAvatarUrl(effectiveActiveChatUser) || effectiveActiveChatUser.profilePic} className="w-full h-full object-cover" alt="header-pfp" /> : <span className="flex items-center justify-center h-full font-bold">{effectiveActiveChatUser.name.charAt(0)}</span>}</div>
                                                    <div>
                                                        <h3 className={`font-black text-base leading-none ${darkMode ? 'text-white' : 'text-blue-900'}`}>{effectiveActiveChatUser.name}</h3>
                                                        <p className={`text-[10px] font-bold opacity-70 uppercase flex items-center gap-1 mt-0.5 ${darkMode ? 'text-slate-400' : 'text-blue-600'}`}>
                                                            {(() => {
                                                                const status = formatLastSeen(conversations.find(c => c.chatId.includes(effectiveActiveChatUser.id))?.lastTimestamp);
                                                                return <><span className={`w-2 h-2 rounded-full ${status.isOnline ? 'bg-green-500' : 'bg-slate-400'}`}></span> {status.text}</>;
                                                            })()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={`flex gap-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}><button onClick={() => setIsBubbleExpanded(false)}><ChevronDownIcon className="w-6 h-6"/></button></div>
                                            </div>
                                            
                                            <div className={`flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar ${darkMode ? 'bg-slate-900/30' : 'bg-white/30'}`} onClick={() => setActiveMenuId(null)}>
                                                {messages.map((msg, index) => {
                                                    const isMe = msg.senderId === auth.currentUser.uid;
                                                    const myPic = profileImage || applicantData?.profilePic || null;
                                                    const otherPic = effectiveActiveChatUser?.profilePic || getAvatarUrl(effectiveActiveChatUser) || null;
                                                    
                                                    const currentConv = conversations.find(c => c.participants?.includes(auth.currentUser.uid) && c.participants?.includes(effectiveActiveChatUser.id));
                                                    const unreadByOther = currentConv ? (currentConv[`unread_${effectiveActiveChatUser.id}`] || 0) : 0;
                                                    const isUnseen = (messages.length - 1 - index) < unreadByOther;
                                                    const status = formatLastSeen(currentConv?.lastTimestamp);
                                                    
                                                    let statusText = "";
                                                    if (isMe && !msg.isUnsent) {
                                                        if (!isUnseen) statusText = "Seen";
                                                        else if (status.isOnline) statusText = "Delivered";
                                                        else statusText = "Sent";
                                                    }

                                                    return (
                                                        <MessageBubble
                                                            key={msg.id}
                                                            msg={msg}
                                                            isMe={isMe}
                                                            isMobile={true}
                                                            darkMode={darkMode}
                                                            myPic={myPic}
                                                            otherPic={otherPic}
                                                            senderName={effectiveActiveChatUser?.name}
                                                            statusText={statusText}
                                                            formatTime={formatTime}
                                                            setLightboxUrl={setLightboxUrl}
                                                            setReplyingTo={setReplyingTo}
                                                            togglePinMessage={togglePinMessage}
                                                            unsendMessage={unsendMessage}
                                                            activeMenuId={activeMenuId}
                                                            setActiveMenuId={setActiveMenuId}
                                                            menuPosition={menuPosition}
                                                            setMenuPosition={setMenuPosition}
                                                        />
                                                    );
                                                })}
                                                <div ref={scrollRef}/>
                                            </div>
                                            
                                            <div className={`p-3 shrink-0 border-t ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white/50 border-white/60'}`} onClick={() => setActiveMenuId(null)}>
                                               {replyingTo && (
    <div className={`mb-2 flex justify-between items-center p-2.5 rounded-xl border-l-4 border-blue-500 text-[10px] font-bold ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
        <div className="flex flex-col">
            <span className="text-blue-500 uppercase">Replying to {replyingTo.senderId === auth.currentUser.uid ? 'You' : (effectiveActiveChatUser?.name || activeChat?.name || 'User')}</span>
            <span className={`truncate max-w-[200px] font-medium ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>
                {replyingTo.isUnsent ? "Message unsent" : (replyingTo.fileType ? `[${replyingTo.fileType}]` : replyingTo.text)}
            </span>
        </div>
        <button onClick={() => setReplyingTo(null)}><XMarkIcon className="w-4 h-4 text-slate-400 hover:text-red-500"/></button>
    </div>
)}
                                                <form onSubmit={handleSendMessageWrapper} className="flex gap-2 items-center">
                                                    <input type="file" ref={bubbleFileRef} onChange={handleFileSelect} className="hidden" />
                                                    <button type="button" onClick={() => bubbleFileRef.current.click()} className={`p-2 rounded-xl shadow-sm border ${darkMode ? 'text-blue-400 bg-slate-800/50 hover:bg-slate-800 border-white/10' : 'text-blue-600 bg-white/40 hover:bg-white/60 border-white/60'}`}><PaperClipIcon className="w-5 h-5"/></button>
                                                    <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Aa" className={`flex-1 px-4 py-2.5 text-sm outline-none rounded-full shadow-inner font-medium border ${darkMode ? 'bg-slate-900/50 border-white/10 text-white placeholder-slate-500' : 'bg-white/60 border-white/60 text-blue-900 placeholder-blue-900/40'}`} />
                                                    <button type="submit" disabled={(!newMessage.trim() && !attachment) || isUploading} className="p-2 text-white bg-blue-600 rounded-full shadow-md disabled:opacity-50 active:scale-90 transition-transform">{isUploading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <PaperAirplaneIcon className="w-5 h-5" />}</button>
                                                </form>
                                            </div>
                                        </>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </>
        ) : (
            // --- DESKTOP VIEW BUBBLES ---
            <div className="fixed z-[200] bottom-6 right-4 md:right-6 flex flex-col-reverse items-end gap-3 pointer-events-none">
                <div className="pointer-events-auto relative">
                    <button onClick={() => { setIsDesktopInboxVisible(!isDesktopInboxVisible); setActiveChat(null); }} className="group relative w-12 h-12 md:w-14 md:h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-90 overflow-hidden bg-blue-600 border-2 border-white">
                        <ChatBubbleLeftRightIcon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                    </button>
                    {conversations.reduce((acc, curr) => acc + (curr[`unread_${auth.currentUser?.uid}`] || 0), 0) > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm pointer-events-none z-20 animate-bounce border-none">{conversations.reduce((acc, curr) => acc + (curr[`unread_${auth.currentUser?.uid}`] || 0), 0)}</span>}
                </div>
                {openBubbles.map((chat) => {
                    const unread = chat[`unread_${auth.currentUser.uid}`] || 0;
                    const chatPic = chat.profilePic || conversations.find(c => c.chatId.includes(chat.id))?.profilePics?.[chat.id];
                    return (
                    <div key={chat.id} className="pointer-events-auto relative group flex items-center gap-3">
                        <span className={`absolute right-full mr-3 px-3 py-1.5 rounded-xl backdrop-blur-md border text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl ${darkMode ? 'bg-slate-800/80 border-white/10 text-white' : 'bg-white/80 border-white/60 text-blue-900'}`}>{chat.name}</span>
                        <div className="relative">
                            <button onClick={() => { openChat(chat); setIsChatMinimized(false); setIsDesktopInboxVisible(false); markConversationAsRead(chat.id); }} className={`w-12 h-12 md:w-14 md:h-14 rounded-full shadow-xl border-2 overflow-hidden transition-all hover:scale-110 active:scale-95 ${darkMode ? 'border-white/10 bg-slate-800' : 'border-white/60 bg-white/60'}`}>
                                {chatPic ? (<img src={chatPic} alt="pfp" className="w-full h-full object-cover" />) : (<div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-black text-lg">{chat.name.charAt(0)}</div>)}
                            </button>
                            {unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm z-20 animate-bounce border-none">{unread}</span>}
                            <button onClick={(e) => { e.stopPropagation(); setOpenBubbles(prev => prev.filter(b => b.id !== chat.id)); if (openBubbles.length <= 1) setIsBubbleVisible(false); }} className={`absolute -top-1 -left-1 w-5 h-5 backdrop-blur-md border rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm ${darkMode ? 'bg-slate-800/80 border-white/10 text-white' : 'bg-white/80 border-white/60 text-slate-500'}`}><XMarkIcon className="w-3 h-3" /></button>
                        </div>
                    </div>
                )})}
                {isDesktopInboxVisible && !activeChat && (
                    <div className="fixed z-[210] pointer-events-auto bottom-6 right-24 animate-in slide-in-from-right-4 duration-300">
                        <div className={`w-[320px] h-[450px] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl border ${darkMode ? 'bg-slate-900/90 border-white/10' : 'bg-white/80 border-white/60'}`}>
                            <div className={`p-5 flex justify-between items-center border-b ${darkMode ? 'bg-slate-800/50 border-white/10' : 'bg-white/50 border-white/60'}`}>
                                <h3 className={`font-black text-lg ${darkMode ? 'text-white' : 'text-blue-900'}`}>Chats</h3>
                                <button onClick={() => setIsDesktopInboxVisible(false)} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-white/60 text-blue-600'}`}><XMarkIcon className="w-5 h-5"/></button>
                            </div>
                            <div className={`p-3 pb-0 ${darkMode ? 'bg-slate-900/30' : 'bg-white/30'}`}>
                                <div className={`flex items-center p-1.5 rounded-xl border shadow-inner ${darkMode ? 'bg-slate-800/50 border-white/10' : 'bg-white/60 border-white/60'}`}>
                                    <MagnifyingGlassIcon className={`w-4 h-4 ml-2 ${darkMode ? 'text-slate-400' : 'text-blue-400'}`} />
                                    <input value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="Search..." className={`bg-transparent border-none outline-none text-[11px] p-1.5 w-full font-bold ${darkMode ? 'text-white placeholder-slate-500' : 'text-blue-900 placeholder-blue-300'}`} />
                                </div>
                            </div>
                            <div className={`flex-1 overflow-y-auto p-2 hide-scrollbar ${darkMode ? 'bg-slate-900/30' : 'bg-white/30'}`}>
                                {filteredChats.map(c => {
                                    const otherId = c.participants.find(p => p !== auth.currentUser.uid);
                                    const name = c.names?.[otherId] || "User";
                                    const otherPic = c.profilePics?.[otherId];
                                    const unread = c[`unread_${auth.currentUser.uid}`] || 0;
                                    return (
                                        <button key={c.chatId} onClick={() => { const userObj = { id: otherId, name, profilePic: otherPic }; openChat(userObj); setIsDesktopInboxVisible(false); markConversationAsRead(otherId); }} className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-colors ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-white/60 text-blue-900'}`}>
                                            <div className={`w-11 h-11 rounded-full overflow-hidden shrink-0 shadow-inner border flex items-center justify-center ${darkMode ? 'bg-slate-800 border-white/10 text-blue-400' : 'bg-white/60 border-white/60 text-blue-600'}`}>{otherPic ? <img src={otherPic} className="w-full h-full object-cover" alt="pfp" /> : <span className="font-bold">{name.charAt(0)}</span>}</div>
                                            <div className="flex-1 text-left overflow-hidden">
                                                <div className="flex justify-between items-center"><span className="font-black text-sm truncate">{name}</span><span className={`text-[9px] font-bold opacity-60 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{formatTime(c.lastTimestamp)}</span></div>
                                                <div className="flex justify-between items-center"><p className="text-[11px] truncate font-medium opacity-70">{c.lastMessage}</p>{unread > 0 && <span className="min-w-[14px] h-[14px] flex items-center justify-center bg-blue-500 text-white text-[9px] rounded-full px-1 font-bold">{unread}</span>}</div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
                {!isChatMinimized && activeChat && activeTab !== "Support" && (
                    <div className="fixed z-[210] pointer-events-auto bottom-6 right-24">
                        <div className={`w-[320px] h-[450px] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300 backdrop-blur-xl border ${darkMode ? 'bg-slate-900/90 border-white/10' : 'bg-white/80 border-white/60'}`}>
                            
                            {/* Desktop Chat Header */}
                            <div className={`p-4 flex justify-between items-center border-b shrink-0 shadow-sm ${darkMode ? 'bg-slate-800/50 border-white/10' : 'bg-white/60 border-white/60'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full shadow-inner overflow-hidden border ${darkMode ? 'bg-slate-800 border-white/10 text-blue-400' : 'bg-white/60 border-white/60 text-blue-600'}`}>{(getAvatarUrl(activeChat) || activeChat.profilePic) ? <img src={getAvatarUrl(activeChat) || activeChat.profilePic} className="w-full h-full object-cover" alt="pfp"/> : <span className="flex items-center justify-center h-full font-black">{activeChat.name.charAt(0)}</span>}</div>
                                    <div>
                                        <span className={`font-black text-xs uppercase block ${darkMode ? 'text-white' : 'text-blue-900'}`}>{activeChat.name}</span>
                                        <span className={`text-[9px] opacity-80 font-bold flex items-center gap-1 mt-0.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                            {(() => {
                                                const status = formatLastSeen(conversations.find(c => c.chatId.includes(activeChat.id))?.lastTimestamp);
                                                return <><span className={`w-1.5 h-1.5 rounded-full ${status.isOnline ? 'bg-green-500' : 'bg-slate-400'}`}></span> {status.text}</>;
                                            })()}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1"><button onClick={() => { setIsChatMinimized(true); setIsBubbleVisible(true); setOpenBubbles(prev => [...prev, activeChat].filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i)); setActiveBubbleView(activeChat.id); closeChat(); }} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-white/60 text-blue-600'}`}><ChevronDownIcon className="w-4 h-4"/></button><button onClick={closeChat} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-white/60 text-blue-600'}`}><XMarkIcon className="w-4 h-4"/></button></div>
                            </div>
                            
                            {/* Desktop Chat Messages */}
                            <div className={`flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar ${darkMode ? 'bg-slate-900/30' : 'bg-white/30'}`} onClick={() => setActiveMenuId(null)}>
                                {messages.map((msg, index) => {
                                    const isMe = msg.senderId === auth.currentUser.uid;
                                    const myPic = profileImage || applicantData?.profilePic || null;
                                    const otherPic = activeChat?.profilePic || getAvatarUrl(activeChat) || null;

                                    const currentConv = conversations.find(c => c.participants?.includes(auth.currentUser.uid) && c.participants?.includes(activeChat.id));
                                    const unreadByOther = currentConv ? (currentConv[`unread_${activeChat.id}`] || 0) : 0;
                                    const isUnseen = (messages.length - 1 - index) < unreadByOther;
                                    const status = formatLastSeen(currentConv?.lastTimestamp);
                                    
                                    let statusText = "";
                                    if (isMe && !msg.isUnsent) {
                                        if (!isUnseen) statusText = "Seen";
                                        else if (status.isOnline) statusText = "Delivered";
                                        else statusText = "Sent";
                                    }

                                    return (
                                        <MessageBubble
                                            key={msg.id}
                                            msg={msg}
                                            isMe={isMe}
                                            isMobile={false}
                                            darkMode={darkMode}
                                            myPic={myPic}
                                            otherPic={otherPic}
                                            senderName={activeChat?.name}
                                            statusText={statusText}
                                            formatTime={formatTime}
                                            setLightboxUrl={setLightboxUrl}
                                            setReplyingTo={setReplyingTo}
                                            togglePinMessage={togglePinMessage}
                                            unsendMessage={unsendMessage}
                                            activeMenuId={activeMenuId}
                                            setActiveMenuId={setActiveMenuId}
                                            menuPosition={menuPosition}
                                            setMenuPosition={setMenuPosition}
                                        />
                                    );
                                })}
                                <div ref={scrollRef}/>
                            </div>
                            
                            {/* Desktop Chat Input */}
                            <div className={`p-3 shrink-0 border-t ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white/50 border-white/60'}`} onClick={() => setActiveMenuId(null)}>
                                {replyingTo && (
    <div className={`mb-2 flex justify-between items-center p-2.5 rounded-xl border-l-4 border-blue-500 text-[10px] font-bold ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
        <div className="flex flex-col">
            <span className="text-blue-500 uppercase">Replying to {replyingTo.senderId === auth.currentUser.uid ? 'You' : (effectiveActiveChatUser?.name || activeChat?.name || 'User')}</span>
            <span className={`truncate max-w-[200px] font-medium ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>
                {replyingTo.isUnsent ? "Message unsent" : (replyingTo.fileType ? `[${replyingTo.fileType}]` : replyingTo.text)}
            </span>
        </div>
        <button onClick={() => setReplyingTo(null)}><XMarkIcon className="w-4 h-4 text-slate-400 hover:text-red-500"/></button>
    </div>
)}
                                <form onSubmit={handleSendMessageWrapper} className="flex gap-2 items-center">
                                    <input type="file" ref={chatFileRef} onChange={handleFileSelect} className="hidden" />
                                    <button type="button" onClick={() => chatFileRef.current.click()} className={`p-2 rounded-xl shadow-sm border ${darkMode ? 'text-blue-400 bg-slate-800/50 hover:bg-slate-800 border-white/10' : 'text-blue-600 bg-white/40 hover:bg-white/60 border-white/60'}`}><PaperClipIcon className="w-5 h-5"/></button>
                                    <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Aa" className={`flex-1 px-4 py-2.5 text-sm outline-none rounded-full shadow-inner font-medium border ${darkMode ? 'bg-slate-900/50 border-white/10 text-white placeholder-slate-500' : 'bg-white/60 border-white/60 text-blue-900 placeholder-blue-900/40'}`} />
                                    <button type="submit" disabled={(!newMessage.trim() && !attachment) || isUploading} className="p-2 text-white bg-blue-600 rounded-full shadow-md disabled:opacity-50 active:scale-90 transition-transform">{isUploading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <PaperAirplaneIcon className="w-5 h-5" />}</button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        ))}

      {/* --- MOBILE NAV --- */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t px-6 py-3 flex justify-around items-center z-[80] backdrop-blur-xl ${isFullScreenPage ? 'hidden' : ''} ${darkMode ? 'bg-slate-900/80 border-white/10' : 'bg-white/60 border-white/60'}`}>
         {/* ... (Nav buttons) ... */}
         <button onClick={() => setActiveTab("FindJobs")}><SparklesIcon className={`w-6 h-6 ${activeTab === 'FindJobs' ? 'text-blue-600' : (darkMode ? 'text-slate-500' : 'text-blue-900/60')}`}/></button>
         <button onClick={() => setActiveTab("Saved")}><BookmarkIcon className={`w-6 h-6 ${activeTab === 'Saved' ? 'text-blue-600' : (darkMode ? 'text-slate-500' : 'text-blue-900/60')}`}/></button>
         {/* Changed bg-amber-500 to bg-red-500 */}
         <button onClick={() => setActiveTab("Applications")}>
             <div className="relative">
                 <PaperAirplaneIcon className={`w-6 h-6 ${activeTab === 'Applications' ? 'text-blue-600' : (darkMode ? 'text-slate-500' : 'text-blue-900/60')}`}/>
                 {hasUnreadUpdates && (
                     <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                 )}
             </div>
         </button>
         <button onClick={() => setActiveTab("Messages")}><div className="relative"><ChatBubbleLeftRightIcon className={`w-6 h-6 ${activeTab === 'Messages' ? 'text-blue-600' : (darkMode ? 'text-slate-500' : 'text-blue-900/60')}`}/>{unreadMsgCount > 0 && <span className="absolute -top-2 -right-2 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full border-none">{unreadMsgCount}</span>}</div></button>
      </nav>

        {/* 5. IMAGE LIGHTBOX OVERLAY */}
      {lightboxUrl && createPortal(
        <div 
            className="fixed inset-0 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200"
            style={{ zIndex: 999999 }} 
            onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}
        >
            <button 
                onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }} 
                className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                style={{ zIndex: 9999999 }}
            >
                <XMarkIcon className="w-8 h-8"/>
            </button>
            <img 
                src={lightboxUrl} 
                alt="Enlarged attachment" 
                className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
                style={{ zIndex: 9999999 }}
                onClick={(e) => e.stopPropagation()} 
            />
        </div>,
        document.body
      )}
    </div>
  );
}