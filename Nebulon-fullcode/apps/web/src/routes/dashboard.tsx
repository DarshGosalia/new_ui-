import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
});

type SalesRow = {
  customerId: number;
  date: string;
  region: string;
  product: string;
  vendor: string;
  sales: number;
  profit: number;
  customerAge: number;
  customerGender: string;
  cogsCategory: string;
  cogsAmount: number;
  opexCategory: string;
  opexAmount: number;
};

type DashboardTab =
  | "Dashboard"
  | "Alerts & Anomalies"
  | "Sales Forecast"
  | "Customer Segmentation"
  | "Tax & Compliance";
type ForecastView = "sales" | "cash";
type GstRate = "0%" | "5%" | "12%" | "18%" | "28%";
type GstInvoiceType = "B2B" | "B2C" | "B2BSE";
type SupplierRegistration = "registered" | "unregistered" | "composition";
type PurchaseCategory = "COGS" | "Services" | "CapitalAssets" | "OPEX" | "Other";

type CustomAlertRuleType = "singleExpenseAbove" | "dailyRevenueBelow" | "weeklyRevenueBelow";

type CustomAlertRule = {
  id: string;
  name: string;
  type: CustomAlertRuleType;
  threshold: number;
  enabled: boolean;
};

type FatigueEntry = {
  ignoredStreak: number;
  markAsNormal: boolean;
};

type RecurringExpenseInput = {
  id: string;
  name: string;
  amount: number;
  dayOfMonth: number;
};

type WhatIfScenarioInput = {
  id: string;
  name: string;
  type: "stockLoan" | "manualCollection";
  amount: number;
  date: string;
};

const CUSTOM_RULE_TYPE_OPTIONS: Array<{ value: CustomAlertRuleType; label: string; thresholdLabel: string }> = [
  {
    value: "singleExpenseAbove",
    label: "Single expense above amount",
    thresholdLabel: "Amount threshold",
  },
  {
    value: "dailyRevenueBelow",
    label: "Daily revenue below amount",
    thresholdLabel: "Revenue floor",
  },
  {
    value: "weeklyRevenueBelow",
    label: "Weekly revenue below amount",
    thresholdLabel: "Revenue floor",
  },
];

const REQUIRED_CSV_HEADERS = [
  "Customer ID",
  "Date",
  "Region",
  "Product",
  "Sales",
  "Profit",
  "Customer Age",
  "Customer Gender",
  "COGS Category",
  "COGS Amount",
  "OPEX Category",
  "OPEX Amount",
] as const;

