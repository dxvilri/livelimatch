import { useState, useEffect, useRef, cloneElement } from "react";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config"; 
import { 
  collection, query, where, onSnapshot, orderBy,
  addDoc, serverTimestamp, setDoc, doc, updateDoc, deleteDoc, getDoc, getDocs, getCountFromServer, increment, arrayUnion
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// --- HOOKS ---
import { useChat } from "../hooks/useChat"; 

import { 
  BriefcaseIcon, ArrowLeftOnRectangleIcon, XMarkIcon, 
  Bars3BottomRightIcon, MapPinIcon, SunIcon, MoonIcon, 
  ChevronLeftIcon, ChevronRightIcon, ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon, PaperAirplaneIcon, EyeIcon,
  TrashIcon, CheckCircleIcon, CameraIcon, PencilSquareIcon, 
  PlusIcon, UsersIcon, ClockIcon, UserIcon, AcademicCapIcon,
  CurrencyDollarIcon, CalendarDaysIcon, BoltIcon, 
  EllipsisHorizontalIcon, PaperClipIcon, ArrowUturnLeftIcon, 
  PhotoIcon, DocumentIcon, UserCircleIcon,
  EnvelopeIcon, SparklesIcon, FunnelIcon,
  ChartBarIcon, UserPlusIcon, PresentationChartLineIcon,
  BuildingOfficeIcon, ChevronDownIcon,
  ChatBubbleOvalLeftEllipsisIcon, PhoneIcon as PhoneSolidIcon,
  BellIcon, QuestionMarkCircleIcon, IdentificationIcon, LockClosedIcon,
  MegaphoneIcon, CpuChipIcon, TagIcon
} from "@heroicons/react/24/outline";

// --- STATIC DATA ---
const PUROK_LIST = [
  "Sagur", "Ampungan", "Centro 1", "Centro 2", "Centro 3", "Bypass Road", "Boundary"
];

// --- NEW CATEGORIES ---
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
const BOT_RESPONSES = [
    { 
      keywords: ["hello", "hi", "hey", "kamusta", "gandang", "morning", "afternoon", "evening"], 
      response: "Hello! I am the LiveliMatch automated assistant. How can I help you today? (Kamusta! Ako ang assistant ng LiveliMatch. Paano ako makakatulong?)" 
    },
    { 
      keywords: ["verify", "verification", "verified", "badge", "check", "veripikasyon", "blue mark", "permit", "id"], 
      response: "To verify your account, please upload a valid Business Permit, Certificate of Residency, Proof of Billing with Address or Government ID in your Profile settings. Admins review this daily. (Para ma-verify, mag-upload ng valid ID, Certificate of Residency, Proof of Billing with Address o Business Permit sa Profile settings.)" 
    },
    { 
      keywords: ["job", "post", "listing", "create", "gawa", "trabaho", "hire"], 
      response: "You can post a new job by going to the 'Listings' tab and clicking 'Post New Job'. (Pumunta sa 'Listings' tab at i-click ang 'Post New Job' para makagawa ng hiring listing.)" 
    },
    { 
      keywords: ["delete", "remove", "trash", "bura", "tanggalin", "cancel"], 
      response: "To delete a job or application, click the Trash icon next to the item. This cannot be undone. (I-click ang Trash icon para burahin ang job o application. Hindi na ito maibabalik kapag nabura na.)" 
    },
    { 
      keywords: ["applicant", "candidate", "tao", "aplikante", "hire"], 
      response: "Check the 'Applicants' tab to see who applied to your jobs. You can Accept or Reject them there. (Tingnan ang 'Applicants' tab para makita ang mga nag-apply. Pwede mo silang i-Accept o Reject doon.)" 
    },
    { 
      keywords: ["message", "chat", "usap", "contact"], 
      response: "You can chat with applicants once you accept their application or by clicking 'Message' on their profile in the Discover tab. (Pwede mo i-chat ang applicant kapag na-accept mo na sila, o sa pamamagitan ng 'Message' button sa Discover tab.)" 
    },
    { 
      keywords: ["thank", "salamat", "ty"], 
      response: "You're welcome! Let me know if you need anything else. (Walang anuman! Sabihin mo lang kung may kailangan ka pa.)" 
    }
];

export default function EmployerDashboard() {
  const { userData } = useAuth(); 
  const [activeTab, setActiveTab] = useState("Discover"); 
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
  
  // --- BOT STATE ---
  const [isBotTyping, setIsBotTyping] = useState(false);

  const ticketScrollRef = useRef(null);
  const supportFileRef = useRef(null); 

  // --- LOCAL BUBBLE & UI STATES ---
  const [isBubbleVisible, setIsBubbleVisible] = useState(false); 
  const [isChatMinimized, setIsChatMinimized] = useState(false); 
  const [openBubbles, setOpenBubbles] = useState([]); 
  const [isDesktopInboxVisible, setIsDesktopInboxVisible] = useState(false); 
  const [isBubbleExpanded, setIsBubbleExpanded] = useState(false);
  const [activeBubbleView, setActiveBubbleView] = useState('inbox'); 
  const [bubblePos, setBubblePos] = useState({ x: window.innerWidth - 60, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
    
  // --- INTEGRATED CHAT HOOK ---
  const chat = useChat(auth.currentUser, isMobile);
  const { 
    conversations, activeChat, openChat, closeChat, sendMessage, messages, setActiveChat 
  } = chat;

  // Additional Chat UI States
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
    
  // --- EMPLOYER SPECIFIC STATES ---
  const [announcements, setAnnouncements] = useState([]);
  const [lastReadAnnouncementId, setLastReadAnnouncementId] = useState(localStorage.getItem("lastReadAnnounce")); // Track read announcement

  const [myPostedJobs, setMyPostedJobs] = useState([]); 
  const [receivedApplications, setReceivedApplications] = useState([]); 
  const [searchTerm, setSearchTerm] = useState("");
     
  // -- DISCOVER TALENT STATES --
  const [discoverTalents, setDiscoverTalents] = useState([]);
  const [talentSearch, setTalentSearch] = useState("");
  const [talentSitioFilter, setTalentSitioFilter] = useState(""); 
  const [talentCategoryFilter, setTalentCategoryFilter] = useState(""); // NEW: Category Filter State
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
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false); 
  const [jobForm, setJobForm] = useState({ title: "", sitio: "", salary: "", type: "Full-time", description: "" });
  const [profileImage, setProfileImage] = useState(null);
  const [imgScale, setImgScale] = useState(1);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
    
  const [employerData, setEmployerData] = useState({ 
      firstName: "", lastName: "", sitio: "", title: "Employer", 
      aboutMe: "", workExperience: "", education: "", 
      verificationStatus: "pending" 
  });
  const [analyticsData, setAnalyticsData] = useState({ totalEmployers: 0, sitioStats: [] });

  const isVerified = employerData.verificationStatus === 'verified';

  const isFullScreenPage = isMobile && (
    (activeTab === "Messages" && activeChat) || 
    (activeTab === "Support" && isSupportOpen)
  );

  // --- EFFECTS ---
  
  // Reset Support View on Tab Change
  useEffect(() => {
    if(activeTab !== "Support") {
      setIsSupportOpen(false);
      setActiveSupportTicket(null);
    }
  }, [activeTab]);

  // 1. SCROLL LOCK FOR MODALS
  useEffect(() => {
    const isModalActive = 
      selectedApplication !== null || 
      selectedTalent !== null || 
      isJobModalOpen || 
      isEditingImage || 
      lightboxUrl !== null;

    if (isModalActive) {
      document.body.style.overflow = "hidden"; 
    } else {
      document.body.style.overflow = "auto";   
    }

    return () => { document.body.style.overflow = "auto"; };
  }, [selectedApplication, selectedTalent, isJobModalOpen, isEditingImage, lightboxUrl]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
    
  useEffect(() => {
    if (isMobile && isBubbleExpanded) { document.body.style.overflow = "hidden"; } 
    else { document.body.style.overflow = "auto"; }
    return () => { document.body.style.overflow = "auto"; };
  }, [isMobile, isBubbleExpanded]);
    
  useEffect(() => {
    if (messages.length > 0) {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeChat, activeBubbleView]);

  // --- SUPPORT TICKET LISTENER (FIXED FOR ADMIN/BOT REPLIES) ---
  useEffect(() => {
      if (!auth.currentUser) return;
      
      const ticketsQuery = query(
        collection(db, "support_tickets"), 
        where("userId", "==", auth.currentUser.uid)
      );

      const unsubTickets = onSnapshot(ticketsQuery, (snapshot) => {
          const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          tickets.sort((a, b) => (b.lastUpdated?.seconds || 0) - (a.lastUpdated?.seconds || 0));
          setSupportTickets(tickets);

          setActiveSupportTicket(currentActiveTicket => {
              if (!currentActiveTicket) return null; 
              const updatedTicket = tickets.find(t => t.id === currentActiveTicket.id);
              return updatedTicket || currentActiveTicket;
          });
      });

      return () => unsubTickets();
  }, [auth.currentUser]);

  useEffect(() => {
    if (activeTab === "Support") {
        setTimeout(() => {
            ticketScrollRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    }
  }, [activeSupportTicket, activeTab, isBotTyping, isSupportOpen]);
        
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

  useEffect(() => {
      const fetchAdmin = async () => {
          try {
            let q = query(collection(db, "admins"), where("email", "==", ADMIN_EMAIL));
            let snap = await getDocs(q);
              
            if (!snap.empty) {
                const docData = snap.docs[0].data();
                setAdminUser({ id: snap.docs[0].id, collection: 'admins', ...docData });
                return;
            }
          } catch (e) {
              console.error("Error finding admin:", e);
          }
      };
      fetchAdmin();
  }, []);

  useEffect(() => {
    if (activeTab === "Messages" || activeTab === "Support") {
       setIsBubbleVisible(false);
       setIsBubbleExpanded(false);
       setIsDesktopInboxVisible(false);
    }
  }, [activeTab]);

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
    
    // Jobs Listener
    const qJobs = query(collection(db, "jobs"), where("employerId", "==", auth.currentUser.uid));
    const unsubJobs = onSnapshot(qJobs, (snap) => {
      const jobsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      jobsData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setMyPostedJobs(jobsData);
    });

    // Applications Listener
    const qApps = query(collection(db, "applications"), where("employerId", "==", auth.currentUser.uid));
    const unsubApps = onSnapshot(qApps, (snap) => {
      const appsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      appsData.sort((a, b) => (b.appliedAt?.seconds || 0) - (a.appliedAt?.seconds || 0));
      setReceivedApplications(appsData);
    });

    // Announcements Listener
    const qAnnouncements = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    const unsubAnnouncements = onSnapshot(qAnnouncements, (snap) => {
       setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubJobs(); unsubApps(); unsubAnnouncements(); };
  }, [auth.currentUser]);

  // --- HANDLERS ---
  const handleTouchStart = (e) => {
      setIsDragging(true);
      const touch = e.touches[0];
      dragOffset.current = { x: touch.clientX - bubblePos.x, y: touch.clientY - bubblePos.y };
  };

  const handleTouchMove = (e) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const bubbleSize = 56; 
      let newX = touch.clientX - dragOffset.current.x;
      let newY = touch.clientY - dragOffset.current.y;
      newY = Math.max(80, Math.min(newY, window.innerHeight - 150));
      newX = Math.max(0, Math.min(newX, window.innerWidth - bubbleSize));
      setBubblePos({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
      setIsDragging(false);
      const bubbleSize = 56;
      if (bubblePos.x < window.innerWidth / 2) { setBubblePos(prev => ({ ...prev, x: 0 })); } 
      else { setBubblePos(prev => ({ ...prev, x: window.innerWidth - bubbleSize })); }
  };

  const handleMinimizeToBubble = () => {
    if (!activeChat) return;
    setIsBubbleVisible(true);
    setIsChatMinimized(true);
    setIsChatOptionsOpen(false);
    setActiveBubbleView(activeChat.id); 

    if (activeChat && !openBubbles.find(b => b.id === activeChat.id)) {
      setOpenBubbles(prev => [...prev, activeChat]);
    }
    closeChat(); 
    setActiveTab("Discover"); 
  };

  const handleStartChatFromExternal = (userObj) => {
    if (!isVerified) return alert("Your account must be verified to send messages.");
    const pic = getAvatarUrl(userObj) || userObj.profilePic;
    openChat({ ...userObj, profilePic: pic });
    setIsChatMinimized(false);
    setActiveTab("Messages");
    setIsBubbleVisible(false);
    setIsBubbleExpanded(false);
    setIsDesktopInboxVisible(false);
  };

  const handleCloseChat = () => { 
    if (activeChat) {
      setOpenBubbles(prev => prev.filter(b => b.id !== activeChat.id));
    }
    closeChat(); 
    setIsChatOptionsOpen(false); 
    if (openBubbles.length <= 1) setIsBubbleVisible(false);
  };

  const handleCloseBubble = (chatId) => {
      const newBubbles = openBubbles.filter(b => b.id !== chatId);
      setOpenBubbles(newBubbles);
      if(activeBubbleView === chatId) {
          if (newBubbles.length === 0) {
              setIsBubbleVisible(false);
              setIsBubbleExpanded(false);
              setActiveBubbleView('inbox');
          } else {
              setActiveBubbleView('inbox');
          }
      }
  };

  const handleFileSelect = (e) => { if (e.target.files[0]) setAttachment(e.target.files[0]); };
    
  const handleSendMessageWrapper = async (e) => {
    e.preventDefault();
    if (!attachment) {
        if (!newMessage.trim()) return;
        await sendMessage(newMessage, replyingTo);
        setNewMessage("");
        setReplyingTo(null);
    } else {
        if (!activeChat) return;
        setIsUploading(true);
        try {
            const chatId = [auth.currentUser.uid, activeChat.id].sort().join("_");
            const storage = getStorage(auth.app);
            const storageRef = ref(storage, `chat_attachments/${chatId}/${Date.now()}_${attachment.name}`);
            const uploadTask = await uploadBytes(storageRef, attachment);
            const fileUrl = await getDownloadURL(uploadTask.ref);
            let fileType = 'file';
            if (attachment.type.startsWith('image/')) fileType = 'image';
            else if (attachment.type.startsWith('video/')) fileType = 'video';
            
             await addDoc(collection(db, "messages"), {
                chatId, text: newMessage, senderId: auth.currentUser.uid, receiverId: activeChat.id, createdAt: serverTimestamp(), 
                fileUrl: fileUrl || null, fileType: fileType, fileName: attachment.name,
                replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, senderName: replyingTo.senderId === auth.currentUser.uid ? "You" : activeChat.name, type: replyingTo.fileType || 'text' } : null
             });
             
             await setDoc(doc(db, "conversations", chatId), {
                chatId, lastMessage: `Sent a ${fileType}`, lastTimestamp: serverTimestamp(),
                participants: [auth.currentUser.uid, activeChat.id], [`unread_${activeChat.id}`]: increment(1)
             }, { merge: true });

             setNewMessage(""); setAttachment(null); setReplyingTo(null); if (chatFileRef.current) chatFileRef.current.value = "";
        } catch (err) { alert("Failed to send file."); } finally { setIsUploading(false); }
    }
  };

  const handleSupportFileSelect = (e) => {
      if (e.target.files[0]) setSupportAttachment(e.target.files[0]);
  };

  const simulateBotResponse = async (userText, ticketId) => {
      setIsBotTyping(true);
      const lowerText = userText.toLowerCase();
      let botResponseText = "Thank you for your message. An admin will review it shortly.";
      
      const foundMatch = BOT_RESPONSES.find(item => item.keywords.some(k => lowerText.includes(k)));
      if(foundMatch) {
          botResponseText = foundMatch.response;
      }

      setTimeout(async () => {
          try {
              const ticketRef = doc(db, "support_tickets", ticketId);
              const botMessage = {
                  sender: 'admin', 
                  text: `🤖 [Auto-Reply]: ${botResponseText}`,
                  timestamp: new Date()
              };
              
              await updateDoc(ticketRef, {
                  messages: arrayUnion(botMessage),
                  lastUpdated: serverTimestamp()
              });
          } catch(err) {
              console.error("Bot failed to reply", err);
          } finally {
              setIsBotTyping(false);
          }
      }, 1500);
  };

  const handleSendSupportMessage = async (e) => {
      e.preventDefault();
      if (!ticketMessage.trim() && !supportAttachment) return;

      const now = Date.now();
      const cooldown = 5 * 60 * 1000;
      if (!activeSupportTicket && (now - lastTicketCreatedAt < cooldown)) {
          const remaining = Math.ceil((cooldown - (now - lastTicketCreatedAt)) / 60000);
          alert(`Please wait ${remaining} more minute(s) before opening a new support request.`);
          return;
      }

      setIsSupportUploading(true);
      const currentMessageText = ticketMessage; 
      try {
          let imageUrl = null;
          if (supportAttachment) {
             const storage = getStorage(auth.app);
             const storageRef = ref(storage, `support_attachments/${auth.currentUser.uid}/${Date.now()}_${supportAttachment.name}`);
             const uploadTask = await uploadBytes(storageRef, supportAttachment);
             imageUrl = await getDownloadURL(uploadTask.ref);
          }

          const msgObj = {
              sender: 'user',
              text: ticketMessage,
              imageUrl: imageUrl || null,
              timestamp: new Date()
          };

          if (activeSupportTicket) {
              await updateDoc(doc(db, "support_tickets", activeSupportTicket.id), {
                  messages: arrayUnion(msgObj),
                  lastUpdated: serverTimestamp(),
                  status: 'open' 
              });
              simulateBotResponse(currentMessageText, activeSupportTicket.id);
          } else {
              const ticketIdString = Math.floor(1000 + Math.random() * 9000).toString();
              const newTicketRef = await addDoc(collection(db, "support_tickets"), {
                  ticketId: ticketIdString,
                  user: `${employerData.firstName} ${employerData.lastName}`,
                  userId: auth.currentUser.uid,
                  type: 'Employer',
                  status: 'open',
                  lastUpdated: serverTimestamp(),
                  messages: [msgObj]
              });
              
              setLastTicketCreatedAt(now);
              const newTicketSnap = await getDoc(newTicketRef);
              setActiveSupportTicket({ id: newTicketRef.id, ...newTicketSnap.data() });
              simulateBotResponse(currentMessageText, newTicketRef.id);
          }

          setTicketMessage("");
          setSupportAttachment(null);
          if(supportFileRef.current) supportFileRef.current.value = ""; 

      } catch (err) {
          console.error("Error sending support message:", err);
      } finally {
          setIsSupportUploading(false);
      }
  };

  const handleCloseSupportTicket = async (ticketId) => {
      if(!confirm("Close this support request? You can still view it in your history, but you will be able to start a new request.")) return;
      try {
          await updateDoc(doc(db, "support_tickets", ticketId), {
              status: 'closed',
              lastUpdated: serverTimestamp()
          });
          setActiveSupportTicket(null);
          setIsSupportOpen(false);
      } catch (err) {
          alert("Error closing ticket: " + err.message);
      }
  };

  const handleDeleteTicket = async (ticketId) => {
    if(confirm("Delete this conversation permanently?")) {
        try {
            await deleteDoc(doc(db, "support_tickets", ticketId));
            if(activeSupportTicket?.id === ticketId) {
                setActiveSupportTicket(null);
                setIsSupportOpen(false);
            }
        } catch(err) {
            alert("Error deleting ticket: " + err.message);
        }
    }
  };

  const RestrictedView = () => (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] animate-in fade-in zoom-in-95">
          <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
              <LockClosedIcon className="w-10 h-10 text-red-500"/>
          </div>
          <h2 className={`text-2xl font-black mb-2 uppercase tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Feature Locked
          </h2>
          <p className="text-sm opacity-60 font-medium max-w-xs text-center mb-8">
              Your account verification is {employerData.verificationStatus}. Please contact support or update your profile to unlock this feature.
          </p>
          <button onClick={() => setActiveTab("Support")} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
              Contact Support
          </button>
      </div>
  );
    
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
    setIsLocationDropdownOpen(false); 
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
            if (userSnap.exists()) { setModalApplicant(userSnap.data()); }
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
  
  // Mark announcement as read
  const handleViewAnnouncement = (annId) => {
     setActiveTab("Announcements");
     setIsNotifOpen(false);
     setLastReadAnnouncementId(annId);
     localStorage.setItem("lastReadAnnounce", annId);
  };

  const displayName = `${employerData.firstName} ${employerData.lastName}`.trim() || "Employer";

  const filteredJobs = myPostedJobs.filter(job => job.title.toLowerCase().includes(searchTerm.toLowerCase()) || (job.sitio && job.sitio.toLowerCase().includes(searchTerm.toLowerCase())));
   
  const filteredChats = conversations.filter(c => {
      const otherId = c.participants.find(p => p !== auth.currentUser.uid);
      if (adminUser && otherId === adminUser.id) return false; 
      const name = c.names?.[otherId] || "User"; 
      return name.toLowerCase().includes(chatSearch.toLowerCase());
  });

  const filteredApps = receivedApplications.filter(app => app.applicantName.toLowerCase().includes(applicantSearch.toLowerCase()) || app.jobTitle.toLowerCase().includes(applicantSearch.toLowerCase()));
  
  // UPDATED TALENT FILTER LOGIC INCLUDING CATEGORIES
  const filteredTalents = discoverTalents.filter(user => {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(talentSearch.toLowerCase()) || (user.skills && user.skills.toLowerCase().includes(talentSearch.toLowerCase()));
    const matchesSitio = talentSitioFilter ? (user.sitio === talentSitioFilter) : true;
    
    // Check if category matches or if title/skills contain category keywords
    const matchesCategory = talentCategoryFilter ? (
        (user.category === talentCategoryFilter) || 
        (user.title && user.title.toLowerCase().includes(talentCategoryFilter.toLowerCase())) ||
        (user.skills && user.skills.toLowerCase().includes(talentCategoryFilter.toLowerCase()))
    ) : true;

    return matchesSearch && matchesSitio && matchesCategory;
  });

  const pendingApplications = filteredApps.filter(app => app.status === 'pending');
  const acceptedApplications = filteredApps.filter(app => app.status === 'accepted');
  const hasNewApps = receivedApplications.some(app => app.status === 'pending' && !app.isViewed);
  const hasGlobalUnread = conversations.some(c => (c[`unread_${auth.currentUser?.uid}`] || 0) > 0);

  const unreadMsgCount = conversations.reduce((acc, curr) => {
    const otherId = curr.participants.find(p => p !== auth.currentUser?.uid);
    if (adminUser && otherId === adminUser.id) return acc;
    return acc + (curr[`unread_${auth.currentUser?.uid}`] || 0);
  }, 0);
   
  const newAppCount = receivedApplications.filter(a => a.status === 'pending' && !a.isViewed).length;
  
  // Announcement Notification Logic
  const latestAnnouncement = announcements.length > 0 ? announcements[0] : null;
  const hasNewAnnouncement = latestAnnouncement && latestAnnouncement.id !== lastReadAnnouncementId;
  
  const totalNotifications = unreadMsgCount + newAppCount + (hasNewAnnouncement ? 1 : 0);

  const ProfilePicComponent = ({ sizeClasses = "w-12 h-12", isCollapsed = false }) => (
    <div className={`relative group shrink-0 ${sizeClasses} rounded-2xl overflow-hidden shadow-lg border select-none ${darkMode ? 'border-white/10 bg-slate-800' : 'border-slate-200 bg-slate-100'}`}>
      {profileImage ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover transition-transform duration-300" style={{ transform: `scale(${imgScale})` }} /> : <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-black text-lg">{employerData.firstName ? employerData.firstName.charAt(0) : "E"}</div>}
      {!isCollapsed && <button onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"><CameraIcon className="w-5 h-5 text-white" /></button>}
    </div>
  );
    
  const effectiveActiveChatUser = (isBubbleVisible && isMobile)
    ? openBubbles.find(b => b.id === activeBubbleView)
    : activeChat;

  const MessageAvatar = ({ isMe }) => {
    const pic = isMe ? profileImage : getAvatarUrl(effectiveActiveChatUser);
    const initial = isMe ? (employerData.firstName?.charAt(0) || "M") : (effectiveActiveChatUser?.name?.charAt(0) || "U");

    return (
        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 shadow-sm border border-black/5 dark:border-white/10 bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black uppercase">
            {pic ? <img src={pic} alt="User" className="w-full h-full object-cover" /> : initial}
        </div>
    );
  };

  const getJobStyle = (type) => { const found = JOB_TYPES.find(j => j.id === type); if (found) return found; return { icon: <BoltIcon className="w-6 h-6"/>, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' }; };
    
  const formatTime = (ts) => { if (!ts) return "Just now"; const date = ts?.toDate ? ts.toDate() : new Date(); return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };

return (
    <div className={`relative min-h-screen transition-colors duration-500 font-sans pb-24 md:pb-0 select-none cursor-default overflow-x-hidden ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
        
      {!isVerified && (
        <div className={`fixed top-0 left-0 right-0 h-10 z-[60] flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-white shadow-lg ${employerData.verificationStatus === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}`}>
            {employerData.verificationStatus === 'rejected' 
              ? "Account Verification Rejected. Please update your profile." 
              : "Account Pending Verification. Some features are limited."}
        </div>
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; } 
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes glass-shine {
          0% { transform: translateX(-150%) skewX(-20deg); opacity: 0; }
          40% { opacity: 0.8; }
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
            rgba(255, 255, 255, 0.75) 50%, 
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

      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-40 animate-pulse ${darkMode ? 'bg-blue-900' : 'bg-blue-300'}`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-40 animate-pulse delay-1000 ${darkMode ? 'bg-purple-900' : 'bg-purple-300'}`}></div>
      </div>
        
      {lightboxUrl && (
          <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setLightboxUrl(null)}>
              <img src={lightboxUrl} alt="Full view" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
              <button onClick={() => setLightboxUrl(null)} className="absolute top-5 right-5 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"><XMarkIcon className="w-6 h-6"/></button>
          </div>
      )}

      {isJobModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
            <div className={`max-w-3xl w-full p-5 sm:p-10 rounded-[3rem] border shadow-2xl overflow-y-auto max-h-[70vh] sm:max-h-[90vh] hide-scrollbar ${darkMode ? glassPanel : 'bg-white border-slate-200 text-slate-900'}`}>
                <h3 className="text-2xl font-black mb-8 uppercase tracking-widest text-center">{editingJobId ? 'Edit Listing' : 'Create Job Listing'}</h3>
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
                      <button onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)} className={`w-full p-4 rounded-2xl font-bold bg-transparent border-2 flex justify-between items-center outline-none focus:border-blue-500 transition-colors cursor-pointer text-left ${darkMode ? 'border-white/10 bg-slate-900' : 'border-slate-300 bg-white'}`}><span>{jobForm.sitio || "Select a location..."}</span><MapPinIcon className={`w-5 h-5 transition-transform ${isLocationDropdownOpen ? 'rotate-180' : ''} text-blue-500 pointer-events-none`} /></button>
                      {isLocationDropdownOpen && (
                          <div className={`absolute top-full left-0 mt-2 w-full rounded-2xl border shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${glassPanel}`}>
                              <div className="max-h-60 overflow-y-auto hide-scrollbar p-2">
                                  {PUROK_LIST.map(p => (
                                      <button key={p} onClick={() => { setJobForm({...jobForm, sitio: p}); setIsLocationDropdownOpen(false); }} className={`w-full text-left p-3 rounded-xl font-bold text-xs transition-all hover:pl-4 border-l-2 border-transparent hover:border-blue-500 ${jobForm.sitio === p ? 'bg-blue-500 text-white' : darkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-blue-50 text-slate-700'}`}>
                                          {p}
                                      </button>
                                  ))}
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
        
      <header className={`fixed top-0 left-0 right-0 z-40 h-20 px-6 flex items-center justify-between transition-all duration-300 backdrop-blur-xl border-b ${darkMode ? 'bg-slate-900/80 border-white/5' : 'bg-white/80 border-slate-200'} ${(isFullScreenPage) ? '-translate-y-full' : 'translate-y-0'} ${!isVerified && !isFullScreenPage ? 'top-10' : 'top-0'}`}>
            <div className="flex items-center gap-3">
                 <h1 className={`font-black text-lg tracking-tight leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>LIVELI<span className="text-blue-500">MATCH</span></h1>
            </div>

            <div className="hidden lg:flex items-center gap-24">
                <button onClick={() => isVerified && setActiveTab("Discover")} className={`${activeTab === "Discover" ? activeGlassNavBtn + " shine-effect" : glassNavBtn} ${!isVerified && 'opacity-50 cursor-not-allowed'}`}>
                    {isVerified ? <SparklesIcon className="w-7 h-7 relative z-10" /> : <LockClosedIcon className="w-6 h-6 relative z-10" />}
                </button>
                <button onClick={() => isVerified && setActiveTab("Listings")} className={`${activeTab === "Listings" ? activeGlassNavBtn + " shine-effect" : glassNavBtn} ${!isVerified && 'opacity-50 cursor-not-allowed'}`}>
                     {isVerified ? <BriefcaseIcon className="w-7 h-7 relative z-10" /> : <LockClosedIcon className="w-6 h-6 relative z-10" />}
                </button>
                <button onClick={() => isVerified && setActiveTab("Applicants")} className={`relative ${activeTab === "Applicants" ? activeGlassNavBtn + " shine-effect" : glassNavBtn} ${!isVerified && 'opacity-50 cursor-not-allowed'}`}>
                     {isVerified ? <UsersIcon className="w-7 h-7 relative z-10" /> : <LockClosedIcon className="w-6 h-6 relative z-10" />}
                    {isVerified && hasNewApps && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 border-2 border-white rounded-full animate-pulse z-20"></span>}
                </button>
                <button onClick={() => isVerified && setActiveTab("Messages")} className={`relative ${activeTab === "Messages" ? activeGlassNavBtn + " shine-effect" : glassNavBtn} ${!isVerified && 'opacity-50 cursor-not-allowed'}`}>
                     {isVerified ? <ChatBubbleLeftRightIcon className="w-7 h-7 relative z-10" /> : <LockClosedIcon className="w-6 h-6 relative z-10" />}
                    {isVerified && hasGlobalUnread && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full border-2 border-white dark:border-slate-900 z-20">{unreadMsgCount}</span>}
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
            {isVerified ? (
                <NavBtn active={activeTab==="Analytics"} onClick={()=>{setActiveTab("Analytics"); setIsSidebarOpen(false)}} icon={<PresentationChartLineIcon className="w-6 h-6"/>} label="Analytics" open={true} dark={darkMode} />
            ) : (
                <NavBtn active={false} onClick={()=>{}} icon={<LockClosedIcon className="w-6 h-6 text-slate-500"/>} label="Analytics Locked" open={true} dark={darkMode} />
            )}
            <div className={`h-px mx-4 my-2 ${darkMode ? 'bg-white/10' : 'bg-slate-900/10'}`}></div>
            <NavBtn active={activeTab==="Announcements"} onClick={()=>{setActiveTab("Announcements"); setIsSidebarOpen(false)}} icon={<MegaphoneIcon className="w-6 h-6"/>} label="Announcements" open={true} dark={darkMode} />
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

      <main className={`relative z-10 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${(isFullScreenPage) ? 'p-0 pt-0' : 'p-4 lg:p-8 pt-24 lg:pt-28'}`}>
        
        {!(isFullScreenPage) && (
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
                    {activeTab === "Announcements" && <MegaphoneIcon className="w-6 h-6 text-blue-500"/>}
                </div>
                <div>
                    <h2 className={`text-xl lg:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>{activeTab === "Profile" ? "Profile" : activeTab === "Support" ? "Help & Support" : activeTab}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Employer Workspace</p>
                </div>
            </div>
        </header>
        )}

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
                    <div className={`col-span-1 lg:col-span-2 p-8 rounded-[2.5rem] relative overflow-hidden ${glassPanel}`}>
                         <div className="absolute top-0 left-0 w-2 h-full bg-blue-500/20"></div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500"><UserIcon className="w-5 h-5" /></div>
                            <h3 className={`font-black uppercase tracking-[0.2em] text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>Professional Summary</h3>
                        </div>
                        {isEditingProfile ? (
                            <textarea 
                                value={employerData.aboutMe} 
                                onChange={(e) => setEmployerData({...employerData, aboutMe: e.target.value})} 
                                placeholder="Write a professional summary..." 
                                className={`w-full h-32 p-4 rounded-xl text-sm bg-transparent border resize-none outline-none select-text focus:ring-2 ring-blue-500/50 ${darkMode ? 'border-white/20 text-slate-300' : 'border-slate-300 text-slate-600'}`} 
                            />
                        ) : (
                            <p className={`text-sm leading-relaxed whitespace-pre-wrap pl-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                {employerData.aboutMe || "No summary provided."}
                            </p>
                        )}
                    </div>

                    <div className={`p-8 rounded-[2.5rem] relative overflow-hidden ${glassPanel}`}>
                        <div className="absolute top-0 left-0 w-2 h-full bg-amber-500/20"></div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500"><BriefcaseIcon className="w-5 h-5" /></div>
                            <h3 className={`font-black uppercase tracking-[0.2em] text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>Experience</h3>
                        </div>
                        {isEditingProfile ? (
                            <textarea 
                                value={employerData.workExperience} 
                                onChange={(e) => setEmployerData({...employerData, workExperience: e.target.value})} 
                                placeholder="• Role at Company (Year-Year)&#10;• Key Achievement..." 
                                className={`w-full h-64 p-4 rounded-xl text-sm bg-transparent border resize-none outline-none select-text focus:ring-2 ring-amber-500/50 ${darkMode ? 'border-white/20 text-slate-300' : 'border-slate-300 text-slate-600'}`} 
                            />
                        ) : (
                            <div className={`text-sm leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-dashed ${darkMode ? 'text-slate-400 border-white/10' : 'text-slate-600 border-slate-300'}`}>
                                {employerData.workExperience ? employerData.workExperience : <span className="opacity-50 italic">No experience listed.</span>}
                            </div>
                        )}
                    </div>

                    <div className={`p-8 rounded-[2.5rem] relative overflow-hidden ${glassPanel}`}>
                        <div className="absolute top-0 left-0 w-2 h-full bg-purple-500/20"></div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500"><AcademicCapIcon className="w-5 h-5" /></div>
                            <h3 className={`font-black uppercase tracking-[0.2em] text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>Education</h3>
                        </div>
                        {isEditingProfile ? (
                            <textarea 
                                value={employerData.education} 
                                onChange={(e) => setEmployerData({...employerData, education: e.target.value})} 
                                placeholder="• Degree/Certificate&#10;• School/Institution (Year)" 
                                className={`w-full h-64 p-4 rounded-xl text-sm bg-transparent border resize-none outline-none select-text focus:ring-2 ring-purple-500/50 ${darkMode ? 'border-white/20 text-slate-300' : 'border-slate-300 text-slate-600'}`} 
                            />
                        ) : (
                            <div className={`text-sm leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-dashed ${darkMode ? 'text-slate-400 border-white/10' : 'text-slate-600 border-slate-300'}`}>
                                {employerData.education ? employerData.education : <span className="opacity-50 italic">No education listed.</span>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

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
                                <p className="text-xs mt-2 max-w-xs">Ask about Verification, Job Posting, or Account Management.</p>
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

        {isVerified && activeTab === "Discover" && (
            <div key="Discover" className="animate-content">
                 <div className="space-y-6 mb-8">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mt-4 md:mt-8">
                        <div onClick={() => setActiveTab("Discover")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/20 border backdrop-blur-xl' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'}`}>
                            <div className="relative z-10">
                                <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{discoverTalents.length}</h3>
                                <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>Candidates</p>
                            </div>
                            <UsersIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-900'}`}/>
                        </div>

                        <div onClick={() => setActiveTab("Listings")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20 border backdrop-blur-xl' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'}`}>
                            <div className="relative z-10">
                                <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{myPostedJobs.length}</h3>
                                <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-purple-200' : 'text-blue-800'}`}>Listings</p>
                            </div>
                            <BriefcaseIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-900'}`}/>
                        </div>

                        <div onClick={() => setActiveTab("Applicants")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/20 border backdrop-blur-xl' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'}`}>
                            <div className="relative z-10">
                                <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{receivedApplications.filter(a => a.status === 'pending').length}</h3>
                                <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-amber-200' : 'text-blue-800'}`}>Pending</p>
                            </div>
                            <ClockIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-900'}`}/>
                        </div>

                        <div onClick={() => setActiveTab("Messages")} className={`relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] overflow-hidden group transition-all duration-300 hover:-translate-y-1 cursor-pointer shine-effect ${darkMode ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 border-pink-500/20 border backdrop-blur-xl' : 'bg-gradient-to-r from-blue-100/50 to-white/50 border border-blue-200 shadow-sm'}`}>
                            <div className="relative z-10">
                                <h3 className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{unreadMsgCount}</h3>
                                <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1 md:mt-2 truncate ${darkMode ? 'text-pink-200' : 'text-blue-800'}`}>Unread Msgs</p>
                            </div>
                            <ChatBubbleLeftRightIcon className={`w-16 h-16 md:w-24 md:h-24 absolute -right-3 -bottom-3 md:-right-4 md:-bottom-4 opacity-10 rotate-12 transform group-hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-blue-900'}`}/>
                        </div>
                      </div>

                    <div className={`flex items-center p-1.5 rounded-2xl border shadow-sm w-full md:max-w-[60%] lg:max-w-4xl ${glassPanel}`}>
                        {/* SEARCH BAR */}
                        <div className="relative flex-1 min-w-[120px]">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="Search name or skill..." value={talentSearch} onChange={(e) => setTalentSearch(e.target.value)} className={glassInput + " pl-9 pr-4 py-2.5"} />
                        </div>
                        
                        <div className={`w-px h-6 mx-2 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                        
                        {/* SITIO FILTER */}
                        <div className="relative min-w-[110px] md:min-w-[140px]">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10"><MapPinIcon className="w-4 h-4 text-blue-500" /></div>
                            <select value={talentSitioFilter} onChange={(e) => setTalentSitioFilter(e.target.value)} className={`w-full bg-transparent pl-9 pr-8 py-2.5 outline-none font-bold text-xs appearance-none cursor-pointer transition-colors relative z-0 ${darkMode ? 'text-white hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'} rounded-xl`}>
                                <option value="" className={darkMode ? 'bg-slate-900' : 'bg-white'}>All Locations</option>
                                {PUROK_LIST.map(p => <option key={p} value={p} className={darkMode ? 'bg-slate-900' : 'bg-white'}>{p}</option>)}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><div className={`w-5 h-5 rounded-md flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}><ChevronRightIcon className="w-3 h-3 rotate-90 opacity-70"/></div></div>
                        </div>

                        <div className={`w-px h-6 mx-2 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>

                        {/* CATEGORY FILTER */}
                        <div className="relative min-w-[110px] md:min-w-[140px] group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10"><TagIcon className="w-4 h-4 text-purple-500" /></div>
                            <select value={talentCategoryFilter} onChange={(e) => setTalentCategoryFilter(e.target.value)} className={`w-full bg-transparent pl-9 pr-8 py-2.5 outline-none font-bold text-xs appearance-none cursor-pointer transition-colors relative z-0 ${darkMode ? 'text-white hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'} rounded-xl`}>
                                <option value="" className={darkMode ? 'bg-slate-900' : 'bg-white'}>All Categories</option>
                                {JOB_CATEGORIES.map(c => <option key={c.id} value={c.id} className={darkMode ? 'bg-slate-900' : 'bg-white'}>{c.label}</option>)}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><div className={`w-5 h-5 rounded-md flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}><ChevronRightIcon className="w-3 h-3 rotate-90 opacity-70"/></div></div>

                            {/* HOVER MINI INFO / TOOLTIP */}
                            <div className={`absolute top-full left-0 right-0 mt-2 p-3 rounded-xl shadow-xl border z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${glassPanel} bg-slate-900/90 backdrop-blur-md`}>
                                <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-50">Filter Examples:</p>
                                <div className="space-y-1">
                                    {JOB_CATEGORIES.map(c => (
                                        <div key={c.id} className={`flex justify-between text-[10px] ${talentCategoryFilter === c.id ? 'text-purple-400 font-bold' : 'opacity-70'}`}>
                                            <span className="font-bold">{c.label}:</span>
                                            <span className="opacity-70 text-right truncate max-w-[120px] ml-2">{c.examples}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                    {filteredTalents.length > 0 ? filteredTalents.map(user => {
                        const pic = getAvatarUrl(user);
                        return (
                            <div key={user.id} onClick={() => setSelectedTalent(user)} onMouseEnter={() => handleTalentMouseEnter(user)} onMouseLeave={handleTalentMouseLeave} className={`group relative p-4 md:p-5 ${glassCard} flex flex-col items-center text-center cursor-pointer`}>
                                <div className="absolute top-3 right-3 md:top-4 md:right-4 z-10"><span className={`flex h-2.5 w-2.5 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'} shadow-sm`}></span></div>
                                <div className="w-14 h-14 md:w-16 md:h-16 mb-3 md:mb-4 rounded-[1rem] md:rounded-[1.5rem] overflow-hidden">
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

        {isVerified && activeTab === "Analytics" && (
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

        {isVerified && activeTab === "Listings" && (
          <div key="Listings" className="animate-content">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 md:mb-10">
                <div className={`flex items-center p-1.5 rounded-2xl border shadow-sm w-full md:max-w-md ${glassPanel}`}>
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input type="text" placeholder="Search your listings..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={glassInput + " pl-10 pr-4 py-2 text-sm"} />
                    </div>
                </div>
                <button onClick={() => handleOpenJobModal()} className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:shadow-xl transition-all active:scale-95 w-full md:w-auto justify-center group transform hover:-translate-y-1">
                    <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" /> Post New Job
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredJobs.length > 0 ? filteredJobs.map(job => {
                const applicantCount = receivedApplications.filter(a => a.jobId === job.id).length;
                const style = getJobStyle(job.type);
                return (
                  <div key={job.id} className={`group relative p-4 md:p-6 rounded-[2rem] border overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl shine-effect ${darkMode ? 'bg-slate-800/40 border-white/5 hover:border-blue-500/30' : 'bg-white border-slate-200 shadow-sm hover:border-blue-400/50'}`}>
                      <div className="absolute top-10 right-4 md:top-10 md:right-8 opacity-10 transform -rotate-12 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                           {cloneElement(style.icon, { className: "w-32 h-32 md:w-56 md:h-56" })}
                      </div>
                      <div className="relative z-10 flex flex-col h-full">
                          <div className="flex justify-between items-start mb-3 md:mb-6">
                               <div className={`backdrop-blur-md px-3 py-1.5 rounded-xl border flex items-center gap-2 shadow-sm ${style.bg} ${style.border}`}>
                                   <span className={`${style.color} scale-90`}>{style.icon}</span>
                                   <span className={`text-[10px] font-black uppercase tracking-widest ${style.color}`}>{job.type}</span>
                               </div>
                               <div className="relative">
                                   <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></span>
                                   <span className="relative flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span>
                               </div>
                          </div>
                          <div className="mb-3 md:mb-6 space-y-2 pr-4">
                              <h3 className={`text-base md:text-xl font-black leading-tight line-clamp-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{job.title}</h3>
                              <div className="flex items-center gap-2 text-slate-400">
                                  <MapPinIcon className="w-4 h-4 text-blue-500" />
                                  <p className={`text-[10px] md:text-[11px] font-bold uppercase tracking-wide opacity-80 ${!darkMode && 'text-slate-500'}`}>{job.sitio || "No Location"}</p>
                              </div>
                          </div>
                          <div className="mb-4 md:mb-8">
                               <div className="flex flex-col">
                                   <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Salary / Rate</p>
                                   <p className={`text-lg md:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r ${darkMode ? 'from-white to-slate-400' : 'from-slate-900 to-slate-600'}`}>₱ {job.salary}</p>
                               </div>
                          </div>
                          <div className="mt-auto pt-4 md:pt-6 border-t border-dashed border-slate-500/20 flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                   <div className="flex -space-x-2">
                                      {[...Array(Math.min(3, applicantCount))].map((_, i) => (
                                          <div key={i} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shadow-lg ${darkMode ? 'bg-slate-800 border-slate-900 text-white' : 'bg-slate-100 border-white text-slate-600'}`}>?</div>
                                      ))}
                                      {applicantCount === 0 && <div className={`w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}><span className="text-[10px] opacity-50">0</span></div>}
                                   </div>
                                   {applicantCount > 0 && <span className={`text-[10px] font-black uppercase tracking-wide ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Applicants</span>}
                               </div>
                               <div className="flex gap-2">
                                   <button onClick={() => handleOpenJobModal(job)} className={`p-2 md:p-3 rounded-full transition-all duration-300 group/btn hover:scale-110 ${darkMode ? 'bg-white/5 hover:bg-blue-500 hover:text-white text-slate-400' : 'bg-slate-100 hover:bg-blue-500 hover:text-white text-slate-500'}`}>
                                            <PencilSquareIcon className="w-4 h-4" />
                                   </button>
                                   <button onClick={() => handleDeleteJob(job.id)} className={`p-2 md:p-3 rounded-full transition-all duration-300 group/btn hover:scale-110 ${darkMode ? 'bg-white/5 hover:bg-red-500 hover:text-white text-slate-400' : 'bg-slate-100 hover:bg-red-500 hover:text-white text-slate-500'}`}>
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

        {isVerified && activeTab === "Applicants" && (
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

        {/* MESSAGES TAB - UPDATED FOR DESKTOP CONSISTENCY */}
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
                        {/* Search Bar */}
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
                            <p className="text-xs max-w-xs">Select a conversation from the list to start messaging or contact an applicant through the "Applicants" tab.</p>
                        </div>
                    )}
                </div>
            </div>
        )}
      </main>

      {/* APPLICANT/TALENT MODAL */}
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
                        
                        <div className={`p-4 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                             <div className="mb-4">
                                <p className="text-xs font-bold uppercase opacity-40 mb-1 text-purple-500">Experience</p>
                                <p className="text-sm opacity-80 leading-relaxed whitespace-pre-wrap">{modalApplicant?.workExperience || "No experience listed."}</p>
                             </div>
                             <div>
                                <p className="text-xs font-bold uppercase opacity-40 mb-1 text-amber-500">Education</p>
                                <p className="text-sm opacity-80 leading-relaxed whitespace-pre-wrap">{modalApplicant?.education || "No education listed."}</p>
                             </div>
                        </div>
                    </div>

                    <div className="w-full flex gap-3">
                        {selectedApplication.status === 'pending' ? (
                            <>
                                <button onClick={() => handleUpdateApplicationStatus(selectedApplication.id, 'rejected')} className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest border border-red-500/30 text-red-500 hover:bg-red-500/10 active:scale-95 transition-transform">Reject</button>
                                <button onClick={() => handleUpdateApplicationStatus(selectedApplication.id, 'accepted')} className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">Accept</button>
                            </>
                        ) : (
                            <button onClick={() => { handleStartChatFromExternal({ id: selectedApplication.applicantId, name: selectedApplication.applicantName, profilePic: selectedApplication.applicantProfilePic || null }); setSelectedApplication(null); }} className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Send Message</button>
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
                        <IdentificationIcon className="w-5 h-5 opacity-50"/>
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

                <button onClick={() => { handleStartChatFromExternal({ id: selectedTalent.id, name: `${selectedTalent.firstName} ${selectedTalent.lastName}`, profilePic: getAvatarUrl(selectedTalent) }); setSelectedTalent(null); }} className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <ChatBubbleLeftRightIcon className="w-4 h-4"/> Start Conversation
                </button>
             </div>
        </div>
      )}

      {/* MESSENGER STYLE BUBBLE STACK */}
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
                       {hasGlobalUnread && activeBubbleView === 'inbox' && (<span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-bounce">!</span>)}
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
                                {activeBubbleView === chat.id && (<button onClick={(e) => { e.stopPropagation(); handleCloseBubble(chat.id); }} className="absolute -top-1 -right-1 bg-slate-500 text-white rounded-full p-0.5 shadow-md animate-in zoom-in"><XMarkIcon className="w-3 h-3"/></button>)}
                           </div>
                        ))}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                            <button onClick={() => setActiveBubbleView('inbox')} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all border-2 ${activeBubbleView === 'inbox' ? 'border-blue-500 scale-110' : 'border-white dark:border-slate-700 opacity-60'} ${darkMode ? 'bg-slate-800' : 'bg-white'}`}><ChatBubbleOvalLeftEllipsisIcon className="w-7 h-7 text-blue-500" /></button>
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
                                                                        {msg.fileType === 'file' && <a href={msg.fileUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-3 ${!isMe && 'bg-black/5'} rounded-xl hover:bg-black/10 transition-colors`}><DocumentIcon className="w-6 h-6"/><span className="underline font-bold truncate">{msg.fileName}</span></a>}
                                                                    </div>
                                                                )}
                                                                {hasText && (
                                                                    <div className={`p-4 rounded-[1.5rem] shadow-sm text-sm overflow-hidden ${isMe ? 'bg-blue-600 text-white rounded-br-none' : darkMode ? 'bg-slate-800 text-white rounded-bl-none' : 'bg-white text-slate-900 rounded-bl-none'}`}>
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
                    {hasGlobalUnread && (<span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-bounce">!</span>)}
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
       
      {/* MOBILE BOTTOM NAV */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t px-6 py-3 flex justify-around items-center z-[80] transition-transform duration-300 backdrop-blur-xl ${(isFullScreenPage) ? 'translate-y-full' : 'translate-y-0'} ${darkMode ? 'bg-slate-900/70 border-white/10' : 'bg-white/70 border-white/20'}`}>
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

function MobileNavItem({ icon, active, onClick }) {
  return (
    <button onClick={onClick} className={`relative p-2 rounded-full transition-all duration-500 ease-out overflow-hidden ${active ? 'scale-125 text-blue-600 dark:text-blue-400 drop-shadow-[0_0_15px_rgba(37,99,235,0.6)] dark:drop-shadow-[0_0_15px_rgba(96,165,250,0.8)] shine-effect' : 'text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-white hover:scale-110 hover:-translate-y-1'}`}>
      <div className="relative z-10">{icon}</div>
    </button>
  );
}