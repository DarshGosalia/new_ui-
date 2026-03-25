declare module "@/features/feature1-anti/components/Layout" {
  import type { ComponentType } from "react";
  const Layout: ComponentType<any>;
  export default Layout;
}

declare module "@/features/feature1-anti/pages/Dashboard" {
  import type { ComponentType } from "react";
  const Dashboard: ComponentType<any>;
  export default Dashboard;
}

declare module "@/features/feature1-anti/pages/SupplierList" {
  import type { ComponentType } from "react";
  const SupplierList: ComponentType<any>;
  export default SupplierList;
}

declare module "@/features/feature1-anti/pages/SupplierProfile" {
  import type { ComponentType } from "react";
  const SupplierProfile: ComponentType<any>;
  export default SupplierProfile;
}

declare module "@/features/feature1-anti/pages/PaymentCalendar" {
  import type { ComponentType } from "react";
  const PaymentCalendar: ComponentType<any>;
  export default PaymentCalendar;
}

declare module "@/features/feature1-anti/pages/PaymentHistory" {
  import type { ComponentType } from "react";
  const PaymentHistory: ComponentType<any>;
  export default PaymentHistory;
}

declare module "@/features/feature1-anti/pages/Comparison" {
  import type { ComponentType } from "react";
  const Comparison: ComponentType<any>;
  export default Comparison;
}

declare module "@/features/feature1-anti/data/store" {
  export function getSuppliers(): any[];
  export function getSupplier(id: string): any;
  export function addSupplier(supplier: any): any;
  export function updateSupplier(id: string, updates: any): any;
  export function deleteSupplier(id: string): void;

  export function getPurchases(): any[];
  export function getPurchase(id: string): any;
  export function getPurchasesBySupplier(supplierId: string): any[];
  export function addPurchase(purchase: any): any;

  export function getPayments(): any[];
  export function getPaymentsBySupplier(supplierId: string): any[];
  export function addPayment(payment: any): any;

  export function getAlerts(): any[];
  export function markAlertRead(id: string): void;

  export function getSupplierStats(supplierId: string): any;
  export function getDashboardStats(): any;
  export function getDueDate(purchaseDate: string, creditTerms?: string): string;
  export function getCalendarEvents(): any[];
  export function getSupplierComparison(): any[];
  export function initializeDummyData(): void;
}