function isValidDate(value: string) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function parseCsvRows(csvText: string): SalesRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV has no data rows.");
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  const missingHeaders = REQUIRED_CSV_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required column(s): ${missingHeaders.join(", ")}`);
  }

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

  const rows = lines.slice(1).map((line, lineOffset) => {
    const cols = line.split(",").map((col) => col.trim());
    const customerId = Number(cols[customerIdIdx]);
    const date = cols[dateIdx] ?? "";
    const region = cols[regionIdx] ?? "";
    const product = cols[productIdx] ?? "";
    const sales = Number(cols[salesIdx]);
    const profit = Number(cols[profitIdx]);
    const vendor = vendorIdx >= 0 ? (cols[vendorIdx] ?? "") : "";
    const customerAge = Number(cols[customerAgeIdx]);
    const customerGender = cols[customerGenderIdx] ?? "Unknown";
    const cogsCategory = cols[cogsCategoryIdx] ?? "";
    const cogsAmount = Number(cols[cogsAmountIdx]);
    const opexCategory = cols[opexCategoryIdx] ?? "";
    const opexAmount = Number(cols[opexAmountIdx]);

    if (!Number.isFinite(customerId)) {
      throw new Error(`Invalid Customer ID at row ${lineOffset + 2}`);
    }
    if (!isValidDate(date)) {
      throw new Error(`Invalid Date at row ${lineOffset + 2}`);
    }
    if (!region || !product || !customerGender || !cogsCategory || !opexCategory) {
      throw new Error(`Missing text fields at row ${lineOffset + 2}`);
    }
    if (
      !Number.isFinite(sales) ||
      !Number.isFinite(profit) ||
      !Number.isFinite(customerAge) ||
      !Number.isFinite(cogsAmount) ||
      !Number.isFinite(opexAmount)
    ) {
      throw new Error(`Invalid numeric values at row ${lineOffset + 2}`);
    }

    return {
      customerId,
      date,
      region,
      product,
      vendor: vendor || `${(opexCategory || "General").trim()} Vendor`,
      sales,
      profit,
      customerAge,
      customerGender,
      cogsCategory,
      cogsAmount,
      opexCategory,
      opexAmount,
    };
  });

  if (rows.length === 0) {
    throw new Error("CSV did not contain valid data rows.");
  }

  return rows;
}

function toCsv(rows: SalesRow[]) {
  const header = [
    "Customer ID",
    "Date",
    "Region",
    "Product",
    "Vendor",
    "Sales",
    "Profit",
    "Customer Age",
    "Customer Gender",
    "COGS Category",
    "COGS Amount",
    "OPEX Category",
    "OPEX Amount",
  ];
  const body = rows.map((row) => [
    row.customerId,
    row.date,
    row.region,
    row.product,
    row.vendor,
    row.sales,
    row.profit,
    row.customerAge,
    row.customerGender,
    row.cogsCategory,
    row.cogsAmount,
    row.opexCategory,
    row.opexAmount,
  ]);
  return [header, ...body].map((cols) => cols.join(",")).join("\n");
}

function downloadBlob(filename: string, mimeType: string, data: BlobPart) {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "MWK",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatComparison(comparison?: { absoluteChange: number; percentageChange: number } | null) {
  if (!comparison) return null;
  const { absoluteChange, percentageChange } = comparison;
  const isPositive = absoluteChange >= 0;
  const arrow = isPositive ? "↑" : "↓";
  const color = isPositive ? "text-green-600" : "text-red-500";
  return (
    <div className={`text-xs ${color}`}>
      {arrow} {percentageChange > 0 ? "+" : ""}{percentageChange.toFixed(1)}% ({currency(absoluteChange)})
    </div>
  );
}

function monthFromDate(date: string) {
  return date ? date.slice(0, 7) : "";
}

function currentMonthLabel() {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}

function monthLabelToDate(monthLabel: string) {
  const [mm, yyyy] = monthLabel.split("/");
  if (!mm || !yyyy) {
    return new Date().toISOString().slice(0, 10);
  }
  return `${yyyy}-${mm.padStart(2, "0")}-01`;
}

function heatmapColor(intensity: 0 | 1 | 2 | 3 | 4 | 5, isZero: boolean) {
  if (isZero) {
    return "#fecaca";
  }
  if (intensity === 5) {
    return "#166534";
  }
  if (intensity === 4) {
    return "#15803d";
  }
  if (intensity === 3) {
    return "#22c55e";
  }
  if (intensity === 2) {
    return "#86efac";
  }
  if (intensity === 1) {
    return "#dcfce7";
  }
  return "#f8fafc";
}

type MarginStatus = "green" | "amber" | "red";
type SafetyStatus = "green" | "amber" | "red";

function getMarginStatus(current: number, target: number, threshold: number): MarginStatus {
  if (current >= target) {
    return "green";
  }
  if (current >= target - threshold) {
    return "amber";
  }
  return "red";
}

function marginStatusLabel(status: MarginStatus, current: number, target: number) {
  const delta = Math.abs(target - current).toFixed(1);
  if (status === "green") {
    return "On Target";
  }
  if (status === "amber") {
    return `Below Target by ${delta}%`;
  }
  return `Critical: ${delta}% below target`;
}

function marginStatusClasses(status: MarginStatus) {
  if (status === "green") {
    return "border-emerald-300 bg-emerald-50 text-emerald-800";
  }
  if (status === "amber") {
    return "border-amber-300 bg-amber-50 text-amber-900";
  }
  return "border-red-300 bg-red-50 text-red-800";
}

function getCashSafetyStatus(totalLiquidBalance: number, minimumBuffer: number): SafetyStatus {
  if (totalLiquidBalance < minimumBuffer) {
    return "red";
  }
  if (totalLiquidBalance <= minimumBuffer * 1.2) {
    return "amber";
  }
  return "green";
}

function cashSafetyLabel(status: SafetyStatus, totalLiquidBalance: number, minimumBuffer: number) {
  if (status === "green") {
    return "Healthy buffer level";
  }
  if (status === "amber") {
    return `Approaching minimum buffer (${currency(minimumBuffer)})`;
  }
  const gap = minimumBuffer - totalLiquidBalance;
  return `Below safety buffer by ${currency(Math.max(0, gap))}`;
}

function cashSafetyClasses(status: SafetyStatus) {
  if (status === "green") {
    return "border-emerald-300 bg-emerald-50 text-emerald-900";
  }
  if (status === "amber") {
    return "border-amber-300 bg-amber-50 text-amber-900";
  }
  return "border-red-300 bg-red-50 text-red-900";
}

function RouteComponent() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("Dashboard");
  const [aggregation, setAggregation] = useState<"Daily" | "Weekly" | "Monthly">("Daily");
  const [periods, setPeriods] = useState(30);
  const [forecastView, setForecastView] = useState<ForecastView>("sales");
  const [cashHorizonDays, setCashHorizonDays] = useState<30 | 60 | 90>(30);
  const [cashMode, setCashMode] = useState<"conservative" | "realistic">("realistic");
  const [clusters, setClusters] = useState(3);
  const [uploadedRows, setUploadedRows] = useState<SalesRow[] | undefined>(undefined);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [heatmapMonth, setHeatmapMonth] = useState("");
  const [selectedHeatmapDate, setSelectedHeatmapDate] = useState("");
  const [uploadMessage, setUploadMessage] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");
  const [comparisonMode, setComparisonMode] = useState<"none" | "previousPeriod" | "yoY">("none");
  const [comparisonCustomStart, setComparisonCustomStart] = useState<string>("");
  const [comparisonCustomEnd, setComparisonCustomEnd] = useState<string>("");
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string>("");
  const [grossMarginTarget, setGrossMarginTarget] = useState<number>(50);
  const [netMarginTarget, setNetMarginTarget] = useState<number>(15);
  const [alertThreshold, setAlertThreshold] = useState<number>(5);
  const [showMarginSettings, setShowMarginSettings] = useState<boolean>(false);
  const [minimumCashBuffer, setMinimumCashBuffer] = useState<number>(300000);
  const [outstandingThresholdDays, setOutstandingThresholdDays] = useState<7 | 14 | 30>(14);
  const [showLatestCashChange, setShowLatestCashChange] = useState<boolean>(false);
  const [confirmedDuplicateFlags, setConfirmedDuplicateFlags] = useState<string[]>([]);
  const [vendorAlertActions, setVendorAlertActions] = useState<Record<string, "expected" | "investigate">>({});
  const [customRules, setCustomRules] = useState<CustomAlertRule[]>([]);
  const [newRuleName, setNewRuleName] = useState<string>("");
  const [newRuleType, setNewRuleType] = useState<CustomAlertRuleType>("singleExpenseAbove");
  const [newRuleThreshold, setNewRuleThreshold] = useState<number>(50000);
  const [fatigueState, setFatigueState] = useState<Record<string, FatigueEntry>>({});
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpenseInput[]>([]);
  const [newRecurringName, setNewRecurringName] = useState<string>("");
  const [newRecurringAmount, setNewRecurringAmount] = useState<number>(0);
  const [newRecurringDay, setNewRecurringDay] = useState<number>(1);
  const [whatIfScenarios, setWhatIfScenarios] = useState<WhatIfScenarioInput[]>([]);
  const [newScenarioName, setNewScenarioName] = useState<string>("");
  const [newScenarioType, setNewScenarioType] = useState<"stockLoan" | "manualCollection">("stockLoan");
  const [newScenarioAmount, setNewScenarioAmount] = useState<number>(50000);
  const [newScenarioDate, setNewScenarioDate] = useState<string>("");
  const [taxRegistrationType, setTaxRegistrationType] = useState<"regular" | "composition">("regular");
  const [taxDaysAhead, setTaxDaysAhead] = useState<number>(90);
  const [complianceMonth, setComplianceMonth] = useState<string>(currentMonthLabel());
  const [businessGstin, setBusinessGstin] = useState<string>("27ABCDE1234F1Z5");
  const [gstGrossAmount, setGstGrossAmount] = useState<number>(10000);
  const [gstRate, setGstRate] = useState<GstRate>("18%");
  const [gstInvoiceType, setGstInvoiceType] = useState<GstInvoiceType>("B2B");
  const [supplierRegistration, setSupplierRegistration] = useState<SupplierRegistration>("registered");
  const [purchaseCategory, setPurchaseCategory] = useState<PurchaseCategory>("COGS");
  const [purchaseItemCategory, setPurchaseItemCategory] = useState<string>("Raw Material");
  const [itcPurchaseDate, setItcPurchaseDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const meta = useQuery(trpc.biMeta.queryOptions({ rows: uploadedRows }));

  const regions = meta.data?.regions ?? [];
  const products = meta.data?.products ?? [];
  const minDate = meta.data?.minDate ?? "";
  const maxDate = meta.data?.maxDate ?? "";

  const resolvedRegions = selectedRegions.length > 0 ? selectedRegions : undefined;
  const resolvedProducts = selectedProducts.length > 0 ? selectedProducts : undefined;
  const resolvedStartDate = startDate || minDate;
  const resolvedEndDate = endDate || maxDate;

  const commonFilters = useMemo(
    () => ({
      rows: uploadedRows,
      regions: resolvedRegions,
      products: resolvedProducts,
      startDate: resolvedStartDate,
      endDate: resolvedEndDate,
    }),
    [uploadedRows, resolvedRegions, resolvedProducts, resolvedStartDate, resolvedEndDate],
  );

  const dashboard = useQuery(
    trpc.biDashboard.queryOptions({
      ...commonFilters,
      aggregation,
      minimumCashBuffer,
      netMarginTarget,
      outstandingThresholdDays,
      customRules,
      fatigueState,
      comparisonMode: comparisonMode === "none" ? undefined : (comparisonMode as "previousPeriod" | "yoY"),
      comparisonCustomStart: comparisonCustomStart || undefined,
      comparisonCustomEnd: comparisonCustomEnd || undefined,
    }),
  );
  const anomalies = useQuery(trpc.biAnomalies.queryOptions(commonFilters));
  const forecast = useQuery(trpc.biForecast.queryOptions({ ...commonFilters, periods }));
  const cashForecast = useQuery(
    trpc.biCashForecast.queryOptions({
      ...commonFilters,
      horizonDays: cashHorizonDays,
      mode: cashMode,
      minimumBuffer: minimumCashBuffer,
      recurringExpenses,
      scenarios: whatIfScenarios,
    }),
  );
  const cashForecastConservative = useQuery(
    trpc.biCashForecast.queryOptions({
      ...commonFilters,
      horizonDays: cashHorizonDays,
      mode: "conservative",
      minimumBuffer: minimumCashBuffer,
      recurringExpenses,
      scenarios: whatIfScenarios,
    }),
  );
  const cashForecastRealistic = useQuery(
    trpc.biCashForecast.queryOptions({
      ...commonFilters,
      horizonDays: cashHorizonDays,
      mode: "realistic",
      minimumBuffer: minimumCashBuffer,
      recurringExpenses,
      scenarios: whatIfScenarios,
    }),
  );
  const segmentation = useQuery(trpc.biSegmentation.queryOptions({ ...commonFilters, clusters }));
  const pnl = useQuery(trpc.biProfitLoss.queryOptions(commonFilters));
  const heatmap = useQuery(
    trpc.biRevenueHeatmap.queryOptions({
      ...commonFilters,
      month: heatmapMonth || monthFromDate(resolvedEndDate),
    }),
  );
  const dayBreakdown = useQuery({
    ...trpc.biDayTransactions.queryOptions({
      ...commonFilters,
      date: selectedHeatmapDate || resolvedEndDate,
    }),
    enabled: Boolean(selectedHeatmapDate),
  });

  const gstCalc = useQuery(
    trpc.gstCalculateAmounts.queryOptions({
      grossAmount: gstGrossAmount,
      gstRate,
      invoiceType: gstInvoiceType,
    }),
  );

  const gstItcEligibility = useQuery(
    trpc.gstCheckITCEligibility.queryOptions({
      supplierRegistration,
      category: purchaseCategory,
      itemCategory: purchaseItemCategory,
    }),
  );

  const taxDeadlines = useQuery(
    trpc.taxCalendarGetDeadlines.queryOptions({
      registrationType: taxRegistrationType,
    }),
  );

  const taxUpcoming = useQuery(
    trpc.taxCalendarUpcoming.queryOptions({
      registrationType: taxRegistrationType,
      daysAhead: taxDaysAhead,
    }),
  );

  const liabilityInput = useMemo(() => {
    const ratePercent = Number(gstRate.replace("%", "")) || 0;
    const invoiceDate = monthLabelToDate(complianceMonth);
    const tax = (gstGrossAmount * ratePercent) / 100;
    const cgst = gstInvoiceType === "B2BSE" ? 0 : tax / 2;
    const sgst = gstInvoiceType === "B2BSE" ? 0 : tax / 2;
    const igst = gstInvoiceType === "B2BSE" ? tax : 0;
    const halfAmount = Math.max(0, Math.round((gstGrossAmount / 2) * 100) / 100);
    const halfTax = Math.max(0, Math.round((tax / 2) * 100) / 100);

    return {
      invoices: [
        {
          id: "ui-sample-invoice",
          invoiceNumber: "UI-INV-001",
          invoiceDate,
          invoiceType: gstInvoiceType,
          buyerName: "Sample Buyer",
          buyerGSTIN: gstInvoiceType === "B2B" ? "27AAAAA0000A1Z5" : undefined,
          items: [
            {
              hsn_sac_code: "9983",
              description: "Sample supply",
              quantity: 1,
              unitOfMeasure: "NOS",
              unitPrice: gstGrossAmount,
              grossAmount: gstGrossAmount,
              gstRate,
              cgstAmount: cgst,
              sgstAmount: sgst,
              igstAmount: igst,
              taxableAmount: gstGrossAmount,
              totalAmount: gstGrossAmount + tax,
            },
          ],
          totalGrossAmount: gstGrossAmount,
          totalTaxableAmount: gstGrossAmount,
          totalCGST: cgst,
          totalSGST: sgst,
          totalIGST: igst,
          totalGSTAmount: tax,
          totalInvoiceAmount: gstGrossAmount + tax,
          status: "issued",
        },
      ],
      purchases: [
        {
          id: "ui-sample-purchase",
          invoiceNumber: "UI-PUR-001",
          invoiceDate,
          supplierName: "Sample Supplier",
          supplierGSTIN: supplierRegistration === "registered" ? "27BBBBB0000B1Z5" : undefined,
          supplierRegistrationType: supplierRegistration,
          items: [
            {
              hsn_sac_code: "9983",
              description: purchaseItemCategory,
              quantity: 1,
              unitOfMeasure: "NOS",
              unitPrice: halfAmount,
              grossAmount: halfAmount,
              gstRate,
              cgstAmount: gstInvoiceType === "B2BSE" ? 0 : halfTax / 2,
              sgstAmount: gstInvoiceType === "B2BSE" ? 0 : halfTax / 2,
              igstAmount: gstInvoiceType === "B2BSE" ? halfTax : 0,
              taxableAmount: halfAmount,
              totalAmount: halfAmount + halfTax,
            },
          ],
          totalGrossAmount: halfAmount,
          totalTaxableAmount: halfAmount,
          totalCGST: gstInvoiceType === "B2BSE" ? 0 : halfTax / 2,
          totalSGST: gstInvoiceType === "B2BSE" ? 0 : halfTax / 2,
          totalIGST: gstInvoiceType === "B2BSE" ? halfTax : 0,
          totalGSTAmount: halfTax,
          totalInvoiceAmount: halfAmount + halfTax,
          category: purchaseCategory,
          itcEligibility: gstItcEligibility.data?.itcEligible ? "full" : "blocked",
          itcBlockReason: gstItcEligibility.data?.itcBlockReason,
          itcClaimable: {
            cgst: gstItcEligibility.data?.itcEligible ? (gstInvoiceType === "B2BSE" ? 0 : halfTax / 2) : 0,
            sgst: gstItcEligibility.data?.itcEligible ? (gstInvoiceType === "B2BSE" ? 0 : halfTax / 2) : 0,
            igst: gstItcEligibility.data?.itcEligible ? (gstInvoiceType === "B2BSE" ? halfTax : 0) : 0,
            total: gstItcEligibility.data?.itcEligible ? halfTax : 0,
          },
          gstr2aMatched: false,
          paymentStatus: "paid",
        },
      ],
    };
  }, [
    complianceMonth,
    gstGrossAmount,
    gstInvoiceType,
    gstItcEligibility.data?.itcBlockReason,
    gstItcEligibility.data?.itcEligible,
    gstRate,
    purchaseCategory,
    purchaseItemCategory,
    supplierRegistration,
  ]);

  const gstMonthlyLiability = useQuery(
    trpc.gstMonthlyLiability.queryOptions({
      month: complianceMonth,
      invoices: liabilityInput.invoices,
      purchases: liabilityInput.purchases,
    }),
  );

  const gstItcExpiry = useQuery(
    trpc.gstITCExpiry.queryOptions({
      purchaseDate: itcPurchaseDate,
    }),
  );

  const gstGstr1Export = useQuery(
    trpc.gstExportGSTR1.queryOptions({
      month: complianceMonth,
      businessGSTIN: businessGstin,
      invoices: liabilityInput.invoices,
    }),
  );

  useEffect(() => {
    if (!heatmapMonth && resolvedEndDate) {
      setHeatmapMonth(monthFromDate(resolvedEndDate));
    }
  }, [heatmapMonth, resolvedEndDate]);

  useEffect(() => {
    const stored = localStorage.getItem("biMarginTargets");
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as {
        grossMarginTarget?: number;
        netMarginTarget?: number;
        alertThreshold?: number;
      };
      if (typeof parsed.grossMarginTarget === "number") {
        setGrossMarginTarget(parsed.grossMarginTarget);
      }
      if (typeof parsed.netMarginTarget === "number") {
        setNetMarginTarget(parsed.netMarginTarget);
      }
      if (typeof parsed.alertThreshold === "number") {
        setAlertThreshold(parsed.alertThreshold);
      }
    } catch {
      // Ignore malformed local storage payloads.
    }
  }, []);

  useEffect(() => {
    const payload = JSON.stringify({ grossMarginTarget, netMarginTarget, alertThreshold });
    localStorage.setItem("biMarginTargets", payload);
  }, [grossMarginTarget, netMarginTarget, alertThreshold]);

  useEffect(() => {
    const stored = localStorage.getItem("biCashBuffer");
    if (!stored) {
      return;
    }
    const parsed = Number(stored);
    if (Number.isFinite(parsed) && parsed >= 0) {
      setMinimumCashBuffer(parsed);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("biCashBuffer", String(minimumCashBuffer));
  }, [minimumCashBuffer]);

  useEffect(() => {
    const stored = localStorage.getItem("biOutstandingThresholdDays");
    if (!stored) {
      return;
    }
    const parsed = Number(stored);
    if (parsed === 7 || parsed === 14 || parsed === 30) {
      setOutstandingThresholdDays(parsed);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("biOutstandingThresholdDays", String(outstandingThresholdDays));
  }, [outstandingThresholdDays]);

  useEffect(() => {
    const stored = localStorage.getItem("biDuplicateFlagsConfirmed");
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed)) {
        setConfirmedDuplicateFlags(parsed);
      }
    } catch {
      // Ignore malformed local storage payloads.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("biDuplicateFlagsConfirmed", JSON.stringify(confirmedDuplicateFlags));
  }, [confirmedDuplicateFlags]);

  useEffect(() => {
    const stored = localStorage.getItem("biVendorAlertActions");
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as Record<string, "expected" | "investigate">;
      if (parsed && typeof parsed === "object") {
        setVendorAlertActions(parsed);
      }
    } catch {
      // Ignore malformed local storage payloads.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("biVendorAlertActions", JSON.stringify(vendorAlertActions));
  }, [vendorAlertActions]);

  useEffect(() => {
    const stored = localStorage.getItem("biCustomAlertRules");
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as CustomAlertRule[];
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .filter((rule) => rule && typeof rule === "object")
          .map((rule) => ({
            id: String(rule.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
            name: String(rule.name ?? "Untitled rule"),
            type:
              rule.type === "singleExpenseAbove" ||
              rule.type === "dailyRevenueBelow" ||
              rule.type === "weeklyRevenueBelow"
                ? rule.type
                : "singleExpenseAbove",
            threshold: Number.isFinite(rule.threshold) ? Number(rule.threshold) : 0,
            enabled: Boolean(rule.enabled),
          }))
          .slice(0, 10);
        setCustomRules(normalized);
      }
    } catch {
      // Ignore malformed local storage payloads.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("biCustomAlertRules", JSON.stringify(customRules));
  }, [customRules]);

  useEffect(() => {
    const stored = localStorage.getItem("biAlertFatigueState");
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as Record<string, FatigueEntry>;
      if (parsed && typeof parsed === "object") {
        const normalized = Object.fromEntries(
          Object.entries(parsed).map(([key, entry]) => [
            key,
            {
              ignoredStreak: Math.max(0, Number(entry?.ignoredStreak ?? 0) || 0),
              markAsNormal: Boolean(entry?.markAsNormal),
            },
          ]),
        );
        setFatigueState(normalized);
      }
    } catch {
      // Ignore malformed local storage payloads.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("biAlertFatigueState", JSON.stringify(fatigueState));
  }, [fatigueState]);

  useEffect(() => {
    const stored = localStorage.getItem("biRecurringExpenses");
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as RecurringExpenseInput[];
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .filter((item) => item && typeof item === "object")
          .map((item) => ({
            id: String(item.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
            name: String(item.name ?? "Untitled Expense"),
            amount: Number.isFinite(item.amount) ? Number(item.amount) : 0,
            dayOfMonth: Math.min(31, Math.max(1, Number(item.dayOfMonth) || 1)),
          }))
          .slice(0, 50);
        setRecurringExpenses(normalized);
      }
    } catch {
      // Ignore malformed local storage payloads.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("biRecurringExpenses", JSON.stringify(recurringExpenses));
  }, [recurringExpenses]);

  useEffect(() => {
    const stored = localStorage.getItem("biWhatIfScenarios");
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as WhatIfScenarioInput[];
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .filter((item) => item && typeof item === "object")
          .map((item) => ({
            id: String(item.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
            name: String(item.name ?? "Scenario"),
            type:
              item.type === "manualCollection"
                ? ("manualCollection" as const)
                : ("stockLoan" as const),
            amount: Number.isFinite(item.amount) ? Number(item.amount) : 0,
            date: String(item.date ?? ""),
          }))
          .filter((item) => Boolean(item.date))
          .slice(0, 20);
        setWhatIfScenarios(normalized);
      }
    } catch {
      // Ignore malformed local storage payloads.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("biWhatIfScenarios", JSON.stringify(whatIfScenarios));
  }, [whatIfScenarios]);

  useEffect(() => {
    const firstCategory = dashboard.data?.expenseBreakdown?.byCategory?.[0]?.name ?? "";
    if (!selectedExpenseCategory && firstCategory) {
      setSelectedExpenseCategory(firstCategory);
    }
  }, [dashboard.data?.expenseBreakdown?.byCategory, selectedExpenseCategory]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseCsvRows(text);
      setUploadedRows(parsed);
      setSelectedRegions([]);
      setSelectedProducts([]);
      setStartDate("");
      setEndDate("");
      setUploadError("");
      setUploadMessage(`Loaded ${parsed.length} rows from ${file.name}`);
    } catch (error) {
      setUploadMessage("");
      setUploadError(error instanceof Error ? error.message : "Could not parse CSV file.");
    }
  };

  const clearUploadedData = () => {
    setUploadedRows(undefined);
    setSelectedRegions([]);
    setSelectedProducts([]);
    setStartDate("");
    setEndDate("");
    setUploadError("");
    setUploadMessage("Using default dataset.");
  };

  const exportFilteredCsv = () => {
    const rows = dashboard.data?.filteredRows ?? [];
    downloadBlob("filtered_data.csv", "text/csv;charset=utf-8", toCsv(rows));
  };

  const exportFilteredExcel = async () => {
    const rows = dashboard.data?.filteredRows ?? [];
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Filtered Data");

    worksheet.addRow([
      "Customer ID",
      "Date",
      "Region",
      "Product",
      "Vendor",
      "Sales",
      "Profit",
      "Customer Age",
      "Customer Gender",
      "COGS Category",
      "COGS Amount",
      "OPEX Category",
      "OPEX Amount",
    ]);

    for (const row of rows) {
      worksheet.addRow([
        row.customerId,
        row.date,
        row.region,
        row.product,
        row.vendor,
        row.sales,
        row.profit,
        row.customerAge,
        row.customerGender,
        row.cogsCategory,
        row.cogsAmount,
        row.opexCategory,
        row.opexAmount,
      ]);
    }

    const wbOut = await workbook.xlsx.writeBuffer();
    downloadBlob(
      "filtered_data.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      wbOut,
    );
  };

  const exportProfitLossPdf = () => {
    if (!pnl.data) {
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("SME Profit & Loss Statement", 14, 18);
    doc.setFontSize(10);
    doc.text(`Date Range: ${resolvedStartDate || "N/A"} to ${resolvedEndDate || "N/A"}`, 14, 26);

    const lines: Array<[string, string]> = [
      ["Gross Revenue", currency(pnl.data.grossRevenue)],
      ["Cost of Goods Sold (COGS)", currency(pnl.data.cogs)],
      ["Gross Profit", currency(pnl.data.grossProfit)],
      ["Operating Expenses", currency(pnl.data.operatingExpenses)],
      ["Net Profit", currency(pnl.data.netProfit)],
      ["Reported Net Profit", currency(pnl.data.reportedNetProfit)],
      ["Net Profit Variance", currency(pnl.data.netProfitVariance)],
      ["Gross Margin", `${pnl.data.grossMarginPct.toFixed(2)}%`],
      ["Net Margin", `${pnl.data.netMarginPct.toFixed(2)}%`],
    ];

    let y = 40;
    doc.setFontSize(12);
    for (const [label, value] of lines) {
      doc.text(label, 14, y);
      doc.text(value, 140, y, { align: "right" });
      y += 9;
    }

    if (pnl.data.isEstimated) {
      y += 6;
      doc.setFontSize(10);
      doc.text("Notes:", 14, y);
      y += 6;
      for (const note of pnl.data.assumptions) {
        doc.text(`- ${note}`, 16, y, { maxWidth: 175 });
        y += 6;
      }
    }

    doc.save(`profit_loss_${resolvedStartDate || "start"}_${resolvedEndDate || "end"}.pdf`);
  };

  const expenseData = dashboard.data?.expenseBreakdown;
  const expenseTransactions = (expenseData?.transactions ?? []).filter(
    (item) => item.category === selectedExpenseCategory,
  );
  const grossStatus = getMarginStatus(
    dashboard.data?.marginTracker?.currentGrossMargin ?? 0,
    grossMarginTarget,
    alertThreshold,
  );
  const netStatus = getMarginStatus(
    dashboard.data?.marginTracker?.currentNetMargin ?? 0,
    netMarginTarget,
    alertThreshold,
  );
  const liquidBalance = dashboard.data?.cashInHand?.totalLiquidBalance ?? 0;
  const cashSafety = getCashSafetyStatus(liquidBalance, minimumCashBuffer);
  const expenseSpikeAlerts = dashboard.data?.anomalyEngine?.expenseSpikeAlerts ?? [];
  const revenueDropAlerts = dashboard.data?.anomalyEngine?.revenueDropAlerts ?? [];
  const cashFlowWarning = dashboard.data?.anomalyEngine?.cashFlowWarning;
  const duplicatePaymentFlags = dashboard.data?.anomalyEngine?.duplicatePaymentFlags ?? [];
  const unusualVendorAlerts = dashboard.data?.anomalyEngine?.unusualVendorAlerts ?? [];
  const marginErosionAlert = dashboard.data?.anomalyEngine?.marginErosionAlert;
  const outstandingCollections = dashboard.data?.anomalyEngine?.outstandingCollections ?? [];
  const positiveSpikeAlerts = dashboard.data?.anomalyEngine?.positiveSpikeAlerts ?? [];
  const customRuleAlerts = dashboard.data?.anomalyEngine?.customRuleAlerts ?? [];
  const anomalyAi = dashboard.data?.anomalyEngine?.aiGuidance;
  const alertFatigueRows = [
    { key: "expenseSpikes", label: "Expense Spike Alerts", activeCount: expenseSpikeAlerts.length },
    { key: "revenueDrops", label: "Revenue Drop Alerts", activeCount: revenueDropAlerts.length },
    { key: "cashFlow", label: "Cash Flow Warnings", activeCount: cashFlowWarning?.triggered ? 1 : 0 },
    { key: "duplicatePayments", label: "Duplicate Payment Flags", activeCount: duplicatePaymentFlags.length },
    { key: "unusualVendors", label: "Unusual Vendor Alerts", activeCount: unusualVendorAlerts.length },
    { key: "marginErosion", label: "Margin Erosion Alerts", activeCount: marginErosionAlert?.triggered ? 1 : 0 },
    { key: "outstandingCollections", label: "Outstanding Collections", activeCount: outstandingCollections.length },
    { key: "positiveSpikes", label: "Positive Spike Alerts", activeCount: positiveSpikeAlerts.length },
    { key: "customRules", label: "Custom Rule Alerts", activeCount: customRuleAlerts.length },
  ];

  const addCustomRule = () => {
    if (customRules.length >= 10) {
      return;
    }
    const trimmedName = newRuleName.trim();
    const threshold = Number(newRuleThreshold);
    if (!trimmedName || !Number.isFinite(threshold) || threshold <= 0) {
      return;
    }
    setCustomRules((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: trimmedName,
        type: newRuleType,
        threshold,
        enabled: true,
      },
    ]);
    setNewRuleName("");
  };

  const cashComparisonSeries = useMemo(() => {
    const conservative = cashForecastConservative.data?.projection ?? [];
    const realistic = cashForecastRealistic.data?.projection ?? [];
    const seasonal = cashForecastRealistic.data?.seasonalBaseline.points ?? [];
    const dates = new Set<string>([
      ...conservative.map((point) => point.date),
      ...realistic.map((point) => point.date),
      ...seasonal.map((point) => point.date),
    ]);
    return [...dates]
      .sort((a, b) => a.localeCompare(b))
      .map((date) => ({
        date,
        conservative: conservative.find((point) => point.date === date)?.projectedBalance ?? null,
        realistic: realistic.find((point) => point.date === date)?.projectedBalance ?? null,
        priorYearBaseline: seasonal.find((point) => point.date === date)?.priorYearBalance ?? null,
      }));
  }, [
    cashForecastConservative.data?.projection,
    cashForecastRealistic.data?.projection,
    cashForecastRealistic.data?.seasonalBaseline.points,
  ]);

  const receivableDependencyAmount =
    (cashForecastRealistic.data?.projection.slice(-1)[0]?.projectedBalance ?? 0) -
    (cashForecastConservative.data?.projection.slice(-1)[0]?.projectedBalance ?? 0);

  const scenarioComparisonSeries = useMemo(() => {
    const base = cashForecast.data?.projection ?? [];
    return base.map((point) => {
      const row: Record<string, string | number | null> = {
        date: point.date,
        base: point.projectedBalance,
      };
      for (const scenario of whatIfScenarios) {
        row[scenario.id] = point.date >= scenario.date ? point.projectedBalance + scenario.amount : point.projectedBalance;
      }
      return row;
    });
  }, [cashForecast.data?.projection, whatIfScenarios]);

  return (
    <div className="grid h-full grid-cols-1 gap-4 p-4 md:grid-cols-[280px_1fr]">
      <aside className="space-y-3 border p-3">
        <h2 className="text-lg font-semibold">SME Dashboard</h2>
        <div className="grid gap-2">
          {(["Dashboard", "Alerts & Anomalies", "Sales Forecast", "Customer Segmentation", "Tax & Compliance"] as const).map(
            (tab) => (
              <button
                key={tab}
                className={`border px-3 py-2 text-left text-sm ${activeTab === tab ? "bg-primary text-primary-foreground" : ""}`}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                {tab}
              </button>
            ),
          )}
        </div>
        <div className="border-t pt-3">
          <label className="mb-1 block text-xs font-medium">Upload your CSV data</label>
          <input className="w-full text-xs" type="file" accept=".csv" onChange={handleUpload} />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Required columns: {REQUIRED_CSV_HEADERS.join(", ")}
          </p>
          {uploadMessage && <p className="mt-1 text-[11px] text-emerald-700">{uploadMessage}</p>}
          {uploadError && <p className="mt-1 text-[11px] text-red-600">{uploadError}</p>}
          {uploadedRows && (
            <button
              type="button"
              className="mt-2 border px-2 py-1 text-xs"
              onClick={clearUploadedData}
            >
              Use Default Dataset
            </button>
          )}
        </div>
        <div className="grid gap-2 border-t pt-3">
          <label className="text-xs font-medium">Filter by Region</label>
          <select
            className="h-24 border p-1 text-xs"
            multiple
            value={selectedRegions}
            onChange={(e) => setSelectedRegions([...e.target.selectedOptions].map((o) => o.value))}
          >
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
          <label className="text-xs font-medium">Filter by Product</label>
          <select
            className="h-24 border p-1 text-xs"
            multiple
            value={selectedProducts}
            onChange={(e) => setSelectedProducts([...e.target.selectedOptions].map((o) => o.value))}
          >
            {products.map((product) => (
              <option key={product} value={product}>
                {product}
              </option>
            ))}
          </select>
          <label className="text-xs font-medium">Start Date</label>
          <input
            type="date"
            className="border p-1 text-xs"
            value={startDate}
            min={minDate}
            max={endDate || maxDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <label className="text-xs font-medium">End Date</label>
          <input
            type="date"
            className="border p-1 text-xs"
            value={endDate}
            min={startDate || minDate}
            max={maxDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <label className="text-xs font-medium">Aggregate by</label>
          <select
            className="border p-1 text-xs"
            value={aggregation}
            onChange={(e) => setAggregation(e.target.value as "Daily" | "Weekly" | "Monthly")}
          >
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
          </select>
          <label className="text-xs font-medium">Compare Against</label>
          <select
            className="border p-1 text-xs"
            value={comparisonMode}
            onChange={(e) => {
              setComparisonMode(e.target.value as "none" | "previousPeriod" | "yoY");
              setComparisonCustomStart("");
              setComparisonCustomEnd("");
            }}
          >
            <option value="none">None</option>
            <option value="previousPeriod">Previous Period</option>
            <option value="yoY">Same Period Last Year</option>
          </select>
          <button type="button" className="border px-2 py-1 text-xs" onClick={exportFilteredCsv}>
            Download Current Data as CSV
          </button>
          <button type="button" className="border px-2 py-1 text-xs" onClick={exportFilteredExcel}>
            Download Filtered Data as Excel
          </button>
          <button type="button" className="border px-2 py-1 text-xs" onClick={exportProfitLossPdf}>
            Export P&L as PDF
          </button>
        </div>
      </aside>

      <main className="space-y-4 overflow-auto">
        <h1 className="text-2xl font-bold">SME Business Intelligence Dashboard (Malawi)</h1>
        {activeTab === "Dashboard" && (
          <>
            <Card className={`border-2 ${cashSafetyClasses(cashSafety)}`}>
              <CardHeader>
                <CardTitle>Cash In Hand</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="md:col-span-2 rounded border border-current/30 bg-white/70 p-3">
                    <div className="text-xs opacity-80">Current Liquid Balance</div>
                    <div className="text-3xl font-bold">{currency(liquidBalance)}</div>
                    <div className="mt-1 text-xs">{cashSafetyLabel(cashSafety, liquidBalance, minimumCashBuffer)}</div>
                  </div>
                  <div className="rounded border border-current/30 bg-white/70 p-3">
                    <div className="text-xs opacity-80">Bank Balance</div>
                    <div className="text-lg font-semibold">{currency(dashboard.data?.cashInHand?.bankBalance ?? 0)}</div>
                  </div>
                  <div className="rounded border border-current/30 bg-white/70 p-3">
                    <div className="text-xs opacity-80">Cash On Hand</div>
                    <div className="text-lg font-semibold">{currency(dashboard.data?.cashInHand?.cashOnHand ?? 0)}</div>
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-[220px_1fr_auto] md:items-end">
                  <label className="grid gap-1 text-xs">
                    Owner Minimum Buffer
                    <input
                      type="number"
                      min={0}
                      className="border p-1"
                      value={minimumCashBuffer}
                      onChange={(e) => setMinimumCashBuffer(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </label>
                  <div className="text-xs opacity-80">
                    Safety indicator: green above buffer, amber near buffer, red below buffer.
                  </div>
                  <button
                    type="button"
                    className="border px-2 py-1 text-xs"
                    onClick={() => setShowLatestCashChange((prev) => !prev)}
                  >
                    {showLatestCashChange ? "Hide Latest Change" : "Show Latest Change"}
                  </button>
                </div>

                {showLatestCashChange && (
                  <div className="rounded border border-current/30 bg-white/80 p-3 text-xs">
                    <div className="mb-2 font-medium">Latest Transaction Impact</div>
                    {dashboard.data?.cashInHand?.latestChange ? (
                      <div className="grid gap-2 md:grid-cols-4">
                        <div>
                          <div className="opacity-70">Date</div>
                          <div>{dashboard.data.cashInHand.latestChange.date}</div>
                        </div>
                        <div>
                          <div className="opacity-70">Region</div>
                          <div>{dashboard.data.cashInHand.latestChange.region}</div>
                        </div>
                        <div>
                          <div className="opacity-70">Product</div>
                          <div>{dashboard.data.cashInHand.latestChange.product}</div>
                        </div>
                        <div>
                          <div className="opacity-70">Net Cash Delta</div>
                          <div className={dashboard.data.cashInHand.latestChange.netCashDelta >= 0 ? "text-emerald-700" : "text-red-700"}>
                            {currency(dashboard.data.cashInHand.latestChange.netCashDelta)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>No transaction data available for this filter selection.</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Total Sales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>{currency(dashboard.data?.kpis.totalSales ?? 0)}</div>
                  {formatComparison(dashboard.data?.totalSalesComparison)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Total Profit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>{currency(dashboard.data?.kpis.totalProfit ?? 0)}</div>
                  {formatComparison(dashboard.data?.totalProfitComparison)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Profit Margin</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>{(dashboard.data?.kpis.profitMargin ?? 0).toFixed(2)}%</div>
                  {formatComparison(dashboard.data?.profitMarginComparison)}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Expense Breakdown (OPEX)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 text-xs md:grid-cols-2">
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">Total Expenses</div>
                      <div className="font-medium">{currency(expenseData?.totalExpenses ?? 0)}</div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">Top Category</div>
                      <div className="font-medium">
                        {expenseData?.topCategory
                          ? `${expenseData.topCategory.name} (${expenseData.topCategory.percentage.toFixed(1)}%)`
                          : "N/A"}
                      </div>
                    </div>
                  </div>

                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseData?.byCategory ?? []}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={95}
                          label
                          onClick={(_, index) => {
                            const clicked = expenseData?.byCategory?.[index];
                            if (clicked) {
                              setSelectedExpenseCategory(clicked.name);
                            }
                          }}
                        >
                          {(expenseData?.byCategory ?? []).map((entry) => (
                            <Cell
                              key={`expense-segment-${entry.name}`}
                              fill={entry.color}
                              stroke={entry.name === selectedExpenseCategory ? "#0f172a" : "#ffffff"}
                              strokeWidth={entry.name === selectedExpenseCategory ? 2 : 1}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => currency(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded border p-2 text-xs">
                    <div className="mb-2 font-medium">
                      Drill-down: {selectedExpenseCategory || "Select a category from the donut"}
                    </div>
                    <div className="max-h-52 overflow-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead className="sticky top-0 border-b bg-muted/50">
                          <tr>
                            <th className="p-2">Date</th>
                            <th className="p-2">Region</th>
                            <th className="p-2">Product</th>
                            <th className="p-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenseTransactions.slice(0, 25).map((item) => (
                            <tr key={`${item.date}-${item.customerId}-${item.amount}`} className="border-b">
                              <td className="p-2">{item.date}</td>
                              <td className="p-2">{item.region}</td>
                              <td className="p-2">{item.product}</td>
                              <td className="p-2">{currency(item.amount)}</td>
                            </tr>
                          ))}
                          {expenseTransactions.length === 0 && (
                            <tr>
                              <td className="p-2 text-muted-foreground" colSpan={4}>
                                No expense transactions for this category in current filters.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Gross & Net Margin Tracker</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Targets are saved locally in this browser.</p>
                    <button
                      type="button"
                      className="border px-2 py-1 text-xs"
                      onClick={() => setShowMarginSettings((prev) => !prev)}
                    >
                      {showMarginSettings ? "Close Settings" : "Edit Targets"}
                    </button>
                  </div>

                  {showMarginSettings && (
                    <div className="grid gap-2 rounded border p-2 text-xs md:grid-cols-3">
                      <label className="grid gap-1">
                        Gross Target %
                        <input
                          type="number"
                          className="border p-1"
                          value={grossMarginTarget}
                          onChange={(e) => setGrossMarginTarget(Number(e.target.value))}
                        />
                      </label>
                      <label className="grid gap-1">
                        Net Target %
                        <input
                          type="number"
                          className="border p-1"
                          value={netMarginTarget}
                          onChange={(e) => setNetMarginTarget(Number(e.target.value))}
                        />
                      </label>
                      <label className="grid gap-1">
                        Alert Threshold %
                        <input
                          type="number"
                          className="border p-1"
                          value={alertThreshold}
                          onChange={(e) => setAlertThreshold(Number(e.target.value))}
                        />
                      </label>
                    </div>
                  )}

                  <div className={`rounded border p-3 text-xs ${marginStatusClasses(grossStatus)}`}>
                    <div className="font-medium">Gross Margin</div>
                    <div className="mt-1">Current: {(dashboard.data?.marginTracker?.currentGrossMargin ?? 0).toFixed(2)}%</div>
                    <div>Target: {grossMarginTarget.toFixed(1)}%</div>
                    <div>{marginStatusLabel(grossStatus, dashboard.data?.marginTracker?.currentGrossMargin ?? 0, grossMarginTarget)}</div>
                  </div>

                  <div className={`rounded border p-3 text-xs ${marginStatusClasses(netStatus)}`}>
                    <div className="font-medium">Net Margin</div>
                    <div className="mt-1">Current: {(dashboard.data?.marginTracker?.currentNetMargin ?? 0).toFixed(2)}%</div>
                    <div>Target: {netMarginTarget.toFixed(1)}%</div>
                    <div>{marginStatusLabel(netStatus, dashboard.data?.marginTracker?.currentNetMargin ?? 0, netMarginTarget)}</div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-medium">Trend (Last 12 Weeks)</div>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dashboard.data?.marginTracker?.trend ?? []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" hide />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Line type="monotone" dataKey="grossMargin" stroke="#166534" dot={false} strokeWidth={2} />
                          <Line type="monotone" dataKey="netMargin" stroke="#65a30d" dot={false} strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Sales by Region</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboard.data?.regionalSales ?? []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="region" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="sales" fill="#2f6b3a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {dashboard.data?.insights?.regional && (
                    <div className="rounded bg-blue-50 p-2 text-xs text-blue-900">
                      💡 {dashboard.data.insights.regional}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Customer Gender Split</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dashboard.data?.genderSplit ?? []}
                          nameKey="gender"
                          dataKey="count"
                          outerRadius={90}
                          fill="#5da463"
                          label
                        />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {dashboard.data?.insights?.gender && (
                    <div className="rounded bg-blue-50 p-2 text-xs text-blue-900">
                      💡 {dashboard.data.insights.gender}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Customer Age Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboard.data?.ageDistribution ?? []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="bucket" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#7dbf83" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {dashboard.data?.insights?.age && (
                  <div className="rounded bg-blue-50 p-2 text-xs text-blue-900">
                    💡 {dashboard.data.insights.age}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Revenue Sources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Ranked products by revenue this month. Helps prioritize stock, marketing, and pricing decisions.
                </p>
                <div className="space-y-2">
                  {dashboard.data?.topProducts && dashboard.data.topProducts.length > 0 ? (
                    <>
                      {dashboard.data.topProducts.map((product, index) => {
                        const totalSales = dashboard.data?.kpis.totalSales ?? 0;
                        const percentage = totalSales > 0 ? ((product.sales / totalSales) * 100).toFixed(1) : "0.0";
                        return (
                          <div
                            key={product.product}
                            className="flex items-center justify-between rounded border p-3 hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                                #{index + 1}
                              </div>
                              <div>
                                <div className="font-medium">{product.product}</div>
                                <div className="text-xs text-muted-foreground">
                                  Profit: {currency(product.profit)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{currency(product.sales)}</div>
                              <div className="text-xs text-green-600">{percentage}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="text-xs text-muted-foreground">No product data available</div>
                  )}
                </div>
                {dashboard.data?.insights?.product && (
                  <div className="rounded bg-blue-50 p-2 text-xs text-blue-900">
                    💡 {dashboard.data.insights.product}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business Insight</CardTitle>
              </CardHeader>
              <CardContent>{dashboard.data?.insights?.global ?? "Loading insight..."}</CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>New Customers</CardTitle>
                </CardHeader>
                <CardContent>{dashboard.data?.customerStats.newCustomers ?? 0}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Repeat Customers</CardTitle>
                </CardHeader>
                <CardContent>{dashboard.data?.customerStats.repeatCustomers ?? 0}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Churned Customers</CardTitle>
                </CardHeader>
                <CardContent>{dashboard.data?.customerStats.churnedCustomers ?? 0}</CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Sales & Profit Over Time ({aggregation})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dashboard.data?.timeSeries ?? []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="sales" stroke="#2f6b3a" strokeWidth={2} />
                      <Line type="monotone" dataKey="profit" stroke="#9ec6a4" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {dashboard.data?.insights?.timeSeries && (
                  <div className="rounded bg-blue-50 p-2 text-xs text-blue-900">
                    💡 {dashboard.data.insights.timeSeries}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Heatmap Calendar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium">Month</label>
                  <input
                    type="month"
                    className="border p-1 text-xs"
                    value={heatmapMonth || monthFromDate(resolvedEndDate)}
                    onChange={(e) => {
                      setHeatmapMonth(e.target.value);
                      setSelectedHeatmapDate("");
                    }}
                  />
                  {heatmap.data?.summary.hasYoYComparison && (
                    <span className="text-[11px] text-muted-foreground">
                      YoY comparison enabled (3+ months data)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium">
                  {(heatmap.data?.weekdays ?? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).map(
                    (day) => (
                      <div key={day}>{day}</div>
                    ),
                  )}
                </div>

                <div className="grid gap-1">
                  {(heatmap.data?.weeks ?? []).map((week, weekIndex) => (
                    <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-1">
                      {week.map((cell, cellIndex) => (
                        <button
                          key={`cell-${weekIndex}-${cellIndex}`}
                          type="button"
                          disabled={!cell}
                          onClick={() => {
                            if (cell) {
                              setSelectedHeatmapDate(cell.date);
                            }
                          }}
                          className={`h-12 rounded border px-1 text-left text-[10px] ${
                            selectedHeatmapDate && cell?.date === selectedHeatmapDate
                              ? "ring-2 ring-emerald-600"
                              : ""
                          } ${cell ? "cursor-pointer" : "cursor-default opacity-40"}`}
                          style={{ backgroundColor: cell ? heatmapColor(cell.intensity, cell.isZero) : "#f8fafc" }}
                        >
                          {cell ? (
                            <>
                              <div className="font-medium">{cell.day}</div>
                              <div>{Math.round(cell.revenue).toLocaleString()}</div>
                            </>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="grid gap-2 text-xs md:grid-cols-3">
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground">Month Revenue</div>
                    <div className="font-medium">{currency(heatmap.data?.summary.monthRevenue ?? 0)}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground">Max Daily Revenue</div>
                    <div className="font-medium">{currency(heatmap.data?.summary.maxDailyRevenue ?? 0)}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground">Avg Daily Revenue</div>
                    <div className="font-medium">{currency(heatmap.data?.summary.avgDailyRevenue ?? 0)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedHeatmapDate && (
              <Card>
                <CardHeader>
                  <CardTitle>Transactions on {selectedHeatmapDate}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="grid gap-2 md:grid-cols-3">
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">Transactions</div>
                      <div className="font-medium">{dayBreakdown.data?.totalTransactions ?? 0}</div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">Revenue</div>
                      <div className="font-medium">{currency(dayBreakdown.data?.totalRevenue ?? 0)}</div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">Profit</div>
                      <div className="font-medium">{currency(dayBreakdown.data?.totalProfit ?? 0)}</div>
                    </div>
                  </div>
                  <div className="max-h-56 overflow-auto rounded border">
                    <table className="w-full text-left text-[11px]">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="p-2">Customer</th>
                          <th className="p-2">Product</th>
                          <th className="p-2">Region</th>
                          <th className="p-2">Sales</th>
                          <th className="p-2">Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(dayBreakdown.data?.transactions ?? []).slice(0, 20).map((row) => (
                          <tr key={`${row.customerId}-${row.product}-${row.sales}`} className="border-b">
                            <td className="p-2">{row.customerId}</td>
                            <td className="p-2">{row.product}</td>
                            <td className="p-2">{row.region}</td>
                            <td className="p-2">{currency(row.sales)}</td>
                            <td className="p-2">{currency(row.profit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Profit & Loss Statement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  Uses current sidebar date range and filters. Updates in real time as data changes.
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground">Gross Revenue</div>
                    <div className="font-medium">{currency(pnl.data?.grossRevenue ?? 0)}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground">Cost of Goods Sold (COGS)</div>
                    <div className="font-medium">{currency(pnl.data?.cogs ?? 0)}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground">Gross Profit</div>
                    <div className="font-medium">{currency(pnl.data?.grossProfit ?? 0)}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground">Operating Expenses</div>
                    <div className="font-medium">{currency(pnl.data?.operatingExpenses ?? 0)}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground">Net Profit</div>
                    <div className="font-medium">{currency(pnl.data?.netProfit ?? 0)}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground">Reported Net Profit</div>
                    <div className="font-medium">{currency(pnl.data?.reportedNetProfit ?? 0)}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground">Net Profit Variance</div>
                    <div className="font-medium">{currency(pnl.data?.netProfitVariance ?? 0)}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground">Margins</div>
                    <div className="font-medium">
                      Gross {(pnl.data?.grossMarginPct ?? 0).toFixed(2)}% | Net {(pnl.data?.netMarginPct ?? 0).toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded border p-2">
                    <div className="mb-1 text-xs font-medium">COGS by Category</div>
                    {(pnl.data?.cogsCategoryBreakdown ?? []).map((item) => (
                      <div key={item.category} className="flex justify-between text-xs">
                        <span>{item.category}</span>
                        <span>{currency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded border p-2">
                    <div className="mb-1 text-xs font-medium">OPEX by Category</div>
                    {(pnl.data?.opexCategoryBreakdown ?? []).map((item) => (
                      <div key={item.category} className="flex justify-between text-xs">
                        <span>{item.category}</span>
                        <span>{currency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {pnl.data?.isEstimated && (
                  <div className="rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                    <div className="font-medium">Estimated P&L assumptions:</div>
                    {pnl.data.assumptions.map((note) => (
                      <div key={note}>- {note}</div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Balance Sheet Summary (Monthly Estimate)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  Simplified balance sheet showing estimated financial position. Based on sales, COGS, and operating expense data.
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded border p-3">
                    <div className="mb-2 text-xs font-bold">ASSETS</div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Cash on Hand</span>
                        <span>{currency(dashboard.data?.balanceSheet?.assets.cash ?? 0)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Inventory</span>
                        <span>{currency(dashboard.data?.balanceSheet?.assets.inventory ?? 0)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Receivables</span>
                        <span>{currency(dashboard.data?.balanceSheet?.assets.receivables ?? 0)}</span>
                      </div>
                      <div className="border-t pt-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span>Total Assets</span>
                          <span>{currency(dashboard.data?.balanceSheet?.assets.total ?? 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded border p-3">
                    <div className="mb-2 text-xs font-bold">LIABILITIES</div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Supplier Dues</span>
                        <span>{currency(dashboard.data?.balanceSheet?.liabilities.supplierDues ?? 0)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Payables</span>
                        <span>{currency(dashboard.data?.balanceSheet?.liabilities.payables ?? 0)}</span>
                      </div>
                      <div className="border-t pt-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span>Total Liabilities</span>
                          <span>{currency(dashboard.data?.balanceSheet?.liabilities.total ?? 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded border p-3">
                  <div className="flex justify-between text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Net Equity</div>
                      <div className={`text-lg font-bold ${(dashboard.data?.balanceSheet?.netEquity ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {currency(dashboard.data?.balanceSheet?.netEquity ?? 0)}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {(dashboard.data?.balanceSheet?.netEquity ?? 0) >= 0 ? "✓ Positive" : "⚠️ Negative"}
                    </div>
                  </div>
                </div>

                {dashboard.data?.balanceSheet?.notes && dashboard.data.balanceSheet.notes.length > 0 && (
                  <div className="space-y-1 rounded border border-amber-300 bg-amber-50 p-2">
                    {dashboard.data.balanceSheet.notes.map((note) => (
                      <div key={note} className="text-xs text-amber-900">
                        {note}
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded bg-gray-50 p-2 text-[11px] text-gray-700">
                  <div className="font-medium mb-1">Estimation Methodology:</div>
                  <ul className="list-inside list-disc space-y-1">
                    <li>Cash: 50% of accumulated profit</li>
                    <li>Inventory: 15% of COGS</li>
                    <li>Receivables: 40% of current sales (unpaid invoices)</li>
                    <li>Supplier Dues: 20% of COGS (payment terms)</li>
                    <li>Payables: 15% of OPEX (grace periods)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "Alerts & Anomalies" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Anomaly Detection Engine</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="rounded border border-blue-200 bg-blue-50 p-3 text-[11px] text-blue-900">
                  <div className="mb-1 font-medium">AI Alert Copilot</div>
                  <div>{anomalyAi?.overview ?? "AI guidance is preparing alert prioritization for this view."}</div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-medium">Custom Alert Rule Builder</div>
                      <div className="rounded bg-muted px-2 py-0.5 text-[11px]">
                        {customRules.length}/10 rules
                      </div>
                    </div>

                    <div className="grid gap-2 text-[11px] md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-muted-foreground">Rule Name</label>
                        <input
                          className="w-full border px-2 py-1"
                          value={newRuleName}
                          placeholder="e.g. High logistics bill"
                          onChange={(e) => setNewRuleName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-muted-foreground">Rule Type</label>
                        <select
                          className="w-full border px-2 py-1"
                          value={newRuleType}
                          onChange={(e) => setNewRuleType(e.target.value as CustomAlertRuleType)}
                        >
                          {CUSTOM_RULE_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-muted-foreground">
                          {
                            CUSTOM_RULE_TYPE_OPTIONS.find((option) => option.value === newRuleType)?.thresholdLabel ??
                            "Threshold"
                          }
                        </label>
                        <input
                          className="w-full border px-2 py-1"
                          type="number"
                          min={1}
                          value={newRuleThreshold}
                          onChange={(e) => setNewRuleThreshold(Number(e.target.value))}
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          className="w-full border px-2 py-1"
                          disabled={customRules.length >= 10}
                          onClick={addCustomRule}
                        >
                          Add Rule
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 max-h-52 space-y-2 overflow-auto">
                      {customRules.map((rule) => (
                        <div key={rule.id} className="rounded border p-2 text-[11px]">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{rule.name}</div>
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={rule.enabled}
                                  onChange={(e) =>
                                    setCustomRules((prev) =>
                                      prev.map((item) =>
                                        item.id === rule.id ? { ...item, enabled: e.target.checked } : item,
                                      ),
                                    )
                                  }
                                />
                                Enabled
                              </label>
                              <button
                                type="button"
                                className="border px-2 py-0.5"
                                onClick={() => setCustomRules((prev) => prev.filter((item) => item.id !== rule.id))}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className="mt-1 text-muted-foreground">
                            {CUSTOM_RULE_TYPE_OPTIONS.find((option) => option.value === rule.type)?.label} at {currency(rule.threshold)}
                          </div>
                        </div>
                      ))}
                      {customRules.length === 0 && (
                        <div className="text-muted-foreground">No custom rules yet. Add your first alert rule above.</div>
                      )}
                    </div>

                    <div className="mt-2 rounded border border-blue-100 bg-blue-50 p-2 text-[11px] text-blue-900">
                      {anomalyAi?.customRules ?? "AI guidance will suggest tighter custom-rule thresholds here."}
                    </div>
                  </div>

                  <div className="rounded border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-medium">Alert Fatigue Manager</div>
                      <div className="rounded bg-muted px-2 py-0.5 text-[11px]">Ignore streak prompt at 3+</div>
                    </div>

                    <div className="max-h-64 space-y-2 overflow-auto text-[11px]">
                      {alertFatigueRows.map((row) => {
                        const entry = fatigueState[row.key] ?? { ignoredStreak: 0, markAsNormal: false };
                        const shouldPrompt = row.activeCount > 0 && entry.ignoredStreak >= 3 && !entry.markAsNormal;
                        return (
                          <div key={row.key} className="rounded border p-2">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{row.label}</div>
                              <div className="text-muted-foreground">{row.activeCount} active</div>
                            </div>
                            <div className="mt-1 text-muted-foreground">
                              Ignored {entry.ignoredStreak} times in a row
                              {entry.markAsNormal ? " • marked as normal behavior" : ""}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="border px-2 py-0.5"
                                onClick={() =>
                                  setFatigueState((prev) => ({
                                    ...prev,
                                    [row.key]: {
                                      ignoredStreak:
                                        row.activeCount > 0
                                          ? (prev[row.key]?.ignoredStreak ?? 0) + 1
                                          : prev[row.key]?.ignoredStreak ?? 0,
                                      markAsNormal: prev[row.key]?.markAsNormal ?? false,
                                    },
                                  }))
                                }
                              >
                                Ignore This Cycle
                              </button>
                              <button
                                type="button"
                                className="border px-2 py-0.5"
                                onClick={() =>
                                  setFatigueState((prev) => ({
                                    ...prev,
                                    [row.key]: { ignoredStreak: 0, markAsNormal: false },
                                  }))
                                }
                              >
                                Reset Streak
                              </button>
                              <button
                                type="button"
                                className={`border px-2 py-0.5 ${entry.markAsNormal ? "bg-emerald-50" : ""}`}
                                onClick={() =>
                                  setFatigueState((prev) => ({
                                    ...prev,
                                    [row.key]: {
                                      ignoredStreak: prev[row.key]?.ignoredStreak ?? 0,
                                      markAsNormal: !prev[row.key]?.markAsNormal,
                                    },
                                  }))
                                }
                              >
                                {entry.markAsNormal ? "Marked Normal" : "Mark as Normal"}
                              </button>
                            </div>
                            {shouldPrompt && (
                              <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-amber-900">
                                You have seen this alert {entry.ignoredStreak} times. Adjust thresholds or mark as normal behavior?
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-2 rounded border border-blue-100 bg-blue-50 p-2 text-[11px] text-blue-900">
                      {anomalyAi?.alertFatigue ?? "AI guidance will suggest which recurring alerts to tune or silence."}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-medium">Expense Spike Alerts</div>
                      <div className="rounded bg-red-50 px-2 py-0.5 text-red-700">
                        {expenseSpikeAlerts.length} alerts
                      </div>
                    </div>
                    <div className="max-h-56 overflow-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead className="sticky top-0 border-b bg-muted/40">
                          <tr>
                            <th className="p-2">Date</th>
                            <th className="p-2">Category</th>
                            <th className="p-2">Vendor</th>
                            <th className="p-2">Amount</th>
                            <th className="p-2">Baseline</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenseSpikeAlerts.slice(0, 12).map((alert, index) => (
                            <tr key={`${alert.date}-${alert.category}-${alert.vendor}-${index}`} className="border-b">
                              <td className="p-2">{alert.date}</td>
                              <td className="p-2">{alert.category}</td>
                              <td className="p-2">{alert.vendor}</td>
                              <td className="p-2">
                                {currency(alert.amount)} ({alert.multiplier.toFixed(1)}x)
                              </td>
                              <td className="p-2">{currency(alert.baseline)}</td>
                            </tr>
                          ))}
                          {expenseSpikeAlerts.length === 0 && (
                            <tr>
                              <td className="p-2 text-muted-foreground" colSpan={5}>
                                No expense spikes found for current filters.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 rounded border border-blue-100 bg-blue-50 p-2 text-[11px] text-blue-900">
                      {anomalyAi?.expenseSpikes ?? "AI guidance will summarize expense spike actions here."}
                    </div>
                  </div>

                  <div className="rounded border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-medium">Revenue Drop Alerts</div>
                      <div className="rounded bg-amber-50 px-2 py-0.5 text-amber-800">
                        {revenueDropAlerts.length} alerts
                      </div>
                    </div>
                    <div className="max-h-56 overflow-auto space-y-2">
                      {revenueDropAlerts.slice(0, 8).map((alert) => (
                        <div key={`${alert.periodType}-${alert.periodKey}`} className="rounded border p-2">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">
                              {alert.periodType} period {alert.periodKey}
                            </div>
                            <div className="text-red-700">-{alert.dropPct.toFixed(1)}%</div>
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            Current {currency(alert.currentRevenue)} vs prior month {currency(alert.priorMonthRevenue)}
                          </div>
                          <div className="mt-1 text-[11px]">
                            Top dropped streams: {alert.droppedStreams.length > 0
                              ? alert.droppedStreams
                                  .slice(0, 3)
                                  .map((stream) => `${stream.stream} (${stream.changePct.toFixed(1)}%)`)
                                  .join(", ")
                              : "No stream-level decline details"}
                          </div>
                        </div>
                      ))}
                      {revenueDropAlerts.length === 0 && (
                        <div className="text-muted-foreground">No revenue drop alerts found for current filters.</div>
                      )}
                    </div>
                    <div className="mt-2 rounded border border-blue-100 bg-blue-50 p-2 text-[11px] text-blue-900">
                      {anomalyAi?.revenueDrops ?? "AI guidance will summarize revenue-drop recovery priorities here."}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-medium">Cash Flow Warning (14-Day Projection)</div>
                      <div
                        className={`rounded px-2 py-0.5 ${cashFlowWarning?.triggered ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
                      >
                        {cashFlowWarning?.triggered ? "Alert Triggered" : "No Crunch Risk"}
                      </div>
                    </div>

                    <div className="grid gap-2 text-[11px] md:grid-cols-2">
                      <div className="rounded border p-2">
                        <div className="text-muted-foreground">Current Balance</div>
                        <div className="font-medium">{currency(cashFlowWarning?.currentBalance ?? 0)}</div>
                      </div>
                      <div className="rounded border p-2">
                        <div className="text-muted-foreground">Minimum Buffer</div>
                        <div className="font-medium">{currency(cashFlowWarning?.minimumBuffer ?? minimumCashBuffer)}</div>
                      </div>
                    </div>

                    {cashFlowWarning?.triggered ? (
                      <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-[11px] text-red-800">
                        <div>
                          Projected to breach buffer in <span className="font-medium">{cashFlowWarning.daysUntilCrunch}</span> days
                          ({cashFlowWarning.crunchDate}).
                        </div>
                        <div>
                          Largest upcoming outflow: <span className="font-medium">{currency(cashFlowWarning.largestUpcomingOutflow?.amount ?? 0)}</span>
                          {cashFlowWarning.largestUpcomingOutflow ? ` on ${cashFlowWarning.largestUpcomingOutflow.date}` : ""}.
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 rounded border border-emerald-200 bg-emerald-50 p-2 text-[11px] text-emerald-800">
                        14-day projection stays above your configured buffer.
                      </div>
                    )}
                    <div className="mt-2 rounded border border-blue-100 bg-blue-50 p-2 text-[11px] text-blue-900">
                      {anomalyAi?.cashFlow ?? "AI guidance will summarize cash protection actions here."}
                    </div>
                  </div>

                  <div className="rounded border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-medium">Duplicate Payment Flags</div>
                      <div className="rounded bg-amber-50 px-2 py-0.5 text-amber-800">
                        {duplicatePaymentFlags.length} potential duplicates
                      </div>
                    </div>

                    <div className="max-h-64 space-y-2 overflow-auto">
                      {duplicatePaymentFlags.slice(0, 10).map((flag, index) => {
                        const key = `${flag.vendor}-${flag.first.date}-${flag.second.date}-${Math.round(flag.first.amount)}-${Math.round(flag.second.amount)}`;
                        const isConfirmed = confirmedDuplicateFlags.includes(key);
                        return (
                          <div key={`${key}-${index}`} className={`rounded border p-2 ${isConfirmed ? "bg-emerald-50" : ""}`}>
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{flag.vendor}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {flag.hoursApart.toFixed(1)}h apart, diff {flag.amountDifferencePct.toFixed(1)}%
                              </div>
                            </div>
                            <div className="mt-1 grid gap-1 text-[11px] md:grid-cols-2">
                              <div className="rounded border p-1">
                                <div>{flag.first.date}</div>
                                <div>{currency(flag.first.amount)}</div>
                                <div className="text-muted-foreground">{flag.first.category}</div>
                              </div>
                              <div className="rounded border p-1">
                                <div>{flag.second.date}</div>
                                <div>{currency(flag.second.amount)}</div>
                                <div className="text-muted-foreground">{flag.second.category}</div>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="text-[11px] text-muted-foreground">
                                Please confirm if both payments were intentional.
                              </div>
                              <button
                                type="button"
                                className="border px-2 py-1 text-[11px]"
                                onClick={() => {
                                  setConfirmedDuplicateFlags((prev) =>
                                    prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
                                  );
                                }}
                              >
                                {isConfirmed ? "Marked Intentional" : "Mark Intentional"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {duplicatePaymentFlags.length === 0 && (
                        <div className="text-muted-foreground">No duplicate payment candidates found in current filters.</div>
                      )}
                    </div>
                    <div className="mt-2 rounded border border-blue-100 bg-blue-50 p-2 text-[11px] text-blue-900">
                      {anomalyAi?.duplicatePayments ?? "AI guidance will summarize duplicate-payment controls here."}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-medium">Unusual Vendor Detection</div>
                      <div className="rounded bg-amber-50 px-2 py-0.5 text-amber-800">
                        {unusualVendorAlerts.length} alerts
                      </div>
                    </div>

                    <div className="max-h-64 space-y-2 overflow-auto">
                      {unusualVendorAlerts.slice(0, 10).map((alert, index) => {
                        const key = `${alert.scenario}-${alert.vendor}-${alert.dateOrMonth}-${Math.round(alert.amount)}`;
                        const action = vendorAlertActions[key];
                        return (
                          <div key={`${key}-${index}`} className="rounded border p-2 text-[11px]">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{alert.vendor}</div>
                              <div className="text-muted-foreground">{alert.multiplier.toFixed(1)}x baseline</div>
                            </div>
                            <div>
                              {alert.scenario === "newVendorSignificant"
                                ? `New vendor paid ${currency(alert.amount)} on ${alert.dateOrMonth}`
                                : `Monthly payout ${currency(alert.amount)} in ${alert.dateOrMonth}`}
                            </div>
                            <div className="text-muted-foreground">Baseline: {currency(alert.baselineAmount)}</div>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                className={`border px-2 py-1 ${action === "expected" ? "bg-emerald-50" : ""}`}
                                onClick={() =>
                                  setVendorAlertActions((prev) => ({
                                    ...prev,
                                    [key]: "expected",
                                  }))
                                }
                              >
                                Mark Expected
                              </button>
                              <button
                                type="button"
                                className={`border px-2 py-1 ${action === "investigate" ? "bg-red-50" : ""}`}
                                onClick={() =>
                                  setVendorAlertActions((prev) => ({
                                    ...prev,
                                    [key]: "investigate",
                                  }))
                                }
                              >
                                Investigate
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {unusualVendorAlerts.length === 0 && (
                        <div className="text-muted-foreground">No unusual vendor alerts in current filters.</div>
                      )}
                    </div>
                    <div className="mt-2 rounded border border-blue-100 bg-blue-50 p-2 text-[11px] text-blue-900">
                      {anomalyAi?.unusualVendors ?? "AI guidance will summarize vendor-risk actions here."}
                    </div>
                  </div>

                  <div className="rounded border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-medium">Margin Erosion Alert</div>
                      <div
                        className={`rounded px-2 py-0.5 ${marginErosionAlert?.triggered ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
                      >
                        {marginErosionAlert?.triggered ? "Triggered" : "Stable"}
                      </div>
                    </div>

                    <div className="grid gap-2 text-[11px] md:grid-cols-2">
                      <div className="rounded border p-2">
                        <div className="text-muted-foreground">Net Margin Target</div>
                        <div className="font-medium">{(marginErosionAlert?.netMarginTarget ?? netMarginTarget).toFixed(1)}%</div>
                      </div>
                      <div className="rounded border p-2">
                        <div className="text-muted-foreground">Weeks Below Target</div>
                        <div className="font-medium">{marginErosionAlert?.weeksBelowTarget ?? 0}</div>
                      </div>
                    </div>

                    {marginErosionAlert?.triggered ? (
                      <div className="mt-2 space-y-2 text-[11px]">
                        <div className="rounded border border-red-200 bg-red-50 p-2 text-red-800">
                          Net margin is below target for {marginErosionAlert.weeksBelowTarget} consecutive weeks.
                        </div>
                        <div className="rounded border p-2">
                          <div className="mb-1 font-medium">Top Expense Drivers</div>
                          {marginErosionAlert.topExpenseDrivers.length > 0 ? (
                            marginErosionAlert.topExpenseDrivers.map((driver) => (
                              <div key={driver.category} className="flex justify-between">
                                <span>{driver.category}</span>
                                <span>{currency(driver.increaseAmount)}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-muted-foreground">No increasing expense categories detected.</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 rounded border border-emerald-200 bg-emerald-50 p-2 text-[11px] text-emerald-800">
                        Net margin has not stayed below target for 3 consecutive weeks.
                      </div>
                    )}
                    <div className="mt-2 rounded border border-blue-100 bg-blue-50 p-2 text-[11px] text-blue-900">
                      {anomalyAi?.marginErosion ?? "AI guidance will summarize margin erosion actions here."}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-medium">Outstanding Collection Alerts</div>
                      <div className="rounded bg-amber-50 px-2 py-0.5 text-amber-800">
                        {outstandingCollections.length} overdue customers
                      </div>
                    </div>

                    <div className="mb-2 flex items-center gap-2 text-[11px]">
                      <label className="text-muted-foreground">Overdue Threshold</label>
                      <select
                        className="border px-1 py-0.5"
                        value={outstandingThresholdDays}
                        onChange={(e) => setOutstandingThresholdDays(Number(e.target.value) as 7 | 14 | 30)}
                      >
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={30}>30 days</option>
                      </select>
                    </div>

                    <div className="max-h-64 space-y-2 overflow-auto">
                      {outstandingCollections.slice(0, 12).map((alert) => {
                        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(alert.reminderMessage)}`;
                        return (
                          <div key={`${alert.customerId}-${alert.lastTransactionDate}`} className="rounded border p-2 text-[11px]">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">Customer {alert.customerId}</div>
                              <div className="text-red-700">{alert.daysOverdue} days overdue</div>
                            </div>
                            <div>Outstanding: {currency(alert.outstandingAmount)}</div>
                            <div className="text-muted-foreground">Last transaction: {alert.lastTransactionDate}</div>
                            <div className="mt-2">
                              <a
                                className="inline-block border px-2 py-1"
                                href={whatsappUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Send WhatsApp Reminder
                              </a>
                            </div>
                          </div>
                        );
                      })}
                      {outstandingCollections.length === 0 && (
                        <div className="text-muted-foreground">No overdue collections beyond the configured threshold.</div>
                      )}
                    </div>

                    <div className="mt-2 rounded border border-blue-100 bg-blue-50 p-2 text-[11px] text-blue-900">
                      {anomalyAi?.outstandingCollections ?? "AI guidance will summarize collection priorities here."}
                    </div>
                  </div>

                  <div className="rounded border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-medium">Positive Spike Detection</div>
                      <div className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">
                        {positiveSpikeAlerts.length} positive spikes
                      </div>
                    </div>

                    <div className="max-h-64 space-y-2 overflow-auto">
                      {positiveSpikeAlerts.slice(0, 10).map((alert) => (
                        <div key={`${alert.date}-${alert.weekday}`} className="rounded border p-2 text-[11px]">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{alert.date} ({alert.weekday})</div>
                            <div className="text-emerald-700">{alert.multiplier.toFixed(1)}x baseline</div>
                          </div>
                          <div>{alert.message}</div>
                          <div className="text-muted-foreground">
                            Revenue {currency(alert.revenue)} vs baseline {currency(alert.baseline)}
                          </div>
                          <div className="mt-1 text-muted-foreground">
                            Top streams: {alert.topStreams.map((stream) => `${stream.stream} (${stream.sharePct.toFixed(0)}%)`).join(", ")}
                          </div>
                        </div>
                      ))}
                      {positiveSpikeAlerts.length === 0 && (
                        <div className="text-muted-foreground">No positive revenue spikes detected in the current window.</div>
                      )}
                    </div>

                    <div className="mt-2 rounded border border-blue-100 bg-blue-50 p-2 text-[11px] text-blue-900">
                      {anomalyAi?.positiveSpikes ?? "AI guidance will summarize what to replicate from strong-performing periods."}
                    </div>
                  </div>
                </div>

                <div className="rounded border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="font-medium">Custom Rule Triggered Alerts</div>
                    <div className="rounded bg-amber-50 px-2 py-0.5 text-amber-800">
                      {customRuleAlerts.length} triggered alerts
                    </div>
                  </div>

                  <div className="max-h-56 overflow-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="sticky top-0 border-b bg-muted/40">
                        <tr>
                          <th className="p-2">Rule</th>
                          <th className="p-2">Type</th>
                          <th className="p-2">Date</th>
                          <th className="p-2">Actual</th>
                          <th className="p-2">Threshold</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customRuleAlerts.slice(0, 20).map((alert) => (
                          <tr key={`${alert.ruleId}-${alert.periodKey}-${alert.actualValue}`} className="border-b">
                            <td className="p-2">{alert.ruleName}</td>
                            <td className="p-2">{alert.ruleType}</td>
                            <td className="p-2">{alert.periodKey}</td>
                            <td className="p-2">{currency(alert.actualValue)}</td>
                            <td className="p-2">{currency(alert.threshold)}</td>
                          </tr>
                        ))}
                        {customRuleAlerts.length === 0 && (
                          <tr>
                            <td className="p-2 text-muted-foreground" colSpan={5}>
                              No custom rule violations in the current filter window.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Real-Time Sales Anomaly Detection</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <p className="mb-2 text-sm">
                  {anomalies.data?.anomalies.length ?? 0} sales anomalies detected.
                </p>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={anomalies.data?.series ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="sales" stroke="#2f6b3a" />
                    <Line type="monotone" dataKey="anomaly" stroke="#c0392b" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "Sales Forecast" && (
          <Card>
            <CardHeader>
              <CardTitle>Sales Forecasting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-2 pb-1">
                <button
                  type="button"
                  className={`border px-3 py-1 text-xs ${forecastView === "sales" ? "bg-primary text-primary-foreground" : ""}`}
                  onClick={() => setForecastView("sales")}
                >
                  Sales Forecast
                </button>
                <button
                  type="button"
                  className={`border px-3 py-1 text-xs ${forecastView === "cash" ? "bg-primary text-primary-foreground" : ""}`}
                  onClick={() => setForecastView("cash")}
                >
                  Cash Forecast
                </button>
              </div>

              {forecastView === "sales" ? (
                <>
                  <label className="block text-xs font-medium">Forecast periods (days)</label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={periods}
                    className="border p-1 text-xs"
                    onChange={(e) => setPeriods(Number(e.target.value))}
                  />
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={forecast.data ?? []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="yhat" stroke="#2f6b3a" name="Forecast" />
                        <Line
                          type="monotone"
                          dataKey="yhatUpper"
                          stroke="#9ec6a4"
                          strokeDasharray="5 5"
                          name="Upper Bound"
                        />
                        <Line
                          type="monotone"
                          dataKey="yhatLower"
                          stroke="#9ec6a4"
                          strokeDasharray="5 5"
                          name="Lower Bound"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-900">
                      Cash projection is built from historical weekday income/outflow patterns, recurring expenses, pending payables,
                      and receivables (in realistic mode).
                    </div>
                    <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                      Dip zones are shown in red whenever projected balance falls below your minimum buffer.
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-5">
                    <div className="rounded border p-2 text-xs">
                      <div className="text-muted-foreground">Runway</div>
                      <div className="text-lg font-semibold">
                        {cashForecast.data?.runwayDays != null ? `${cashForecast.data.runwayDays} days` : "Stable"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">At current burn rate</div>
                    </div>
                    <div className="rounded border p-2 text-xs">
                      <div className="text-muted-foreground">Burn Rate</div>
                      <div className="text-lg font-semibold">{currency(cashForecast.data?.burnRatePerDay ?? 0)}</div>
                      <div className="text-[11px] text-muted-foreground">per day</div>
                    </div>
                    <div className="rounded border p-2 text-xs">
                      <div className="text-muted-foreground">Dip Days</div>
                      <div className="text-lg font-semibold">{cashForecast.data?.dipZone.dipDays ?? 0}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Next dip: {cashForecast.data?.dipZone.nextDipDate ?? "None"}
                      </div>
                    </div>
                    <div className="rounded border p-2 text-xs">
                      <div className="text-muted-foreground">Current Balance</div>
                      <div className="text-lg font-semibold">{currency(cashForecast.data?.currentBalance ?? 0)}</div>
                      <div className="text-[11px] text-muted-foreground">Starting point</div>
                    </div>
                    <div className={`rounded border p-2 text-xs ${cashForecast.data?.breakEven.isLossPeriod ? "border-red-300 bg-red-50" : ""}`}>
                      <div className="text-muted-foreground">Break-Even Day (Current Month)</div>
                      <div className="text-lg font-semibold">
                        {cashForecast.data?.breakEven.date ?? "Not reached"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {cashForecast.data?.breakEven.isLossPeriod
                          ? "Projected loss period for this month"
                          : "Projected to cross revenue above expense"}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium">Projection Horizon</label>
                      <select
                        className="w-full border p-1 text-xs"
                        value={cashHorizonDays}
                        onChange={(e) => setCashHorizonDays(Number(e.target.value) as 30 | 60 | 90)}
                      >
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                        <option value={90}>90 days</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">Collection Assumption</label>
                      <select
                        className="w-full border p-1 text-xs"
                        value={cashMode}
                        onChange={(e) => setCashMode(e.target.value as "conservative" | "realistic")}
                      >
                        <option value="realistic">Realistic (collections on schedule)</option>
                        <option value="conservative">Conservative (no collections)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">Receivables In Forecast</label>
                      <div className="rounded border p-1 text-xs">
                        {currency(cashForecast.data?.totals.receivablesScheduled ?? 0)}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">Payables In Forecast</label>
                      <div className="rounded border p-1 text-xs">
                        {currency(cashForecast.data?.totals.payablesScheduled ?? 0)}
                      </div>
                    </div>
                  </div>

                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cashForecast.data?.projection ?? []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip
                          formatter={(value, name) => [currency(Number(value) || 0), String(name)]}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Legend />
                        <Bar dataKey="projectedBalance" name="Projected Balance">
                          {(cashForecast.data?.projection ?? []).map((point) => (
                            <Cell
                              key={`cash-forecast-${point.date}`}
                              fill={point.isDipZone ? "#dc2626" : "#15803d"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded border p-3 text-xs">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-medium">What-If Scenario Builder</div>
                      <div className="text-muted-foreground">{whatIfScenarios.length}/20 scenarios</div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
                      <input
                        className="border p-1"
                        placeholder="Scenario name"
                        value={newScenarioName}
                        onChange={(e) => setNewScenarioName(e.target.value)}
                      />
                      <select
                        className="border p-1"
                        value={newScenarioType}
                        onChange={(e) => setNewScenarioType(e.target.value as "stockLoan" | "manualCollection")}
                      >
                        <option value="stockLoan">Stock Loan</option>
                        <option value="manualCollection">Manual Collection</option>
                      </select>
                      <input
                        className="border p-1"
                        type="number"
                        min={0}
                        value={newScenarioAmount}
                        onChange={(e) => setNewScenarioAmount(Number(e.target.value) || 0)}
                      />
                      <input
                        className="border p-1"
                        type="date"
                        value={newScenarioDate}
                        onChange={(e) => setNewScenarioDate(e.target.value)}
                      />
                      <button
                        type="button"
                        className="border px-3 py-1"
                        onClick={() => {
                          const name = newScenarioName.trim();
                          if (!name || newScenarioAmount <= 0 || !newScenarioDate || whatIfScenarios.length >= 20) {
                            return;
                          }
                          setWhatIfScenarios((prev) => [
                            ...prev,
                            {
                              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                              name,
                              type: newScenarioType,
                              amount: newScenarioAmount,
                              date: newScenarioDate,
                            },
                          ]);
                          setNewScenarioName("");
                          setNewScenarioAmount(50000);
                          setNewScenarioDate("");
                        }}
                      >
                        Add
                      </button>
                    </div>

                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {(cashForecast.data?.projection.length ?? 0) > 0 && (
                        <div className="rounded border p-2">
                          <div className="font-medium">Scenario Impact (at horizon)</div>
                          <div className="mt-1 space-y-1">
                            {whatIfScenarios.map((scenario) => {
                              const lastDate = cashForecast.data?.projection[cashForecast.data.projection.length - 1]?.date ?? "";
                              const impact = scenario.date <= lastDate ? scenario.amount : 0;
                              return (
                                <div key={scenario.id} className="flex items-center justify-between rounded border p-1">
                                  <div>
                                    <div className="font-medium">{scenario.name}</div>
                                    <div className="text-muted-foreground">{scenario.date} • {scenario.type}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium">+{currency(impact)}</div>
                                    <button
                                      type="button"
                                      className="border px-2 py-0.5"
                                      onClick={() =>
                                        setWhatIfScenarios((prev) => prev.filter((item) => item.id !== scenario.id))
                                      }
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            {whatIfScenarios.length === 0 && (
                              <div className="text-muted-foreground">Add scenarios to compare side-by-side.</div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="rounded border p-2">
                        <div className="font-medium">Scenario Comparison Chart</div>
                        <div className="h-44">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={scenarioComparisonSeries}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip formatter={(value, name) => [currency(Number(value) || 0), String(name)]} />
                              <Legend />
                              <Line type="monotone" dataKey="base" stroke="#1f2937" dot={false} name="Base" />
                              {whatIfScenarios.map((scenario, index) => {
                                const colors = ["#16a34a", "#2563eb", "#b45309", "#9333ea", "#dc2626"];
                                return (
                                  <Line
                                    key={scenario.id}
                                    type="monotone"
                                    dataKey={scenario.id}
                                    stroke={colors[index % colors.length]}
                                    dot={false}
                                    name={scenario.name}
                                  />
                                );
                              })}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded border p-3 text-xs">
                    <div className="mb-2 font-medium">Conservative vs Realistic Comparison</div>
                    <div className="mb-2 rounded border border-indigo-200 bg-indigo-50 p-2 text-indigo-900">
                      Dependence on timely customer collections: <span className="font-medium">{currency(receivableDependencyAmount)}</span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="rounded border p-2">
                        <div className="mb-1 font-medium">Conservative</div>
                        <div>Ending Balance: {currency(cashForecastConservative.data?.projection.slice(-1)[0]?.projectedBalance ?? 0)}</div>
                        <div>Runway: {cashForecastConservative.data?.runwayDays != null ? `${cashForecastConservative.data.runwayDays} days` : "Stable"}</div>
                        <div>Dip Days: {cashForecastConservative.data?.dipZone.dipDays ?? 0}</div>
                      </div>
                      <div className="rounded border p-2">
                        <div className="mb-1 font-medium">Realistic</div>
                        <div>Ending Balance: {currency(cashForecastRealistic.data?.projection.slice(-1)[0]?.projectedBalance ?? 0)}</div>
                        <div>Runway: {cashForecastRealistic.data?.runwayDays != null ? `${cashForecastRealistic.data.runwayDays} days` : "Stable"}</div>
                        <div>Dip Days: {cashForecastRealistic.data?.dipZone.dipDays ?? 0}</div>
                      </div>
                    </div>

                    <div className="mt-2 h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={cashComparisonSeries}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value, name) => [currency(Number(value) || 0), String(name)]} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="conservative"
                            stroke="#b91c1c"
                            dot={false}
                            name="Conservative"
                          />
                          <Line
                            type="monotone"
                            dataKey="realistic"
                            stroke="#15803d"
                            dot={false}
                            name="Realistic"
                          />
                          {cashForecastRealistic.data?.seasonalBaseline.available && (
                            <Line
                              type="monotone"
                              dataKey="priorYearBaseline"
                              stroke="#2563eb"
                              strokeDasharray="6 4"
                              dot={false}
                              name="Prior-Year Baseline"
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-2 text-[11px] text-blue-900">
                      {cashForecastRealistic.data?.seasonalBaseline.available
                        ? `Seasonal baseline overlay active using ${cashForecastRealistic.data.seasonalBaseline.matchedPoints} prior-year matched days.`
                        : "Seasonal baseline overlay needs at least 12 months of history with enough prior-year date matches."}
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded border p-3 text-xs">
                      <div className="mb-2 font-medium">Receivables Calendar</div>
                      <div className="max-h-56 overflow-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead className="sticky top-0 border-b bg-muted/40">
                            <tr>
                              <th className="p-2">Due Date</th>
                              <th className="p-2">Amount</th>
                              <th className="p-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(cashForecast.data?.receivablesCalendar ?? []).slice(0, 40).map((item) => (
                              <tr key={`recv-${item.dueDate}`} className="border-b">
                                <td className="p-2">{item.dueDate}</td>
                                <td className="p-2">{currency(item.amount)}</td>
                                <td className="p-2">{item.status}</td>
                              </tr>
                            ))}
                            {(cashForecast.data?.receivablesCalendar ?? []).length === 0 && (
                              <tr>
                                <td className="p-2 text-muted-foreground" colSpan={3}>
                                  No receivables in calendar.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="rounded border p-3 text-xs">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="font-medium">Payables Calendar</div>
                        <div className="rounded bg-red-50 px-2 py-0.5 text-red-700">
                          Overdue: {cashForecast.data?.overduePayables.count ?? 0} ({currency(cashForecast.data?.overduePayables.totalAmount ?? 0)})
                        </div>
                      </div>
                      <div className="max-h-56 overflow-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead className="sticky top-0 border-b bg-muted/40">
                            <tr>
                              <th className="p-2">Due Date</th>
                              <th className="p-2">Amount</th>
                              <th className="p-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(cashForecast.data?.payablesCalendar ?? []).slice(0, 40).map((item) => (
                              <tr
                                key={`pay-${item.dueDate}`}
                                className={`border-b ${item.status === "overdue" ? "bg-red-50" : ""}`}
                              >
                                <td className="p-2">{item.dueDate}</td>
                                <td className="p-2">{currency(item.amount)}</td>
                                <td className={`p-2 ${item.status === "overdue" ? "text-red-700" : ""}`}>{item.status}</td>
                              </tr>
                            ))}
                            {(cashForecast.data?.payablesCalendar ?? []).length === 0 && (
                              <tr>
                                <td className="p-2 text-muted-foreground" colSpan={3}>
                                  No payables in calendar.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="rounded border p-3 text-xs">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-medium">Recurring Expense Calendar</div>
                      <div className="text-muted-foreground">
                        Scheduled total: {currency(cashForecast.data?.totals.recurringScheduled ?? 0)}
                      </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-[1.5fr_1fr_1fr_auto]">
                      <input
                        className="border p-1"
                        placeholder="Expense name (e.g. Rent)"
                        value={newRecurringName}
                        onChange={(e) => setNewRecurringName(e.target.value)}
                      />
                      <input
                        className="border p-1"
                        type="number"
                        min={0}
                        placeholder="Amount"
                        value={newRecurringAmount}
                        onChange={(e) => setNewRecurringAmount(Number(e.target.value) || 0)}
                      />
                      <input
                        className="border p-1"
                        type="number"
                        min={1}
                        max={31}
                        placeholder="Day"
                        value={newRecurringDay}
                        onChange={(e) => setNewRecurringDay(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
                      />
                      <button
                        type="button"
                        className="border px-3 py-1"
                        onClick={() => {
                          const name = newRecurringName.trim();
                          if (!name || newRecurringAmount <= 0) {
                            return;
                          }
                          setRecurringExpenses((prev) => [
                            ...prev,
                            {
                              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                              name,
                              amount: newRecurringAmount,
                              dayOfMonth: newRecurringDay,
                            },
                          ]);
                          setNewRecurringName("");
                          setNewRecurringAmount(0);
                          setNewRecurringDay(1);
                        }}
                      >
                        Add
                      </button>
                    </div>

                    <div className="mt-2 max-h-40 space-y-1 overflow-auto">
                      {recurringExpenses.map((expense) => (
                        <div key={expense.id} className="flex items-center justify-between rounded border p-2">
                          <div>
                            <div className="font-medium">{expense.name}</div>
                            <div className="text-muted-foreground">
                              {currency(expense.amount)} on day {expense.dayOfMonth} of each month
                            </div>
                          </div>
                          <button
                            type="button"
                            className="border px-2 py-1"
                            onClick={() =>
                              setRecurringExpenses((prev) => prev.filter((item) => item.id !== expense.id))
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      {recurringExpenses.length === 0 && (
                        <div className="text-muted-foreground">
                          Add fixed monthly costs like rent, salaries, EMI, and insurance.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "Customer Segmentation" && (
          <Card>
            <CardHeader>
              <CardTitle>Customer Segmentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <label className="block text-xs font-medium">Clusters</label>
              <input
                type="number"
                min={2}
                max={6}
                value={clusters}
                className="border p-1 text-xs"
                onChange={(e) => setClusters(Number(e.target.value))}
              />
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="customerAge" name="Customer Age" />
                    <YAxis dataKey="sales" name="Sales" />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                    <Scatter data={segmentation.data ?? []} fill="#2f6b3a" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "Tax & Compliance" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Tax & Compliance Controls</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-4">
                <label className="grid gap-1 text-xs">
                  Registration Type
                  <select
                    className="border p-1"
                    value={taxRegistrationType}
                    onChange={(e) => setTaxRegistrationType(e.target.value as "regular" | "composition")}
                  >
                    <option value="regular">Regular</option>
                    <option value="composition">Composition</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs">
                  Look Ahead (Days)
                  <input
                    type="number"
                    min={30}
                    max={365}
                    className="border p-1"
                    value={taxDaysAhead}
                    onChange={(e) => setTaxDaysAhead(Math.min(365, Math.max(30, Number(e.target.value) || 90)))}
                  />
                </label>
                <label className="grid gap-1 text-xs">
                  Compliance Month (MM/YYYY)
                  <input
                    className="border p-1"
                    value={complianceMonth}
                    onChange={(e) => setComplianceMonth(e.target.value)}
                    placeholder="03/2026"
                  />
                </label>
                <label className="grid gap-1 text-xs">
                  Business GSTIN
                  <input
                    className="border p-1"
                    value={businessGstin}
                    onChange={(e) => setBusinessGstin(e.target.value)}
                    placeholder="27ABCDE1234F1Z5"
                  />
                </label>
              </CardContent>
            </Card>

            <div className="grid gap-3 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>GST Calculator</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-3">
                    <label className="grid gap-1 text-xs">
                      Gross Amount
                      <input
                        type="number"
                        min={0}
                        className="border p-1"
                        value={gstGrossAmount}
                        onChange={(e) => setGstGrossAmount(Math.max(0, Number(e.target.value) || 0))}
                      />
                    </label>
                    <label className="grid gap-1 text-xs">
                      GST Rate
                      <select
                        className="border p-1"
                        value={gstRate}
                        onChange={(e) => setGstRate(e.target.value as GstRate)}
                      >
                        <option value="0%">0%</option>
                        <option value="5%">5%</option>
                        <option value="12%">12%</option>
                        <option value="18%">18%</option>
                        <option value="28%">28%</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs">
                      Invoice Type
                      <select
                        className="border p-1"
                        value={gstInvoiceType}
                        onChange={(e) => setGstInvoiceType(e.target.value as GstInvoiceType)}
                      >
                        <option value="B2B">B2B</option>
                        <option value="B2C">B2C</option>
                        <option value="B2BSE">B2BSE</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid gap-2 text-xs md:grid-cols-3">
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">CGST</div>
                      <div className="font-semibold">{currency(gstCalc.data?.cgstAmount ?? 0)}</div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">SGST</div>
                      <div className="font-semibold">{currency(gstCalc.data?.sgstAmount ?? 0)}</div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">IGST</div>
                      <div className="font-semibold">{currency(gstCalc.data?.igstAmount ?? 0)}</div>
                    </div>
                  </div>
                  <div className="rounded border p-2 text-xs">
                    <span className="text-muted-foreground">Total GST: </span>
                    <span className="font-semibold">{currency(gstCalc.data?.totalGSTAmount ?? 0)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>ITC Eligibility & Expiry</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-3">
                    <label className="grid gap-1 text-xs">
                      Supplier Registration
                      <select
                        className="border p-1"
                        value={supplierRegistration}
                        onChange={(e) => setSupplierRegistration(e.target.value as SupplierRegistration)}
                      >
                        <option value="registered">Registered</option>
                        <option value="unregistered">Unregistered</option>
                        <option value="composition">Composition</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs">
                      Category
                      <select
                        className="border p-1"
                        value={purchaseCategory}
                        onChange={(e) => setPurchaseCategory(e.target.value as PurchaseCategory)}
                      >
                        <option value="COGS">COGS</option>
                        <option value="Services">Services</option>
                        <option value="CapitalAssets">Capital Assets</option>
                        <option value="OPEX">OPEX</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs">
                      Purchase Date
                      <input
                        type="date"
                        className="border p-1"
                        value={itcPurchaseDate}
                        onChange={(e) => setItcPurchaseDate(e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="grid gap-1 text-xs">
                    Item Category
                    <input
                      className="border p-1"
                      value={purchaseItemCategory}
                      onChange={(e) => setPurchaseItemCategory(e.target.value)}
                      placeholder="Raw Material"
                    />
                  </label>
                  <div className="rounded border p-2 text-xs">
                    <div>
                      ITC Status:{" "}
                      <span className={gstItcEligibility.data?.itcEligible ? "text-emerald-700 font-semibold" : "text-red-700 font-semibold"}>
                        {gstItcEligibility.data?.itcEligible ? "Eligible" : "Blocked"}
                      </span>
                    </div>
                    <div>
                      ITC %: <span className="font-semibold">{gstItcEligibility.data?.itcEligibilityPercent ?? 0}%</span>
                    </div>
                    {gstItcEligibility.data?.itcBlockReason && (
                      <div className="text-red-700">Reason: {gstItcEligibility.data.itcBlockReason}</div>
                    )}
                    <div className="mt-1">
                      Expiry: <span className="font-semibold">{gstItcExpiry.data?.expiryDate ?? "-"}</span> ({gstItcExpiry.data?.daysUntilExpiry ?? 0} days)
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly GST Liability</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="grid gap-2 md:grid-cols-3">
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">Output GST</div>
                      <div className="font-semibold">{currency(gstMonthlyLiability.data?.outputGST.totalOutput ?? 0)}</div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">Input GST (ITC)</div>
                      <div className="font-semibold">{currency(gstMonthlyLiability.data?.inputGST.totalInput ?? 0)}</div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">Net Liability</div>
                      <div className="font-semibold">{currency(gstMonthlyLiability.data?.netGSTLiability ?? 0)}</div>
                    </div>
                  </div>
                  <div>
                    Status: <span className="font-semibold uppercase">{gstMonthlyLiability.data?.paymentStatus ?? "-"}</span>
                  </div>
                  <div>
                    Due Date: <span className="font-semibold">{gstMonthlyLiability.data?.paymentDueDate ?? "-"}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>GSTR-1 Export Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div>
                    Filing Period: <span className="font-semibold">{gstGstr1Export.data?.fp ?? "-"}</span>
                  </div>
                  <div>
                    GSTIN: <span className="font-semibold">{gstGstr1Export.data?.gsptin ?? "-"}</span>
                  </div>
                  <div>
                    B2B Entries: <span className="font-semibold">{gstGstr1Export.data?.b2b.length ?? 0}</span>
                  </div>
                  <div>
                    HSN Rows: <span className="font-semibold">{gstGstr1Export.data?.hsn.length ?? 0}</span>
                  </div>
                  {gstGstr1Export.data?.warnings?.length ? (
                    <div className="text-amber-700">Warnings: {gstGstr1Export.data.warnings.join(" | ")}</div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Tax Deadlines ({taxDeadlines.data?.length ?? 0} rules)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {(taxUpcoming.data ?? []).length === 0 ? (
                  <div className="text-muted-foreground">No upcoming deadlines in selected window.</div>
                ) : (
                  <div className="space-y-2">
                    {(taxUpcoming.data ?? []).map((deadline) => (
                      <div key={`${deadline.rule.id}-${deadline.dueDate}`} className="rounded border p-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium">{deadline.rule.name}</div>
                          <div className="text-muted-foreground">Due: {deadline.dueDate}</div>
                        </div>
                        <div className="mt-1">{deadline.alertMessage}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {(meta.isLoading || dashboard.isLoading || anomalies.isLoading) && (
          <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
        )}
      </main>
    </div>
  );
}
