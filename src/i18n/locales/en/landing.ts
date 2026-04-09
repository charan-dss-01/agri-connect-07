const landing = {
  navbar: {
    home: "Home",
    solution: "Solution",
    features: "Features",
    howItWorks: "How it Works",
    impact: "Impact",
    login: "Login",
    getStarted: "Get Started",
  },
  hero: {
    badge: "Sustainable Agriculture and Waste Management",
    titleLine1: "Turning Crop Waste",
    titleLine2: "into Green Wealth",
    description:
      "AgriConnect empowers farmers to convert crop residue into income while reducing pollution and enabling sustainable industries.",
    startFarmer: "Start as Farmer",
    joinIndustry: "Join as Industry",
    floating: {
      farmersEarning: "Farmers Earning",
      co2Saved: "CO2 Saved",
      co2SavedValue: "{{value}}K+ Tons",
      industriesMatched: "Industries Matched",
    },
  },
  problem: {
    badge: "The Crisis",
    title: "The Problem We Are Solving",
    description:
      "Millions of tons of crop residue are burned every year, causing severe air pollution and wasting valuable resources that could benefit industries and farmers alike.",
    stats: [
      { label: "Tons of crop residue burned annually" },
      { label: "Tons of CO2 emitted yearly" },
      { label: "Income for farmers from waste" },
    ],
  },
  solution: {
    title: "Our Solution",
    description: "A smart platform connecting farmers with industries for sustainable waste transformation",
    steps: [
      { title: "List Residue", description: "Farmers post crop waste details and location" },
      { title: "AI Matching", description: "System finds nearby industries in need" },
      { title: "Trade and Earn", description: "Secure transaction, income earned" },
    ],
  },
  features: {
    title: "Powerful Features",
    description: "Everything you need to succeed in the circular economy",
    learnMore: "Learn more",
    items: [
      { title: "AI Crop Classification", description: "Smart residue detection and classification" },
      { title: "Smart Matching", description: "AI-powered industry matching system" },
      { title: "Price Optimization", description: "Dynamic pricing based on demand" },
      { title: "Logistics Hub", description: "Optimized transport and delivery" },
      { title: "Gamified Rewards", description: "Green streaks and carbon points" },
      { title: "Trust System", description: "Verified profiles and secure transactions" },
    ],
  },
  impact: {
    title: "Real Impact, Real Numbers",
    description: "See the difference AgriConnect is making in real-time",
    stats: [
      { label: "Tons CO2 Saved" },
      { label: "Farmers Empowered" },
      { label: "Industries Connected" },
      { label: "Tons Traded" },
    ],
  },
  howItWorks: {
    title: "How It Works",
    description: "A seamless flow from crop residue to sustainable value creation",
    desktop: ["Farmer", "Listing", "Matching", "Transport", "Industry", "Impact"],
    mobile: [
      "Farmer Lists Residue",
      "AI System Searches",
      "Finds Matching Industry",
      "Arranges Transport",
      "Secure Transaction",
      "Carbon Impact Recorded",
    ],
  },
  gamification: {
    title: "Gamified Sustainability",
    description: "Earn rewards, build your reputation, and make a real environmental impact",
    items: [
      { title: "Green Streaks", description: "Consistent trading earns you exclusive badges and rewards" },
      { title: "Trust Score", description: "Build a verified profile that attracts premium buyers" },
      { title: "Carbon Points", description: "Convert CO2 savings into transferable carbon credits" },
    ],
  },
  successStories: {
    title: "Success Stories",
    description: "Real farmers and industries transforming waste into wealth",
  },
  carousel: {
    impact: "Impact",
    stories: {
      1: {
        name: "Rajesh Kumar",
        role: "Farmer",
        location: "Punjab",
        income: "Rs2.5L",
        story: "Converted 50 tons of wheat residue into income in just 3 months",
      },
      2: {
        name: "Priya Industries",
        role: "Buyer",
        location: "Haryana",
        impact: "500 tons",
        story: "Found reliable biomass suppliers at 40% lower cost through AgriConnect",
      },
      3: {
        name: "Farmer Collective",
        role: "Community",
        location: "Maharashtra",
        group: "250+ farmers",
        story: "Built sustainable income stream while reducing regional air pollution",
      },
      4: {
        name: "Amit Singh",
        role: "Farmer",
        location: "Uttar Pradesh",
        income: "Rs1.8L",
        story: "Reduced field burning emissions by 60% while earning sustainable income",
      },
      5: {
        name: "Green Technologies",
        role: "Industry Partner",
        location: "Karnataka",
        impact: "800 tons",
        story: "Reduced sourcing costs and ensured supply chain sustainability",
      },
    },
  },
  cta: {
    title: "Join the Green Revolution",
    description:
      "Be part of a movement that transforms agricultural waste into sustainable wealth while protecting our planet.",
  },
  footer: {
    description: "Transforming agricultural waste into sustainable wealth while protecting our planet.",
    product: "Product",
    company: "Company",
    legal: "Legal",
    links: {
      features: "Features",
      pricing: "Pricing",
      security: "Security",
      about: "About",
      blog: "Blog",
      careers: "Careers",
      privacy: "Privacy",
      terms: "Terms",
      contact: "Contact",
    },
    social: {
      twitter: "Twitter",
      linkedin: "LinkedIn",
      instagram: "Instagram",
    },
    rights: "All rights reserved.",
  },
} as const;

export default landing;
