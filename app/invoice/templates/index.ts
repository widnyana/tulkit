import { ApexTemplate } from "./apex/ApexTemplate";
import { DefaultTemplate } from "./default/DefaultTemplate";
import { GraniteTemplate } from "./granite-ledger/GraniteTemplate";
import { StripeTemplate } from "./stripe/StripeTemplate";

export const TEMPLATE_REGISTRY = {
  default: { name: "Default", component: DefaultTemplate },
  apex: { name: "Apex", component: ApexTemplate },
  graniteLedger: { name: "Granite Ledger", component: GraniteTemplate },
  stripe: { name: "Stripe", component: StripeTemplate },
  // add future templates here
} as const;

export type TemplateKey = keyof typeof TEMPLATE_REGISTRY;
