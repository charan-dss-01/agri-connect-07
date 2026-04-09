import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-seed-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const seedSecret = Deno.env.get("SEED_TEST_DATA_SECRET");
    const testPassword = Deno.env.get("SEED_TEST_ACCOUNT_PASSWORD");
    const adminPassword = Deno.env.get("SEED_ADMIN_PASSWORD");
    const requestSecret = req.headers.get("x-seed-secret");

    if (!seedSecret || !testPassword || !adminPassword || requestSecret !== seedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const results: string[] = [];

    const ensureSingleRole = async (userId: string, role: "farmer" | "industry" | "admin") => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw new Error(`Failed to set ${role} role: ${error.message}`);
    };

    let farmerId: string;
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingFarmer = existingUsers?.users?.find((user) => user.email === "farmer@test.com");

    if (existingFarmer) {
      farmerId = existingFarmer.id;
      results.push("Farmer user already exists: " + farmerId);
    } else {
      const { data: farmerAuth, error: farmerErr } = await supabase.auth.admin.createUser({
        email: "farmer@test.com",
        password: testPassword,
        email_confirm: true,
        user_metadata: { name: "Test Farmer", role: "farmer" },
      });
      if (farmerErr) throw new Error("Farmer creation failed: " + farmerErr.message);
      farmerId = farmerAuth.user.id;
      results.push("Farmer user created: " + farmerId);
    }

    await supabase.from("profiles").upsert({
      user_id: farmerId,
      name: "Test Farmer",
      email: "farmer@test.com",
      phone: "9876543210",
      village: "Ludhiana",
      land_size: 5,
      lat: 30.9,
      lng: 75.8573,
      address: "Ludhiana, Punjab",
      approved: true,
    }, { onConflict: "user_id" });
    await ensureSingleRole(farmerId, "farmer");
    results.push("Farmer profile and role updated");

    let industryId: string;
    const existingIndustry = existingUsers?.users?.find((user) => user.email === "industry@test.com");

    if (existingIndustry) {
      industryId = existingIndustry.id;
      results.push("Industry user already exists: " + industryId);
    } else {
      const { data: industryAuth, error: industryErr } = await supabase.auth.admin.createUser({
        email: "industry@test.com",
        password: testPassword,
        email_confirm: true,
        user_metadata: { name: "Test Industry", role: "industry" },
      });
      if (industryErr) throw new Error("Industry creation failed: " + industryErr.message);
      industryId = industryAuth.user.id;
      results.push("Industry user created: " + industryId);
    }

    await supabase.from("profiles").upsert({
      user_id: industryId,
      name: "Test Industry",
      email: "industry@test.com",
      phone: "9876543211",
      lat: 30.91,
      lng: 75.87,
      address: "Punjab BioEnergy Ltd, Punjab",
      approved: true,
    }, { onConflict: "user_id" });
    await ensureSingleRole(industryId, "industry");

    await supabase.from("industry_profiles").upsert({
      user_id: industryId,
      company_name: "Punjab BioEnergy Ltd",
      monthly_requirement: 200,
      price_offered_per_ton: 2200,
      lat: 30.91,
      lng: 75.87,
      address: "Punjab BioEnergy Ltd, Punjab",
      industry_type: "Power Plant",
    }, { onConflict: "user_id" });
    results.push("Industry profile and role updated");

    const existingAdmin = existingUsers?.users?.find((user) => user.email === "admin@agriconnect.com");
    if (!existingAdmin) {
      const { data: adminAuth, error: adminErr } = await supabase.auth.admin.createUser({
        email: "admin@agriconnect.com",
        password: adminPassword,
        email_confirm: true,
        user_metadata: { name: "Admin", role: "admin" },
      });

      if (!adminErr && adminAuth?.user) {
        await supabase.from("profiles").upsert({
          user_id: adminAuth.user.id,
          name: "Admin",
          email: "admin@agriconnect.com",
          approved: true,
        }, { onConflict: "user_id" });
        await ensureSingleRole(adminAuth.user.id, "admin");
        results.push("Admin user created");
      }
    } else {
      results.push("Admin user already exists");
    }

    const { data: existingListings } = await supabase
      .from("residue_listings")
      .select("id")
      .eq("farmer_id", farmerId)
      .eq("crop_type", "Paddy")
      .limit(1);

    let listingId: string;
    if (existingListings && existingListings.length > 0) {
      listingId = existingListings[0].id;
      await supabase.from("residue_listings").update({ status: "available" }).eq("id", listingId);
      results.push("Listing already exists: " + listingId);
    } else {
      const { data: listing, error: listingError } = await supabase.from("residue_listings").insert({
        farmer_id: farmerId,
        crop_type: "Paddy",
        quantity: 50,
        moisture_level: 12,
        quality_grade: "A",
        base_price_per_ton: 2000,
        adjusted_price_per_ton: 2100,
        total_value: 50 * 2100,
        lat: 30.9,
        lng: 75.8573,
        address: "Ludhiana, Punjab",
        status: "available",
        ai_confidence: 95,
      }).select("id").single();

      if (listingError) throw new Error("Listing creation failed: " + listingError.message);
      listingId = listing.id;
      results.push("Listing created: " + listingId);
    }

    await supabase.from("notifications").insert([
      {
        user_id: farmerId,
        message: "Your Paddy listing (50 tons) is now live and visible to industries.",
        type: "info",
      },
      {
        user_id: industryId,
        message: "New listing available: 50 tons of Paddy from Ludhiana at Rs 2,100/ton.",
        type: "info",
      },
    ]);
    results.push("Notifications created");

    const earthRadiusKm = 6371;
    const dLat = (30.91 - 30.9) * Math.PI / 180;
    const dLng = (75.87 - 75.8573) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(30.9 * Math.PI / 180) * Math.cos(30.91 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const distanceKm = Math.round((earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) * 100) / 100;
    results.push(`Distance between farmer and industry: ${distanceKm} km`);

    return new Response(JSON.stringify({
      success: true,
      results,
      accounts: {
        farmer: { email: "farmer@test.com", id: farmerId },
        industry: { email: "industry@test.com", id: industryId },
        admin: { email: "admin@agriconnect.com" },
      },
      listing: { id: listingId, cropType: "Paddy", quantity: 50 },
      distanceKm,
      clusterEligible: distanceKm <= 10,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
