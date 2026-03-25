export type RiskStatus = "Green" | "Amber" | "Red";

import fs from "fs";
import path from "path";

export interface Customer {
  id: string;
  name: string;
  contactNumber: string;
  totalPurchases: number;
  outstandingBalance: number;
  averagePaymentTimeDays: number;
  creditLimit: number;
  riskStatus: "Green" | "Amber" | "Red";
  createdAt: string;
  lastActiveAt: string;
}

export interface Transaction {
  id: string;
  customerId: string;
  date: string;
  type: "CREDIT" | "PAYMENT";
  amount: number;
  runningBalance: number;
  notes?: string;
}

export interface ReminderTemplate {
  id: string;
  name: string;
  template: string;
}

const dbPath = path.join(process.cwd(), "crm-db.json");

let initialData: any = {
  customers: [],
  transactions: [],
  reminderTemplates: [
    {
      id: "rm-1",
      name: "Payment Reminder",
      template: "Hello {{name}}, your due amount is {{amount}}. Please pay at your earliest convenience.",
    },
    {
      id: "rm-2",
      name: "New Product Launch",
      template: "Hi {{name}}, we have exciting new arrivals! Visit us soon.",
    },
    {
      id: "rm-3",
      name: "Festival Offer",
      template: "Happy Holidays {{name}}! Enjoy 10% off your next purchase.",
    },
  ]
};

if (fs.existsSync(dbPath)) {
  try {
    initialData = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
  } catch(e) {}
}

// In-Memory Data Store
export const store = {
  customers: new Map<string, Customer>(initialData.customers),
  transactions: initialData.transactions as Transaction[],
  reminderTemplates: initialData.reminderTemplates as ReminderTemplate[],
};

// Periodically flush memory to disk so hot-reloads don't destroy data
setInterval(() => {
  const snapshot = {
    customers: Array.from(store.customers.entries()),
    transactions: store.transactions,
    reminderTemplates: store.reminderTemplates
  };
  fs.writeFileSync(dbPath, JSON.stringify(snapshot, null, 2));
}, 3000);
