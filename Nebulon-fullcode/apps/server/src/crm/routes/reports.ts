import express from "express";
import PDFDocument from "pdfkit";
import { Parser } from "json2csv";
import ExcelJS from "exceljs";
import { store } from "../data/store";
import { detectChurn } from "../utils/ai-logic";

export const reportsRouter = express.Router();

// Get Dashboard Data
reportsRouter.get("/dashboard", (req, res) => {
  const daysParam = parseInt(req.query.days as string) || 7;
  const customers = Array.from(store.customers.values());
  
  const totalCredit = customers.reduce((sum, c) => sum + c.outstandingBalance, 0);
  
  const overdueCustomers = customers.filter(c => c.riskStatus === "Red" || c.riskStatus === "Amber");
  const overduePayments = overdueCustomers.reduce((sum, c) => sum + c.outstandingBalance, 0);
  
  const atRiskCustomers = customers.filter(c => detectChurn(c));

  // Top customers by total purchases
  const topCustomers = [...customers]
    .sort((a, b) => b.totalPurchases - a.totalPurchases)
    .slice(0, 5);

  // Extract unique active dates from transactions, get the requested recent days, then sort them chronologically
  let uniqueDates = Array.from(new Set(store.transactions.map(t => t.date.split("T")[0] || ""))).filter(Boolean) as string[];
  let activeDays = uniqueDates
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .slice(0, daysParam)
    .reverse();

  // Fallback to today if empty database
  if (activeDays.length === 0) {
    activeDays.push(new Date().toISOString().split("T")[0] as string);
  }

  // Pad the array with preceding days so we ALWAYS have exactly the requested points on the chart
  while (activeDays.length < daysParam) {
    const earliest = activeDays[0] as string;
    const d = new Date(earliest);
    d.setDate(d.getDate() - 1);
    activeDays.unshift(d.toISOString().split("T")[0] as string);
  }

  const trendData = activeDays.map((dateStr: string) => {
    const dayTxs = store.transactions.filter(t => t.date.startsWith(dateStr));
    const given = dayTxs.filter(t => t.type === "CREDIT").reduce((sum, t) => sum + t.amount, 0);
    const received = dayTxs.filter(t => t.type === "PAYMENT").reduce((sum, t) => sum + t.amount, 0);
    
    const dDate = new Date(dateStr);
    const dayName = `${dDate.toLocaleDateString('en-US', { weekday: 'short' })} ${dDate.getDate()}`;
    return { name: dayName, given, received };
  });

  // Calculate Risk Distribution
  const riskDistribution = [
    { name: "Low Risk (Green)", value: customers.filter(c => c.riskStatus === "Green").length, fill: "#10b981" },
    { name: "Medium Risk (Amber)", value: customers.filter(c => c.riskStatus === "Amber").length, fill: "#f59e0b" },
    { name: "High Risk (Red)", value: customers.filter(c => c.riskStatus === "Red").length, fill: "#ef4444" },
  ].filter(r => r.value > 0);

  // Customer-wise Outstanding Data (for BarChart visualization Options)
  const customerChartData = customers
    .map(c => ({
      name: c.name,
      outstanding: c.outstandingBalance,
      creditLimit: c.creditLimit
    }))
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 10); // Show top 10 for bar chart

  // Expected Customer Payments in next 7 days (Approx 20% of Green/Amber outstanding)
  const expectedCustomerPayments = customers
    .filter(c => c.riskStatus === "Green" || c.riskStatus === "Amber")
    .reduce((sum, c) => sum + (c.outstandingBalance * 0.20), 0);

  res.json({
    totalCredit,
    overduePayments,
    expectedCustomerPayments,
    atRiskCount: atRiskCustomers.length,
    topCustomers,
    trendData,
    riskDistribution,
    customerChartData
  });
});

