import { TicketChatPage } from "@/components/support/TicketChatPage";
import Navbar from "@/components/Navbar";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const SupportTickets = (): JSX.Element => {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar />
      <main className="flex-1 min-h-0 container mx-auto px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
         <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/dashboard")} 
              className="text-slate-500 hover:bg-white rounded-2xl px-6 h-12 flex items-center gap-3 group transition-all border border-slate-100 bg-white/50 backdrop-blur-md"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Return to Dashboard</span>
            </Button>
          </div>
         <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 h-[calc(100%-80px)] overflow-hidden flex relative">
            <TicketChatPage />
         </div>
      </main>
    </div>
  );
};

export default SupportTickets;
