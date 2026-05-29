/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, ReactNode } from "react";

interface BookingSelection {
  type: "stay" | "vehicle" | "attraction";
  stayId?: string;
  roomId?: string;
  vehicleId?: string;
  attractionId?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: { adults: number; children: number };
  totalAmount?: number;
}

interface BookingContextType {
  selection: BookingSelection | null;
  bookingId: string | null;
  idempotencyKey: string | null;
  setSelection: (selection: BookingSelection) => void;
  setBookingDetails: (id: string, key: string) => void;
  clearBooking: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [selection, setSelectionState] = useState<BookingSelection | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  const setSelection = (s: BookingSelection) => {
    setSelectionState(s);
  };

  const setBookingDetails = (id: string, key: string) => {
    setBookingId(id);
    setIdempotencyKey(key);
  };

  const clearBooking = () => {
    setSelectionState(null);
    setBookingId(null);
    setIdempotencyKey(null);
  };

  return (
    <BookingContext.Provider value={{ selection, bookingId, idempotencyKey, setSelection, setBookingDetails, clearBooking }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) throw new Error("useBooking must be used within a BookingProvider");
  return context;
};
