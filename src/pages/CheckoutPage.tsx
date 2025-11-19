'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/stores/cart-store";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Order, OrderItem } from "@shared/types";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
export function CheckoutPage() {
  const navigate = useNavigate();
  const items = useCartStore(s => s.items);
  const clearCart = useCartStore(s => s.clearCart);
  const totalPrice = items.reduce((total, item) => total + item.price, 0);
  const [isOrderComplete, setOrderComplete] = useState(false);
  const orderMutation = useMutation({
    mutationFn: (newOrder: { items: OrderItem[], total: number }) => api<Order>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(newOrder),
    }),
    onSuccess: () => {
      toast.success('Order placed successfully!');
      clearCart();
      setOrderComplete(true);
    },
    onError: () => {
      toast.error('Failed to place order. Please try again.');
    },
  });
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const orderItems: OrderItem[] = items.map(item => ({
      gameId: item.id,
      title: item.title,
      price: item.price,
      quantity: 1,
    }));
    orderMutation.mutate({ items: orderItems, total: totalPrice });
  };
  if (isOrderComplete) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 animate-fade-in">
        <CheckCircle2 className="h-24 w-24 text-green-500 mb-6" />
        <h1 className="font-orbitron text-4xl font-black text-blood-500 mb-4">Thank You for Your Order!</h1>
        <p className="text-gray-400 mb-8">Your games will be available in your library shortly.</p>
        <Button onClick={() => navigate('/library')} className="bg-blood-500 hover:bg-blood-600">Go to Library</Button>
      </div>
    );
  }
  return (
    <div className="animate-fade-in">
      <h1 className="font-orbitron text-4xl font-black text-blood-500 mb-8">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-void-800 border-void-700">
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
            <CardDescription>Enter your payment details. (This is a mock form)</CardDescription>
          </CardHeader>
          <form onSubmit={handlePlaceOrder}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="card-number">Card Number</Label>
                <Input id="card-number" placeholder="**** **** **** 1234" className="bg-void-700 border-void-600" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input id="expiry" placeholder="MM/YY" className="bg-void-700 border-void-600" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input id="cvc" placeholder="123" className="bg-void-700 border-void-600" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" size="lg" className="w-full bg-blood-500 hover:bg-blood-600 text-lg font-bold shadow-blood-glow" disabled={orderMutation.isPending}>
                {orderMutation.isPending ? 'Processing...' : `Pay ${totalPrice.toFixed(2)}`}
              </Button>
            </CardFooter>
          </form>
        </Card>
        <Card className="bg-void-800 border-void-700 h-fit">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <span className="truncate max-w-[180px]">{item.title}</span>
                <span className="font-semibold">${item.price.toFixed(2)}</span>
              </div>
            ))}
            <Separator className="my-4 bg-void-700" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}