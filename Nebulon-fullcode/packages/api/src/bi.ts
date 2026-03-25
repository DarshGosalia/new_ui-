import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { env } from "@github_fin/env/server";

export type SalesRow = {
  customerId: number;
  date: string;
  region: string;
  product: string;
  vendor: string;
  sales: number;
  profit: number;
  customerAge: number;
  customerGender: "Male" | "Female" | string;
  cogsCategory: string;
  cogsAmount: number;
  opexCategory: string;
  opexAmount: number;
};

export type Filters = {
  regions?: string[];
  products?: string[];
  startDate?: string;
  endDate?: string;
};

export type ComparisonResult = {
  currentValue: number;
  comparisonValue: number;
  absoluteChange: number;
  percentageChange: number;
};

export type PeriodComparison = "previousPeriod" | "yoY" | "custom" | null;

export type BalanceSheet = {
  assets: {
    cash: number;
    inventory: number;
    receivables: number;
    total: number;
  };
  liabilities: {
    supplierDues: number;
    payables: number;
    total: number;
  };
  netEquity: number;
  notes: string[];
};

export type ExpenseBreakdown = {
  byCategory: Array<{
    name: string;
    value: number;
    percentage: number;
    color: string;
  }>;
  totalExpenses: number;
  topCategory: {
    name: string;
    amount: number;
    percentage: number;
  } | null;
  transactions: Array<{
    date: string;
    customerId: number;
    region: string;
    product: string;
    category: string;
    amount: number;
  }>;
};

export type CashInHandSummary = {
  bankBalance: number;
  cashOnHand: number;
  totalLiquidBalance: number;
  latestChange: {
    date: string;
    customerId: number;
    region: string;
    product: string;
    sales: number;
    cogsAmount: number;
    opexAmount: number;
    netCashDelta: number;
  } | null;
};

export type ExpenseSpikeAlert = {
  kind: "singleTransaction" | "dailyCategoryTotal";
  date: string;
  category: string;
  vendor: string;
  amount: number;
  baseline: number;
  threshold: number;
  multiplier: number;
};

export type RevenueDropAlert = {
  periodType: "Daily" | "Weekly";
  periodKey: string;
  currentRevenue: number;
  priorMonthRevenue: number;
  dropPct: number;
  droppedStreams: Array<{
    stream: string;
    current: number;
    priorMonth: number;
    change: number;
    changePct: number;
  }>;
};

export type AnomalyEngineSummary = {
  expenseSpikeAlerts: ExpenseSpikeAlert[];
  revenueDropAlerts: RevenueDropAlert[];
  cashFlowWarning: CashFlowWarningAlert;
  duplicatePaymentFlags: DuplicatePaymentFlag[];
  unusualVendorAlerts: UnusualVendorAlert[];
  marginErosionAlert: MarginErosionAlert;
  outstandingCollections: OutstandingCollectionAlert[];
  positiveSpikeAlerts: PositiveSpikeAlert[];
  customRuleAlerts: CustomRuleAlert[];
  aiGuidance: AnomalyAiGuidance;
};

export type AnomalyAiGuidance = {
  overview: string;
  expenseSpikes: string;
  revenueDrops: string;
  cashFlow: string;
  duplicatePayments: string;
  unusualVendors: string;
  marginErosion: string;
  outstandingCollections: string;
  positiveSpikes: string;
  customRules: string;
  alertFatigue: string;
};

export type AlertFatigueSignal = {
  ignoredStreak: number;
  markAsNormal: boolean;
};

export type CustomAlertRuleType = "singleExpenseAbove" | "dailyRevenueBelow" | "weeklyRevenueBelow";

export type CustomAlertRule = {
  id: string;
  name: string;
  type: CustomAlertRuleType;
  threshold: number;
  enabled: boolean;
};

export type CustomRuleAlert = {
  ruleId: string;
  ruleName: string;
  ruleType: CustomAlertRuleType;
  periodKey: string;
  actualValue: number;
  threshold: number;
  message: string;
};

export type OutstandingCollectionAlert = {
  customerId: number;
  outstandingAmount: number;
  daysOverdue: number;
  lastTransactionDate: string;
  reminderMessage: string;
};

export type PositiveSpikeAlert = {
  date: string;
  weekday: string;
  revenue: number;
  baseline: number;
  multiplier: number;
  message: string;
  topStreams: Array<{
    stream: string;
    revenue: number;
    sharePct: number;
  }>;
};

export type CashFlowWarningAlert = {
  triggered: boolean;
  minimumBuffer: number;
  currentBalance: number;
  daysUntilCrunch: number | null;
  crunchDate: string | null;
  largestUpcomingOutflow: {
    date: string;
    amount: number;
  } | null;
  projection: Array<{
    date: string;
    delta: number;
    projectedBalance: number;
  }>;
};

export type DuplicatePaymentFlag = {
  vendor: string;
  hoursApart: number;
  amountDifferencePct: number;
  first: {
    date: string;
    amount: number;
    category: string;
    product: string;
  };
  second: {
    date: string;
    amount: number;
    category: string;
    product: string;
  };
};

export type CashForecastMode = "conservative" | "realistic";

export type RecurringExpenseRule = {
  id: string;
  name: string;
  amount: number;
  dayOfMonth: number;
};

export type WhatIfScenarioType = "stockLoan" | "manualCollection";

export type WhatIfScenario = {
  id: string;
  name: string;
  type: WhatIfScenarioType;
  amount: number;
  date: string;
};

export type CashForecastPoint = {
  date: string;
  openingBalance: number;
  baselineInflow: number;
  baselineOutflow: number;
  receivableInflow: number;
  payableOutflow: number;
  recurringOutflow: number;
  scenarioInflow: number;
  netDelta: number;
  projectedBalance: number;
  isDipZone: boolean;
};

export type CashCalendarEntry = {
  dueDate: string;
  amount: number;
  status: "overdue" | "upcoming";
};

export type SeasonalBaselinePoint = {
  date: string;
  priorYearBalance: number | null;
};

export type CashForecastSummary = {
  mode: CashForecastMode;
  horizonDays: 30 | 60 | 90;
  minimumBuffer: number;
  currentBalance: number;
  burnRatePerDay: number;
  runwayDays: number | null;
  projection: CashForecastPoint[];
  totals: {
    receivablesScheduled: number;
    payablesScheduled: number;
    recurringScheduled: number;
  };
  dipZone: {
    dipDays: number;
    nextDipDate: string | null;
  };
  receivablesCalendar: CashCalendarEntry[];
  payablesCalendar: CashCalendarEntry[];
  overduePayables: {
    count: number;
    totalAmount: number;
  };
  seasonalBaseline: {
    available: boolean;
    matchedPoints: number;
    points: SeasonalBaselinePoint[];
  };
  breakEven: {
    date: string | null;
    isLossPeriod: boolean;
    projectedMonthRevenue: number;
    projectedMonthExpense: number;
  };
};

export type UnusualVendorAlert = {
  scenario: "newVendorSignificant" | "vendorMonthlySpike";
  vendor: string;
  amount: number;
  baselineAmount: number;
  multiplier: number;
  dateOrMonth: string;
};

export type MarginErosionAlert = {
  triggered: boolean;
  netMarginTarget: number;
  weeksBelowTarget: number;
  currentNetMargin: number | null;
  erosionWindow: Array<{
    weekStart: string;
    netMargin: number;
  }>;
  topExpenseDrivers: Array<{
    category: string;
    increaseAmount: number;
  }>;
};

// ============================================================================
// PHASE 1: GST & TAX COMPLIANCE TYPES
// ============================================================================

/**
 * GST Invoice for sales (B2B, B2C, B2BSE)
 * Used for GSTR-1 filing and GST calculation
 */
export type GSTInvoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceType: "B2B" | "B2C" | "B2BSE"; // B2B=with GST, B2C=retail, B2BSE=export
  
  // Buyer Details
  buyerName: string;
  buyerGSTIN?: string; // Required for B2B
  buyerAddress?: string;
  
  // Item Details
  items: Array<{
    hsn_sac_code: string; // Harmonized System of Nomenclature / Services Accounting Code
    description: string;
    quantity: number;
    unitOfMeasure: string; // "NOS", "UNT", "PKT", "MET", etc.
    unitPrice: number; // Price per unit (before GST)
    grossAmount: number; // Quantity × UnitPrice
    gstRate: "0%" | "5%" | "12%" | "18%" | "28%";
    cgstAmount: number; // Central GST (50% of total GST for domestic)
    sgstAmount: number; // State GST (50% of total GST for domestic)
    igstAmount: number; // Integrated GST (for inter-state/export)
    taxableAmount: number;
    totalAmount: number; // grossAmount + GST
  }>;
  
  // Totals
  totalGrossAmount: number;
  totalTaxableAmount: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalGSTAmount: number;
  totalInvoiceAmount: number;
  
  // Status
  status: "draft" | "issued" | "cancelled";
  cancelledDate?: string;
};

/**
 * Purchase Transaction with GST tracking for ITC
 * Used for GSTR-2 matching and ITC eligibility tracking
 */
export type GSSTPurchaseTransaction = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  
  // Supplier Details
  supplierName: string;
  supplierGSTIN?: string; // Critical for ITC eligibility
  supplierAddress?: string;
  supplierRegistrationType: "registered" | "unregistered" | "composition";
  
  // Item Details
  items: Array<{
    hsn_sac_code: string;
    description: string;
    quantity: number;
    unitOfMeasure: string;
    unitPrice: number;
    grossAmount: number;
    gstRate: "0%" | "5%" | "12%" | "18%" | "28%";
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    taxableAmount: number;
    totalAmount: number;
  }>;
  
  // Totals
  totalGrossAmount: number;
  totalTaxableAmount: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalGSTAmount: number;
  totalInvoiceAmount: number;
  
  // Categorization
  category: "COGS" | "Services" | "CapitalAssets" | "OPEX" | "Other";
  
  // ITC Tracking
  itcEligibility: "full" | "partial" | "blocked";
  itcBlockReason?: string; // e.g., "Supplier Unregistered", "Blocked Category", "Invoice Rejected"
  itcClaimable: {
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  };
  
  // Compliance
  gstr2aMatched: boolean;
  gstr2aMatchDate?: string;
  gstr2aStatus?: "accepted" | "rejected" | "pending" | "amended";
  paymentStatus: "unpaid" | "partial" | "paid";
  paymentDate?: string;
};

/**
 * Stock Item Inventory at Cost
 * For inventory valuation reports and balance sheet
 */
export type StockItem = {
  id: string;
  itemName: string;
  itemCode?: string;
  category: string;
  hsn_sac_code: string; // For GST mapping
  
  // Inventory Valuation
  unitCost: number; // Weighted Average Cost or FIFO
  currentQuantity: number;
  valuationAmount: number; // quantity × unitCost
  valuationMethod: "FIFO" | "LIFO" | "WeightedAverage" | "StandardCost";
  
  // Tracking
  lastPurchaseDate: string;
  lastPurchasePrice: number;
  lastInventoryDate: string;
};

/**
 * GST Transaction Entry (summarized for real-time tracking)
 * Used for building GST Dashboard (Output, Input, ITC Balance)
 */
export type GSTTransactionEntry = {
  id: string;
  transactionId: string; // Link to invoice or purchase
  transactionType: "invoice" | "purchase";
  date: string;
  month: string; // "MM/YYYY" for grouping
  
  // GST Details
  gstRate: "0%" | "5%" | "12%" | "18%" | "28%";
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGSTAmount: number;
  
  // ITC Tracking (for purchases only)
  itcEligible: boolean;
  itcClaimable: number;
  itcStatus: "available" | "pending" | "blocked" | "expired";
  expiryDate?: string; // 2 years from invoice date
};

/**
 * GST Liability Summary (Real-time Dashboard)
 * Aggregated monthly view of Output GST, Input GST, and Net Liability
 */
export type GSTLiabilitySummary = {
  month: string; // "MM/YYYY"
  asOfDate: string;
  
  // Output GST (Collected on Sales)
  outputGST: {
    b2b: {
      cgst: number;
      sgst: number;
      igst: number;
      total: number;
    };
    b2c: {
      amount: number; // Usually combined
      total: number;
    };
    b2bse: {
      igst: number; // Export usually 0%
      total: number;
    };
    totalOutput: number;
  };
  
  // Input GST (Paid on Purchases - ITC Eligible Only)
  inputGST: {
    eligible: {
      cgst: number;
      sgst: number;
      igst: number;
      total: number;
    };
    blocked: {
      amount: number; // From unregistered or blocked categories
    };
    totalInput: number;
    totalBlocked: number;
  };
  
  // Net Liability
  netGSTLiability: number; // outputGST.totalOutput - inputGST.eligible.total
  paymentStatus: "due" | "partial" | "paid" | "credit";
  paymentDueDate: string;
  
  // ITC Balance Tracking
  itcAvailable: number;
  itcUtilized: number;
  itcExpiring: number; // Due to expire within 30 days
};

/**
 * Tax Due Date Configuration
 * For compliance calendar and deadline alerts
 */
export type TaxDeadlineConfig = {
  id: string;
  name: string;
  frequency: "monthly" | "quarterly" | "annual" | "bi-annual";
  dueType: "GSTR1" | "GSTR2" | "GSTR3" | "GSTR9" | "ITR" | "AdvanceTax" | "TDS" | "InvestmentAccountsDay";
  
  // Deadline Rule
  dueDay: number; // Day of month (e.g., 20 for 20th)
  dueMonth?: number; // For annual deadlines (1-12)
  
  // Alert Rules
  alertDaysBeforeDue: number; // Send alert this many days before (typical: 10)
  escalateToDailyDaysBeforeDue: number; // Escalate to daily reminders (typical: 3)
  
  // Applicable For
  applicableForRegistrationType: ("regular" | "composition")[];
  
  // India-Specific Rules
  financialYearStart: string; // "MM-DD", e.g., "04-01" for India
};

/**
 * Accountant Portal Access
 * For CA login and role-based report access
 */
export type AccountantAccess = {
  id: string;
  email: string;
  name: string;
  businessId: string;
  
  // Access Duration
  dateStart: string; // "YYYY-MM-DD"
  dateEnd: string; // "YYYY-MM-DD"
  
  // Report Access Control
  allowedReports: (
    | "profitAndLoss"
    | "cashFlowStatement"
    | "expenseDetail"
    | "inventoryValuation"
    | "gstrExport"
    | "itcSchedule"
    | "invoices"
  )[];
  
  // Security
  externalAccessCode: string; // One-time secure code
  accessCodeCreatedAt: string;
  accessCodeExpiresAt: string; // Expires after 7 days if not used
  lastLoginAt?: string;
  
  // Metadata
  createdBy: string; // Owner email
  createdAt: string;
  revokedAt?: string;
  notes?: string;
};

/**
 * GST Configuration for Business
 * Owner's GST setup and preferences
 */
