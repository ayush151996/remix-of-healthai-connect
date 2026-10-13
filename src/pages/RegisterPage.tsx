import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Disclaimer from "@/components/Disclaimer";

type ProfileForm = {
  name: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  bloodGroup: string;
  pastSurgeries: string;
  surgeryTimeline: string;
  existingDiseases: string;
  allergies: string;
  phone: string;
};

const emptyForm: ProfileForm = {
  name: "", age: "", gender: "", height: "", weight: "", bloodGroup: "",
  pastSurgeries: "", surgeryTimeline: "", existingDiseases: "", allergies: "", phone: "",
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [accountEmail, setAccountEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"signup" | "signin">(() => new URLSearchParams(window.location.search).get("mode") === "signin" ? "signin" : "signup");
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [resetMode] = useState(() => window.location.pathname === "/reset-password" || new URLSearchParams(window.location.search).get("mode") === "reset");
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const hasRecoveryHash = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type") === "recovery";

  const update = (field: keyof ProfileForm, value: string) => setForm((previous) => ({ ...previous, [field]: value }));

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && event === "PASSWORD_RECOVERY" && session?.user) setRecoveryReady(true);
    });
    const loadAccount = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error) {
        toast.error("Your account could not be checked. Please try again.");
        setCheckingAccount(false);
        return;
      }
      const user = session?.user;
      if (resetMode && hasRecoveryHash && user) setRecoveryReady(true);
      setSignedInEmail(user?.email ?? null);
      if (user?.email) setAccountEmail(user.email);
      if (user) {
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("display_name, age, gender, height, weight, blood_group, past_surgeries, surgery_timeline, existing_diseases, allergies, phone")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!active) return;
        if (profileError) toast.error("Your saved health profile could not be loaded.");
        if (data) {
          setForm({
            name: data.display_name ?? "",
            age: data.age?.toString() ?? "",
            gender: data.gender ?? "",
            height: data.height ?? "",
            weight: data.weight ?? "",
            bloodGroup: data.blood_group ?? "",
            pastSurgeries: data.past_surgeries ?? "",
            surgeryTimeline: data.surgery_timeline ?? "",
            existingDiseases: data.existing_diseases ?? "",
            allergies: data.allergies ?? "",
            phone: data.phone ?? "",
          });
        } else if (typeof user.user_metadata.display_name === "string") {
          setForm((previous) => ({ ...previous, name: user.user_metadata.display_name }));
        }
      }
      setCheckingAccount(false);
    };
    void loadAccount();
    return () => { active = false; subscription.unsubscribe(); };
  }, [hasRecoveryHash, resetMode]);

  const handleAccountSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setConfirmationPending(false);
    const email = accountEmail.trim();
    if (authMode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: form.name.trim() },
          emailRedirectTo: `${window.location.origin}/register`,
        },
      });
      if (error) {
        toast.error(error.message);
      } else if (data.session && data.user) {
        setSignedInEmail(data.user.email ?? email);
        setPassword("");
        toast.success("Account created. Complete your health profile below.");
      } else {
        setConfirmationPending(true);
        setPassword("");
        toast.success("Check your email to confirm your account, then sign in here to save your health profile.");
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        toast.error(error?.message ?? "Unable to sign in.");
      } else {
        setSignedInEmail(data.user.email ?? email);
        setPassword("");
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("display_name, age, gender, height, weight, blood_group, past_surgeries, surgery_timeline, existing_diseases, allergies, phone")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (profileError) {
          toast.error("Signed in, but your saved health profile could not be loaded.");
        } else if (profile) {
          setForm({
            name: profile.display_name ?? "",
            age: profile.age?.toString() ?? "",
            gender: profile.gender ?? "",
            height: profile.height ?? "",
            weight: profile.weight ?? "",
            bloodGroup: profile.blood_group ?? "",
            pastSurgeries: profile.past_surgeries ?? "",
            surgeryTimeline: profile.surgery_timeline ?? "",
            existingDiseases: profile.existing_diseases ?? "",
            allergies: profile.allergies ?? "",
            phone: profile.phone ?? "",
          });
        }
        toast.success("Signed in. Complete or update your health profile below.");
      }
    }
    setLoading(false);
  };

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setSignedInEmail(null);
      toast.error("Please sign in before saving your health profile.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      display_name: form.name.trim(),
      age: Number(form.age),
      gender: form.gender || null,
      height: form.height.trim() || null,
      weight: form.weight.trim() || null,
      blood_group: form.bloodGroup || null,
      past_surgeries: form.pastSurgeries.trim() || null,
      surgery_timeline: form.surgeryTimeline.trim() || null,
      existing_diseases: form.existingDiseases.trim() || null,
      allergies: form.allergies.trim() || null,
      phone: form.phone.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (error) {
      toast.error("Your health profile could not be saved. Please try again.");
      setLoading(false);
      return;
    }
    toast.success("Your health profile has been saved.");
    navigate("/dashboard");
  };

  const requestPasswordReset = async () => {
    if (!accountEmail.trim()) {
      toast.error("Enter your account email first.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(accountEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else {
      setResetEmailSent(true);
      toast.success("Password reset instructions have been emailed to you.");
    }
    setLoading(false);
  };

  const handlePasswordReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error || !data.user) {
      toast.error(error?.message ?? "Your password could not be updated.");
      setLoading(false);
      return;
    }
    setPassword("");
    setRecoveryReady(false);
    setSignedInEmail(data.user.email ?? accountEmail.trim());
    navigate("/register?mode=signin", { replace: true });
    toast.success("Your password has been updated. Sign in with your email and new password.");
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">Patient Registration</h1>
          <p className="text-muted-foreground text-sm">Your health profile is saved securely to your account.</p>
        </div>

        {resetMode ? (
          <div className="health-card space-y-4">
            <div>
              <h2 className="font-display font-semibold text-lg">Set a new password</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {recoveryReady ? "Choose a new password for your account." : "Open the latest password-reset link from your email to continue."}
              </p>
            </div>
            {recoveryReady ? (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-1.5"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" /></div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Updating…" : "Update Password"}</Button>
              </form>
            ) : (
              <Button type="button" variant="outline" onClick={() => navigate("/register?mode=signin", { replace: true })}>Return to sign in</Button>
            )}
            <Disclaimer />
          </div>
        ) : checkingAccount ? (
          <div className="health-card text-sm text-muted-foreground" role="status">Checking your account…</div>
        ) : signedInEmail ? (
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="health-card flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>Signed in as <strong>{signedInEmail}</strong></span>
              <Button type="button" variant="outline" size="sm" onClick={async () => {
                const { error } = await supabase.auth.signOut();
                if (error) toast.error("Unable to sign out.");
                else { setSignedInEmail(null); setForm(emptyForm); }
              }}>Sign out</Button>
            </div>

            <div className="health-card space-y-4">
              <h2 className="font-display font-semibold text-lg">Personal Information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label htmlFor="name">Full Name *</Label><Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required /></div>
                <div className="space-y-1.5"><Label htmlFor="age">Age *</Label><Input id="age" type="number" min="0" max="130" value={form.age} onChange={(e) => update("age", e.target.value)} required /></div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={(value) => update("gender", value)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Blood Group</Label>
                  <Select value={form.bloodGroup} onValueChange={(value) => update("bloodGroup", value)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => <SelectItem key={group} value={group}>{group}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label htmlFor="height">Height</Label><Input id="height" value={form.height} onChange={(e) => update("height", e.target.value)} placeholder="e.g., 170 cm" /></div>
                <div className="space-y-1.5"><Label htmlFor="weight">Weight</Label><Input id="weight" value={form.weight} onChange={(e) => update("weight", e.target.value)} placeholder="e.g., 75 kg" /></div>
              </div>
            </div>

            <div className="health-card space-y-4">
              <h2 className="font-display font-semibold text-lg">Medical History</h2>
              <div className="space-y-4">
                <div className="space-y-1.5"><Label htmlFor="pastSurgeries">Past Surgeries</Label><Input id="pastSurgeries" value={form.pastSurgeries} onChange={(e) => update("pastSurgeries", e.target.value)} placeholder="e.g., Appendectomy" /></div>
                <div className="space-y-1.5"><Label htmlFor="surgeryTimeline">Surgery Timeline</Label><Input id="surgeryTimeline" value={form.surgeryTimeline} onChange={(e) => update("surgeryTimeline", e.target.value)} placeholder="e.g., 2019" /></div>
                <div className="space-y-1.5"><Label htmlFor="diseases">Existing Diseases</Label><Textarea id="diseases" value={form.existingDiseases} onChange={(e) => update("existingDiseases", e.target.value)} placeholder="e.g., Diabetes, Hypertension" /></div>
                <div className="space-y-1.5"><Label htmlFor="allergies">Allergies</Label><Input id="allergies" value={form.allergies} onChange={(e) => update("allergies", e.target.value)} placeholder="e.g., Penicillin, Pollen" /></div>
              </div>
            </div>

            <div className="health-card space-y-4">
              <h2 className="font-display font-semibold text-lg">Contact Details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label htmlFor="phone">Phone</Label><Input id="phone" type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Phone number" /></div>
                <div className="space-y-1.5"><Label htmlFor="account-email">Account Email</Label><Input id="account-email" type="email" value={signedInEmail} readOnly /></div>
              </div>
            </div>

            <Disclaimer />
            <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Saving…" : "Save Health Profile"}</Button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="health-card space-y-4">
              <div>
                <h2 className="font-display font-semibold text-lg">{resetMode ? "Set a new password" : confirmationPending ? "Confirm your email" : authMode === "signup" ? "Create your account" : "Sign in to your account"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {resetMode ? "Choose a new password for your account." : confirmationPending ? "Use the link we emailed you, then sign in here to complete and save your health profile." : "An account keeps your health profile private and available on your dashboard."}
                </p>
              </div>
              {confirmationPending ? (
                <Button type="button" variant="outline" onClick={() => { setAuthMode("signin"); setConfirmationPending(false); }}>I confirmed my email — sign in</Button>
              ) : (
                <form onSubmit={handleAccountSubmit} className="space-y-4">
                  {authMode === "signup" && <div className="space-y-1.5"><Label htmlFor="name">Full Name</Label><Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required autoComplete="name" /></div>}
                  <div className="space-y-1.5"><Label htmlFor="accountEmail">Email</Label><Input id="accountEmail" type="email" value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} required autoComplete="email" /></div>
                  <div className="space-y-1.5"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={authMode === "signup" ? "new-password" : "current-password"} /></div>
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? "Please wait…" : authMode === "signup" ? "Create Account" : "Sign In"}</Button>
                </form>
              )}
              {!confirmationPending && authMode === "signin" && <>
                <Button type="button" variant="link" className="h-auto p-0" onClick={() => void requestPasswordReset()} disabled={loading}>Forgot password?</Button>
                {resetEmailSent && <p className="text-sm text-muted-foreground" role="status">Check your inbox for a password-reset link. Open that link before choosing a new password.</p>}
              </>}
              {!confirmationPending && <p className="text-sm text-muted-foreground">
                {authMode === "signup" ? "Already have an account?" : "New to MedAI?"}{" "}
                <Button type="button" variant="link" className="h-auto p-0" onClick={() => setAuthMode(authMode === "signup" ? "signin" : "signup")}>
                  {authMode === "signup" ? "Sign in" : "Create an account"}
                </Button>
              </p>}
            </div>
            <Disclaimer />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}