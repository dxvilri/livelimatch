import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  AcademicCapIcon, 
  CalendarDaysIcon, 
  MapPinIcon, 
  UserGroupIcon, 
  ChevronDownIcon,
  TagIcon,
  SparklesIcon,
  CheckBadgeIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";
import { useToast } from '../../../context/ToastContext';
import { getLivelihoodPrograms } from '../../../firebase/communityServices';

export default function TrainingsTab({ darkMode }) {
  const { showToast } = useToast();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Programs");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const categories = [
    { name: "All Programs", icon: <TagIcon className="w-5 h-5" /> },
    { name: "TESDA", icon: <AcademicCapIcon className="w-5 h-5" /> },
    { name: "Vocational", icon: <SparklesIcon className="w-5 h-5" /> },
    { name: "IT & Digital", icon: <InformationCircleIcon className="w-5 h-5" /> },
    { name: "Livelihood", icon: <UserGroupIcon className="w-5 h-5" /> }
  ];

  useEffect(() => {
    const fetchPrograms = async () => {
      setLoading(true);
      try {
        const data = await getLivelihoodPrograms();
        setPrograms(data);
      } catch (error) {
        console.error("Error fetching programs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPrograms();
  }, []);

  const filteredPrograms = programs.filter(p => {
    const matchesSearch = p.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "All Programs" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${
    darkMode 
      ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' 
      : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'
  }`;

  return (
    <div className="space-y-6 pb-20 lg:pb-0 animate-fade-in relative">
      
      {/* Top Bar: Official & Clean */}
      <div className="relative z-50 flex flex-col md:flex-row items-center justify-between gap-4 mb-8 mt-4 md:mt-8">
          
          <div className={`w-full md:max-w-2xl flex items-center p-1.5 rounded-2xl border shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/20 ${glassPanel}`}>
              <MagnifyingGlassIcon className={`ml-3 w-5 h-5 shrink-0 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              
              <input 
                  type="text" 
                  placeholder="Search for TESDA, seminars, livelihood training..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className={`w-full flex-1 bg-transparent border-none outline-none font-bold text-xs pl-3 pr-2 py-2.5 ${darkMode ? 'text-white placeholder-slate-400' : 'text-slate-800 placeholder-slate-500'}`} 
              />
              
              <div className={`w-px h-6 mx-1 shrink-0 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
              
              <div className="relative shrink-0 pr-1">
                  <button 
                      onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)} 
                      className={`p-2 md:px-4 md:py-2 flex items-center gap-2 rounded-xl transition-colors relative ${darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'} ${activeCategory !== "All Programs" ? (darkMode ? 'text-blue-400' : 'text-blue-600') : 'text-slate-400'}`}
                  >
                      <TagIcon className="w-5 h-5 shrink-0" />
                      <span className="hidden md:block text-xs font-bold whitespace-nowrap">{activeCategory}</span>
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

          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
              <CheckBadgeIcon className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Official Barangay Updates</span>
          </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 ${darkMode ? 'border-blue-400' : 'border-blue-800'}`}></div>
        </div>
      ) : filteredPrograms.length > 0 ? (
        <div className="animate-fade-in">
            <h2 className={`text-xl font-black mb-6 flex items-center gap-3 ${darkMode ? 'text-white' : 'text-blue-900'}`}>
                <AcademicCapIcon className="w-6 h-6 text-blue-500" /> Upcoming Programs
            </h2>
            
            {/* Horizontal Scroll matching other tabs */}
            <div className="flex overflow-x-auto gap-6 pb-8 pt-2 hide-scrollbar snap-x px-2 -mx-2">
                {filteredPrograms.map((program) => {
                    const totalSlots = program.slots || 30;
                    const enrolled = program.enrolledUsers?.length || 0;
                    const percentFull = (enrolled / totalSlots) * 100;

                    return (
                        <div 
                            key={program.id} 
                            className={`relative flex-none w-[300px] sm:w-[350px] h-[500px] p-6 rounded-[2.5rem] flex flex-col group transition-all duration-300 snap-start shrink-0 hover:-translate-y-1
                              ${darkMode 
                                  ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-white/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]' 
                                  : 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 border border-white/60 ring-1 ring-inset ring-white/40 shadow-[0_20px_50px_-10px_rgba(37,99,235,0.2)]'}`}
                        >
                            {/* Partner Badge */}
                            <div className="flex justify-between items-start mb-4 shrink-0">
                                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-white text-blue-600 shadow-sm border border-blue-100'}`}>
                                    {program.category || "General"}
                                </div>
                                <span className={`flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 uppercase tracking-wide rounded-full ${percentFull >= 100 ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                    {percentFull >= 100 ? 'Fully Booked' : 'Open for Enrollment'}
                                </span>
                            </div>

                            <h3 className={`font-black text-xl shrink-0 leading-tight line-clamp-2 mb-4 ${darkMode ? 'text-white' : 'text-blue-900'}`}>
                                {program.title}
                            </h3>

                            {/* Details List */}
                            <div className="space-y-3 mb-6 shrink-0">
                                <div className="flex items-center gap-3">
                                    <CalendarDaysIcon className={`w-5 h-5 ${darkMode ? 'text-slate-400' : 'text-blue-600'}`} />
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-widest opacity-50 ${darkMode ? 'text-white' : 'text-blue-900'}`}>Date & Time</p>
                                        <p className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-blue-800'}`}>{program.date || "To be announced"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <MapPinIcon className={`w-5 h-5 ${darkMode ? 'text-slate-400' : 'text-blue-600'}`} />
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-widest opacity-50 ${darkMode ? 'text-white' : 'text-blue-900'}`}>Venue</p>
                                        <p className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-blue-800'}`}>{program.venue || "Barangay Hall"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable Description */}
                            <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar mb-6 pr-1">
                                <p className={`text-xs font-medium whitespace-pre-wrap leading-relaxed ${darkMode ? 'text-slate-400' : 'text-blue-800/80'}`}>
                                    {program.description}
                                </p>
                            </div>

                            {/* Slots Progress Bar */}
                            <div className="mb-6 shrink-0">
                                <div className="flex justify-between items-end mb-2">
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-blue-800/60'}`}>Enrollment Status</p>
                                    <p className="text-[10px] font-black tracking-widest text-blue-600">{enrolled} / {totalSlots} Slots</p>
                                </div>
                                <div className={`h-2 w-full rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-white/50'}`}>
                                    <div 
                                        className={`h-full transition-all duration-1000 ${percentFull >= 100 ? 'bg-red-500' : 'bg-blue-500'}`}
                                        style={{ width: `${Math.min(percentFull, 100)}%` }}
                                    ></div>
                                </div>
                            </div>

                            <button 
                                onClick={() => showToast("Registration features coming soon!", "info")}
                                disabled={percentFull >= 100}
                                className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg flex justify-center items-center gap-2
                                  ${percentFull >= 100 
                                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'}`}
                            >
                                <AcademicCapIcon className="w-5 h-5" />
                                Register for Training
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
      ) : (
        <div className="text-center py-20">
            <InformationCircleIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="opacity-50 font-black uppercase text-xs tracking-[0.3em] select-none">No active programs found</p>
        </div>
      )}
    </div>
  );
}