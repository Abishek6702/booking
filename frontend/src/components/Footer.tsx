import { Link } from "react-router-dom";
import { MapPin, Mail, Phone } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-white mt-16 rounded-t-3xl">
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-flex items-center mb-2">
              <img src="/logo.png" alt="WAYNEXX Logo" className="h-6 md:h-7 w-auto object-contain brightness-0 invert opacity-80 hover:opacity-100 hover:scale-105 transition-all duration-300 drop-shadow-md" />
            </Link>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              Curated stays, premium mobility, and unforgettable attractions since 2026.
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <Mail className="h-3 w-3" /> hello@waynexx.com
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <Phone className="h-3 w-3" /> +91 98765 43210
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <MapPin className="h-3 w-3" /> Mumbai, India
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Explore</h4>
            <div className="space-y-2">
              {[
                { to: "/", label: "Home" },
                { to: "/stay", label: "Hotels" },
                { to: "/vehicles", label: "Vehicles" },
                { to: "/attractions", label: "Attractions" },
                { to: "/search", label: "Search" },
              ].map((l) => (
                <Link key={l.to} to={l.to} className="block text-[11px] font-bold text-slate-400 hover:text-primary transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Support</h4>
            <div className="space-y-2">
              <Link to="/support" className="block text-[11px] font-bold text-slate-400 hover:text-primary transition-colors">
                Help Center
              </Link>
              {["Safety Info", "Privacy Policy", "Terms of Use", "Accessibility"].map((item) => (
                <p key={item} className="text-[11px] font-bold text-slate-400 hover:text-primary cursor-pointer transition-colors">{item}</p>
              ))}
            </div>
          </div>

          {/* Partners */}
          <div>
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Partners</h4>
            <div className="space-y-2">
              <Link to="/owner/login" className="block text-[11px] font-bold text-slate-400 hover:text-primary transition-colors">List Your Property</Link>
            {["Partner Program", "Asset Protection", "Revenue Tools", "Host Resources"].map((item) => (
              <p key={item} className="text-[11px] font-bold text-slate-400 hover:text-primary cursor-pointer transition-colors">{item}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">© 2026 WAYNEXX. All rights reserved.</p>
        <div className="flex items-center gap-4">
          {["Twitter", "Instagram", "LinkedIn"].map((s) => (
            <span key={s} className="text-[9px] font-bold text-slate-600 hover:text-primary cursor-pointer transition-colors uppercase tracking-widest">{s}</span>
          ))}
        </div>
      </div>
    </div>
  </footer>
  );
};

export default Footer;
