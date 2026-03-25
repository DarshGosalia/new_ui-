import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import Layout from "@/features/feature1-anti/components/Layout";
import { initializeDummyData } from "@/features/feature1-anti/data/store";
import "@/features/feature1-anti/anti.css";

export const Route = createFileRoute("/anti")({
  component: RouteComponent,
});

function RouteComponent() {
  useEffect(() => {
    initializeDummyData();
  }, []);

  return <Layout />;
}
