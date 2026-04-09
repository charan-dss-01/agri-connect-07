import "i18next";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    // Disable strict key checking to allow namespace-scoped translations
    allowObjectInHTMLChildren: true;
  }
}
