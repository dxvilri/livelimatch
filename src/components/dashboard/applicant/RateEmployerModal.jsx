import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline";

export default function RateEmployerModal({ isOpen, onClose, onSubmit, employerName, darkMode }) {
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
                            {star <= (hoverRating || rating) ? <StarIconSolid className="w-12 h-12 text-amber-400 drop-shadow-md" /> : <StarIconOutline className={`w-12 h-12 ${darkMode ? 'text-slate-700' : 'text-slate-200'}`} />}
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