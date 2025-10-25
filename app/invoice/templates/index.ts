import { DefaultTemplate } from "./default/DefaultTemplate";
import { StripeTemplate } from "./stripe/StripeTemplate";

export const TEMPLATE_REGISTRY = {
  default: { name: "Default Template", component: DefaultTemplate },
  stripe: { name: "Stripe Template", component: StripeTemplate },
  // add future templates here
} as const;

export type TemplateKey = keyof typeof TEMPLATE_REGISTRY;
