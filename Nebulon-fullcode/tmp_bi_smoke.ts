import { appRouter } from "./packages/api/src/routers/index";

async function run() {
  const caller = appRouter.createCaller({ session: null as any });

  const meta = await caller.biMeta({});
  const dashboard = await caller.biDashboard({ aggregation: "Monthly" });
  const anomalies = await caller.biAnomalies({ contamination: 0.05 });
  const forecast = await caller.biForecast({ periods: 30 });
  const segmentation = await caller.biSegmentation({ clusters: 3 });

  console.log("SMOKE_RESULT_START");
  console.log(
    JSON.stringify(
      {
        meta: {
          regionsCount: meta.regions.length,
          productsCount: meta.products.length,
          minDate: meta.minDate,
          maxDate: meta.maxDate,
          regions: meta.regions,
          products: meta.products,
        },
        dashboard: {
          kpis: dashboard.kpis,
          insights: dashboard.insights,
          regionalSalesTop: dashboard.regionalSales.slice(0, 3),
          genderSplit: dashboard.genderSplit,
          ageDistributionBuckets: dashboard.ageDistribution.length,
          topProducts: dashboard.topProducts,
          bottomProducts: dashboard.bottomProducts,
          timeSeriesPoints: dashboard.timeSeries.length,
          customerStats: dashboard.customerStats,
          filteredRows: dashboard.filteredRows.length,
        },
        anomalies: {
          seriesPoints: anomalies.series.length,
          anomaliesCount: anomalies.anomalies.length,
          firstAnomaly: anomalies.anomalies[0] ?? null,
        },
        forecast: {
          points: forecast.length,
          first: forecast[0] ?? null,
          last: forecast[forecast.length - 1] ?? null,
        },
        segmentation: {
          points: segmentation.length,
          segments: [...new Set(segmentation.map((s) => s.segment))].sort((a, b) => a - b),
          sample: segmentation.slice(0, 3),
        },
      },
      null,
      2,
    ),
  );
  console.log("SMOKE_RESULT_END");
}

run().catch((err) => {
  console.error("SMOKE_ERROR", err);
  process.exit(1);
});
