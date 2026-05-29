import { useState, useCallback, useRef, useEffect } from "react";
import api from "@/lib/api";

export type BotMessage = {
  id: string;
  from: "bot" | "user";
  text?: string;
  type: "text" | "options" | "booking-picker" | "textarea" | "summary" | "typing";
  options?: string[];
  selectedOption?: string;
};

export type GuidedFlowState = {
  step: 1 | 2 | 3 | 4 | 5 | "chat";
  category: string | null;
  bookingId: string | null;
  issueType: string | null;
  description: string;
  messages: BotMessage[];
};

const INITIAL_MESSAGES: BotMessage[] = [
  {
    id: "greet-1",
    from: "bot",
    text: "Hi there! 👋 I'm here to help. What is your issue about?",
    type: "options",
    options: ["🗓 Booking issue", "💳 Payment issue", "🏨 Property / stay", "✦ Something else"],
  },
];

interface BookingItem {
  id: string;
  type?: string;
  stay?: { title?: string };
  vehicle?: { model?: string };
  room?: { name?: string };
  attraction?: { name?: string };
}

export const useGuidedFlow = (onComplete: (ticketId: string) => void) => {
  const [state, setState] = useState<GuidedFlowState>({
    step: 1,
    category: null,
    bookingId: null,
    issueType: null,
    description: "",
    messages: [...INITIAL_MESSAGES],
  });

  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate a unique ID for messages
  const nextId = useRef(1);
  const getId = () => `msg-${Date.now()}-${nextId.current++}`;

  const addMessageWithTyping = useCallback((msg: Omit<BotMessage, "id" | "from">, delay = 600) => {
    // Add typing indicator
    const typingId = getId();
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, { id: typingId, from: "bot", type: "typing" }],
    }));

    // Replace typing indicator with actual message after delay
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        messages: prev.messages.map((m) =>
          m.id === typingId ? { ...msg, id: typingId, from: "bot" as const } : m
        ),
      }));
    }, delay);
  }, []);
  

  const handleSelectCategory = useCallback(async (category: string) => {
    // Replace the options message with the user's selection
    setState((prev) => {
      const msgs = prev.messages.map((m) => {
        if (m.type === "options" && !m.selectedOption) {
          return { ...m, type: "text" as const, text: category, from: "user" as const };
        }
        return m;
      });
      return { ...prev, category, messages: msgs };
    });

    if (["🗓 Booking issue", "💳 Payment issue", "🏨 Property / stay"].includes(category)) {
      // Step 2: Select booking
      setState((prev) => ({ ...prev, step: 2 }));
      setLoadingBookings(true);
      addMessageWithTyping({ type: "text", text: "Which booking is this about?" }, 600);
      
      try {
        const res = await api.get("/profile/bookings");
        // API returns { bookings: [], total: ... }
        const fetchedBookings = res.data.data?.bookings || [];
        setBookings(fetchedBookings);
        
        setTimeout(() => {
          if (fetchedBookings.length > 0) {
            setState((prev) => ({
              ...prev,
              messages: [...prev.messages, { id: getId(), from: "bot", type: "booking-picker" }],
            }));
          } else {
             // No bookings found, skip to Step 4
             setState((prev) => ({ ...prev, step: 4 }));
             addMessageWithTyping({ type: "text", text: "Looks like you don't have any bookings yet. I'll connect you directly with our support team." });
             addMessageWithTyping({ type: "textarea", text: "Can you describe the issue in a bit more detail? This helps our team resolve it faster." }, 1200);
          }
        }, 800);
      } catch (error) {
        console.error("Failed to fetch bookings", error);
        setBookings([]);
        setTimeout(() => {
          setState((prev) => ({ ...prev, step: 4 }));
          addMessageWithTyping({ type: "text", text: "I couldn't load your bookings, but we can still proceed." });
          addMessageWithTyping({ type: "textarea", text: "Can you describe the issue in a bit more detail?" }, 1200);
        }, 800);
      } finally {
        setLoadingBookings(false);
      }
    } else {
      // Step 3 logic but for "Something else", we skip booking picker and issue picker, go straight to step 4
      setState((prev) => ({ ...prev, step: 4 }));
      addMessageWithTyping({ type: "textarea", text: "Got it. Can you describe the issue in a bit more detail? This helps our team resolve it faster." }, 600);
    }
  }, [addMessageWithTyping]);

  const handleSelectBooking = useCallback((bookingId: string) => {
    setState((prev) => {
      // Find the booking to show in the user bubble
      const b = bookings.find((bk) => bk.id === bookingId);
      const text = b ? `Booking: ${b.stay?.title || b.vehicle?.model || b.room?.name || b.id.slice(0, 8)}` : `Booking ${bookingId}`;
      
      const msgs = prev.messages.filter(m => m.type !== "booking-picker").concat([
        { id: getId(), from: "user" as const, type: "text" as const, text }
      ]);
      return { ...prev, bookingId, step: 3, messages: msgs };
    });

    // Step 3: Specific problem picker
    let issueOptions: string[] = [];
    let prompt = "";
    
    const category = state.category;
    if (category === "🗓 Booking issue") {
      prompt = "What's the issue with this booking?";
      issueOptions = ["Can't cancel", "Wrong dates", "Need to reschedule", "Didn't receive confirmation", "Other"];
    } else if (category === "💳 Payment issue") {
      prompt = "What's the payment problem?";
      issueOptions = ["Charged but not confirmed", "Double charged", "Refund not received", "Payment failed", "Other"];
    } else if (category === "🏨 Property / stay") {
      prompt = "What's the issue with the property?";
      issueOptions = ["Property doesn't match listing", "Safety concern", "Amenities missing", "Check-in problem", "Other"];
    } else {
      prompt = "What is the issue regarding?";
      issueOptions = ["Other"];
    }

    addMessageWithTyping({ type: "options", text: prompt, options: issueOptions }, 600);
  }, [addMessageWithTyping, bookings, state.category]);

  const handleSelectIssue = useCallback((issueType: string) => {
    setState((prev) => {
      const msgs = prev.messages.map((m) => {
        if (m.type === "options" && !m.selectedOption) {
          return { ...m, type: "text" as const, text: issueType, from: "user" as const };
        }
        return m;
      });
      return { ...prev, issueType, step: 4, messages: msgs };
    });

    addMessageWithTyping({ type: "textarea", text: "Got it. Can you describe the issue in a bit more detail? This helps our team resolve it faster." }, 600);
  }, [addMessageWithTyping]);

  const handleProvideDescription = useCallback((description: string) => {
    setState((prev) => {
      const msgs = prev.messages.filter(m => m.type !== "textarea").concat([
        { id: getId(), from: "user" as const, type: "text" as const, text: description }
      ]);
      return { ...prev, description, step: 5, messages: msgs };
    });

    addMessageWithTyping({ type: "summary", text: "Here's a summary of your issue:" }, 600);
  }, [addMessageWithTyping]);

  const startOver = useCallback(() => {
    setState({
      step: 1,
      category: null,
      bookingId: null,
      issueType: null,
      description: "",
      messages: [...INITIAL_MESSAGES],
    });
  }, []);

  const submitTicket = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const subject = `${state.category?.replace(/[^a-zA-Z\s]/g, '').trim()} — ${state.issueType || "General issue"}`;
      const message = `${state.description}\n\nBooking: ${state.bookingId || "N/A"}\nCategory: ${state.category}\nIssue: ${state.issueType || "N/A"}`;
      
      const res = await api.post("/support/tickets", { subject, message });
      const newTicketId = res.data.data.id;
      
      setState((prev) => ({
        ...prev,
        step: "chat",
        messages: [
          ...prev.messages.filter(m => m.type !== "summary"), // remove summary card
          { id: getId(), from: "bot", type: "text", text: "✓ Your ticket has been created. A support agent will join this conversation shortly. You can continue describing your issue below." }
        ]
      }));
      
      onComplete(newTicketId);
    } catch (error) {
      console.error("Failed to create ticket", error);
      // Revert step to 5 so they can retry
      setState(prev => ({ ...prev, step: 5 }));
      addMessageWithTyping({ type: "text", text: "Sorry, there was an error creating your ticket. Please try again." }, 0);
    } finally {
      setIsSubmitting(false);
    }
  }, [state, onComplete, addMessageWithTyping]);

  return {
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
  };
};
