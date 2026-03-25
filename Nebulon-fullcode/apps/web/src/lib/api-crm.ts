export const API_BASE = "/api/crm";

export async function fetchCustomers() {
  const res = await fetch(`${API_BASE}/customers`);
  if (!res.ok) throw new Error("Failed to fetch customers");
  return res.json();
}

export async function fetchCustomer(id: string) {
  const res = await fetch(`${API_BASE}/customers/${id}`);
  if (!res.ok) throw new Error("Failed to fetch customer");
  return res.json();
}

export async function addCustomer(data: { name: string; contactNumber: string; initialPurchase?: number }) {
  const res = await fetch(`${API_BASE}/customers/auto-create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add customer");
  const json = await res.json();
  if (json.message === "Customer already exists") throw new Error("A customer with this contact number already exists.");
  return json;
}

export async function uploadStatement(file: File) {
  const formData = new FormData();
  formData.append("statement", file);

  const res = await fetch(`${API_BASE}/ledger/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload pdf statement");
  return res.json();
}

export async function uploadBatch(records: any[]) {
  const res = await fetch(`${API_BASE}/ledger/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ records }),
  });
  if (!res.ok) throw new Error("Failed to upload batch");
  return res.json();
}

export async function fetchLedger(customerId?: string) {
  const url = customerId ? `${API_BASE}/ledger?customerId=${customerId}` : `${API_BASE}/ledger`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch ledger");
  return res.json();
}

export async function fetchDashboard(days: number = 7) {
  const res = await fetch(`${API_BASE}/reports/dashboard?days=${days}`);
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

export async function addTransaction(data: { customerId: string; type: "CREDIT" | "PAYMENT"; amount: number; notes?: string }) {
  const res = await fetch(`${API_BASE}/ledger/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add transaction");
  return res.json();
}

export async function fetchReminderTemplates() {
  const res = await fetch(`${API_BASE}/reminders/templates`);
  if (!res.ok) throw new Error("Failed to fetch templates");
  return res.json();
}
