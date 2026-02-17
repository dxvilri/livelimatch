import { MegaphoneIcon } from "@heroicons/react/24/outline";

export default function AnnouncementsTab({ announcements, darkMode }) {
    const glassPanel = `backdrop-blur-xl border transition-all duration-300 ${darkMode ? 'bg-slate-900/60 border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white' : 'bg-white/60 border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-slate-800'}`;

    return (
        <div className="animate-content space-y-6">
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
    );
}