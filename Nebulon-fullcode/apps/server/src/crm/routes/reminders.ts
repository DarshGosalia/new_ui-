import express from "express";
import { store } from "../data/store";

export const remindersRouter = express.Router();

// Get all reminder templates
remindersRouter.get("/templates", (_req, res) => {
  res.json({ templates: store.reminderTemplates });
});

// Simulate sending a bulk message
remindersRouter.post("/messages/bulk", (req, res) => {
  const { customerIds, templateId, customMessage } = req.body;

  if (!customerIds || !Array.isArray(customerIds)) {
    return res.status(400).json({ error: "Invalid customer IDs" });
  }

  const template = store.reminderTemplates.find(t => t.id === templateId);
  const msgTemplate = customMessage || (template ? template.template : "");

  if (!msgTemplate) {
    return res.status(400).json({ error: "Message template required" });
  }

  let sentCount = 0;
  const failed = [];

  for (const cid of customerIds) {
    const customer = store.customers.get(cid);
    if (customer) {
      // Simulate WhatsApp send
      // const personalizedMsg = msgTemplate
      //   .replace("{{name}}", customer.name)
      //   .replace("{{amount}}", customer.outstandingBalance.toString());
      
      // We would call WhatsApp API here.
      sentCount++;
    } else {
      failed.push(cid);
    }
  }

  res.json({ success: true, sentCount, failed });
});
