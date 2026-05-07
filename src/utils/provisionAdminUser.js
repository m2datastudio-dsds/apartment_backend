const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { generateUserId } = require("./userId");
const { getRoleId } = require("./roles");

const DEFAULT_ADMIN_PASSWORD = "password123";

async function prepareAdminUser({
  adminName,
  adminEmail,
  adminPhone,
  adminPassword,
  roleName,
  locationId,
  apartmentId,
  organizationName,
  assignedRegion,
  accountStatus,
  onboardingFlow,
}) {
  if (!adminName && !adminEmail && !adminPhone) {
    return null;
  }

  if (!adminName || !adminPhone) {
    const roleLabel = roleName === "LOCATION_ADMIN" ? "location admin" : "apartment admin";
    const error = new Error(`${roleLabel} name and phone are required to create a user account`);
    error.status = 400;
    throw error;
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { mobileNumber: adminPhone },
        ...(adminEmail ? [{ email: adminEmail }] : []),
      ],
    },
    select: { id: true },
  });

  if (existingUser) {
    const error = new Error("User with this admin phone or email already exists");
    error.status = 409;
    throw error;
  }

  const [hashedPassword, userId, roleId] = await Promise.all([
    bcrypt.hash(adminPassword || DEFAULT_ADMIN_PASSWORD, 10),
    generateUserId(),
    getRoleId(roleName),
  ]);

  return {
    userId,
    name: adminName,
    mobileNumber: adminPhone,
    email: adminEmail || null,
    password: hashedPassword,
    roleId,
    locationId: locationId || null,
    apartmentId: apartmentId || null,
    organizationName: organizationName || null,
    assignedRegion: assignedRegion || null,
    accountStatus: accountStatus || "ACTIVE",
    onboardingFlow: onboardingFlow || null,
  };
}

function serializeProvisionedUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    userId: user.userId,
    name: user.name,
    mobileNumber: user.mobileNumber,
    email: user.email,
    roleId: user.roleId,
    locationId: user.locationId,
    apartmentId: user.apartmentId,
    createdAt: user.createdAt,
  };
}

module.exports = {
  prepareAdminUser,
  serializeProvisionedUser,
};
