const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { getRoleId, getUserRoleName, ROLE_NAMES, roleInclude, validateRoleName } = require("../utils/roles");
const { generateUserId } = require("../utils/userId");

function sanitizeUser(user) {
  return {
    id: user.id,
    userId: user.userId,
    name: user.name,
    organizationName: user.organizationName,
    accessLevel: user.accessLevel,
    assignedRegion: user.assignedRegion,
    accountStatus: user.accountStatus,
    onboardingFlow: user.onboardingFlow,
    mobileNumber: user.mobileNumber,
    email: user.email,
    role: getUserRoleName(user),
    roleId: user.roleId,
    locationId: user.locationId,
    apartmentId: user.apartmentId,
    flatId: user.flatId,
    createdAt: user.createdAt,
  };
}

exports.register = async (req, res, next) => {
  try {
    const { name, mobileNumber, email, password, role, locationId, apartmentId, flatId } = req.body;

    if (!name || !mobileNumber || !password || !role) {
      return res.status(400).json({
        message: "name, mobileNumber, password, and role are required",
      });
    }

    if (!validateRoleName(role)) {
      return res.status(400).json({
        message: `role must be one of: ${ROLE_NAMES.join(", ")}`,
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { mobileNumber },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existingUser) {
      return res.status(409).json({ message: "User with this mobile number or email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await generateUserId();
    const roleId = await getRoleId(role);

    const user = await prisma.user.create({
      data: {
        userId,
        name,
        mobileNumber,
        email: email || null,
        password: hashedPassword,
        roleId,
        locationId: locationId || null,
        apartmentId: apartmentId || null,
        flatId: flatId || null,
      },
      include: roleInclude,
    });

    res.status(201).json({
      message: "User registered successfully",
      data: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { identifier, email, userId, password } = req.body;
    const resolvedIdentifier = identifier || userId || email;

    if (!resolvedIdentifier || !password) {
      return res.status(400).json({ message: "email or userId, and password are required" });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { userId: resolvedIdentifier },
          { email: resolvedIdentifier },
          { mobileNumber: resolvedIdentifier },
        ],
      },
      include: roleInclude,
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { sub: user.id, role: getUserRoleName(user) },
      process.env.JWT_SECRET || "apartment-secret-key",
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      data: {
        token,
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};
