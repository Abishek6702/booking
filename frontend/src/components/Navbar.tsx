import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, User, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useAuth();

  const publicLinks = [
    { to: "/", label: "Explore" },
  ];

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate("/");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/search?destination=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery("");
  };

  return (
    <nav className="bg-white/85 backdrop-blur-2xl sticky top-0 z-[100] border-b border-slate-100/80 shadow-[0_1px_24px_0_rgba(0,0,0,0.06)]">
      <div className="container mx-auto px-6 flex items-center h-20">
        {/* Left section - Logo */}
        <div className="flex-1">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="WAYNEXX Logo" className="h-7 md:h-9 w-auto object-contain drop-shadow-sm hover:drop-shadow-md hover:scale-105 transition-all duration-300" />
          </Link>
        </div>

        {/* Center section - Nav links + Search bar */}
        <div className="hidden md:flex items-center justify-center gap-6 flex-shrink-0">
          {publicLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`relative text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:text-primary pb-1 whitespace-nowrap ${
                location.pathname === l.to
                  ? "text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-primary after:rounded-full"
                  : "text-slate-400"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {isLoggedIn && (
            <>
              <Link
                to="/dashboard"
                className={`relative text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:text-primary pb-1 ${
                  location.pathname === "/dashboard"
                    ? "text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-primary after:rounded-full"
                    : "text-slate-400"
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/support"
                className={`relative text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:text-primary pb-1 ${
                  location.pathname === "/support"
                    ? "text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-primary after:rounded-full"
                    : "text-slate-400"
                }`}
              >
                Support
              </Link>
            </>
          )}

          {/* Global search bar */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-3 h-8 w-44 rounded-xl bg-gray-50 border-gray-200 text-xs focus:w-56 transition-all duration-300"
            />
          </form>
        </div>

        {/* Right section - Desktop auth buttons */}
        <div className="hidden md:flex flex-1 items-center justify-end gap-6">
          {isLoggedIn ? (
            <>
              <Link to="/owner/login">
                <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 rounded-2xl px-6 h-10 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200">
                  List Your Property
                </Button>
              </Link>
              
              <div className="h-8 w-[1px] bg-slate-100 mx-2" />

              <div className="flex items-center gap-4">
                <Link to="/dashboard" className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-110 transition-transform">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none mb-1">
                      {user?.name?.split(" ")[0]}
                    </span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
                      Traveler
                    </span>
                  </div>
                </Link>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="rounded-2xl hover:bg-destructive/5 hover:text-destructive text-slate-400"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors">
                Sign In
              </Link>
              <Link to="/signup">
                <Button className="bg-primary text-white hover:bg-primary/90 rounded-2xl px-8 h-10 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20">
                  Register
                </Button>
              </Link>
              <Link to="/owner/login">
                <Button variant="outline" className="rounded-2xl border-2 border-slate-100 px-6 h-10 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50">
                  List Your Property
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-2 rounded-2xl bg-slate-50 text-slate-900 ml-auto" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-slate-50 p-6 space-y-4 animate-in slide-in-from-top-4 duration-300">
          {publicLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="block text-xs font-black uppercase tracking-widest text-slate-900 py-3"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {isLoggedIn && (
            <>
              <Link
                to="/dashboard"
                className="block text-xs font-black uppercase tracking-widest text-slate-900 py-3"
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/support"
                className="block text-xs font-black uppercase tracking-widest text-slate-900 py-3"
                onClick={() => setMobileOpen(false)}
              >
                Support
              </Link>
            </>
          )}
          <div className="grid grid-cols-2 gap-4 pt-4">
            {isLoggedIn ? (
              <Button
                variant="outline"
                className="w-full rounded-2xl border-2 border-slate-100 text-destructive font-black text-[10px] uppercase tracking-widest"
                onClick={handleLogout}
              >
                Sign Out
              </Button>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full rounded-2xl border-2 border-slate-100 font-black text-[10px] uppercase tracking-widest">Sign In</Button>
                </Link>
                <Link to="/signup" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full rounded-2xl font-black text-[10px] uppercase tracking-widest">Register</Button>
                </Link>
              </>
            )}
          </div>
          <Link to="/owner/login" onClick={() => setMobileOpen(false)}>
            <Button className="w-full bg-slate-900 text-white rounded-2xl h-12 font-black text-[10px] uppercase tracking-widest">
              List Your Property
            </Button>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
