import { useState, useEffect, useRef, cloneElement } from "react";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import {
  collection, query, where, onSnapshot, orderBy,
  addDoc, serverTimestamp, setDoc, doc, updateDoc, increment, deleteDoc, 
  getDoc, getDocs, getCountFromServer, writeBatch, arrayUnion
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import {
  BriefcaseIcon, ArrowLeftOnRectangleIcon, XMarkIcon,
  Bars3BottomRightIcon, MapPinIcon, SunIcon, MoonIcon,
  ChevronLeftIcon, ChevronRightIcon, ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon, PaperAirplaneIcon, EyeIcon,
  TrashIcon, CheckCircleIcon, CameraIcon, PencilSquareIcon,
  PlusIcon, UsersIcon, ClockIcon, UserIcon, AcademicCapIcon,
  CalendarDaysIcon, BoltIcon,
  EllipsisHorizontalIcon, PaperClipIcon, ArrowUturnLeftIcon,
  PhotoIcon, DocumentIcon, UserCircleIcon,
  EnvelopeIcon, SparklesIcon, FunnelIcon,
  ChartBarIcon, UserPlusIcon, PresentationChartLineIcon,
  BuildingOfficeIcon, ChevronDownIcon,
  ChatBubbleOvalLeftEllipsisIcon, PhoneIcon as PhoneSolidIcon,
  BookmarkIcon, BellIcon, QuestionMarkCircleIcon,
  MegaphoneIcon, LockClosedIcon, IdentificationIcon, CpuChipIcon, TagIcon,
  StarIcon as StarIconOutline
} from "@heroicons/react/24/outline";

import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

// --- STATIC DATA ---
const PUROK_LIST = [
  "Sagur", "Ampungan", "Centro 1", "Centro 2", "Centro 3", "Bypass Road", "Boundary"
];

const JOB_CATEGORIES = [
    { id: "EDUCATION", label: "Education", examples: "Teachers, Tutors, Principals" },
    { id: "AGRICULTURE", label: "Agriculture", examples: "Corn/Rice Farmers, Livestock" },
    { id: "AUTOMOTIVE", label: "Automotive", examples: "Mechanics, Mechanical Engineering" },
    { id: "CARPENTRY", label: "Carpentry", examples: "Carpenters, Furniture Makers" },
    { id: "HOUSEHOLD", label: "Household Service", examples: "Maids, Caregivers, Nanny" }
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

// --- BOT KNOWLEDGE BASE ---
const BOT_FAQ = [
    { id: 1, question: "How do I verify my account?", answer: "To verify, go to Profile and fill in your details. Admins review profiles daily." },
    { id: 2, question: "How to apply for a job?", answer: "Go to 'Find Jobs', click a job card, then click 'Apply Now'." },
    { id: 3, question: "Can I withdraw an application?", answer: "Yes, go to 'Applications', select the application, and click the Trash icon." },
    { id: 4, question: "How to chat with employers?", answer: "You can message an employer once they accept your application, or if they message you first." },
];

const splitByNewLine = (text) => {
    if (!text) return [];
    return text.split('\n').filter(line => line.trim() !== '');
};

export default function ApplicantDashboard() {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState("FindJobs");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // --- SUPPORT TICKET STATE ---
  const [supportTickets, setSupportTickets] = useState([]); 
  const [activeSupportTicket, setActiveSupportTicket] = useState(null); 
  const [ticketMessage, setTicketMessage] = useState("");
  const [supportAttachment, setSupportAttachment] = useState(null); 
  const [isSupportUploading, setIsSupportUploading] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [lastTicketCreatedAt, setLastTicketCreatedAt] = useState(0); 
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [longPressedTicketId, setLongPressedTicketId] = useState(null); 

  const ticketScrollRef = useRef(null);
  const supportFileRef = useRef(null);
  const longPressTimerRef = useRef(null);

  // --- ANNOUNCEMENTS STATE ---
  const [announcements, setAnnouncements] = useState([]);
  const [lastReadAnnouncementId, setLastReadAnnouncementId] = useState(localStorage.getItem("lastReadAnnounceApp"));
  const [currentAnnounceIndex, setCurrentAnnounceIndex] = useState(0);
  
  // --- BUBBLE & UI STATES ---
  const [isBubbleVisible, setIsBubbleVisible] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [openBubbles, setOpenBubbles] = useState([]);
  const [isDesktopInboxVisible, setIsDesktopInboxVisible] = useState(false);
  const [isBubbleExpanded, setIsBubbleExpanded] = useState(false);
  const [activeBubbleView, setActiveBubbleView] = useState('inbox');
  const [bubblePos, setBubblePos] = useState({ x: window.innerWidth - 60, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // --- CHAT SYSTEM STATE ---
  const [activeChat, setActiveChat] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isChatOptionsOpen, setIsChatOptionsOpen] = useState(false); 
  const [chatSearch, setChatSearch] = useState(""); 
  const [replyingTo, setReplyingTo] = useState(null); 
  const [attachment, setAttachment] = useState(null); 
  const [isUploading, setIsUploading] = useState(false); 
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const chatFileRef = useRef(null); 
  const scrollRef = useRef(null);
  
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  // --- APPLICANT DATA STATES ---
  const [availableJobs, setAvailableJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);

  // Filters
  const [jobSearch, setJobSearch] = useState("");
  const [jobLocationFilter, setJobLocationFilter] = useState("");
  const [jobCategoryFilter, setJobCategoryFilter] = useState(""); 
  const [isSitioDropdownOpen, setIsSitioDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const [selectedJob, setSelectedJob] = useState(null);
  const [viewingApplication, setViewingApplication] = useState(null);
  const [modalJobDetails, setModalJobDetails] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [applicationSearch, setApplicationSearch] = useState("");

  const [profileImage, setProfileImage] = useState(null);
  const [imgScale, setImgScale] = useState(1);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // --- RATINGS STATE ---
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [isRatingEmployerModalOpen, setIsRatingEmployerModalOpen] = useState(false);
  const [selectedEmployerToRate, setSelectedEmployerToRate] = useState(null);

  const [applicantData, setApplicantData] = useState({
    firstName: "", lastName: "", sitio: "", title: "Job Seeker",
    bio: "", skills: "", education: "", experience: "",
    verificationStatus: "pending" 
  });

  const isVerified = applicantData.verificationStatus === 'verified';

  // --- STYLES ---
  const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${darkMode 
    ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' 
    : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;
   
  const glassCard = `backdrop-blur-md border rounded-2xl transition-all duration-300 group hover:-translate-y-1 ${darkMode
    ? 'bg-slate-800/40 border-white/5 hover:bg-slate-800/60 hover:border-blue-500/30'
    : 'bg-white/40 border-white/60 hover:bg-white/70 hover:border-blue-300/50 hover:shadow-lg'}`;

  const glassInput = `w-full bg-transparent border-none outline-none text-sm font-bold placeholder-slate-400 ${darkMode ? 'text-white' : 'text-slate-800'}`;

  // FIX: Removed 'overflow-hidden'
  const glassNavBtn = `relative p-3 rounded-xl transition-all duration-500 ease-out group hover:-translate-y-1 ${
      darkMode 
      ? 'text-slate-400 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' 
      : 'text-slate-400 hover:text-blue-500 hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]'
  }`;
   
  // FIX: Removed 'overflow-hidden'
  const activeGlassNavBtn = `relative p-3 rounded-xl transition-all duration-500 ease-out scale-125 -translate-y-1 ${
      darkMode
      ? 'text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.8)]'
      : 'text-blue-600 drop-shadow-[0_0_15px_rgba(37,99,235,0.6)]'
  }`;

  const isFullScreenPage = isMobile && (
    (activeTab === "Messages" && activeChat) || 
    (activeTab === "Support" && isSupportOpen)
  );

  // --- EFFECTS ---

  useEffect(() => {
    if (announcements.length > 1) {
        const interval = setInterval(() => {
            setCurrentAnnounceIndex(prev => (prev + 1) % announcements.length);
        }, 5000); 
        return () => clearInterval(interval);
    }
  }, [announcements.length]);
  
  const displayAnnouncement = announcements[currentAnnounceIndex];

  useEffect(() => {
    if(activeTab !== "Support") {
      setIsSupportOpen(false);
      setActiveSupportTicket(null);
    }
  }, [activeTab]);

  useEffect(() => {
      const fetchAdmin = async () => {
          try {
            let q = query(collection(db, "admins"), where("email", "==", ADMIN_EMAIL));
            let snap = await getDocs(q);
            if (!snap.empty) {
                const docData = snap.docs[0].data();
                setAdminUser({ id: snap.docs[0].id, collection: 'admins', ...docData });
            }
          } catch (e) { console.error("Error finding admin:", e); }
      };
      fetchAdmin();
  }, []);

  useEffect(() => {
    if (activeTab === "Messages" || activeTab === "Support") {
       setIsBubbleVisible(false); setIsBubbleExpanded(false); setIsDesktopInboxVisible(false);
    }
  }, [activeTab]);

  useEffect(() => {
    const isModalActive = selectedJob !== null || viewingApplication !== null || isEditingImage || lightboxUrl !== null;
    if (isModalActive) { document.body.style.overflow = "hidden"; } else { document.body.style.overflow = "auto"; }
    return () => { document.body.style.overflow = "auto"; };
  }, [selectedJob, viewingApplication, isEditingImage, lightboxUrl]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeChat, activeBubbleView]);

  useEffect(() => {
    if (activeTab === "Applications" && myApplications.length > 0) {
        const unreadApps = myApplications.filter(app => app.isReadByApplicant === false && app.status !== 'pending');
        if (unreadApps.length > 0) {
            const markAsRead = async () => {
                const batch = writeBatch(db);
                unreadApps.forEach(app => {
                    const appRef = doc(db, "applications", app.id);
                    batch.update(appRef, { isReadByApplicant: true });
                });
                try { await batch.commit(); } catch (err) { console.error("Error marking notifications", err); }
            };
            markAsRead();
        }
    }
  }, [activeTab, myApplications]);

   useEffect(() => {
     if(activeTab === "FindJobs") {
        const fetchData = async () => {
            try {
                const q = query(collection(db, "jobs"), where("status", "==", "active"));
                const querySnapshot = await getDocs(q);
                const jobs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAvailableJobs(jobs);
            } catch (err) { console.error("Error fetching jobs", err); }
        };
        fetchData();
     }

     if(activeTab === "Ratings") {
        const fetchReviews = () => {
             const q = query(collection(db, "reviews"), where("targetId", "==", auth.currentUser.uid), orderBy("createdAt", "desc"));
             const unsub = onSnapshot(q, (snap) => {
                 const revs = snap.docs.map(d => ({id: d.id, ...d.data()}));
                 setReviews(revs);
                 
                 if(revs.length > 0) {
                     const total = revs.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0);
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
    const userRef = doc(db, "applicants", auth.currentUser.uid);
    const setOnline = async () => { try { await setDoc(userRef, { isOnline: true }, { merge: true }); } catch(e) {} };
    setOnline();
    const unsubProfile = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.profilePic) setProfileImage(data.profilePic);
        if (data.imgScale) setImgScale(data.imgScale);
        setApplicantData(prev => ({
            ...prev,
            firstName: data.firstName || userData?.firstName || "",
            lastName: data.lastName || userData?.lastName || "",
            sitio: data.sitio || data.location || "",
            title: data.title || "Job Seeker",
            bio: data.bio || data.aboutMe || "",
            education: data.education || "",
            experience: data.workExperience || "",
            verificationStatus: data.verificationStatus || "pending"
        }));
      }
    });
    return () => { unsubProfile(); setDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true }).catch(console.error); };
  }, [auth.currentUser, userData]);

  useEffect(() => {
      if (!auth.currentUser) return;
      const ticketsQuery = query(collection(db, "support_tickets"), where("userId", "==", auth.currentUser.uid));
      const unsubTickets = onSnapshot(ticketsQuery, (snapshot) => {
          const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          tickets.sort((a, b) => (b.lastUpdated?.seconds || 0) - (a.lastUpdated?.seconds || 0));
          setSupportTickets(tickets);
          setActiveSupportTicket(curr => { if (!curr) return null; const updated = tickets.find(t => t.id === curr.id); return updated || curr; });
      });
      return () => unsubTickets();
  }, [auth.currentUser]);

  useEffect(() => {
    if (activeTab === "Support") {
        setTimeout(() => { ticketScrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, 100);
    }
  }, [activeSupportTicket, activeTab, isBotTyping, isSupportOpen]);

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const qApps = query(collection(db, "applications"), where("applicantId", "==", auth.currentUser.uid));
    const unsubApps = onSnapshot(qApps, (snap) => {
      const appsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      appsData.sort((a, b) => (b.appliedAt?.seconds || 0) - (a.appliedAt?.seconds || 0));
      setMyApplications(appsData);
    });

    const qSaved = query(collection(db, "saved_jobs"), where("userId", "==", auth.currentUser.uid));
    const unsubSaved = onSnapshot(qSaved, (snap) => {
         const savedData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
         setSavedJobs(savedData);
    });

    const qAnnouncements = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    const unsubAnnouncements = onSnapshot(qAnnouncements, (snap) => {
       setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qConvos = query(collection(db, "conversations"), where("participants", "array-contains", auth.currentUser.uid));
    const unsubConvos = onSnapshot(qConvos, async (snap) => {
      const convosPromises = snap.docs.map(async (d) => {
        const data = d.data();
        const otherId = data.participants.find(p => p !== auth.currentUser.uid);
        let finalProfilePic = data.profilePics?.[otherId] || null;
        let displayName = "Employer";
        if (otherId) {
            try {
                const empSnap = await getDoc(doc(db, "employers", otherId));
                if (empSnap.exists()) {
                    const empData = empSnap.data();
                    if (empData.profilePic) finalProfilePic = empData.profilePic;
                    if (empData.firstName && empData.lastName) { displayName = `${empData.firstName} ${empData.lastName}`; } else if (empData.employerName) { displayName = empData.employerName; }
                }
            } catch (err) { }
        }
        return { id: d.id, ...data, profilePics: { ...data.profilePics, [otherId]: finalProfilePic }, names: { ...data.names, [otherId]: displayName } };
      });
      const convosData = await Promise.all(convosPromises);
      convosData.sort((a, b) => (b.lastTimestamp?.seconds || 0) - (a.lastTimestamp?.seconds || 0));
      setConversations(convosData);
    });

    return () => { unsubApps(); unsubSaved(); unsubAnnouncements(); unsubConvos(); };
  }, [auth.currentUser]);

  const effectiveActiveChatId = (isBubbleVisible && isMobile) ? (activeBubbleView !== 'inbox' ? activeBubbleView : null) : activeChat?.id;

  // FIX: Updated logic to clear notifications in both Bubble view and Main Message Tab view
  useEffect(() => {
    if (!effectiveActiveChatId || !auth.currentUser) return;
    const chatId = [auth.currentUser.uid, effectiveActiveChatId].sort().join("_");
    
    // Determine if the current chat is "visible" to the user
    const isVisible = 
        (!isMobile && !isChatMinimized) || // Desktop Chat Window Open
        (isMobile && isBubbleVisible && isBubbleExpanded) || // Mobile Bubble Open
        (activeTab === "Messages" && activeChat && activeChat.id === effectiveActiveChatId); // Main Messages Tab Open (Mobile or Desktop)

    if (isVisible) {
       updateDoc(doc(db, "conversations", chatId), { [`unread_${auth.currentUser.uid}`]: 0 }).catch(() => {});
    }
    
    const qChat = query(collection(db, "messages"), where("chatId", "==", chatId));
    const unsubChat = onSnapshot(qChat, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => { unsubChat(); };
  }, [effectiveActiveChatId, isChatMinimized, isBubbleVisible, isBubbleExpanded, activeTab, activeChat]);

  // --- HANDLERS ---
  const handleTouchStart = (e) => { setIsDragging(true); const touch = e.touches[0]; dragOffset.current = { x: touch.clientX - bubblePos.x, y: touch.clientY - bubblePos.y }; };
  const handleTouchMove = (e) => { if (!isDragging) return; const touch = e.touches[0]; const bubbleSize = 56; let newX = touch.clientX - dragOffset.current.x; let newY = touch.clientY - dragOffset.current.y; newY = Math.max(80, Math.min(newY, window.innerHeight - 150)); newX = Math.max(0, Math.min(newX, window.innerWidth - bubbleSize)); setBubblePos({ x: newX, y: newY }); };
  const handleTouchEnd = () => { setIsDragging(false); const bubbleSize = 56; if (bubblePos.x < window.innerWidth / 2) { setBubblePos(prev => ({ ...prev, x: 0 })); } else { setBubblePos(prev => ({ ...prev, x: window.innerWidth - bubbleSize })); } };

  const handleMinimizeToBubble = () => {
    if (!activeChat) return;
    setIsBubbleVisible(true); setIsChatMinimized(true); setIsChatOptionsOpen(false); setActiveBubbleView(activeChat.id); 
    if (activeChat && !openBubbles.find(b => b.id === activeChat.id)) { setOpenBubbles(prev => [...prev, activeChat]); }
    closeChat(); 
    setActiveTab("FindJobs"); 
  };

  const openChat = (user) => { setActiveChat(user); };
  const closeChat = () => { setActiveChat(null); };

  const handleStartChatFromExternal = (userObj) => {
      if (!isVerified) return alert("Your account must be verified to send messages.");
      openChat(userObj); setIsChatMinimized(false); setActiveTab("Messages"); setIsBubbleVisible(false); setIsBubbleExpanded(false); setIsDesktopInboxVisible(false);
  };

  const handleCloseChat = () => { if (activeChat) { setOpenBubbles(prev => prev.filter(b => b.id !== activeChat.id)); } closeChat(); setIsChatOptionsOpen(false); if (openBubbles.length <= 1) setIsBubbleVisible(false); };
  const handleCloseBubble = (chatId) => { const newBubbles = openBubbles.filter(b => b.id !== chatId); setOpenBubbles(newBubbles); if(activeBubbleView === chatId) { if (newBubbles.length === 0) { setIsBubbleVisible(false); setIsBubbleExpanded(false); setActiveBubbleView('inbox'); } else { setActiveBubbleView('inbox'); } } };
  const handleFileSelect = (e) => { if (e.target.files[0]) setAttachment(e.target.files[0]); };

  const handleSendMessageWrapper = async (e) => {
    e.preventDefault();
    if (!effectiveActiveChatId) return;
    const chatId = [auth.currentUser.uid, effectiveActiveChatId].sort().join("_");
    const myDisplayName = `${applicantData.firstName} ${applicantData.lastName}`.trim() || "Applicant";
    let fileUrl = null, fileType = null, fileName = null;
    
    if (!attachment && !newMessage.trim()) return;

    setIsUploading(true);
    try {
      if (attachment) {
        const storage = getStorage(auth.app);
        const storageRef = ref(storage, `chat_attachments/${chatId}/${Date.now()}_${attachment.name}`);
        const uploadTask = await uploadBytes(storageRef, attachment);
        fileUrl = await getDownloadURL(uploadTask.ref);
        fileName = attachment.name;
        if (attachment.type.startsWith('image/')) fileType = 'image';
        else if (attachment.type.startsWith('video/')) fileType = 'video';
        else fileType = 'file';
      }
      
      await addDoc(collection(db, "messages"), {
        chatId, text: newMessage, senderId: auth.currentUser.uid, receiverId: effectiveActiveChatId, createdAt: serverTimestamp(),
        fileUrl: fileUrl || null, fileType: fileType || 'text', fileName: fileName || null,
        replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, senderName: replyingTo.senderId === auth.currentUser.uid ? "You" : (effectiveActiveChatUser?.name || "User"), type: replyingTo.fileType || 'text' } : null
      });
      
      await setDoc(doc(db, "conversations", chatId), {
        chatId, lastMessage: fileType && fileType !== 'text' ? `Sent a ${fileType}` : newMessage, lastTimestamp: serverTimestamp(),
        participants: [auth.currentUser.uid, effectiveActiveChatId], [`unread_${effectiveActiveChatId}`]: increment(1),
        names: { [auth.currentUser.uid]: myDisplayName, [effectiveActiveChatId]: effectiveActiveChatUser?.name || "User" },
        profilePics: { [auth.currentUser.uid]: profileImage || null, [effectiveActiveChatId]: effectiveActiveChatUser?.profilePic || null }
      }, { merge: true });
      
      setNewMessage(""); setAttachment(null); setReplyingTo(null); if (chatFileRef.current) chatFileRef.current.value = "";
    } catch (err) { alert("Failed to send message."); } finally { setIsUploading(false); }
  };

  const handleSupportFileSelect = (e) => { if (e.target.files[0]) setSupportAttachment(e.target.files[0]); };

  const handleSendFAQ = async (faq) => {
      const userMsg = { sender: 'user', text: faq.question, timestamp: new Date() };
      const botMsg = { sender: 'admin', text: `🤖 ${faq.answer}`, timestamp: new Date() };
      
      try {
          if (activeSupportTicket) {
               if(activeSupportTicket.status === 'closed') { alert("This ticket is closed. Please start a new one."); return; }
               await updateDoc(doc(db, "support_tickets", activeSupportTicket.id), { messages: arrayUnion(userMsg, botMsg), lastUpdated: serverTimestamp(), status: 'open' });
          } else {
              const ticketIdString = Math.floor(1000 + Math.random() * 9000).toString();
              const newTicketRef = await addDoc(collection(db, "support_tickets"), { ticketId: ticketIdString, user: `${applicantData.firstName} ${applicantData.lastName}`, userId: auth.currentUser.uid, type: 'Applicant', status: 'open', lastUpdated: serverTimestamp(), messages: [userMsg, botMsg] });
              setLastTicketCreatedAt(Date.now());
              const newTicketSnap = await getDoc(newTicketRef);
              setActiveSupportTicket({ id: newTicketRef.id, ...newTicketSnap.data() });
          }
      } catch (err) { console.error("Error sending FAQ:", err); }
  };

  const handleSendSupportMessage = async (e) => {
      e.preventDefault();
      if (!ticketMessage.trim() && !supportAttachment) return;
      const now = Date.now();
      const cooldown = 5 * 60 * 1000;
      if (!activeSupportTicket && (now - lastTicketCreatedAt < cooldown)) {
          const remaining = Math.ceil((cooldown - (now - lastTicketCreatedAt)) / 60000);
          return alert(`Please wait ${remaining} more minute(s) before opening a new support request.`);
      }
      setIsSupportUploading(true);
      try {
          let imageUrl = null;
          if (supportAttachment) {
             const storage = getStorage(auth.app);
             const storageRef = ref(storage, `support_attachments/${auth.currentUser.uid}/${Date.now()}_${supportAttachment.name}`);
             const uploadTask = await uploadBytes(storageRef, supportAttachment);
             imageUrl = await getDownloadURL(uploadTask.ref);
          }
          const msgObj = { sender: 'user', text: ticketMessage, imageUrl: imageUrl || null, timestamp: new Date() };
          if (activeSupportTicket) {
              await updateDoc(doc(db, "support_tickets", activeSupportTicket.id), { messages: arrayUnion(msgObj), lastUpdated: serverTimestamp(), status: 'open' });
          } else {
              const ticketIdString = Math.floor(1000 + Math.random() * 9000).toString();
              const newTicketRef = await addDoc(collection(db, "support_tickets"), { ticketId: ticketIdString, user: `${applicantData.firstName} ${applicantData.lastName}`, userId: auth.currentUser.uid, type: 'Applicant', status: 'open', lastUpdated: serverTimestamp(), messages: [msgObj] });
              setLastTicketCreatedAt(now);
              const newTicketSnap = await getDoc(newTicketRef);
              setActiveSupportTicket({ id: newTicketRef.id, ...newTicketSnap.data() });
          }
          setTicketMessage(""); setSupportAttachment(null); if(supportFileRef.current) supportFileRef.current.value = ""; 
      } catch (err) { console.error("Error sending support message:", err); } finally { setIsSupportUploading(false); }
  };

  const handleCloseSupportTicket = async (ticketId) => { if(!confirm("Close this support request?")) return; try { await updateDoc(doc(db, "support_tickets", ticketId), { status: 'closed', lastUpdated: serverTimestamp() }); setActiveSupportTicket(null); setIsSupportOpen(false); } catch (err) { alert("Error: " + err.message); } };
  const handleDeleteTicket = async (ticketId) => { if(confirm("Delete this conversation permanently?")) { try { await deleteDoc(doc(db, "support_tickets", ticketId)); if(activeSupportTicket?.id === ticketId) { setActiveSupportTicket(null); setIsSupportOpen(false); } } catch(err) { alert("Error: " + err.message); } } };

  // --- LONG PRESS HANDLERS FOR MOBILE TICKET DELETE ---
  const handleTicketTouchStart = (ticketId) => {
    longPressTimerRef.current = setTimeout(() => {
        setLongPressedTicketId(ticketId);
    }, 600); 
  };

  const handleTicketTouchEnd = () => {
    if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
    }
  };

  const handleImageUpload = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { setProfileImage(reader.result); setIsEditingImage(true); }; reader.readAsDataURL(file); } };
  const dataURLtoBlob = (dataurl) => { try { const arr = dataurl.split(','); const mime = arr[0].match(/:(.*?);/)[1]; const bstr = atob(arr[1]); let n = bstr.length; const u8arr = new Uint8Array(n); while(n--) u8arr[n] = bstr.charCodeAt(n); return new Blob([u8arr], {type:mime}); } catch (e) { return null; } };
  const saveProfileImage = async () => { if (!auth.currentUser || !profileImage) return; setLoading(true); try { const storage = getStorage(auth.app); const storageRef = ref(storage, `profile_pics/${auth.currentUser.uid}`); const blob = dataURLtoBlob(profileImage); if (!blob) throw new Error("Failed to process image data."); const uploadTask = await uploadBytes(storageRef, blob); const downloadURL = await getDownloadURL(uploadTask.ref); await setDoc(doc(db, "applicants", auth.currentUser.uid), { profilePic: downloadURL, imgScale: imgScale, uid: auth.currentUser.uid, updatedAt: serverTimestamp() }, { merge: true }); setIsEditingImage(false); alert("Profile picture updated!"); } catch (err) { alert(`Error: ${err.message}`); } finally { setLoading(false); } };
  const handleSaveProfile = async () => { setLoading(true); try { await setDoc(doc(db, "applicants", auth.currentUser.uid), { title: applicantData.title, aboutMe: applicantData.bio, education: applicantData.education, workExperience: applicantData.experience, updatedAt: serverTimestamp() }, { merge: true }); setIsEditingProfile(false); } catch (err) { alert("Error saving profile: " + err.message); } finally { setLoading(false); } };

  const handleViewApplicationDetails = async (app) => { setModalLoading(true); setViewingApplication(app); setModalJobDetails(null); try { if (app.jobId) { const jobSnap = await getDoc(doc(db, "jobs", app.jobId)); if (jobSnap.exists()) { setModalJobDetails(jobSnap.data()); } } } catch (err) { } finally { setModalLoading(false); } };
  
  const handleApplyToJob = async (job) => {
    if(!window.confirm(`Apply to ${job.title} at ${job.employerName}?`)) return;
    setLoading(true);
    try {
        await addDoc(collection(db, "applications"), {
            jobId: job.id,
            jobTitle: job.title,
            employerId: job.employerId,
            employerName: job.employerName,
            employerLogo: job.employerLogo || "",
            applicantId: auth.currentUser.uid,
            applicantName: `${applicantData.firstName} ${applicantData.lastName}`,
            applicantProfilePic: profileImage || "",
            status: 'pending',
            appliedAt: serverTimestamp(),
            isViewed: false,
            isReadByApplicant: true 
        });

        const isAlreadySaved = savedJobs.some(s => s.jobId === job.id);
        if (!isAlreadySaved) {
             await addDoc(collection(db, "saved_jobs"), {
                userId: auth.currentUser.uid,
                jobId: job.id,
                jobData: job,
                savedAt: serverTimestamp()
            });
        }

        alert("Application Sent! This job has been added to your Saved jobs.");
        setSelectedJob(null);
    } catch(err) {
        alert("Error applying: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleWithdrawApplication = async (appId) => { if(!window.confirm("Are you sure you want to withdraw this application?")) return; setLoading(true); try { await deleteDoc(doc(db, "applications", appId)); setViewingApplication(null); } catch (err) { alert("Error withdrawing: " + err.message); } finally { setLoading(false); } };
  const handleToggleSaveJob = async (job) => { const existing = savedJobs.find(s => s.jobId === job.id); try { if(existing) { await deleteDoc(doc(db, "saved_jobs", existing.id)); } else { await addDoc(collection(db, "saved_jobs"), { userId: auth.currentUser.uid, jobId: job.id, jobData: job, savedAt: serverTimestamp() }); } } catch(err) { } };
  
  const handleViewAnnouncement = (annId) => { setActiveTab("Announcements"); setIsNotifOpen(false); setLastReadAnnouncementId(annId); localStorage.setItem("lastReadAnnounceApp", annId); };

  const handleSubmitEmployerRating = async (ratingData) => {
    if (!auth.currentUser || !selectedEmployerToRate) return;
    setLoading(true);
    try {
        await addDoc(collection(db, "reviews"), {
            targetId: selectedEmployerToRate.employerId, 
            employerId: selectedEmployerToRate.employerId, 
            applicantId: auth.currentUser.uid, 
            reviewerId: auth.currentUser.uid,
            reviewerName: displayName,
            reviewerPic: profileImage || null,
            applicantName: displayName,
            applicantPic: profileImage || null,
            rating: ratingData.rating,
            comment: ratingData.comment,
            type: 'employer_review',
            createdAt: serverTimestamp()
        });

        await updateDoc(doc(db, "applications", selectedEmployerToRate.id), {
            isRatedByApplicant: true
        });

        alert("Employer rated successfully!");
        setIsRatingEmployerModalOpen(false);
    } catch (error) {
        console.error("Error rating employer:", error);
        alert("Failed to submit rating.");
    } finally {
        setLoading(false);
    }
  };

  const displayName = `${applicantData.firstName} ${applicantData.lastName}`.trim() || "Applicant";
  
  const filteredJobs = availableJobs.filter(job => {
      const hasApplied = myApplications.some(app => app.jobId === job.id);
      if (hasApplied) return false;

      const matchesSearch = job.title.toLowerCase().includes(jobSearch.toLowerCase()) || (job.employerName && job.employerName.toLowerCase().includes(jobSearch.toLowerCase()));
      const matchesLoc = jobLocationFilter ? job.sitio === jobLocationFilter : true;
      const matchesCategory = jobCategoryFilter ? job.category === jobCategoryFilter : true;
      return matchesSearch && matchesLoc && matchesCategory;
  });

  const filteredChats = conversations.filter(c => { const otherId = c.participants?.find(p => p !== auth.currentUser?.uid); if (adminUser && otherId === adminUser.id) return false; const name = c.names?.[otherId] || "User"; return name.toLowerCase().includes(chatSearch.toLowerCase()); });
  const filteredApplications = myApplications.filter(app => app.jobTitle.toLowerCase().includes(applicationSearch.toLowerCase()) || (app.employerName && app.employerName.toLowerCase().includes(applicationSearch.toLowerCase())));
  const pendingApplications = filteredApplications.filter(app => app.status === 'pending');
  const acceptedApplications = filteredApplications.filter(app => app.status === 'accepted');
  const rejectedApplications = filteredApplications.filter(app => app.status === 'rejected');
  const hasUnreadUpdates = myApplications.some(app => app.isReadByApplicant === false && app.status !== 'pending');
  const unreadMsgCount = conversations.reduce((acc, curr) => { const otherId = curr.participants?.find(p => p !== auth.currentUser?.uid); if (adminUser && otherId === adminUser.id) return acc; return acc + (curr[`unread_${auth.currentUser?.uid}`] || 0); }, 0);
  const latestAnnouncement = announcements.length > 0 ? announcements[0] : null;
  const hasNewAnnouncement = latestAnnouncement && latestAnnouncement.id !== lastReadAnnouncementId;
  const totalNotifications = unreadMsgCount + (hasUnreadUpdates ? 1 : 0) + (hasNewAnnouncement ? 1 : 0);

  const ProfilePicComponent = ({ sizeClasses = "w-12 h-12", isCollapsed = false }) => ( <div className={`relative group shrink-0 ${sizeClasses} rounded-2xl overflow-hidden shadow-lg border select-none ${darkMode ? 'border-white/10 bg-slate-800' : 'border-slate-200 bg-slate-100'}`}> {profileImage ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover transition-transform duration-300" style={{ transform: `scale(${imgScale})` }} /> : <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-black text-lg">{applicantData.firstName ? applicantData.firstName.charAt(0) : "A"}</div>} {!isCollapsed && <button onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"><CameraIcon className="w-5 h-5 text-white" /></button>} </div> );
  const effectiveActiveChatUser = (isBubbleVisible && isMobile) ? openBubbles.find(b => b.id === activeBubbleView) : activeChat;
  const MessageAvatar = ({ isMe }) => { const pic = isMe ? profileImage : getAvatarUrl(effectiveActiveChatUser); const initial = isMe ? (applicantData.firstName?.charAt(0) || "M") : (effectiveActiveChatUser?.name?.charAt(0) || "U"); return ( <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 shadow-sm border border-black/5 dark:border-white/10 bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black uppercase"> {pic ? <img src={pic} alt="User" className="w-full h-full object-cover" /> : initial} </div> ); };
  const getJobStyle = (type) => { const found = JOB_TYPES.find(j => j.id === type); if (found) return found; return { icon: <BoltIcon className="w-6 h-6"/>, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' }; };
  const formatTime = (ts) => { if (!ts) return "Just now"; const date = ts?.toDate ? ts.toDate() : new Date(); return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
  const formatDateTime = (ts) => { if (!ts) return "Just now"; const date = ts?.toDate ? ts.toDate() : new Date(); return date.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  
  const RestrictedView = () => ( <div className="flex flex-col items-center justify-center h-full min-h-[50vh] animate-in fade-in zoom-in-95"> <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6"> <LockClosedIcon className="w-10 h-10 text-red-500"/> </div> <h2 className={`text-2xl font-black mb-2 uppercase tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}> Feature Locked </h2> <p className="text-sm opacity-60 font-medium max-w-xs text-center mb-8"> Your account verification is {applicantData.verificationStatus}. Please contact support or update your profile to unlock this feature. </p> <button onClick={() => setActiveTab("Support")} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"> Contact Support </button> </div> );

  return (
    <div className={`relative min-h-screen transition-colors duration-500 font-sans pb-24 md:pb-0 select-none cursor-default overflow-x-hidden ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>

      {!isVerified && (
        <div className={`fixed top-0 left-0 right-0 h-10 z-[60] flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-white shadow-lg ${applicantData.verificationStatus === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}`}>
            {applicantData.verificationStatus === 'rejected'
              ? "Account Verification Rejected. Please update your profile."
              : "Account Pending Verification. Some features are limited."}
        </div>
      )}

      {/* STYLES */}
      <style>{`
        /* Global Scrollbar Hiding */
        *::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes content-wipe {
          0% { opacity: 0; transform: translateY(10px) scale(0.99); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-content {
          animation: content-wipe 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        /* New explicit shine class for stats and saved cards */
        .shine {
          position: relative;
          overflow: hidden;
        }
        .shine::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
          transform: skewX(-25deg);
          animation: shine 3s infinite;
          pointer-events: none;
        }
        @keyframes shine {
          100% { left: 125%; }
        }

        .typing-dot {
            animation: typing 1.4s infinite ease-in-out both;
        }
        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes typing {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }
      `}</style>

      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

      {/* BACKGROUND BLOBS */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-40 animate-pulse ${darkMode ? 'bg-blue-900' : 'bg-blue-300'}`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-40 animate-pulse delay-1000 ${darkMode ? 'bg-purple-900' : 'bg-purple-300'}`}></div>
      </div>

      {/* LIGHTBOX */}
      {lightboxUrl && (
          <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setLightboxUrl(null)}>
              <img src={lightboxUrl} alt="Full view" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
              <button onClick={() => setLightboxUrl(null)} className="absolute top-5 right-5 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"><XMarkIcon className="w-6 h-6"/></button>
          </div>
      )}

      {/* IMAGE EDITOR */}
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
      <header className={`fixed top-0 left-0 right-0 z-40 h-20 px-6 flex items-center justify-between transition-all duration-300 backdrop-blur-xl border-b ${darkMode ? 'bg-slate-900/80 border-white/5' : 'bg-white/80 border-slate-200'} ${(isFullScreenPage) ? '-translate-y-full' : 'translate-y-0'} ${!isVerified && !isFullScreenPage ? 'top-10' : 'top-0'}`}>
            <div className="flex items-center gap-3">
                 <h1 className={`font-black text-lg tracking-tight leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>LIVELI<span className="text-blue-500">MATCH</span></h1>
            </div>

            <div className="hidden lg:flex items-center gap-24">
                <button onClick={() => isVerified && setActiveTab("FindJobs")} className={`${activeTab === "FindJobs" ? activeGlassNavBtn : glassNavBtn} ${!isVerified && 'opacity-50 cursor-not-allowed'}`}>
                    {isVerified ? <BriefcaseIcon className="w-7 h-7 relative z-10" /> : <LockClosedIcon className="w-6 h-6 relative z-10" />}
                </button>
                <button onClick={() => isVerified && setActiveTab("Saved")} className={`${activeTab === "Saved" ? activeGlassNavBtn : glassNavBtn} ${!isVerified && 'opacity-50 cursor-not-allowed'}`}>
                     {isVerified ? <BookmarkIcon className="w-7 h-7 relative z-10" /> : <LockClosedIcon className="w-6 h-6 relative z-10" />}
                </button>
                <button onClick={() => isVerified && setActiveTab("Applications")} className={`relative ${activeTab === "Applications" ? activeGlassNavBtn : glassNavBtn} ${!isVerified && 'opacity-50 cursor-not-allowed'}`}>
                     {isVerified ? <PaperAirplaneIcon className="w-7 h-7 relative z-10" /> : <LockClosedIcon className="w-6 h-6 relative z-10" />}
                    {isVerified && hasUnreadUpdates && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 border-2 border-white rounded-full animate-pulse z-20"></span>}
                </button>
                <button onClick={() => isVerified && setActiveTab("Messages")} className={`relative ${activeTab === "Messages" ? activeGlassNavBtn : glassNavBtn} ${!isVerified && 'opacity-50 cursor-not-allowed'}`}>
                     {isVerified ? <ChatBubbleLeftRightIcon className="w-7 h-7 relative z-10" /> : <LockClosedIcon className="w-6 h-6 relative z-10" />}
                    {isVerified && unreadMsgCount > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full border-2 border-white dark:border-slate-900 z-20">{unreadMsgCount}</span>}
                </button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative">
                    <button onClick={() => isVerified && setIsNotifOpen(!isNotifOpen)} className={`relative p-2 rounded-full transition-all active:scale-95 ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-600'} ${!isVerified && 'opacity-50 cursor-not-allowed'}`}>
                        <BellIcon className="w-6 h-6" />
                        {isVerified && totalNotifications > 0 && (
                            <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-slate-900 rounded-full animate-pulse"></span>
                        )}
                    </button>
                    {isNotifOpen && isVerified && (
                        <div className={`fixed top-20 left-1/2 -translate-x-1/2 w-[90%] md:absolute md:translate-x-0 md:top-12 md:right-0 md:w-80 md:left-auto rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200 z-[100] ${darkMode ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200'}`}>
                             <div className="p-3 border-b border-white/5 font-black text-xs uppercase tracking-widest opacity-50">Notifications</div>
                             <div className="p-2 space-y-1">
                                {latestAnnouncement && (
                                     <button onClick={() => handleViewAnnouncement(latestAnnouncement.id)} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm font-bold ${hasNewAnnouncement ? 'text-pink-500 bg-pink-500/10' : 'opacity-50'}`}>
                                          <div className="flex flex-col overflow-hidden mr-2">
                                              <span className="text-[10px] uppercase tracking-wider opacity-70">Announcement</span>
                                              <span className="truncate">{latestAnnouncement.title}</span>
                                          </div>
                                          {hasNewAnnouncement && <span className="bg-pink-500 w-2 h-2 rounded-full shrink-0"></span>}
                                     </button>
                                 )}
                                 <button onClick={() => { setActiveTab("Messages"); setIsNotifOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm font-bold ${unreadMsgCount > 0 ? 'text-blue-500 bg-blue-500/10' : 'opacity-50'}`}>
                                                 <span>Unread Messages</span>
                                                 <span className="bg-blue-500 text-white text-[10px] px-1.5 rounded-full">{unreadMsgCount}</span>
                                 </button>
                                 <button onClick={() => { setActiveTab("Applications"); setIsNotifOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm font-bold ${hasUnreadUpdates ? 'text-amber-500 bg-amber-500/10' : 'opacity-50'}`}>
                                                 <span>Application Updates</span>
                                                 {hasUnreadUpdates && <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>}
                                 </button>
                                 {totalNotifications === 0 && <div className="text-center py-4 opacity-30 text-xs font-bold uppercase">No new notifications</div>}
                             </div>
                        </div>
                    )}
                </div>

                <div onClick={() => setActiveTab("Profile")} className="cursor-pointer group">
                    <div className={`w-10 h-10 rounded-full overflow-hidden border-2 shadow-sm transition-transform active:scale-95 ${darkMode ? 'border-slate-600 group-hover:border-white' : 'border-white group-hover:border-blue-500'}`}>
                        {profileImage ? <img src={profileImage} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold">{applicantData.firstName ? applicantData.firstName.charAt(0) : "A"}</div>}
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
                    <h1 className="font-black text-sm tracking-tight leading-none truncate max-w-[120px]">{applicantData.firstName || "User"} {applicantData.lastName || ""}</h1>
                    <p className="text-[10px] opacity-60 font-bold uppercase tracking-wider group-hover:text-blue-500 transition-colors">View Profile</p>
                </div>
            </div>
             <button onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(false); }} className="absolute top-0 right-4 p-2 opacity-50 hover:opacity-100"><XMarkIcon className="w-6 h-6" /></button>
        </div>

        <nav className="flex-1 px-4 space-y-3 py-4 overflow-y-auto no-scrollbar">
            {isVerified ? (
                <NavBtn active={activeTab==="Ratings"} onClick={()=>{setActiveTab("Ratings"); setIsSidebarOpen(false)}} icon={<StarIconOutline className="w-6 h-6"/>} label="Ratings" open={true} dark={darkMode} />
            ) : (
                <NavBtn active={false} onClick={()=>{}} icon={<LockClosedIcon className="w-6 h-6 text-slate-500"/>} label="Ratings Locked" open={true} dark={darkMode} />
            )}
            <div className={`h-px mx-4 my-2 ${darkMode ? 'bg-white/10' : 'bg-slate-900/10'}`}></div>
            <NavBtn active={activeTab==="Announcements"} onClick={()=>{setActiveTab("Announcements"); setIsSidebarOpen(false)}} icon={<MegaphoneIcon className="w-6 h-6"/>} label="Announcements" open={true} dark={darkMode} />
            <div className={`h-px mx-4 my-2 ${darkMode ? 'bg-white/10' : 'bg-slate-900/10'}`}></div>
            <NavBtn active={activeTab==="Support"} onClick={()=>{setActiveTab("Support"); setIsSidebarOpen(false)}} icon={<QuestionMarkCircleIcon className="w-6 h-6"/>} label="Help & Support" open={true} dark={darkMode} />
            <div className={`h-px mx-4 my-2 ${darkMode ? 'bg-white/10' : 'bg-slate-900/10'}`}></div>
            <NavBtn active={activeTab==="Profile"} onClick={()=>{setActiveTab("Profile"); setIsEditingProfile(true); setIsSidebarOpen(false); }} icon={<UserCircleIcon className="w-6 h-6"/>} label="Profile" open={true} dark={darkMode} />
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

      {/* MAIN CONTENT */}
      <main className={`relative z-10 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${(isFullScreenPage) ? 'p-0 pt-0' : 'p-4 lg:p-8 pt-24 lg:pt-28'}`}>

        {!(isFullScreenPage) && (
        <header className={`mb-6 lg:mb-8 flex items-center justify-between p-4 rounded-2xl ${glassPanel}`}>
            <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl hidden md:block ${darkMode ? 'bg-white/5' : 'bg-blue-50'}`}>
                    {activeTab === "FindJobs" && <SparklesIcon className="w-6 h-6 text-blue-500"/>}
                    {activeTab === "Saved" && <BookmarkIcon className="w-6 h-6 text-blue-500"/>}
                    {activeTab === "Applications" && <PaperAirplaneIcon className="w-6 h-6 text-blue-500"/>}
                    {activeTab === "Messages" && <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-500"/>}
                    {activeTab === "Profile" && <UserCircleIcon className="w-6 h-6 text-blue-500"/>}
                    {activeTab === "Ratings" && <StarIconOutline className="w-6 h-6 text-blue-500"/>}
                    {activeTab === "Support" && <QuestionMarkCircleIcon className="w-6 h-6 text-blue-500"/>}
                    {activeTab === "Announcements" && <MegaphoneIcon className="w-6 h-6 text-blue-500"/>}
                </div>
                <div>
                    <h2 className={`text-xl lg:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>{activeTab === "Support" ? "Help & Support" : activeTab}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Applicant Workspace</p>
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
                                {isEditingProfile ? <input type="text" value={applicantData.title} onChange={(e) => setApplicantData({...applicantData, title: e.target.value})} className={`bg-transparent border-b-2 outline-none font-bold text-sm uppercase tracking-wider w-full md:w-1/2 select-text ${darkMode ? 'border-white/20 text-blue-400' : 'border-slate-400 text-blue-600'}`} placeholder="Job Title (e.g. Carpenter)" /> : <p className="text-blue-500 font-bold text-sm uppercase tracking-wider cursor-default">{applicantData.title || "Job Seeker"}</p>}
                            </div>
                            <div className="flex flex-wrap gap-6 text-xs font-bold text-slate-500 cursor-default select-none mt-4">
                                <div className="flex items-center gap-2"><MapPinIcon className="w-4 h-4" /><span className={!applicantData.sitio ? 'opacity-50 italic' : ''}>{applicantData.sitio || "Sitio not set"}</span></div>
                                <div className="flex items-center gap-2"><span className="text-slate-500">{userData?.email}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className={`col-span-1 lg:col-span-2 p-8 rounded-[2.5rem] relative overflow-hidden ${glassPanel}`}>
                        <div className="absolute top-0 left-0 w-2 h-full bg-blue-500/20"></div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500"><UserIcon className="w-5 h-5" /></div>
                            <h3 className={`font-black uppercase tracking-widest text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>Professional Summary</h3>
                        </div>
                        {isEditingProfile ? <textarea value={applicantData.bio} onChange={(e) => setApplicantData({...applicantData, bio: e.target.value})} placeholder="Introduce yourself to employers..." className={`w-full h-32 p-4 rounded-xl text-sm bg-transparent border resize-none outline-none select-text focus:ring-2 ring-blue-500/50 ${darkMode ? 'border-white/20 text-slate-300' : 'border-slate-300 text-slate-600'}`} /> : <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{applicantData.bio || "No information added yet."}</p>}
                    </div>
                    
                    <div className={`p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col h-[28rem] ${glassPanel}`}>
                        <div className="absolute top-0 left-0 w-2 h-full bg-amber-500/20"></div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500"><BriefcaseIcon className="w-5 h-5" /></div>
                            <h3 className={`font-black uppercase tracking-widest text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>Experience</h3>
                        </div>
                        
                        <div className="overflow-y-auto no-scrollbar flex-1 pr-2">
                            {isEditingProfile ? (
                                <div className="space-y-3">
                                    {(() => {
                                        const expLines = applicantData.experience ? applicantData.experience.split('\n') : [''];
                                        return expLines.map((line, i) => (
                                            <div key={i} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 w-full">
                                                <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 w-16 text-right ${darkMode ? 'text-amber-500' : 'text-amber-600'}`}>Work at</span>
                                                <input
                                                    type="text"
                                                    value={line}
                                                    placeholder="Company Name / Role..."
                                                    autoFocus={i === expLines.length - 1 && expLines.length > 1}
                                                    className={`w-full min-w-0 p-3 rounded-xl text-sm bg-transparent border outline-none focus:border-amber-500 transition-colors ${darkMode ? 'border-white/20 text-slate-300' : 'border-slate-300 text-slate-600'}`}
                                                    onChange={(e) => {
                                                        const newLines = [...expLines];
                                                        newLines[i] = e.target.value;
                                                        setApplicantData({...applicantData, experience: newLines.join('\n')});
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const newLines = [...expLines];
                                                            newLines.splice(i + 1, 0, ""); 
                                                            setApplicantData({...applicantData, experience: newLines.join('\n')});
                                                        }
                                                        if (e.key === 'Backspace' && line === '' && expLines.length > 1) {
                                                            e.preventDefault();
                                                            const newLines = [...expLines];
                                                            newLines.splice(i, 1);
                                                            setApplicantData({...applicantData, experience: newLines.join('\n')});
                                                        }
                                                    }}
                                                />
                                            </div>
                                        ));
                                    })()}
                                    <p className="text-[9px] text-center opacity-40 uppercase font-bold pt-2">Press Enter to add new experience</p>
                                </div>
                            ) : (
                                <div className="relative ml-3 space-y-6 pb-2">
                                     {applicantData.experience ? splitByNewLine(applicantData.experience).map((line, i) => (
                                         <div key={i} className="relative pl-6">
                                             <span className="absolute -left-[4.5px] top-2 w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                             <div className="flex flex-col">
                                                <span className={`text-[9px] font-black uppercase tracking-widest mb-0.5 opacity-60 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>Work at</span>
                                                <p className={`text-sm font-bold leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{line}</p>
                                             </div>
                                         </div>
                                     )) : <div className="pl-6 text-sm opacity-50 italic">No experience listed.</div>}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={`p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col h-[28rem] ${glassPanel}`}>
                        <div className="absolute top-0 left-0 w-2 h-full bg-purple-500/20"></div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500"><AcademicCapIcon className="w-5 h-5" /></div>
                            <h3 className={`font-black uppercase tracking-widest text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>Education</h3>
                        </div>
                        
                        <div className="overflow-y-auto no-scrollbar flex-1 pr-2">
                             {isEditingProfile ? (
                                <div className="space-y-4">
                                    {(() => {
                                        const labels = ["Primary School", "Secondary School", "College Graduated at"];
                                        const eduLines = applicantData.education ? applicantData.education.split('\n') : ['', '', ''];
                                        
                                        return labels.map((label, i) => (
                                            <div key={i} className="space-y-1 w-full">
                                                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{label}</label>
                                                <input
                                                    type="text"
                                                    value={eduLines[i] || ''}
                                                    placeholder={`Enter ${label}...`}
                                                    className={`w-full min-w-0 p-3 rounded-xl text-sm bg-transparent border outline-none focus:border-purple-500 transition-colors ${darkMode ? 'border-white/20 text-slate-300' : 'border-slate-300 text-slate-600'}`}
                                                    onChange={(e) => {
                                                        const newLines = [...eduLines];
                                                        while (newLines.length <= i) newLines.push("");
                                                        newLines[i] = e.target.value;
                                                        setApplicantData({...applicantData, education: newLines.join('\n')});
                                                    }}
                                                />
                                            </div>
                                        ));
                                    })()}
                                </div>
                             ) : (
                                 <div className="relative ml-3 space-y-6 pb-2">
                                     {applicantData.education ? splitByNewLine(applicantData.education).map((line, i) => {
                                         const labels = ["Primary School", "Secondary School", "College Graduated at"];
                                         return (
                                             <div key={i} className="relative pl-6">
                                                 <span className="absolute -left-[4.5px] top-2 w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                                                 <div className="flex flex-col">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                                        {labels[i] || "Additional Education"}
                                                    </span>
                                                    <p className={`text-sm font-bold leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{line}</p>
                                                 </div>
                                             </div>
                                         );
                                     }) : <div className="pl-6 text-sm opacity-50 italic">No education listed.</div>}
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* RATINGS TAB */}
        {isVerified && activeTab === "Ratings" && (
            <div key="Ratings" className="animate-content space-y-6">
                
                <div className={`p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden flex flex-col items-center justify-center text-center ${glassPanel}`}>
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600"></div>
                    
                    <h3 className={`text-xs font-black uppercase tracking-[0.3em] mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Overall Reputation</h3>
                    
                    <div className="flex items-center justify-center gap-6 mb-4">
                        <span className={`text-7xl md:text-8xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {averageRating || "0.0"}
                        </span>
                        <div className="flex flex-col items-start gap-1">
                            <div className="flex text-amber-400 gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    star <= Math.round(Number(averageRating)) ? (
                                        <StarIconSolid key={star} className="w-6 h-6 md:w-8 md:h-8 text-amber-400 drop-shadow-md" />
                                    ) : (
                                        <StarIconOutline key={star} className="w-6 h-6 md:w-8 md:h-8 text-slate-300 dark:text-slate-700" />
                                    )
                                ))}
                            </div>
                            <span className="text-xs font-bold opacity-50 uppercase tracking-widest">{reviews.length} Total Reviews</span>
                        </div>
                    </div>
                    
                    <p className="text-xs opacity-40 max-w-md mx-auto">
                        Ratings are based on feedback from employers you have worked with.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div className="flex items-center gap-3 mb-2 px-2">
                        <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500"><StarIconSolid className="w-5 h-5"/></div>
                        <h3 className={`font-black uppercase tracking-[0.2em] text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>Recent Feedback</h3>
                    </div>

                    {reviews.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {reviews.map((rev) => (
                                <div key={rev.id} className={`p-6 rounded-[2rem] border relative group transition-all hover:-translate-y-1 ${darkMode ? 'bg-slate-800/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                                                {rev.reviewerPic ? <img src={rev.reviewerPic} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-500">{rev.reviewerName?.charAt(0)}</div>}
                                            </div>
                                            <div>
                                                <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{rev.reviewerName || "Anonymous"}</h4>
                                                <p className="text-[9px] font-bold opacity-40 uppercase">{rev.createdAt ? formatTime(rev.createdAt) : 'Just now'}</p>
                                            </div>
                                        </div>
                                        <div className="flex bg-amber-500/10 px-2 py-1 rounded-lg">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                s <= rev.rating ? (
                                                    <StarIconSolid key={s} className="w-3 h-3 text-amber-500" />
                                                ) : (
                                                    <StarIconOutline key={s} className="w-3 h-3 text-amber-500/40" />
                                                )
                                            ))}
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute -top-2 -left-1 text-4xl font-serif opacity-10">“</span>
                                        <p className={`text-sm leading-relaxed pl-4 relative z-10 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                            {rev.comment || "No comment provided."}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center flex flex-col items-center opacity-40">
                            <StarIconSolid className="w-16 h-16 text-slate-300 mb-4"/>
                            <p className="font-bold uppercase text-xs tracking-widest">No reviews yet</p>
                            <p className="text-[10px] mt-2">Feedback will appear here once employers rate you.</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* SUPPORT TAB */}
        {activeTab === "Support" && (
            <div key="Support" className={`grid grid-cols-1 lg:grid-cols-3 gap-6 animate-content ${isMobile ? (isSupportOpen ? 'h-screen pb-0' : 'h-[calc(100vh-14rem)] pb-2') : 'h-[calc(100vh-10rem)]'}`}>
                
                <div className={`lg:col-span-1 rounded-[2.5rem] overflow-hidden flex flex-col ${glassPanel} ${(isMobile && isSupportOpen) ? 'hidden' : 'flex'} ${isMobile ? 'h-full mb-4' : 'h-full'}`}>
                    <div className="p-4 md:p-6 border-b border-gray-500/10 flex justify-between items-center">
                        <div>
                            <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>My Tickets</h3>
                            <p className="text-xs opacity-50 font-bold uppercase mt-1">{supportTickets.length} Total Requests</p>
                        </div>
                        <button 
                            onClick={() => { setActiveSupportTicket(null); setIsSupportOpen(true); }}
                            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
                        >
                            <PlusIcon className="w-5 h-5"/>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2">
                        {supportTickets.length > 0 ? (
                            supportTickets.map((ticket) => (
                                <div 
                                    key={ticket.id}
                                    onClick={() => { setActiveSupportTicket(ticket); setIsSupportOpen(true); }}
                                    onTouchStart={() => handleTicketTouchStart(ticket.id)}
                                    onTouchEnd={handleTicketTouchEnd}
                                    onMouseDown={() => handleTicketTouchStart(ticket.id)} 
                                    onMouseUp={handleTicketTouchEnd}
                                    onMouseLeave={handleTicketTouchEnd}
                                    className={`p-4 rounded-2xl cursor-pointer transition-all border group relative ${activeSupportTicket?.id === ticket.id ? 'bg-blue-600/10 border-blue-500' : darkMode ? 'bg-white/5 border-transparent hover:bg-white/10' : 'bg-slate-100 border-transparent hover:bg-slate-200'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>Request #{ticket.ticketId}</h4>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${ticket.status === 'closed' ? 'bg-slate-500/20 text-slate-500' : 'bg-emerald-500/20 text-emerald-500'}`}>{ticket.status || 'open'}</span>
                                    </div>
                                    <p className="text-xs opacity-50 truncate">
                                        {ticket.messages && ticket.messages.length > 0 ? ticket.messages[ticket.messages.length - 1].text : 'No messages'}
                                    </p>
                                    
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteTicket(ticket.id);
                                        }}
                                        className="hidden lg:block absolute bottom-2 right-2 p-1.5 rounded-lg bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                        <TrashIcon className="w-3 h-3"/>
                                    </button>

                                    {longPressedTicketId === ticket.id && isMobile && (
                                        <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-sm rounded-2xl flex items-center justify-center gap-4 animate-in fade-in zoom-in-95">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setLongPressedTicketId(null);
                                                    handleDeleteTicket(ticket.id);
                                                }}
                                                className="p-3 bg-red-600 text-white rounded-full shadow-lg"
                                            >
                                                <TrashIcon className="w-6 h-6"/>
                                            </button>
                                            <button 
                                                 onClick={(e) => {
                                                    e.stopPropagation();
                                                    setLongPressedTicketId(null);
                                                }}
                                                className="p-3 bg-white/20 text-white rounded-full"
                                            >
                                                <XMarkIcon className="w-6 h-6"/>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                             <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                                 <ChatBubbleLeftRightIcon className="w-8 h-8 md:w-12 md:h-12 mb-2"/>
                                 <p className="text-sm font-bold">No history yet</p>
                                 <button onClick={() => setIsSupportOpen(true)} className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest">
                                     Contact Admin
                                 </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className={`
                  ${isMobile && isSupportOpen ? 'fixed inset-0 z-[60] rounded-none border-0' : 'lg:col-span-2 rounded-[2.5rem] border flex flex-col overflow-hidden relative'}
                  ${(isMobile && !isSupportOpen) ? 'hidden' : 'flex flex-col'} 
                  ${glassPanel}
                  ${isMobile && isSupportOpen ? 'bg-slate-900' : ''}
                `}>
                    
                    <div className="p-4 border-b border-gray-500/10 flex justify-between items-center bg-white/5 backdrop-blur-sm z-10 shrink-0">
                        <div className="flex items-center gap-3">
                            {isMobile && (
                                <button onClick={() => setIsSupportOpen(false)} className="p-2 -ml-2 rounded-full hover:bg-white/10">
                                    <ChevronLeftIcon className="w-6 h-6"/>
                                </button>
                            )}
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md">
                                <CpuChipIcon className="w-6 h-6"/>
                            </div>
                            <div>
                                <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                    {activeSupportTicket ? `Request #${activeSupportTicket.ticketId}` : "New Request"}
                                </h4>
                                <p className="text-xs opacity-50 font-bold uppercase flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span> 
                                    Admin & Bot Active
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {activeSupportTicket && activeSupportTicket.status !== 'closed' && (
                                <button 
                                    onClick={() => handleCloseSupportTicket(activeSupportTicket.id)}
                                    className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-red-500 hover:text-white transition-all"
                                >
                                    Close Request
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 no-scrollbar">
                        {activeSupportTicket ? (
                            activeSupportTicket.messages && activeSupportTicket.messages.length > 0 ? (
                                activeSupportTicket.messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${msg.sender === 'user' 
                                            ? 'bg-blue-600 text-white rounded-tr-sm shadow-blue-500/20 shadow-lg' 
                                            : `rounded-tl-sm ${darkMode ? 'bg-white/10 text-white' : 'bg-white text-slate-800 shadow-sm'}`}`}>
                                            {msg.imageUrl && (
                                                <img src={msg.imageUrl} alt="Attachment" className="rounded-lg mb-2 max-h-48 w-full object-cover border border-white/20"/>
                                            )}
                                            <p className="whitespace-pre-wrap">{msg.text}</p>
                                        </div>
                                    </div>
                                ))
                            ) : null
                        ) : (
                             <div className="flex flex-col items-center justify-center h-full opacity-30 text-center px-4">
                                <MegaphoneIcon className="w-16 h-16 mb-4"/>
                                <p className="font-bold text-lg">New Support Message</p>
                                <p className="text-xs mt-2 max-w-xs">Ask about Verification, Job Applications, or Account Management.</p>
                            </div>
                        )}
                        
                        {isBotTyping && (
                            <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                                <div className={`p-4 rounded-2xl rounded-tl-sm flex items-center gap-1 ${darkMode ? 'bg-white/10' : 'bg-white shadow-sm'}`}>
                                    <div className="w-2 h-2 rounded-full bg-slate-400 typing-dot"></div>
                                    <div className="w-2 h-2 rounded-full bg-slate-400 typing-dot"></div>
                                    <div className="w-2 h-2 rounded-full bg-slate-400 typing-dot"></div>
                                </div>
                            </div>
                        )}

                        <div ref={ticketScrollRef} />
                    </div>

                    <div className="p-4 border-t border-gray-500/10 bg-white/5 backdrop-blur-sm shrink-0 pb-10 lg:pb-4">
                        {activeSupportTicket?.status === 'closed' ? (
                            <div className="text-center p-2 text-[10px] font-black uppercase opacity-50 italic">
                                This request is closed. Start a new one to continue.
                            </div>
                        ) : (
                            <>
                                <div className="flex gap-2 overflow-x-auto pb-3 mb-2 hide-scrollbar">
                                    {BOT_FAQ.map((faq) => (
                                        <button 
                                            key={faq.id} 
                                            onClick={() => handleSendFAQ(faq)}
                                            className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 whitespace-nowrap border ${darkMode ? 'bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600'}`}
                                        >
                                            {faq.question}
                                        </button>
                                    ))}
                                </div>

                                {supportAttachment && (
                                    <div className="mb-2 p-2 bg-blue-500/10 rounded-lg flex items-center justify-between animate-in zoom-in-95">
                                        <span className="text-xs text-blue-500 truncate max-w-[200px] font-bold">{supportAttachment.name}</span>
                                        <button onClick={() => setSupportAttachment(null)}><XMarkIcon className="w-4 h-4 text-blue-500"/></button>
                                    </div>
                                )}
                                <form onSubmit={handleSendSupportMessage} className="flex gap-2 items-center">
                                    <input type="file" ref={supportFileRef} onChange={handleSupportFileSelect} className="hidden" accept="image/*" />
                                    <button type="button" onClick={() => supportFileRef.current.click()} className={`p-3 rounded-xl transition-colors ${darkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'}`}>
                                        <PaperClipIcon className="w-5 h-5"/>
                                    </button>
                                    <input 
                                        type="text" 
                                        value={ticketMessage}
                                        onChange={(e) => setTicketMessage(e.target.value)}
                                        placeholder="Type your message..." 
                                        className={`flex-1 p-3 rounded-xl border-none outline-none text-sm font-medium ${darkMode ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-white text-slate-800 shadow-inner'}`}
                                    />
                                    <button type="submit" disabled={isSupportUploading} className="p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50">
                                        {isSupportUploading ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <PaperAirplaneIcon className="w-5 h-5"/>}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* RESTRICTED TABS */}
        {!isVerified && activeTab !== "Support" && activeTab !== "Profile" && activeTab !== "Announcements" && (
             <RestrictedView />
        )}

        {activeTab === "Announcements" && (
            <div key="Announcements" className="animate-content space-y-6">
                <div className={`p-6 lg:p-8 rounded-[2.5rem] relative overflow-hidden ${glassPanel} min-h-[50vh]`}>
                    <div className="flex items-center gap-3 mb-6 lg:mb-8">
                        <MegaphoneIcon className="w-8 h-8 text-pink-500" />
                        <div>
                            <h3 className={`font-black text-2xl uppercase tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Announcements</h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Updates from Admin</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {announcements.length === 0 ? (
                            <div className="text-center py-20 opacity-50 flex flex-col items-center">
                                <MegaphoneIcon className="w-16 h-16 mb-4 opacity-20"/>
                                <p className="font-bold uppercase tracking-widest text-xs">No announcements yet</p>
                            </div>
                        ) : (
                            announcements.map(ann => (
                                <div key={ann.id} className={`p-6 rounded-3xl border relative overflow-hidden group transition-all hover:-translate-y-1 ${darkMode ? 'bg-slate-800/40 border-white/5' : 'bg-white/40 border-slate-200'}`}>
                                     <div className="absolute top-0 left-0 w-1.5 h-full bg-pink-500"></div>
                                     <div className="flex justify-between items-start mb-3 pl-2">
                                        <h4 className={`font-black text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>{ann.title}</h4>
                                        <span className="text-[10px] font-bold uppercase bg-black/5 dark:bg-white/5 px-2 py-1 rounded opacity-50">{ann.date}</span>
                                     </div>
                                     <p className={`text-sm pl-2 leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{ann.body}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

        {isVerified && activeTab === "FindJobs" && (
            <div key="FindJobs" className="animate-content">
                <div className="space-y-6 mb-8">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mt-4 md:mt-8">
                        <div onClick={() => setActiveTab("FindJobs")} className={`shine relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer ${darkMode ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/20 border backdrop-blur-xl' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'}`}>
                            <div className="relative z-10">
                                <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{availableJobs.length}</h3>
                                <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>Jobs</p>
                            </div>
                            <BriefcaseIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-900'}`}/>
                        </div>

                        <div onClick={() => setActiveTab("Saved")} className={`shine relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer ${darkMode ? 'bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20 border backdrop-blur-xl' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'}`}>
                            <div className="relative z-10">
                                <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{savedJobs.length}</h3>
                                <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-purple-200' : 'text-blue-800'}`}>Saved</p>
                            </div>
                            <BookmarkIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-900'}`}/>
                        </div>

                        <div onClick={() => setActiveTab("Applications")} className={`shine relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer ${darkMode ? 'bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/20 border backdrop-blur-xl' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'}`}>
                            <div className="relative z-10">
                                <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{myApplications.length}</h3>
                                <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-amber-200' : 'text-blue-800'}`}>Applied</p>
                            </div>
                            <PaperAirplaneIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-900'}`}/>
                        </div>

                        <div onClick={() => setActiveTab("Messages")} className={`shine relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer ${darkMode ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 border-pink-500/20 border backdrop-blur-xl' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'}`}>
                            <div className="relative z-10">
                                <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{unreadMsgCount}</h3>
                                <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-pink-200' : 'text-blue-800'}`}>Messages</p>
                            </div>
                            <ChatBubbleLeftRightIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-900'}`}/>
                        </div>
                      </div>

                    <div className={`flex flex-col lg:flex-row items-center p-1.5 rounded-2xl border shadow-sm w-full gap-2 lg:gap-0 relative z-40 ${glassPanel}`}>
                        <div className="relative w-full lg:flex-1 min-w-0">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="Search job title or employer..." value={jobSearch} onChange={(e) => setJobSearch(e.target.value)} className={glassInput + " pl-9 pr-4 py-2.5"} />
                        </div>
                        
                        <div className={`hidden lg:block w-px h-6 mx-2 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                        
                        <div className="relative w-full lg:w-auto lg:min-w-[180px] shrink-0">
                            <button onClick={() => { setIsSitioDropdownOpen(!isSitioDropdownOpen); setIsCategoryDropdownOpen(false); }} className={`w-full lg:w-48 flex items-center justify-between pl-2 pr-2 py-1.5 outline-none font-bold text-xs cursor-pointer transition-colors rounded-xl border lg:border-none ${darkMode ? 'text-white hover:bg-white/5 border-white/10' : 'text-slate-700 hover:bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                                        <MapPinIcon className="w-4 h-4" />
                                    </div>
                                    <span className="truncate">{jobLocationFilter || "All Locations"}</span>
                                </div>
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                                    <ChevronDownIcon className={`w-3 h-3 transition-transform ${isSitioDropdownOpen ? 'rotate-180' : ''}`}/>
                                </div>
                            </button>
                             {isSitioDropdownOpen && (
                                <div className={`absolute top-full left-0 mt-2 w-full lg:w-56 z-[60] rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                     <div className="max-h-60 overflow-y-auto p-1 space-y-1 hide-scrollbar">
                                         <button onClick={() => { setJobLocationFilter(""); setIsSitioDropdownOpen(false); }} className={`w-full text-left p-3 rounded-lg transition-colors ${!jobLocationFilter ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                                              <span className="text-xs font-bold block">All Locations</span>
                                         </button>
                                         {PUROK_LIST.map(p => (
                                              <button key={p} onClick={() => { setJobLocationFilter(p); setIsSitioDropdownOpen(false); }} className={`w-full text-left p-3 rounded-lg transition-colors ${jobLocationFilter === p ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                                                   <span className="text-xs font-bold block">{p}</span>
                                              </button>
                                         ))}
                                     </div>
                                </div>
                            )}
                            {isSitioDropdownOpen && <div className="fixed inset-0 z-[50]" onClick={() => setIsSitioDropdownOpen(false)}></div>}
                        </div>

                        <div className={`hidden lg:block w-px h-6 mx-2 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>

                        <div className="relative w-full lg:w-auto lg:min-w-[180px] shrink-0">
                             <button onClick={() => { setIsCategoryDropdownOpen(!isCategoryDropdownOpen); setIsSitioDropdownOpen(false); }} className={`w-full lg:w-48 flex items-center justify-between pl-2 pr-2 py-1.5 outline-none font-bold text-xs cursor-pointer transition-colors rounded-xl border lg:border-none ${darkMode ? 'text-white hover:bg-white/5 border-white/10' : 'text-slate-700 hover:bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 shrink-0">
                                        <TagIcon className="w-4 h-4" />
                                    </div>
                                    <span className="truncate">{jobCategoryFilter ? JOB_CATEGORIES.find(c => c.id === jobCategoryFilter)?.label : "All Categories"}</span>
                                </div>
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                                    <ChevronDownIcon className={`w-3 h-3 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}/>
                                </div>
                             </button>
                             {isCategoryDropdownOpen && (
                                <div className={`absolute top-full left-0 mt-2 w-full lg:w-56 z-[60] rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                     <div className="max-h-60 overflow-y-auto p-1 space-y-1 hide-scrollbar">
                                         <button onClick={() => { setJobCategoryFilter(""); setIsCategoryDropdownOpen(false); }} className={`w-full text-left p-3 rounded-lg transition-colors ${!jobCategoryFilter ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                                              <span className="text-xs font-bold block">All Categories</span>
                                         </button>
                                         {JOB_CATEGORIES.map(c => (
                                              <button key={c.id} onClick={() => { setJobCategoryFilter(c.id); setIsCategoryDropdownOpen(false); }} className={`w-full text-left p-3 rounded-lg transition-colors group ${jobCategoryFilter === c.id ? 'bg-blue-600 text-white' : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                                                   <div className="flex flex-col">
                                                       <span className="text-xs font-bold block">{c.label}</span>
                                                       <span className={`text-[9px] mt-0.5 font-medium truncate ${jobCategoryFilter === c.id ? 'text-white/70' : 'opacity-50'}`}>
                                                           {c.examples}
                                                       </span>
                                                   </div>
                                              </button>
                                         ))}
                                     </div>
                                </div>
                            )}
                             {isCategoryDropdownOpen && <div className="fixed inset-0 z-[50]" onClick={() => setIsCategoryDropdownOpen(false)}></div>}
                        </div>

                        {displayAnnouncement && (
                            <>
                                <div className={`hidden lg:block w-px h-6 mx-2 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                                <button
                                    onClick={() => handleViewAnnouncement(displayAnnouncement.id)}
                                    className={`
                                        flex items-center gap-3 px-3 py-2 rounded-xl transition-all group overflow-hidden text-left relative 
                                        w-full lg:w-64 shrink-0
                                        ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}
                                    `}
                                >
                                    <div className={`p-1.5 rounded-lg shrink-0 bg-pink-500/10 text-pink-500`}>
                                        <MegaphoneIcon className="w-4 h-4"/>
                                    </div>
                                    <div className="flex flex-col overflow-hidden min-w-0 flex-1 animate-in fade-in slide-in-from-bottom-1 duration-500 key={displayAnnouncement.id}">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-pink-500 leading-none mb-0.5 whitespace-nowrap">Heads Up</span>
                                        <span className={`text-[11px] font-bold truncate leading-tight ${darkMode ? 'text-white' : 'text-slate-700'}`}>
                                            {displayAnnouncement.title}
                                        </span>
                                    </div>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                    {filteredJobs.length > 0 ? filteredJobs.map(job => {
                        const style = getJobStyle(job.type);
                        const isSaved = savedJobs.some(s => s.jobId === job.id);
                        return (
                            <div key={job.id} onClick={() => setSelectedJob(job)} className={`group relative p-4 md:p-6 rounded-[2rem] border overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl cursor-pointer ${darkMode ? 'bg-slate-800/40 border-white/5 hover:border-blue-500/30' : 'bg-white border-slate-200 shadow-sm hover:border-blue-400/50'}`}>
                                <div className="absolute top-10 right-4 md:top-10 md:right-8 opacity-10 transform -rotate-12 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                                     {cloneElement(style.icon, { className: "w-32 h-32 md:w-56 md:h-56" })}
                                </div>
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`backdrop-blur-md px-3 py-1.5 rounded-xl border flex items-center gap-2 shadow-sm ${style.bg} ${style.border}`}>
                                            <span className={`${style.color} scale-90`}>{style.icon}</span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${style.color}`}>{job.type}</span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); handleToggleSaveJob(job); }} className={`p-2 rounded-full transition-colors ${isSaved ? 'text-blue-500 bg-blue-500/10' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>{isSaved ? <BookmarkIcon className="w-5 h-5 fill-current"/> : <BookmarkIcon className="w-5 h-5"/>}</button>
                                    </div>
                                    <div className="mb-3 md:mb-6 space-y-2 pr-4">
                                        <h3 className={`font-black text-lg leading-tight truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{job.title}</h3>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1 truncate">{job.employerName}</p>
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <MapPinIcon className="w-4 h-4 text-blue-500" />
                                            <p className={`text-[10px] md:text-[11px] font-bold uppercase tracking-wide opacity-80 ${!darkMode && 'text-slate-500'}`}>{job.sitio || "No Location"}</p>
                                        </div>
                                    </div>
                                    <div className="mt-auto pt-4 border-t border-dashed border-slate-500/20 flex items-center justify-between">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Salary</p>
                                            <p className={`text-lg md:text-xl font-black bg-clip-text text-transparent bg-gradient-to-r ${darkMode ? 'from-white to-slate-400' : 'from-slate-900 to-slate-600'}`}><span className="text-sm">₱</span> {job.salary}</p>
                                        </div>
                                        <button className="px-4 py-2 rounded-xl bg-blue-600 text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-500/20 group-hover:bg-blue-500 transition-colors">Apply</button>
                                    </div>
                                </div>
                            </div>
                        )
                    }) : (
                        <div className="col-span-full text-center py-20"><SparklesIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" /><p className="opacity-50 font-black uppercase text-xs tracking-[0.3em] select-none cursor-default">No jobs found matching filters</p></div>
                    )}
                </div>
            </div>
        )}

        {isVerified && activeTab === "Saved" && (
          <div key="Saved" className="animate-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {savedJobs.length > 0 ? savedJobs.map(item => {
                const job = item.jobData;
                const style = getJobStyle(job.type);
                const hasApplied = myApplications.some(app => app.jobId === job.id);
                
                return (
                  <div key={item.id} className={`shine group relative p-4 md:p-6 rounded-[2rem] border overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl cursor-pointer ${darkMode ? 'bg-slate-800/40 border-white/5 hover:border-blue-500/30' : 'bg-white border-slate-200 shadow-sm hover:border-blue-400/50'}`}>
                      <div className="absolute top-10 right-4 md:top-10 md:right-8 opacity-10 transform -rotate-12 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                           {cloneElement(style.icon, { className: "w-32 h-32 md:w-56 md:h-56" })}
                      </div>
                      <div className="relative z-10 flex flex-col h-full">
                          <div className="flex justify-between items-start mb-4">
                               <div className={`backdrop-blur-md px-3 py-1.5 rounded-xl border flex items-center gap-2 shadow-sm ${style.bg} ${style.border}`}>
                                   <span className={`${style.color} scale-90`}>{style.icon}</span>
                                   <span className={`text-[10px] font-black uppercase tracking-widest ${style.color}`}>{job.type}</span>
                               </div>
                               <button onClick={() => handleToggleSaveJob(job)} className="text-blue-500 bg-blue-500/10 p-2 rounded-full"><BookmarkIcon className="w-5 h-5 fill-current"/></button>
                          </div>
                          <div className="mb-4">
                              <h3 className={`text-lg md:text-xl font-black leading-tight mb-2 line-clamp-2 select-none cursor-default ${darkMode ? 'text-white' : 'text-slate-900'}`}>{job.title}</h3>
                              <p className="text-xs font-bold opacity-60 uppercase">{job.employerName}</p>
                          </div>
                          <div className="mt-auto flex gap-4 pt-4 border-t border-dashed border-slate-500/20">
                               <button onClick={() => setSelectedJob(job)} className={`flex-1 justify-center flex p-3 rounded-xl transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest ${darkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>View Details</button>
                               {hasApplied ? (
                                   <button disabled className="flex-1 justify-center flex p-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-green-500/10 text-green-500 cursor-not-allowed">Applied</button>
                               ) : (
                                   <button onClick={() => handleApplyToJob(job)} className="flex-1 justify-center flex p-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 shadow-lg">Apply</button>
                               )}
                          </div>
                      </div>
                  </div>
                );
              }) : (<div className="col-span-full text-center py-20"><p className="opacity-50 font-black uppercase text-xs tracking-[0.3em] select-none cursor-default">No saved jobs</p></div>)}
            </div>
          </div>
        )}

        {isVerified && activeTab === "Applications" && (
          <div key="Applications" className="animate-content space-y-10">
            <div className={`flex items-center p-1.5 rounded-2xl border shadow-sm w-full md:w-96 ${glassPanel}`}>
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Search applications..." value={applicationSearch} onChange={(e) => setApplicationSearch(e.target.value)} className={glassInput + " pl-9 pr-4 py-2.5"} />
                </div>
            </div>

            <section className="space-y-6">
                <div className="flex items-center gap-3"><ClockIcon className="w-5 h-5 text-amber-500" /><h3 className="font-black text-sm uppercase tracking-[0.2em] text-amber-500 select-none cursor-default">Pending Review ({pendingApplications.length})</h3><div className="flex-1 h-px bg-amber-500/10"></div></div>
                <div className="space-y-4">
                    {pendingApplications.length > 0 ? pendingApplications.map(app => (
                        <ApplicationCard
                            key={app.id} app={app} darkMode={darkMode}
                            onWithdraw={() => handleWithdrawApplication(app.id)}
                            onView={() => handleViewApplicationDetails(app)}
                        />
                    )) : (<div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 select-none cursor-default">No pending applications</p></div>)}
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-blue-500" /><h3 className="font-black text-sm uppercase tracking-[0.2em] text-blue-500 select-none cursor-default">Accepted Applications ({acceptedApplications.length})</h3><div className="flex-1 h-px bg-blue-500/10"></div></div>
                <div className="space-y-4">
                    {acceptedApplications.length > 0 ? acceptedApplications.map(app => (
                        <ApplicationCard
                            key={app.id} app={app} darkMode={darkMode} isAccepted={true}
                            onChat={() => handleStartChatFromExternal({ id: app.employerId, name: app.employerName || "Employer", profilePic: null })}
                            onView={() => handleViewApplicationDetails(app)}
                            unreadCount={conversations.find(c => c.chatId.includes(app.employerId))?.[`unread_${auth.currentUser.uid}`] || 0}
                            onRate={() => { setSelectedEmployerToRate(app); setIsRatingEmployerModalOpen(true); }}
                            onWithdraw={() => handleWithdrawApplication(app.id)} 
                        />
                    )) : (<div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 select-none cursor-default">No accepted applications</p></div>)}
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-3"><XMarkIcon className="w-5 h-5 text-red-500" /><h3 className="font-black text-sm uppercase tracking-[0.2em] text-red-500 select-none cursor-default">Rejected Applications ({rejectedApplications.length})</h3><div className="flex-1 h-px bg-red-500/10"></div></div>
                <div className="space-y-4">
                    {rejectedApplications.length > 0 ? rejectedApplications.map(app => (
                        <ApplicationCard
                            key={app.id} app={app} darkMode={darkMode} isRejected={true}
                            onWithdraw={() => handleWithdrawApplication(app.id)}
                            onView={() => handleViewApplicationDetails(app)}
                        />
                    )) : (<div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-300 bg-slate-50'}`}><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 select-none cursor-default">No rejected applications</p></div>)}
                </div>
            </section>
          </div>
        )}

        {isVerified && activeTab === "Messages" && (
            <div key="Messages" className={`grid grid-cols-1 lg:grid-cols-3 gap-6 animate-content ${isMobile ? (activeChat ? 'h-screen pb-0' : 'h-[calc(100vh-14rem)] pb-2') : 'h-[calc(100vh-10rem)]'}`}>
                {/* LEFT COLUMN: CONVERSATION LIST */}
                <div className={`lg:col-span-1 rounded-[2.5rem] overflow-hidden flex flex-col ${glassPanel} ${(isMobile && activeChat) ? 'hidden' : 'flex'} ${isMobile ? 'h-full mb-4' : 'h-full'}`}>
                    <div className="p-4 md:p-6 border-b border-gray-500/10 shrink-0">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>Messages</h3>
                                <p className="text-xs opacity-50 font-bold uppercase mt-1">{filteredChats.length} Conversations</p>
                            </div>
                        </div>
                        <div className={`flex items-center p-1.5 rounded-2xl border transition-all ${darkMode ? 'bg-slate-800 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                            <MagnifyingGlassIcon className="w-4 h-4 ml-2 text-slate-400" />
                            <input value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="Search chats..." className="bg-transparent border-none outline-none text-xs p-2 w-full font-bold" />
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
                        {filteredChats.length > 0 ? (
                            filteredChats.map(c => {
                                const otherId = c.participants.find(p => p !== auth.currentUser.uid);
                                const name = c.names?.[otherId] || "User"; 
                                const otherPic = c.profilePics?.[otherId];
                                const unread = c[`unread_${auth.currentUser.uid}`] || 0;
                                const isActive = activeChat?.id === otherId;

                                return (
                                    <button 
                                        key={c.chatId} 
                                        onClick={() => openChat({ id: otherId, name, profilePic: otherPic })} 
                                        className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all relative group ${isActive ? 'bg-blue-600/10 border-blue-500 border' : darkMode ? 'hover:bg-white/5 border-transparent border' : 'hover:bg-slate-100 border-transparent border'}`}
                                    >
                                        <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-lg font-black shrink-0 overflow-hidden ${isActive ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent' : (darkMode ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600')}`}>
                                            {otherPic ? <img src={otherPic} alt={name} className="w-full h-full object-cover" /> : name.charAt(0)}
                                        </div>
                                        <div className="flex-1 text-left overflow-hidden">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`font-black text-sm truncate ${isActive ? 'text-blue-500' : darkMode ? 'text-white' : 'text-slate-900'}`}>{name}</span>
                                                <span className={`text-[9px] font-bold opacity-40`}>{formatTime(c.lastTimestamp)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className={`text-xs truncate max-w-[85%] font-medium ${unread > 0 ? 'text-blue-500 font-bold' : 'opacity-60'}`}>
                                                    {c.lastMessage}
                                                </span>
                                                {unread > 0 && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-40 h-full py-20">
                                <ChatBubbleOvalLeftEllipsisIcon className="w-12 h-12 mb-2"/>
                                <p className="text-sm font-bold">No chats found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: CHAT INTERFACE */}
                <div className={`
                  ${isMobile && activeChat ? 'fixed inset-0 z-[60] rounded-none border-0' : 'lg:col-span-2 rounded-[2.5rem] border flex flex-col overflow-hidden relative'}
                  ${(isMobile && !activeChat) ? 'hidden' : 'flex flex-col'} 
                  ${glassPanel}
                  ${isMobile && activeChat ? 'bg-slate-900' : ''}
                `}>
                    
                    {activeChat ? (
                        <>
                            {/* Header */}
                            <div className="p-4 border-b border-gray-500/10 flex justify-between items-center bg-white/5 backdrop-blur-sm z-10 shrink-0">
                                <div className="flex items-center gap-3">
                                    {isMobile && (
                                        <button onClick={() => closeChat()} className="p-2 -ml-2 rounded-full hover:bg-white/10">
                                            <ChevronLeftIcon className="w-6 h-6"/>
                                        </button>
                                    )}
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md overflow-hidden">
                                        {activeChat.profilePic ? <img src={activeChat.profilePic} className="w-full h-full object-cover"/> : activeChat.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{activeChat.name}</h4>
                                        <p className="text-xs opacity-50 font-bold uppercase flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span> 
                                            Active Now
                                        </p>
                                    </div>
                                </div>

                                <div className="relative">
                                    <button onClick={() => setIsChatOptionsOpen(!isChatOptionsOpen)} className={`p-2.5 rounded-xl transition-colors ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}><EllipsisHorizontalIcon className="w-6 h-6 opacity-50"/></button>
                                    {isChatOptionsOpen && (
                                        <div className={`absolute right-0 top-14 w-60 rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200 z-50 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                            <div className="p-2 space-y-1">
                                                <button onClick={handleMinimizeToBubble} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-bold text-xs uppercase tracking-wider transition-colors ${darkMode ? 'hover:bg-white/5 text-blue-400' : 'hover:bg-blue-50 text-blue-500'}`}><ChevronDownIcon className="w-4 h-4" /> Minimize to Bubble</button>
                                                <div className={`h-px my-1 ${darkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                <button onClick={handleCloseChat} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-bold text-xs uppercase tracking-wider transition-colors ${darkMode ? 'hover:bg-white/5 text-red-400' : 'hover:bg-red-50 text-red-500'}`}><XMarkIcon className="w-4 h-4" /> Close Chat</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 no-scrollbar" onClick={() => setIsChatOptionsOpen(false)}>
                                {messages.map((msg) => {
                                    const isMe = msg.senderId === auth.currentUser.uid;
                                    const isSystem = msg.type === 'system';
                                    const isMedia = msg.fileType === 'image' || msg.fileType === 'video';
                                    if(isSystem) return <div key={msg.id} className="text-center text-[10px] font-bold uppercase tracking-widest opacity-30 my-4">{msg.text}</div>;
                                    
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                                            {msg.replyTo && (
                                                <div className={`mb-1 px-4 py-2 rounded-2xl text-xs opacity-60 flex items-center gap-2 max-w-xs ${isMe ? 'bg-blue-600/20 text-blue-200' : 'bg-slate-500/20 text-slate-400'}`}>
                                                    <ArrowUturnLeftIcon className="w-3 h-3"/><span className="truncate">{msg.replyTo.type === 'image' ? 'Image' : msg.replyTo.type === 'video' ? 'Video' : msg.replyTo.text}</span>
                                                </div>
                                            )}
                                            <div className={`flex items-end gap-3 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <MessageAvatar isMe={isMe} />
                                                <div className="relative group/bubble flex flex-col gap-1">
                                                    {msg.fileUrl && (
                                                        <div className={`overflow-hidden rounded-2xl ${isMedia ? 'bg-transparent' : (isMe ? 'bg-blue-600' : darkMode ? 'bg-slate-800' : 'bg-white border border-slate-200')}`}>
                                                            {msg.fileType === 'image' && <img src={msg.fileUrl} onClick={() => setLightboxUrl(msg.fileUrl)} className="max-w-full max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity rounded-2xl" />}
                                                            {msg.fileType === 'video' && <video src={msg.fileUrl} controls className="max-w-full max-h-60 rounded-2xl" />}
                                                            {msg.fileType === 'file' && <a href={msg.fileUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${!isMe && 'bg-black/5'}`}><DocumentIcon className="w-6 h-6"/><span className="underline font-bold truncate">{msg.fileName}</span></a>}
                                                        </div>
                                                    )}
                                                    {msg.text && (
                                                        <div className={`p-4 rounded-[1.5rem] shadow-sm text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : darkMode ? 'bg-slate-800 text-white rounded-bl-none' : 'bg-white text-slate-900 rounded-bl-none border border-black/5'}`}>
                                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                                        </div>
                                                    )}
                                                    <button onClick={() => setReplyingTo({ id: msg.id, text: msg.text, senderId: msg.senderId, fileType: msg.fileType })} className={`absolute top-1/2 -translate-y-1/2 p-2 rounded-full opacity-0 group-hover/bubble:opacity-100 transition-all ${isMe ? '-left-10 hover:bg-white/10 text-slate-400' : '-right-10 hover:bg-white/10 text-slate-400'}`}><ArrowUturnLeftIcon className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                            <p className={`text-[9px] font-bold mt-1.5 opacity-30 select-none ${isMe ? 'text-right mr-12' : 'text-left ml-12'}`}>{formatTime(msg.createdAt)}</p>
                                        </div>
                                    )
                                })}
                                <div ref={scrollRef}/>
                            </div>

                            {/* Input Area */}
                            <div className="p-4 border-t border-gray-500/10 bg-white/5 backdrop-blur-sm shrink-0 pb-10 lg:pb-4">
                                {replyingTo && (
                                    <div className={`mb-3 flex items-center justify-between p-3 rounded-2xl text-xs font-bold border-l-4 border-blue-500 animate-in slide-in-from-bottom-2 ${darkMode ? 'bg-slate-800' : 'bg-white/10'}`}>
                                        <div className="flex flex-col"><span className="text-blue-500 uppercase tracking-widest text-[9px] mb-1">Replying to {replyingTo.senderId === auth.currentUser.uid ? "Yourself" : activeChat.name}</span><span className="truncate max-w-[200px] opacity-70">{replyingTo.fileType ? `[${replyingTo.fileType}]` : replyingTo.text}</span></div>
                                        <button onClick={() => setReplyingTo(null)} className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-colors"><XMarkIcon className="w-4 h-4"/></button>
                                    </div>
                                )}
                                {attachment && (
                                    <div className="mb-3 relative inline-block animate-in zoom-in duration-200">
                                        <div className="p-2 pr-8 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">
                                            {attachment.type.startsWith('image/') ? <PhotoIcon className="w-5 h-5 text-blue-500"/> : <DocumentIcon className="w-5 h-5 text-blue-500"/>}
                                            <span className="text-xs font-bold text-blue-500 truncate max-w-[200px]">{attachment.name}</span>
                                        </div>
                                        <button onClick={() => {setAttachment(null); chatFileRef.current.value = "";}} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600"><XMarkIcon className="w-3 h-3"/></button>
                                    </div>
                                )}

                                <form onSubmit={handleSendMessageWrapper} className="flex gap-2 items-end">
                                    <input type="file" ref={chatFileRef} onChange={handleFileSelect} className="hidden" />
                                    <button type="button" onClick={() => chatFileRef.current.click()} className={`p-3 rounded-xl transition-colors ${darkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'}`}>
                                        <PaperClipIcon className="w-5 h-5"/>
                                    </button>
                                    
                                    <div className={`flex-1 rounded-xl flex items-center px-4 py-3 border transition-all ${darkMode ? 'bg-slate-800 border-transparent focus-within:border-blue-500' : 'bg-white border-slate-200 focus-within:border-blue-300 shadow-inner'}`}>
                                        <textarea 
                                            value={newMessage} 
                                            onChange={e => setNewMessage(e.target.value)} 
                                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessageWrapper(e); } }} 
                                            placeholder="Type a message..." 
                                            className="w-full bg-transparent outline-none text-sm font-medium resize-none max-h-24 hide-scrollbar" 
                                            rows={1} 
                                        />
                                    </div>

                                    <button type="submit" disabled={(!newMessage.trim() && !attachment) || isUploading} className="p-3.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50">
                                        {isUploading ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <PaperAirplaneIcon className="w-5 h-5"/>}
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 p-10 select-none">
                            <ChatBubbleLeftRightIcon className="w-16 h-16 mb-4"/>
                            <h3 className="text-2xl font-black mb-2">Your Inbox</h3>
                            <p className="text-xs max-w-xs">Select a conversation from the list to start messaging.</p>
                        </div>
                    )}
                </div>
            </div>
        )}
      </main>

      {/* JOB DETAILS MODAL */}
      {selectedJob && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedJob(null)}>
            <div className={`max-w-2xl w-full p-6 sm:p-10 rounded-[3rem] border shadow-2xl overflow-y-auto max-h-[90vh] hide-scrollbar animate-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`} onClick={e => e.stopPropagation()}>
                
                <div className="flex flex-col sm:flex-row gap-6 items-start mb-8 relative">
                    <button onClick={() => setSelectedJob(null)} className={`absolute top-0 right-0 p-2 rounded-full ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'} sm:hidden`}><XMarkIcon className="w-6 h-6"/></button>
                    
                    <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] overflow-hidden shadow-2xl border-4 shrink-0 ${darkMode ? 'border-slate-800 bg-slate-800' : 'border-white bg-slate-100'}`}>
                        {selectedJob.employerLogo ? (
                            <img src={selectedJob.employerLogo} alt={selectedJob.employerName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl font-black opacity-20 uppercase">{selectedJob.employerName?.charAt(0)}</div>
                        )}
                    </div>
                    
                    <div className="flex-1 w-full pt-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className={`text-2xl sm:text-4xl font-black uppercase tracking-tight leading-none mb-2`}>{selectedJob.title}</h3>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-blue-500 font-black uppercase tracking-widest text-xs">{selectedJob.employerName}</span>
                                    <span className="text-slate-500">•</span>
                                    <span className="text-slate-500 font-bold text-xs">{formatDateTime(selectedJob.createdAt || new Date())}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedJob(null)} className={`hidden sm:block p-2 rounded-full transition-colors ${darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}><XMarkIcon className="w-6 h-6"/></button>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 ${darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}><MapPinIcon className="w-4 h-4 text-blue-500"/> {selectedJob.sitio || "No Location"}</span>
                            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 ${darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}><span className="text-green-500 font-black">₱</span> {selectedJob.salary}</span>
                            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 ${darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}><ClockIcon className="w-4 h-4 text-amber-500"/> {selectedJob.type}</span>
                        </div>
                    </div>
                </div>

                <div className={`p-6 sm:p-8 rounded-[2rem] border mb-8 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-3 mb-4 opacity-50">
                        <DocumentIcon className="w-5 h-5"/>
                        <h4 className="text-xs font-black uppercase tracking-[0.2em]">Job Description</h4>
                    </div>
                    <p className={`text-sm leading-loose whitespace-pre-wrap font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{selectedJob.description}</p>
                </div>

                <div className="flex gap-4">
                    <button onClick={() => setSelectedJob(null)} className="flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] border border-red-500/30 text-red-500 hover:bg-red-500/10 active:scale-95 transition-transform">Close</button>
                    {myApplications.some(app => app.jobId === selectedJob.id) ? (
                        <button disabled className="flex-[2] py-4 rounded-xl font-black uppercase tracking-widest text-[10px] bg-green-500/20 text-green-500 cursor-not-allowed">Applied</button>
                    ) : (
                        <button onClick={() => handleApplyToJob(selectedJob)} className="flex-[2] py-4 rounded-xl font-black uppercase tracking-widest text-[10px] bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">{loading ? 'Applying...' : 'Apply Now'}</button>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* APPLICATION DETAILS MODAL */}
      {viewingApplication && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in" onClick={() => setViewingApplication(null)}>
             <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>

            <div className={`relative max-w-2xl w-full p-6 sm:p-10 rounded-[3rem] border shadow-2xl overflow-y-auto max-h-[90vh] hide-scrollbar animate-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`} onClick={e => e.stopPropagation()}>
                
                <div className="flex flex-col sm:flex-row gap-6 items-start mb-8 relative">
                     <button onClick={() => setViewingApplication(null)} className={`absolute top-0 right-0 p-2 rounded-full ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'} sm:hidden`}><XMarkIcon className="w-6 h-6"/></button>
                     
                     <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] overflow-hidden shadow-2xl border-4 shrink-0 ${darkMode ? 'border-slate-800 bg-slate-800' : 'border-white bg-slate-100'}`}>
                        {viewingApplication.employerLogo ? (
                            <img src={viewingApplication.employerLogo} alt={viewingApplication.employerName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl font-black opacity-20 uppercase">{viewingApplication.employerName?.charAt(0)}</div>
                        )}
                    </div>

                    <div className="flex-1 w-full pt-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className={`text-2xl sm:text-4xl font-black uppercase tracking-tight leading-none mb-2`}>{viewingApplication.jobTitle}</h3>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-blue-500 font-black uppercase tracking-widest text-xs">{viewingApplication.employerName}</span>
                                    <span className="text-slate-500">•</span>
                                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${viewingApplication.status === 'accepted' ? 'bg-green-500/10 text-green-500' : viewingApplication.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                        <span className={`w-2 h-2 rounded-full ${viewingApplication.status === 'accepted' ? 'bg-green-500' : viewingApplication.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                                        {viewingApplication.status}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setViewingApplication(null)} className={`hidden sm:block p-2 rounded-full transition-colors ${darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}><XMarkIcon className="w-6 h-6"/></button>
                        </div>

                         <div className="flex gap-2 flex-wrap">
                            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 ${darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}><MapPinIcon className="w-4 h-4 text-blue-500"/> {modalJobDetails?.sitio || "Location"}</span>
                            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 ${darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}><span className="text-purple-500 font-black">₱</span> {modalJobDetails?.salary || "Salary"}</span>
                            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 ${darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}><ClockIcon className="w-4 h-4 text-amber-500"/> Applied {formatDateTime(viewingApplication.appliedAt)}</span>
                        </div>
                    </div>
                </div>

                {modalLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Loading Details...</p>
                    </div>
                ) : (
                  <>
                    <div className={`p-6 sm:p-8 rounded-[2rem] border mb-8 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-3 mb-4 opacity-50">
                             <DocumentIcon className="w-5 h-5"/>
                             <h4 className="text-xs font-black uppercase tracking-[0.2em]">Job Description</h4>
                        </div>
                        <p className={`text-sm leading-loose whitespace-pre-wrap font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{modalJobDetails?.description || "Description not available."}</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => handleWithdrawApplication(viewingApplication.id)} className="flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] border border-red-500/30 text-red-500 hover:bg-red-500/10 active:scale-95 transition-transform">{viewingApplication.status === 'rejected' ? 'Remove Application' : 'Withdraw Application'}</button>
                        {viewingApplication.status === 'accepted' ? (
                            <button onClick={() => { handleStartChatFromExternal({ id: viewingApplication.employerId, name: viewingApplication.employerName, profilePic: null }); setViewingApplication(null); }} className="flex-[2] py-4 rounded-xl font-black uppercase tracking-widest text-[10px] bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">Message Employer</button>
                        ) : (
                            <button disabled className="flex-[2] py-4 rounded-xl font-black uppercase tracking-widest text-[10px] bg-slate-500/10 text-slate-500 cursor-not-allowed opacity-50">{viewingApplication.status === 'rejected' ? 'Application Rejected' : 'Pending Review'}</button>
                        )}
                    </div>
                  </>
                )}
            </div>
        </div>
      )}

      {/* RATE EMPLOYER MODAL */}
      <RateEmployerModal 
        isOpen={isRatingEmployerModalOpen}
        onClose={() => setIsRatingEmployerModalOpen(false)}
        onSubmit={handleSubmitEmployerRating}
        employerName={selectedEmployerToRate?.employerName || "Employer"}
        darkMode={darkMode} 
      />

      {/* MOBILE BOTTOM NAV */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t px-6 py-3 flex justify-around items-center z-[80] transition-transform duration-300 backdrop-blur-xl ${(isFullScreenPage) ? 'translate-y-full' : 'translate-y-0'} ${darkMode ? 'bg-slate-900/70 border-white/10' : 'bg-white/70 border-white/20'}`}>
        <MobileNavItem icon={<SparklesIcon className="w-6 h-6" />} active={activeTab === "FindJobs"} onClick={() => setActiveTab("FindJobs")} />
        <MobileNavItem icon={<BookmarkIcon className="w-6 h-6" />} active={activeTab === "Saved"} onClick={() => setActiveTab("Saved")} />
        <MobileNavItem icon={<div className="relative"><PaperAirplaneIcon className="w-6 h-6" />{hasUnreadUpdates && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white animate-pulse"></span>}</div>} active={activeTab === "Applications"} onClick={() => setActiveTab("Applications")} />
        <MobileNavItem icon={<div className="relative"><ChatBubbleLeftRightIcon className="w-6 h-6" />{unreadMsgCount > 0 && <span className="absolute -top-2 -right-2 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full border-2 border-white dark:border-slate-900">{unreadMsgCount}</span>}</div>} active={activeTab === "Messages"} onClick={() => setActiveTab("Messages")} />
      </nav>

      {/* CHAT BUBBLES */}
      {isBubbleVisible && (
        isMobile ? (
          <>
             {!isBubbleExpanded && (
                <div style={{ top: bubblePos.y, left: bubblePos.x }} className="fixed z-[201] touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                   <div className="relative">
                       <button onClick={(e) => { if (!isDragging) setIsBubbleExpanded(true); }} className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-90 overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                          {activeBubbleView !== 'inbox' && effectiveActiveChatUser ? (
                             (getAvatarUrl(effectiveActiveChatUser) || effectiveActiveChatUser.profilePic) ? <img src={getAvatarUrl(effectiveActiveChatUser) || effectiveActiveChatUser.profilePic} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg">{effectiveActiveChatUser.name.charAt(0)}</div>
                           ) : ( <ChatBubbleOvalLeftEllipsisIcon className={`w-7 h-7 ${darkMode ? 'text-white' : 'text-blue-600'}`} /> )}
                       </button>
                       {unreadMsgCount > 0 && activeBubbleView === 'inbox' && (<span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-bounce">{unreadMsgCount}</span>)}
                       {activeBubbleView !== 'inbox' && (() => {
                           const currentChatUnread = conversations.find(c => c.participants.includes(activeBubbleView) && c.participants.includes(auth.currentUser.uid))?.[`unread_${auth.currentUser.uid}`] || 0;
                           return currentChatUnread > 0 ? (
                               <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-bounce">{currentChatUnread}</span>
                           ) : null;
                       })()}
                   </div>
                </div>
             )}

             {isBubbleExpanded && (
                <div className="fixed inset-0 z-[1000] flex flex-col bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="pt-12 px-4 pb-4 flex items-center gap-4 overflow-x-auto hide-scrollbar pointer-events-auto">
                        {openBubbles.map((chat) => (
                           <div key={chat.id} className="relative group flex flex-col items-center gap-1 shrink-0">
                                <button onClick={() => { setActiveBubbleView(chat.id); openChat(chat); }} className={`w-14 h-14 rounded-full overflow-hidden shadow-lg transition-all border-2 ${activeBubbleView === chat.id ? 'border-blue-500 scale-110' : 'border-transparent opacity-60'}`}>
                                    {(getAvatarUrl(chat) || chat.profilePic) ? <img src={getAvatarUrl(chat) || chat.profilePic} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">{chat.name.charAt(0)}</div>}
                                </button>
                                {(() => {
                                   const chatUnread = conversations.find(c => c.participants.includes(chat.id) && c.participants.includes(auth.currentUser.uid))?.[`unread_${auth.currentUser.uid}`] || 0;
                                   return chatUnread > 0 ? (
                                       <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-md z-10">{chatUnread}</span>
                                   ) : null;
                                })()}
                                {activeBubbleView === chat.id && (<button onClick={(e) => { e.stopPropagation(); handleCloseBubble(chat.id); }} className="absolute -top-1 -right-1 bg-slate-500 text-white rounded-full p-0.5 shadow-md animate-in zoom-in"><XMarkIcon className="w-3 h-3"/></button>)}
                           </div>
                        ))}
                        <div className="flex flex-col items-center gap-1 shrink-0 relative">
                            <button onClick={() => setActiveBubbleView('inbox')} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all border-2 ${activeBubbleView === 'inbox' ? 'border-blue-500 scale-110' : 'border-white dark:border-slate-700 opacity-60'} ${darkMode ? 'bg-slate-800' : 'bg-white'}`}><ChatBubbleOvalLeftEllipsisIcon className="w-7 h-7 text-blue-500" /></button>
                            {unreadMsgCount > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-md z-10">{unreadMsgCount}</span>}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-end relative" onClick={() => setIsBubbleExpanded(false)}>
                        <div className={`w-full h-[80vh] rounded-t-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300 border-t ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`} onClick={(e) => e.stopPropagation()}>
                            {activeBubbleView === 'inbox' && (
                                <div className="flex flex-col h-full">
                                    <div className={`p-5 border-b flex justify-between items-center ${darkMode ? 'border-white/5 bg-slate-900' : 'border-slate-100 bg-white'}`}>
                                        <h3 className={`font-black text-2xl ${darkMode ? 'text-white' : 'text-slate-900'}`}>Chats</h3>
                                        <button onClick={() => setIsBubbleExpanded(false)} className="p-2 bg-slate-100 dark:bg-white/10 rounded-full"><ChevronDownIcon className="w-5 h-5 opacity-50"/></button> 
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 hide-scrollbar">
                                            {filteredChats.map(c => {
                                                const otherId = c.participants.find(p => p !== auth.currentUser.uid);
                                                const name = c.names?.[otherId] || "User";
                                                const otherPic = c.profilePics?.[otherId];
                                                return (
                                                    <button key={c.chatId} onClick={() => { const userObj = { id: otherId, name, profilePic: otherPic }; if(!openBubbles.find(b => b.id === userObj.id)) { setOpenBubbles(prev => [userObj, ...prev]); } openChat(userObj); setActiveBubbleView(otherId); }} className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-colors ${darkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                                                        <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-800 flex items-center justify-center">{otherPic ? <img src={otherPic} className="w-full h-full object-cover"/> : <span className="font-bold">{name.charAt(0)}</span>}</div>
                                                        <div className="flex-1 text-left overflow-hidden"><div className="flex justify-between items-center"><span className="font-black text-sm truncate">{name}</span><span className="text-[9px] opacity-40">{formatTime(c.lastTimestamp)}</span></div><p className="text-[11px] truncate opacity-60">{c.lastMessage}</p></div>
                                                    </button>
                                                )
                                            })}
                                    </div>
                                </div>
                            )}

                            {activeBubbleView !== 'inbox' && effectiveActiveChatUser && (
                                <>
                                    <div className={`p-4 flex items-center justify-between border-b shrink-0 ${darkMode ? 'border-white/5 bg-slate-900' : 'border-slate-100 bg-white'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200">
                                                    {(getAvatarUrl(effectiveActiveChatUser) || effectiveActiveChatUser.profilePic) ? <img src={getAvatarUrl(effectiveActiveChatUser) || effectiveActiveChatUser.profilePic} className="w-full h-full object-cover"/> : <span className="flex items-center justify-center h-full font-bold">{effectiveActiveChatUser.name.charAt(0)}</span>}
                                                </div>
                                                <div>
                                                    <h3 className={`font-black text-base leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>{effectiveActiveChatUser.name}</h3>
                                                    <p className="text-[10px] font-bold opacity-60 uppercase">Active Now</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4 text-blue-500">
                                                <button onClick={() => setIsBubbleExpanded(false)}><ChevronDownIcon className="w-6 h-6"/></button>
                                            </div>
                                    </div>
                                    <div className={`flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                                            {messages.map((msg) => {
                                                const isMe = msg.senderId === auth.currentUser.uid;
                                                const isSystem = msg.type === 'system';
                                                const isMedia = msg.fileType === 'image' || msg.fileType === 'video';
                                                const hasText = msg.text && msg.text.trim().length > 0;
                                                if(isSystem) return <div key={msg.id} className="text-center text-[10px] font-bold uppercase tracking-widest opacity-30 my-4">{msg.text}</div>;
                                                return (
                                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                                                        <div className={`flex items-end gap-3 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                            <MessageAvatar isMe={isMe} />
                                                            <div className="relative group/bubble flex flex-col gap-1">
                                                                {msg.fileUrl && (
                                                                    <div className={`overflow-hidden rounded-2xl ${isMedia ? 'bg-transparent' : (isMe ? 'bg-blue-600' : darkMode ? 'bg-slate-800' : 'bg-white border border-slate-200')}`}>
                                                                        {msg.fileType === 'image' && <img src={msg.fileUrl} alt="attachment" className="max-w-full max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity rounded-2xl" onClick={() => setLightboxUrl(msg.fileUrl)} />}
                                                                        {msg.fileType === 'video' && <video src={msg.fileUrl} controls className="max-w-full max-h-60 rounded-2xl" />}
                                                                        {msg.fileType === 'file' && <a href={msg.fileUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${!isMe && 'bg-black/5'}`}><DocumentIcon className="w-6 h-6"/><span className="underline font-bold truncate">{msg.fileName}</span></a>}
                                                                    </div>
                                                                )}
                                                                {hasText && (
                                                                    <div className={`p-4 rounded-[1.5rem] shadow-sm text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : darkMode ? 'bg-slate-800 text-white rounded-bl-none' : 'bg-white text-slate-900 rounded-bl-none border border-black/5'}`}>
                                                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                                                    </div>
                                                                )}
                                                                <button onClick={() => setReplyingTo({ id: msg.id, text: msg.text, senderId: msg.senderId, fileType: msg.fileType })} className={`absolute top-1/2 -translate-y-1/2 p-2 rounded-full opacity-0 group-hover/bubble:opacity-100 transition-all ${isMe ? '-left-10 hover:bg-white/10 text-slate-400' : '-right-10 hover:bg-white/10 text-slate-400'}`}><ArrowUturnLeftIcon className="w-4 h-4"/></button>
                                                            </div>
                                                        </div>
                                                        <p className={`text-[9px] font-bold mt-1.5 opacity-30 select-none ${isMe ? 'text-right mr-12' : 'text-left ml-12'}`}>{formatTime(msg.createdAt)}</p>
                                                    </div>
                                                )
                                            })}
                                            <div ref={scrollRef}/>
                                    </div>
                                    <div className={`p-3 border-t shrink-0 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                                        <form onSubmit={handleSendMessageWrapper} className={`flex gap-2 items-center`}>
                                            <input type="file" ref={chatFileRef} onChange={handleFileSelect} className="hidden" />
                                            <button type="button" onClick={() => chatFileRef.current.click()} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><PaperClipIcon className="w-5 h-5"/></button>
                                            <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Aa" className={`flex-1 px-4 py-2 text-sm outline-none rounded-full ${darkMode ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900'}`} />
                                            <button type="submit" disabled={(!newMessage.trim() && !attachment) || isUploading} className="p-2 text-blue-600 active:scale-90 transition-transform">{isUploading ? <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div> : <PaperAirplaneIcon className="w-6 h-6" />}</button>
                                        </form>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
             )}
          </>
        ) : (
          <div className="fixed z-[200] bottom-6 right-4 md:right-6 flex flex-col-reverse items-end gap-3 pointer-events-none">
            <div className="pointer-events-auto">
                <button 
                    onClick={() => { setIsDesktopInboxVisible(!isDesktopInboxVisible); setActiveChat(null); }}
                    className={`group relative w-12 h-12 md:w-14 md:h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-90 overflow-hidden ${darkMode ? 'bg-blue-600' : 'bg-blue-600'}`}
                >
                    <ChatBubbleLeftRightIcon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                    {unreadMsgCount > 0 && (<span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-bounce">{unreadMsgCount}</span>)}
                </button>
            </div>
            {openBubbles.map((chat) => (
                <div key={chat.id} className="pointer-events-auto relative group flex items-center gap-3">
                    <span className="absolute right-full mr-3 px-3 py-1.5 rounded-xl bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">{chat.name}</span>
                    <div className="relative">
                        <button 
                            onClick={() => { openChat(chat); setIsChatMinimized(false); setIsDesktopInboxVisible(false); }}
                            className="w-12 h-12 md:w-14 md:h-14 rounded-full shadow-2xl overflow-hidden transition-all hover:scale-110 active:scale-95"
                        >
                            {(getAvatarUrl(chat) || chat.profilePic) ? (<img src={getAvatarUrl(chat) || chat.profilePic} alt="" className="w-full h-full object-cover" />) : (<div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg">{chat.name.charAt(0)}</div>)}
                        </button>
                        
                        {(() => {
                           const chatUnread = conversations.find(c => c.participants.includes(chat.id) && c.participants.includes(auth.currentUser.uid))?.[`unread_${auth.currentUser.uid}`] || 0;
                           return chatUnread > 0 ? (
                               <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-md z-10">{chatUnread}</span>
                           ) : null;
                        })()}

                        <button onClick={(e) => { e.stopPropagation(); setOpenBubbles(prev => prev.filter(b => b.id !== chat.id)); if (openBubbles.length <= 1) setIsBubbleVisible(false); }} className="absolute -top-1 -left-1 w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white dark:border-slate-800"><XMarkIcon className="w-3 h-3 text-slate-600 dark:text-slate-300" /></button>
                    </div>
                </div>
            ))}
            
            {isDesktopInboxVisible && !activeChat && (
                <div className="fixed z-[210] pointer-events-auto bottom-6 right-24 animate-in slide-in-from-right-4 duration-300">
                    <div className={`w-[320px] h-[450px] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-300'}`}>
                         <div className={`p-5 border-b flex justify-between items-center ${darkMode ? 'bg-slate-900 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                             <h3 className={`font-black text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>Chats</h3>
                             <button onClick={() => setIsDesktopInboxVisible(false)} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg"><XMarkIcon className="w-5 h-5 opacity-50"/></button>
                         </div>
                         <div className="p-3 pb-0">
                            <div className={`flex items-center p-1.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                                <MagnifyingGlassIcon className="w-4 h-4 ml-2 text-slate-400" />
                                <input value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="Search..." className="bg-transparent border-none outline-none text-[11px] p-1.5 w-full font-bold" />
                            </div>
                         </div>
                         <div className="flex-1 overflow-y-auto p-2 hide-scrollbar">
                            {filteredChats.map(c => {
                                const otherId = c.participants.find(p => p !== auth.currentUser.uid);
                                const name = c.names?.[otherId] || "User";
                                const otherPic = c.profilePics?.[otherId];
                                return (
                                    <button key={c.chatId} onClick={() => { const userObj = { id: otherId, name, profilePic: otherPic }; if(!openBubbles.find(b => b.id === userObj.id)) { setOpenBubbles(prev => [userObj, ...prev]); } openChat(userObj); setIsDesktopInboxVisible(false); }} className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-colors ${darkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                                            <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-800 flex items-center justify-center">{otherPic ? <img src={otherPic} className="w-full h-full object-cover"/> : <span className="font-bold">{name.charAt(0)}</span>}</div>
                                            <div className="flex-1 text-left overflow-hidden"><div className="flex justify-between items-center"><span className="font-black text-sm truncate">{name}</span><span className="text-[9px] opacity-40">{formatTime(c.lastTimestamp)}</span></div><p className="text-[11px] truncate opacity-60">{c.lastMessage}</p></div>
                                    </button>
                                )
                            })}
                         </div>
                    </div>
                </div>
            )}
            {!isChatMinimized && activeChat && activeTab !== "Support" && (
                <div className={`fixed z-[210] pointer-events-auto bottom-6 right-24`}>
                    <div className={`w-[380px] h-[500px] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border animate-in slide-in-from-right-4 duration-300 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-300'}`}>
                        <div className={`p-4 flex justify-between items-center border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0`}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-white/20 overflow-hidden border border-white/20">{(getAvatarUrl(activeChat) || activeChat.profilePic) ? <img src={getAvatarUrl(activeChat) || activeChat.profilePic} className="w-full h-full object-cover"/> : <span className="flex items-center justify-center h-full font-black">{activeChat.name.charAt(0)}</span>}</div>
                                <div><span className="font-black text-xs uppercase block">{activeChat.name}</span><span className="text-[9px] opacity-90 font-bold block">Active Now</span></div>
                            </div>
                            <div className="flex gap-1"><button onClick={() => { setIsChatMinimized(true); setIsBubbleVisible(true); setOpenBubbles(prev => [...prev, activeChat].filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i)); setActiveBubbleView(activeChat.id); closeChat(); }} className="p-1.5 hover:bg-white/20 rounded-lg"><ChevronDownIcon className="w-4 h-4"/></button><button onClick={handleCloseChat} className="p-1.5 hover:bg-white/20 rounded-lg"><XMarkIcon className="w-4 h-4"/></button></div>
                        </div>
                        <div className={`flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                            {messages.map((msg) => {
                                const isMe = msg.senderId === auth.currentUser.uid;
                                const isSystem = msg.type === 'system';
                                if(isSystem) return <div key={msg.id} className="text-center text-[9px] font-black uppercase tracking-widest opacity-30 my-2">{msg.text}</div>;
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                                            {msg.replyTo && <div className={`mb-1 px-3 py-1.5 rounded-xl text-[10px] opacity-60 flex items-center gap-2 max-w-[250px] ${isMe ? 'bg-blue-600/20 text-blue-200' : 'bg-slate-500/20 text-slate-400'}`}><ArrowUturnLeftIcon className="w-3 h-3"/><span className="truncate">{msg.replyTo.type === 'image' ? 'Image' : msg.replyTo.type === 'video' ? 'Video' : msg.replyTo.text}</span></div>}
                                            <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <MessageAvatar isMe={isMe} />
                                                <div className="relative group/bubble flex flex-col gap-1">
                                                    {msg.fileUrl && <div className={`overflow-hidden rounded-2xl ${msg.fileType === 'image' || msg.fileType === 'video' ? 'bg-transparent' : (isMe ? 'bg-blue-600' : darkMode ? 'bg-slate-800' : 'bg-white border border-black/5')}`}>{msg.fileType === 'image' && <img src={msg.fileUrl} onClick={() => setLightboxUrl(msg.fileUrl)} className="max-w-full max-h-40 object-cover rounded-2xl cursor-pointer hover:opacity-90" />}{msg.fileType === 'video' && <video src={msg.fileUrl} controls className="max-w-full max-h-40 rounded-2xl" />}{msg.fileType === 'file' && <div className="p-3 text-[11px] font-bold underline truncate flex items-center gap-2"><DocumentIcon className="w-4 h-4"/>{msg.fileName}</div>}</div>}
                                                    {msg.text && <div className={`px-3 py-2.5 rounded-2xl text-[12.5px] shadow-sm leading-relaxed ${isMe ? 'bg-blue-600 text-white rounded-br-none' : darkMode ? 'bg-slate-800 text-white rounded-bl-none' : 'bg-white text-slate-900 rounded-bl-none border border-black/5'}`}><p className="whitespace-pre-wrap">{msg.text}</p></div>}
                                                    <button onClick={() => setReplyingTo({ id: msg.id, text: msg.text, senderId: msg.senderId, fileType: msg.fileType })} className={`absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover/bubble:opacity-100 transition-all ${isMe ? '-left-8 hover:bg-black/5' : '-right-8 hover:bg-black/5'} text-slate-400`}><ArrowUturnLeftIcon className="w-3.5 h-3.5"/></button>
                                                </div>
                                            </div>
                                            <p className={`text-[8px] font-black mt-1 opacity-30 ${isMe ? 'text-right mr-10' : 'text-left ml-10'}`}>{formatTime(msg.createdAt)}</p>
                                    </div>
                                );
                            })}
                            <div ref={scrollRef}/>
                        </div>
                        <div className={`p-3 border-t shrink-0 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                            {replyingTo && <div className="mb-2 flex justify-between items-center p-2.5 bg-blue-500/10 rounded-xl border-l-4 border-blue-500 text-[10px] font-bold"><div className="flex flex-col"><span className="text-blue-500 uppercase">Replying to {replyingTo.senderId === auth.currentUser.uid ? 'You' : activeChat.name}</span><span className="truncate max-w-[200px] opacity-70">{replyingTo.text}</span></div><button onClick={() => setReplyingTo(null)}><XMarkIcon className="w-4 h-4 text-blue-500"/></button></div>}
                            <form onSubmit={handleSendMessageWrapper} className={`flex gap-2 items-center`}>
                                <input type="file" ref={chatFileRef} onChange={handleFileSelect} className="hidden" />
                                <button type="button" onClick={() => chatFileRef.current.click()} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><PaperClipIcon className="w-5 h-5"/></button>
                                <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Aa" className={`flex-1 px-4 py-2 text-sm outline-none rounded-full ${darkMode ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900'}`} />
                                <button type="submit" disabled={(!newMessage.trim() && !attachment) || isUploading} className="p-2 text-blue-600 disabled:opacity-30 active:scale-90 transition-transform">{isUploading ? <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div> : <PaperAirplaneIcon className="w-6 h-6" />}</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

function ApplicationCard({ app, darkMode, onWithdraw, onView, onChat, unreadCount, isAccepted, isRejected, onRate }) {
    const borderColorClass = isAccepted ? 'border-l-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : isRejected ? 'border-l-red-500 opacity-80' : 'border-l-amber-500';
    const iconBgClass = isAccepted ? 'bg-blue-500/10' : isRejected ? 'bg-red-500/10' : 'bg-amber-500/10';
    const iconContent = isAccepted ? '🤝' : isRejected ? '❌' : '📄';

    return (
      <div className={`p-4 md:p-8 rounded-[2.5rem] border-l-8 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 transition-all relative overflow-hidden group hover:shadow-lg backdrop-blur-md ${darkMode ? 'bg-slate-900/60 border-white/5' : 'bg-white/60 border-white/40 shadow-md'} ${borderColorClass}`}>
        <div className="flex items-start gap-4 md:gap-5">
          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-[1.2rem] flex items-center justify-center text-xl md:text-2xl shadow-inner select-none overflow-hidden shrink-0 ${iconBgClass}`}>
               {app.employerLogo ? (
                   <img src={app.employerLogo} alt={app.employerName} className="w-full h-full object-cover"/>
               ) : (
                   <span>{iconContent}</span>
               )}
          </div>
          <div>
              <div className="flex items-center gap-2">
                  <h4 className={`font-black text-base md:text-lg leading-none select-none cursor-default ${darkMode ? 'text-white' : 'text-slate-900'}`}>{app.jobTitle}</h4>
              </div>
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 md:mt-2 select-none cursor-default truncate max-w-[200px]">{app.employerName}</p>
              {isRejected && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-2">Application Rejected</p>}
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
          <button onClick={onView} className={`flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-3 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${darkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><EyeIcon className="w-4 h-4" /> View</button>
           
          {isAccepted && (
            <>
              {app.isRatedByApplicant ? (
                  <button disabled className={`flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest opacity-50 cursor-not-allowed ${darkMode ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <StarIconSolid className="w-4 h-4 text-amber-500" /> Rated
                  </button>
              ) : (
                  <button onClick={onRate} className={`flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${darkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      <StarIconOutline className="w-4 h-4" /> Rate
                  </button>
              )}

              <button onClick={onChat} className="flex-1 md:flex-none justify-center flex bg-blue-600 text-white p-3 rounded-2xl shadow-lg relative hover:bg-blue-500 transition-colors active:scale-95">
                  <ChatBubbleLeftRightIcon className="w-5 h-5" />
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[7px] font-bold">{unreadCount}</span>}
              </button>
            </>
          )}

          <div className={`w-px h-6 mx-1 ${darkMode ? 'bg-white/10' : 'bg-slate-300'}`}></div>
          <button title={isRejected ? "Remove Application" : "Withdraw Application"} onClick={(e) => { e.stopPropagation(); onWithdraw(); }} className={`flex-none p-3 rounded-2xl transition-all active:scale-95 group-hover:opacity-100 opacity-60 ${darkMode ? 'text-slate-500 hover:text-red-500 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}><TrashIcon className="w-5 h-5" /></button>
        </div>
      </div>
    );
}

function NavBtn({ icon, label, active, onClick, darkMode, open, badge, badgeColor }) {
  return (
    <button onClick={onClick} title={!open ? label : ''} className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 group relative ${active ? 'bg-transparent' : `${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-blue-600'}`} ${!open && 'lg:justify-center'}`}>
        <div className={`relative z-10 shrink-0 ${active ? 'text-blue-600 dark:text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]' : ''}`}>{icon}</div>
        <span className={`relative z-10 font-bold text-xs uppercase tracking-widest whitespace-nowrap overflow-hidden transition-all duration-300 ${!open ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'} ${active ? 'text-blue-600 dark:text-blue-400' : ''}`}>{label}</span>
        {(badge > 0 && open) && <span className={`absolute right-3 ${badgeColor || 'bg-red-500'} text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm z-10`}>{badge}</span>}
        {(badge > 0 && !open) && <span className={`hidden lg:block absolute top-2 right-2 w-2.5 h-2.5 ${badgeColor || 'bg-red-500'} rounded-full border-2 border-white dark:border-slate-900 animate-pulse z-10`}></span>}
        {(badge > 0 && !open) && <span className={`lg:hidden absolute right-3 ${badgeColor || 'bg-red-500'} text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm z-10`}>{badge}</span>}
    </button>
  );
}

function MobileNavItem({ icon, active, onClick }) {
  return (
    <button onClick={onClick} className={`relative p-2 rounded-full transition-all duration-500 ease-out ${active ? 'scale-125 text-blue-600 dark:text-blue-400 drop-shadow-[0_0_15px_rgba(37,99,235,0.6)] dark:drop-shadow-[0_0_15px_rgba(96,165,250,0.8)]' : 'text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-white hover:scale-110 hover:-translate-y-1'}`}>
      <div className="relative z-10">{icon}</div>
    </button>
  );
}

function RateEmployerModal({ isOpen, onClose, onSubmit, employerName, darkMode }) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in ${darkMode ? 'bg-slate-950/60' : 'bg-slate-900/40'}`}>
            <div className={`w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border relative ${darkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                
                <button onClick={onClose} className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                    <XMarkIcon className={`w-5 h-5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                </button>

                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <StarIconSolid className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Rate Employer</h3>
                    <p className={`text-xs mt-2 font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Feedback for {employerName}</p>
                </div>

                <div className="flex justify-center gap-3 mb-8">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button 
                            key={star} 
                            onMouseEnter={() => setHoverRating(star)} 
                            onMouseLeave={() => setHoverRating(0)} 
                            onClick={() => setRating(star)} 
                            className="transition-transform hover:scale-125 focus:outline-none"
                        >
                            <StarIconSolid className={`w-12 h-12 ${star <= (hoverRating || rating) ? 'text-amber-400 drop-shadow-md' : (darkMode ? 'text-slate-700' : 'text-slate-200')}`} />
                        </button>
                    ))}
                </div>

                <textarea 
                    value={comment} 
                    onChange={(e) => setComment(e.target.value)} 
                    placeholder="How was your experience working with this employer? (Optional)" 
                    className={`w-full h-32 p-4 rounded-3xl border outline-none text-sm font-medium resize-none focus:ring-2 ring-amber-500/50 mb-8 placeholder-slate-400 ${darkMode ? 'bg-black/20 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />

                <button 
                    onClick={() => { if(rating === 0) return alert("Select a rating"); onSubmit({ rating, comment }); }} 
                    className="w-full py-5 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                >
                    Submit Rating
                </button>
            </div>
        </div>
    );
}