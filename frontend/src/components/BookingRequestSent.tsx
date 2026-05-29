import { Bell, Car, Check, Send, UserCheck } from "lucide-react";

interface BookingRequestSentProps {
  destinationName: string;
  onCancel: () => void;
  isCancelling?: boolean;
}

const steps = [
  { key: "sent", label: "Request sent", icon: Send, active: true },
  { key: "confirm", label: "Driver confirms", icon: UserCheck, active: false },
  { key: "route", label: "En route", icon: Car, active: false },
];

export default function BookingRequestSent({ destinationName, onCancel, isCancelling }: BookingRequestSentProps) {
  return (
    <div className="w-full h-full bg-[#0f1117] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[480px] flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-full bg-[#1a2e24] flex items-center justify-center">
          <Check className="h-6 w-6 text-[#2ecc71]" />
        </div>

        <h2 className="mt-4 text-[17px] font-semibold text-white">Booking sent!</h2>
        <p className="mt-1 text-[12px] text-[#6b7280]">
          Awaiting driver confirmation for {destinationName}
        </p>

        <div className="mt-7 w-full">
          <div className="relative px-4">
            <div className="absolute left-10 right-10 top-4 h-px bg-[#2d2d2d]" />
            <div className="relative grid grid-cols-3 gap-4">
              {steps.map(({ key, label, icon: Icon, active }) => (
                <div key={key} className="flex flex-col items-center gap-2">
                  <div
                    className={`h-8 w-8 rounded-full border flex items-center justify-center ${
                      active
                        ? "bg-[#1a2e24] border-[#2ecc71] text-[#2ecc71]"
                        : "bg-[#1c1c24] border-[#2d2d2d] text-[#6b7280]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-[10px] text-[#6b7280]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 w-full rounded-lg bg-[#181b24] p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#2a2a3a] flex items-center justify-center text-[#9b8be4] text-xs font-bold">
              VD
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[13px] text-white truncate">Waiting for driver match...</p>
              <p className="text-[11px] text-[#6b7280]">You'll be notified instantly</p>
            </div>
            <Bell className="h-4 w-4 text-[#9b8be4] flex-shrink-0" />
          </div>
        </div>

        <button
          onClick={onCancel}
          disabled={isCancelling}
          className="mt-6 text-[11px] text-[#6b7280] underline underline-offset-2 hover:text-[#9ca3af] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCancelling ? "Cancelling..." : "Cancel request"}
        </button>
      </div>
    </div>
  );
}
