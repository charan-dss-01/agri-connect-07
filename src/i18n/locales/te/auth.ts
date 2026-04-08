const auth = {
  panel: {
    joinNetwork: "నెట్‌వర్క్‌లో చేరండి",
    welcomeBack: "మళ్లీ స్వాగతం",
    description: "పంట అవశేష మార్పిడి నెట్‌వర్క్‌తో కలవండి. కాలుష్యాన్ని తగ్గించి ఆదాయాన్ని పెంచుకోండి.",
  },
  page: {
    createAccount: "ఖాతా సృష్టించండి",
    signIn: "సైన్ ఇన్",
    createAccountDescription: "మీ ఖాతాతో ప్రారంభించండి",
    signInDescription: "కొనసాగడానికి మీ వివరాలు నమోదు చేయండి",
  },
  form: {
    fullName: "పూర్తి పేరు",
    fullNamePlaceholder: "మీ పేరు నమోదు చేయండి",
    phone: "ఫోన్",
    phonePlaceholder: "+91 98765 43210",
    village: "గ్రామం",
    villagePlaceholder: "ఉదా: కర్నాల్, హర్యానా",
    companyName: "కంపెనీ పేరు",
    companyNamePlaceholder: "ఉదా: GreenPower Biomass Ltd",
    email: "ఈమెయిల్",
    emailPlaceholder: "you@example.com",
    password: "పాస్‌వర్డ్",
    passwordPlaceholder: "మీ పాస్‌వర్డ్ నమోదు చేయండి",
  },
  toggle: {
    alreadyHaveAccount: "ఇప్పటికే ఖాతా ఉందా?",
    dontHaveAccount: "ఖాతా లేదా?",
    register: "నమోదు చేసుకోండి",
    signIn: "సైన్ ఇన్",
  },
  toasts: {
    registrationFailed: "నమోదు విఫలమైంది",
    loginFailed: "లాగిన్ విఫలమైంది",
    checkEmailTitle: "మీ ఈమెయిల్ చూడండి",
    checkEmailDescription: "మీ ఖాతా సృష్టించబడింది. సైన్ ఇన్ చేయడానికి ముందు మీ ఈమెయిల్‌ను ధృవీకరించండి.",
    accountCreatedTitle: "ఖాతా సృష్టించబడింది!",
    accountCreatedDescription: "మీరు ఇప్పుడు లాగిన్ అయ్యారు.",
  },
} as const;

export default auth;
