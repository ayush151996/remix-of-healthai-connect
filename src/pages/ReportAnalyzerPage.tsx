import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, AlertTriangle, CheckCircle, Activity } from "lucide-react";
import Disclaimer from "@/components/Disclaimer";

const mockReport = {
  type: "Blood Test - Complete Blood Count (CBC)",
  summary: "Overall results indicate a generally healthy profile with a few values slightly outside normal ranges that should be monitored.",
  findings: [
    { name: "Hemoglobin", value: "14.2 g/dL", status: "normal", range: "13.5-17.5 g/dL" },
    { name: "WBC Count", value: "11,200 /µL", status: "high", range: "4,500-11,000 /µL", note: "Slightly elevated. Could indicate minor infection or inflammation." },
    { name: "Platelet Count", value: "250,000 /µL", status: "normal", range: "150,000-400,000 /µL" },
    { name: "RBC Count", value: "5.1 M/µL", status: "normal", range: "4.7-6.1 M/µL" },
    { name: "Blood Glucose (Fasting)", value: "110 mg/dL", status: "borderline", range: "70-100 mg/dL", note: "Borderline high. Recommend monitoring and dietary adjustments." },
    { name: "Cholesterol (Total)", value: "195 mg/dL", status: "normal", range: "<200 mg/dL" },
  ],
  explanation: "Your white blood cell count is slightly elevated which may indicate your body is fighting a mild infection. Your fasting glucose is borderline high — this doesn't mean diabetes, but it's a good idea to reduce sugar intake and recheck in 3 months.",
};

export default function ReportAnalyzerPage() {
  const [reportType, setReportType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<typeof mockReport | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = () => {
    if (!file && !reportType) return;
    setLoading(true);
    setTimeout(() => {
      setResult(mockReport);
      setLoading(false);
    }, 2000);
  };

  const statusIcon = (s: string) =>
    s === "normal" ? <CheckCircle className="h-4 w-4 text-success" /> :
    s === "high" || s === "low" ? <AlertTriangle className="h-4 w-4 text-destructive" /> :
    <AlertTriangle className="h-4 w-4 text-warning" />;

  const statusBadge = (s: string) =>
    s === "normal" ? "bg-success/10 text-success" :
    s === "high" || s === "low" ? "bg-destructive/10 text-destructive" :
    "bg-warning/10 text-warning";

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Medical Report Analyzer
          </h1>
          <p className="text-muted-foreground text-sm">Upload your medical reports for AI-powered analysis</p>
        </div>

        <Disclaimer />

        <div className="health-card space-y-4">
          <div className="space-y-1.5">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger><SelectValue placeholder="Select report type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="blood">Blood Test</SelectItem>
                <SelectItem value="mri">MRI</SelectItem>
                <SelectItem value="ct">CT Scan</SelectItem>
                <SelectItem value="xray">X-Ray</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Upload Report</Label>
            <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer" onClick={() => document.getElementById("file-input")?.click()}>
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {file ? file.name : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG up to 10MB</p>
              <input id="file-input" type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>

          <Button onClick={handleAnalyze} size="lg" className="w-full gap-2" disabled={loading || (!file && !reportType)}>
            {loading ? <Activity className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {loading ? "Analyzing Report..." : "Analyze Report"}
          </Button>
        </div>

        {result && (
          <div className="space-y-4 animate-fade-in">
            <div className="health-card">
              <h2 className="font-display font-semibold text-lg mb-1">{result.type}</h2>
              <p className="text-sm text-muted-foreground mb-4">{result.summary}</p>

              <div className="space-y-3">
                {result.findings.map((f) => (
                  <div key={f.name} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {statusIcon(f.status)}
                        <span className="font-medium text-sm">{f.name}</span>
                      </div>
                      <Badge className={statusBadge(f.status)}>{f.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Value: <strong className="text-foreground">{f.value}</strong></span>
                      <span>Normal: {f.range}</span>
                    </div>
                    {f.note && <p className="text-xs text-warning mt-1.5">{f.note}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="health-card">
              <h3 className="font-display font-semibold mb-2">Simple Explanation</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.explanation}</p>
            </div>

            <Disclaimer />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
