UPDATE "MaintenanceBill" bill
SET
  "amount" = COALESCE(flat."squareFeet", 0) * setting."monthlyAmount",
  "updatedAt" = NOW()
FROM "Flat" flat
JOIN "MaintenanceSetting" setting ON setting."apartmentId" = flat."apartmentId"
WHERE bill."flatId" = flat."id"
  AND COALESCE(bill."status", 'PENDING') <> 'PAID';
