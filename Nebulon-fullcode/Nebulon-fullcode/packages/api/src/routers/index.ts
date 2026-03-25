import { protectedProcedure, publicProcedure, router } from "../index";
import {
  ageDistribution,
  anomalyEngineSummary,
  applyFilters,
  cashForecastProjection,
  calculateBalanceSheet,
  cashInHandSummary,
  calculateKpis,
  calculatePreviousPeriod,
  calculateYoYPeriod,
  compareMetrics,
  dayTransactions,
  detectAnomalies,
  expenseBreakdown,
  filterOptions,
  forecast,
  generateAgeInsight,
  generateBatchedInsights,
  generateGenderInsight,
  generateInsight,
  generateProductInsight,
  generateRegionalInsight,
  generateTimeSeriesInsight,
  genderSplit,
  profitLossStatement,
  revenueHeatmap,
  repeatAndChurn,
  resolveRows,
  marginTrend,
  salesByProduct,
  salesByRegion,
  salesProfitOverTime,
  segmentCustomers,
  calculateGSTAmounts,
  determineITCEligibility,
  calculateMonthlyGSTLiability,
  calculateITCExpiry,
  buildGSTR1JSON,
  getStandardTaxDeadlines,
  calculateDeadlineDate,
  getUpcomingTaxDeadlines,
  formatTaxDeadlineAlert,
} from "../bi";
import { z } from "zod";

const salesRowSchema = z.object({
  customerId: z.number(),
  date: z.string(),
  region: z.string(),
  product: z.string(),
  vendor: z.string(),
  sales: z.number(),
  profit: z.number(),
  customerAge: z.number(),
  customerGender: z.string(),
  cogsCategory: z.string(),
  cogsAmount: z.number(),
  opexCategory: z.string(),
  opexAmount: z.number(),
});

const filtersSchema = z.object({
  rows: z.array(salesRowSchema).optional(),
  regions: z.array(z.string()).optional(),
  products: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const customAlertRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["singleExpenseAbove", "dailyRevenueBelow", "weeklyRevenueBelow"]),
  threshold: z.number(),
  enabled: z.boolean(),
});

const alertFatigueSignalSchema = z.object({
  ignoredStreak: z.number().min(0),
  markAsNormal: z.boolean(),
});

const recurringExpenseSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number().min(0),
  dayOfMonth: z.number().int().min(1).max(31),
});

const whatIfScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["stockLoan", "manualCollection"]),
  amount: z.number().min(0),
  date: z.string(),
});

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  biMeta: publicProcedure
    .input(
      z
        .object({
          rows: z.array(salesRowSchema).optional(),
        })
        .optional(),
    )
    .query(({ input }) => {
      const rows = resolveRows(input?.rows);
      return filterOptions(rows);
    }),
  biDashboard: publicProcedure
    .input(
      filtersSchema.extend({
        aggregation: z.enum(["Daily", "Weekly", "Monthly"]).default("Daily"),
        comparisonMode: z.enum(["previousPeriod", "yoY"]).optional(),
        comparisonCustomStart: z.string().optional(),
        comparisonCustomEnd: z.string().optional(),
        minimumCashBuffer: z.number().min(0).default(300000),
        netMarginTarget: z.number().default(15),
        outstandingThresholdDays: z.union([z.literal(7), z.literal(14), z.literal(30)]).default(14),
        customRules: z.array(customAlertRuleSchema).max(10).optional(),
        fatigueState: z.record(z.string(), alertFatigueSignalSchema).optional(),
      }),
    )
    .query(async ({ input }) => {
      const rows = resolveRows(input.rows);
      const filtered = applyFilters(rows, input);
      const products = salesByProduct(filtered);
      const regions = salesByRegion(filtered);
      const genderData = genderSplit(filtered);
      const ageData = ageDistribution(filtered);
      const timeSeries = salesProfitOverTime(filtered, input.aggregation);
      const currentKpis = calculateKpis(filtered);
      const pnl = profitLossStatement(filtered);
      const expenses = expenseBreakdown(filtered);
      const margins = marginTrend(filtered, "Weekly").slice(-12);
      const cashSummary = cashInHandSummary(filtered);
      const anomalyEngine = await anomalyEngineSummary(
        filtered,
        input.minimumCashBuffer,
        input.netMarginTarget,
        input.outstandingThresholdDays,
        input.customRules ?? [],
        input.fatigueState ?? {},
      );

      // Generate all insights (cached and batched)
      const insights = await generateBatchedInsights(filtered, true);

      // Initialize comparison data as null
      let totalSalesComparison: ReturnType<typeof compareMetrics> | null = null;
      let totalProfitComparison: ReturnType<typeof compareMetrics> | null = null;
      let profitMarginComparison: ReturnType<typeof compareMetrics> | null = null;

      // Calculate comparison data if mode is selected
      if (input.comparisonMode || input.comparisonCustomStart) {
        let comparisonFilters: typeof input = { ...input };
        if (input.comparisonMode === "previousPeriod") {
          const period = calculatePreviousPeriod(input.startDate, input.endDate);
          if (period) {
            comparisonFilters.startDate = period.startDate;
            comparisonFilters.endDate = period.endDate;
          }
        } else if (input.comparisonMode === "yoY") {
          const period = calculateYoYPeriod(input.startDate, input.endDate);
          if (period) {
            comparisonFilters.startDate = period.startDate;
            comparisonFilters.endDate = period.endDate;
          }
        } else if (input.comparisonCustomStart && input.comparisonCustomEnd) {
          comparisonFilters.startDate = input.comparisonCustomStart;
          comparisonFilters.endDate = input.comparisonCustomEnd;
        }

        const comparisonRows = applyFilters(rows, comparisonFilters);
        const comparisonKpis = calculateKpis(comparisonRows);

        totalSalesComparison = compareMetrics(currentKpis.totalSales, comparisonKpis.totalSales);
        totalProfitComparison = compareMetrics(currentKpis.totalProfit, comparisonKpis.totalProfit);
        profitMarginComparison = compareMetrics(currentKpis.profitMargin, comparisonKpis.profitMargin);
      }

      return {
        kpis: currentKpis,
        totalSalesComparison,
        totalProfitComparison,
        profitMarginComparison,
        insights,
        regionalSales: regions,
        genderSplit: genderData,
        ageDistribution: ageData,
        productSales: products.all,
        topProducts: products.top,
        bottomProducts: products.bottom,
        timeSeries,
        expenseBreakdown: expenses,
        marginTracker: {
          currentGrossMargin: pnl.grossMarginPct,
          currentNetMargin: pnl.netMarginPct,
          trend: margins,
        },
        anomalyEngine,
        cashInHand: cashSummary,
        customerStats: repeatAndChurn(filtered),
        balanceSheet: calculateBalanceSheet(filtered),
        filteredRows: filtered,
      };
    }),
  biAnomalies: publicProcedure
    .input(
      filtersSchema.extend({
        contamination: z.number().min(0.01).max(0.2).default(0.05),
      }),
    )
    .query(({ input }) => {
      const rows = resolveRows(input.rows);
      const filtered = applyFilters(rows, input);
      return detectAnomalies(filtered, input.contamination);
    }),
  biForecast: publicProcedure
    .input(
      filtersSchema.extend({
        periods: z.number().int().min(1).max(180).default(30),
      }),
    )
    .query(({ input }) => {
      const rows = resolveRows(input.rows);
      const filtered = applyFilters(rows, input);
      return forecast(filtered, input.periods);
    }),
  biCashForecast: publicProcedure
    .input(
      filtersSchema.extend({
        horizonDays: z.union([z.literal(30), z.literal(60), z.literal(90)]).default(30),
        mode: z.enum(["conservative", "realistic"]).default("realistic"),
        minimumBuffer: z.number().min(0).default(300000),
        recurringExpenses: z.array(recurringExpenseSchema).max(50).default([]),
        scenarios: z.array(whatIfScenarioSchema).max(20).default([]),
      }),
    )
    .query(({ input }) => {
      const rows = resolveRows(input.rows);
      const filtered = applyFilters(rows, input);
      return cashForecastProjection(filtered, {
        horizonDays: input.horizonDays,
        mode: input.mode,
        minimumBuffer: input.minimumBuffer,
        recurringExpenses: input.recurringExpenses,
        scenarios: input.scenarios,
      });
    }),
  biSegmentation: publicProcedure
    .input(
      filtersSchema.extend({
        clusters: z.number().int().min(2).max(6).default(3),
      }),
    )
    .query(({ input }) => {
      const rows = resolveRows(input.rows);
      const filtered = applyFilters(rows, input);
      return segmentCustomers(filtered, input.clusters);
    }),
  biRevenueHeatmap: publicProcedure
    .input(
      filtersSchema.extend({
        month: z.string().optional(),
      }),
    )
    .query(({ input }) => {
      const rows = resolveRows(input.rows);
      const filtered = applyFilters(rows, input);
      return revenueHeatmap(filtered, input.month);
    }),
  biDayTransactions: publicProcedure
    .input(
      filtersSchema.extend({
        date: z.string(),
      }),
    )
    .query(({ input }) => {
      const rows = resolveRows(input.rows);
      const filtered = applyFilters(rows, input);
      return dayTransactions(filtered, input.date);
    }),
  biProfitLoss: publicProcedure
    .input(filtersSchema)
    .query(({ input }) => {
      const rows = resolveRows(input.rows);
      const filtered = applyFilters(rows, input);
      return profitLossStatement(filtered);
    }),
  biBalanceSheet: publicProcedure
    .input(filtersSchema)
    .query(({ input }) => {
      const rows = resolveRows(input.rows);
      const filtered = applyFilters(rows, input);
      return calculateBalanceSheet(filtered);
    }),
  biInsights: publicProcedure
    .input(filtersSchema)
    .query(async ({ input }) => {
      const rows = resolveRows(input.rows);
      const filtered = applyFilters(rows, input);
      return generateBatchedInsights(filtered, true);
    }),

  // ============================================================================
  // PHASE 1: GST & TAX COMPLIANCE ENDPOINTS
  // ============================================================================

  // GST Calculation: Calculate GST amounts for a transaction
  gstCalculateAmounts: publicProcedure
    .input(
      z.object({
        grossAmount: z.number().min(0),
        gstRate: z.enum(["0%", "5%", "12%", "18%", "28%"]),
        invoiceType: z.enum(["B2B", "B2C", "B2BSE"]),
      }),
    )
    .query(({ input }) => {
      return calculateGSTAmounts(input.grossAmount, input.gstRate, input.invoiceType);
    }),

  // ITC Eligibility: Check if purchase GST is creditable
  gstCheckITCEligibility: publicProcedure
    .input(
      z.object({
        supplierRegistration: z.enum(["registered", "unregistered", "composition"]),
        category: z.enum(["COGS", "Services", "CapitalAssets", "OPEX", "Other"]),
        itemCategory: z.string(),
      }),
    )
    .query(({ input }) => {
      return determineITCEligibility(input.supplierRegistration, input.category, input.itemCategory);
    }),

  // Monthly GST Liability: Aggregate all invoices/purchases for a month
  gstMonthlyLiability: publicProcedure
    .input(
      z.object({
        month: z.string().regex(/^\d{2}\/\d{4}$/), // MM/YYYY format
        invoices: z.array(z.any()).default([]), // GSTInvoice[]
        purchases: z.array(z.any()).default([]), // GSSTPurchaseTransaction[]
      }),
    )
    .query(({ input }) => {
      // For MVP: return mock data structure. In Phase 2, integrate with real data.
      const summary = calculateMonthlyGSTLiability(input.invoices, input.purchases, input.month);
      return summary;
    }),

  // ITC Expiry Tracking: Calculate when ITC expires
  gstITCExpiry: publicProcedure
    .input(
      z.object({
        purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
      }),
    )
    .query(({ input }) => {
      return calculateITCExpiry(input.purchaseDate);
    }),

  // GSTR-1 Export: Generate JSON for GSTN upload
  gstExportGSTR1: publicProcedure
    .input(
      z.object({
        month: z.string().regex(/^\d{2}\/\d{4}$/), // MM/YYYY
        businessGSTIN: z.string(),
        invoices: z.array(z.any()).default([]), // GSTInvoice[]
      }),
    )
    .query(({ input }) => {
      return buildGSTR1JSON(input.invoices, input.month, input.businessGSTIN);
    }),

  // Tax Calendar: Get standard India tax deadlines
  taxCalendarGetDeadlines: publicProcedure
    .input(
      z.object({
        registrationType: z.enum(["regular", "composition"]).default("regular"),
      }),
    )
    .query(({ input }) => {
      return getStandardTaxDeadlines(input.registrationType);
    }),

  // Tax Calendar: Get upcoming deadlines for next 90 days
  taxCalendarUpcoming: publicProcedure
    .input(
      z.object({
        registrationType: z.enum(["regular", "composition"]).default("regular"),
        daysAhead: z.number().default(90),
      }),
    )
    .query(({ input }) => {
      const deadlines = getUpcomingTaxDeadlines(input.registrationType, input.daysAhead);
      return deadlines.map((d) => ({
        rule: d.rule,
        dueDate: d.dueDate.toISOString().slice(0, 10),
        daysUntilDue: d.daysUntilDue,
        alertStatus: d.alertStatus,
        isOverdue: d.isOverdue,
        alertMessage: formatTaxDeadlineAlert(d.rule, d.daysUntilDue),
      }));
    }),

  // Tax Calendar: Calculate specific deadline date
  taxCalendarCalculateDeadline: publicProcedure
    .input(
      z.object({
        ruleId: z.string(),
        registrationType: z.enum(["regular", "composition"]).default("regular"),
      }),
    )
    .query(({ input }) => {
      const rules = getStandardTaxDeadlines(input.registrationType);
      const rule = rules.find((r) => r.id === input.ruleId);
      if (!rule) {
        return { error: "Deadline rule not found" };
      }
      const calculated = calculateDeadlineDate(rule);
      return {
        rule,
        dueDate: calculated.dueDate.toISOString().slice(0, 10),
        daysUntilDue: calculated.daysUntilDue,
        alertStatus: calculated.alertStatus,
        isOverdue: calculated.isOverdue,
        alertMessage: formatTaxDeadlineAlert(rule, calculated.daysUntilDue),
      };
    }),
});
export type AppRouter = typeof appRouter;
