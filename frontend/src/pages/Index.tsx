/* eslint-disable @typescript-eslint/no-explicit-any */
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import DestinationCard from "@/components/DestinationCard";
import heroBg from "@/assets/hero-bg.jpg";
import paris from "@/assets/paris.jpg";
import maldives from "@/assets/maldives.jpg";
import tokyo from "@/assets/tokyo.jpg";
import {
  Hotel, Car, Landmark, ArrowRight, Sparkles, Shield, Clock, Tag,
  Star, MapPin, Wifi, Coffee, Dumbbell, Waves, Mountain, TreePine,
  Building2, Compass, HeartHandshake, BadgeCheck, PhoneCall, Globe,
  ChevronRight, TrendingUp, Users, Plane, Camera, Utensils, Music,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

import { matchVibe } from "@/utils/vibeMatcher";

const SectionLabel = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2 mb-2">
    <div className="w-8 h-[2px] bg-primary" />
    <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">{text}</span>
  </div>
);

const Index = () => {
  const navigate = useNavigate();

  const tabs = [
    { icon: Hotel, label: "Hotels", path: "/stay" },
    { icon: Car, label: "Vehicle", path: "/vehicles" },
    { icon: Landmark, label: "Attractions", path: "/attractions" },
  ];

  const features = [
    { icon: Tag, title: "Best Price Guarantee", desc: "We match any lower price you find, guaranteed." },
    { icon: Shield, title: "Secure Booking", desc: "End-to-end encrypted payments, always safe." },
    { icon: Clock, title: "24/7 Support", desc: "Round-the-clock assistance wherever you are." },
    { icon: BadgeCheck, title: "Verified Properties", desc: "Every listing is manually reviewed and certified." },
    { icon: HeartHandshake, title: "Free Cancellation", desc: "Flexible plans with no hidden cancellation fees." },
    { icon: Globe, title: "120+ Destinations", desc: "Curated picks across six continents worldwide." },
  ];

  const categories = [
    { icon: Waves, label: "Beach", color: "bg-sky-50 text-sky-600 border-sky-100" },
    { icon: Mountain, label: "Mountains", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    { icon: Building2, label: "City", color: "bg-violet-50 text-violet-600 border-violet-100" },
    { icon: TreePine, label: "Nature", color: "bg-lime-50 text-lime-600 border-lime-100" },
    { icon: Compass, label: "Adventure", color: "bg-orange-50 text-orange-600 border-orange-100" },
    { icon: Camera, label: "Cultural", color: "bg-rose-50 text-rose-600 border-rose-100" },
    { icon: Utensils, label: "Culinary", color: "bg-amber-50 text-amber-600 border-amber-100" },
    { icon: Music, label: "Nightlife", color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
  ];

  const [trendingStays, setTrendingStays] = useState<any[]>([]);
  const [loadingStays, setLoadingStays] = useState(true);
  const [popularStays, setPopularStays] = useState<any[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [allStays, setAllStays] = useState<any[]>([]);
  const [loadingAllStays, setLoadingAllStays] = useState(true);

  useEffect(() => {
    const fetchStays = async () => {
      try {
        const res = await api.get("/stays/search?limit=4");
        setTrendingStays(res.data?.data?.stays || []);
      } catch (err) {
        console.error("Failed to fetch stays", err);
      } finally {
        setLoadingStays(false);
      }
    };
    const fetchPopular = async () => {
      try {
        const res = await api.get("/stays/featured?limit=3");
        setPopularStays(res.data?.data || []);
      } catch (err) {
        console.error("Failed to fetch popular stays", err);
      } finally {
        setLoadingPopular(false);
      }
    };
    const fetchAllStays = async () => {
      try {
        setLoadingAllStays(true);
        const res = await api.get("/stays/search?limit=100");
        setAllStays(res.data?.data?.stays || []);
      } catch (err) {
        console.error("Failed to fetch all stays", err);
      } finally {
        setLoadingAllStays(false);
      }
    };
    fetchStays();
    fetchPopular();
    fetchAllStays();
  }, []);

  const amenities = [
    { icon: Wifi, label: "Free Wi-Fi" },
    { icon: Coffee, label: "Breakfast" },
    { icon: Dumbbell, label: "Fitness" },
    { icon: Waves, label: "Pool" },
    { icon: Car, label: "Parking" },
    { icon: PhoneCall, label: "Concierge" },
  ];

  const testimonials = [
    {
      name: "Priya Sharma", location: "Mumbai", rating: 5,
      text: "WAYNEXX made our Maldives honeymoon absolutely perfect. The villa was exactly as shown and the support team was incredibly responsive.",
      avatar: "PS",
    },
    {
      name: "Rahul Verma", location: "Bangalore", rating: 5,
      text: "Booked a self-drive vehicle for our Coorg trip through WAYNEXX. Seamless experience, great pricing, and the car was spotless.",
      avatar: "RV",
    },
    {
      name: "Ananya Iyer", location: "Chennai", rating: 4,
      text: "The Paris hotel recommendation was spot-on. Premium location, amazing breakfast, and free cancellation gave us peace of mind.",
      avatar: "AI",
    },
  ];

  const travelTips = [
    {
      tag: "Planning",
      title: "Book 6 Weeks Ahead for Best Hotel Deals",
      desc: "Studies show prices drop 20–30% when you book 40–45 days before arrival.",
      readTime: "3 min read",
    },
    {
      tag: "Packing",
      title: "The Ultimate Carry-On Packing Checklist",
      desc: "Everything you need for a week-long trip in a single carry-on bag.",
      readTime: "5 min read",
    },
    {
      tag: "Savings",
      title: "How to Find Hidden Flight Deals in 2025",
      desc: "Use these 7 tricks to unlock unadvertised fares and save up to 40%.",
      readTime: "4 min read",
    },
  ];

  const stats = [
    { value: "50K+", label: "Happy Travelers", icon: Users },
    { value: "120+", label: "Destinations", icon: Globe },
    { value: "98%", label: "Satisfaction", icon: Star },
    { value: "1M+", label: "Bookings", icon: TrendingUp },
    { value: "500+", label: "Hotels Listed", icon: Hotel },
    { value: "80+", label: "Vehicle Types", icon: Car },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 selection:bg-primary selection:text-white">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative px-4 pt-4 pb-12 overflow-hidden">
        <div className="relative h-[580px] rounded-[3rem] overflow-hidden shadow-2xl group">
          <img
            src={heroBg}
            alt="Travel"
            className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/40 to-transparent" />

          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center max-w-4xl mx-auto px-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-5 animate-in fade-in duration-700">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              <span className="text-[9px] font-black text-white uppercase tracking-[0.3em]">Premium Destination Discovery</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-[1.1] tracking-tight animate-in fade-in slide-in-from-bottom-8 duration-1000">
              Elevate Your <span className="text-primary italic font-light font-serif">Journey</span>
              <br className="hidden md:block" /> with WAYNEXX
            </h1>

            <p className="text-base md:text-lg text-white/70 mb-8 max-w-xl font-medium animate-in fade-in duration-1000 delay-300">
              Curated stays, premium fleets, and exclusive experiences for the modern explorer.
            </p>

            {/* Tabs + Search */}
            <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500 space-y-3">
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-1 p-1 bg-white/10 backdrop-blur-2xl rounded-xl border border-white/20 shadow-2xl shadow-black/20">
                  {tabs.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => navigate(t.path)}
                      className="group relative flex items-center gap-2 px-5 sm:px-8 py-2.5 sm:py-3 rounded-lg bg-white text-slate-900 text-[10px] font-black uppercase tracking-[0.2em] shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <t.icon className="h-3.5 w-3.5 text-primary group-hover:scale-125 transition-transform duration-300 relative z-10" />
                      <span className="relative z-10">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative mx-2 sm:mx-0">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-white/20 to-primary/10 rounded-[1.75rem] blur-xl opacity-60" />
                <div className="relative bg-white/95 backdrop-blur-xl p-2.5 sm:p-3 rounded-[1.5rem] shadow-[0_20px_80px_-10px_rgba(0,0,0,0.35)] border border-white/80">
                  <SearchBar />
                </div>
              </div>
            </div>
          </div>
        </div>


      </section>

      {/* ── Categories ───────────────────────────────────────── */}
      <section className="container mx-auto px-6 py-10">
        <div className="flex justify-between items-end mb-5">
          <div>
            <SectionLabel text="Browse by Type" />
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Travel Categories</h2>
          </div>

        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
          {categories.map((c) => {
            const count = allStays.filter(s => matchVibe(s, c.label)).length;
            return (
              <button
                key={c.label}
                onClick={() => navigate(`/search?category=hotels&vibe=${c.label.toLowerCase()}`)}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border ${c.color} hover:-translate-y-1 hover:shadow-md transition-all duration-200 group`}
              >
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <c.icon className="h-5 w-5" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest">{c.label}</span>
                <span className="text-[8px] font-semibold opacity-60">
                  {loadingAllStays ? "..." : `${count} stay${count === 1 ? "" : "s"}`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Popular Destinations ─────────────────────────────── */}
      <section className="container mx-auto px-6 py-10">
        <div className="flex justify-between items-end mb-5">
          <div>
            <SectionLabel text="Exclusive Picks" />
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Popular Destinations</h2>
          </div>

        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {loadingPopular ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
            ))
          ) : popularStays.length === 0 ? (
            <div className="col-span-full py-10 text-center bg-white rounded-2xl border border-slate-100">
               <MapPin className="h-10 w-10 text-slate-200 mx-auto mb-2" />
               <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No popular destinations discovered yet</p>
            </div>
          ) : (
            popularStays.map((stay) => {
              const price = stay.rooms?.[0]?.pricePerNight || stay.basePricePerNight || 0;
              return (
                <div key={stay.id} onClick={() => navigate(`/stay-details/${stay.id}`)}>
                  <DestinationCard 
                    image={stay.images?.[0] || maldives} 
                    name={`${stay.title}, ${stay.city}`} 
                    priceFrom={`₹${Number(price).toLocaleString()}/night`}
                    priceTo={`₹${Number(price * 1.15).toLocaleString()}/night`}
                    rating={stay.avgRating || stay.rating || 4.5}
                    reviews={stay.totalReviews || stay.reviewsCount || 12}
                  />
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── Trending Hotels ──────────────────────────────────── */}
      <section className="container mx-auto px-6 py-10">
        <div className="flex justify-between items-end mb-5">
          <div>
            <SectionLabel text="Hand-Picked" />
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Trending Hotels</h2>
          </div>
          <button
            onClick={() => navigate("/stay")}
            className="hidden md:flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-widest hover:gap-2 transition-all"
          >
            Browse All <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loadingStays ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
            ))
          ) : trendingStays.length === 0 ? (
            <div className="col-span-full py-10 text-center bg-white rounded-2xl border border-slate-100">
               <Hotel className="h-10 w-10 text-slate-200 mx-auto mb-2" />
               <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No properties discovered yet</p>
            </div>
          ) : trendingStays.map((h) => (
            <div
              key={h.id}
              onClick={() => navigate(`/stay-details/${h.id}`)}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group cursor-pointer"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={h.images?.[0] || maldives} alt={h.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-full">
                  {h.type || "Trending"}
                </span>
              </div>
              <div className="p-3.5">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-sm font-black text-slate-900 leading-tight truncate pr-2">{h.title}</h3>
                  <span className="text-sm font-black text-primary whitespace-nowrap ml-2">₹{(h.rooms?.[0]?.pricePerNight || h.basePricePerNight || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400 mb-2">
                  <MapPin className="h-3 w-3" />
                  <span className="text-[10px] font-medium">{h.city}, {h.country}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-[10px] font-black text-slate-800">{h.avgRating || "5.0"}</span>
                    <span className="text-[9px] text-slate-400">({(h.totalReviews || 0).toLocaleString()})</span>
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">/night</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why Choose Us ────────────────────────────────────── */}
      <section className="container mx-auto px-6 py-10">
        <div className="text-center mb-6">
          <SectionLabel text="Our Promise" />
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Why Travelers Choose Us</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">Built for explorers who demand the best — from first click to checkout.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex flex-col items-center text-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wide mb-1 leading-tight">{f.title}</h3>
              <p className="text-[9px] text-slate-400 leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Amenities Strip ──────────────────────────────────── */}
      <section className="bg-white border-y border-slate-100 py-5">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-3">
            {amenities.map((a: any) => (
              <div key={a.label} className="flex items-center gap-2 text-slate-500">
                <a.icon className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest">{a.label} Included</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="container mx-auto px-6 py-10">
        <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-6 left-6 w-48 h-48 bg-primary rounded-full blur-[80px]" />
            <div className="absolute bottom-6 right-6 w-72 h-72 bg-primary/40 rounded-full blur-[100px]" />
          </div>
          <div className="relative z-10 text-center mb-6">
            <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">By the Numbers</span>
            <h2 className="text-2xl md:text-3xl font-black text-white mt-1">Trusted by Millions Worldwide</h2>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-6 relative z-10">
            {stats.map((s) => (
              <div key={s.label} className="text-center group">
                <div className="flex justify-center mb-2">
                  <s.icon className="h-4 w-4 text-primary/60" />
                </div>
                <p className="text-3xl md:text-4xl font-black text-white mb-1 group-hover:scale-110 transition-transform duration-300">{s.value}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section className="container mx-auto px-6 py-10">
        <div className="flex justify-between items-end mb-5">
          <div>
            <SectionLabel text="Real Reviews" />
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">What Travelers Say</h2>
          </div>
          <div className="hidden md:flex items-center gap-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-black text-slate-900">4.9</span>
            <span className="text-[10px] text-slate-400 ml-1">from 12,400+ reviews</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">"{t.text}"</p>
              <div className="flex items-center gap-3 pt-3 border-t border-slate-50">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black border border-primary/20">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-900">{t.name}</p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest">{t.location}</p>
                </div>
                <BadgeCheck className="h-4 w-4 text-emerald-500 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Travel Tips ──────────────────────────────────────── */}
      <section className="container mx-auto px-6 py-10">
        <div className="flex justify-between items-end mb-5">
          <div>
            <SectionLabel text="Expert Advice" />
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Travel Tips & Guides</h2>
          </div>
          <button className="hidden md:flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-widest hover:gap-2 transition-all">
            All Articles <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {travelTips.map((tip) => (
            <div
              key={tip.title}
              className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 bg-primary/8 text-primary text-[9px] font-black uppercase tracking-widest rounded-full">
                  {tip.tag}
                </span>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest">{tip.readTime}</span>
              </div>
              <h3 className="text-sm font-black text-slate-900 mb-2 leading-snug group-hover:text-primary transition-colors">{tip.title}</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-3">{tip.desc}</p>
              <div className="flex items-center gap-1 text-primary text-[10px] font-black uppercase tracking-widest">
                Read More <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── App / Newsletter CTA ─────────────────────────────── */}
      <section className="container mx-auto px-6 py-10 pb-14">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Newsletter */}
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-7 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
            <Plane className="h-7 w-7 mb-3 opacity-80" />
            <h3 className="text-lg font-black mb-1">Get Travel Deals First</h3>
            <p className="text-[11px] text-white/70 mb-4 max-w-xs">
              Join 50,000+ travelers who get exclusive deals, destination guides, and early-bird offers every week.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 px-4 py-2.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl text-sm placeholder:text-white/40 text-white outline-none focus:border-white/50 transition-colors"
              />
              <button className="px-4 py-2.5 bg-white text-primary font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/90 transition-colors whitespace-nowrap shadow-lg">
                Subscribe
              </button>
            </div>
          </div>

          {/* App Download */}
          <div className="bg-slate-900 rounded-2xl p-7 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full -translate-y-12 translate-x-12" />
            <Sparkles className="h-7 w-7 mb-3 text-primary" />
            <h3 className="text-lg font-black mb-1">Book On the Go</h3>
            <p className="text-[11px] text-slate-400 mb-5 max-w-xs">
              Manage bookings, get real-time alerts, and chat with support — all from your pocket.
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-white/10 rounded-xl hover:bg-white/15 transition-colors">
                <div className="w-5 h-5 rounded bg-white/20 flex items-center justify-center">
                  <span className="text-[8px] font-black">▶</span>
                </div>
                <div>
                  <p className="text-[8px] text-slate-400 leading-none">Get it on</p>
                  <p className="text-[10px] font-black leading-none">Google Play</p>
                </div>
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-white/10 rounded-xl hover:bg-white/15 transition-colors">
                <div className="w-5 h-5 rounded bg-white/20 flex items-center justify-center">
                  <span className="text-[8px] font-black"></span>
                </div>
                <div>
                  <p className="text-[8px] text-slate-400 leading-none">Download on</p>
                  <p className="text-[10px] font-black leading-none">App Store</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
