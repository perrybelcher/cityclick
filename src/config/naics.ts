export interface NaicsDefinition {
  naicsCode: string;
  slug: string;
  label: string;
  category: string;
  usAvgPer10k: number;
  defaultBreakeven: {
    typicalSqFt: number;
    typicalBaseRentSqFtYr: number;
    typicalTicket: number;
    typicalCogsPct: number;
    typicalStaffHoursPerWeek: number;
  };
}

export const NAICS_25_DEFINITIONS: readonly NaicsDefinition[] = [
  {
    naicsCode: "722515",
    slug: "coffee-shops",
    label: "Coffee & Snack Shops",
    category: "Food & Beverage",
    usAvgPer10k: 2.15,
    defaultBreakeven: {
      typicalSqFt: 1400,
      typicalBaseRentSqFtYr: 32.0,
      typicalTicket: 8.50,
      typicalCogsPct: 0.28,
      typicalStaffHoursPerWeek: 120,
    },
  },
  {
    naicsCode: "722511",
    slug: "restaurants",
    label: "Full-Service Restaurants",
    category: "Food & Beverage",
    usAvgPer10k: 6.80,
    defaultBreakeven: {
      typicalSqFt: 3200,
      typicalBaseRentSqFtYr: 34.0,
      typicalTicket: 34.00,
      typicalCogsPct: 0.32,
      typicalStaffHoursPerWeek: 350,
    },
  },
  {
    naicsCode: "722513",
    slug: "fast-food",
    label: "Limited-Service / Fast Food Restaurants",
    category: "Food & Beverage",
    usAvgPer10k: 7.20,
    defaultBreakeven: {
      typicalSqFt: 2200,
      typicalBaseRentSqFtYr: 36.0,
      typicalTicket: 14.50,
      typicalCogsPct: 0.31,
      typicalStaffHoursPerWeek: 260,
    },
  },
  {
    naicsCode: "722410",
    slug: "bars-taverns",
    label: "Drinking Places (Alcoholic Beverages)",
    category: "Food & Beverage",
    usAvgPer10k: 1.85,
    defaultBreakeven: {
      typicalSqFt: 2400,
      typicalBaseRentSqFtYr: 30.0,
      typicalTicket: 22.00,
      typicalCogsPct: 0.22,
      typicalStaffHoursPerWeek: 180,
    },
  },
  {
    naicsCode: "812111",
    slug: "barber-shops",
    label: "Barber Shops",
    category: "Personal Care",
    usAvgPer10k: 1.35,
    defaultBreakeven: {
      typicalSqFt: 950,
      typicalBaseRentSqFtYr: 28.0,
      typicalTicket: 32.00,
      typicalCogsPct: 0.08,
      typicalStaffHoursPerWeek: 90,
    },
  },
  {
    naicsCode: "812112",
    slug: "beauty-salons",
    label: "Beauty Salons & Hair Studios",
    category: "Personal Care",
    usAvgPer10k: 3.40,
    defaultBreakeven: {
      typicalSqFt: 1500,
      typicalBaseRentSqFtYr: 30.0,
      typicalTicket: 68.00,
      typicalCogsPct: 0.12,
      typicalStaffHoursPerWeek: 160,
    },
  },
  {
    naicsCode: "812113",
    slug: "nail-salons",
    label: "Nail Salons",
    category: "Personal Care",
    usAvgPer10k: 2.10,
    defaultBreakeven: {
      typicalSqFt: 1200,
      typicalBaseRentSqFtYr: 28.0,
      typicalTicket: 45.00,
      typicalCogsPct: 0.14,
      typicalStaffHoursPerWeek: 150,
    },
  },
  {
    naicsCode: "713940",
    slug: "gyms-fitness",
    label: "Fitness & Recreational Sports Centers",
    category: "Health & Fitness",
    usAvgPer10k: 1.25,
    defaultBreakeven: {
      typicalSqFt: 4500,
      typicalBaseRentSqFtYr: 24.0,
      typicalTicket: 75.00,
      typicalCogsPct: 0.05,
      typicalStaffHoursPerWeek: 140,
    },
  },
  {
    naicsCode: "812910",
    slug: "pet-care",
    label: "Pet Care & Grooming Services",
    category: "Pet Services",
    usAvgPer10k: 0.95,
    defaultBreakeven: {
      typicalSqFt: 1800,
      typicalBaseRentSqFtYr: 26.0,
      typicalTicket: 65.00,
      typicalCogsPct: 0.10,
      typicalStaffHoursPerWeek: 110,
    },
  },
  {
    naicsCode: "541940",
    slug: "veterinary",
    label: "Veterinary Services & Animal Hospitals",
    category: "Pet Services",
    usAvgPer10k: 1.05,
    defaultBreakeven: {
      typicalSqFt: 3000,
      typicalBaseRentSqFtYr: 32.0,
      typicalTicket: 145.00,
      typicalCogsPct: 0.22,
      typicalStaffHoursPerWeek: 240,
    },
  },
  {
    naicsCode: "811111",
    slug: "auto-repair",
    label: "General Automotive Repair",
    category: "Automotive",
    usAvgPer10k: 4.80,
    defaultBreakeven: {
      typicalSqFt: 4200,
      typicalBaseRentSqFtYr: 18.0,
      typicalTicket: 320.00,
      typicalCogsPct: 0.38,
      typicalStaffHoursPerWeek: 200,
    },
  },
  {
    naicsCode: "811192",
    slug: "car-washes",
    label: "Car Washes & Auto Detailing",
    category: "Automotive",
    usAvgPer10k: 0.65,
    defaultBreakeven: {
      typicalSqFt: 3500,
      typicalBaseRentSqFtYr: 26.0,
      typicalTicket: 24.00,
      typicalCogsPct: 0.15,
      typicalStaffHoursPerWeek: 160,
    },
  },
  {
    naicsCode: "812310",
    slug: "laundromats",
    label: "Coin-Operated Laundromats",
    category: "Personal Services",
    usAvgPer10k: 0.55,
    defaultBreakeven: {
      typicalSqFt: 2200,
      typicalBaseRentSqFtYr: 22.0,
      typicalTicket: 12.00,
      typicalCogsPct: 0.18,
      typicalStaffHoursPerWeek: 40,
    },
  },
  {
    naicsCode: "812320",
    slug: "dry-cleaners",
    label: "Dry Cleaning & Laundry Services",
    category: "Personal Services",
    usAvgPer10k: 0.85,
    defaultBreakeven: {
      typicalSqFt: 1800,
      typicalBaseRentSqFtYr: 25.0,
      typicalTicket: 28.00,
      typicalCogsPct: 0.16,
      typicalStaffHoursPerWeek: 120,
    },
  },
  {
    naicsCode: "621210",
    slug: "dentists",
    label: "Offices of Dentists",
    category: "Healthcare",
    usAvgPer10k: 3.90,
    defaultBreakeven: {
      typicalSqFt: 2500,
      typicalBaseRentSqFtYr: 36.0,
      typicalTicket: 350.00,
      typicalCogsPct: 0.15,
      typicalStaffHoursPerWeek: 220,
    },
  },
  {
    naicsCode: "621310",
    slug: "chiropractors",
    label: "Offices of Chiropractors",
    category: "Healthcare",
    usAvgPer10k: 1.40,
    defaultBreakeven: {
      typicalSqFt: 1600,
      typicalBaseRentSqFtYr: 28.0,
      typicalTicket: 85.00,
      typicalCogsPct: 0.08,
      typicalStaffHoursPerWeek: 100,
    },
  },
  {
    naicsCode: "621340",
    slug: "physical-therapy",
    label: "Physical, Occupational & Speech Therapists",
    category: "Healthcare",
    usAvgPer10k: 1.55,
    defaultBreakeven: {
      typicalSqFt: 2400,
      typicalBaseRentSqFtYr: 30.0,
      typicalTicket: 125.00,
      typicalCogsPct: 0.07,
      typicalStaffHoursPerWeek: 180,
    },
  },
  {
    naicsCode: "624410",
    slug: "daycare",
    label: "Child Day Care Services",
    category: "Education & Childcare",
    usAvgPer10k: 2.25,
    defaultBreakeven: {
      typicalSqFt: 5000,
      typicalBaseRentSqFtYr: 22.0,
      typicalTicket: 280.00,
      typicalCogsPct: 0.12,
      typicalStaffHoursPerWeek: 360,
    },
  },
  {
    naicsCode: "445120",
    slug: "convenience-stores",
    label: "Convenience Retail Stores",
    category: "Retail",
    usAvgPer10k: 1.95,
    defaultBreakeven: {
      typicalSqFt: 2800,
      typicalBaseRentSqFtYr: 32.0,
      typicalTicket: 11.50,
      typicalCogsPct: 0.68,
      typicalStaffHoursPerWeek: 180,
    },
  },
  {
    naicsCode: "448140",
    slug: "clothing-boutiques",
    label: "Family Clothing Stores & Boutiques",
    category: "Retail",
    usAvgPer10k: 1.65,
    defaultBreakeven: {
      typicalSqFt: 1800,
      typicalBaseRentSqFtYr: 34.0,
      typicalTicket: 58.00,
      typicalCogsPct: 0.45,
      typicalStaffHoursPerWeek: 120,
    },
  },
  {
    naicsCode: "445291",
    slug: "bakeries",
    label: "Retail Bakeries & Pastry Shops",
    category: "Food & Beverage",
    usAvgPer10k: 0.85,
    defaultBreakeven: {
      typicalSqFt: 1600,
      typicalBaseRentSqFtYr: 30.0,
      typicalTicket: 16.00,
      typicalCogsPct: 0.25,
      typicalStaffHoursPerWeek: 170,
    },
  },
  {
    naicsCode: "453110",
    slug: "florists",
    label: "Florists & Floral Gift Shops",
    category: "Retail",
    usAvgPer10k: 0.50,
    defaultBreakeven: {
      typicalSqFt: 1300,
      typicalBaseRentSqFtYr: 26.0,
      typicalTicket: 65.00,
      typicalCogsPct: 0.42,
      typicalStaffHoursPerWeek: 90,
    },
  },
  {
    naicsCode: "541110",
    slug: "law-firms",
    label: "Offices of Lawyers",
    category: "Professional Services",
    usAvgPer10k: 4.90,
    defaultBreakeven: {
      typicalSqFt: 2200,
      typicalBaseRentSqFtYr: 35.0,
      typicalTicket: 450.00,
      typicalCogsPct: 0.05,
      typicalStaffHoursPerWeek: 160,
    },
  },
  {
    naicsCode: "541211",
    slug: "accounting-cpa",
    label: "Offices of Certified Public Accountants",
    category: "Professional Services",
    usAvgPer10k: 2.10,
    defaultBreakeven: {
      typicalSqFt: 1500,
      typicalBaseRentSqFtYr: 30.0,
      typicalTicket: 275.00,
      typicalCogsPct: 0.06,
      typicalStaffHoursPerWeek: 120,
    },
  },
  {
    naicsCode: "531210",
    slug: "real-estate-agencies",
    label: "Offices of Real Estate Agents & Brokers",
    category: "Professional Services",
    usAvgPer10k: 3.80,
    defaultBreakeven: {
      typicalSqFt: 2000,
      typicalBaseRentSqFtYr: 32.0,
      typicalTicket: 1200.00,
      typicalCogsPct: 0.15,
      typicalStaffHoursPerWeek: 140,
    },
  },
] as const;

export const NAICS_BY_CODE = new Map(
  NAICS_25_DEFINITIONS.map((def) => [def.naicsCode, def])
);

export const NAICS_BY_SLUG = new Map(
  NAICS_25_DEFINITIONS.map((def) => [def.slug, def])
);
