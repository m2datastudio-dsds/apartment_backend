const { PrismaClient } = require("@prisma/client");
const {
  PLAN_RULES,
  addValidity,
  buildSubscriptionAccess,
  normalizeBillingCycle,
  normalizePlan,
} = require("../utils/subscriptionAccess");

const prisma = new PrismaClient();

const normalizeFeatures = (features) => {
  if (Array.isArray(features)) {
    return features.map((feature) => String(feature).trim()).filter(Boolean);
  }

  if (typeof features === "string") {
    return features
      .split("\n")
      .map((feature) => feature.trim())
      .filter(Boolean);
  }

  return [];
};

exports.getMembershipPlans = async (req, res, next) => {
  try {
    const { status } = req.query;
    const plans = await prisma.membershipPlan.findMany({
      where: status
        ? { status: { equals: String(status), mode: "insensitive" } }
        : undefined,
      orderBy: { createdAt: "desc" },
    });

    res.json({ plans });
  } catch (error) {
    next(error);
  }
};

exports.getMembershipPlanById = async (req, res, next) => {
  try {
    const plan = await prisma.membershipPlan.findUnique({
      where: { id: req.params.id },
    });

    if (!plan) {
      return res.status(404).json({ message: "Membership plan not found" });
    }

    res.json({ plan });
  } catch (error) {
    next(error);
  }
};

exports.createMembershipPlan = async (req, res, next) => {
  try {
    const { name, price, billingCycle, status, description, features } = req.body;

    if (!name || !price || !description) {
      return res.status(400).json({
        message: "Plan name, price, and description are required",
      });
    }

    const plan = await prisma.membershipPlan.create({
      data: {
        name: String(name).trim(),
        price: Number(price),
        billingCycle: billingCycle || "month",
        status: status || "Active",
        description: String(description).trim(),
        features: normalizeFeatures(features),
      },
    });

    res.status(201).json({
      message: "Membership plan created successfully",
      plan,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateMembershipPlan = async (req, res, next) => {
  try {
    const data = { ...req.body };

    if (data.price !== undefined) {
      data.price = Number(data.price);
    }

    if (data.features !== undefined) {
      data.features = normalizeFeatures(data.features);
    }

    const plan = await prisma.membershipPlan.update({
      where: { id: req.params.id },
      data,
    });

    res.json({
      message: "Membership plan updated successfully",
      plan,
    });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Membership plan not found" });
    }
    next(error);
  }
};

exports.deleteMembershipPlan = async (req, res, next) => {
  try {
    const plan = await prisma.membershipPlan.delete({
      where: { id: req.params.id },
    });

    res.json({
      message: "Membership plan deleted successfully",
      plan,
    });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Membership plan not found" });
    }
    next(error);
  }
};

exports.subscribeMembershipPlan = async (req, res, next) => {
  try {
    const { planId, residentId } = req.body;

    if (!planId) {
      return res.status(400).json({ message: "Plan id is required" });
    }

    const plan = await prisma.membershipPlan.update({
      where: { id: planId },
      data: { residents: { increment: 1 } },
    });

    const subscription = await prisma.membershipSubscription.create({
      data: {
        planId,
        residentId: residentId || "current-resident",
        status: "Active",
      },
    });

    res.status(201).json({
      message: "Membership plan selected successfully",
      subscription,
      plan,
    });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Membership plan not found" });
    }
    next(error);
  }
};

exports.getMembershipSubscriptions = async (_req, res, next) => {
  try {
    const subscriptions = await prisma.membershipSubscription.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json({ subscriptions });
  } catch (error) {
    next(error);
  }
};

exports.getPlanRules = async (_req, res) => {
  res.json({
    data: PLAN_RULES,
    message: "success",
  });
};

exports.getApartmentSubscriptions = async (_req, res, next) => {
  try {
    const apartments = await prisma.apartment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        location: {
          select: {
            name: true,
            city: true,
          },
        },
      },
    });

    res.json({
      data: apartments.map((apartment) => ({
        ...apartment,
        subscriptionAccess: buildSubscriptionAccess(apartment),
      })),
      message: "success",
    });
  } catch (error) {
    next(error);
  }
};

