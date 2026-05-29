export const UserBubble = ({ text }: { text: string }) => {
  return (
    <div className="flex w-full mt-4 justify-end animate-[fadeUp_0.25s_ease-out]">
      <div className="bg-[#0F172A] text-white p-3 rounded-2xl rounded-tr-sm text-[13px] max-w-xs shadow-sm">
        {text}
      </div>
    </div>
  );
};
