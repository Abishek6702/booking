import { KeyboardEvent, useEffect, useRef, useState } from "react";

interface TicketInputBarProps {
  isClosed: boolean;
  isSending: boolean;
  onSend: (message: string) => Promise<void>;
}

const maxTextareaHeight = 120;

export const TicketInputBar = ({
  isClosed,
  isSending,
  onSend,
}: TicketInputBarProps): JSX.Element => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    const textarea = textareaRef.current;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxTextareaHeight)}px`;
  }, [message]);

  const submitMessage = async (): Promise<void> => {
    const trimmed = message.trim();
    if (!trimmed || isSending || isClosed) {
      return;
    }

    await onSend(trimmed);
    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>): Promise<void> => {
    const shouldSubmit = event.key === "Enter" && !event.shiftKey;
    if (!shouldSubmit) {
      return;
    }

    if (event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    await submitMessage();
  };

  return (
    <div className="sticky bottom-0 z-10 border-t border-[#E2E8F0] bg-white px-5 py-4">
      <div className="flex items-end gap-3">
        <textarea
          ref={textareaRef}
          value={message}
          rows={2}
          onKeyDown={handleKeyDown}
          onChange={(event) => setMessage(event.target.value)}
          disabled={isClosed || isSending}
          placeholder="Type your message..."
          className="w-full resize-none rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0F172A] focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        />
        <button
          type="button"
          onClick={submitMessage}
          disabled={isClosed || isSending || message.trim().length === 0}
          className="h-10 min-w-[96px] rounded-xl bg-[#0F172A] px-5 text-sm font-medium text-white hover:bg-[#1E293B] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSending ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
              Sending
            </span>
          ) : (
            "Send"
          )}
        </button>
      </div>
    </div>
  );
};
