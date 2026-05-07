const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function enrichMarketplaceItems(items) {
  const flatIds = [...new Set(items.map((item) => item.flatId).filter(Boolean))];

  if (!flatIds.length) {
    return items.map((item) => ({
      ...item,
      sellerFlat: null,
      blockName: null,
      apartmentName: null,
      apartmentId: null,
      residentName: null,
    }));
  }

  const flats = await prisma.flat.findMany({
    where: { id: { in: flatIds } },
    include: {
      apartment: {
        select: { id: true, name: true },
      },
      block: {
        select: { name: true },
      },
      users: {
        where: { role: { name: "RESIDENT" } },
        select: { id: true, name: true, mobileNumber: true, email: true },
      },
    },
  });

  const flatMap = new Map(flats.map((flat) => [flat.id, flat]));

  return items.map((item) => {
    const flat = item.flatId ? flatMap.get(item.flatId) : null;
    const resident = flat?.users?.[0] || null;

    return {
      ...item,
      sellerFlat: flat?.number || null,
      blockName: flat?.block?.name || null,
      apartmentName: flat?.apartment?.name || null,
      apartmentId: flat?.apartment?.id || null,
      residentId: resident?.id || null,
      residentName: resident?.name || item.seller || null,
      residentMobileNumber: resident?.mobileNumber || null,
      residentEmail: resident?.email || null,
    };
  });
}

exports.getMarketplaceItems = async (req, res, next) => {
  try {
    const { status, category, apartmentId } = req.query;
    const items = await prisma.marketplaceItem.findMany({
      where: {
        ...(status ? { status: { equals: String(status), mode: "insensitive" } } : {}),
        ...(category ? { category: { equals: String(category), mode: "insensitive" } } : {}),
        ...(apartmentId
          ? {
              flatId: {
                in: (
                  await prisma.flat.findMany({
                    where: { apartmentId: String(apartmentId) },
                    select: { id: true },
                  })
                ).map((flat) => flat.id),
              },
            }
          : {}),
      },
      orderBy: { postedOn: "desc" },
    });

    res.json({ items: await enrichMarketplaceItems(items) });
  } catch (error) {
    next(error);
  }
};

exports.getMarketplaceItemById = async (req, res, next) => {
  try {
    const item = await prisma.marketplaceItem.findUnique({
      where: { id: req.params.id },
    });

    if (!item) {
      return res.status(404).json({ message: "Marketplace item not found" });
    }

    const [enrichedItem] = await enrichMarketplaceItems([item]);

    res.json({ item: enrichedItem });
  } catch (error) {
    next(error);
  }
};

exports.createMarketplaceItem = async (req, res, next) => {
  try {
    const { title, category, price, status, seller, sellerPhone, sellerAddress, flatId, description } = req.body;

    if (!title || !price || !seller || !sellerPhone || !sellerAddress || !description) {
      return res.status(400).json({
        message: "Title, price, seller flat, phone, address, and description are required",
      });
    }

    const item = await prisma.marketplaceItem.create({
      data: {
        title: String(title).trim(),
        category: category || "Other",
        price: Number(price),
        status: status || "Active",
        seller: String(seller).trim(),
        sellerPhone: String(sellerPhone).trim(),
        sellerAddress: String(sellerAddress).trim(),
        flatId: flatId || null,
        description: String(description).trim(),
      },
    });

    res.status(201).json({
      message: "Marketplace item created successfully",
      item,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateMarketplaceItem = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.price !== undefined) {
      data.price = Number(data.price);
    }

    const item = await prisma.marketplaceItem.update({
      where: { id: req.params.id },
      data,
    });

    res.json({
      message: "Marketplace item updated successfully",
      item,
    });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Marketplace item not found" });
    }
    next(error);
  }
};

exports.deleteMarketplaceItem = async (req, res, next) => {
  try {
    const item = await prisma.marketplaceItem.delete({
      where: { id: req.params.id },
    });

    res.json({
      message: "Marketplace item deleted successfully",
      item,
    });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Marketplace item not found" });
    }
    next(error);
  }
};
