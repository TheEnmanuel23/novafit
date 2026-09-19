import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-radial flex flex-col justify-between items-center p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[5%] right-[-10%] w-[60%] h-[40%] bg-accent/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] left-[-20%] w-[70%] h-[50%] bg-success/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-sm mt-12 animate-in slide-in-from-top-8 fade-in duration-700">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">NovaFit</h1>
        </div>
        <p className="text-muted-foreground text-lg">Tu gimnasio, en tu bolsillo.</p>
      </div>

      <div className="w-full max-w-sm flex-1 flex flex-col justify-center animate-in zoom-in-95 fade-in duration-700 delay-150">
        <div className="glass-strong p-8 rounded-[32px] shadow-2xl relative overflow-hidden border-white/10">
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
          
          <h2 className="text-2xl font-bold mb-6 text-white relative z-10">Ingresa a tu cuenta</h2>
          
          <form className="flex flex-col gap-5 relative z-10">
            <div className="input-group">
              <label className="input-label text-[11px] font-bold text-muted-foreground tracking-wider uppercase" htmlFor="username">Usuario NovaFit</label>
              <div className="relative flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 text-muted-foreground"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <input 
                  id="username"
                  name="username"
                  type="text" 
                  className="input pl-12 bg-black/40 border-white/10 focus:border-accent focus:bg-black/60 transition-all rounded-2xl h-14 text-white font-medium" 
                  placeholder="Ej: AB12-3456"
                  required 
                />
              </div>
            </div>

            <button type="submit" className="btn h-14 rounded-2xl mt-4 text-base font-bold text-white bg-gradient-to-r from-accent to-[#818cf8] border-none shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)] hover:shadow-[0_0_50px_-5px_rgba(99,102,241,0.8)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group">
              Continuar
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </form>
        </div>
      </div>

      <div className="w-full max-w-sm pb-8 text-center animate-in slide-in-from-bottom-8 fade-in duration-700 delay-300">
        <p className="text-sm text-muted-foreground">
          ¿Es tu primera vez? <span className="text-white font-medium">Pide tu acceso en recepción</span>
        </p>
      </div>
    </div>
  );
}
