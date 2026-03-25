import express from "express";
import { store } from "../data/store";
import type { Customer } from "../data/store";

export const customersRouter = express.Router();

// Get all customers
customersRouter.get("/", (_req, res) => {
  const customersList = Array.from(store.customers.values());
  res.json({ customers: customersList });
});

// Get single customer
customersRouter.get("/:id", (req, res) => {
  const customer = store.customers.get(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: "Customer not found" });
  }

  // Find transactions
  const transactions = store.transactions.filter(t => t.customerId === customer.id);
  
  res.json({ customer, transactions });
});

// Auto-create customer
customersRouter.post("/auto-create", (req, res) => {
  const { name, contactNumber, initialPurchase } = req.body;

  if (!name || !contactNumber) {
    return res.status(400).json({ error: "Name and contact number required" });
  }

  // Check if exists by phone
  const existing = Array.from(store.customers.values()).find(
    c => c.contactNumber === contactNumber
  );

  if (existing) {
    return res.json({ customer: existing, message: "Customer already exists" });
  }

  const newCustomer: Customer = {
    id: `c-${Date.now()}`,
    name,
    contactNumber,
    totalPurchases: initialPurchase || 0,
    outstandingBalance: 0,
    averagePaymentTimeDays: 0,
    creditLimit: 5000,
    riskStatus: "Green",
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };

  store.customers.set(newCustomer.id, newCustomer);
  res.status(201).json({ customer: newCustomer });
});

// Update credit limit
customersRouter.put("/:id/limit", (req, res) => {
  const customer = store.customers.get(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: "Customer not found" });
  }

  const { creditLimit } = req.body;
  if (typeof creditLimit !== "number") {
    return res.status(400).json({ error: "Invalid credit limit" });
  }

  customer.creditLimit = creditLimit;
  store.customers.set(customer.id, customer);
  res.json({ customer });
});
