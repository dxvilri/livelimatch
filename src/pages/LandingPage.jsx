import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      
      {/* SHARED HEADER - FIXED SCALING */}
      <header className="w-full h-20 bg-white/70 backdrop-blur-xl border-b border-slate-100 fixed top-0 left-0 z-50 flex items-center">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-blue-900 shrink-0 cursor-pointer" onClick={() => navigate("/")}>
            LIVELI<span className="text-blue-500">MATCH</span>
          </h1>

          {/* Adjusted gap and padding for small screens */}
          <div className="flex items-center gap-1.5 sm:gap-4">
            <button 
              onClick={() => navigate("/login")}
              className="px-3 sm:px-8 py-2 sm:py-3.5 bg-white text-blue-900 border-2 border-slate-100 rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[11px] uppercase tracking-widest hover:border-blue-900 hover:-translate-y-0.5 transition-all active:scale-95 whitespace-nowrap"
            >
              Sign In
            </button>
            
            <button 
              onClick={() => navigate("/register")}
              className="px-3 sm:px-8 py-2 sm:py-3.5 bg-blue-900 text-white rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[11px] uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:bg-blue-800 hover:-translate-y-0.5 transition-all active:scale-95 whitespace-nowrap"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main className="grow">
        <section className="relative pt-40 lg:pt-56 pb-20 lg:pb-32 px-6">
          
          <div className="absolute top-20 -left-20 lg:w-125 lg:h-125 bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-10 animate-blob"></div>
          <div className="absolute top-40 -right-20 lg:w-125 lg:h-125 bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-10 animate-blob animation-delay-2000"></div>

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid lg:grid-cols-12 gap-16 items-center">
              
              <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-full text-blue-700 border border-blue-100">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                  </span>
                  <span className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em]">Now Live in Bogtong</span>
                </div>
                
                <h2 className="text-5xl md:text-6xl lg:text-8xl font-black leading-[1.05] text-slate-900 tracking-tight">
                  Connecting <br className="hidden lg:block" />
                  <span className="text-blue-600 relative inline-block">
                    Talent
                    <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 338 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 9C118.5 -1.5 219.5 -1.5 335 9" stroke="#3B82F6" strokeWidth="6" strokeLinecap="round"/>
                    </svg>
                  </span> to Opportunity.
                </h2>
                
                <p className="text-lg lg:text-xl text-slate-500 font-medium max-w-xl leading-relaxed mx-auto lg:mx-0">
                  The official job-matching portal for Barangay Bogtong residents. 
                  Simple, secure, and built specifically for our community's livelihood.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 justify-center lg:justify-start">
                  <button 
                    onClick={() => navigate("/register")}
                    className="w-full sm:w-auto px-10 py-5 bg-blue-900 text-white rounded-2xl lg:rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-900/30 hover:bg-blue-800 hover:-translate-y-1 transition-all active:scale-95"
                  >
                    Post / Find a Job
                  </button>
                  <button 
                    onClick={() => navigate("/login")}
                    className="w-full sm:w-auto px-10 py-5 bg-white text-blue-900 border-2 border-slate-100 rounded-2xl lg:rounded-3xl font-black text-sm uppercase tracking-widest hover:border-blue-900 hover:-translate-y-1 transition-all"
                  >
                    Resume Session
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 relative hidden lg:flex justify-center">
                 <div className="absolute inset-0 bg-gradient-to-tr from-blue-100/50 to-purple-100/50 rounded-[4rem] blur-2xl -rotate-6"></div>
                 <div className="relative w-full max-w-95 bg-white p-10 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-50 transition-all duration-700 hover:scale-[1.02]">
                    <div className="flex items-center gap-5 mb-8">
                       <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl flex items-center justify-center text-3xl shadow-inner">👷</div>
                       <div>
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Barangay Resident</p>
                          <p className="text-xs font-bold text-slate-400">Purok 4, Bogtong</p>
                       </div>
                    </div>
                    <div className="space-y-4 mb-8">
                        <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden">
                            <div className="h-full w-4/5 bg-blue-900/10 rounded-full"></div>
                        </div>
                        <div className="h-3 w-2/3 bg-slate-50 rounded-full overflow-hidden">
                            <div className="h-full w-1/2 bg-blue-900/10 rounded-full"></div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                       <div className="flex flex-col">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                           <span className="text-xs font-black text-green-600 uppercase tracking-tight">Verified User</span>
                       </div>
                       <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                           <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                       </div>
                    </div>
                    <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                        <p className="text-xs font-black text-blue-600 uppercase tracking-tighter">Match Found</p>
                        <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-white text-xs">→</div>
                    </div>
                 </div>
                 <div className="absolute -bottom-6 -left-6 bg-white px-6 py-4 rounded-2xl shadow-xl border border-slate-50 animate-bounce">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Available Workers</p>
                    <p className="text-xl font-black text-slate-900 leading-none mt-1">120+</p>
                 </div>
              </div>

            </div>
          </div>
        </section>

        <section className="py-24 px-6 bg-white relative">
          <div className="max-w-7xl mx-auto text-center mb-16">
            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Why Choose Livelimatch?</h3>
          </div>
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-12">
              {[
                { title: "Localized Jobs", desc: "Find work opportunities directly inside Barangay Bogtong and nearby areas.", icon: "📍" },
                { title: "User-Friendly", desc: "Clean and simple interface for residents who are not tech-savvy.", icon: "✨" },
                { title: "Secure Profile", desc: "Every account is verified by email or phone to ensure community safety.", icon: "🛡️" }
              ].map((feature, idx) => (
                <div key={idx} className="group p-10 rounded-5xl hover:bg-slate-50 transition-all duration-500 border border-transparent hover:border-slate-100 text-center lg:text-left">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform duration-500 mx-auto lg:mx-0">
                    {feature.icon}
                  </div>
                  <h4 className="text-xl font-black mb-4 text-slate-900">{feature.title}</h4>
                  <p className="text-slate-500 leading-relaxed font-medium">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-50 py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <p className="text-xl font-black text-blue-900 tracking-tighter">LIVELI<span className="text-blue-500">MATCH</span></p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">© 2026 Barangay Bogtong Livelihood Portal</p>
          </div>
          <div className="flex gap-10">
            <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-900 transition-colors">Privacy Policy</button>
            <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-900 transition-colors">Terms of Use</button>
            <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-900 transition-colors">Help Center</button>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 10s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
      `}} />
    </div>
  );
}