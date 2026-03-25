import type { Customer, RiskStatus } from "../data/store";

/**
 * Automatically assign:
 * 🟢 Green → pays within 7 days
 * 🟠 Amber → delays 7–14 days
 * 🔴 Red → frequent late / unpaid (or > 14 days)
 */
export function calculateRiskScore(customer: Customer): RiskStatus {
  // Simple rule-based logic based on average payment time
  if (customer.averagePaymentTimeDays <= 7) {
    return "Green";
  } else if (customer.averagePaymentTimeDays <= 14) {
    return "Amber";
  } else {
    return "Red";
  }
}

/**
 * Detect inactive customers based on behavior:
 * Example logic:
 *   Avg purchase gap = 8 days
 *   Current inactivity = 24 days -> Flag
 */
export function detectChurn(customer: Customer): boolean {
  if (!customer.lastActiveAt) return false;

  const now = new Date();
  const lastActive = new Date(customer.lastActiveAt);
  const diffTime = Math.abs(now.getTime() - lastActive.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // If we don't have historical gaps, we'll assume a standard 30-day grace period for testing
  // In a real system, we'd average the gap between their transactions.
  const gracePeriod = 30; // Flag if inactive for more than 30 days
  
  return diffDays > gracePeriod;
}
