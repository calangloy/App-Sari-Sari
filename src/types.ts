export interface Product {
  id?: string;
  barcode: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  stockLevel: number;
  category: string;
  supplierId?: string;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Sale {
  id?: string;
  items: SaleItem[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'e-wallet';
  customerId?: string;
  timestamp: string;
}

export interface Customer {
  id?: string;
  name: string;
  phone?: string;
  points: number;
  totalSpent: number;
}

export interface Supplier {
  id?: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

export interface Purchase {
  id?: string;
  supplierId: string;
  items: { productId: string; name: string; quantity: number; cost: number }[];
  total: number;
  status: 'pending' | 'received' | 'cancelled';
  timestamp: string;
}
