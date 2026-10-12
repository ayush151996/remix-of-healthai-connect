import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, AlertTriangle, CheckCircle, Activity, RefreshCw, ShieldAlert } from "lucide-react";
import Disclaimer from "@/components/Disclaimer";
import { supabase } from "@/integrations/supabase/client";
import { extractReport, ExtractionError, ACCEPTED_EXTENSIONS, type ExtractedReport } from "@/lib/reportExtraction";

interface KeyFinding {
  title: string;
  value: string | null;
  explanation: string;
  sourcePage: number | null;
}

interface ExtractedValue {
  testName: string;
  value: string;
  unit: string | null;
  referenceRange: string | null;
  reportedFlag: string;
  sourcePage: number | null;
}

interface Analysis {
  reportType: string | null;
  summary: string;
  keyFindings: KeyFinding[];
  extractedValues: ExtractedValue[];
  questionsForClinician: string[];
  limitations: string[];
  disclaimer: string;
}

interface AnalysisMeta {
  pagesProcessed: number;
  truncated: boolean;
}

type Phase = "idle" | "extracting" | "analyzing";

export default function ReportAnalyzerPage() {
  const [reportType, setReportType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [meta, setMeta] = useState<AnalysisMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);

  const busy = phase !== "idle";

  const flagIcon = (flag: string) =>
    flag === "normal" ? <CheckCircle className="h-4 w-4 text-success" /> :
    flag === "high" || flag === "low" ? <AlertTriangle className="h-4 w-4 text-destructive" /> :
    <AlertTriangle className="h-4 w-4 text-warning" />;

  const flagBadge = (flag: string) =>
    flag === "normal" ? "bg-success/10 text-success" :
    flag === "high" || flag === "low" ? "bg-destructive/10 text-destructive" :
    "bg-warning/10 text-warning";

  const handleAnalyze = async () => {
    if (!file || busy) return;
    setError(null);
    setAnalysis(null);
    setMeta(null);
    setRetryable(false);

    let extracted: ExtractedReport;
    setPhase("extracting");
    try {
      extracted = await extractReport(file);
    } catch (e) {
      setPhase("idle");
      setError(e instanceof ExtractionError ? e.message : "This file could not be read. Please try a different file.");
      return;
    }

    setPhase("analyzing");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("analyze-report", {
        body: {
          fileName: extracted.fileName,
          fileType: extracted.fileType,
          reportTypeHint: reportType || null,
          pages: extracted.pages,
          images: extracted.images,
          truncated: extracted.truncated,
        },
      });

      if (fnError) {
        let message = "The analysis could not be completed. Please try again.";
        let canRetry = true;
        try {
          const body = typeof fnError === "object" && "context" in fnError
            ? await (fnError as { context: Response }).context.json()
            : null;
          if (body?.error?.message) message = body.error.message;
          if (body?.error?.code === "missing_configuration") canRetry = false;
          if (body?.error?.code === "authentication_required") canRetry = false;
        } catch {
          // keep default message
        }
        setError(message);
        setRetryable(canRetry);
        setPhase("idle");
        return;
      }

      if (!data?.success || !data.analysis) {
        setError(data?.error?.message ?? "The analysis could not be interpreted. Please try again.");
        setRetryable(true);
        setPhase("idle");
        return;
      }

      setAnalysis(data.analysis as Analysis);
      setMeta(data.meta as AnalysisMeta);
      setPhase("idle");
    } catch {
      setError("A network error occurred. Check your connection and try again.");
      setRetryable(true);
      setPhase("idle");
    }
  };

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
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
            <p>
              The contents of the report you select will be sent to our AI provider for processing.
              Consider removing personal identifiers (name, address, ID numbers) before uploading.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Report Type (optional)</Label>
            <Select value={reportType} onValueChange={setReportType} disabled={busy}>
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
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => !busy && document.getElementById("file-input")?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {file ? file.name : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, WebP, DOCX, TXT, CSV up to 10MB</p>
              <input
                id="file-input"
                type="file"
                className="hidden"
                accept={ACCEPTED_EXTENSIONS}
                onChange={(e) => { setFile(e.target.files?.[0] || null); setError(null); setAnalysis(null); }}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <Button onClick={handleAnalyze} size="lg" className="w-full gap-2" disabled={busy || !file}>
            {busy ? <Activity className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {phase === "extracting" ? "Reading Document..." : phase === "analyzing" ? "Analyzing Report..." : "Analyze Report"}
          </Button>

          {error && retryable && !busy && (
            <Button onClick={handleAnalyze} variant="outline" size="sm" className="w-full gap-2">
              <RefreshCw className="h-4 w-4" /> Retry Analysis
            </Button>
          )}
        </div>

        {analysis && (
          <div className="space-y-4 animate-fade-in">
            {meta?.truncated && (
              <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-sm text-warning">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>Only the first {meta.pagesProcessed} page(s) of this report could be processed. Split the document to analyze the rest.</p>
              </div>
            )}

            <div className="health-card">
              <h2 className="font-display font-semibold text-lg mb-1">{analysis.reportType ?? "Medical Report"}</h2>
              <p className="text-sm text-muted-foreground mb-4">{analysis.summary}</p>

              {analysis.keyFindings.length > 0 && (
                <div className="space-y-3">
                  {analysis.keyFindings.map((f, i) => (
                    <div key={`${f.title}-${i}`} className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{f.title}</span>
                        {f.sourcePage && <Badge variant="outline">Page {f.sourcePage}</Badge>}
                      </div>
                      {f.value && <p className="text-xs text-muted-foreground">Value: <strong className="text-foreground">{f.value}</strong></p>}
                      {f.explanation && <p className="text-xs text-muted-foreground mt-1.5">{f.explanation}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {analysis.extractedValues.length > 0 && (
              <div className="health-card">
                <h3 className="font-display font-semibold mb-3">Test Results</h3>
                <div className="space-y-3">
                  {analysis.extractedValues.map((v, i) => (
                    <div key={`${v.testName}-${i}`} className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {flagIcon(v.reportedFlag)}
                          <span className="font-medium text-sm">{v.testName}</span>
                        </div>
                        <Badge className={flagBadge(v.reportedFlag)}>{v.reportedFlag}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Value: <strong className="text-foreground">{v.value}{v.unit ? ` ${v.unit}` : ""}</strong></span>
                        {v.referenceRange && <span>Range: {v.referenceRange}</span>}
                      </div>
                      {v.sourcePage && <p className="text-xs text-muted-foreground mt-1">Page {v.sourcePage}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.questionsForClinician.length > 0 && (
              <div className="health-card">
                <h3 className="font-display font-semibold mb-2">Questions to Ask Your Doctor</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {analysis.questionsForClinician.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </div>
            )}

            {analysis.limitations.length > 0 && (
              <div className="health-card">
                <h3 className="font-display font-semibold mb-2">Limitations</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {analysis.limitations.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">{analysis.disclaimer}</p>
            <Disclaimer />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
