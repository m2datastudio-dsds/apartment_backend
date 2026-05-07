const emergencyEvents = [];

exports.triggerPanic = async (req, res) => {
  const event = { id: `${Date.now()}`, ...req.body, triggeredAt: new Date().toISOString() };
  emergencyEvents.push(event);
  res.status(201).json({ data: event, message: "panic alert triggered" });
};

exports.getEmergencyEvents = async (_req, res) => {
  res.json({ data: emergencyEvents, message: "success" });
};
