import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Star, MapPin, CheckCircle, Clock, Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import attraction1 from "@/assets/attraction1.jpg";
import attraction2 from "@/assets/attraction2.jpg";

const times = [
  { time: "9:00 AM", status: "Available" },
  { time: "11:00 AM", status: "Available" },
  { time: "2:00 PM", status: "Only 5 left" },
  { time: "4:00 PM", status: "Sold Out", disabled: true },
  { time: "5:30 PM", status: "Available" },
];

const today = new Date();
const defaultDay = 21;

const AttractionDetails = () => {
  const navigate = useNavigate();
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [selectedTime, setSelectedTime] = useState("9:00 AM");
  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const subtotal = adults * 15 + children * 10;
  const monthName = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handleConfirmBooking = () => {
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const bookingDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), selectedDay);
    navigate("/confirmation", {
      state: {
        type: "attraction",
        propertyName: "Sacred Monkey Forest Sanctuary",
        propertyLocation: "Ubud, Bali",
        roomName: `${adults} Adults${children > 0 ? `, ${children} Children` : ""} · ${selectedTime}`,
        checkIn: fmt(bookingDate),
        checkOut: fmt(bookingDate),
        nights: 1,
        guests: `${adults + children} guests`,
        subtotal,
        taxes: 2,
        total: subtotal + 2,
        bookingId: `AT-${Math.floor(Math.random() * 90000) + 10000}`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 pt-4 text-sm text-muted-foreground">
        Home &gt; Bali &gt; Attractions &gt; <span className="text-foreground font-medium">Sacred Monkey Forest</span>
      </div>

      {/* Image Gallery */}
      <div className="container mx-auto px-4 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-xl overflow-hidden h-[300px]">
          <div className="md:col-span-2 md:row-span-2">
            <img src={attraction1} alt="Monkey Forest" className="w-full h-full object-cover" />
          </div>
          {[attraction2, attraction1, attraction2].map((img, i) => (
            <div key={i} className="hidden md:block relative">
              <img src={img} alt="Attraction" className="w-full h-full object-cover" loading="lazy" />
              {i === 2 && <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center text-primary-foreground font-semibold cursor-pointer hover:bg-foreground/60 transition-colors">View all 36 photos</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Sacred Monkey Forest Sanctuary</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Ubud, Bali</span>
                <span className="text-sm font-medium flex items-center gap-1">4.8 <Star className="h-3.5 w-3.5 fill-accent text-accent" /></span>
                <span className="text-sm text-muted-foreground">(2,847 reviews)</span>
                <span className="text-sm text-success flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Official Partner</span>
              </div>
            </div>

            <div>
              <h2 className="font-semibold text-foreground mb-2">Overview</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Sacred Monkey Forest Sanctuary is a significant spiritual, economic, and educational site for the local village. The Sacred Forest is home to hundreds of gray long-tailed macaques and three ancient Hindu temples within the protected jungle.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-foreground mb-2">What's Included</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {["General admission", "Temple viewing", "Forest walk access", "Photo opportunities"].map((item) => (
                  <p key={item} className="flex items-center gap-1 text-foreground"><CheckCircle className="h-3.5 w-3.5 text-success" /> {item}</p>
                ))}
              </div>
            </div>

            <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Duration: 2–3 hours</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Operating: 8:30 AM – 6:00 PM</span>
            </div>

            {/* Date & Time */}
            <div>
              <h2 className="font-semibold text-foreground mb-3">Select Date & Time</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                      className="p-1 hover:bg-secondary rounded transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <span className="font-medium text-sm text-foreground">{monthName}</span>
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                      className="p-1 hover:bg-secondary rounded transition-colors"
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                      <span key={d} className="text-muted-foreground font-medium py-1">{d}</span>
                    ))}
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <span key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`py-1.5 rounded text-xs transition-colors ${
                          selectedDay === day
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-primary hover:text-primary-foreground"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Available entry times</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {times.map((t) => (
                      <button
                        key={`${t.time}-${t.status}`}
                        disabled={t.disabled}
                        onClick={() => !t.disabled && setSelectedTime(t.time)}
                        className={`border rounded-lg p-2 text-center text-sm transition-colors ${
                          t.disabled ? "border-border bg-muted text-muted-foreground cursor-not-allowed opacity-60" :
                          selectedTime === t.time ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:border-primary"
                        }`}
                      >
                        <p className="font-medium">{t.time}</p>
                        <p className="text-xs">{t.status}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tickets */}
            <div>
              <h2 className="font-semibold text-foreground mb-3">Select Tickets</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: "Adult", sub: "(13+ years)", price: 15, count: adults, setCount: setAdults, min: 1 },
                  { label: "Child", sub: "(3–12 years)", price: 10, count: children, setCount: setChildren, min: 0 },
                  { label: "Infant", sub: "(0–2 years)", price: 0, count: 0, setCount: () => {}, min: 0 },
                ].map(({ label, sub, price, count, setCount, min }) => (
                  <div key={label} className={`border rounded-xl p-4 ${count > 0 ? "border-primary" : "border-border"}`}>
                    <p className="font-medium text-foreground">{label} <span className="text-xs text-muted-foreground">{sub}</span></p>
                    <p className="text-sm text-foreground">{price === 0 ? "Free" : `$${price} each`}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <button onClick={() => setCount(Math.max(min, count - 1))} className="border border-border rounded-full p-1 hover:bg-secondary transition-colors"><Minus className="h-3 w-3" /></button>
                      <span className="text-foreground font-medium">x{count}</span>
                      <button onClick={() => setCount(count + 1)} className="border border-border rounded-full p-1 hover:bg-secondary transition-colors"><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Summary */}
          <div>
            <div className="bg-card rounded-xl border border-border p-6 sticky top-20 space-y-4">
              <h3 className="font-semibold text-foreground">Booking Summary</h3>
              <div className="border border-border rounded-lg p-3 flex items-center gap-2 text-sm text-foreground">
                <span>📅</span>
                {monthName.split(" ")[0]} {selectedDay}, {currentMonth.getFullYear()} &nbsp; {selectedTime}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Adult × {adults}</span><span className="text-foreground">${adults * 15}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Child × {children}</span><span className="text-foreground">${children * 10}</span></div>
              </div>
              <div className="space-y-1 text-sm border-t border-border pt-3">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">${subtotal}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Processing fee:</span><span className="text-foreground">$2</span></div>
              </div>
              <div className="flex justify-between font-bold text-xl border-t border-border pt-3">
                <span className="text-foreground">Total:</span>
                <span className="text-foreground">${subtotal + 2}</span>
              </div>
              <Button
                onClick={handleConfirmBooking}
                disabled={adults + children === 0}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 py-6 text-lg"
              >
                Confirm Booking
              </Button>
              <div className="flex justify-around text-xs text-muted-foreground">
                <span className="flex flex-col items-center gap-1"><CheckCircle className="h-4 w-4 text-success" /> Instant confirmation</span>
                <span className="flex flex-col items-center gap-1"><CheckCircle className="h-4 w-4 text-success" /> Mobile ticket</span>
                <span className="flex flex-col items-center gap-1"><CheckCircle className="h-4 w-4 text-success" /> Free cancellation</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AttractionDetails;
