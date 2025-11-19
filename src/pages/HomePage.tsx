'use client';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { motion } from "framer-motion";
import { MOCK_GAMES } from "@shared/mock-data";
export function HomePage() {
  const featuredGames = MOCK_GAMES.slice(0, 3);
  return (
    <div className="min-h-screen bg-void-950 text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center text-center">
        <div className="absolute inset-0 bg-gradient-blood opacity-40" />
        <div className="absolute inset-0 bg-black/50" />
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          src="https://cdn.cloudflare.steamstatic.com/apps/dota2/videos/dota_react/homepage/dota_montage_02.mp4"
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="z-10 p-4"
        >
          <h1 className="font-orbitron text-5xl md:text-7xl lg:text-8xl font-black text-white mb-4 tracking-tighter">
            CRIMSON <span className="text-blood-500">GRID</span>
          </h1>
          <p className="text-lg md:text-2xl text-gray-300 max-w-3xl mx-auto mb-8">
            Your ultimate nexus for gaming. Discover, play, and connect. All in one place, without limits.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="bg-blood-500 hover:bg-blood-600 text-white font-bold text-lg px-8 py-6 shadow-blood-glow" asChild>
              <Link to="/register">Join Now</Link>
            </Button>
            <Button size="lg" variant="outline" className="font-bold text-lg px-8 py-6 border-2 border-blood-500 text-blood-500 hover:bg-blood-500 hover:text-white" asChild>
              <Link to="/login">Login</Link>
            </Button>
          </div>
        </motion.div>
      </section>
      {/* Featured Games Carousel */}
      <section className="py-24 bg-void-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-void-800 border-void-700">
              <CardHeader>
                <CardTitle className="text-4xl font-orbitron text-blood-500 text-center">Featured Games</CardTitle>
              </CardHeader>
              <CardContent>
                <Carousel opts={{ loop: true }} className="w-full max-w-5xl mx-auto">
                  <CarouselContent>
                    {featuredGames.map((game) => (
                      <CarouselItem key={game.id}>
                        <Link to={`/game/${game.slug}`}>
                          <div className="aspect-video relative rounded-lg overflow-hidden">
                            <img src={game.bannerImage} alt={game.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                            <h3 className="absolute bottom-4 left-4 font-orbitron text-3xl font-bold">{game.title}</h3>
                          </div>
                        </Link>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-[-50px]" />
                  <CarouselNext className="right-[-50px]" />
                </Carousel>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
      {/* Stats Section */}
      <section className="py-24 bg-void-950 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>
            <h3 className="text-6xl font-orbitron font-black text-blood-500">1,000+</h3>
            <p className="text-xl text-gray-400 mt-2">Games Available</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}>
            <h3 className="text-6xl font-orbitron font-black text-blood-500">50k+</h3>
            <p className="text-xl text-gray-400 mt-2">Active Players</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }}>
            <h3 className="text-6xl font-orbitron font-black text-blood-500">15%</h3>
            <p className="text-xl text-gray-400 mt-2">Lowest Fees</p>
          </motion.div>
        </div>
      </section>
      <footer className="bg-void-900 py-6 text-center text-gray-500">
        <p>Built with ❤️ at Cloudflare</p>
      </footer>
    </div>
  );
}