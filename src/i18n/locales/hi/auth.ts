const auth = {
  panel: {
    joinNetwork: "नेटवर्क से जुड़ें",
    welcomeBack: "फिर से स्वागत है",
    description: "फसल अवशेष एक्सचेंज नेटवर्क से जुड़ें। प्रदूषण घटाएं और आय बढ़ाएं।",
  },
  page: {
    createAccount: "खाता बनाएं",
    signIn: "साइन इन करें",
    createAccountDescription: "अपने खाते के साथ शुरुआत करें",
    signInDescription: "जारी रखने के लिए अपनी जानकारी भरें",
  },
  form: {
    fullName: "पूरा नाम",
    fullNamePlaceholder: "अपना नाम दर्ज करें",
    phone: "फोन",
    phonePlaceholder: "+91 98765 43210",
    village: "गांव",
    villagePlaceholder: "जैसे करनाल, हरियाणा",
    companyName: "कंपनी का नाम",
    companyNamePlaceholder: "जैसे ग्रीनपावर बायोमास लिमिटेड",
    email: "ईमेल",
    emailPlaceholder: "you@example.com",
    password: "पासवर्ड",
    passwordPlaceholder: "अपना पासवर्ड दर्ज करें",
  },
  toggle: {
    alreadyHaveAccount: "क्या आपका पहले से खाता है?",
    dontHaveAccount: "क्या आपका खाता नहीं है?",
    register: "रजिस्टर करें",
    signIn: "साइन इन करें",
  },
  toasts: {
    registrationFailed: "रजिस्ट्रेशन असफल रहा",
    loginFailed: "लॉगिन असफल रहा",
    checkEmailTitle: "अपना ईमेल देखें",
    checkEmailDescription: "आपका खाता बन गया है। साइन इन करने से पहले अपना ईमेल सत्यापित करें।",
    accountCreatedTitle: "खाता बन गया!",
    accountCreatedDescription: "अब आप लॉग इन हैं।",
  },
} as const;

export default auth;
