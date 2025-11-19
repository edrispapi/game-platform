import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2, Users, Globe } from "lucide-react";
import { motion } from "framer-motion";
export function AboutPage() {
  return (
    <div className="min-h-screen bg-void-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h1 className="font-orbitron text-5xl md:text-7xl font-black text-blood-500 mb-4">About Crimson Grid</h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
            We are a passionate team of developers and gamers dedicated to creating the ultimate hub for the gaming community.
          </p>
        </motion.div>
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}>
            <Card className="bg-void-800 border-void-700 text-center h-full">
              <CardHeader>
                <div className="mx-auto bg-blood-500/20 text-blood-500 p-4 rounded-full w-fit">
                  <Gamepad2 className="h-10 w-10" />
                </div>
                <CardTitle className="font-orbitron text-2xl mt-4">For Gamers, By Gamers</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-400">
                Crimson Grid was born from a desire for a platform that truly understands what gamers want: a seamless experience, a vast library, and a place to connect.
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.4 }}>
            <Card className="bg-void-800 border-void-700 text-center h-full">
              <CardHeader>
                <div className="mx-auto bg-blood-500/20 text-blood-500 p-4 rounded-full w-fit">
                  <Users className="h-10 w-10" />
                </div>
                <CardTitle className="font-orbitron text-2xl mt-4">Community Focused</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-400">
                We believe that gaming is better together. Our social features are designed to help you find teammates, chat with friends, and share your greatest gaming moments.
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.6 }}>
            <Card className="bg-void-800 border-void-700 text-center h-full">
              <CardHeader>
                <div className="mx-auto bg-blood-500/20 text-blood-500 p-4 rounded-full w-fit">
                  <Globe className="h-10 w-10" />
                </div>
                <CardTitle className="font-orbitron text-2xl mt-4">Global & Accessible</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-400">
                Our mission is to break down barriers. With low fees and a commitment to accessibility, we're building a platform for every gamer, everywhere.
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
      <footer className="bg-void-900 py-6 text-center text-gray-500">
        <p>Built with ❤️ at Cloudflare</p>
      </footer>
    </div>
  );
}