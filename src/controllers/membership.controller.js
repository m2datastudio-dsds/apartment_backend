const { PrismaClient } = require("@prisma/client");

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
