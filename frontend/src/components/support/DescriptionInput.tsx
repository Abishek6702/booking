import { useState } from "react";
import { ArrowRight } from "lucide-react";

export const DescriptionInput = ({ onSubmit }: { onSubmit: (text: string) => void }) => {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (text.trim().length >= 20) {
      onSubmit(text.trim());
    }
  };

  return (
    <div className="mt-3 ml-11 w-full max-w-md animate-[fadeUp_0.25s_ease-out_0.2s_both]">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe what happened..."
        className="w-full border border-[#E2E8F0] rounded-xl p-3 text-[13px] text-[#1E293B] focus:outline-none focus:border-[#0F172A] resize-none"
        rows={3}
      />
      <div className="mt-2 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={text.trim().length < 20}
          className="bg-[#0F172A] text-white rounded-xl px-5 py-2 text-[13px] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2 hover:bg-[#1E293B]"
        >
          Continue <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
      {text.trim().length > 0 && text.trim().length < 20 && (
        <p className="text-[11px] text-[#64748B] text-right mt-1">Please enter at least 20 characters.</p>
      )}
    </div>
  );
};
