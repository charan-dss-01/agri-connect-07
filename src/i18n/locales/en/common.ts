const common = {
  brand: {
    name: "AgriConnect",
    tagline: "AI Crop Exchange",
  },
  languageSwitcher: {
    label: "Change language",
    english: "English",
    hindi: "Hindi",
    telugu: "Telugu",
  },
  navigation: {
    dashboard: "Dashboard",
    listResidue: "List Residue",
    myRequests: "My Requests",
    settings: "Settings",
    browseListings: "Browse Listings",
    users: "Users",
    transactions: "Transactions",
    fraudReports: "Fraud Reports",
    logout: "Logout",
  },
  header: {
    welcomeBack: "Welcome back,",
  },
  notifications: {
    title: "Notifications",
    markAllRead: "Mark all read",
    empty: "No notifications",
  },
  actions: {
    saveChanges: "Save Changes",
    returnHome: "Return to Home",
    cancel: "Cancel",
  },
  roles: {
    farmer: "Farmer",
    industry: "Industry",
    admin: "Admin",
  },
  notFound: {
    message: "Oops! Page not found",
  },
} as const;

export default common;
