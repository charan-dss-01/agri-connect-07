const settings = {
  title: "प्रोफाइल सेटिंग्स",
  accountLabel: "{{role}} खाता",
  personalInformation: "व्यक्तिगत जानकारी",
  companyDetails: "कंपनी विवरण",
  fields: {
    fullName: "पूरा नाम",
    email: "ईमेल",
    phone: "फोन",
    phonePlaceholder: "+91 98765 43210",
    village: "गांव",
    villagePlaceholder: "जैसे करनाल, हरियाणा",
    landSize: "जमीन का आकार (एकड़)",
    landSizePlaceholder: "जैसे 5",
    companyName: "कंपनी का नाम",
    industryType: "उद्योग प्रकार",
    monthlyRequirement: "मासिक आवश्यकता (टन)",
    monthlyRequirementPlaceholder: "जैसे 500",
    priceOfferedPerTon: "ऑफर की गई कीमत (रु/टन)",
    priceOfferedPerTonPlaceholder: "जैसे 2000",
  },
  industryTypes: {
    powerPlant: "पावर प्लांट",
    biofuel: "बायोफ्यूल",
    paperMill: "पेपर मिल",
    compostUnit: "कंपोस्ट यूनिट",
  },
  toasts: {
    errorTitle: "त्रुटि",
    updatedTitle: "प्रोफाइल अपडेट हो गई!",
    updatedDescription: "आपकी सेटिंग्स सहेज ली गई हैं।",
  },
} as const;

export default settings;
