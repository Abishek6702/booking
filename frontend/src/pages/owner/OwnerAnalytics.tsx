/* eslint-disable @typescript-eslint/no-explicit-any */
import OwnerLayout from "@/components/OwnerLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { MapPin, TrendingUp, Calendar, Users, Target, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const revenueData: any[] = [];
const sourceData: any[] = [];
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
const performanceData: any[] = [];

const OwnerAnalytics = () => {
  const handleExportCSV = () => {
    if (revenueData.length === 0) {
      toast.info("No analytics data available yet");
      return;
    }
    const headers = ["Month", "Revenue (INR)"];
    const data = revenueData.map(d => [d.month, d.revenue]);
    import("@/utils/exportUtils").then(utils => {
      utils.exportToCSV("analytics_revenue", headers, data);
      toast.success("CSV exported successfully!");
    });
  };

  const handleExportPDF = () => {
    if (revenueData.length === 0) {
      toast.info("No analytics data available yet");
      return;
    }
    const headers = ["Month", "Revenue (INR)"];
    const data = revenueData.map(d => [d.month, `INR ${d.revenue.toLocaleString()}`]);
    import("@/utils/exportUtils").then(utils => {
      utils.exportToPDF("analytics_revenue", "Property Revenue Insights", headers, data);
      toast.success("PDF exported successfully!");
    });
  };

  return (
    <OwnerLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Insights</h1>
          <p className="text-sm text-slate-500 mt-1">Deep dive into your property's performance and revenue trends.</p>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" /> Export Data
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportCSV}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>Export as PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => toast.info("Custom date range picker coming soon!")}
          ><Calendar className="h-4 w-4 mr-2" /> Custom Range</Button>
        </div>
      </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {[
        { label: "Avg. Occupancy", value: "-", change: "-", icon: Target },
        { label: "RevPAR", value: "-", change: "-", icon: TrendingUp },
        { label: "New Guests", value: "-", change: "-", icon: Users },
      ].map((stat) => (
        <div key={stat.label} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">{stat.label}</span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
              <stat.icon className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
            <span className="text-xs font-bold text-success">{stat.change}</span>
          </div>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Revenue Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-slate-900">Revenue Growth</h2>
          <Button variant="ghost" size="sm" className="text-xs h-7">Details</Button>
        </div>
        <div className="h-[300px] w-full min-w-0 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(v) => `₹${v/1000}k`} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Booking Sources (Donut) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="font-bold text-slate-900 mb-6">Traffic Channels</h2>
        <div className="flex flex-col md:flex-row items-center justify-around h-[300px] min-w-0 min-h-0">
          <div className="w-full h-full max-w-[250px] min-w-0 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} dataKey="value" stroke="none">
                  {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 min-w-[150px]">
            {sourceData.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-xs font-medium text-slate-600">{s.name}</span>
                </div>
                <span className="text-xs font-bold text-slate-900">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Occupancy Trend */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="font-bold text-slate-900 mb-6">Occupancy Rate Trend</h2>
        <div className="h-[250px] w-full min-w-0 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
              <Tooltip cursor={{fill: '#f8fafc'}} />
              <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                {performanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.rate > 90 ? '#10b981' : '#3b82f6'} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Regions (Modern List) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="font-bold text-slate-900 mb-6">Geographic Reach</h2>
        <div className="space-y-6">
          {[].map((r: any) => (
            <div key={r.region} className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-slate-700">{r.region}</span>
                <span className="font-bold text-slate-900">{r.pct}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${r.color} rounded-full`} style={{ width: `${r.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400 group cursor-pointer hover:text-primary transition-colors" onClick={() => toast.info("Interactive heatmap coming soon!")}>
          <MapPin className="h-3 w-3" />
          <span>View Detailed Heatmap</span>
        </div>
        </div>
      </div>
    </OwnerLayout>
  );
};

export default OwnerAnalytics;
