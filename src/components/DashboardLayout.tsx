import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  UserPlus,
  LogIn,
  Stethoscope,
  FileText,
  CalendarDays,
  ShieldCheck,
  Menu,
  X,
  Activity,
  Home,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Register", url: "/register", icon: UserPlus },
  { title: "Patient Login", url: "/register?mode=signin", icon: LogIn },
  { title: "Symptom Checker", url: "/symptom-checker", icon: Stethoscope },
  { title: "Report Analyzer", url: "/report-analyzer", icon: FileText },
  { title: "Appointments", url: "/appointments", icon: CalendarDays },
  { title: "Messages", url: "/messages", icon: MessageCircle },
  { title: "Admin Login", url: "/admin-login", icon: ShieldCheck },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const location = useLocation();

  useEffect(() => {
    let active = true;
    let intervalId: number | undefined;
    const refreshUnread = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setUnreadMessages(0);
        return;
      }
      const { data } = await supabase.rpc("get_patient_messages");
      if (!active) return;
      setUnreadMessages((data ?? []).filter((message) => message.recipient_id === user.id && !message.read_at).length);
    };
    void refreshUnread();
    intervalId = window.setInterval(() => { void refreshUnread(); }, 15000);
    return () => {
      active = false;
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
          <Activity className="h-7 w-7 text-sidebar-primary" />
          <span className="text-lg font-display font-bold text-sidebar-foreground">MedAI</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3 mt-2">
          {navItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
              {item.url === "/messages" && unreadMessages > 0 && <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">{unreadMessages}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="medical-disclaimer text-xs text-sidebar-foreground/50 bg-sidebar-accent border-sidebar-border">
            This tool provides health insights only and is not a medical diagnosis.
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b bg-card/80 backdrop-blur-sm px-4 py-3 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <Activity className="h-5 w-5 text-primary" />
            <span className="font-display font-bold">MedAI</span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
