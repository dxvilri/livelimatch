import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

export default function RatingsTab({ currentUser, darkMode, reviews, averageRating }) {
    const formatTime = (ts) => { if (!ts) return "Just now"; const date = ts?.toDate ? ts.toDate() : new Date(); return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
    const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;

    return (
        <div className="animate-content space-y-6">
            <div className={`p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden flex flex-col items-center justify-center text-center ${glassPanel}`}>
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600"></div>
                <h3 className={`text-xs font-black uppercase tracking-[0.3em] mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Overall Reputation</h3>
                <div className="flex items-center justify-center gap-6 mb-4">
                    <span className={`text-7xl md:text-8xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>{averageRating || "0.0"}</span>
                    <div className="flex flex-col items-start gap-1">
                        <div className="flex text-amber-400 gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                star <= Math.round(Number(averageRating)) ? <StarIconSolid key={star} className="w-6 h-6 md:w-8 md:h-8 text-amber-400 drop-shadow-md" /> : <StarIconOutline key={star} className="w-6 h-6 md:w-8 md:h-8 text-slate-300 dark:text-slate-700" />
                            ))}
                        </div>
                        <span className="text-xs font-bold opacity-50 uppercase tracking-widest">{reviews.length} Total Reviews</span>
                    </div>
                </div>
                <p className="text-xs opacity-40 max-w-md mx-auto">Ratings are based on feedback from employers you have worked with.</p>
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
                                            {rev.reviewerPic ? <img src={rev.reviewerPic} className="w-full h-full object-cover" alt="revpfp"/> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-500">{rev.reviewerName?.charAt(0)}</div>}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{rev.reviewerName || "Anonymous"}</h4>
                                            <p className="text-[9px] font-bold opacity-40 uppercase">{rev.createdAt ? formatTime(rev.createdAt) : 'Just now'}</p>
                                        </div>
                                    </div>
                                    <div className="flex bg-amber-500/10 px-2 py-1 rounded-lg">
                                        {[1, 2, 3, 4, 5].map((s) => (s <= rev.rating ? <StarIconSolid key={s} className="w-3 h-3 text-amber-500" /> : <StarIconOutline key={s} className="w-3 h-3 text-amber-500/40" />))}
                                    </div>
                                </div>
                                <div className="relative">
                                    <span className="absolute -top-2 -left-1 text-4xl font-serif opacity-10">“</span>
                                    <p className={`text-sm leading-relaxed pl-4 relative z-10 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{rev.comment || "No comment provided."}</p>
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
    );
}