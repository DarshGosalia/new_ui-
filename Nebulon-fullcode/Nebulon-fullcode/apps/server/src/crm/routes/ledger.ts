import express from "express";
import multer from "multer";
import * as pdfParsePkg from "pdf-parse";
const pdfParse = (pdfParsePkg as any).default || pdfParsePkg;
import { store } from "../data/store";
import type { Transaction } from "../data/store";
import { calculateRiskScore } from "../utils/ai-logic";

const upload = multer({ storage: multer.memoryStorage() });

export const ledgerRouter = express.Router();

const processRow = (rawName: string, rawContact: string | undefined, amount: number, type: "CREDIT" | "PAYMENT", dateStr: string) => {
  const name = rawName.trim();
  const contact = rawContact?.trim() || undefined;

  let customer = Array.from(store.customers.values()).find(
    c => c.name.toLowerCase() === name.toLowerCase() || (contact && c.contactNumber === contact)
  );

  if (!customer) {
    customer = {
      id: `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      contactNumber: contact || "Auto-Created via Statement",
      totalPurchases: 0,
      outstandingBalance: 0,
      averagePaymentTimeDays: 0,
      creditLimit: 5000,
      riskStatus: "Green",
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
    store.customers.set(customer.id, customer);
  }

  customer.lastActiveAt = new Date().toISOString();
  if (type === "CREDIT") {
    customer.outstandingBalance += amount;
    customer.totalPurchases += amount;
  } else {
    customer.outstandingBalance = Math.max(0, customer.outstandingBalance - amount);
  }
  customer.riskStatus = calculateRiskScore(customer);

  const tx: Transaction = {
    id: `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    customerId: customer.id,
    date: new Date(dateStr).toISOString(),
    type,
    amount,
    runningBalance: customer.outstandingBalance,
    notes: "Imported via Statement",
  };

  store.transactions.push(tx);
};

// Create Batch JSON Import format
ledgerRouter.post("/batch", (req, res) => {
  const { records } = req.body;
  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ error: "Invalid batch payload" });
  }

  let batchImportedCount = 0;
  records.forEach((row: any) => {
    if (!row.name || !row.amount || typeof row.amount !== 'number' || row.amount <= 0) return;
    processRow(row.name, row.contact, row.amount, row.type || "CREDIT", row.date || new Date().toISOString());
    batchImportedCount++;
  });

  res.json({ success: true, importedCount: batchImportedCount });
});

// Get ledger for a customer or all
ledgerRouter.get("/", (req, res) => {
  const { customerId } = req.query;
  
  let txs = store.transactions;
  if (customerId && typeof customerId === "string") {
    txs = txs.filter(t => t.customerId === customerId);
  }

  // Sort by date descending
  txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  res.json({ transactions: txs });
});

// Add a transaction (Credit or Payment)
ledgerRouter.post("/transactions", (req, res) => {
  const { customerId, type, amount, notes } = req.body;

  if (!customerId || !type || typeof amount !== "number") {
    return res.status(400).json({ error: "Invalid transaction data" });
  }

  const customer = store.customers.get(customerId);
  if (!customer) {
    return res.status(404).json({ error: "Customer not found" });
  }

  customer.lastActiveAt = new Date().toISOString();

  if (type === "CREDIT") {
    customer.outstandingBalance += amount;
    customer.totalPurchases += amount;
  } else if (type === "PAYMENT") {
    customer.outstandingBalance = Math.max(0, customer.outstandingBalance - amount);
    // Ideally we would update averagePaymentTimeDays here based on gap between credit and payment
    // For now we'll simulate by pulling it down slightly if they paid
    if (customer.averagePaymentTimeDays > 2) {
      customer.averagePaymentTimeDays -= 1;
    }
  }

  // Recalculate risk score
  customer.riskStatus = calculateRiskScore(customer);
  store.customers.set(customer.id, customer);

  const tx: Transaction = {
    id: `t-${Date.now()}`,
    customerId,
    date: new Date().toISOString(),
    type,
    amount,
    runningBalance: customer.outstandingBalance,
    notes,
  };

  store.transactions.push(tx);

  res.status(201).json({ transaction: tx, customer });
});

// Upload Bank Statement (CSV or PDF)
ledgerRouter.post("/upload", upload.single("statement"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const mType = req.file.mimetype;
  const originalName = req.file.originalname.toLowerCase();
  let importedCount = 0;

  if (mType === 'application/pdf' || originalName.endsWith('.pdf')) {
    try {
      const data = await pdfParse(req.file.buffer);
      const lines = data.text.split('\n');
      
      lines.forEach((line: string) => {
        // Very basic regex heuristic: Date Description Amount
        const regex = /([0-9]{2}[\/\-][0-9]{2}[\/\-][0-9]{2,4})\s+(.+?)\s+([0-9,]+(\.[0-9]{2})?)\s*(Cr|Dr|Db|Cr)?/i;
        const match = line.match(regex);
        if (match) {
          const date = match[1] || new Date().toISOString();
          const desc = (match[2] || "").trim().substring(0, 40); // limit length
          const amtStr = (match[3] || "0").replace(/,/g, '');
          const indicator = match[5]?.toLowerCase();
          
          let amount = parseFloat(amtStr);
          let type: "CREDIT" | "PAYMENT" = indicator === 'cr' ? "PAYMENT" : indicator === 'dr' || indicator === 'db' ? "CREDIT" : "CREDIT";
          
          if (!isNaN(amount) && amount > 0 && desc.length > 2) {
             processRow(desc, undefined, amount, type, date);
             importedCount++;
          }
        }
      });
      return res.json({ success: true, importedCount });
    } catch (err) {
      return res.status(500).json({ error: "Failed to parse PDF" });
    }
  } else {
    return res.status(400).json({ error: "Only PDFs are supported on this endpoint. Upload CSV via /batch." });
  }
});
