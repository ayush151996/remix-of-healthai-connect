import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, FileText, CalendarDays, User, Droplets, Ruler, Weight, Heart, AlertCircle, MessageCircle } from "lucide-react";
import { mockAppointments } from "@/lib/mockData";
import Disclaimer from "@/components/Disclaimer";
import { supabase } from "@/integrations/supabase/client";

export default function DashboardPage() {
  const [patient, setPatient] = useState<any>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;
      const { data: messageData } = await supabase.rpc("get_patient_messages");
      if (!active) return;
      setUnreadMessages((messageData ?? []).filter((message) => message.recipient_id === user.id && !message.read_at).length);
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!active) return;
      if (error) return;
      if (data) setPatient({ ...data, name: data.display_name, bloodGroup: data.blood_group });
    };
    void loadProfile();
    return () => { active = false; };
  }, []);

  const profile = patient || {
    name: "Guest User", age: "--", gender: "--", bloodGroup: "--",
    height: "--", weight: "--", existingDiseases: "None", allergies: "None",
  };

  const stats = [
    { icon: User, label: "Age", value: profile.age },
    { icon: Droplets, label: "Blood", value: profile.bloodGroup },
    { icon: Ruler, label: "Height", value: profile.height },
    { icon: Weight, label: "Weight", value: profile.weight },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Welcome, {profile.name}</h1>
          <p className="text-muted-foreground text-sm">Your personal health dashboard</p>
        </div>

        {!patient && (
          <div className="health-card flex items-center gap-3 border-primary/30 bg-primary/5">
            <AlertCircle className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm">You haven't registered yet. <Link to="/register" className="text-primary font-medium underline">Register now</Link> to unlock all features.</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="flex items-center gap-2 text-muted-foreground">
                <s.icon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">{s.label}</span>
              </div>
              <span className="text-xl font-display font-bold">{s.value || "--"}</span>
            </div>
          ))}
        </div>

        {/* Health Profile */}
        <div className="health-card">
          <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" /> Health Profile
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Existing Diseases:</span> <span className="ml-1 font-medium">{profile.existingDiseases || "None"}</span></div>
            <div><span className="text-muted-foreground">Allergies:</span> <span className="ml-1 font-medium">{profile.allergies || "None"}</span></div>
            <div><span className="text-muted-foreground">Past Surgeries:</span> <span className="ml-1 font-medium">{profile.pastSurgeries || "None"}</span></div>
            <div><span className="text-muted-foreground">Surgery Timeline:</span> <span className="ml-1 font-medium">{profile.surgeryTimeline || "N/A"}</span></div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/symptom-checker" className="health-card flex flex-col items-center text-center gap-3 hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Stethoscope className="h-6 w-6 text-primary" />
            </div>
            <span className="font-display font-semibold text-sm">AI Symptom Checker</span>
          </Link>
          <Link to="/report-analyzer" className="health-card flex flex-col items-center text-center gap-3 hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-accent" />
            </div>
            <span className="font-display font-semibold text-sm">Report Analyzer</span>
          </Link>
          <Link to="/appointments" className="health-card flex flex-col items-center text-center gap-3 hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <CalendarDays className="h-6 w-6 text-success" />
            </div>
            <span className="font-display font-semibold text-sm">Book Appointment</span>
          </Link>
          <Link to="/messages" className="health-card flex flex-col items-center text-center gap-3 hover:border-primary/30 transition-colors">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <MessageCircle className="h-6 w-6 text-primary" />
              {unreadMessages > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-semibold text-destructive-foreground" aria-label={`${unreadMessages} unread messages`}>{unreadMessages}</span>}
            </div>
            <span className="font-display font-semibold text-sm">Messages</span>
          </Link>
        </div>

        {/* Recent Appointments */}
        <div className="health-card">
          <h2 className="font-display font-semibold text-lg mb-4">Recent Appointments</h2>
          <div className="space-y-3">
            {mockAppointments.slice(0, 3).map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium text-sm">{a.doctorName}</p>
                  <p className="text-xs text-muted-foreground">{a.specialization} • {a.date} at {a.time}</p>
                </div>
                <Badge variant={a.status === "completed" ? "secondary" : a.status === "cancelled" ? "destructive" : "default"}>
                  {a.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <Disclaimer />
      </div>
    </DashboardLayout>
  );
}
