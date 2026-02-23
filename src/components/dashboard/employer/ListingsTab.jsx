import { cloneElement } from "react";
import { 
    MagnifyingGlassIcon, PlusIcon, MapPinIcon, TagIcon, 
    UsersIcon, PencilSquareIcon, TrashIcon, BriefcaseIcon 
} from "@heroicons/react/24/outline";

export default function ListingsTab({
    myPostedJobs, searchTerm, setSearchTerm, handleOpenJobModal, 
    handleDeleteJob, receivedApplications, darkMode, getJobStyle, JOB_CATEGORIES
}) {
    
    // --- STYLES ---
    const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;
    const glassInput = `w-full bg-transparent border-none outline-none text-sm font-bold placeholder-slate-400 pl-10 pr-4 py-2.5 ${darkMode ? 'text-white' : 'text-slate-800'}`;

    const filteredJobs = myPostedJobs.filter(job => job.title.toLowerCase().includes(searchTerm.toLowerCase()) || (job.sitio && job.sitio.toLowerCase().includes(searchTerm.toLowerCase())));

    return (
        <div className="animate-content">
            {/* Header & Search Section */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 mt-4 md:mt-8">
                <div className={`flex items-center p-1.5 rounded-2xl border shadow-sm w-full md:max-w-md transition-all focus-within:ring-2 focus-within:ring-blue-500/20 ${glassPanel}`}>
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        <input 
                            type="text" 
                            placeholder="Search your listings..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className={glassInput} 
                        />
                    </div>
                </div>
                
                <button 
                    onClick={() => handleOpenJobModal()} 
                    className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all active:scale-95 w-full md:w-auto justify-center group transform hover:-translate-y-1"
                >
                    <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" /> 
                    Post New Job
                </button>
            </div>

            {/* Job Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredJobs.length > 0 ? filteredJobs.map(job => {
                    const applicantCount = receivedApplications.filter(a => a.jobId === job.id).length;
                    const style = getJobStyle(job.type);
                    
                    return (
                        <div key={job.id} className={`group relative p-6 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl border ${darkMode ? 'bg-slate-900/40 border-white/5 hover:border-blue-500/30 hover:bg-slate-800/60' : 'bg-white/60 border-white/60 shadow-lg hover:border-blue-200 hover:bg-white'} backdrop-blur-xl`}>
                            
                            {/* Decorative Background Icon */}
                            <div className={`absolute -bottom-4 -right-4 opacity-5 transform rotate-12 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 pointer-events-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                {cloneElement(style.icon, { className: "w-48 h-48" })}
                            </div>

                            {/* Content Container */}
                            <div className="relative z-10 flex flex-col h-full">
                                {/* Top Row: Type Badge & Status */}
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 border shadow-sm backdrop-blur-md ${style.bg} ${style.border}`}>
                                        <span className={`${style.color}`}>{style.icon}</span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${style.color}`}>{job.type}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </span>
                                        <span className="text-[9px] font-bold text-green-600 uppercase tracking-wide">Active</span>
                                    </div>
                                </div>

                                {/* Title & Location */}
                                <div className="mb-6 space-y-3">
                                    <h3 className={`text-xl font-black leading-tight line-clamp-2 group-hover:text-blue-500 transition-colors ${darkMode ? 'text-white' : 'text-slate-800'}`}>{job.title}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                            <MapPinIcon className="w-3 h-3" />
                                            {job.sitio || "Remote/Any"}
                                        </div>
                                        {job.category && (
                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${darkMode ? 'bg-purple-500/10 border-purple-500/20 text-purple-300' : 'bg-purple-50 border-purple-100 text-purple-600'}`}>
                                                <TagIcon className="w-3 h-3" />
                                                {JOB_CATEGORIES.find(c => c.id === job.category)?.label || job.category}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Salary Section */}
                                <div className="mb-8">
                                    <p className={`text-[9px] font-black uppercase tracking-widest mb-1 opacity-50 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Monthly Offer</p>
                                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600 tracking-tight">₱ {job.salary}</p>
                                </div>

                                {/* Footer Actions */}
                                <div className="mt-auto pt-6 border-t border-dashed border-slate-500/20 flex items-center justify-between">
                                    <div className="flex items-center gap-3 group/applicants cursor-default">
                                        <div className="flex -space-x-3 transition-spacing group-hover/applicants:space-x-1">
                                            {[...Array(Math.min(3, applicantCount))].map((_, i) => (
                                                <div key={i} className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shadow-lg transition-transform hover:scale-110 hover:z-10 ${darkMode ? 'bg-slate-800 border-slate-900 text-white' : 'bg-slate-100 border-white text-slate-600'}`}>
                                                    ?
                                                </div>
                                            ))}
                                            {applicantCount === 0 && <div className={`w-9 h-9 rounded-full border-2 border-dashed flex items-center justify-center ${darkMode ? 'border-slate-700 bg-white/5' : 'border-slate-300 bg-slate-50'}`}><UsersIcon className="w-4 h-4 opacity-30"/></div>}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-sm font-black leading-none ${applicantCount > 0 ? 'text-blue-500' : 'opacity-30'}`}>{applicantCount}</span>
                                            <span className="text-[8px] font-bold uppercase opacity-50">Applicants</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 lg:translate-y-0 lg:group-hover:translate-y-0">
                                        <button 
                                            onClick={() => handleOpenJobModal(job)} 
                                            className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 shadow-lg ${darkMode ? 'bg-slate-800 text-white hover:bg-blue-600' : 'bg-white text-slate-600 hover:bg-blue-600 hover:text-white shadow-blue-200'}`}
                                            title="Edit Job"
                                        >
                                            <PencilSquareIcon className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteJob(job.id)} 
                                            className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 shadow-lg ${darkMode ? 'bg-slate-800 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-white text-red-500 hover:bg-red-500 hover:text-white shadow-red-100'}`}
                                            title="Delete Job"
                                        >
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
    );
}