export type GSTBusinessConfig = {
  businessName: string;
  businessGSTIN: string;
  businessState: string; // For SGST calculation
  
  // Registration Type
  registrationType: "regular" | "composition" | "unregistered";
  registrationDate: string;
  
  // Bank Details (for payment crediting)
  bankAccountNumber?: string;
  ifscCode?: string;
  
  // GST Rate Mapping by Category
  gstRateMapping: {
    [category: string]: "0%" | "5%" | "12%" | "18%" | "28%";
  };
  
  // Preferences
  invoicingStartDate: string; // First invoice date for calendar setup
  financialYearStart: string; // "MM-DD", typically "04-01" for India
  
  // Contact Info
  authorizedSignatory: string;
  authorizedSignatoryEmail: string;
};

// ============================================================================
// END PHASE 1 TYPES
// ============================================================================

function autoCategorizeExpense(rawCategory: string, product: string): string {
  const category = rawCategory.trim();
  if (category) {
    return category;
  }

  const source = product.toLowerCase();
  if (/rent|lease|office/.test(source)) return "Rent";
  if (/utility|power|water|internet|electric/.test(source)) return "Utilities";
  if (/ad|promo|campaign|social|marketing/.test(source)) return "Marketing";
  if (/salary|hr|admin|payroll/.test(source)) return "Admin Salaries";
  if (/transport|fuel|delivery|logistics/.test(source)) return "Transport";
  if (/repair|maintenance|service/.test(source)) return "Repairs";

  return "Unclassified OPEX";
}

function normalizeVendorName(row: SalesRow): string {
  const vendor = row.vendor?.trim();
  if (vendor) {
    return vendor;
  }
  return `${autoCategorizeExpense(row.opexCategory, row.product)} Vendor`;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_DATA_CANDIDATES = [
  path.resolve(__dirname, "./data/sample_sales_data.csv"),
  path.resolve(__dirname, "../data/sample_sales_data.csv"),
  path.resolve(process.cwd(), "packages/api/src/data/sample_sales_data.csv"),
] as const;

let cachedRows: SalesRow[] | null = null;

function parseCsvRows(csvText: string): SalesRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0]?.split(",").map((h) => h.trim()) ?? [];
  const indexOf = (column: string) => headers.indexOf(column);

  const customerIdIdx = indexOf("Customer ID");
  const dateIdx = indexOf("Date");
  const regionIdx = indexOf("Region");
  const productIdx = indexOf("Product");
  const salesIdx = indexOf("Sales");
  const profitIdx = indexOf("Profit");
  const vendorIdx = indexOf("Vendor");
  const customerAgeIdx = indexOf("Customer Age");
  const customerGenderIdx = indexOf("Customer Gender");
  const cogsCategoryIdx = indexOf("COGS Category");
  const cogsAmountIdx = indexOf("COGS Amount");
  const opexCategoryIdx = indexOf("OPEX Category");
  const opexAmountIdx = indexOf("OPEX Amount");

  if (
    customerIdIdx < 0 ||
    dateIdx < 0 ||
    regionIdx < 0 ||
    productIdx < 0 ||
    salesIdx < 0 ||
    profitIdx < 0 ||
    customerAgeIdx < 0 ||
    customerGenderIdx < 0 ||
    cogsCategoryIdx < 0 ||
    cogsAmountIdx < 0 ||
    opexCategoryIdx < 0 ||
    opexAmountIdx < 0
  ) {
    return [];
  }

  const rows: SalesRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(",").map((c) => c.trim());

    const customerId = cols[customerIdIdx];
    const date = cols[dateIdx];
    const region = cols[regionIdx];
    const product = cols[productIdx];
    const sales = cols[salesIdx];
    const profit = cols[profitIdx];
    const vendor = vendorIdx >= 0 ? cols[vendorIdx] : "";
    const customerAge = cols[customerAgeIdx];
    const customerGender = cols[customerGenderIdx];
    const cogsCategory = cols[cogsCategoryIdx];
    const cogsAmount = cols[cogsAmountIdx];
    const opexCategory = cols[opexCategoryIdx];
    const opexAmount = cols[opexAmountIdx];

    if (!date || !region || !product) {
      continue;
    }

    rows.push({
      customerId: Number(customerId),
      date,
      region,
      product,
      vendor: vendor || `${(opexCategory || "General").trim()} Vendor`,
      sales: Number(sales),
      profit: Number(profit),
      customerAge: Number(customerAge),
      customerGender: customerGender || "Unknown",
      cogsCategory: cogsCategory || "Unclassified COGS",
      cogsAmount: Number(cogsAmount),
      opexCategory: opexCategory || "Unclassified OPEX",
      opexAmount: Number(opexAmount),
    });
  }

  return rows;
}

export function loadDefaultRows(): SalesRow[] {
  if (cachedRows) {
    return cachedRows;
  }

  for (const candidate of DEFAULT_DATA_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      const csvText = fs.readFileSync(candidate, "utf8");
      cachedRows = parseCsvRows(csvText);
      return cachedRows;
    }
  }

  throw new Error("Could not find sample_sales_data.csv in expected locations.");
}

export function resolveRows(inputRows?: SalesRow[]): SalesRow[] {
  if (inputRows && inputRows.length > 0) {
    return inputRows;
  }
  return loadDefaultRows();
}

export function applyFilters(rows: SalesRow[], filters: Filters): SalesRow[] {
  const regionSet = new Set(filters.regions ?? rows.map((row) => row.region));
  const productSet = new Set(filters.products ?? rows.map((row) => row.product));
  const start = filters.startDate ? new Date(filters.startDate) : null;
  const end = filters.endDate ? new Date(filters.endDate) : null;

  return rows.filter((row) => {
    const date = new Date(row.date);
    const regionOk = regionSet.has(row.region);
    const productOk = productSet.has(row.product);
    const startOk = start ? date >= start : true;
    const endOk = end ? date <= end : true;
    return regionOk && productOk && startOk && endOk;
  });
}

// ============= PERIOD COMPARISON FUNCTIONS =============
export function calculatePreviousPeriod(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const duration = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1000 * 60 * 60 * 24);
  const prevStart = new Date(prevEnd.getTime() - duration);
  return {
    startDate: prevStart.toISOString().split("T")[0],
    endDate: prevEnd.toISOString().split("T")[0],
  };
}

export function calculateYoYPeriod(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const prevStart = new Date(start.getFullYear() - 1, start.getMonth(), start.getDate());
  const prevEnd = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());
  return {
    startDate: prevStart.toISOString().split("T")[0],
    endDate: prevEnd.toISOString().split("T")[0],
  };
}

export function compareMetrics(currentValue: number, comparisonValue: number): ComparisonResult {
  const absoluteChange = currentValue - comparisonValue;
  const percentageChange = comparisonValue !== 0 ? (absoluteChange / Math.abs(comparisonValue)) * 100 : 0;
  return {
    currentValue,
    comparisonValue,
    absoluteChange,
    percentageChange,
  };
}

// ============= BALANCE SHEET CALCULATION =============
export function calculateBalanceSheet(rows: SalesRow[]): BalanceSheet {
  const kpis = calculateKpis(rows);
  const pnl = profitLossStatement(rows);
  const notes: string[] = [];

  const receivables = kpis.totalSales * 0.4;
  const inventory = pnl.cogs * 0.15;
  const cashEstimate = Math.max(0, kpis.totalProfit * 0.5);

  const supplierDues = pnl.cogs * 0.2;
  const payables = pnl.operatingExpenses * 0.15;

  const totalAssets = cashEstimate + inventory + receivables;
  const totalLiabilities = supplierDues + payables;
  const netEquity = totalAssets - totalLiabilities;

  if (netEquity < 0) {
    notes.push("⚠️ Negative equity: Liabilities exceed assets. Review cash flow and payment terms.");
  }
  if (netEquity < totalLiabilities * 0.1) {
    notes.push("⚠️ Low equity buffer: Net worth is less than 10% of liabilities.");
  }

  return {
    assets: {
      cash: cashEstimate,
      inventory,
      receivables,
      total: totalAssets,
    },
    liabilities: {
      supplierDues,
      payables,
      total: totalLiabilities,
    },
    netEquity,
    notes,
  };
}

export function calculateKpis(rows: SalesRow[]) {
  const totalSales = rows.reduce((sum, row) => sum + row.sales, 0);
  const totalProfit = rows.reduce((sum, row) => sum + row.profit, 0);
  const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
  return { totalSales, totalProfit, profitMargin };
}

export function salesByRegion(rows: SalesRow[]) {
  const byRegion = new Map<string, number>();
  for (const row of rows) {
    byRegion.set(row.region, (byRegion.get(row.region) ?? 0) + row.sales);
  }
  return [...byRegion.entries()]
    .map(([region, sales]) => ({ region, sales }))
    .sort((a, b) => b.sales - a.sales);
}

export function salesByProduct(rows: SalesRow[]) {
  const byProduct = new Map<string, { sales: number; profit: number }>();
  for (const row of rows) {
    const current = byProduct.get(row.product) ?? { sales: 0, profit: 0 };
    current.sales += row.sales;
    current.profit += row.profit;
    byProduct.set(row.product, current);
  }

  const products = [...byProduct.entries()].map(([product, values]) => ({
    product,
    sales: values.sales,
    profit: values.profit,
  }));

  return {
    all: products,
    top: [...products].sort((a, b) => b.sales - a.sales).slice(0, 3),
    bottom: [...products].sort((a, b) => a.sales - b.sales).slice(0, 3),
  };
}

export function genderSplit(rows: SalesRow[]) {
  const byGender = new Map<string, number>();
  for (const row of rows) {
    byGender.set(row.customerGender, (byGender.get(row.customerGender) ?? 0) + 1);
  }
  return [...byGender.entries()].map(([gender, count]) => ({ gender, count }));
}

export function ageDistribution(rows: SalesRow[], bins = 8) {
  if (rows.length === 0) {
    return [];
  }

  const ages = rows.map((row) => row.customerAge);
  const minAge = Math.min(...ages);
  const maxAge = Math.max(...ages);
  const width = Math.max(1, Math.ceil((maxAge - minAge + 1) / bins));

  const counts = new Array(bins).fill(0);
  for (const age of ages) {
    const index = Math.min(bins - 1, Math.floor((age - minAge) / width));
    counts[index] += 1;
  }

  return counts.map((count, index) => {
    const start = minAge + index * width;
    const end = start + width - 1;
    return {
      bucket: `${start}-${end}`,
      count,
    };
  });
}