exports.getApartmentSubscriptionStatus = async (req, res, next) => {
  try {
    const { apartmentId } = req.params;

    if (!apartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      select: {
        id: true,
        name: true,
        subscriptionPlan: true,
        subscriptionBillingCycle: true,
        subscriptionPaymentStatus: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        subscriptionPaidAt: true,
      },
    });

    if (!apartment) {
      return res.status(404).json({ message: "Apartment was not found" });
    }

    res.json({
      data: {
        apartment,
        access: buildSubscriptionAccess(apartment),
        planRules: PLAN_RULES,
      },
      message: "success",
    });
  } catch (error) {
    next(error);
  }
};

exports.assignApartmentSubscription = async (req, res, next) => {
  try {
    const { apartmentId } = req.params;
    const { plan, billingCycle, paymentStatus } = req.body;
    const planKey = normalizePlan(plan);
    const cycle = normalizeBillingCycle(billingCycle);
    const status = String(paymentStatus || "PENDING").trim().toUpperCase();

    if (!apartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    if (!planKey || planKey === "NONE" || planKey === "UNASSIGNED") {
      const apartment = await prisma.apartment.update({
        where: { id: apartmentId },
        data: {
          subscriptionPlan: null,
          subscriptionBillingCycle: null,
          subscriptionPaymentStatus: "PENDING",
          subscriptionStartDate: null,
          subscriptionEndDate: null,
          subscriptionPaidAt: null,
        },
        include: {
          location: {
            select: {
              name: true,
              city: true,
            },
          },
        },
      });

      return res.json({
        data: {
          ...apartment,
          subscriptionAccess: buildSubscriptionAccess(apartment),
        },
        message: "subscription plan removed",
      });
    }

    if (!["BASIC", "STANDARD", "PREMIUM"].includes(planKey)) {
      return res.status(400).json({ message: "Plan must be Basic, Standard, or Premium" });
    }

    if (!["PENDING", "PAID"].includes(status)) {
      return res.status(400).json({ message: "Payment status must be PENDING or PAID" });
    }

    const now = new Date();
    const subscriptionDates =
      status === "PAID"
        ? {
            subscriptionStartDate: now,
            subscriptionEndDate: addValidity(now, cycle),
            subscriptionPaidAt: now,
          }
        : {
            subscriptionStartDate: null,
            subscriptionEndDate: null,
            subscriptionPaidAt: null,
          };

    const apartment = await prisma.apartment.update({
      where: { id: apartmentId },
      data: {
        subscriptionPlan: planKey,
        subscriptionBillingCycle: cycle,
        subscriptionPaymentStatus: status,
        ...subscriptionDates,
      },
      include: {
        location: {
          select: {
            name: true,
            city: true,
          },
        },
      },
    });

    res.json({
      data: {
        ...apartment,
        subscriptionAccess: buildSubscriptionAccess(apartment),
      },
      message: status === "PAID" ? "subscription activated" : "subscription saved as payment pending",
    });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Apartment was not found" });
    }
    next(error);
  }
};

exports.payApartmentSubscription = async (req, res, next) => {
  try {
    const { apartmentId } = req.params;
    const { paymentMode, receiptNumber } = req.body;

    if (!apartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    const existingApartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      select: {
        id: true,
        subscriptionPlan: true,
        subscriptionBillingCycle: true,
      },
    });

    if (!existingApartment) {
      return res.status(404).json({ message: "Apartment was not found" });
    }

    const planKey = normalizePlan(existingApartment.subscriptionPlan);
    if (!["BASIC", "STANDARD", "PREMIUM"].includes(planKey)) {
      return res.status(400).json({ message: "A valid plan must be assigned before payment" });
    }

    const cycle = normalizeBillingCycle(existingApartment.subscriptionBillingCycle);
    const now = new Date();
    const apartment = await prisma.apartment.update({
      where: { id: apartmentId },
      data: {
        subscriptionPlan: planKey,
        subscriptionBillingCycle: cycle,
        subscriptionPaymentStatus: "PAID",
        subscriptionStartDate: now,
        subscriptionEndDate: addValidity(now, cycle),
        subscriptionPaidAt: now,
      },
    });

    res.json({
      data: {
        apartment,
        payment: {
          paymentMode: paymentMode || "Online",
          receiptNumber: receiptNumber || `SUB-${Date.now()}`,
        },
        subscriptionAccess: buildSubscriptionAccess(apartment),
      },
      message: "subscription payment successful",
    });
  } catch (error) {
    next(error);
  }
};
