// ──────────────────────────────────────────────────
// localStorage-based Data Layer for Supplier Module
// ──────────────────────────────────────────────────

const KEYS = {
  SUPPLIERS: 'supplyiq_suppliers',
  PURCHASES: 'supplyiq_purchases',
  PAYMENTS: 'supplyiq_payments',
  ALERTS: 'supplyiq_alerts',
  INITIALIZED: 'supplyiq_initialized',
};

// ─── Helpers ────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
const read = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const write = (key, data) => localStorage.setItem(key, JSON.stringify(data));
const today = () => new Date().toISOString().split('T')[0];

// ─── SUPPLIERS ─────────────────────────────────
export const getSuppliers = () => read(KEYS.SUPPLIERS);

export const getSupplier = (id) => getSuppliers().find((s) => s.id === id);

export const addSupplier = (supplier) => {
  const suppliers = getSuppliers();
  const exists = suppliers.find(
    (s) => s.name.toLowerCase() === supplier.name.toLowerCase()
  );
  if (exists) throw new Error('Supplier already exists');
  const newSupplier = { id: uid(), createdAt: today(), ...supplier };
  suppliers.push(newSupplier);
  write(KEYS.SUPPLIERS, suppliers);
  return newSupplier;
};

export const updateSupplier = (id, updates) => {
  const suppliers = getSuppliers();
  const idx = suppliers.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error('Supplier not found');
  suppliers[idx] = { ...suppliers[idx], ...updates };
  write(KEYS.SUPPLIERS, suppliers);
  return suppliers[idx];
};

export const deleteSupplier = (id) => {
  write(KEYS.SUPPLIERS, getSuppliers().filter((s) => s.id !== id));
};

// ─── PURCHASES ──────────────────────────────────
export const getPurchases = () => read(KEYS.PURCHASES);

export const getPurchase = (id) => getPurchases().find((p) => p.id === id);

export const getPurchasesBySupplier = (supplierId) =>
  getPurchases().filter((p) => p.supplierId === supplierId);

export const addPurchase = (purchase) => {
  const purchases = getPurchases();
  const newPurchase = {
    id: uid(),
    date: today(),
    status: 'pending', // pending | paid
    ...purchase,
    total: purchase.items.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0),
  };
  purchases.push(newPurchase);
  write(KEYS.PURCHASES, purchases);

  // Price change detection
  const alerts = getAlerts();
  for (const item of newPurchase.items) {
    const lastPurchase = purchases
      .filter(
        (p) =>
          p.id !== newPurchase.id &&
          p.supplierId === newPurchase.supplierId &&
          p.items.some((i) => i.name.toLowerCase() === item.name.toLowerCase())
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    if (lastPurchase) {
      const lastItem = lastPurchase.items.find(
        (i) => i.name.toLowerCase() === item.name.toLowerCase()
      );
      if (lastItem && item.pricePerUnit > lastItem.pricePerUnit) {
        const diff = item.pricePerUnit - lastItem.pricePerUnit;
        const supplierName =
          getSupplier(newPurchase.supplierId)?.name || 'Unknown Supplier';
        alerts.push({
          id: uid(),
          type: 'price_increase',
          date: today(),
          read: false,
          supplierId: newPurchase.supplierId,
          supplierName,
          itemName: item.name,
          oldPrice: lastItem.pricePerUnit,
          newPrice: item.pricePerUnit,
          diff,
          unit: item.unit || 'unit',
          message: `${supplierName} increased ${item.name} price by ₹${diff}/${item.unit || 'unit'} compared to last purchase`,
        });
      }
    }
  }
  write(KEYS.ALERTS, alerts);
  return newPurchase;
};

// ─── PAYMENTS ───────────────────────────────────
export const getPayments = () => read(KEYS.PAYMENTS);

export const getPaymentsBySupplier = (supplierId) =>
  getPayments().filter((p) => p.supplierId === supplierId);

