import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockPatients, mockDoctors, mockAppointments } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Stethoscope, CalendarDays, FileText, ShieldCheck, Download, RefreshCw, CircleAlert } from "lucide-react";

type ReportMetrics = {
  accounts_created: number;
  profiles_created: number;
  total_accounts: number;
  total_profiles: number;
};

const dateInputValue = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export default function AdminPage() {
  const [reportType, setReportType] = useState("overview");
  const [period, setPeriod] = useState("30");
  const [customStart, setCustomStart] = useState(() => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - 29);
    return dateInputValue(date);
  });
  const [customEnd, setCustomEnd] = useState(() => dateInputValue(new Date()));
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState(false);

  const dateWindow = useMemo(() => {
    if (period === "custom") {
      const start = new Date(`${customStart}T00:00:00.000Z`);
      const end = new Date(`${customEnd}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      return { start, end, valid: !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start < end };
    }
    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);
    end.setUTCDate(end.getUTCDate() + 1);
    const start = new Date(end);
    if (period === "all") start.setUTCFullYear(1970, 0, 1);
    else start.setUTCDate(start.getUTCDate() - Number(period));
    return { start, end, valid: true };
  }, [period, customStart, customEnd]);

  useEffect(() => {
    let active = true;
    if (!dateWindow.valid) {
      setMetricsError(true);
      setLoadingMetrics(false);
      return () => { active = false; };
    }
    setLoadingMetrics(true);
    setMetricsError(false);
    const loadReport = async () => {
      const { data, error } = await supabase.rpc("get_admin_report_metrics", {
        _from: dateWindow.start.toISOString(),
        _to: dateWindow.end.toISOString(),
      });
      if (!active) return;
      if (error || !data?.[0]) {
        setMetricsError(true);
        setMetrics(null);
      } else {
        setMetrics(data[0]);
      }
      setLoadingMetrics(false);
    };
    void loadReport();
    return () => { active = false; };
  }, [dateWindow]);

  const periodLabel = period === "all"
    ? "All time"
    : period === "custom"
      ? `${customStart} to ${customEnd}`
      : `Last ${period} days`;

  const reportRows = useMemo(() => {
    if (!metrics) return [];
    const accountRows = [
      ["Accounts created in period", metrics.accounts_created],
      ["Total accounts", metrics.total_accounts],
    ] as [string, number][];
    const profileRows = [
      ["Patient profiles created in period", metrics.profiles_created],
      ["Total patient profiles", metrics.total_profiles],
    ] as [string, number][];
    if (reportType === "accounts") return accountRows;
    if (reportType === "profiles") return profileRows;
    if (reportType === "appointments" || reportType === "medical-reports") return [];
    return [...accountRows, ...profileRows];
  }, [metrics, reportType]);

  const downloadReport = () => {
    if (!metrics || loadingMetrics || metricsError) return;
    const rows = [["Report", reportType], ["Timeline", periodLabel], ["Metric", "Count"], ...reportRows];
    if (reportType === "overview" || reportType === "appointments") rows.push(["Appointment activity", "Not currently saved"]);
    if (reportType === "overview" || reportType === "medical-reports") rows.push(["Uploaded medical reports", "Not currently saved"]);
    const csv = rows.map((row) => row.map((cell) => csvCell(cell)).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `medai-${reportType}-${dateInputValue(dateWindow.start)}-to-${dateInputValue(dateWindow.end)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded.");
  };

  const stats = [
    { icon: Users, label: "Total Patients", value: mockPatients.length, color: "text-primary" },
    { icon: Stethoscope, label: "Doctors", value: mockDoctors.length, color: "text-accent" },
    { icon: CalendarDays, label: "Appointments", value: mockAppointments.length, color: "text-success" },
    { icon: FileText, label: "Reports", value: "—", color: "text-warning" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Admin Panel
          </h1>
          <p className="text-muted-foreground text-sm">Manage patients, doctors, appointments, and project reports</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <span className="text-2xl font-display font-bold">{s.value}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        <Tabs defaultValue="patients">
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="doctors">Doctors</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="patients" className="mt-4">
            <div className="health-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Age</th><th className="pb-3 font-medium">Gender</th><th className="pb-3 font-medium">Blood</th><th className="pb-3 font-medium">Diseases</th><th className="pb-3 font-medium">Registered</th></tr></thead>
                <tbody className="divide-y">{mockPatients.map((p) => <tr key={p.id}><td className="py-3 font-medium">{p.name}</td><td className="py-3">{p.age}</td><td className="py-3">{p.gender}</td><td className="py-3"><Badge variant="outline">{p.bloodGroup}</Badge></td><td className="py-3 text-muted-foreground">{p.existingDiseases}</td><td className="py-3 text-muted-foreground">{p.registeredDate}</td></tr>)}</tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="doctors" className="mt-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockDoctors.map((d) => <div key={d.id} className="health-card"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{d.avatar}</div><div><p className="font-medium">{d.name}</p><p className="text-xs text-muted-foreground">{d.specialization}</p></div></div><div className="text-xs text-muted-foreground space-y-1"><p>Experience: {d.experience}</p><p>Rating: ⭐ {d.rating}</p><p>Slots: {d.availability.length} available</p></div></div>)}
            </div>
          </TabsContent>

          <TabsContent value="appointments" className="mt-4">
            <div className="health-card overflow-x-auto">
              <table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="pb-3 font-medium">Patient</th><th className="pb-3 font-medium">Doctor</th><th className="pb-3 font-medium">Date</th><th className="pb-3 font-medium">Time</th><th className="pb-3 font-medium">Status</th></tr></thead>
                <tbody className="divide-y">{mockAppointments.map((a) => <tr key={a.id}><td className="py-3 font-medium">{a.patientName}</td><td className="py-3">{a.doctorName}</td><td className="py-3">{a.date}</td><td className="py-3">{a.time}</td><td className="py-3"><Badge variant={a.status === "completed" ? "secondary" : a.status === "cancelled" ? "destructive" : "default"}>{a.status}</Badge></td></tr>)}</tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-4 space-y-5">
            <div className="health-card space-y-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="grid flex-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label htmlFor="report-type">Report type</Label><Select value={reportType} onValueChange={setReportType}><SelectTrigger id="report-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="overview">Project overview</SelectItem><SelectItem value="accounts">Accounts</SelectItem><SelectItem value="profiles">Patient profiles</SelectItem><SelectItem value="appointments">Appointments</SelectItem><SelectItem value="medical-reports">Medical reports</SelectItem></SelectContent></Select></div>
                  <div className="space-y-1.5"><Label htmlFor="report-period">Timeline</Label><Select value={period} onValueChange={setPeriod}><SelectTrigger id="report-period"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">Last 7 days</SelectItem><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem><SelectItem value="365">Last 12 months</SelectItem><SelectItem value="all">All time</SelectItem><SelectItem value="custom">Custom dates</SelectItem></SelectContent></Select></div>
                </div>
                <Button onClick={downloadReport} disabled={!metrics || loadingMetrics || metricsError} className="gap-2"><Download className="h-4 w-4" /> Download CSV</Button>
              </div>

              {period === "custom" && <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="date-from">From</Label><Input id="date-from" type="date" value={customStart} max={customEnd} onChange={(event) => setCustomStart(event.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="date-to">To</Label><Input id="date-to" type="date" value={customEnd} min={customStart} max={dateInputValue(new Date())} onChange={(event) => setCustomEnd(event.target.value)} /></div></div>}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-sm"><span className="font-medium">{reportType === "overview" ? "Project overview" : reportType === "medical-reports" ? "Medical reports" : reportType === "profiles" ? "Patient profiles" : reportType[0].toUpperCase() + reportType.slice(1)} report</span><span className="text-muted-foreground">{periodLabel}</span></div>

              {loadingMetrics ? <div role="status" className="flex items-center gap-2 py-5 text-sm text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin" /> Loading report…</div> : metricsError ? <div role="alert" className="flex items-start gap-2 py-4 text-sm text-destructive"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>{dateWindow.valid ? "This report could not be loaded. Please refresh and try again." : "Choose a valid date range to view this report."}</span></div> : (
                <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="pb-3 font-medium">Metric</th><th className="pb-3 text-right font-medium">Count</th></tr></thead><tbody className="divide-y">{reportRows.map(([label, count]) => <tr key={label}><td className="py-3">{label}</td><td className="py-3 text-right font-semibold tabular-nums">{count.toLocaleString()}</td></tr>)}{(reportType === "overview" || reportType === "appointments") && <tr><td className="py-3">Appointment activity</td><td className="py-3 text-right text-muted-foreground">Not currently saved</td></tr>}{(reportType === "overview" || reportType === "medical-reports") && <tr><td className="py-3">Uploaded medical reports</td><td className="py-3 text-right text-muted-foreground">Not currently saved</td></tr>}</tbody></table></div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Account and profile totals come from live records. Appointment and medical-report activity is not yet stored for reporting.</p>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}