import { create } from "zustand";

export interface CartItem {
  id: string;
  name: string;
  selling_price: number;
  qty: number;
  discount: number; // Persentase atau nominal per item
  notes?: string;
}

interface CartState {
  cart: CartItem[];
  addItem: (product: Omit<CartItem, "qty" | "discount">) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  getTotals: (
    taxRate: number,
    globalDiscount: number,
  ) => {
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: [],

  addItem: (product) =>
    set((state) => {
      const existingItem = state.cart.find((item) => item.id === product.id);

      if (existingItem) {
        // Menggunakan .map() agar membuat array baru DAN objek baru secara aman (Immutable)
        const updatedCart = state.cart.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
        return { cart: updatedCart };
      }

      // Jika barang belum ada, tambahkan sebagai item baru
      return { cart: [...state.cart, { ...product, qty: 1, discount: 0 }] };
    }),

  removeItem: (id) =>
    set((state) => ({
      cart: state.cart.filter((item) => item.id !== id),
    })),

  updateQty: (id, qty) =>
    set((state) => ({
      cart: state.cart.map((item) => (item.id === id ? { ...item, qty: Math.max(1, qty) } : item)),
    })),

  clearCart: () => set({ cart: [] }),

  getTotals: (taxRate = 0.11, globalDiscount = 0) => {
    const cart = get().cart;
    const subtotal = cart.reduce((acc, item) => acc + item.selling_price * item.qty, 0);
    const discount = globalDiscount; // Bisa dikembangkan untuk kalkulasi persentase
    const tax = (subtotal - discount) * taxRate;
    const total = subtotal - discount + tax;

    return { subtotal, tax, discount, total };
  },
}));
