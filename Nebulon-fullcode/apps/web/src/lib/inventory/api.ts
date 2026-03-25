export const fetchInventoryDashboard = async () => {
  const response = await fetch('/api/inventory/dashboard');
  if (!response.ok) throw new Error('Failed to fetch inventory dashboard data');
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Server error');
  return result.data;
};

export const uploadInventoryFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/inventory/upload', { method: 'POST', body: formData });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }
  return response.json();
};

export const lookupBarcode = async (barcode: string) => {
  const response = await fetch(`/api/inventory/lookup/${barcode}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Barcode not found' }));
    throw new Error(err.message || 'Barcode not found');
  }
  return response.json();
};

export const createPurchaseOrder = async (productId: string, quantity: number) => {
  const response = await fetch('/api/inventory/order-purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity })
  });
  if (!response.ok) throw new Error('Order creation failed');
  return response.json();
};
