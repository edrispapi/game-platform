'use client';
import { useState } from 'react';
import { useCartStore } from '@/stores/cart-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Trash2, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
export function CartPage() {
  const items = useCartStore(s => s.items);
  const removeFromCart = useCartStore(s => s.removeFromCart);
  const clearCart = useCartStore(s => s.clearCart);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(items.map(item => item.id)));
  
  const toggleItem = (itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };
  
  const selectAll = () => {
    setSelectedItems(new Set(items.map(item => item.id)));
  };
  
  const deselectAll = () => {
    setSelectedItems(new Set());
  };
  
  const selectedItemsList = items.filter(item => selectedItems.has(item.id));
  const totalPrice = selectedItemsList.reduce((total, item) => total + item.price, 0);
  return (
    <div className="animate-fade-in">
      <h1 className="font-orbitron text-4xl font-black text-blood-500 mb-8">Your Cart</h1>
      {items.length === 0 ? (
        <div className="text-center py-20 bg-void-800 rounded-lg border border-void-700">
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-gray-400 mb-6">Looks like you haven't added any games yet.</p>
          <Button asChild className="bg-blood-500 hover:bg-blood-600">
            <Link to="/store">Browse Games</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 bg-void-800 border-void-700">
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <span>{items.length} Item(s)</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll} className="text-xs sm:text-sm">
                    <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll} className="text-xs sm:text-sm">
                    <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Deselect All
                  </Button>
                  <Button variant="destructive" size="sm" onClick={clearCart} className="text-xs sm:text-sm">
                    Clear Cart
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {items.map((item) => {
                    const isSelected = selectedItems.has(item.id);
                    return (
                      <div 
                        key={item.id} 
                        className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-colors ${
                          isSelected 
                            ? 'bg-void-700 border-blood-500/50' 
                            : 'bg-void-800/50 border-void-700 hover:border-void-600'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleItem(item.id)}
                          className="shrink-0"
                        />
                        <img 
                          src={item.coverImage} 
                          alt={item.title} 
                          className="w-12 h-16 sm:w-16 sm:h-20 object-cover rounded-md shrink-0" 
                        />
                        <div className="flex-grow min-w-0">
                          <h3 className="font-bold text-sm sm:text-base truncate">{item.title}</h3>
                          <p className="text-xs sm:text-sm text-gray-400">{item.tags[0] || 'Game'}</p>
                        </div>
                        <p className="font-semibold text-sm sm:text-base shrink-0">${item.price.toFixed(2)}</p>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeFromCart(item.id)}
                          className="shrink-0 h-8 w-8 sm:h-10 sm:w-10"
                        >
                          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          <Card className="bg-void-800 border-void-700 h-fit">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm sm:text-base">
                <span>Selected Items</span>
                <span>{selectedItemsList.length} of {items.length}</span>
              </div>
              <div className="flex justify-between text-sm sm:text-base">
                <span>Subtotal</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm text-gray-400">
                <span>Taxes</span>
                <span>Calculated at checkout</span>
              </div>
              <Separator className="bg-void-700" />
              <div className="flex justify-between font-bold text-base sm:text-lg">
                <span>Total</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                asChild 
                size="lg" 
                className="w-full bg-blood-500 hover:bg-blood-600 text-base sm:text-lg font-bold shadow-blood-glow"
                disabled={selectedItemsList.length === 0}
              >
                <Link to="/checkout">Proceed to Checkout ({selectedItemsList.length})</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}