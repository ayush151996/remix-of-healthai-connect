import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Brain, AlertTriangle, Stethoscope, Activity } from "lucide-react";
import Disclaimer from "@/components/Disclaimer";
import { supabase } from "@/integrations/supabase/client";

const mockAnalysis = {
  conditions: [
    { name: "Common Cold / Upper Respiratory Infection", probability: "High", risk: "Low" },
    { name: "Seasonal Allergies", probability: "Medium", risk: "Low" },
    { name: "Viral Bronchitis", probability: "Low", risk: "Medium" },
  ],
  specialist: "General Physician or ENT Specialist",
  riskLevel: "Low",
};

export default function SymptomCheckerPage() {
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("");
  const [painLevel, setPainLevel] = useState([3]);
  const [medicalHistory, setMedicalHistory] = useState("");
  const [result, setResult] = useState<typeof mockAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const loadMedicalHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;
      const { data } = await supabase.from("profiles").select("existing_diseases, allergies").eq("user_id", user.id).maybeSingle();
      if (active && data) setMedicalHistory([data.existing_diseases, data.allergies].filter(Boolean).join(", ") || "None reported");
    };
    void loadMedicalHistory();
    return () => { active = false; };
  }, []);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setResult(mockAnalysis);
      setLoading(false);
    }, 1500);
  };

  const riskColor = (r: string) => r === "Low" ? "bg-success/10 text-success" : r === "Medium" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive";

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> AI Symptom Checker
          </h1>
          <p className="text-muted-foreground text-sm">Describe your symptoms to get preliminary AI-powered insights</p>
        </div>

        <Disclaimer />

        <form onSubmit={handleAnalyze} className="space-y-6">
          <div className="health-card space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="symptoms">Symptoms *</Label>
              <Textarea id="symptoms" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="Describe your symptoms in detail... e.g., headache, sore throat, mild fever" rows={4} required />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger><SelectValue placeholder="How long?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<24h">Less than 24 hours</SelectItem>
                    <SelectItem value="1-3d">1-3 days</SelectItem>
                    <SelectItem value="3-7d">3-7 days</SelectItem>
                    <SelectItem value="1-2w">1-2 weeks</SelectItem>
                    <SelectItem value=">2w">More than 2 weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Pain Level: {painLevel[0]}/10</Label>
                <Slider value={painLevel} onValueChange={setPainLevel} min={0} max={10} step={1} className="mt-3" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Medical History (auto-filled)</Label>
              <Input value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} placeholder="None reported" />
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full gap-2" disabled={loading || !symptoms}>
            {loading ? <Activity className="h-4 w-4 animate-spin" /> : <Stethoscope className="h-4 w-4" />}
            {loading ? "Analyzing..." : "Analyze Symptoms"}
          </Button>
        </form>

        {result && (
          <div className="space-y-4 animate-fade-in">
            <div className="health-card">
              <h2 className="font-display font-semibold text-lg mb-4">Analysis Results</h2>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground">Overall Risk Level:</span>
                <Badge className={riskColor(result.riskLevel)}>{result.riskLevel}</Badge>
              </div>

              <h3 className="font-medium text-sm mb-3">Possible Conditions</h3>
              <div className="space-y-3">
                {result.conditions.map((c) => (
                  <div key={c.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">Probability: {c.probability}</p>
                    </div>
                    <Badge variant="outline" className={riskColor(c.risk)}>Risk: {c.risk}</Badge>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm"><strong>Suggested Specialist:</strong> {result.specialist}</p>
              </div>
            </div>

            <Disclaimer />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
