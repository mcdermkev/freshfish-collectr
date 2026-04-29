import { Button } from "@/components/ui/button";
import { Fish, Waves, Droplets, BarChart3, Shield, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-ocean-900 via-ocean-950 to-background" />
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-ocean-400/10 animate-bubble"
            style={{
              width: `${Math.random() * 16 + 4}px`,
              height: `${Math.random() * 16 + 4}px`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 10 + 8}s`,
              animationDelay: `${Math.random() * 8}s`,
            }}
          />
        ))}
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-500 to-reef flex items-center justify-center shadow-lg shadow-ocean-500/25">
            <Fish className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">AquaCollectr</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login">
            <Button variant="ghost" className="text-ocean-200 hover:text-white hover:bg-white/10">
              Sign In
            </Button>
          </Link>
          <Link href="/auth/signup">
            <Button className="bg-gradient-to-r from-ocean-500 to-reef hover:from-ocean-600 hover:to-reef/90 text-white shadow-lg shadow-ocean-500/25">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center space-y-8 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-ocean-300 text-sm backdrop-blur-sm">
            <Waves className="w-4 h-4" />
            Track • Manage • Thrive
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
            Your Aquarium,{" "}
            <span className="bg-gradient-to-r from-ocean-400 via-aqua-400 to-reef bg-clip-text text-transparent">
              Perfected
            </span>
          </h1>

          <p className="text-lg md:text-xl text-ocean-200/80 max-w-2xl mx-auto leading-relaxed">
            The modern way to track your freshwater tanks, manage livestock, log water parameters, and keep your fish happy. Like Collectr, but for aquariums.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="h-14 px-8 text-lg bg-gradient-to-r from-ocean-500 to-reef hover:from-ocean-600 hover:to-reef/90 text-white shadow-2xl shadow-ocean-500/30 transition-all hover:scale-105"
              >
                Start Collecting
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-24">
          {[
            {
              icon: Droplets,
              title: "Water Logging",
              desc: "Track pH, temperature, ammonia, nitrite & nitrate with beautiful charts over time.",
              color: "from-ocean-500 to-ocean-600",
            },
            {
              icon: Fish,
              title: "Species Database",
              desc: "Browse 80+ freshwater fish, plants & inverts with care info, compatibility data & more.",
              color: "from-aqua-500 to-reef",
            },
            {
              icon: Shield,
              title: "Compatibility Checker",
              desc: "Get instant warnings about aggression mismatches, temperature conflicts & tank size issues.",
              color: "from-coral to-danger",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="group relative p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:-translate-y-1"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}
              >
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-ocean-300/80 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-12 mt-20">
          {[
            { value: "80+", label: "Species in Database" },
            { value: "6", label: "Water Parameters" },
            { value: "∞", label: "Tanks to Track" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-ocean-400 to-reef bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-sm text-ocean-300/60 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
