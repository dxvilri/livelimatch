import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc } from 'firebase/firestore'; 
import { auth, db } from '../../../firebase/config'; 
import { 
  MagnifyingGlassIcon, BuildingStorefrontIcon, CakeIcon,
  ShoppingBagIcon, CheckBadgeIcon, SparklesIcon,
  ScissorsIcon, ChatBubbleLeftRightIcon, PlusIcon,
  XMarkIcon, ChevronDownIcon, TagIcon, PaperAirplaneIcon,
  CameraIcon, PhotoIcon, MapPinIcon,
  ChevronLeftIcon, ChevronRightIcon,
  UserCircleIcon, TrashIcon
} from "@heroicons/react/24/outline";
import { getAllLocalServices as getMarketItems, addLocalService as addMarketItem, deleteLocalService } from '../../../firebase/communityServices';
import { PUROK_LIST } from '../../../utils/applicantConstants';

export default function LiveliMarketTab({ darkMode, onChatClick }) {
  const { showToast } = useToast();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Categories");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  // Add Item Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isModalCategoryDropdownOpen, setIsModalCategoryDropdownOpen] = useState(false);
  const [isModalLocationDropdownOpen, setIsModalLocationDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemImages, setItemImages] = useState([]);
  
  // Delete Modal State
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Image Viewer (Lightbox) State
  const [viewingImages, setViewingImages] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [newItem, setNewItem] = useState({
    businessName: "",
    category: "",
    description: "",
    sitio: ""
  });

  const categories = [
    { name: "All Categories", icon: <TagIcon className="w-5 h-5" /> },
    { name: "Food & Snacks", icon: <CakeIcon className="w-5 h-5" /> },
    { name: "Fresh Produce", icon: <SparklesIcon className="w-5 h-5" /> },
    { name: "Handicrafts", icon: <ScissorsIcon className="w-5 h-5" /> },
    { name: "Sari-Sari / Retail", icon: <ShoppingBagIcon className="w-5 h-5" /> }
  ];

  useEffect(() => {
      if (isAddModalOpen || viewingImages || itemToDelete) {
          document.body.style.overflow = "hidden";
      } else {
          document.body.style.overflow = "auto";
      }
      return () => { document.body.style.overflow = "auto"; };
  }, [isAddModalOpen, viewingImages, itemToDelete]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await getMarketItems();
      setItems(data);
    } catch (error) {
      console.error("Error fetching market items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleImageChange = (e) => {
      if (e.target.files) {
          const filesArray = Array.from(e.target.files);
          setItemImages(prev => {
              const combined = [...prev, ...filesArray];
              return combined.slice(0, 5); 
          });
      }
  };

  const removeImage = (indexToRemove) => {
      setItemImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleDeleteClick = (e, itemId) => {
      e.stopPropagation();
      setItemToDelete(itemId);
  };

  const confirmDelete = async () => {
      if (!itemToDelete) return;
      
      setIsDeleting(true);
      try {
          const res = await deleteLocalService(itemToDelete);
          if (res.success) {
              showToast("Listing deleted successfully.", "success");
              fetchItems(); 
          } else {
              showToast("Failed to delete listing.", "error");
          }
      } catch (error) {
          showToast("An error occurred while deleting.", "error");
      } finally {
          setIsDeleting(false);
          setItemToDelete(null);
      }
  };

  const handlePostItem = async (e) => {
    if (e) e.preventDefault();
    if (!newItem.businessName || !newItem.description || !newItem.sitio || !newItem.category) {
        return showToast("Please fill in all required fields.", "error");
    }

    if (!auth.currentUser) {
        return showToast("You must be logged in to post an item.", "error");
    }

    setIsSubmitting(true);
    try {
        const storage = getStorage();
        let imageUrls = [];

        if (itemImages.length > 0) {
            for (let i = 0; i < itemImages.length; i++) {
                const file = itemImages[i];
                const storageRef = ref(storage, `market_images/${auth.currentUser.uid}_${Date.now()}_${i}`);
                const uploadTask = await uploadBytes(storageRef, file);
                const url = await getDownloadURL(uploadTask.ref);
                imageUrls.push(url);
            }
        }

        let sellerName = auth.currentUser.displayName || "Local Seller";
        try {
            const userDocRef = doc(db, 'applicants', auth.currentUser.uid); 
            const userDocSnap = await getDoc(userDocRef);
            
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                if (userData.firstName && userData.lastName) {
                    sellerName = `${userData.firstName} ${userData.lastName}`;
                } else if (userData.name) {
                    sellerName = userData.name;
                }
            }
        } catch (nameError) {
            console.error("Error fetching user name:", nameError);
        }

        const itemData = {
            ...newItem,
            providerId: auth.currentUser.uid,
            providerName: sellerName, 
            imageUrls: imageUrls
        };
        
        const res = await addMarketItem(itemData);
        if (res.success) {
            showToast("Successfully posted to LiveliMarket!", "success");
            setIsAddModalOpen(false);
            setNewItem({ businessName: "", category: "", description: "", sitio: "" });
            setItemImages([]);
            fetchItems();
        } else {
            showToast("Failed to post item.", "error");
        }
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "All Categories" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const myPosts = filteredItems.filter(item => item.providerId === auth.currentUser?.uid);
  const allPosts = filteredItems.filter(item => item.providerId !== auth.currentUser?.uid);

  const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${
    darkMode 
      ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' 
      : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'
  }`;

  // RENDER MARKET CARD - UPDATED WITH FIXED HEIGHT & SCROLLABLE DESCRIPTION
  const renderCard = (item) => {
      const isOwner = item.providerId === auth.currentUser?.uid;

      return (
        <div 
            key={item.id} 
            className={`relative flex-none w-[280px] sm:w-[320px] h-[480px] p-5 rounded-[2.5rem] flex flex-col group transition-all duration-300 snap-start shrink-0 hover:-translate-y-1
              ${darkMode 
                  ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-white/10 text-white hover:shadow-[0_15px_30px_-5px_rgba(37,99,235,0.25)]' 
                  : 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 border border-white/60 ring-1 ring-inset ring-white/40 text-blue-900 shadow-[0_20px_50px_-10px_rgba(37,99,235,0.2)] hover:shadow-[0_20px_50px_-10px_rgba(37,99,235,0.4)]'}`}
        >
            <div 
                className="w-full h-40 sm:h-48 rounded-2xl overflow-hidden mb-4 relative shrink-0 bg-black/10 cursor-pointer shadow-inner"
                onClick={() => {
                    if (item.imageUrls && item.imageUrls.length > 0) {
                        setViewingImages(item.imageUrls);
                        setCurrentImageIndex(0);
                    }
                }}
            >
                {isOwner && (
                    <button 
                        onClick={(e) => handleDeleteClick(e, item.id)}
                        className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-600 backdrop-blur-md text-white p-2 rounded-xl z-20 shadow-lg transition-all hover:scale-110"
                        title="Delete this listing"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                )}

                {item.imageUrls && item.imageUrls.length > 0 ? (
                    <>
                        <img src={item.imageUrls[0]} alt={item.businessName} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        {item.imageUrls.length > 1 && (
                            <div className={`absolute bottom-2 ${isOwner ? 'left-2' : 'right-2'} px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm`}>
                                <PhotoIcon className="w-3 h-3" /> 1 of {item.imageUrls.length}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center z-10 pointer-events-none">
                            <MagnifyingGlassIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity transform scale-50 group-hover:scale-100 duration-300 drop-shadow-lg" />
                        </div>
                    </>
                ) : (
                    <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-white/40'}`}>
                        <BuildingStorefrontIcon className={`w-12 h-12 opacity-20 ${darkMode ? 'text-white' : 'text-blue-900'}`} />
                    </div>
                )}
                {item.isAvailable && (
                  <span className="absolute top-2 left-2 flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 uppercase tracking-wide rounded-full bg-emerald-500 text-white shadow-sm backdrop-blur-md z-10">
                    <CheckBadgeIcon className="w-3 h-3" />
                    In Stock
                  </span>
                )}
            </div>

            <h3 className={`font-black text-xl shrink-0 leading-tight line-clamp-2 mb-1 ${darkMode ? 'text-white' : 'text-blue-900'}`}>
              {item.businessName}
            </h3>
            
            <div className="flex flex-wrap items-center gap-2 mb-3 shrink-0">
                <p className={`text-[9px] font-bold uppercase tracking-widest ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                  {item.category}
                </p>
                <span className={`w-1 h-1 rounded-full ${darkMode ? 'bg-slate-500' : 'bg-blue-300'}`}></span>
                <p className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 opacity-70 ${darkMode ? 'text-slate-300' : 'text-blue-800'}`}>
                  <MapPinIcon className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[100px]">{item.sitio || "Cawayan Bogtong"}</span>
                </p>
            </div>
            
            {/* THIS IS THE NEW SCROLLABLE DESCRIPTION BOX */}
            <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar mb-4 pr-1">
                <p className={`text-xs font-medium whitespace-pre-wrap ${darkMode ? 'text-slate-400' : 'text-blue-800/80'}`}>
                  {item.description}
                </p>
            </div>

            <div className="flex items-center gap-2 mb-4 shrink-0 mt-auto">
                <div className={`p-1.5 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white/50 text-blue-600'}`}>
                    <UserCircleIcon className="w-4 h-4" />
                </div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-300' : 'text-blue-800'}`}>
                    {item.providerName || "Local Seller"} {isOwner && "(You)"}
                </p>
            </div>

            <div className={`pt-4 border-t shrink-0 ${darkMode ? 'border-white/10' : 'border-blue-900/10'}`}>
              {isOwner ? (
                  <button 
                    disabled
                    className={`w-full py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 opacity-50 cursor-not-allowed ${
                    darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white/40 text-blue-900'
                  }`}>
                    <BuildingStorefrontIcon className="w-5 h-5" />
                    Your Post
                  </button>
              ) : (
                  <button 
                    onClick={() => {
                        if (onChatClick) {
                            onChatClick(item.providerId);
                        } else {
                            showToast(`Inquiring about ${item.businessName}...`, "success");
                        }
                    }}
                    className={`w-full py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-lg ${
                    darkMode 
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
                  }`}>
                    <ChatBubbleLeftRightIcon className="w-5 h-5" />
                    Inquire / Message
                  </button>
              )}
            </div>
        </div>
      );
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0 animate-fade-in relative">
      
      {/* Top Bar */}
      <div className="relative z-50 flex flex-col md:flex-row items-center justify-between gap-4 mb-8 mt-4 md:mt-8">
          
          <div className={`w-full md:max-w-2xl flex items-center p-1.5 rounded-2xl border shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/20 ${glassPanel}`}>
              <MagnifyingGlassIcon className={`ml-3 w-5 h-5 shrink-0 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              
              <input 
                  type="text" 
                  placeholder="Search for kakanin, produce, crafts..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className={`w-full flex-1 bg-transparent border-none outline-none font-bold text-xs pl-3 pr-2 py-2.5 ${darkMode ? 'text-white placeholder-slate-400' : 'text-slate-800 placeholder-slate-500'}`} 
              />
              
              <div className={`w-px h-6 mx-1 shrink-0 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
              
              <div className="relative shrink-0 pr-1">
                  <button 
                      onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)} 
                      className={`p-2 md:px-4 md:py-2 flex items-center gap-2 rounded-xl transition-colors relative ${darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'} ${activeCategory !== "All Categories" ? (darkMode ? 'text-blue-400' : 'text-blue-600') : 'text-slate-400'}`}
                  >
                      <TagIcon className="w-5 h-5 shrink-0" />
                      <span className="hidden md:block text-xs font-bold whitespace-nowrap">{activeCategory}</span>
                      {activeCategory !== "All Categories" && <span className={`absolute top-1.5 right-1.5 md:right-2 w-2 h-2 rounded-full border ${darkMode ? 'bg-red-500 border-slate-900' : 'bg-red-500 border-white'}`}></span>}
                  </button>

                  {isCategoryDropdownOpen && (
                      <div className={`absolute top-full right-0 mt-3 w-56 z-[60] rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                          <div className="max-h-60 overflow-y-auto p-2 space-y-1 hide-scrollbar">
                              {categories.map((cat) => (
                                  <button 
                                      key={cat.name} 
                                      onClick={() => { setActiveCategory(cat.name); setIsCategoryDropdownOpen(false); }} 
                                      className={`w-full text-left p-3 rounded-xl transition-colors ${activeCategory === cat.name ? (darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600') : darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-50'}`}
                                  >
                                      <span className="text-xs font-bold block">{cat.name}</span>
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}
                  {isCategoryDropdownOpen && <div className="fixed inset-0 z-[50]" onClick={() => setIsCategoryDropdownOpen(false)}></div>}
              </div>
          </div>
          
          <button 
              onClick={() => setIsAddModalOpen(true)} 
              className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all active:scale-95 w-full md:w-auto justify-center group transform hover:-translate-y-1"
          >
              <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" /> Sell an Item
          </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 ${darkMode ? 'border-blue-400' : 'border-blue-800'}`}></div>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="space-y-12 pt-2 pb-10">
            
            {/* SECTION 1: MY MARKET POSTS */}
            {myPosts.length > 0 && (
                <div className="animate-fade-in">
                    <h2 className={`text-xl font-black mb-6 flex items-center gap-3 ${darkMode ? 'text-white' : 'text-blue-900'}`}>
                        <BuildingStorefrontIcon className="w-6 h-6 text-blue-500" /> My Market Posts
                    </h2>
                    {/* HORIZONTAL SCROLL CONTAINER */}
                    <div className="flex overflow-x-auto gap-5 pb-8 pt-2 hide-scrollbar snap-x px-2 -mx-2">
                        {myPosts.map(item => renderCard(item))}
                    </div>
                </div>
            )}

            {/* SECTION 2: ALL MARKET POSTS */}
            {allPosts.length > 0 && (
                <div className="animate-fade-in">
                    <h2 className={`text-xl font-black mb-6 flex items-center gap-3 ${darkMode ? 'text-white' : 'text-blue-900'}`}>
                        <SparklesIcon className="w-6 h-6 text-blue-500" /> All Market Posts
                    </h2>
                    {/* HORIZONTAL SCROLL CONTAINER */}
                    <div className="flex overflow-x-auto gap-5 pb-8 pt-2 hide-scrollbar snap-x px-2 -mx-2">
                        {allPosts.map(item => renderCard(item))}
                    </div>
                </div>
            )}
            
            {myPosts.length > 0 && allPosts.length === 0 && (
                <div className="text-center py-10 opacity-50">
                    <p className="font-black uppercase text-xs tracking-[0.2em] cursor-default">You are the only one selling right now!</p>
                </div>
            )}

        </div>
      ) : (
        <div className="col-span-full text-center py-20">
            <SparklesIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="opacity-50 font-black uppercase text-xs tracking-[0.3em] select-none cursor-default">No market items found</p>
        </div>
      )}

      {/* FULL-SCREEN IMAGE VIEWER */}
      {viewingImages && createPortal(
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in" onClick={() => setViewingImages(null)}>
              
              <button onClick={() => setViewingImages(null)} className="absolute top-4 right-4 md:top-8 md:right-8 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all z-50">
                  <XMarkIcon className="w-6 h-6 md:w-8 md:h-8" />
              </button>
              
              <img 
                  src={viewingImages[currentImageIndex]} 
                  alt="Market item full view" 
                  className="max-w-[95vw] max-h-[90vh] object-contain select-none animate-in zoom-in-95 duration-300" 
                  onClick={(e) => e.stopPropagation()} 
              />
              
              {viewingImages.length > 1 && (
                  <>
                      <button 
                          onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === 0 ? viewingImages.length - 1 : prev - 1); }}
                          className="absolute left-2 md:left-8 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all backdrop-blur-md hover:scale-110"
                      >
                          <ChevronLeftIcon className="w-6 h-6 md:w-8 md:h-8" />
                      </button>
                      
                      <button 
                          onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === viewingImages.length - 1 ? 0 : prev + 1); }}
                          className="absolute right-2 md:right-8 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all backdrop-blur-md hover:scale-110"
                      >
                          <ChevronRightIcon className="w-6 h-6 md:w-8 md:h-8" />
                      </button>
                      
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-md">
                          {viewingImages.map((_, idx) => (
                              <button 
                                  key={idx} 
                                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                                  className={`h-2 rounded-full transition-all ${idx === currentImageIndex ? 'w-6 bg-blue-500' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                              ></button>
                          ))}
                      </div>
                  </>
              )}
          </div>,
          document.body
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {itemToDelete && createPortal(
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in" onClick={() => !isDeleting && setItemToDelete(null)}>
              <div 
                  onClick={(e) => e.stopPropagation()} 
                  className={`w-full max-w-sm p-6 md:p-8 rounded-[2rem] shadow-2xl border animate-in zoom-in-95 duration-300 text-center relative overflow-hidden
                    ${darkMode 
                        ? 'bg-slate-900 border-white/10 text-white' 
                        : 'bg-white border-white/60 text-slate-900 shadow-[0_20px_50px_-10px_rgba(220,38,38,0.2)]'}`}
              >
                  <div className={`mx-auto w-16 h-16 mb-6 rounded-full flex items-center justify-center ${darkMode ? 'bg-red-500/20 text-red-500' : 'bg-red-50 text-red-600'}`}>
                      <TrashIcon className="w-8 h-8" />
                  </div>
                  
                  <h3 className={`text-xl font-black tracking-tight mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Delete Listing?</h3>
                  <p className={`text-sm mb-8 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Are you sure you want to delete this listing? This action cannot be undone.
                  </p>

                  <div className="flex gap-3">
                      <button 
                          onClick={() => setItemToDelete(null)}
                          disabled={isDeleting}
                          className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={confirmDelete}
                          disabled={isDeleting}
                          className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg flex justify-center items-center ${darkMode ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/30' : 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/30'}`}
                      >
                          {isDeleting ? <div className="w-4 h-4 border-2 rounded-full animate-spin border-white/30 border-t-white"></div> : "Yes, Delete"}
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}

      {/* MARKET CREATION MODAL */}
      {isAddModalOpen && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsAddModalOpen(false)}>
              <div 
                  onClick={(e) => e.stopPropagation()} 
                  className={`relative w-full max-w-2xl p-6 md:p-8 rounded-[2.5rem] shadow-2xl border animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] hide-scrollbar 
                    ${darkMode 
                        ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-white/10 text-white' 
                        : 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 border-white/60 ring-1 ring-inset ring-white/40 text-blue-900 shadow-[0_20px_50px_-10px_rgba(37,99,235,0.2)]'}`}
              >
                  <div className={`absolute -right-10 -bottom-10 opacity-[0.08] pointer-events-none rotate-12 transition-transform duration-500 ${darkMode ? 'text-white' : 'text-blue-600'}`}>
                      <ShoppingBagIcon className="w-64 h-64" />
                  </div>

                  <div className="flex items-center justify-between mb-8 relative z-10">
                      <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl backdrop-blur-md border shadow-sm ${darkMode ? 'bg-blue-500/20 border-blue-500/30 text-white' : 'bg-white/60 border-white text-blue-600 shadow-inner'}`}>
                              <PlusIcon className="w-8 h-8"/>
                          </div>
                          <div>
                              <h2 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-blue-900'}`}>Create Market Listing</h2>
                              <p className={`text-[10px] font-bold uppercase tracking-widest opacity-70 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                                  Fill in the details below
                              </p>
                          </div>
                      </div>
                      <button onClick={() => setIsAddModalOpen(false)} className={`p-2 rounded-full transition-all hover:scale-110 active:scale-95 ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white/40 hover:bg-white/60 text-blue-900 border border-white/60'}`}>
                          <XMarkIcon className="w-6 h-6"/>
                      </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
                      
                      <div className="md:col-span-2">
                          <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Product / Business Name <span className="text-red-500">*</span></label>
                          <input 
                              type="text" 
                              value={newItem.businessName} 
                              onChange={e => setNewItem({...newItem, businessName: e.target.value})} 
                              className={`w-full p-4 rounded-2xl outline-none border transition-all font-bold text-sm shadow-inner backdrop-blur-md 
                                ${darkMode ? 'bg-slate-800/50 border-white/10 focus:border-blue-500 text-white' : 'bg-white/40 border-white/60 focus:bg-white/80 focus:border-blue-400 text-blue-900 placeholder-blue-400/60'}`} 
                              placeholder="e.g. Aling Nena's Puto & Kutsinta" 
                          />
                      </div>
                      
                      <div className="relative">
                          <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Location (Sitio) <span className="text-red-500">*</span></label>
                          <button 
                              onClick={(e) => { e.preventDefault(); setIsModalLocationDropdownOpen(!isModalLocationDropdownOpen); setIsModalCategoryDropdownOpen(false); }}
                              className={`w-full p-4 rounded-2xl outline-none border transition-all font-bold text-sm text-left shadow-inner flex items-center justify-between backdrop-blur-md
                                ${darkMode ? 'bg-slate-800/50 border-white/10 text-white' : 'bg-white/40 border-white/60 text-blue-900'}`}
                          >
                              <span className={newItem.sitio ? '' : 'opacity-50'}>{newItem.sitio || "Select Location"}</span>
                              <ChevronDownIcon className={`w-5 h-5 transition-transform ${isModalLocationDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {isModalLocationDropdownOpen && (
                              <div className={`absolute z-[70] top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-800 border-white/10 text-white' : 'bg-white border-blue-100 text-slate-900'}`}>
                                  <div className="max-h-48 overflow-y-auto p-2 space-y-1 hide-scrollbar">
                                      {PUROK_LIST.map(purok => (
                                          <button 
                                              key={purok} 
                                              onClick={(e) => { e.preventDefault(); setNewItem({...newItem, sitio: purok}); setIsModalLocationDropdownOpen(false); }}
                                              className={`w-full text-left p-3 rounded-xl transition-colors text-xs font-bold ${newItem.sitio === purok ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'}`}
                                          >
                                              {purok}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>

                      <div className="relative">
                          <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Category <span className="text-red-500">*</span></label>
                          <button 
                              onClick={(e) => { e.preventDefault(); setIsModalCategoryDropdownOpen(!isModalCategoryDropdownOpen); setIsModalLocationDropdownOpen(false); }}
                              className={`w-full p-4 rounded-2xl outline-none border transition-all font-bold text-sm text-left shadow-inner flex items-center justify-between backdrop-blur-md
                                ${darkMode ? 'bg-slate-800/50 border-white/10 text-white' : 'bg-white/40 border-white/60 text-blue-900'}`}
                          >
                              <span className={newItem.category ? '' : 'opacity-50'}>{newItem.category || "Select Category"}</span>
                              <ChevronDownIcon className={`w-5 h-5 transition-transform ${isModalCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {isModalCategoryDropdownOpen && (
                              <div className={`absolute z-[70] top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-800 border-white/10 text-white' : 'bg-white border-blue-100 text-slate-900'}`}>
                                  <div className="max-h-48 overflow-y-auto p-2 space-y-1 hide-scrollbar">
                                      {categories.filter(c => c.name !== "All Categories").map(cat => (
                                          <button 
                                              key={cat.name} 
                                              onClick={(e) => { e.preventDefault(); setNewItem({...newItem, category: cat.name}); setIsModalCategoryDropdownOpen(false); }}
                                              className={`w-full text-left p-3 rounded-xl transition-colors text-xs font-bold ${newItem.category === cat.name ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'}`}
                                          >
                                              {cat.name}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>

                      <div className="md:col-span-2 mt-2">
                          <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Description <span className="text-red-500">*</span></label>
                          <textarea 
                              value={newItem.description} 
                              onChange={e => setNewItem({...newItem, description: e.target.value})} 
                              rows="4" 
                              className={`w-full p-4 rounded-2xl outline-none border transition-all resize-none font-bold text-sm shadow-inner backdrop-blur-md
                                ${darkMode ? 'bg-slate-800/50 border-white/10 focus:border-blue-500 text-white' : 'bg-white/40 border-white/60 focus:bg-white/80 focus:border-blue-400 text-blue-900 placeholder-blue-400/60'}`} 
                              placeholder="Describe your product, prices, or available flavors..."
                          ></textarea>
                      </div>

                      <div className="md:col-span-2 mt-2">
                          <label className={`block text-[10px] font-black uppercase tracking-widest mb-3 ml-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Photos (Max 5)</label>
                          <div className="flex flex-wrap gap-3">
                              {itemImages.map((file, idx) => (
                                  <div key={idx} className={`relative w-24 h-24 rounded-2xl overflow-hidden border shadow-inner backdrop-blur-md group ${darkMode ? 'border-white/20' : 'border-white/60 bg-white/40'}`}>
                                      <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                      <button 
                                        type="button" 
                                        onClick={(e) => { e.preventDefault(); removeImage(idx); }} 
                                        className="absolute top-1.5 right-1.5 bg-black/60 rounded-full p-1.5 text-white hover:bg-red-500 hover:scale-110 transition-all shadow-md"
                                      >
                                          <XMarkIcon className="w-3.5 h-3.5" />
                                      </button>
                                  </div>
                              ))}
                              
                              {itemImages.length < 5 && (
                                  <label className={`w-24 h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all shadow-inner backdrop-blur-md
                                      ${darkMode ? 'border-white/20 hover:bg-white/10 hover:border-blue-400 text-blue-400' : 'border-blue-300 bg-white/40 hover:bg-white/80 hover:border-blue-500 text-blue-600'}`}>
                                      <CameraIcon className="w-7 h-7 mb-1.5" />
                                      <span className="text-[9px] font-black uppercase tracking-wider text-center px-2">Add Photo</span>
                                      <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                                  </label>
                              )}
                          </div>
                          {itemImages.length > 0 && (
                             <p className={`text-[10px] mt-2 ml-1 font-bold opacity-70 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{itemImages.length} of 5 photos added.</p>
                          )}
                      </div>

                      <div className="md:col-span-2 pt-4">
                          <button 
                              onClick={handlePostItem} 
                              disabled={isSubmitting} 
                              className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3
                                ${darkMode 
                                    ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20' 
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'}`}
                          >
                              {isSubmitting 
                                ? <div className={`w-5 h-5 border-2 rounded-full animate-spin border-white/30 border-t-white`}></div> 
                                : <>Publish Listing <PaperAirplaneIcon className="w-4 h-4" /></>}
                          </button>
                      </div>
                  </div>
              </div>
          </div>,
          document.body 
      )}

    </div>
  );
}