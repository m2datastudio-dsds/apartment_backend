const prisma = require("../lib/prisma");

const ROLE_NAMES = [
  "SYSTEM_ADMIN",
  "PROMOTER",
  "LOCATION_ADMIN",
  "APARTMENT_ADMIN",
  "RESIDENT",
  "STAFF",
];

const roleInclude = {
  role: {
    select: {
      id: true,
      name: true,
      description: true,
    },
  },
};

function getUserRoleName(user) {
  return user.role?.name || user.role || null;
}

function validateRoleName(roleName) {
  return ROLE_NAMES.includes(roleName);
}

async function getRoleId(roleName) {
  const role = await prisma.role.upsert({
    where: { name: roleName },
    update: {},
    create: {
      id: roleName,
      name: roleName,
    },
    select: { id: true },
  });

  return role.id;
}

function roleWhere(roleName) {
  return {
    role: {
      is: {
        name: roleName,
      },
    },
  };
}

module.exports = {
  ROLE_NAMES,
  getRoleId,
  getUserRoleName,
  roleInclude,
  roleWhere,
  validateRoleName,
};
