import { useCartStore } from '@/stores/cart-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
export function CartPage() {
  const items = useCartStore(s => s.items);
  const removeFromCart = useCartStore(s => s.removeFromCart);
  const clearCart = useCartStore(s => s.clearCart);
  const totalPrice = items.reduce((total, item) => total + item.price, 0);
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
              <CardTitle className="flex justify-between items-center">
                <span>{items.length} Item(s)</span>
                <Button variant="destructive" size="sm" onClick={clearCart}>
                  Clear Cart
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <img src={item.coverImage} alt={item.title} className="w-16 h-20 object-cover rounded-md" />
                      <div className="flex-grow">
                        <h3 className="font-bold">{item.title}</h3>
                        <p className="text-sm text-gray-400">{item.tags[0]}</p>
                      </div>
                      <p className="font-semibold">${item.price.toFixed(2)}</p>
                      <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}>
                        <Trash2 className="h-5 w-5 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          <Card className="bg-void-800 border-void-700 h-fit">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Taxes</span>
                <span>Calculated at checkout</span>
              </div>
              <Separator className="bg-void-700" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild size="lg" className="w-full bg-blood-500 hover:bg-blood-600 text-lg font-bold shadow-blood-glow">
                <Link to="/checkout">Proceed to Checkout</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}