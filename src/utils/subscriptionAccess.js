const PLAN_MODULES = {
  BASIC: [
    "blocks",
    "flats",
    "residents",
    "complaints",
    "notifications",
  ],
  STANDARD: [
    "blocks",
    "flats",
    "residents",
    "association-members",
    "maintenance",
    "payments-receipts",
    "complaints",
    "staff-management",
    "finance-reports",
    "announcements",
    "notifications",
    "documents",
    "parking",
    "visitors",
    "emergency-alerts",
    "amenities",
    "smart-gate",
    "delivery",
    "helpdesk",
  ],
  PREMIUM: [
    "blocks",
    "flats",
    "residents",
    "association-members",
    "maintenance",
    "payments-receipts",
    "complaints",
    "staff-management",
    "finance-reports",
    "announcements",
    "notifications",
    "documents",
    "parking",
    "visitors",
    "emergency-alerts",
    "community-talent",
    "amenities",
    "membership-plans",
    "marketplace",
    "smart-gate",
    "delivery",
    "pet-management",
    "surveys",
    "helpdesk",
    "moves",
  ],
};

const ASSOCIATION_ROLE_ACCESS = {
  BASIC: {
    available: false,
    note: "Starter subscription package. Users continue normal app access; upgrade plans highlight additional service value.",
    roles: {},
  },
  STANDARD: {
    available: true,
    note: "Recommended upgrade package for committee operations and medium-sized apartment workflows.",
    roles: {
      PRESIDENT: ["dashboard", "complaints", "announcements", "finance-reports", "emergency-alerts"],
      VICE_PRESIDENT: ["dashboard", "complaints", "residents", "announcements"],
      SECRETARY: ["dashboard", "complaints", "visitors", "parking", "announcements", "documents", "delivery", "helpdesk"],
      TREASURER: ["dashboard", "maintenance", "payments-receipts", "finance-reports"],
      COMMITTEE_MEMBER: ["dashboard", "complaints", "announcements", "surveys", "community-talent"],
    },
  },
  PREMIUM: {
    available: true,
    note: "Advanced upgrade package for full community operations and premium monitoring.",
    roles: {
      PRESIDENT: ["dashboard", "analytics", "finance-reports", "smart-gate", "emergency-alerts", "surveys", "community-talent", "membership-plans"],
      VICE_PRESIDENT: ["dashboard", "finance-reports", "complaints", "surveys", "residents", "community-talent"],
      SECRETARY: ["dashboard", "complaints", "visitors", "parking", "announcements", "community-talent", "marketplace", "delivery", "moves", "pet-management"],
      TREASURER: ["dashboard", "maintenance", "payments-receipts", "finance-reports", "membership-plans", "analytics"],
      COMMITTEE_MEMBER: ["dashboard", "surveys", "announcements", "community-talent"],
    },
  },
};

const PLAN_RULES = [
  {
    name: "Basic",
    key: "BASIC",
    price: 2999,
    modules: PLAN_MODULES.BASIC,
    associationAccess: ASSOCIATION_ROLE_ACCESS.BASIC,
    summary: "Starter subscription package for core apartment operations.",
  },
  {
    name: "Standard",
    key: "STANDARD",
    price: 5999,
    modules: PLAN_MODULES.STANDARD,
    associationAccess: ASSOCIATION_ROLE_ACCESS.STANDARD,
    summary: "Upgrade package for committee, finance, staff, visitor, and document workflows.",
  },
  {
    name: "Premium",
    key: "PREMIUM",
    price: 9999,
    modules: PLAN_MODULES.PREMIUM,
    associationAccess: ASSOCIATION_ROLE_ACCESS.PREMIUM,
    summary: "Premium upgrade package for advanced community and operations management.",
  },
];

const normalizePlan = (plan) => String(plan || "").trim().toUpperCase();

const normalizeBillingCycle = (cycle) => {
  const normalized = String(cycle || "MONTHLY").trim().toUpperCase();
  return normalized === "YEARLY" ? "YEARLY" : "MONTHLY";
};

const addValidity = (date, billingCycle) => {
  const endDate = new Date(date);
  if (normalizeBillingCycle(billingCycle) === "YEARLY") {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setDate(endDate.getDate() + 30);
  }
  return endDate;
};

const getDaysRemaining = (endDate, now = new Date()) => {
  if (!endDate) {
    return null;
  }
  const remainingMs = new Date(endDate).getTime() - now.getTime();
  return Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
};

const buildSubscriptionAccess = (apartment, now = new Date()) => {
  const planKey = normalizePlan(apartment?.subscriptionPlan);
  const paymentStatus = String(apartment?.subscriptionPaymentStatus || "PENDING").toUpperCase();
  const endDate = apartment?.subscriptionEndDate ? new Date(apartment.subscriptionEndDate) : null;
  const paid = paymentStatus === "PAID";
  const notExpired = Boolean(endDate && endDate >= now);
  const active = Boolean(planKey && PLAN_MODULES[planKey] && paid && notExpired);
  const daysRemaining = getDaysRemaining(endDate, now);

  return {
    plan: planKey || null,
    billingCycle: normalizeBillingCycle(apartment?.subscriptionBillingCycle),
    paymentStatus,
    active,
    expired: Boolean(endDate && endDate < now),
    daysRemaining,
    showExpiryReminder: active && daysRemaining !== null && daysRemaining <= 7,
    allowedModules: active ? PLAN_MODULES[planKey] : [],
    associationAccess: active ? ASSOCIATION_ROLE_ACCESS[planKey] : ASSOCIATION_ROLE_ACCESS.BASIC,
    lockedReason: active
      ? null
      : !planKey
        ? "No plan assigned"
        : !paid
          ? "Payment pending"
          : "Plan expired",
    startDate: apartment?.subscriptionStartDate || null,
    endDate: apartment?.subscriptionEndDate || null,
    paidAt: apartment?.subscriptionPaidAt || null,
  };
};

const canUseAssociationManagement = (apartment, now = new Date()) => {
  const access = buildSubscriptionAccess(apartment, now);
  return Boolean(access.active && access.allowedModules.includes("association-members"));
};

module.exports = {
  ASSOCIATION_ROLE_ACCESS,
  PLAN_MODULES,
  PLAN_RULES,
  addValidity,
  buildSubscriptionAccess,
  canUseAssociationManagement,
  normalizeBillingCycle,
  normalizePlan,
};
