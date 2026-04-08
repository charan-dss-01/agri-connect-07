const settings = {
  title: "Profile Settings",
  accountLabel: "{{role}} account",
  personalInformation: "Personal Information",
  companyDetails: "Company Details",
  fields: {
    fullName: "Full Name",
    email: "Email",
    phone: "Phone",
    phonePlaceholder: "+91 98765 43210",
    village: "Village",
    villagePlaceholder: "e.g. Karnal, Haryana",
    landSize: "Land Size (acres)",
    landSizePlaceholder: "e.g. 5",
    companyName: "Company Name",
    industryType: "Industry Type",
    monthlyRequirement: "Monthly Requirement (tons)",
    monthlyRequirementPlaceholder: "e.g. 500",
    priceOfferedPerTon: "Price Offered (Rs/ton)",
    priceOfferedPerTonPlaceholder: "e.g. 2000",
  },
  industryTypes: {
    powerPlant: "Power Plant",
    biofuel: "Biofuel",
    paperMill: "Paper Mill",
    compostUnit: "Compost Unit",
  },
  toasts: {
    errorTitle: "Error",
    updatedTitle: "Profile Updated!",
    updatedDescription: "Your settings have been saved.",
  },
} as const;

export default settings;
