import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type AccessState = "checking" | "allowed" | "denied";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const [access, setAccess] = useState<AccessState>("checking");

  useEffect(() => {
    let active = true;
    const verify = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !user) {
        setAccess("denied");
        return;
      }
      const { data, error: roleError } = await supabase.rpc("current_user_has_role", { _role: "admin" });
      if (active) setAccess(!roleError && data === true ? "allowed" : "denied");
    };
    void verify();
    return () => { active = false; };
  }, []);

  if (access === "checking") {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Checking admin access…</div>;
  }
  if (access === "denied") return <Navigate to="/admin-login" replace />;
  return <>{children}</>;
}