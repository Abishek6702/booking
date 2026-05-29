import { MapPin, Calendar as CalendarIcon, Users, Search, Minus, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";

const POPULAR_CITIES = [
  { name: "Paris", country: "France" },
  { name: "Maldives", country: "Island" },
  { name: "Tokyo", country: "Japan" },
  { name: "London", country: "United Kingdom" },
  { name: "New York", country: "United States" },
  { name: "Dubai", country: "United Arab Emirates" },
];

const SearchBar = () => {
  const navigate = useNavigate();
  const [destination, setDestination] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState({ adults: 2, children: 0 });
  const [showCities, setShowCities] = useState(false);
  const [showDates, setShowDates] = useState(false);
  const [showGuests, setShowGuests] = useState(false);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (destination) params.set("destination", destination);
    if (dateRange?.from) params.set("checkIn", format(dateRange.from, "yyyy-MM-dd"));
    if (dateRange?.to) params.set("checkOut", format(dateRange.to, "yyyy-MM-dd"));
    params.set("guests", String(guests.adults + guests.children));
    params.set("adults", String(guests.adults));
    params.set("children", String(guests.children));
    navigate(`/search?${params.toString()}`);
  };

  const dateLabel =
    dateRange?.from
      ? dateRange.to
        ? `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d")}`
        : format(dateRange.from, "MMM d")
      : "Add dates";

  const guestLabel = `${guests.adults} Adult${guests.adults !== 1 ? "s" : ""}${
    guests.children > 0 ? `, ${guests.children} Child${guests.children !== 1 ? "ren" : ""}` : ""
  }`;

  const fieldBase =
    "group flex flex-col gap-0.5 px-5 py-3 flex-1 rounded-xl hover:bg-slate-50/80 transition-all duration-200 cursor-pointer border border-transparent hover:border-slate-200/80 hover:shadow-sm";

  return (
    <div className="flex flex-col md:flex-row items-stretch gap-2">
      {/* Destination */}
      <Popover open={showCities} onOpenChange={setShowCities}>
        <PopoverTrigger asChild>
          <div className={fieldBase + " cursor-text"}>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Where to?</span>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
              <input
                type="text"
                placeholder="Search destinations"
                value={destination}
                onFocus={() => setShowCities(true)}
                onChange={(e) => setDestination(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setShowCities(false);
                    if (!dateRange?.from) {
                      setTimeout(() => setShowDates(true), 100);
                    } else {
                      handleSearch();
                    }
                  }
                }}
                className="bg-transparent outline-none text-sm font-semibold w-full placeholder:text-slate-300 text-slate-800"
              />
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <div className="space-y-1">
            <p className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Popular Destinations</p>
            {POPULAR_CITIES.map((city) => (
              <button
                key={city.name}
                onClick={() => {
                  setDestination(city.name);
                  setShowCities(false);
                  setTimeout(() => setShowDates(true), 100);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-lg transition-colors group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <MapPin className="h-4 w-4 text-slate-400 group-hover:text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{city.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{city.country}</p>
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="hidden md:block w-px bg-slate-200 self-stretch my-2" />

      {/* Date Range Picker */}
      <Popover open={showDates} onOpenChange={setShowDates}>
        <PopoverTrigger asChild>
          <button className={fieldBase + " text-left"}>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">When?</span>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary flex-shrink-0" />
              <span className={`text-sm font-semibold truncate ${dateRange?.from ? "text-slate-800" : "text-slate-300"}`}>
                {dateLabel}
              </span>
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={(range) => {
              setDateRange(range);
              if (range?.to) {
                setShowDates(false);
                setTimeout(() => setShowGuests(true), 100);
              }
            }}
            numberOfMonths={2}
            disabled={{ before: new Date() }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <div className="hidden md:block w-px bg-slate-200 self-stretch my-2" />

      {/* Guest Picker */}
      <Popover open={showGuests} onOpenChange={setShowGuests}>
        <PopoverTrigger asChild>
          <button className={fieldBase + " text-left"}>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Guests</span>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm font-semibold text-slate-800 flex-1">{guestLabel}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary transition-colors" />
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" align="start">
          <div className="space-y-4">
            {[
              { label: "Adults", sub: "Ages 13+", key: "adults" as const, min: 1 },
              { label: "Children", sub: "Ages 0–12", key: "children" as const, min: 0 },
            ].map(({ label, sub, key, min }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGuests((g) => ({ ...g, [key]: Math.max(min, g[key] - 1) }))}
                    className="w-8 h-8 border border-border rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-5 text-center font-bold text-foreground">{guests[key]}</span>
                  <button
                    onClick={() => setGuests((g) => ({ ...g, [key]: g[key] + 1 }))}
                    className="w-8 h-8 bg-primary/10 border border-primary/20 text-primary rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
            <Button size="sm" className="w-full rounded-xl" onClick={() => setShowGuests(false)}>
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Search Button */}
      <div className="flex items-center pl-1">
        <button
          onClick={handleSearch}
          className="group relative flex items-center gap-2.5 bg-primary hover:bg-primary/90 text-white font-black text-[11px] uppercase tracking-widest px-7 py-4 rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden w-full md:w-auto justify-center"
        >
          <span className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Search className="h-4 w-4 relative z-10 group-hover:scale-110 transition-transform" />
          <span className="relative z-10">Search</span>
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