// Create flattened export data map
const getExportData = () => {
  return store.transactions.map(t => {
    const cust = store.customers.get(t.customerId);
    return {
      transactionId: t.id,
      date: new Date(t.date).toLocaleDateString(),
      customerName: cust?.name || "Unknown",
      contact: cust?.contactNumber || "",
      type: t.type,
      amount: t.amount,
      runningBalance: t.runningBalance,
      notes: t.notes || ""
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// Export CSV
reportsRouter.get("/export/csv", (_req, res) => {
  try {
    const data = getExportData();
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment(`Ledger_Export_${new Date().toISOString().split("T")[0]}.csv`);
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate CSV" });
  }
});

// Export Excel
reportsRouter.get("/export/excel", async (_req, res) => {
  try {
    const data = getExportData();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Ledger Transactions");

    worksheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Customer", key: "customerName", width: 25 },
      { header: "Contact", key: "contact", width: 15 },
      { header: "Type", key: "type", width: 12 },
      { header: "Amount (₹)", key: "amount", width: 15 },
      { header: "Balance (₹)", key: "runningBalance", width: 15 },
      { header: "Notes", key: "notes", width: 30 },
    ];

    worksheet.addRows(data);
    
    // Style header
    worksheet.getRow(1).font = { bold: true };

    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment(`Ledger_Export_${new Date().toISOString().split("T")[0]}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate Excel" });
  }
});

// Export PDF Ledger Book
reportsRouter.get("/export/pdf", (_req, res) => {
  try {
    const data = getExportData();
    
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Ledger_Export_${new Date().toISOString().split("T")[0]}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text("Ledger Transactions Export", { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown(2);

    data.forEach((row, i) => {
      // Basic list view rendering due to standard PDFKit table limitations
      doc.fontSize(12).font('Helvetica-Bold').text(`${row.date} - ${row.customerName}`);
      doc.fontSize(10).font('Helvetica').text(`Type: ${row.type} | Amount: Rs.${row.amount} | Balance: Rs.${row.runningBalance}`);
      if (row.notes) doc.text(`Notes: ${row.notes}`);
      doc.moveDown(0.5);
      
      if (i % 8 === 0 && i !== 0) doc.addPage(); // Very manual paging roughly
    });

    doc.end();
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// Generate GST Invoice PDF
reportsRouter.post("/invoice", (req, res) => {
  const { customerId, items, amount } = req.body;
  const customer = store.customers.get(customerId);

  if (!customer) {
    return res.status(404).json({ error: "Customer not found" });
  }

  const doc = new PDFDocument({ margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=invoice-${customer.id}.pdf`);
  doc.pipe(res);

  // Simple Invoice Template
  doc.fontSize(20).text("TAX INVOICE", { align: "center" });
  doc.moveDown();
  
  doc.fontSize(12).text(`Billed To: ${customer.name}`);
  doc.text(`Contact: ${customer.contactNumber}`);
  doc.text(`Date: ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  doc.text("Description", 50, doc.y);
  doc.text("Amount (INR)", 400, doc.y);
  doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke();
  doc.moveDown();

  (items || []).forEach((item: any) => {
    doc.text(item.name || "Item", 50, doc.y);
    doc.text((item.price || 0).toString(), 400, doc.y);
    doc.moveDown();
  });

  doc.moveDown();
  doc.fontSize(14).text(`Total Amount: Rs. ${amount}`, { align: "right" });

  doc.end();
});

// Generate Customer Statement PDF
reportsRouter.get("/statement/:customerId", (req, res) => {
  const customer = store.customers.get(req.params.customerId);

  if (!customer) {
    return res.status(404).json({ error: "Customer not found" });
  }

  const txs = store.transactions.filter(t => t.customerId === customer.id);

  const doc = new PDFDocument({ margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=statement-${customer.id}.pdf`);
  doc.pipe(res);

  // Statement Template
  doc.fontSize(20).text("ACCOUNT STATEMENT", { align: "center" });
  doc.moveDown();
  
  doc.fontSize(12).text(`Customer: ${customer.name}`);
  doc.text(`Contact: ${customer.contactNumber}`);
  doc.text(`Total Outstanding: Rs. ${customer.outstandingBalance}`);
  doc.text(`Date: ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  doc.text("Date", 50, doc.y);
  doc.text("Type", 150, doc.y);
  doc.text("Amount", 300, doc.y);
  doc.text("Balance", 450, doc.y);
  doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke();
  doc.moveDown();

  txs.forEach(t => {
    doc.text(new Date(t.date).toLocaleDateString(), 50, doc.y);
    doc.text(t.type, 150, doc.y);
    doc.text(t.amount.toString(), 300, doc.y);
    doc.text(t.runningBalance.toString(), 450, doc.y);
    doc.moveDown();
  });

  doc.end();
});
