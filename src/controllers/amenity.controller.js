const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

exports.getAmenities = async (req, res, next) => {
  try {
    const { apartmentId } = req.query;

    if (!apartmentId) {
      return res.status(400).json({ message: "apartmentId is required" });
    }

    const amenities = await prisma.amenity.findMany({
      where: { apartmentId },
      include: {
        _count: {
          select: { bookings: true },
        },
        bookings: {
          orderBy: { startAt: "desc" },
          take: 3,
          include: {
            resident: {
              select: {
                id: true,
                name: true,
                flat: {
                  select: {
                    number: true,
                    block: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ data: amenities, message: "success" });
  } catch (error) {
    return next(error);
  }
};

exports.createAmenity = async (req, res, next) => {
  try {
    const {
      apartmentId,
      name,
      type,
      description,
      location,
      capacity,
      openingTime,
      closingTime,
      bookingRules,
      status,
    } = req.body;

    if (!apartmentId || !name?.trim()) {
      return res.status(400).json({ message: "apartmentId and name are required" });
    }

    const normalizedCapacity = capacity === undefined || capacity === null || capacity === ""
      ? null
      : Number(capacity);

    if (normalizedCapacity !== null && (!Number.isInteger(normalizedCapacity) || normalizedCapacity < 1)) {
      return res.status(400).json({ message: "capacity must be a positive number" });
    }

    const amenity = await prisma.amenity.create({
      data: {
        apartmentId,
        name: name.trim(),
        type: type?.trim() || null,
        description: description?.trim() || null,
        location: location?.trim() || null,
        capacity: normalizedCapacity,
        openingTime: openingTime?.trim() || null,
        closingTime: closingTime?.trim() || null,
        bookingRules: bookingRules?.trim() || null,
        status: status || "AVAILABLE",
      },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });

    return res.status(201).json({ data: amenity, message: "amenity created" });
  } catch (error) {
    return next(error);
  }
};

exports.updateAmenityStatus = async (req, res, next) => {
  try {
    const { amenityId } = req.params;
    const { status } = req.body;

    if (!["AVAILABLE", "NOT_AVAILABLE"].includes(status)) {
      return res.status(400).json({ message: "status must be AVAILABLE or NOT_AVAILABLE" });
    }

    const amenity = await prisma.amenity.update({
      where: { id: amenityId },
      data: { status },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });

    return res.json({ data: amenity, message: "amenity availability updated" });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "amenity not found" });
    }

    return next(error);
  }
};

exports.bookAmenity = async (req, res, next) => {
  try {
    const { amenityId, residentId, startAt, endAt } = req.body;
    const amenity = await prisma.amenity.findUnique({ where: { id: amenityId } });

    if (!amenity) {
      return res.status(404).json({ message: "amenity not found" });
    }

    if (amenity.status === "NOT_AVAILABLE") {
      return res.status(400).json({ message: "amenity is not available for booking" });
    }

    const booking = await prisma.amenityBooking.create({
      data: { amenityId, residentId, startAt: new Date(startAt), endAt: new Date(endAt) },
    });
    res.status(201).json({ data: booking, message: "amenity booked" });
  } catch (error) {
    next(error);
  }
};

exports.reviewBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.amenityBooking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ message: "booking not found" });
    return res.json({ data: booking, message: "booking review fetched" });
  } catch (error) {
    return next(error);
  }
};
