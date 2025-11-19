import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion } from "framer-motion";
export function ContactPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent!", {
      description: "Thanks for reaching out. We'll get back to you soon.",
    });
    // In a real app, you would handle form submission here.
    const form = e.target as HTMLFormElement;
    form.reset();
  };
  return (
    <div className="min-h-screen bg-void-950 text-white flex items-center justify-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Card className="max-w-2xl mx-auto bg-void-800/80 border-void-700 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-4xl font-orbitron font-bold text-blood-500">Get In Touch</CardTitle>
              <CardDescription className="text-gray-400">
                Have a question or feedback? We'd love to hear from you.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="Your Name" required className="bg-void-700 border-void-600 focus:ring-blood-500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="your@email.com" required className="bg-void-700 border-void-600 focus:ring-blood-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="What's this about?" required className="bg-void-700 border-void-600 focus:ring-blood-500" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Your message here..." required rows={5} className="bg-void-700 border-void-600 focus:ring-blood-500" />
                </div>
                <Button type="submit" size="lg" className="w-full bg-blood-500 hover:bg-blood-600 text-lg font-bold shadow-blood-glow">
                  Send Message
                </Button>
              </CardContent>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}