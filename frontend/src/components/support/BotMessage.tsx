import { Loader2 } from "lucide-react";

export const BotMessage = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex w-full mt-4 space-x-3 max-w-xl animate-[fadeUp_0.25s_ease-out]">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0F172A] flex items-center justify-center">
        <span className="text-white text-[10px] font-bold tracking-wider">VS</span>
      </div>
      <div className="bg-white border border-[#E2E8F0] p-3 rounded-2xl rounded-tl-sm text-[13px] text-[#1E293B] shadow-sm">
        {children}
      </div>
    </div>
  );
};

export const TypingIndicator = () => {
  return (
    <div className="flex w-full mt-4 space-x-3 max-w-xl animate-[fadeUp_0.25s_ease-out]">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0F172A] flex items-center justify-center">
        <span className="text-white text-[10px] font-bold tracking-wider">VS</span>
      </div>
      <div className="bg-white border border-[#E2E8F0] px-4 py-3 rounded-2xl rounded-tl-sm flex items-center space-x-1 shadow-sm">
        <div className="w-2 h-2 rounded-full bg-[#94A3B8] animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-2 h-2 rounded-full bg-[#94A3B8] animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-2 h-2 rounded-full bg-[#94A3B8] animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
};
