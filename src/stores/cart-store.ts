import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Game } from '@shared/types';
export interface CartItem extends Game {
  quantity: number;
}
interface CartState {
  items: CartItem[];
  addToCart: (game: Game) => void;
  removeFromCart: (gameId: string) => void;
  clearCart: () => void;
}
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addToCart: (game) =>
        set((state) => {
          const existingItem = state.items.find((item) => item.id === game.id);
          if (existingItem) {
            // For this store, we'll just prevent adding duplicates.
            // A real store might increment quantity.
            return { items: state.items };
          }
          return { items: [...state.items, { ...game, quantity: 1 }] };
        }),
      removeFromCart: (gameId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== gameId),
        })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'crimson-grid-cart', // name of the item in the storage (must be unique)
    }
  )
);