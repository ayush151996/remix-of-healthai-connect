import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Disclaimer from "@/components/Disclaimer";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      toast.error(error?.message ?? "Unable to sign in.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      user_id: data.user.id,
      display_name: typeof data.user.user_metadata.display_name === "string" ? data.user.user_metadata.display_name : null,
    });
    const { data: isAdmin, error: roleError } = await supabase.rpc("current_user_has_role", { _role: "admin" });
    setLoading(false);

    if (profileError) toast.error("Your profile could not be updated.");
    if (roleError || isAdmin !== true) {
      await supabase.auth.signOut();
      toast.error("This account does not have admin access.");
      return;
    }
    navigate("/admin", { replace: true });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <section className="w-full max-w-md space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to MedAI
        </Link>
        <div className="health-card space-y-6">
          <div className="space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Activity className="h-4 w-4 text-primary" /> MedAI secure access</div>
              <h1 className="mt-2 text-2xl font-display font-bold">Admin Login</h1>
              <p className="mt-1 text-sm text-muted-foreground">Sign in with an account that has been granted admin access.</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Email</Label>
              <Input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Password</Label>
              <Input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button className="w-full" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
          </form>
          <div className="border-t pt-4 text-sm text-muted-foreground">
            No admin credentials are configured by default. Admin access must be granted to an account by the project owner.
          </div>
          <Disclaimer />
        </div>
      </section>
    </main>
  );
}