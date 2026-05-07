const moveRequests = [];

exports.requestMove = async (req, res) => {
  const { apartmentId, residentId, residentName, flatNumber, moveType, moveDate, timeSlot } = req.body;

  if (!apartmentId || !residentId || !moveType || !moveDate || !timeSlot) {
    return res.status(400).json({
      message: "apartmentId, residentId, moveType, moveDate, and timeSlot are required",
    });
  }

  const record = {
    id: `${Date.now()}`,
    apartmentId,
    residentId,
    residentName: residentName || "Resident",
    flatNumber: flatNumber || "-",
    moveType,
    moveDate,
    timeSlot,
    notes: req.body.notes || "",
    photoNotes: req.body.photoNotes || "",
    checklist: req.body.checklist || [],
    status: "REQUESTED",
    createdAt: new Date().toISOString(),
  };
  moveRequests.push(record);
  res.status(201).json({ data: record, message: "move request created" });
};

exports.listMoveRequests = async (req, res) => {
  const { apartmentId, residentId } = req.query;

  const data = moveRequests
    .filter((item) => !apartmentId || item.apartmentId === apartmentId)
    .filter((item) => !residentId || item.residentId === residentId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ data, message: "success" });
};

exports.reviewMoveRequest = async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;
  const record = moveRequests.find((item) => item.id === requestId);
  if (!record) return res.status(404).json({ message: "move request not found" });
  record.status = status || "APPROVED";
  record.reviewedAt = new Date().toISOString();
  return res.json({ data: record, message: "move request reviewed" });
};

exports.completeInspection = async (req, res) => {
  const { requestId } = req.params;
  const record = moveRequests.find((item) => item.id === requestId);
  if (!record) return res.status(404).json({ message: "move request not found" });
  record.status = "COMPLETED";
  record.inspection = req.body;
  record.completedAt = new Date().toISOString();
  return res.json({ data: record, message: "inspection completed" });
};
