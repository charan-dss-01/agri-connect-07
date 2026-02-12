import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if admin already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const adminExists = existingUsers?.users?.some(u => u.email === "admin@agriconnect.com");

    if (adminExists) {
      return new Response(JSON.stringify({ message: "Admin already exists" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin user
    const { data, error } = await supabase.auth.admin.createUser({
      email: "admin@agriconnect.com",
      password: "admin123456",
      email_confirm: true,
      user_metadata: { name: "Admin", role: "admin" },
    });

    if (error) throw error;

    // Also ensure profile and role exist (trigger may not fire for admin.createUser)
    await supabase.from("profiles").upsert({
      user_id: data.user.id,
      name: "Admin",
      email: "admin@agriconnect.com",
    }, { onConflict: "user_id" });

    await supabase.from("user_roles").upsert({
      user_id: data.user.id,
      role: "admin",
    }, { onConflict: "user_id" });

    return new Response(JSON.stringify({ message: "Admin seeded successfully", userId: data.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
