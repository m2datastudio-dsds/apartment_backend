const prisma = require("../lib/prisma");

async function generateUserId() {
  let nextValue = 1000;

  while (true) {
    const userId = `US${String(nextValue).padStart(4, "0")}`;
    const existingUser = await prisma.user.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!existingUser) {
      return userId;
    }

    nextValue += 1;
  }
}

module.exports = {
  generateUserId,
};
