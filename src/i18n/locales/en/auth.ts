const auth = {
  panel: {
    joinNetwork: "Join the network",
    welcomeBack: "Welcome back",
    description: "Connect with the crop residue exchange network. Reduce pollution and increase revenue.",
  },
  page: {
    createAccount: "Create Account",
    signIn: "Sign In",
    createAccountDescription: "Get started with your account",
    signInDescription: "Enter your credentials to continue",
  },
  form: {
    fullName: "Full Name",
    fullNamePlaceholder: "Enter your name",
    phone: "Phone",
    phonePlaceholder: "+91 98765 43210",
    village: "Village",
    villagePlaceholder: "e.g. Karnal, Haryana",
    companyName: "Company Name",
    companyNamePlaceholder: "e.g. GreenPower Biomass Ltd",
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Password",
    passwordPlaceholder: "Enter your password",
  },
  toggle: {
    alreadyHaveAccount: "Already have an account?",
    dontHaveAccount: "Don't have an account?",
    register: "Register",
    signIn: "Sign In",
  },
  toasts: {
    registrationFailed: "Registration failed",
    loginFailed: "Login failed",
    checkEmailTitle: "Check your email",
    checkEmailDescription: "Your account was created. Confirm your email before signing in.",
    accountCreatedTitle: "Account created!",
    accountCreatedDescription: "You are now logged in.",
  },
} as const;

export default auth;
