const settings = {
  title: "ప్రొఫైల్ సెట్టింగ్స్",
  accountLabel: "{{role}} ఖాతా",
  personalInformation: "వ్యక్తిగత సమాచారం",
  companyDetails: "కంపెనీ వివరాలు",
  fields: {
    fullName: "పూర్తి పేరు",
    email: "ఈమెయిల్",
    phone: "ఫోన్",
    phonePlaceholder: "+91 98765 43210",
    village: "గ్రామం",
    villagePlaceholder: "ఉదా: కర్నాల్, హర్యానా",
    landSize: "భూమి విస్తీర్ణం (ఎకరాలు)",
    landSizePlaceholder: "ఉదా: 5",
    companyName: "కంపెనీ పేరు",
    industryType: "పరిశ్రమ రకం",
    monthlyRequirement: "నెలవారీ అవసరం (టన్నులు)",
    monthlyRequirementPlaceholder: "ఉదా: 500",
    priceOfferedPerTon: "ఆఫర్ చేసిన ధర (రూ./టన్ను)",
    priceOfferedPerTonPlaceholder: "ఉదా: 2000",
  },
  industryTypes: {
    powerPlant: "పవర్ ప్లాంట్",
    biofuel: "బయోఫ్యూయెల్",
    paperMill: "పేపర్ మిల్",
    compostUnit: "కంపోస్ట్ యూనిట్",
  },
  toasts: {
    errorTitle: "లోపం",
    updatedTitle: "ప్రొఫైల్ అప్‌డేట్ అయింది!",
    updatedDescription: "మీ సెట్టింగ్స్ సేవ్ చేయబడ్డాయి.",
  },
} as const;

export default settings;
