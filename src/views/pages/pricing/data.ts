
export type PricingPlanType = {
  title: string
  description: string
  price: string
  billing: string
  details: string
  features: {
    text: string
    available: boolean
  }[]
  isPopular?: boolean
  button: {
    text: string
    style: string
  }
}

export const pricingPlans: PricingPlanType[] = [
  {
    title: "Starter Plan",
    description: "Best for freelancers and personal use",
    price: "$9",
    billing: "Billed monthly",
    details: "1 project included",
    features: [
      { text: "1 active project", available: true },
      { text: "Access to all components", available: true },
      { text: "Email support", available: true },
      { text: "No team collaboration", available: false },
      { text: "No SaaS rights", available: false }
    ],
    button: {
      text: "Choose Starter",
      style: "outline-primary",
    },
  },
  {
    title: "Professional",
    description: "Ideal for small teams and startups",
    price: "$29",
    billing: "Billed monthly",
    details: "Up to 5 projects",
    features: [
      { text: "5 active projects", available: true },
      { text: "Component + plugin access", available: true },
      { text: "Team collaboration", available: true },
      { text: "Priority email support", available: true },
      { text: "No resale rights", available: false }
    ],
    isPopular: true,
    button: {
      text: "Choose Professional",
      style: "light",
    }
  },
  {
    title: "Business",
    description: "For agencies and large teams",
    price: "$79",
    billing: "Billed monthly",
    details: "Unlimited projects",
    features: [
      { text: "Unlimited projects", available: true },
      { text: "SaaS & client projects allowed", available: true },
      { text: "All premium components", available: true },
      { text: "Priority support", available: true },
      { text: "Team management tools", available: true }
    ],
    button: {
      text: "Choose Business",
      style: "dark",
    }
  },
  {
    title: "Enterprise",
    description: "Custom plan for enterprises & high-scale use",
    price: "Contact Us",
    billing: "Custom monthly billing",
    details: "Based on usage & team size",
    features: [
      { text: "Unlimited users & usage", available: true },
      { text: "White-label license", available: true },
      { text: "Custom integrations", available: true },
      { text: "SLA + NDA agreements", available: true },
      { text: "Dedicated manager & support", available: true }
    ],
    button: {
      text: "Contact Sales",
      style: "outline-dark",
    }
  }
]


