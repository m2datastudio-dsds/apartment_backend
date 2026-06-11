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
  const { apartmentId, residentId, staffId } = req.query;

  const data = moveRequests
    .filter((item) => !apartmentId || item.apartmentId === apartmentId)
    .filter((item) => !residentId || item.residentId === residentId)
    .filter((item) => !staffId || item.assignedStaffId === staffId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ data, message: "success" });
};

exports.reviewMoveRequest = async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;
  const record = moveRequests.find((item) => item.id === requestId);
  if (!record) return res.status(404).json({ message: "move request not found" });

  const decision = status || "APPROVED";
  if (!["APPROVED", "REJECTED"].includes(decision)) {
    return res.status(400).json({ message: "status must be APPROVED or REJECTED" });
  }

  if (!record.staffReport || record.status !== "STAFF_REPORTED") {
    return res.status(400).json({ message: "Staff report is required before admin approval or rejection" });
  }

  record.status = decision;
  record.adminDecision = decision;
  record.reviewedAt = new Date().toISOString();
  return res.json({ data: record, message: `move request ${decision.toLowerCase()}` });
};

exports.assignStaff = async (req, res) => {
  const { requestId } = req.params;
  const { staffId, staffName, staffPhone } = req.body;
  const record = moveRequests.find((item) => item.id === requestId);

  if (!record) return res.status(404).json({ message: "move request not found" });

  if (!staffId) {
    return res.status(400).json({ message: "staffId is required" });
  }

  if (!["REQUESTED", "ASSIGNED"].includes(record.status)) {
    return res.status(400).json({ message: "Staff can be assigned only before the staff report is submitted" });
  }

  record.assignedStaffId = staffId;
  record.assignedStaffName = staffName || "Staff";
  record.assignedStaffPhone = staffPhone || "";
  record.status = "ASSIGNED";
  record.assignedAt = new Date().toISOString();

  return res.json({ data: record, message: "staff assigned to move request" });
};

exports.submitStaffReport = async (req, res) => {
  const { requestId } = req.params;
  const {
    staffId,
    staffName,
    reportNotes,
    inspectionStatus,
    vehicleNumber,
    reportFileName,
    reportFileType,
    reportFileData,
  } = req.body;
  const record = moveRequests.find((item) => item.id === requestId);

  if (!record) return res.status(404).json({ message: "move request not found" });

  if (!staffId) {
    return res.status(400).json({ message: "staffId is required" });
  }

  if (record.assignedStaffId && record.assignedStaffId !== staffId) {
    return res.status(403).json({ message: "move request is assigned to another staff member" });
  }

  if (!["ASSIGNED", "STAFF_REPORTED"].includes(record.status)) {
    return res.status(400).json({ message: "Staff report can be submitted only after admin assigns staff" });
  }

  record.staffReport = {
    staffId,
    staffName: staffName || record.assignedStaffName || "Staff",
    inspectionStatus: inspectionStatus || "CHECKED",
    vehicleNumber: vehicleNumber || "",
    reportNotes: reportNotes || "",
    reportFileName: reportFileName || "",
    reportFileType: reportFileType || "",
    reportFileData: reportFileData || "",
    submittedAt: new Date().toISOString(),
  };
  record.status = "STAFF_REPORTED";
  record.staffReportedAt = record.staffReport.submittedAt;

  return res.json({ data: record, message: "staff move report uploaded" });
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