function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function salesProfitOverTime(
  rows: SalesRow[],
  aggregation: "Daily" | "Weekly" | "Monthly",
) {
  const grouped = new Map<string, { sales: number; profit: number }>();

  for (const row of rows) {
    const date = new Date(row.date);
    let keyDate = date;

    if (aggregation === "Weekly") {
      keyDate = startOfWeekMonday(date);
    }
    if (aggregation === "Monthly") {
      keyDate = new Date(date.getFullYear(), date.getMonth(), 1);
    }

    const key = keyDate.toISOString().slice(0, 10);
    const current = grouped.get(key) ?? { sales: 0, profit: 0 };
    current.sales += row.sales;
    current.profit += row.profit;
    grouped.set(key, current);
  }

  return [...grouped.entries()]
    .map(([date, values]) => ({ date, sales: values.sales, profit: values.profit }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function parseMonthInput(month?: string, fallbackDate?: string) {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [yearStr, monthStr] = month.split("-");
    return {
      year: Number(yearStr),
      month: Number(monthStr),
    };
  }

  const fallback = fallbackDate ? new Date(fallbackDate) : new Date();
  return {
    year: fallback.getFullYear(),
    month: fallback.getMonth() + 1,
  };
}

function formatDateKey(year: number, month: number, day: number) {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function revenueHeatmap(rows: SalesRow[], month?: string) {
  const dates = rows.map((row) => row.date).sort();
  const { year, month: monthNum } = parseMonthInput(month, dates[dates.length - 1]);
  const monthKey = `${year}-${String(monthNum).padStart(2, "0")}`;

  const monthRows = rows.filter((row) => row.date.startsWith(`${monthKey}-`));
  const dailyRevenue = new Map<string, number>();
  for (const row of monthRows) {
    dailyRevenue.set(row.date, (dailyRevenue.get(row.date) ?? 0) + row.sales);
  }

  const allDailyRevenue = new Map<string, number>();
  for (const row of rows) {
    allDailyRevenue.set(row.date, (allDailyRevenue.get(row.date) ?? 0) + row.sales);
  }

  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const firstWeekday = new Date(year, monthNum - 1, 1).getDay();
  const maxRevenue = Math.max(1, ...dailyRevenue.values(), 0);
  const monthRevenue = monthRows.reduce((sum, row) => sum + row.sales, 0);

  const minDateRaw = dates[0];
  const maxDateRaw = dates.at(-1);
  const minDate = minDateRaw ? new Date(minDateRaw) : null;
  const maxDate = maxDateRaw ? new Date(maxDateRaw) : null;
  const hasThreeMonthsData =
    minDate && maxDate
      ? (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) >= 90
      : false;

  const cells: Array<{
    date: string;
    day: number;
    revenue: number;
    intensity: 0 | 1 | 2 | 3 | 4 | 5;
    isZero: boolean;
    yoy: null | { previousRevenue: number; changePct: number | null };
  }> = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = formatDateKey(year, monthNum, day);
    const revenue = dailyRevenue.get(date) ?? 0;
    const intensity =
      revenue === 0 ? 0 : (Math.min(5, Math.max(1, Math.ceil((revenue / maxRevenue) * 5))) as 1 | 2 | 3 | 4 | 5);

    let yoy: null | { previousRevenue: number; changePct: number | null } = null;
    if (hasThreeMonthsData) {
      const previousDate = formatDateKey(year - 1, monthNum, day);
      const previousRevenue = allDailyRevenue.get(previousDate) ?? 0;
      const changePct =
        previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : revenue > 0 ? 100 : 0;
      yoy = { previousRevenue, changePct };
    }

    cells.push({
      date,
      day,
      revenue,
      intensity,
      isZero: revenue === 0,
      yoy,
    });
  }

  const weeks: Array<Array<(typeof cells)[number] | null>> = [];
  let index = 0;
  for (let week = 0; week < 6; week += 1) {
    const row: Array<(typeof cells)[number] | null> = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const cellPosition = week * 7 + weekday;
      if (cellPosition < firstWeekday || index >= cells.length) {
        row.push(null);
      } else {
        row.push(cells[index] ?? null);
        index += 1;
      }
    }
    weeks.push(row);
  }

  return {
    month: monthKey,
    weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    weeks,
    summary: {
      monthRevenue,
      maxDailyRevenue: maxRevenue,
      avgDailyRevenue: daysInMonth > 0 ? monthRevenue / daysInMonth : 0,
      hasYoYComparison: hasThreeMonthsData,
    },
  };
}

export function dayTransactions(rows: SalesRow[], date: string) {
  const selected = rows
    .filter((row) => row.date === date)
    .sort((a, b) => b.sales - a.sales)
    .map((row) => ({
      customerId: row.customerId,
      date: row.date,
      region: row.region,
      product: row.product,
      sales: row.sales,
      profit: row.profit,
      customerAge: row.customerAge,
      customerGender: row.customerGender,
      cogsCategory: row.cogsCategory,
      cogsAmount: row.cogsAmount,
      opexCategory: row.opexCategory,
      opexAmount: row.opexAmount,
    }));

  return {
    date,
    transactions: selected,
    totalRevenue: selected.reduce((sum, row) => sum + row.sales, 0),
    totalProfit: selected.reduce((sum, row) => sum + row.profit, 0),
    totalTransactions: selected.length,
  };
}

export function profitLossStatement(rows: SalesRow[]) {
  const grossRevenue = rows.reduce((sum, row) => sum + row.sales, 0);
  const cogs = rows.reduce((sum, row) => sum + row.cogsAmount, 0);
  const operatingExpenses = rows.reduce((sum, row) => sum + row.opexAmount, 0);
  const observedNetProfit = rows.reduce((sum, row) => sum + row.profit, 0);
  const grossProfit = grossRevenue - cogs;
  const netProfit = grossProfit - operatingExpenses;

  const grossMarginPct = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
  const netMarginPct = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

  const cogsByCategory = new Map<string, number>();
  const opexByCategory = new Map<string, number>();
  for (const row of rows) {
    cogsByCategory.set(row.cogsCategory, (cogsByCategory.get(row.cogsCategory) ?? 0) + row.cogsAmount);
    opexByCategory.set(row.opexCategory, (opexByCategory.get(row.opexCategory) ?? 0) + row.opexAmount);
  }

  const cogsCategoryBreakdown = [...cogsByCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const opexCategoryBreakdown = [...opexByCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const netProfitVariance = netProfit - observedNetProfit;

  return {
    grossRevenue,
    cogs,
    grossProfit,
    operatingExpenses,
    netProfit,
    reportedNetProfit: observedNetProfit,
    netProfitVariance,
    grossMarginPct,
    netMarginPct,
    cogsCategoryBreakdown,
    opexCategoryBreakdown,
    assumptions: [],
    isEstimated: false,
  };
}

export function expenseBreakdown(rows: SalesRow[]): ExpenseBreakdown {
  const palette = ["#14532d", "#166534", "#15803d", "#16a34a", "#22c55e", "#4ade80", "#86efac"];

  const totalExpenses = rows.reduce((sum, row) => sum + row.opexAmount, 0);
  const byCategoryMap = new Map<string, number>();

  for (const row of rows) {
    const category = autoCategorizeExpense(row.opexCategory, row.product);
    byCategoryMap.set(category, (byCategoryMap.get(category) ?? 0) + row.opexAmount);
  }

  const byCategory = [...byCategoryMap.entries()]
    .map(([name, value], index) => ({
      name,
      value,
      percentage: totalExpenses > 0 ? (value / totalExpenses) * 100 : 0,
      color: palette[index % palette.length] ?? "#14532d",
    }))
    .sort((a, b) => b.value - a.value);

  const top = byCategory[0];
  const topCategory = top
    ? {
        name: top.name,
        amount: top.value,
        percentage: top.percentage,
      }
    : null;

  const transactions = [...rows]
    .filter((row) => row.opexAmount > 0)
    .sort((a, b) => b.opexAmount - a.opexAmount)
    .map((row) => ({
      date: row.date,
      customerId: row.customerId,
      region: row.region,
      product: row.product,
      category: autoCategorizeExpense(row.opexCategory, row.product),
      amount: row.opexAmount,
    }));

  return {
    byCategory,
    totalExpenses,
    topCategory,
    transactions,
  };
}

export function marginTrend(rows: SalesRow[], periods: "Daily" | "Weekly" | "Monthly" = "Weekly") {
  const grouped = new Map<string, { revenue: number; cogs: number; opex: number }>();

  for (const row of rows) {
    const date = new Date(row.date);
    let keyDate = date;
    if (periods === "Weekly") {
      keyDate = startOfWeekMonday(date);
    }
    if (periods === "Monthly") {
      keyDate = new Date(date.getFullYear(), date.getMonth(), 1);
    }
    const key = keyDate.toISOString().slice(0, 10);
    const current = grouped.get(key) ?? { revenue: 0, cogs: 0, opex: 0 };
    current.revenue += row.sales;
    current.cogs += row.cogsAmount;
    current.opex += row.opexAmount;
    grouped.set(key, current);
  }

  return [...grouped.entries()]
    .map(([date, values]) => {
      const grossProfit = values.revenue - values.cogs;
      const netProfit = grossProfit - values.opex;
      const grossMargin = values.revenue > 0 ? (grossProfit / values.revenue) * 100 : 0;
      const netMargin = values.revenue > 0 ? (netProfit / values.revenue) * 100 : 0;
      return {
        date,
        grossMargin,
        netMargin,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function cashInHandSummary(rows: SalesRow[]): CashInHandSummary {
  if (rows.length === 0) {
    return {
      bankBalance: 0,
      cashOnHand: 0,
      totalLiquidBalance: 0,
      latestChange: null,
    };
  }

  const pnl = profitLossStatement(rows);

  // Keep this aligned with the simplified balance-sheet assumptions in the app.
  const totalLiquidBalance = pnl.netProfit;
  const cashOnHand = totalLiquidBalance * 0.4;
  const bankBalance = totalLiquidBalance * 0.6;

  const latestRow = [...rows].sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) {
      return dateDiff;
    }
    return b.customerId - a.customerId;
  })[0];

  const latestChange = latestRow
    ? {
        date: latestRow.date,
        customerId: latestRow.customerId,
        region: latestRow.region,
        product: latestRow.product,
        sales: latestRow.sales,
        cogsAmount: latestRow.cogsAmount,
        opexAmount: latestRow.opexAmount,
        netCashDelta: latestRow.sales - latestRow.cogsAmount - latestRow.opexAmount,
      }
    : null;

  return {
    bankBalance,
    cashOnHand,
    totalLiquidBalance,
    latestChange,
  };
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftMonth(dateKey: string, months: number) {
  const date = new Date(dateKey);
  const shifted = new Date(date);
  shifted.setMonth(shifted.getMonth() + months);
  return shifted;
}

function shiftYear(dateKey: string, years: number) {
  const date = new Date(dateKey);
  const shifted = new Date(date);
  shifted.setFullYear(shifted.getFullYear() + years);
  return shifted;
}

function dateDiffHours(a: Date, b: Date) {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60);
}

function dateDiffDays(a: Date, b: Date) {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function monthKeyFromDate(date: string) {
  return date.slice(0, 7);
}

function sortedMonthKeys(map: Map<string, number>) {
  return [...map.keys()].sort((a, b) => a.localeCompare(b));
}

function aggregateRevenueByPeriod(rows: SalesRow[], periodType: "Daily" | "Weekly") {
  const grouped = new Map<string, { revenue: number; streams: Map<string, number> }>();

  for (const row of rows) {
    const date = new Date(row.date);
    const periodDate = periodType === "Weekly" ? startOfWeekMonday(date) : date;
    const key = toDateKey(periodDate);
    const current = grouped.get(key) ?? { revenue: 0, streams: new Map<string, number>() };
    current.revenue += row.sales;
    current.streams.set(row.product, (current.streams.get(row.product) ?? 0) + row.sales);
    grouped.set(key, current);
  }

  return grouped;
}

function isSeasonalityMatched(
  currentKey: string,
  priorKey: string,
  grouped: Map<string, { revenue: number; streams: Map<string, number> }>,
) {
  const lastYearCurrent = grouped.get(toDateKey(shiftYear(currentKey, -1)))?.revenue;
  const lastYearPrior = grouped.get(toDateKey(shiftYear(priorKey, -1)))?.revenue;
  const currentRevenue = grouped.get(currentKey)?.revenue;
  const priorRevenue = grouped.get(priorKey)?.revenue;

  if (!lastYearCurrent || !lastYearPrior || !currentRevenue || !priorRevenue) {
    return false;
  }

  const currentYoY = ((currentRevenue - lastYearCurrent) / lastYearCurrent) * 100;
  const priorYoY = ((priorRevenue - lastYearPrior) / lastYearPrior) * 100;

  return currentYoY < 0 && priorYoY < 0 && Math.abs(currentYoY - priorYoY) <= 8;
}

export function detectExpenseSpikeAlerts(rows: SalesRow[]): ExpenseSpikeAlert[] {
  const groupedByCategory = new Map<string, Map<string, { total: number; rows: SalesRow[] }>>();

  for (const row of rows) {
    if (row.opexAmount <= 0) {
      continue;
    }
    const category = autoCategorizeExpense(row.opexCategory, row.product);
    const byDay = groupedByCategory.get(category) ?? new Map<string, { total: number; rows: SalesRow[] }>();
    const current = byDay.get(row.date) ?? { total: 0, rows: [] };
    current.total += row.opexAmount;
    current.rows.push(row);
    byDay.set(row.date, current);
    groupedByCategory.set(category, byDay);
  }

  const alerts: ExpenseSpikeAlert[] = [];

  for (const [category, dayMap] of groupedByCategory.entries()) {
    const sortedDates = [...dayMap.keys()].sort((a, b) => a.localeCompare(b));
    const totals = sortedDates.map((date) => dayMap.get(date)?.total ?? 0);

    for (let i = 0; i < sortedDates.length; i += 1) {
      const date = sortedDates[i];
      if (!date) continue;
      const history = totals.slice(Math.max(0, i - 30), i);
      if (history.length < 7) {
        continue;
      }

      const baseline = history.reduce((sum, value) => sum + value, 0) / history.length;
      if (baseline <= 0) {
        continue;
      }

      const threshold = baseline * 2.5;
      const dailyTotal = totals[i] ?? 0;
      const bucket = dayMap.get(date);
      if (!bucket) {
        continue;
      }

      if (dailyTotal > threshold) {
        const byVendor = new Map<string, number>();
        for (const item of bucket.rows) {
          const vendor = normalizeVendorName(item);
          byVendor.set(vendor, (byVendor.get(vendor) ?? 0) + item.opexAmount);
        }
        const dominantVendor = [...byVendor.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown Vendor";
        alerts.push({
          kind: "dailyCategoryTotal",
          date,
          category,
          vendor: dominantVendor,
          amount: dailyTotal,
          baseline,
          threshold,
          multiplier: dailyTotal / baseline,
        });
      }

      for (const item of bucket.rows) {
        if (item.opexAmount > threshold) {
          alerts.push({
            kind: "singleTransaction",
            date,
            category,
            vendor: normalizeVendorName(item),
            amount: item.opexAmount,
            baseline,
            threshold,
            multiplier: item.opexAmount / baseline,
          });
        }
      }
    }
  }

  return alerts
    .sort((a, b) => {
      if (b.multiplier !== a.multiplier) {
        return b.multiplier - a.multiplier;
      }
      return b.date.localeCompare(a.date);
    })
    .slice(0, 100);
}

export function detectRevenueDropAlerts(rows: SalesRow[]): RevenueDropAlert[] {
  const daily = aggregateRevenueByPeriod(rows, "Daily");
  const weekly = aggregateRevenueByPeriod(rows, "Weekly");

  const runDetection = (
    grouped: Map<string, { revenue: number; streams: Map<string, number> }>,
    periodType: "Daily" | "Weekly",
  ) => {
    const alerts: RevenueDropAlert[] = [];
    const keys = [...grouped.keys()].sort((a, b) => a.localeCompare(b));

    for (const key of keys) {
      const current = grouped.get(key);
      if (!current || current.revenue <= 0) {
        continue;
      }

      const priorDate = shiftMonth(key, -1);
      const priorKey =
        periodType === "Weekly"
          ? toDateKey(startOfWeekMonday(priorDate))
          : toDateKey(priorDate);
      const prior = grouped.get(priorKey);
      if (!prior || prior.revenue <= 0) {
        continue;
      }

      const dropPct = ((prior.revenue - current.revenue) / prior.revenue) * 100;
      if (dropPct <= 30) {
        continue;
      }

      if (isSeasonalityMatched(key, priorKey, grouped)) {
        continue;
      }

      const streams = new Set<string>([
        ...current.streams.keys(),
        ...prior.streams.keys(),
      ]);

      const droppedStreams = [...streams]
        .map((stream) => {
          const currentRevenue = current.streams.get(stream) ?? 0;
          const priorRevenue = prior.streams.get(stream) ?? 0;
          const change = currentRevenue - priorRevenue;
          const changePct = priorRevenue > 0 ? (change / priorRevenue) * 100 : 0;
          return {
            stream,
            current: currentRevenue,
            priorMonth: priorRevenue,
            change,
            changePct,
          };
        })
        .filter((item) => item.change < 0)
        .sort((a, b) => a.change - b.change)
        .slice(0, 5);

      alerts.push({
        periodType,
        periodKey: key,
        currentRevenue: current.revenue,
        priorMonthRevenue: prior.revenue,
        dropPct,
        droppedStreams,
      });
    }

    return alerts;
  };

  return [...runDetection(daily, "Daily"), ...runDetection(weekly, "Weekly")]
    .sort((a, b) => {
      if (b.dropPct !== a.dropPct) {
        return b.dropPct - a.dropPct;
      }
      return b.periodKey.localeCompare(a.periodKey);
    })
    .slice(0, 100);
}

export function detectCashFlowWarning(
  rows: SalesRow[],
  minimumBuffer: number,
  horizonDays: number = 14,
): CashFlowWarningAlert {
  const currentBalance = cashInHandSummary(rows).totalLiquidBalance;
  const byDate = new Map<string, number>();

  for (const row of rows) {
    const delta = row.sales - row.cogsAmount - row.opexAmount;
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + delta);
  }

  const sortedDates = [...byDate.keys()].sort((a, b) => a.localeCompare(b));
  const lastDate = sortedDates.length > 0 ? new Date(sortedDates[sortedDates.length - 1] ?? new Date()) : new Date();

  const weekdaySeries = new Map<number, number[]>();
  const lookbackDates = sortedDates.slice(-60);
  for (const key of lookbackDates) {
    const date = new Date(key);
    const weekday = date.getDay();
    const values = weekdaySeries.get(weekday) ?? [];
    values.push(byDate.get(key) ?? 0);
    weekdaySeries.set(weekday, values);
  }

  const allDeltas = lookbackDates.map((key) => byDate.get(key) ?? 0);
  const overallAvg = allDeltas.length > 0 ? allDeltas.reduce((sum, value) => sum + value, 0) / allDeltas.length : 0;

  const projection: Array<{ date: string; delta: number; projectedBalance: number }> = [];
  let projectedBalance = currentBalance;

  for (let i = 1; i <= horizonDays; i += 1) {
    const date = new Date(lastDate);
    date.setDate(date.getDate() + i);
    const weekday = date.getDay();
    const weekdayValues = weekdaySeries.get(weekday) ?? [];
    const expectedDelta =
      weekdayValues.length > 0
        ? weekdayValues.reduce((sum, value) => sum + value, 0) / weekdayValues.length
        : overallAvg;

    projectedBalance += expectedDelta;
    projection.push({
      date: toDateKey(date),
      delta: expectedDelta,
      projectedBalance,
    });
  }

  const crunchPoint = projection.find((point) => point.projectedBalance < minimumBuffer) ?? null;
  const largestOutflow = projection
    .filter((point) => point.delta < 0)
    .sort((a, b) => a.delta - b.delta)[0] ?? null;

  return {
    triggered: Boolean(crunchPoint),
    minimumBuffer,
    currentBalance,
    daysUntilCrunch: crunchPoint ? projection.findIndex((point) => point.date === crunchPoint.date) + 1 : null,
    crunchDate: crunchPoint?.date ?? null,
    largestUpcomingOutflow: largestOutflow
      ? {
          date: largestOutflow.date,
          amount: Math.abs(largestOutflow.delta),
        }
      : null,
    projection,
  };
}

export function cashForecastProjection(
  rows: SalesRow[],
  options: {
    horizonDays: 30 | 60 | 90;
    minimumBuffer: number;
    mode: CashForecastMode;
    recurringExpenses: RecurringExpenseRule[];
    scenarios?: WhatIfScenario[];
  },
): CashForecastSummary {
  const currentBalance = cashInHandSummary(rows).totalLiquidBalance;
  const horizonDays = options.horizonDays;
  const minimumBuffer = Math.max(0, options.minimumBuffer);
  const mode = options.mode;

  if (rows.length === 0) {
    return {
      mode,
      horizonDays,
      minimumBuffer,
      currentBalance,
      burnRatePerDay: 0,
      runwayDays: null,
      projection: [],
      totals: {
        receivablesScheduled: 0,
        payablesScheduled: 0,
        recurringScheduled: 0,
      },
      dipZone: {
        dipDays: 0,
        nextDipDate: null,
      },
      receivablesCalendar: [],
      payablesCalendar: [],
      overduePayables: {
        count: 0,
        totalAmount: 0,
      },
      seasonalBaseline: {
        available: false,
        matchedPoints: 0,
        points: [],
      },
      breakEven: {
        date: null,
        isLossPeriod: false,
        projectedMonthRevenue: 0,
        projectedMonthExpense: 0,
      },
    };
  }

  const scenarios = (options.scenarios ?? []).filter(
    (scenario) => scenario && scenario.amount > 0 && Number.isFinite(scenario.amount),
  );

  const dailyInflow = new Map<string, number>();
  const dailyOutflow = new Map<string, number>();

  for (const row of rows) {
    dailyInflow.set(row.date, (dailyInflow.get(row.date) ?? 0) + row.sales);
    dailyOutflow.set(row.date, (dailyOutflow.get(row.date) ?? 0) + row.cogsAmount + row.opexAmount);
  }

  const sortedDates = [...dailyInflow.keys()].sort((a, b) => a.localeCompare(b));
  const lastKnownDate = new Date(sortedDates[sortedDates.length - 1] ?? new Date());

  const weekdayInflows = new Map<number, number[]>();
  const weekdayOutflows = new Map<number, number[]>();
  const lookbackDates = sortedDates.slice(-90);

  for (const dateKey of lookbackDates) {
    const date = new Date(dateKey);
    const weekday = date.getDay();
    const inflowList = weekdayInflows.get(weekday) ?? [];
    inflowList.push(dailyInflow.get(dateKey) ?? 0);
    weekdayInflows.set(weekday, inflowList);

    const outflowList = weekdayOutflows.get(weekday) ?? [];
    outflowList.push(dailyOutflow.get(dateKey) ?? 0);
    weekdayOutflows.set(weekday, outflowList);
  }

  const overallAvgInflow =
    lookbackDates.length > 0
      ? lookbackDates.reduce((sum, key) => sum + (dailyInflow.get(key) ?? 0), 0) / lookbackDates.length
      : 0;
  const overallAvgOutflow =
    lookbackDates.length > 0
      ? lookbackDates.reduce((sum, key) => sum + (dailyOutflow.get(key) ?? 0), 0) / lookbackDates.length
      : 0;

  const receivablesByDueDate = new Map<string, number>();
  const payablesByDueDate = new Map<string, number>();

  for (const row of rows) {
    const txDate = new Date(row.date);

    const receivablePortion = Math.max(0, row.sales * 0.4);
    const receivableDueDate = new Date(txDate);
    receivableDueDate.setDate(receivableDueDate.getDate() + 14);
    if (receivablePortion > 0) {
      const dueKey = toDateKey(receivableDueDate);
      receivablesByDueDate.set(dueKey, (receivablesByDueDate.get(dueKey) ?? 0) + receivablePortion);
    }

    const payablePortion = Math.max(0, row.cogsAmount * 0.35 + row.opexAmount * 0.2);
    const payableDueDate = new Date(txDate);
    payableDueDate.setDate(payableDueDate.getDate() + 10);
    if (payablePortion > 0) {
      const dueKey = toDateKey(payableDueDate);
      payablesByDueDate.set(dueKey, (payablesByDueDate.get(dueKey) ?? 0) + payablePortion);
    }
  }

  const receivablesCalendar = [...receivablesByDueDate.entries()]
    .map(([dueDate, amount]) => ({
      dueDate,
      amount,
      status: dueDate <= toDateKey(lastKnownDate) ? ("overdue" as const) : ("upcoming" as const),
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const payablesCalendar = [...payablesByDueDate.entries()]
    .map(([dueDate, amount]) => ({
      dueDate,
      amount,
      status: dueDate <= toDateKey(lastKnownDate) ? ("overdue" as const) : ("upcoming" as const),
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const overduePayables = payablesCalendar.filter((item) => item.status === "overdue");

  const trailingWindowStart = new Date(lastKnownDate);
  trailingWindowStart.setDate(trailingWindowStart.getDate() - 30);
  const trailingRows = rows.filter((row) => new Date(row.date) >= trailingWindowStart);
  const trailingDays = Math.max(1, Math.min(30, trailingRows.length || 30));
  const trailingInflow = trailingRows.reduce((sum, row) => sum + row.sales, 0);
  const trailingOutflow = trailingRows.reduce((sum, row) => sum + row.cogsAmount + row.opexAmount, 0);
  const burnRatePerDay = Math.max(0, (trailingOutflow - trailingInflow) / trailingDays);
  const runwayDays = burnRatePerDay > 0 ? Math.floor(currentBalance / burnRatePerDay) : null;

  const sortedRowDates = [...new Set(rows.map((row) => row.date))].sort((a, b) => a.localeCompare(b));
  const minRowDate = new Date(sortedRowDates[0] ?? lastKnownDate);
  const historyDays = Math.floor((lastKnownDate.getTime() - minRowDate.getTime()) / (1000 * 60 * 60 * 24));
  const hasYearHistory = historyDays >= 360;
  const netDeltaByDate = new Map<string, number>();
  for (const row of rows) {
    const delta = row.sales - row.cogsAmount - row.opexAmount;
    netDeltaByDate.set(row.date, (netDeltaByDate.get(row.date) ?? 0) + delta);
  }

  let projectedBalance = currentBalance;
  let receivablesScheduled = 0;
  let payablesScheduled = 0;
  let recurringScheduled = 0;
  const projection: CashForecastPoint[] = [];
  const seasonalPoints: SeasonalBaselinePoint[] = [];
  let seasonalBalance = currentBalance;
  let seasonalMatchedPoints = 0;
  const scenarioByDate = new Map<string, number>();
  for (const scenario of scenarios) {
    scenarioByDate.set(scenario.date, (scenarioByDate.get(scenario.date) ?? 0) + scenario.amount);
  }

  const monthStart = new Date(lastKnownDate);
  monthStart.setDate(1);
  const monthEnd = new Date(lastKnownDate);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);

  let projectedMonthRevenue = rows
    .filter((row) => {
      const date = new Date(row.date);
      return date >= monthStart && date <= lastKnownDate;
    })
    .reduce((sum, row) => sum + row.sales, 0);
  let projectedMonthExpense = rows
    .filter((row) => {
      const date = new Date(row.date);
      return date >= monthStart && date <= lastKnownDate;
    })
    .reduce((sum, row) => sum + row.cogsAmount + row.opexAmount, 0);

  let breakEvenDate: string | null = projectedMonthRevenue >= projectedMonthExpense ? toDateKey(lastKnownDate) : null;

  for (let day = 1; day <= horizonDays; day += 1) {
    const date = new Date(lastKnownDate);
    date.setDate(date.getDate() + day);
    const dateKey = toDateKey(date);
    const weekday = date.getDay();

    const weekdayInflowsForDay = weekdayInflows.get(weekday) ?? [];
    const weekdayOutflowsForDay = weekdayOutflows.get(weekday) ?? [];
    const baselineInflow =
      weekdayInflowsForDay.length > 0
        ? weekdayInflowsForDay.reduce((sum, value) => sum + value, 0) / weekdayInflowsForDay.length
        : overallAvgInflow;
    const baselineOutflow =
      weekdayOutflowsForDay.length > 0
        ? weekdayOutflowsForDay.reduce((sum, value) => sum + value, 0) / weekdayOutflowsForDay.length
        : overallAvgOutflow;

    const receivableInflow = mode === "realistic" ? receivablesByDueDate.get(dateKey) ?? 0 : 0;
    const payableOutflow = payablesByDueDate.get(dateKey) ?? 0;
    const scenarioInflow = scenarioByDate.get(dateKey) ?? 0;
    const recurringOutflow = options.recurringExpenses.reduce((sum, expense) => {
      if (expense.amount <= 0) {
        return sum;
      }
      return date.getDate() === expense.dayOfMonth ? sum + expense.amount : sum;
    }, 0);

    receivablesScheduled += receivableInflow;
    payablesScheduled += payableOutflow;
    recurringScheduled += recurringOutflow;

    const openingBalance = projectedBalance;
    const netDelta =
      baselineInflow + receivableInflow + scenarioInflow - baselineOutflow - payableOutflow - recurringOutflow;
    projectedBalance += netDelta;

    if (date >= monthStart && date <= monthEnd) {
      projectedMonthRevenue += baselineInflow + receivableInflow + scenarioInflow;
      projectedMonthExpense += baselineOutflow + payableOutflow + recurringOutflow;
      if (!breakEvenDate && projectedMonthRevenue >= projectedMonthExpense) {
        breakEvenDate = dateKey;
      }
    }

    projection.push({
      date: dateKey,
      openingBalance,
      baselineInflow,
      baselineOutflow,
      receivableInflow,
      payableOutflow,
      recurringOutflow,
      scenarioInflow,
      netDelta,
      projectedBalance,
      isDipZone: projectedBalance < minimumBuffer,
    });

    const priorDate = shiftYear(dateKey, -1);
    const priorKey = toDateKey(priorDate);
    const priorDelta = netDeltaByDate.get(priorKey);
    if (hasYearHistory && typeof priorDelta === "number") {
      seasonalBalance += priorDelta;
      seasonalMatchedPoints += 1;
      seasonalPoints.push({
        date: dateKey,
        priorYearBalance: seasonalBalance,
      });
    } else {
      seasonalPoints.push({
        date: dateKey,
        priorYearBalance: null,
      });
    }
  }

  const dipPoint = projection.find((point) => point.isDipZone) ?? null;

  return {
    mode,
    horizonDays,
    minimumBuffer,
    currentBalance,
    burnRatePerDay,
    runwayDays,
    projection,
    totals: {
      receivablesScheduled,
      payablesScheduled,
      recurringScheduled,
    },
    dipZone: {
      dipDays: projection.filter((point) => point.isDipZone).length,
      nextDipDate: dipPoint?.date ?? null,
    },
    receivablesCalendar,
    payablesCalendar,
    overduePayables: {
      count: overduePayables.length,
      totalAmount: overduePayables.reduce((sum, item) => sum + item.amount, 0),
    },
    seasonalBaseline: {
      available: hasYearHistory && seasonalMatchedPoints >= Math.max(7, Math.floor(horizonDays * 0.25)),
      matchedPoints: seasonalMatchedPoints,
      points: seasonalPoints,
    },
    breakEven: {
      date: breakEvenDate,
      isLossPeriod: projectedMonthRevenue < projectedMonthExpense,
      projectedMonthRevenue,
      projectedMonthExpense,
    },
  };
}

export function detectDuplicatePaymentFlags(rows: SalesRow[]): DuplicatePaymentFlag[] {
  const outgoing = rows
    .filter((row) => row.opexAmount > 0)
    .map((row) => ({
      ...row,
      vendor: normalizeVendorName(row),
    }));

  const byVendor = new Map<string, typeof outgoing>();
  for (const row of outgoing) {
    const list = byVendor.get(row.vendor) ?? [];
    list.push(row);
    byVendor.set(row.vendor, list);
  }

  const flags: DuplicatePaymentFlag[] = [];

  for (const [vendor, txns] of byVendor.entries()) {
    const sorted = [...txns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (let i = 0; i < sorted.length; i += 1) {
      const first = sorted[i];
      if (!first) {
        continue;
      }

      for (let j = i + 1; j < sorted.length; j += 1) {
        const second = sorted[j];
        if (!second) {
          continue;
        }

        const hoursApart = dateDiffHours(new Date(first.date), new Date(second.date));
        if (hoursApart > 48) {
          break;
        }

        const high = Math.max(first.opexAmount, second.opexAmount);
        const low = Math.min(first.opexAmount, second.opexAmount);
        if (high <= 0) {
          continue;
        }

        const amountDifferencePct = ((high - low) / high) * 100;
        if (amountDifferencePct > 5) {
          continue;
        }

        flags.push({
          vendor,
          hoursApart,
          amountDifferencePct,
          first: {
            date: first.date,
            amount: first.opexAmount,
            category: autoCategorizeExpense(first.opexCategory, first.product),
            product: first.product,
          },
          second: {
            date: second.date,
            amount: second.opexAmount,
            category: autoCategorizeExpense(second.opexCategory, second.product),
            product: second.product,
          },
        });
      }
    }
  }

  return flags
    .sort((a, b) => {
      if (a.amountDifferencePct !== b.amountDifferencePct) {
        return a.amountDifferencePct - b.amountDifferencePct;
      }
      return b.hoursApart - a.hoursApart;
    })
    .slice(0, 100);
}

export function detectUnusualVendorAlerts(rows: SalesRow[]): UnusualVendorAlert[] {
  const outgoing = rows
    .filter((row) => row.opexAmount > 0)
    .map((row) => ({
      ...row,
      vendor: normalizeVendorName(row),
    }));

  const amounts = outgoing.map((row) => row.opexAmount).sort((a, b) => a - b);
  const p90Index = amounts.length > 0 ? Math.floor(amounts.length * 0.9) : 0;
  const p90 = amounts[p90Index] ?? 0;
  const significantThreshold = Math.max(50000, p90);

  const byVendor = new Map<string, typeof outgoing>();
  for (const row of outgoing) {
    const list = byVendor.get(row.vendor) ?? [];
    list.push(row);
    byVendor.set(row.vendor, list);
  }

  const alerts: UnusualVendorAlert[] = [];

  for (const [vendor, payments] of byVendor.entries()) {
    const sortedPayments = [...payments].sort((a, b) => a.date.localeCompare(b.date));
    const first = sortedPayments[0];
    if (first && first.opexAmount >= significantThreshold) {
      alerts.push({
        scenario: "newVendorSignificant",
        vendor,
        amount: first.opexAmount,
        baselineAmount: significantThreshold,
        multiplier: significantThreshold > 0 ? first.opexAmount / significantThreshold : 1,
        dateOrMonth: first.date,
      });
    }

    const monthlyTotals = new Map<string, number>();
    for (const payment of sortedPayments) {
      const month = monthKeyFromDate(payment.date);
      monthlyTotals.set(month, (monthlyTotals.get(month) ?? 0) + payment.opexAmount);
    }

    const months = sortedMonthKeys(monthlyTotals);
    for (let i = 0; i < months.length; i += 1) {
      const month = months[i];
      if (!month) continue;
      const priorMonths = months.slice(0, i);
      if (priorMonths.length < 2) {
        continue;
      }
      const baseline =
        priorMonths.reduce((sum, key) => sum + (monthlyTotals.get(key) ?? 0), 0) / priorMonths.length;
      if (baseline <= 0) {
        continue;
      }
      const current = monthlyTotals.get(month) ?? 0;
      if (current >= baseline * 3 && current >= significantThreshold) {
        alerts.push({
          scenario: "vendorMonthlySpike",
          vendor,
          amount: current,
          baselineAmount: baseline,
          multiplier: current / baseline,
          dateOrMonth: month,
        });
      }
    }
  }

  return alerts
    .sort((a, b) => {
      if (b.multiplier !== a.multiplier) {
        return b.multiplier - a.multiplier;
      }
      return b.dateOrMonth.localeCompare(a.dateOrMonth);
    })
    .slice(0, 100);
}

export function detectMarginErosionAlert(rows: SalesRow[], netMarginTarget: number): MarginErosionAlert {
  const weekly = new Map<
    string,
    {
      revenue: number;
      cogs: number;
      opexByCategory: Map<string, number>;
    }
  >();

  for (const row of rows) {
    const weekStart = toDateKey(startOfWeekMonday(new Date(row.date)));
    const current =
      weekly.get(weekStart) ??
      ({ revenue: 0, cogs: 0, opexByCategory: new Map<string, number>() } as {
        revenue: number;
        cogs: number;
        opexByCategory: Map<string, number>;
      });
    current.revenue += row.sales;
    current.cogs += row.cogsAmount;
    const category = autoCategorizeExpense(row.opexCategory, row.product);
    current.opexByCategory.set(category, (current.opexByCategory.get(category) ?? 0) + row.opexAmount);
    weekly.set(weekStart, current);
  }

  const weeks = [...weekly.entries()]
    .map(([weekStart, values]) => {
      const totalOpex = [...values.opexByCategory.values()].reduce((sum, v) => sum + v, 0);
      const netProfit = values.revenue - values.cogs - totalOpex;
      const netMargin = values.revenue > 0 ? (netProfit / values.revenue) * 100 : 0;
      return {
        weekStart,
        netMargin,
        opexByCategory: values.opexByCategory,
      };
    })
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  if (weeks.length === 0) {
    return {
      triggered: false,
      netMarginTarget,
      weeksBelowTarget: 0,
      currentNetMargin: null,
      erosionWindow: [],
      topExpenseDrivers: [],
    };
  }

  let streak = 0;
  for (let i = weeks.length - 1; i >= 0; i -= 1) {
    if ((weeks[i]?.netMargin ?? 0) < netMarginTarget) {
      streak += 1;
    } else {
      break;
    }
  }

  const triggered = streak >= 3;
  const erosionWindow = triggered ? weeks.slice(weeks.length - 3) : [];
  let topExpenseDrivers: Array<{ category: string; increaseAmount: number }> = [];

  if (triggered) {
    const priorWindow = weeks.slice(Math.max(0, weeks.length - 6), weeks.length - 3);
    const erosionByCategory = new Map<string, number>();
    const priorByCategory = new Map<string, number>();

    for (const week of erosionWindow) {
      for (const [category, amount] of week.opexByCategory.entries()) {
        erosionByCategory.set(category, (erosionByCategory.get(category) ?? 0) + amount);
      }
    }
    for (const week of priorWindow) {
      for (const [category, amount] of week.opexByCategory.entries()) {
        priorByCategory.set(category, (priorByCategory.get(category) ?? 0) + amount);
      }
    }

    topExpenseDrivers = [...erosionByCategory.entries()]
      .map(([category, amount]) => ({
        category,
        increaseAmount: amount - (priorByCategory.get(category) ?? 0),
      }))
      .filter((item) => item.increaseAmount > 0)
      .sort((a, b) => b.increaseAmount - a.increaseAmount)
      .slice(0, 2);
  }

  return {
    triggered,
    netMarginTarget,
    weeksBelowTarget: streak,
    currentNetMargin: weeks[weeks.length - 1]?.netMargin ?? null,
    erosionWindow: erosionWindow.map((week) => ({
      weekStart: week.weekStart,
      netMargin: week.netMargin,
    })),
    topExpenseDrivers,
  };
}

export function detectOutstandingCollections(
  rows: SalesRow[],
  overdueThresholdDays: 7 | 14 | 30,
): OutstandingCollectionAlert[] {
  if (rows.length === 0) {
    return [];
  }

  const maxDate = rows
    .map((row) => new Date(row.date))
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? new Date();

  const byCustomer = new Map<
    number,
    {
      outstandingAmount: number;
      daysOverdue: number;
      lastTransactionDate: string;
    }
  >();

  for (const row of rows) {
    const txDate = new Date(row.date);
    const daysOverdue = dateDiffDays(maxDate, txDate);
    if (daysOverdue <= overdueThresholdDays) {
      continue;
    }

    const receivablePortion = row.sales * 0.4;
    const current = byCustomer.get(row.customerId) ?? {
      outstandingAmount: 0,
      daysOverdue: 0,
      lastTransactionDate: row.date,
    };

    current.outstandingAmount += receivablePortion;
    current.daysOverdue = Math.max(current.daysOverdue, daysOverdue);
    if (row.date > current.lastTransactionDate) {
      current.lastTransactionDate = row.date;
    }
    byCustomer.set(row.customerId, current);
  }

  return [...byCustomer.entries()]
    .map(([customerId, value]) => ({
      customerId,
      outstandingAmount: value.outstandingAmount,
      daysOverdue: value.daysOverdue,
      lastTransactionDate: value.lastTransactionDate,
      reminderMessage: `Hello Customer ${customerId}, this is a reminder that an outstanding amount of MWK ${Math.round(value.outstandingAmount).toLocaleString()} is overdue by ${value.daysOverdue} days. Please share an expected payment date. Thank you.`,
    }))
    .sort((a, b) => b.outstandingAmount - a.outstandingAmount)
    .slice(0, 100);
}

export function detectPositiveSpikeAlerts(rows: SalesRow[]): PositiveSpikeAlert[] {
  const byDate = new Map<string, { revenue: number; streams: Map<string, number> }>();
  for (const row of rows) {
    const current = byDate.get(row.date) ?? { revenue: 0, streams: new Map<string, number>() };
    current.revenue += row.sales;
    current.streams.set(row.product, (current.streams.get(row.product) ?? 0) + row.sales);
    byDate.set(row.date, current);
  }

  const dates = [...byDate.keys()].sort((a, b) => a.localeCompare(b));
  const alerts: PositiveSpikeAlert[] = [];

  for (let i = 0; i < dates.length; i += 1) {
    const date = dates[i];
    if (!date) continue;
    const dateObj = new Date(date);
    const weekday = dateObj.getDay();
    const lookbackStart = new Date(dateObj);
    lookbackStart.setDate(lookbackStart.getDate() - 90);

    const history = dates
      .slice(0, i)
      .filter((d) => {
        const obj = new Date(d);
        return obj >= lookbackStart && obj.getDay() === weekday;
      })
      .map((d) => byDate.get(d)?.revenue ?? 0);

    if (history.length < 4) {
      continue;
    }

    const baseline = history.reduce((sum, value) => sum + value, 0) / history.length;
    if (baseline <= 0) {
      continue;
    }

    const current = byDate.get(date);
    if (!current) {
      continue;
    }
    const multiplier = current.revenue / baseline;
    if (multiplier < 1.5) {
      continue;
    }

    const weekdayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
    const topStreams = [...current.streams.entries()]
      .map(([stream, revenue]) => ({
        stream,
        revenue,
        sharePct: current.revenue > 0 ? (revenue / current.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);

    alerts.push({
      date,
      weekday: weekdayName,
      revenue: current.revenue,
      baseline,
      multiplier,
      message: `Your best ${weekdayName} in 3 months - what drove this?`,
      topStreams,
    });
  }

  return alerts
    .sort((a, b) => b.multiplier - a.multiplier)
    .slice(0, 100);
}

export function detectCustomRuleAlerts(rows: SalesRow[], rules: CustomAlertRule[]): CustomRuleAlert[] {
  const enabledRules = rules.filter((rule) => rule.enabled).slice(0, 10);
  const alerts: CustomRuleAlert[] = [];

  const dailyRevenue = aggregateRevenueByPeriod(rows, "Daily");
  const weeklyRevenue = aggregateRevenueByPeriod(rows, "Weekly");

  for (const rule of enabledRules) {
    if (rule.type === "singleExpenseAbove") {
      for (const row of rows) {
        if (row.opexAmount > rule.threshold) {
          alerts.push({
            ruleId: rule.id,
            ruleName: rule.name,
            ruleType: rule.type,
            periodKey: row.date,
            actualValue: row.opexAmount,
            threshold: rule.threshold,
            message: `${rule.name}: ${normalizeVendorName(row)} expense ${row.opexAmount.toFixed(0)} exceeded threshold ${rule.threshold.toFixed(0)}.`,
          });
        }
      }
    }

    if (rule.type === "dailyRevenueBelow") {
      for (const [periodKey, values] of dailyRevenue.entries()) {
        if (values.revenue < rule.threshold) {
          alerts.push({
            ruleId: rule.id,
            ruleName: rule.name,
            ruleType: rule.type,
            periodKey,
            actualValue: values.revenue,
            threshold: rule.threshold,
            message: `${rule.name}: Daily revenue ${values.revenue.toFixed(0)} is below threshold ${rule.threshold.toFixed(0)}.`,
          });
        }
      }
    }

    if (rule.type === "weeklyRevenueBelow") {
      for (const [periodKey, values] of weeklyRevenue.entries()) {
        if (values.revenue < rule.threshold) {
          alerts.push({
            ruleId: rule.id,
            ruleName: rule.name,
            ruleType: rule.type,
            periodKey,
            actualValue: values.revenue,
            threshold: rule.threshold,
            message: `${rule.name}: Weekly revenue ${values.revenue.toFixed(0)} is below threshold ${rule.threshold.toFixed(0)}.`,
          });
        }
      }
    }
  }

  return alerts
    .sort((a, b) => {
      const aGap = Math.abs(a.actualValue - a.threshold);
      const bGap = Math.abs(b.actualValue - b.threshold);
      return bGap - aGap;
    })
    .slice(0, 200);
}

function buildRuleBasedAnomalyGuidance(summary: {
  expenseSpikeAlerts: ExpenseSpikeAlert[];
  revenueDropAlerts: RevenueDropAlert[];
  cashFlowWarning: CashFlowWarningAlert;
  duplicatePaymentFlags: DuplicatePaymentFlag[];
  unusualVendorAlerts: UnusualVendorAlert[];
  marginErosionAlert: MarginErosionAlert;
  outstandingCollections: OutstandingCollectionAlert[];
  positiveSpikeAlerts: PositiveSpikeAlert[];
  customRuleAlerts: CustomRuleAlert[];
  fatigueSignals: Record<string, AlertFatigueSignal>;
}): AnomalyAiGuidance {
  const topExpenseSpike = summary.expenseSpikeAlerts[0];
  const topRevenueDrop = summary.revenueDropAlerts[0];
  const topDuplicate = summary.duplicatePaymentFlags[0];
  const topVendorAlert = summary.unusualVendorAlerts[0];
  const topCollection = summary.outstandingCollections[0];
  const topPositive = summary.positiveSpikeAlerts[0];
  const topCustom = summary.customRuleAlerts[0];
  const mostIgnored = Object.entries(summary.fatigueSignals)
    .filter(([, signal]) => signal.ignoredStreak >= 1 && !signal.markAsNormal)
    .sort((a, b) => b[1].ignoredStreak - a[1].ignoredStreak)[0];

  return {
    overview:
      summary.cashFlowWarning.triggered || summary.marginErosionAlert.triggered
        ? "High-priority financial risk detected. Focus first on cash and margin pressure before lower-severity anomalies."
        : "No critical risks detected. Review anomalies by potential financial impact and close expected items quickly.",
    expenseSpikes: topExpenseSpike
      ? `Largest expense anomaly is ${topExpenseSpike.multiplier.toFixed(1)}x baseline in ${topExpenseSpike.category}. Validate invoice and approval trail for vendor ${topExpenseSpike.vendor}.`
      : "No major expense spikes right now. Keep monitoring 30-day category baselines.",
    revenueDrops: topRevenueDrop
      ? `Largest revenue decline is ${topRevenueDrop.dropPct.toFixed(1)}% for ${topRevenueDrop.periodType.toLowerCase()} period ${topRevenueDrop.periodKey}. Prioritize recovery actions on the worst dropped streams.`
      : "No material revenue-drop anomalies were detected against prior-month benchmarks.",
    cashFlow: summary.cashFlowWarning.triggered
      ? `Projected cash buffer breach in ${summary.cashFlowWarning.daysUntilCrunch} days. Prepare spending controls and receivable acceleration immediately.`
      : "Cash projection remains above configured minimum buffer over the next 14 days.",
    duplicatePayments: topDuplicate
      ? `Most likely duplicate is vendor ${topDuplicate.vendor} with ${topDuplicate.hoursApart.toFixed(1)} hours between payments. Confirm intent before next payout batch.`
      : "No likely duplicate vendor payments detected in the current window.",
    unusualVendors: topVendorAlert
      ? `Highest unusual vendor risk: ${topVendorAlert.vendor} at ${topVendorAlert.multiplier.toFixed(1)}x baseline. Mark expected only if documentary justification exists.`
      : "No unusual vendor payout patterns currently exceed configured thresholds.",
    marginErosion: summary.marginErosionAlert.triggered
      ? `Net margin is below target for ${summary.marginErosionAlert.weeksBelowTarget} consecutive weeks. Act on the top expense drivers listed below to arrest erosion.`
      : "Net margin has not breached target for 3 consecutive weeks.",
    outstandingCollections: topCollection
      ? `Largest overdue collection is customer ${topCollection.customerId} with ${topCollection.daysOverdue} overdue days. Prioritize immediate collection follow-up.`
      : "No overdue receivables exceed the configured threshold.",
    positiveSpikes: topPositive
      ? `Positive outlier detected on ${topPositive.date} at ${topPositive.multiplier.toFixed(1)}x baseline. Review the top revenue streams to replicate this result.`
      : "No strong positive revenue spikes detected in the current lookback window.",
    customRules: topCustom
      ? `Custom rule '${topCustom.ruleName}' is currently triggered. Review threshold fit and decide if this is expected behavior.`
      : "No custom alert rules are currently triggered.",
    alertFatigue: mostIgnored
      ? `You have ignored ${mostIgnored[0]} alerts ${mostIgnored[1].ignoredStreak} times; tune thresholds or mark as normal behavior to reduce noise.`
      : "If repeated alerts are ignored, tune thresholds or mark them as normal behavior to prevent alert fatigue.",
  };
}

async function generateGroqAnomalyGuidance(payload: {
  counts: {
    expenseSpikes: number;
    revenueDrops: number;
    duplicatePayments: number;
    unusualVendors: number;
    outstandingCollections: number;
    positiveSpikes: number;
    customRules: number;
  };
  cashFlow: {
    triggered: boolean;
    daysUntilCrunch: number | null;
    largestOutflow: number | null;
  };
  marginErosion: {
    triggered: boolean;
    weeksBelowTarget: number;
    topExpenseDrivers: string[];
  };
  fatigue: {
    repeatedIgnoredAlerts: Array<{
      alertType: string;
      ignoredStreak: number;
    }>;
    normalBehaviorMarked: number;
  };
}): Promise<Partial<AnomalyAiGuidance>> {
  if (!env.GROQ_API_KEY) {
    return {};
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        temperature: 0.2,
        max_tokens: 260,
        messages: [
          {
            role: "system",
            content:
              "You are an SME anomaly analyst. Return JSON only with keys overview, expenseSpikes, revenueDrops, cashFlow, duplicatePayments, unusualVendors, marginErosion, outstandingCollections, positiveSpikes, customRules, and alertFatigue. Each value must be one concise actionable sentence.",
          },
          {
            role: "user",
            content: `Generate guidance JSON from: ${JSON.stringify(payload)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return {};
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return {};
    }

    const parsed = JSON.parse(content) as Partial<AnomalyAiGuidance>;
    return parsed;
  } catch {
    return {};
  } finally {
    clearTimeout(timeout);
  }
}

async function generateAnomalyAiGuidance(summary: {
  expenseSpikeAlerts: ExpenseSpikeAlert[];
  revenueDropAlerts: RevenueDropAlert[];
  cashFlowWarning: CashFlowWarningAlert;
  duplicatePaymentFlags: DuplicatePaymentFlag[];
  unusualVendorAlerts: UnusualVendorAlert[];
  marginErosionAlert: MarginErosionAlert;
  outstandingCollections: OutstandingCollectionAlert[];
  positiveSpikeAlerts: PositiveSpikeAlert[];
  customRuleAlerts: CustomRuleAlert[];
  fatigueSignals: Record<string, AlertFatigueSignal>;
}): Promise<AnomalyAiGuidance> {
  const fallback = buildRuleBasedAnomalyGuidance(summary);

  const payload = {
    counts: {
      expenseSpikes: summary.expenseSpikeAlerts.length,
      revenueDrops: summary.revenueDropAlerts.length,
      duplicatePayments: summary.duplicatePaymentFlags.length,
      unusualVendors: summary.unusualVendorAlerts.length,
      outstandingCollections: summary.outstandingCollections.length,
      positiveSpikes: summary.positiveSpikeAlerts.length,
      customRules: summary.customRuleAlerts.length,
    },
    cashFlow: {
      triggered: summary.cashFlowWarning.triggered,
      daysUntilCrunch: summary.cashFlowWarning.daysUntilCrunch,
      largestOutflow: summary.cashFlowWarning.largestUpcomingOutflow?.amount ?? null,
    },
    marginErosion: {
      triggered: summary.marginErosionAlert.triggered,
      weeksBelowTarget: summary.marginErosionAlert.weeksBelowTarget,
      topExpenseDrivers: summary.marginErosionAlert.topExpenseDrivers.map((d) => d.category),
    },
    fatigue: {
      repeatedIgnoredAlerts: Object.entries(summary.fatigueSignals)
        .filter(([, signal]) => signal.ignoredStreak >= 3 && !signal.markAsNormal)
        .sort((a, b) => b[1].ignoredStreak - a[1].ignoredStreak)
        .slice(0, 5)
        .map(([alertType, signal]) => ({
          alertType,
          ignoredStreak: signal.ignoredStreak,
        })),
      normalBehaviorMarked: Object.values(summary.fatigueSignals).filter((signal) => signal.markAsNormal).length,
    },
  };

  const ai = await generateGroqAnomalyGuidance(payload);
  return {
    overview: ai.overview || fallback.overview,
    expenseSpikes: ai.expenseSpikes || fallback.expenseSpikes,
    revenueDrops: ai.revenueDrops || fallback.revenueDrops,
    cashFlow: ai.cashFlow || fallback.cashFlow,
    duplicatePayments: ai.duplicatePayments || fallback.duplicatePayments,
    unusualVendors: ai.unusualVendors || fallback.unusualVendors,
    marginErosion: ai.marginErosion || fallback.marginErosion,
    outstandingCollections: ai.outstandingCollections || fallback.outstandingCollections,
    positiveSpikes: ai.positiveSpikes || fallback.positiveSpikes,
    customRules: ai.customRules || fallback.customRules,
    alertFatigue: ai.alertFatigue || fallback.alertFatigue,
  };
}

export function anomalyEngineSummary(
  rows: SalesRow[],
  minimumBuffer: number,
  netMarginTarget: number,
  outstandingThresholdDays: 7 | 14 | 30,
  customRules: CustomAlertRule[],
  fatigueSignals: Record<string, AlertFatigueSignal> = {},
): Promise<AnomalyEngineSummary> {
  const summaryBase = {
    expenseSpikeAlerts: detectExpenseSpikeAlerts(rows),
    revenueDropAlerts: detectRevenueDropAlerts(rows),
    cashFlowWarning: detectCashFlowWarning(rows, minimumBuffer, 14),
    duplicatePaymentFlags: detectDuplicatePaymentFlags(rows),
    unusualVendorAlerts: detectUnusualVendorAlerts(rows),
    marginErosionAlert: detectMarginErosionAlert(rows, netMarginTarget),
    outstandingCollections: detectOutstandingCollections(rows, outstandingThresholdDays),
    positiveSpikeAlerts: detectPositiveSpikeAlerts(rows),
    customRuleAlerts: detectCustomRuleAlerts(rows, customRules),
  };

  return generateAnomalyAiGuidance({ ...summaryBase, fatigueSignals }).then((aiGuidance) => ({
    ...summaryBase,
    aiGuidance,
  }));
}

// ============= PER-CHART INSIGHT GENERATORS =============
export function generateRegionalInsight(
  _rows: SalesRow[],
  regions: ReturnType<typeof salesByRegion>,
): string {
  if (regions.length === 0) return "No regional data available.";
  const top = regions[0];
  const bottom = regions[regions.length - 1];
  if (!top || !bottom) return "Insufficient regional data.";
  const percentage = ((top.sales / (top.sales + bottom.sales)) * 100).toFixed(1);
  return `${top.region} generates ${percentage}% of sales between your top two regions. Focus inventory and marketing efforts on ${top.region}.`;
}

export function generateProductInsight(
  _rows: SalesRow[],
  topProducts: ReturnType<typeof salesByProduct>["top"],
): string {
  if (topProducts.length === 0) return "No product data available.";
  const top = topProducts[0];
  if (!top) return "Insufficient product data.";
  const profitMargin = top.sales > 0 ? ((top.profit / top.sales) * 100).toFixed(1) : "0.0";
  return `${top.product} is your top revenue driver (${profitMargin}% profit margin). Prioritize stock and promotional efforts here.`;
}

export function generateGenderInsight(
  _rows: SalesRow[],
  genderData: ReturnType<typeof genderSplit>,
): string {
  if (genderData.length === 0) return "No gender demographic data available.";
  const sorted = [...genderData].sort((a, b) => b.count - a.count);
  const top = sorted[0];
  if (!top) return "Insufficient gender data.";
  const percentage = ((top.count / genderData.reduce((sum, g) => sum + g.count, 0)) * 100).toFixed(0);
  return `${top.gender} customers represent ${percentage}% of your customer base. Tailor marketing and product mix accordingly.`;
}

export function generateAgeInsight(
  _rows: SalesRow[],
  ageData: ReturnType<typeof ageDistribution>,
): string {
  if (ageData.length === 0) return "No age distribution data available.";
  const topBucket = [...ageData].sort((a, b) => b.count - a.count)[0];
  if (!topBucket) return "Insufficient age data.";
  const percentage = ((topBucket.count / ageData.reduce((sum, a) => sum + a.count, 0)) * 100).toFixed(0);
  return `Your core customer segment is ages ${topBucket.bucket} (${percentage}% of transactions). Design products and pricing for this demographic.`;
}

export function generateTimeSeriesInsight(
  _rows: SalesRow[],
  timeSeries: ReturnType<typeof salesProfitOverTime>,
): string {
  if (timeSeries.length < 2) return "Insufficient time series data for trend analysis.";
  const recent = timeSeries.slice(-7);
  const earlier = timeSeries.slice(Math.max(0, timeSeries.length - 14), timeSeries.length - 7);
  const recentAvg = recent.reduce((sum, ts) => sum + ts.sales, 0) / recent.length;
  const earlierAvg = earlier.length > 0 ? earlier.reduce((sum, ts) => sum + ts.sales, 0) / earlier.length : recentAvg;
  const trend = earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;
  const direction = trend > 0 ? "increasing" : "decreasing";
  const magnitude = Math.abs(trend).toFixed(1);
  return `Sales are ${direction} by ${magnitude}% week-over-week. ${trend > 0 ? "Maintain current tactics." : "Review marketing and pricing strategies."}`;
}

// ============= BATCH INSIGHT GENERATION WITH CACHING =============
const insightCache = new Map<string, { timestamp: number; insights: Record<string, string> }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCacheKey(rows: SalesRow[], mode: string): string {
  const rowIds = rows.map((r) => `${r.customerId}-${r.date}`).join("|");
  return `${mode}:${rowIds.length}:${rows.length}`;
}

export async function generateBatchedInsights(
  rows: SalesRow[],
  enableGroq: boolean = true,
): Promise<Record<string, string>> {
  const cacheKey = getCacheKey(rows, "all");
  const cached = insightCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.insights;
  }

  const insights: Record<string, string> = {};

  insights.global = generateRuleBasedInsight(rows);
  insights.regional = generateRegionalInsight(rows, salesByRegion(rows));
  insights.product = generateProductInsight(rows, salesByProduct(rows).top);
  insights.gender = generateGenderInsight(rows, genderSplit(rows));
  insights.age = generateAgeInsight(rows, ageDistribution(rows));
  insights.timeSeries = generateTimeSeriesInsight(rows, salesProfitOverTime(rows, "Daily"));

  if (enableGroq && rows.length > 0 && env.GROQ_API_KEY) {
    try {
      insights.global = await generateGroqInsight(rows);
    } catch {
      // Fall back to rule-based
    }
  }

  insightCache.set(cacheKey, { timestamp: Date.now(), insights });
  return insights;
}

function generateRuleBasedInsight(rows: SalesRow[]) {
  if (rows.length === 0) {
    return "Insufficient data to generate insights.";
  }
  const regions = salesByRegion(rows);
  if (regions.length === 0) {
    return "Insufficient data to generate insights.";
  }
  const top = regions[0];
  const bottom = regions[regions.length - 1];
  if (!top || !bottom) {
    return "Insufficient data to generate insights.";
  }
  const gap = top.sales - bottom.sales;
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "MWK",
    maximumFractionDigits: 0,
  });

  return `Your best-performing region is ${top.region}, while ${bottom.region} had the lowest sales. The sales gap between them is ${fmt.format(gap)}.`;
}

async function generateGroqInsight(rows: SalesRow[]) {
  const totals = calculateKpis(rows);
  const topRegions = salesByRegion(rows).slice(0, 3);
  const topProducts = salesByProduct(rows).top;
  const customerStats = repeatAndChurn(rows);

  const prompt = {
    kpis: {
      totalSales: Math.round(totals.totalSales),
      totalProfit: Math.round(totals.totalProfit),
      profitMarginPercent: Number(totals.profitMargin.toFixed(2)),
    },
    topRegions,
    topProducts,
    customerStats,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        temperature: 0.2,
        max_tokens: 120,
        messages: [
          {
            role: "system",
            content:
              "You are a financial analyst for small businesses. Return exactly 1-2 plain-language sentences in English, specific and actionable. Avoid markdown and bullet points.",
          },
          {
            role: "user",
            content: `Generate a short business insight from this JSON: ${JSON.stringify(prompt)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq request failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Groq returned empty content");
    }

    return content;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateInsight(rows: SalesRow[]) {
  const fallbackInsight = generateRuleBasedInsight(rows);
  if (rows.length === 0 || !env.GROQ_API_KEY) {
    return fallbackInsight;
  }

  try {
    return await generateGroqInsight(rows);
  } catch {
    return fallbackInsight;
  }
}

export function repeatAndChurn(rows: SalesRow[]) {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const seen = new Set<number>();
  let newCustomers = 0;
  let repeatCustomers = 0;

  for (const row of sorted) {
    if (seen.has(row.customerId)) {
      repeatCustomers += 1;
    } else {
      newCustomers += 1;
      seen.add(row.customerId);
    }
  }

  const lastByCustomer = new Map<number, Date>();
  for (const row of rows) {
    const date = new Date(row.date);
    const prev = lastByCustomer.get(row.customerId);
    if (!prev || date > prev) {
      lastByCustomer.set(row.customerId, date);
    }
  }

  const maxDate = rows.reduce((max, row) => {
    const d = new Date(row.date);
    return d > max ? d : max;
  }, new Date(rows[0]?.date ?? Date.now()));

  const churnThreshold = new Date(maxDate);
  churnThreshold.setDate(churnThreshold.getDate() - 30);

  let churnedCustomers = 0;
  for (const date of lastByCustomer.values()) {
    if (date < churnThreshold) {
      churnedCustomers += 1;
    }
  }

  return { newCustomers, repeatCustomers, churnedCustomers };
}

export function detectAnomalies(rows: SalesRow[], contamination = 0.05) {
  const daily = salesProfitOverTime(rows, "Daily").map((item) => ({
    date: item.date,
    sales: item.sales,
  }));

  if (daily.length === 0) {
    return { anomalies: [], series: [] as Array<{ date: string; sales: number; anomaly: boolean }> };
  }

  const values = daily.map((d) => d.sales);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / Math.max(1, values.length - 1);
  const std = Math.sqrt(variance) || 1;

  const baseThreshold = 2.0;
  const adaptive = Math.max(1.4, baseThreshold - contamination * 4);

  const series = daily.map((d) => {
    const z = Math.abs((d.sales - mean) / std);
    const anomaly = z > adaptive;
    return { ...d, anomaly };
  });

  const anomalies = series.filter((d) => d.anomaly);
  return { anomalies, series };
}

export function forecast(rows: SalesRow[], periods = 30) {
  const daily = salesProfitOverTime(rows, "Daily").map((item) => ({
    date: item.date,
    y: item.sales,
  }));

  if (daily.length === 0) {
    return [] as Array<{ date: string; yhat: number; yhatLower: number; yhatUpper: number }>;
  }

  const n = daily.length;
  const xs = daily.map((_, idx) => idx);
  const ys = daily.map((d) => d.y);

  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    const x = xs[i] ?? 0;
    const y = ys[i] ?? 0;
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  }

  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  const residuals = ys.map((y, i) => y - (intercept + slope * (xs[i] ?? 0)));
  const sigma =
    Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / Math.max(1, residuals.length - 1)) || 1;

  const startDate = new Date(daily[0]!.date);
  const total = n + Math.max(0, periods);
  const output: Array<{ date: string; yhat: number; yhatLower: number; yhatUpper: number }> = [];

  for (let i = 0; i < total; i += 1) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const yhat = intercept + slope * i;
    output.push({
      date: d.toISOString().slice(0, 10),
      yhat,
      yhatLower: yhat - 1.96 * sigma,
      yhatUpper: yhat + 1.96 * sigma,
    });
  }

  return output;
}

function zNorm(values: number[]) {
  const mean = values.reduce((s, v) => s + v, 0) / Math.max(1, values.length);
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / Math.max(1, values.length - 1);
  const std = Math.sqrt(variance) || 1;
  return values.map((v) => (v - mean) / std);
}

export function segmentCustomers(rows: SalesRow[], k = 3) {
  if (rows.length === 0) {
    return [] as Array<{ customerId: number; customerAge: number; sales: number; segment: number }>;
  }

  const ages = zNorm(rows.map((r) => r.customerAge));
  const sales = zNorm(rows.map((r) => r.sales));
  const points = rows.map((r, i) => ({
    customerId: r.customerId,
    customerAge: r.customerAge,
    sales: r.sales,
    x: ages[i] ?? 0,
    y: sales[i] ?? 0,
  }));

  const clusters = Math.min(Math.max(1, k), Math.min(6, points.length));
  const centroids = points.slice(0, clusters).map((p) => ({ x: p.x, y: p.y }));
  const assignment = new Array(points.length).fill(0);

  for (let iter = 0; iter < 20; iter += 1) {
    for (let i = 0; i < points.length; i += 1) {
      let best = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let c = 0; c < clusters; c += 1) {
        const point = points[i];
        const centroid = centroids[c];
        if (!point || !centroid) {
          continue;
        }
        const dx = point.x - centroid.x;
        const dy = point.y - centroid.y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          best = c;
        }
      }
      assignment[i] = best;
    }

    for (let c = 0; c < clusters; c += 1) {
      const idx = assignment
        .map((a, i) => ({ a, i }))
        .filter((v) => v.a === c)
        .map((v) => v.i);
      if (idx.length === 0) {
        continue;
      }
      const cx = idx.reduce((sum, i) => sum + (points[i]?.x ?? 0), 0) / idx.length;
      const cy = idx.reduce((sum, i) => sum + (points[i]?.y ?? 0), 0) / idx.length;
      centroids[c] = { x: cx, y: cy };
    }
  }

  return points.map((p, i) => ({
    customerId: p.customerId,
    customerAge: p.customerAge,
    sales: p.sales,
    segment: assignment[i] ?? 0,
  }));
}

export function filterOptions(rows: SalesRow[]) {
  const regions = [...new Set(rows.map((r) => r.region))].sort();
  const products = [...new Set(rows.map((r) => r.product))].sort();
  const dates = rows.map((r) => r.date).sort();
  return {
    regions,
    products,
    minDate: dates[0] ?? null,
    maxDate: dates[dates.length - 1] ?? null,
  };
}

// ============================================================================
// PHASE 1: GST AUTO-CALCULATION ENGINE
// ============================================================================

/**
 * Calculate GST amounts based on invoice type and transaction data
 * Splits GST into CGST, SGST, IGST based on transaction type
 * @param grossAmount - Base amount before GST
 * @param gstRate - GST rate as string "0%", "5%", "12%", "18%", "28%"
 * @param invoiceType - "B2B", "B2C", or "B2BSE" (determines CGST/SGST vs IGST split)
 * @returns Object with CGST, SGST, IGST amounts
 */
export function calculateGSTAmounts(
  grossAmount: number,
  gstRate: string,
  invoiceType: "B2B" | "B2C" | "B2BSE",
): {
  gstRatePercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGSTAmount: number;
  taxableAmount: number;
} {
  // Extract rate percentage from string like "18%" or 18
  const rateStr = String(gstRate).replace("%", "");
  const ratePercent = Number.parseFloat(rateStr) || 0;
  const totalGSTAmount = (grossAmount * ratePercent) / 100;

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (invoiceType === "B2BSE") {
    // Export: Usually 0% GST (on IGST), but handled as special case
    // If GST applied, use IGST (full amount)
    igstAmount = totalGSTAmount;
  } else if (invoiceType === "B2C") {
    // B2C: Usually combined as CGST + SGST
    cgstAmount = totalGSTAmount / 2;
    sgstAmount = totalGSTAmount / 2;
  } else {
    // B2B: Split into CGST (50%) and SGST (50%) for domestic transactions
    cgstAmount = totalGSTAmount / 2;
    sgstAmount = totalGSTAmount / 2;
  }

  return {
    gstRatePercent: ratePercent,
    cgstAmount: Math.round(cgstAmount * 100) / 100,
    sgstAmount: Math.round(sgstAmount * 100) / 100,
    igstAmount: Math.round(igstAmount * 100) / 100,
    totalGSTAmount: Math.round(totalGSTAmount * 100) / 100,
    taxableAmount: grossAmount,
  };
}

/**
 * Determine ITC (Input Tax Credit) Eligibility
 * Checks if purchase GST can be offset against output GST liability
 * Rules: Only from registered vendors, not blocked categories, not personal use
 * @param supplierRegistration - "registered", "unregistered", "composition"
 * @param category - Purchase category: "COGS", "Services", "CapitalAssets", "OPEX"
 * @param itemCategory - Specific item category (to check if blocked)
 * @returns { itcEligible, itcBlockReason? }
 */
export function determineITCEligibility(
  supplierRegistration: "registered" | "unregistered" | "composition",
  category: "COGS" | "Services" | "CapitalAssets" | "OPEX" | "Other",
  itemCategory: string,
): {
  itcEligible: boolean;
  itcBlockReason?: string;
  itcEligibilityPercent: number; // 100 for full, 0 for blocked, 50 for partial
} {
  // Rule 1: Supplier must be registered
  if (supplierRegistration === "unregistered") {
    return {
      itcEligible: false,
      itcBlockReason: "Supplier is not GST registered",
      itcEligibilityPercent: 0,
    };
  }

  if (supplierRegistration === "composition") {
    return {
      itcEligible: false,
      itcBlockReason: "Supplier under composition scheme (no GST charged)",
      itcEligibilityPercent: 0,
    };
  }

  // Rule 2: Blocked categories (non-creditable)
  const blockedCategories = [
    "fuel",
    "motor spirit",
    "diesel",
    "cigarettes",
    "alcohol",
    "personal use",
    "entertainment",
  ];
  const isBlocked = blockedCategories.some((blocked) =>
    itemCategory.toLowerCase().includes(blocked),
  );

  if (isBlocked) {
    return {
      itcEligible: false,
      itcBlockReason: `Blocked category (${itemCategory}) - Not creditable`,
      itcEligibilityPercent: 0,
    };
  }

  // Rule 3: Capital Assets have special valuation rules, but ITC claimable
  if (category === "CapitalAssets") {
    // For fixed assets, depreciation applies differently
    // Simplified: Capital assets are eligible but tracked separately
    return {
      itcEligible: true,
      itcEligibilityPercent: 100,
    };
  }

  // All other categories from registered vendors: Eligible
  return {
    itcEligible: true,
    itcEligibilityPercent: 100,
  };
}

/**
 * Calculate Current Month GST Liability
 * Aggregates all invoices in a month to show Output GST, Input GST, and Net
 * @param invoices - Array of GSTInvoice (sales)
 * @param purchases - Array of GSSTPurchaseTransaction (purchases)
 * @param month - "MM/YYYY" format, e.g., "03/2024"
 * @returns GSTLiabilitySummary for the month
 */
export function calculateMonthlyGSTLiability(
  invoices: GSTInvoice[],
  purchases: GSSTPurchaseTransaction[],
  month: string, // "MM/YYYY"
): GSTLiabilitySummary {
  const [monthStr, yearStr] = month.split("/");
  const monthNum = Number.parseInt(monthStr ?? "1", 10);
  const yearNum = Number.parseInt(yearStr ?? "2024", 10);

  // Filter invoices & purchases for the month
  const monthInvoices = invoices.filter((inv) => {
    const invDate = new Date(inv.invoiceDate);
    return invDate.getMonth() + 1 === monthNum && invDate.getFullYear() === yearNum;
  });

  const monthPurchases = purchases.filter((purch) => {
    const purchDate = new Date(purch.invoiceDate);
    return purchDate.getMonth() + 1 === monthNum && purchDate.getFullYear() === yearNum;
  });

  // Calculate Output GST (from sales)
  const outputGST = {
    b2b: { cgst: 0, sgst: 0, igst: 0, total: 0 },
    b2c: { amount: 0, total: 0 },
    b2bse: { igst: 0, total: 0 },
    totalOutput: 0,
  };

  for (const inv of monthInvoices) {
    if (inv.invoiceType === "B2B") {
      outputGST.b2b.cgst += inv.totalCGST;
      outputGST.b2b.sgst += inv.totalSGST;
      outputGST.b2b.igst += inv.totalIGST;
      outputGST.b2b.total += inv.totalGSTAmount;
    } else if (inv.invoiceType === "B2C") {
      outputGST.b2c.amount += inv.totalGSTAmount;
      outputGST.b2c.total += inv.totalGSTAmount;
    } else if (inv.invoiceType === "B2BSE") {
      outputGST.b2bse.igst += inv.totalIGST;
      outputGST.b2bse.total += inv.totalGSTAmount;
    }
  }

  outputGST.totalOutput = outputGST.b2b.total + outputGST.b2c.total + outputGST.b2bse.total;

  // Calculate Input GST (from purchases - ITC eligible only)
  let inputEligible = { cgst: 0, sgst: 0, igst: 0, total: 0 };
  let inputBlocked = { amount: 0 };

  for (const purch of monthPurchases) {
    if (purch.itcEligibility === "full" || purch.itcEligibility === "partial") {
      const eligiblePercent = purch.itcEligibility === "full" ? 1 : 0.5;
      inputEligible.cgst += purch.totalCGST * eligiblePercent;
      inputEligible.sgst += purch.totalSGST * eligiblePercent;
      inputEligible.igst += purch.totalIGST * eligiblePercent;
      inputEligible.total += purch.totalGSTAmount * eligiblePercent;
    } else if (purch.itcEligibility === "blocked") {
      inputBlocked.amount += purch.totalGSTAmount;
    }
  }

  const inputGST = {
    eligible: inputEligible,
    blocked: inputBlocked,
    totalInput: inputEligible.total,
    totalBlocked: inputBlocked.amount,
  };

  // Calculate Net Liability
  const netLiability = outputGST.totalOutput - inputGST.totalInput;
  const paymentDueDate = new Date(yearNum, monthNum, 20); // 20th of next month
  const paymentStatus = netLiability > 0 ? "due" : "credit";

  return {
    month,
    asOfDate: new Date().toISOString().slice(0, 10),
    outputGST,
    inputGST,
    netGSTLiability: Math.round(netLiability * 100) / 100,
    paymentStatus: netLiability > 0 ? "due" : "credit",
    paymentDueDate: paymentDueDate.toISOString().slice(0, 10),
    itcAvailable: inputEligible.total,
    itcUtilized: Math.min(inputEligible.total, outputGST.totalOutput),
    itcExpiring: 0, // To be calculated from purchase dates
  };
}

/**
 * Track ITC Expiry
 * ITC is valid for 5 years but flagged if approaching expiry
 * Current rule: ITC older than 2 years is marked for review
 * @param purchaseDate - Date of purchase invoice
 * @returns { expiryDate, daysUntilExpiry, shouldWarn }
 */
export function calculateITCExpiry(
  purchaseDate: string,
): {
  expiryDate: string;
  daysUntilExpiry: number;
  shouldWarn: boolean;
} {
  const purchDate = new Date(purchaseDate);
  const expiryDate = new Date(purchDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 2); // 2-year window for immediate claim

  const today = new Date();
  const daysLeft = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const shouldWarn = daysLeft < 30; // Warn if < 30 days to expiry

  return {
    expiryDate: expiryDate.toISOString().slice(0, 10),
    daysUntilExpiry: daysLeft,
    shouldWarn,
  };
}

/**
 * Build GSTR-1 JSON Structure (Ready for GSTN Portal Upload)
 * Formats invoices into exact GSTN-required JSON structure
 * @param invoices - Array of GSTInvoice for the month
 * @param month - "MM/YYYY"
 * @returns GSTR-1 JSON object ready for upload
 */
export function buildGSTR1JSON(
  invoices: GSTInvoice[],
  month: string, // "MM/YYYY"
  businessGSTIN: string,
): {
  fp: string; // Financial period MM/YYYY without slash
  gsptin: string;
  version: string;
  b2b: Array<{
    ctin: string;
    inv: Array<{
      inum: string;
      idt: string;
      val: number;
      itms: Array<{
        hsn: string;
        desc: string;
        qty: number;
        uqc: string;
        rt: number;
        amt: number;
        csamt: number;
        sgamt: number;
        igamt: number;
        txval: number;
      }>;
      invtx: number;
      tcs: number;
      typ: string;
    }>;
  }>;
  b2cs: {
    osup_zero: number;
    osup: Array<{
      rt: number;
      txval: number;
      iamt: number;
    }>;
  };
  hsn: Array<{
    hsn: string;
    desc: string;
    qty: number;
    uqc: string;
    val: number;
    txval: number;
    iamt: number;
  }>;
  warnings?: string[]; // Validation warnings
  errors?: string[]; // Validation errors
} {
  const [monthStr, yearStr] = month.split("/");
  const fp = `${monthStr}${yearStr}`; // "032024" format

  const warnings: string[] = [];
  const errors: string[] = [];

  // Filter invoices for the month
  const [monthNum, yearNum] = [Number.parseInt(monthStr ?? "1", 10), Number.parseInt(yearStr ?? "2024", 10)];
  const monthInvoices = invoices.filter((inv) => {
    const invDate = new Date(inv.invoiceDate);
    return invDate.getMonth() + 1 === monthNum && invDate.getFullYear() === yearNum;
  });

  // Build B2B section (invoices with buyer GSTIN)
  const b2bMap = new Map<string, typeof monthInvoices>();
  const b2cInvoices = []; // B2C invoices (no GSTIN)

  for (const inv of monthInvoices) {
    if (inv.invoiceType === "B2B" && inv.buyerGSTIN) {
      const existing = b2bMap.get(inv.buyerGSTIN) ?? [];
      existing.push(inv);
      b2bMap.set(inv.buyerGSTIN, existing);
    } else if (inv.invoiceType === "B2C") {
      b2cInvoices.push(inv);
    } else if (!inv.buyerGSTIN && inv.invoiceType === "B2B") {
      warnings.push(`Invoice ${inv.invoiceNumber} is B2B but missing buyer GSTIN`);
    }
  }

  // Format B2B
  const b2b = [];
  for (const [ctin, invList] of b2bMap.entries()) {
    const invItems = invList.map((inv) => ({
      inum: inv.invoiceNumber,
      idt: inv.invoiceDate,
      val: inv.totalGrossAmount,
      itms: inv.items.map((item) => ({
        hsn: item.hsn_sac_code,
        desc: item.description,
        qty: item.quantity,
        uqc: item.unitOfMeasure,
        rt: item.gstRate === "0%" ? 0 : Number.parseInt(item.gstRate, 10),
        amt: item.grossAmount,
        csamt: item.cgstAmount,
        sgamt: item.sgstAmount,
        igamt: item.igstAmount,
        txval: item.taxableAmount,
      })),
      invtx: inv.totalGSTAmount,
      tcs: 0, // Tax Collected at Source (if applicable)
      typ: inv.status === "cancelled" ? "D" : "R", // R = Regular, D = Debit, C = Credit
    }));

    b2b.push({ ctin, inv: invItems });
  }

  // Format B2C (aggregate by rate)
  const b2cByRate = new Map<number, { txval: number; iamt: number }>();
  for (const inv of b2cInvoices) {
    for (const item of inv.items) {
      const rate = Number.parseInt(item.gstRate, 10);
      const existing = b2cByRate.get(rate) ?? { txval: 0, iamt: 0 };
      existing.txval += item.taxableAmount;
      existing.iamt += item.gstRate === "0%" ? 0 : item.cgstAmount + item.sgstAmount;
      b2cByRate.set(rate, existing);
    }
  }

  const b2cs = {
    osup_zero: 0, // B2C @ 0%
    osup: [...b2cByRate.entries()].map(([rate, data]) => ({
      rt: rate,
      txval: data.txval,
      iamt: data.iamt,
    })),
  };

  // Format HSN summary
  const hsnMap = new Map<string, { qty: number; val: number; txval: number; iamt: number; desc: string; uqc: string }>();
  for (const inv of monthInvoices) {
    for (const item of inv.items) {
      const existing = hsnMap.get(item.hsn_sac_code) ?? {
        qty: 0,
        val: 0,
        txval: 0,
        iamt: 0,
        desc: "",
        uqc: "",
      };
      existing.qty += item.quantity;
      existing.val += item.grossAmount;
      existing.txval += item.taxableAmount;
      existing.iamt += item.cgstAmount + item.sgstAmount + item.igstAmount;
      existing.desc = item.description;
      existing.uqc = item.unitOfMeasure;
      hsnMap.set(item.hsn_sac_code, existing);
    }
  }

  const hsn = [...hsnMap.entries()].map(([code, data]) => ({
    hsn: code,
    desc: data.desc,
    qty: data.qty,
    uqc: data.uqc,
    val: data.val,
    txval: data.txval,
    iamt: data.iamt,
  }));

  return {
    fp,
    gsptin: businessGSTIN,
    version: "2.0",
    b2b,
    b2cs,
    hsn,
    warnings: warnings.length > 0 ? warnings : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ============================================================================
// PHASE 1: TAX COMPLIANCE CALENDAR
// India-specific tax deadlines and alert management
// ============================================================================

/**
 * Standard India Tax Deadlines (FY 2023-24 & onwards)
 * Returns all applicable tax filing deadlines for a financial year
 * @param fy - Financial year "2023-24" format
 * @param registrationType - "regular" or "composition"
 * @returns Array of TaxDeadlineConfig for the FY
 */
export function getStandardTaxDeadlines(
  registrationType: "regular" | "composition" = "regular",
): TaxDeadlineConfig[] {
  const baseDeadlines: TaxDeadlineConfig[] = [
    {
      id: "gstr1-monthly",
      name: "GSTR-1 Filing (Monthly)",
      frequency: "monthly" as const,
      dueType: "GSTR1" as const,
      dueDay: 20,
      alertDaysBeforeDue: 10,
      escalateToDailyDaysBeforeDue: 3,
      applicableForRegistrationType: ["regular"],
      financialYearStart: "04-01",
    },
    {
      id: "gstr3-monthly",
      name: "GSTR-3 Filing (Monthly)",
      frequency: "monthly" as const,
      dueType: "GSTR3" as const,
      dueDay: 20,
      alertDaysBeforeDue: 10,
      escalateToDailyDaysBeforeDue: 3,
      applicableForRegistrationType: ["regular"],
      financialYearStart: "04-01",
    },
    {
      id: "gstr9-annual",
      name: "GSTR-9 (Annual Return)",
      frequency: "annual" as const,
      dueType: "GSTR9" as const,
      dueDay: 31,
      dueMonth: 12,
      alertDaysBeforeDue: 30,
      escalateToDailyDaysBeforeDue: 7,
      applicableForRegistrationType: ["regular", "composition"],
      financialYearStart: "04-01",
    },
    {
      id: "advance-tax-q1",
      name: "Advance Tax Q1 (Jun - Aug)",
      frequency: "quarterly" as const,
      dueType: "AdvanceTax" as const,
      dueDay: 15,
      dueMonth: 6,
      alertDaysBeforeDue: 15,
      escalateToDailyDaysBeforeDue: 3,
      applicableForRegistrationType: ["regular", "composition"],
      financialYearStart: "04-01",
    },
    {
      id: "advance-tax-q2",
      name: "Advance Tax Q2 (Sep - Nov)",
      frequency: "quarterly" as const,
      dueType: "AdvanceTax" as const,
      dueDay: 15,
      dueMonth: 9,
      alertDaysBeforeDue: 15,
      escalateToDailyDaysBeforeDue: 3,
      applicableForRegistrationType: ["regular", "composition"],
      financialYearStart: "04-01",
    },
    {
      id: "advance-tax-q3",
      name: "Advance Tax Q3 (Dec - Feb)",
      frequency: "quarterly" as const,
      dueType: "AdvanceTax" as const,
      dueDay: 15,
      dueMonth: 12,
      alertDaysBeforeDue: 15,
      escalateToDailyDaysBeforeDue: 3,
      applicableForRegistrationType: ["regular", "composition"],
      financialYearStart: "04-01",
    },
    {
      id: "advance-tax-q4",
      name: "Advance Tax Q4 (Mar)",
      frequency: "quarterly" as const,
      dueType: "AdvanceTax" as const,
      dueDay: 15,
      dueMonth: 3,
      alertDaysBeforeDue: 15,
      escalateToDailyDaysBeforeDue: 3,
      applicableForRegistrationType: ["regular", "composition"],
      financialYearStart: "04-01",
    },
    {
      id: "itr-annual",
      name: "Income Tax Return (ITR) Filing",
      frequency: "annual" as const,
      dueType: "ITR" as const,
      dueDay: 31,
      dueMonth: 7,
      alertDaysBeforeDue: 45,
      escalateToDailyDaysBeforeDue: 10,
      applicableForRegistrationType: ["regular", "composition"],
      financialYearStart: "04-01",
    },
    {
      id: "tds-monthly",
      name: "TDS Deposit (Monthly)",
      frequency: "monthly" as const,
      dueType: "TDS" as const,
      dueDay: 7,
      alertDaysBeforeDue: 3,
      escalateToDailyDaysBeforeDue: 1,
      applicableForRegistrationType: ["regular", "composition"],
      financialYearStart: "04-01",
    },
  ];

  // Add composition-specific deadline
  if (registrationType === "composition") {
    baseDeadlines.push({
      id: "gstr-quarterly",
      name: "GSTR Filing (Quarterly)",
      frequency: "quarterly" as const,
      dueType: "GSTR3" as const,
      dueDay: 18,
      alertDaysBeforeDue: 10,
      escalateToDailyDaysBeforeDue: 3,
      applicableForRegistrationType: ["composition"],
      financialYearStart: "04-01",
    });
  }

  return baseDeadlines;
}

/**
 * Calculate specific deadline date for a given rule and month
 * @param rule - TaxDeadlineConfig
 * @param referenceDate - Current or reference date
 * @returns { dueDate, dayName, isOverdue, daysUntilDue }
 */
export function calculateDeadlineDate(
  rule: TaxDeadlineConfig,
  referenceDate: Date = new Date(),
): {
  dueDate: Date;
  dueDay: number;
  dueMonth: number;
  dueYear: number;
  dayName: string;
  isOverdue: boolean;
  daysUntilDue: number;
  alertStatus: "critical" | "warning" | "notice" | "upcoming";
} {
  let dueDate: Date;

  if (rule.frequency === "monthly") {
    // Monthly: next month, dueDay
    dueDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, rule.dueDay);
  } else if (rule.frequency === "quarterly" && rule.dueMonth) {
    // Quarterly: on specified month every quarter
    dueDate = new Date(referenceDate.getFullYear(), rule.dueMonth - 1, rule.dueDay);
    if (dueDate < referenceDate) {
      dueDate.setFullYear(dueDate.getFullYear() + 1);
    }
  } else if (rule.frequency === "annual" && rule.dueMonth) {
    // Annual: on specified month
    dueDate = new Date(referenceDate.getFullYear(), rule.dueMonth - 1, rule.dueDay);
    if (dueDate < referenceDate) {
      dueDate.setFullYear(dueDate.getFullYear() + 1);
    }
  } else {
    // Default: next month
    dueDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, rule.dueDay);
  }

  const daysUntilDue = Math.floor((dueDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntilDue < 0;

  let alertStatus: "critical" | "warning" | "notice" | "upcoming" = "upcoming";
  if (isOverdue) {
    alertStatus = "critical";
  } else if (daysUntilDue <= rule.escalateToDailyDaysBeforeDue) {
    alertStatus = "critical";
  } else if (daysUntilDue <= rule.alertDaysBeforeDue) {
    alertStatus = "warning";
  } else {
    alertStatus = "notice";
  }

  return {
    dueDate,
    dueDay: rule.dueDay,
    dueMonth: rule.dueMonth ?? dueDate.getMonth() + 1,
    dueYear: dueDate.getFullYear(),
    dayName: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
      dueDate.getDay()
    ] as string,
    isOverdue,
    daysUntilDue,
    alertStatus,
  };
}

/**
 * Get All Upcoming Tax Deadlines (Next 90 Days)
 * Returns sorted list with alert priorities
 * @param registrationType - "regular" or "composition"
 * @param lookAheadDays - Number of days to look ahead (default: 90)
 * @returns Array of deadlines sorted by due date
 */
export function getUpcomingTaxDeadlines(
  registrationType: "regular" | "composition" = "regular",
  lookAheadDays: number = 90,
): Array<{
  rule: TaxDeadlineConfig;
  dueDate: Date;
  daysUntilDue: number;
  alertStatus: "critical" | "warning" | "notice" | "upcoming";
  isOverdue: boolean;
}> {
  const rules = getStandardTaxDeadlines(registrationType);
  const now = new Date();
  const upcomingDeadlines = [];

  // Generate deadline instances for next 90 days
  for (const rule of rules) {
    // For monthly and quarterly, generate multiple instances
    const instances = rule.frequency === "annual" || rule.dueMonth ? 1 : 3;

    for (let i = 0; i < instances; i++) {
      const testDate = new Date(now);
      if (rule.frequency === "monthly") {
        testDate.setMonth(testDate.getMonth() + i);
      } else if (rule.frequency === "quarterly") {
        testDate.setMonth(testDate.getMonth() + i * 3);
      }

     const calculated = calculateDeadlineDate(rule, testDate);

      if (calculated.daysUntilDue >= -7 && calculated.daysUntilDue <= lookAheadDays) {
        upcomingDeadlines.push({
          rule,
          dueDate: calculated.dueDate,
          daysUntilDue: calculated.daysUntilDue,
          alertStatus: calculated.alertStatus,
          isOverdue: calculated.isOverdue,
        });
      }
    }
  }

  // Remove duplicates and sort
  const seen = new Set<string>();
  const unique = upcomingDeadlines.filter((d) => {
    const key = `${d.rule.id}-${d.dueDate.toISOString().slice(0, 10)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

/**
 * Format Alert Message for Tax Deadline
 * Creates user-friendly alert text for display
 * @param rule - TaxDeadlineConfig
 * @param daysUntilDue - Number of days until deadline
 * @returns Alert message string
 */
export function formatTaxDeadlineAlert(rule: TaxDeadlineConfig, daysUntilDue: number): string {
  if (daysUntilDue < 0) {
    return `🔴 OVERDUE: ${rule.name} was due ${Math.abs(daysUntilDue)} days ago. File immediately to avoid penalties.`;
  }

  if (daysUntilDue === 0) {
    return `🔴 CRITICAL: ${rule.name} is due TODAY. File now to avoid penalties.`;
  }

  if (daysUntilDue <= rule.escalateToDailyDaysBeforeDue) {
    return `🔴 CRITICAL: ${rule.name} due in ${daysUntilDue} day${daysUntilDue > 1 ? "s" : ""}. Act immediately.`;
  }

  if (daysUntilDue <= rule.alertDaysBeforeDue) {
    return `🟡 WARNING: ${rule.name} due in ${daysUntilDue} days. Schedule filing soon.`;
  }

  return `🟢 NOTICE: ${rule.name} due in ${daysUntilDue} days.`;
}
