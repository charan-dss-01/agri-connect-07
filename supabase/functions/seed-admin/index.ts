import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-seed-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const seedSecret = Deno.env.get("SEED_ADMIN_SECRET");
    const adminPassword = Deno.env.get("SEED_ADMIN_PASSWORD");
    const requestSecret = req.headers.get("x-seed-secret");

    if (!seedSecret || !adminPassword || requestSecret !== seedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const adminExists = existingUsers?.users?.some((user) => user.email === "admin@agriconnect.com");

    if (adminExists) {
      return new Response(JSON.stringify({ message: "Admin already exists" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: "admin@agriconnect.com",
      password: adminPassword,
      email_confirm: true,
      user_metadata: { name: "Admin", role: "admin" },
    });
    if (error) throw error;

    await supabase.from("profiles").upsert({
      user_id: data.user.id,
      name: "Admin",
      email: "admin@agriconnect.com",
    }, { onConflict: "user_id" });

    await supabase.from("user_roles").delete().eq("user_id", data.user.id);
    await supabase.from("user_roles").insert({
      user_id: data.user.id,
      role: "admin",
    });

    return new Response(JSON.stringify({ message: "Admin seeded successfully", userId: data.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
