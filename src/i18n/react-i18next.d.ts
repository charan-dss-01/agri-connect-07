import "i18next";
import { defaultNS, resources } from "./resources";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)["en"];
    // Allow string keys for flexibility with namespace-scoped translations
    returnNull: false;
    allowObjectInHTMLChildren: true;
  }
}
