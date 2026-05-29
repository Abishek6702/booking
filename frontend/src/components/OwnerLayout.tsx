import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { 
  Building2, LayoutDashboard, BarChart3, CalendarCheck, 
  Home, BedDouble, Star, LogOut, Menu, X, 
  Search, Bell, Settings, User, ChevronDown, CheckCheck,
  AlertCircle, BookOpen, MessageSquare
} from "lucide-react";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/owner/dashboard" },
  { icon: BarChart3, label: "Analytics", path: "/owner/analytics" },
  { icon: CalendarCheck, label: "Bookings", path: "/owner/bookings" },
  { icon: Home, label: "Properties", path: "/owner/properties" },
  { icon: BedDouble, label: "Rooms", path: "/owner/rooms" },
  { icon: Star, label: "Reviews", path: "/owner/reviews" },
];

const NOTIFICATIONS = [
  { id: 1, icon: BookOpen, color: "text-primary bg-primary/10", title: "New booking received", desc: "Sarah Johnson booked Villa 104 for Apr 15–18", time: "2 min ago", read: false },
  { id: 2, icon: MessageSquare, color: "text-accent bg-accent/10", title: "New guest review", desc: "Michael Chen left a 5-star review on Deluxe Suite", time: "1 hour ago", read: false },
  { id: 3, icon: AlertCircle, color: "text-destructive bg-destructive/10", title: "Pending approval", desc: "BK-002 from Michael Chen is awaiting confirmation", time: "3 hours ago", read: true },
];

const OwnerLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  const userStr = localStorage.getItem("tm_user");
  const user = userStr ? JSON.parse(userStr) : null;

  if (!user) return <Navigate to="/owner/login" replace />;
  if (user.role !== "OWNER") return <Navigate to="/" replace />;
  if (user.ownerStatus !== "APPROVED") return <Navigate to="/owner/pending" replace />;

  const userName = user?.name || "User";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const userRoleLabel = user?.role === "ADMIN" ? "Administrator" : "Property Owner";

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const handleNotifClick = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleSignOut = () => {
    localStorage.removeItem("tm_accessToken");
    localStorage.removeItem("tm_refreshToken");
    localStorage.removeItem("tm_user");
    toast.success("Signed out successfully");
    navigate("/owner/login");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 hidden lg:flex flex-col flex-shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">WAYNEXX Portal</span>
        </div>
        
        <div className="px-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-3 flex items-center gap-3 border border-slate-700/50">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{userName}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{userRoleLabel}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 lg:px-8 shrink-0 relative z-30">
          <div className="flex items-center gap-4 lg:hidden">
            <button 
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 text-slate-600"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="font-bold text-primary">WAYNEXX Owner</span>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 w-64 lg:w-96">
            <Search className="h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search bookings, guests..." 
              className="bg-transparent border-0 text-sm focus:ring-0 placeholder:text-slate-400 w-full outline-none"
            />
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            {/* Notification Bell */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative text-slate-600"
                onClick={() => setNotifOpen(!notifOpen)}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border-2 border-white" />
                )}
              </Button>

              {/* Notification Panel */}
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="text-[10px] font-bold bg-destructive text-white px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                        )}
                      </div>
                      <button onClick={handleMarkAllRead} className="text-xs text-primary font-bold flex items-center gap-1 hover:text-primary/80">
                        <CheckCheck className="h-3 w-3" /> Mark all read
                      </button>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {notifications.map(n => (
                        <button
                          key={n.id}
                          onClick={() => handleNotifClick(n.id)}
                          className={`w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50 transition-colors ${!n.read ? "bg-primary/[0.02]" : ""}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${n.color}`}>
                            <n.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${!n.read ? "text-slate-900" : "text-slate-600"}`}>{n.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.desc}</p>
                            <p className="text-[10px] text-slate-400 mt-1 font-medium">{n.time}</p>
                          </div>
                          {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                        </button>
                      ))}
                    </div>
                    <div className="p-3 border-t border-slate-100">
                      <button
                        onClick={() => { setNotifOpen(false); navigate("/owner/bookings"); }}
                        className="w-full text-xs text-center text-primary font-bold hover:text-primary/80 py-1 transition-colors"
                      >
                        View all activity →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex text-slate-600"
              onClick={() => { toast.info("Settings coming soon!"); }}
            >
              <Settings className="h-5 w-5" />
            </Button>
            
            <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-2 hover:opacity-80 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold text-slate-900 leading-none">{userName}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{userRoleLabel}</p>
                  </div>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast.info("Profile page coming soon!")}>
                  <User className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info("Settings page coming soon!")}>
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 bg-slate-900 text-slate-300 flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold text-white">Owner Portal</span>
              </div>
              <button onClick={() => setMobileOpen(false)}>
                <X className="h-6 w-6 text-slate-400" />
              </button>
            </div>
            
            <nav className="flex-1 px-4 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-6 border-t border-slate-800">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-2 text-slate-400 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerLayout;
