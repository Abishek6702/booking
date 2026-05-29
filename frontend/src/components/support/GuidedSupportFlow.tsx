import { useEffect, useRef } from "react";
import { useGuidedFlow } from "../../hooks/useGuidedFlow";
import { BotMessage, TypingIndicator } from "./BotMessage";
import { UserBubble } from "./UserBubble";
import { OptionPills } from "./OptionPills";
import { BookingPicker } from "./BookingPicker";
import { DescriptionInput } from "./DescriptionInput";
import { SummaryCard } from "./SummaryCard";

export const GuidedSupportFlow = ({ onComplete }: { onComplete: (ticketId: string) => void }) => {
  const {
    state,
    bookings,
    loadingBookings,
    isSubmitting,
    handleSelectCategory,
    handleSelectBooking,
    handleSelectIssue,
    handleProvideDescription,
    startOver,
    submitTicket,
  } = useGuidedFlow(onComplete);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [state.messages]);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 pb-24">
        {state.messages.map((msg) => {
          if (msg.type === "typing") {
            return <TypingIndicator key={msg.id} />;
          }

          if (msg.from === "user") {
            return <UserBubble key={msg.id} text={msg.text || ""} />;
          }

          // Bot messages
          return (
            <div key={msg.id}>
              {msg.text && <BotMessage>{msg.text}</BotMessage>}
              
              {msg.type === "options" && msg.options && !msg.selectedOption && (
                <OptionPills
                  options={msg.options}
                  onSelect={
                    state.step === 1
                      ? handleSelectCategory
                      : handleSelectIssue
                  }
                />
              )}

              {msg.type === "booking-picker" && (
                loadingBookings ? (
                  <div className="ml-11 mt-3 text-[13px] text-[#64748B]">Loading your bookings...</div>
                ) : (
                  <BookingPicker bookings={bookings} onSelect={handleSelectBooking} />
                )
              )}

              {msg.type === "textarea" && (
                <DescriptionInput onSubmit={handleProvideDescription} />
              )}

              {msg.type === "summary" && (
                <SummaryCard
                  category={state.category || "Unknown"}
                  bookingId={state.bookingId}
                  issueType={state.issueType || "Unknown"}
                  description={state.description}
                  onSubmit={submitTicket}
                  onReset={startOver}
                  isSubmitting={isSubmitting}
                />
              )}
            </div>
          );
        })}
        <div ref={endOfMessagesRef} />
      </div>
      
      {/* Decorative input area to make it look like a chat shell, though disabled during flow */}
      {state.step !== "chat" && (
        <div className="bg-white border-t border-[#E2E8F0] p-4 flex-shrink-0">
          <div className="relative flex items-center">
            <input 
              type="text" 
              placeholder="Please follow the guided steps above..." 
              disabled 
              className="w-full bg-[#F1F5F9] border border-[#E2E8F0] rounded-full py-3 px-4 text-[13px] text-[#94A3B8] cursor-not-allowed"
            />
          </div>
        </div>
      )}
    </div>
  );
};