export const addPayment = (payment) => {
  const payments = getPayments();
  const newPayment = { id: uid(), date: today(), ...payment };
  payments.push(newPayment);
  write(KEYS.PAYMENTS, payments);

  // Mark purchase as paid if invoiceRef matches a purchase id
  if (payment.invoiceRef) {
    const purchases = getPurchases();
    const idx = purchases.findIndex((p) => p.id === payment.invoiceRef);
    if (idx !== -1) {
      purchases[idx].status = 'paid';
      write(KEYS.PURCHASES, purchases);
    }
  }

  return newPayment;
};

// ─── ALERTS ─────────────────────────────────────
export const getAlerts = () => read(KEYS.ALERTS);

export const markAlertRead = (id) => {
  const alerts = getAlerts();
  const idx = alerts.findIndex((a) => a.id === id);
  if (idx !== -1) alerts[idx].read = true;
  write(KEYS.ALERTS, alerts);
};

// ─── COMPUTED / AGGREGATIONS ────────────────────
export const getSupplierStats = (supplierId) => {
  const purchases = getPurchasesBySupplier(supplierId);
  const payments = getPaymentsBySupplier(supplierId);
  const totalSpent = purchases.reduce((s, p) => s + p.total, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = totalSpent - totalPaid;
  return { totalSpent, totalPaid, outstanding, purchaseCount: purchases.length, paymentCount: payments.length };
};

export const getDashboardStats = () => {
  const suppliers = getSuppliers();
  const purchases = getPurchases();
  const payments = getPayments();
  const now = new Date();

  const totalPayables = purchases.reduce((s, p) => s + p.total, 0) -
    payments.reduce((s, p) => s + p.amount, 0);

  const pendingPurchases = purchases.filter((p) => p.status === 'pending');

  const upcomingPaymentsList = pendingPurchases.filter((p) => {
    const supplier = getSupplier(p.supplierId);
    if (!supplier) return false;
    const dueDate = getDueDate(p.date, supplier.creditTerms);
    const diff = (new Date(dueDate) - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  });
  
  const upcomingPayments = upcomingPaymentsList.length;
  const upcomingPaymentsAmount = upcomingPaymentsList.reduce((sum, p) => sum + p.total, 0);

  const overduePayments = pendingPurchases.filter((p) => {
    const supplier = getSupplier(p.supplierId);
    if (!supplier) return false;
    const dueDate = getDueDate(p.date, supplier.creditTerms);
    return new Date(dueDate) < now;
  }).length;

  // Top suppliers by spend
  const spendBySupplier = {};
  purchases.forEach((p) => {
    spendBySupplier[p.supplierId] = (spendBySupplier[p.supplierId] || 0) + p.total;
  });
  const topSuppliers = Object.entries(spendBySupplier)
    .map(([id, total]) => ({ ...getSupplier(id), totalSpent: total }))
    .filter(s => s.id)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  return { totalPayables, upcomingPayments, upcomingPaymentsAmount, overduePayments, topSuppliers, supplierCount: suppliers.length };
};

export const getDueDate = (purchaseDate, creditTerms) => {
  const days = parseInt(creditTerms?.replace('Net ', '') || '30', 10);
  const d = new Date(purchaseDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const getCalendarEvents = () => {
  const purchases = getPurchases().filter((p) => p.status === 'pending');
  const now = new Date();
  return purchases.map((p) => {
    const supplier = getSupplier(p.supplierId);
    const dueDate = getDueDate(p.date, supplier?.creditTerms);
    const diff = (new Date(dueDate) - now) / (1000 * 60 * 60 * 24);
    let color = '#6366f1'; // default indigo
    if (diff < 0) color = '#ef4444'; // overdue red
    else if (diff <= 3) color = '#f97316'; // warning orange
    return {
      id: p.id,
      title: `₹${p.total.toLocaleString()} - ${supplier?.name || 'Unknown'}`,
      date: dueDate,
      backgroundColor: color,
      borderColor: color,
      extendedProps: { purchase: p, supplier, dueDate },
    };
  });
};

// ─── SUPPLIER COMPARISON / AI INSIGHTS ──────────
export const getSupplierComparison = () => {
  const purchases = getPurchases();
  // Group by item name
  const itemMap = {};
  purchases.forEach((p) => {
    p.items.forEach((item) => {
      const key = item.name.toLowerCase();
      if (!itemMap[key]) itemMap[key] = { name: item.name, unit: item.unit || 'unit', suppliers: {} };
      const supplier = getSupplier(p.supplierId);
      if (!supplier) return;
      if (!itemMap[key].suppliers[p.supplierId]) {
        itemMap[key].suppliers[p.supplierId] = {
          supplierName: supplier.name,
          supplierId: p.supplierId,
          prices: [],
          totalQty: 0,
        };
      }
      itemMap[key].suppliers[p.supplierId].prices.push(item.pricePerUnit);
      itemMap[key].suppliers[p.supplierId].totalQty += item.quantity;
    });
  });

  // Only items with multiple suppliers
  const comparisons = Object.values(itemMap)
    .filter((item) => Object.keys(item.suppliers).length > 1)
    .map((item) => {
      const supplierData = Object.values(item.suppliers).map((s) => ({
        ...s,
        avgPrice: Math.round(s.prices.reduce((a, b) => a + b, 0) / s.prices.length),
        latestPrice: s.prices[s.prices.length - 1],
      }));
      const bestPrice = Math.min(...supplierData.map((s) => s.avgPrice));
      const bestSupplier = supplierData.find((s) => s.avgPrice === bestPrice);

      // Generate savings insight
      const totalMonthlyQty = supplierData.reduce((s, sd) => s + sd.totalQty, 0);
      const avgMonthlyQty = Math.round(totalMonthlyQty / 3); // rough monthly estimate
      const nonBestSuppliers = supplierData.filter((s) => s.avgPrice > bestPrice);
      const insights = nonBestSuppliers.map((s) => {
        const savings = (s.avgPrice - bestPrice) * avgMonthlyQty;
        return {
          message: `You purchase ~${avgMonthlyQty}${item.unit} ${item.name} monthly. Switching from ${s.supplierName} to ${bestSupplier.supplierName} can save ₹${savings.toLocaleString()}/month.`,
          savings,
          from: s.supplierName,
          to: bestSupplier.supplierName,
        };
      });

      return {
        itemName: item.name,
        unit: item.unit,
        suppliers: supplierData,
        bestPrice,
        bestSupplier: bestSupplier?.supplierName,
        insights,
      };
    });

  return comparisons;
};

// ─── INITIALIZATION WITH DUMMY DATA ─────────────
export const initializeDummyData = () => {
  if (localStorage.getItem(KEYS.INITIALIZED)) return;

  const suppliers = [
    { id: 's1', name: 'Sharma Traders', phone: '9876543210', address: '12, Main Market, Delhi', creditTerms: 'Net 15', createdAt: '2025-09-01' },
    { id: 's2', name: 'Gupta Wholesale', phone: '9876543211', address: '45, Station Road, Mumbai', creditTerms: 'Net 30', createdAt: '2025-08-15' },
    { id: 's3', name: 'Patel Distributors', phone: '9876543212', address: '78, Gandhi Nagar, Ahmedabad', creditTerms: 'Net 7', createdAt: '2025-10-10' },
    { id: 's4', name: 'Agarwal Supplies', phone: '9876543213', address: '23, MG Road, Bangalore', creditTerms: 'Net 15', createdAt: '2025-11-01' },
    { id: 's5', name: 'Verma & Sons', phone: '9876543214', address: '56, Civil Lines, Lucknow', creditTerms: 'Net 30', createdAt: '2025-12-05' },
    { id: 's6', name: 'Reddy Enterprises', phone: '9876543215', address: '89, Tank Bund, Hyderabad', creditTerms: 'Net 15', createdAt: '2025-07-20' },
    { id: 's7', name: 'Khan Brothers', phone: '9876543216', address: '34, Aminabad, Lucknow', creditTerms: 'Net 7', createdAt: '2026-01-10' },
    { id: 's8', name: 'Singh Trading Co.', phone: '9876543217', address: '67, Sector 17, Chandigarh', creditTerms: 'Net 30', createdAt: '2026-01-25' },
  ];

  const now = new Date();
  const d = (daysAgo) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - daysAgo);
    return dt.toISOString().split('T')[0];
  };

  const purchases = [
    { id: 'p1', supplierId: 's1', date: d(60), status: 'paid', items: [{ name: 'Rice', quantity: 200, pricePerUnit: 42, unit: 'kg' }, { name: 'Dal', quantity: 100, pricePerUnit: 95, unit: 'kg' }], total: 200 * 42 + 100 * 95 },
    { id: 'p2', supplierId: 's1', date: d(30), status: 'paid', items: [{ name: 'Rice', quantity: 250, pricePerUnit: 45, unit: 'kg' }, { name: 'Dal', quantity: 80, pricePerUnit: 98, unit: 'kg' }], total: 250 * 45 + 80 * 98 },
    { id: 'p3', supplierId: 's1', date: d(5), status: 'pending', items: [{ name: 'Rice', quantity: 300, pricePerUnit: 50, unit: 'kg' }, { name: 'Sugar', quantity: 150, pricePerUnit: 48, unit: 'kg' }], total: 300 * 50 + 150 * 48 },
    { id: 'p4', supplierId: 's2', date: d(45), status: 'paid', items: [{ name: 'Sugar', quantity: 200, pricePerUnit: 44, unit: 'kg' }, { name: 'Tea', quantity: 50, pricePerUnit: 280, unit: 'kg' }], total: 200 * 44 + 50 * 280 },
    { id: 'p5', supplierId: 's2', date: d(12), status: 'pending', items: [{ name: 'Sugar', quantity: 250, pricePerUnit: 42, unit: 'kg' }, { name: 'Rice', quantity: 100, pricePerUnit: 40, unit: 'kg' }], total: 250 * 42 + 100 * 40 },
    { id: 'p6', supplierId: 's3', date: d(20), status: 'pending', items: [{ name: 'Oil', quantity: 100, pricePerUnit: 160, unit: 'litre' }, { name: 'Ghee', quantity: 30, pricePerUnit: 520, unit: 'kg' }], total: 100 * 160 + 30 * 520 },
    { id: 'p7', supplierId: 's3', date: d(2), status: 'pending', items: [{ name: 'Oil', quantity: 120, pricePerUnit: 168, unit: 'litre' }, { name: 'Dal', quantity: 60, pricePerUnit: 100, unit: 'kg' }], total: 120 * 168 + 60 * 100 },
    { id: 'p8', supplierId: 's4', date: d(35), status: 'paid', items: [{ name: 'Tea', quantity: 40, pricePerUnit: 290, unit: 'kg' }, { name: 'Coffee', quantity: 25, pricePerUnit: 450, unit: 'kg' }], total: 40 * 290 + 25 * 450 },
    { id: 'p9', supplierId: 's4', date: d(8), status: 'pending', items: [{ name: 'Tea', quantity: 60, pricePerUnit: 300, unit: 'kg' }, { name: 'Rice', quantity: 150, pricePerUnit: 43, unit: 'kg' }], total: 60 * 300 + 150 * 43 },
    { id: 'p10', supplierId: 's5', date: d(25), status: 'paid', items: [{ name: 'Atta', quantity: 200, pricePerUnit: 35, unit: 'kg' }, { name: 'Sugar', quantity: 100, pricePerUnit: 46, unit: 'kg' }], total: 200 * 35 + 100 * 46 },
    { id: 'p11', supplierId: 's5', date: d(3), status: 'pending', items: [{ name: 'Atta', quantity: 250, pricePerUnit: 38, unit: 'kg' }, { name: 'Oil', quantity: 50, pricePerUnit: 155, unit: 'litre' }], total: 250 * 38 + 50 * 155 },
    { id: 'p12', supplierId: 's6', date: d(40), status: 'paid', items: [{ name: 'Spices', quantity: 30, pricePerUnit: 320, unit: 'kg' }, { name: 'Dal', quantity: 80, pricePerUnit: 92, unit: 'kg' }], total: 30 * 320 + 80 * 92 },
    { id: 'p13', supplierId: 's6', date: d(7), status: 'pending', items: [{ name: 'Spices', quantity: 40, pricePerUnit: 340, unit: 'kg' }, { name: 'Rice', quantity: 100, pricePerUnit: 44, unit: 'kg' }], total: 40 * 340 + 100 * 44 },
    { id: 'p14', supplierId: 's7', date: d(15), status: 'pending', items: [{ name: 'Ghee', quantity: 20, pricePerUnit: 540, unit: 'kg' }, { name: 'Atta', quantity: 100, pricePerUnit: 36, unit: 'kg' }], total: 20 * 540 + 100 * 36 },
    { id: 'p15', supplierId: 's8', date: d(10), status: 'pending', items: [{ name: 'Coffee', quantity: 30, pricePerUnit: 460, unit: 'kg' }, { name: 'Tea', quantity: 45, pricePerUnit: 295, unit: 'kg' }], total: 30 * 460 + 45 * 295 },
  ];

  const payments = [
    { id: 'pay1', supplierId: 's1', date: d(55), amount: 17900, method: 'Bank Transfer', invoiceRef: 'p1' },
    { id: 'pay2', supplierId: 's1', date: d(25), amount: 19090, method: 'UPI', invoiceRef: 'p2' },
    { id: 'pay3', supplierId: 's2', date: d(30), amount: 22800, method: 'Cash', invoiceRef: 'p4' },
    { id: 'pay4', supplierId: 's4', date: d(28), amount: 22850, method: 'Bank Transfer', invoiceRef: 'p8' },
    { id: 'pay5', supplierId: 's5', date: d(18), amount: 11600, method: 'Cheque', invoiceRef: 'p10' },
    { id: 'pay6', supplierId: 's6', date: d(32), amount: 16960, method: 'UPI', invoiceRef: 'p12' },
  ];

  const alerts = [
    { id: 'a1', type: 'price_increase', date: d(5), read: false, supplierId: 's1', supplierName: 'Sharma Traders', itemName: 'Rice', oldPrice: 45, newPrice: 50, diff: 5, unit: 'kg', message: 'Sharma Traders increased Rice price by ₹5/kg compared to last purchase' },
    { id: 'a2', type: 'price_increase', date: d(2), read: false, supplierId: 's3', supplierName: 'Patel Distributors', itemName: 'Oil', oldPrice: 160, newPrice: 168, diff: 8, unit: 'litre', message: 'Patel Distributors increased Oil price by ₹8/litre compared to last purchase' },
    { id: 'a3', type: 'price_increase', date: d(8), read: false, supplierId: 's4', supplierName: 'Agarwal Supplies', itemName: 'Tea', oldPrice: 290, newPrice: 300, diff: 10, unit: 'kg', message: 'Agarwal Supplies increased Tea price by ₹10/kg compared to last purchase' },
    { id: 'a4', type: 'price_increase', date: d(3), read: false, supplierId: 's5', supplierName: 'Verma & Sons', itemName: 'Atta', oldPrice: 35, newPrice: 38, diff: 3, unit: 'kg', message: 'Verma & Sons increased Atta price by ₹3/kg compared to last purchase' },
    { id: 'a5', type: 'price_increase', date: d(7), read: false, supplierId: 's6', supplierName: 'Reddy Enterprises', itemName: 'Spices', oldPrice: 320, newPrice: 340, diff: 20, unit: 'kg', message: 'Reddy Enterprises increased Spices price by ₹20/kg compared to last purchase' },
  ];

  write(KEYS.SUPPLIERS, suppliers);
  write(KEYS.PURCHASES, purchases);
  write(KEYS.PAYMENTS, payments);
  write(KEYS.ALERTS, alerts);
  localStorage.setItem(KEYS.INITIALIZED, 'true');
};

