export const OptionPills = ({ options, onSelect }: { options: string[]; onSelect: (opt: string) => void }) => {
  return (
    <div className="flex flex-wrap gap-2 mt-3 ml-11 animate-[fadeUp_0.25s_ease-out_0.2s_both]">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className="bg-white border border-[#E2E8F0] text-[#1E293B] hover:bg-[#F8FAFC] hover:border-[#0F172A] px-4 py-2 rounded-xl text-[13px] font-medium transition-colors duration-200 shadow-sm"
        >
          {opt}
        </button>
      ))}
    </div>
  );
};
