import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const results: string[] = [];

    // --- STEP 1: Create Farmer user ---
    let farmerId: string;
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingFarmer = existingUsers?.users?.find(u => u.email === "farmer@test.com");
    
    if (existingFarmer) {
      farmerId = existingFarmer.id;
      results.push("Farmer user already exists: " + farmerId);
    } else {
      const { data: farmerAuth, error: farmerErr } = await supabase.auth.admin.createUser({
        email: "farmer@test.com",
        password: "Test@123",
        email_confirm: true,
        user_metadata: { name: "Test Farmer", role: "farmer" },
      });
      if (farmerErr) throw new Error("Farmer creation failed: " + farmerErr.message);
      farmerId = farmerAuth.user.id;
      results.push("Farmer user created: " + farmerId);
    }

    // Update farmer profile with details
    await supabase.from("profiles").upsert({
      user_id: farmerId,
      name: "Test Farmer",
      email: "farmer@test.com",
      phone: "9876543210",
      village: "Ludhiana",
      land_size: 5,
      lat: 30.9000,
      lng: 75.8573,
      address: "Ludhiana, Punjab",
      approved: true,
    }, { onConflict: "user_id" });

    await supabase.from("user_roles").upsert({
      user_id: farmerId,
      role: "farmer",
    }, { onConflict: "user_id" });
    results.push("Farmer profile & role updated");

    // --- STEP 2: Create Industry user ---
    let industryId: string;
    const existingIndustry = existingUsers?.users?.find(u => u.email === "industry@test.com");
    
    if (existingIndustry) {
      industryId = existingIndustry.id;
      results.push("Industry user already exists: " + industryId);
    } else {
      const { data: indAuth, error: indErr } = await supabase.auth.admin.createUser({
        email: "industry@test.com",
        password: "Test@123",
        email_confirm: true,
        user_metadata: { name: "Test Industry", role: "industry" },
      });
      if (indErr) throw new Error("Industry creation failed: " + indErr.message);
      industryId = indAuth.user.id;
      results.push("Industry user created: " + industryId);
    }

    // Update industry profile with details
    await supabase.from("profiles").upsert({
      user_id: industryId,
      name: "Test Industry",
      email: "industry@test.com",
      phone: "9876543211",
      lat: 30.9100,
      lng: 75.8700,
      address: "Punjab BioEnergy Ltd, Punjab",
      approved: true,
    }, { onConflict: "user_id" });

    await supabase.from("user_roles").upsert({
      user_id: industryId,
      role: "industry",
    }, { onConflict: "user_id" });

    await supabase.from("industry_profiles").upsert({
      user_id: industryId,
      company_name: "Punjab BioEnergy Ltd",
      monthly_requirement: 200,
      price_offered_per_ton: 2200,
      lat: 30.9100,
      lng: 75.8700,
      address: "Punjab BioEnergy Ltd, Punjab",
      industry_type: "Power Plant",
    }, { onConflict: "user_id" });
    results.push("Industry profile & role updated");

    // --- STEP 3: Create Admin user ---
    const existingAdmin = existingUsers?.users?.find(u => u.email === "admin@agriconnect.com");
    if (!existingAdmin) {
      const { data: adminAuth, error: adminErr } = await supabase.auth.admin.createUser({
        email: "admin@agriconnect.com",
        password: "admin123456",
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
        await supabase.from("user_roles").upsert({
          user_id: adminAuth.user.id,
          role: "admin",
        }, { onConflict: "user_id" });
        results.push("Admin user created");
      }
    } else {
      results.push("Admin user already exists");
    }

    // --- STEP 4: Create residue listing ---
    // Check if listing already exists for this farmer
    const { data: existingListings } = await supabase
      .from("residue_listings")
      .select("id")
      .eq("farmer_id", farmerId)
      .eq("crop_type", "Paddy Straw")
      .limit(1);

    let listingId: string;
    if (existingListings && existingListings.length > 0) {
      listingId = existingListings[0].id;
      // Make sure it's available
      await supabase.from("residue_listings").update({ status: "available" }).eq("id", listingId);
      results.push("Listing already exists: " + listingId);
    } else {
      const { data: listing, error: listErr } = await supabase.from("residue_listings").insert({
        farmer_id: farmerId,
        crop_type: "Paddy Straw",
        quantity: 50,
        moisture_level: 12,
        quality_grade: "A",
        base_price_per_ton: 2000,
        adjusted_price_per_ton: 2100,
        total_value: 50 * 2100,
        lat: 30.9000,
        lng: 75.8573,
        address: "Ludhiana, Punjab",
        status: "available",
        ai_confidence: 95,
      }).select("id").single();
      if (listErr) throw new Error("Listing creation failed: " + listErr.message);
      listingId = listing.id;
      results.push("Listing created: " + listingId);
    }

    // --- STEP 5: Create notifications ---
    await supabase.from("notifications").insert([
      {
        user_id: farmerId,
        message: "Your Paddy Straw listing (50 tons) is now live and visible to industries.",
        type: "listing",
      },
      {
        user_id: industryId,
        message: "New listing available: 50 tons of Paddy Straw from Ludhiana at ₹2,100/ton.",
        type: "listing",
      },
    ]);
    results.push("Notifications created");

    // --- Distance calculation ---
    const R = 6371;
    const dLat = (30.9100 - 30.9000) * Math.PI / 180;
    const dLng = (75.8700 - 75.8573) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(30.9*Math.PI/180) * Math.cos(30.91*Math.PI/180) * Math.sin(dLng/2)**2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = Math.round(distance * 100) / 100;
    results.push(`Distance between farmer and industry: ${distanceKm} km`);

    return new Response(JSON.stringify({
      success: true,
      results,
      accounts: {
        farmer: { email: "farmer@test.com", password: "Test@123", id: farmerId },
        industry: { email: "industry@test.com", password: "Test@123", id: industryId },
        admin: { email: "admin@agriconnect.com", password: "admin123456" },
      },
      listing: { id: listingId, cropType: "Paddy Straw", quantity: 50 },
      distanceKm,
      clusterEligible: distanceKm <= 10,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
