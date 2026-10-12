import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, Brain, FileSearch, CalendarCheck, Shield, ArrowRight, Stethoscope, FileText, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";
import Disclaimer from "@/components/Disclaimer";

const features = [
  { icon: Brain, title: "AI Symptom Checker", description: "Get instant preliminary assessments based on your symptoms using advanced AI models." },
  { icon: FileSearch, title: "Report Analyzer", description: "Upload medical reports and receive clear, easy-to-understand summaries and insights." },
  { icon: CalendarCheck, title: "Smart Appointments", description: "Book appointments with specialists matched to your health needs." },
  { icon: Shield, title: "Secure Health Profile", description: "Store your complete medical history securely in one place." },
];

const steps = [
  { num: "01", title: "Register", description: "Create your health profile with medical history", icon: UserPlus },
  { num: "02", title: "Describe Symptoms", description: "Tell our AI about your symptoms and concerns", icon: Stethoscope },
  { num: "03", title: "Get Insights", description: "Receive AI-powered health assessments", icon: Brain },
  { num: "04", title: "Book a Doctor", description: "Connect with the right specialist", icon: CalendarCheck },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="fixed top-0 w-full z-50 bg-card/80 backdrop-blur-md border-b">
        <div className="container mx-auto flex items-center justify-between py-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-xl font-display font-bold">MedAI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a>
            <div className="flex items-center gap-2">
              <Link to="/register?mode=signin"><Button size="sm" variant="outline">Patient Login</Button></Link>
              <Link to="/register"><Button size="sm">Get Started</Button></Link>
            </div>
          </nav>
          <div className="flex md:hidden items-center gap-2">
            <Link to="/register?mode=signin"><Button size="sm" variant="outline">Login</Button></Link>
            <Link to="/register"><Button size="sm">Register</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-15" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <Brain className="h-4 w-4" />
              AI-Powered Healthcare
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tight mb-6 leading-tight">
              Smarter Health <br />
              <span className="gradient-text">Starts Here</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-8">
              Your intelligent healthcare companion. Check symptoms, analyze reports, and connect with doctors — all in one platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  Register Now <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/symptom-checker">
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                  <Stethoscope className="h-4 w-4" /> Check Symptoms
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">Powerful Health Tools</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Everything you need to take control of your health journey, powered by artificial intelligence.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="health-card text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-16 lg:py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">How It Works</h2>
            <p className="text-muted-foreground">Four simple steps to smarter healthcare</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="health-card text-center">
                  <span className="text-4xl font-display font-extrabold text-primary/15">{s.num}</span>
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary my-3">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display font-semibold mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="hero-gradient-bg rounded-2xl p-8 md:p-12 text-center max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-primary-foreground mb-3">
              Ready to Take Control of Your Health?
            </h2>
            <p className="text-primary-foreground/80 mb-6">
              Join thousands using AI for smarter health decisions.
            </p>
            <Link to="/register">
              <Button size="lg" variant="secondary" className="gap-2">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <span className="font-display font-bold">MedAI</span>
            </div>
            <Disclaimer />
            <p className="text-xs text-muted-foreground">© 2024 MedAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
