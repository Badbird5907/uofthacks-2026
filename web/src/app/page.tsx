import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Briefcase,
  Target,
  Video,
  Zap,
  ArrowRight,
  CheckCircle2,
  Users,
  TrendingUp,
  Building2,
} from "lucide-react";
import { getSession } from "@/server/better-auth/server";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await getSession();
  if (session) {
    redirect("/app");
  }
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-muted-foreground/30">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black tracking-tighter">
            WAVELENGTH
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
              How it Works
            </Link>
            <Link href="#companies" className="text-sm font-medium hover:text-primary transition-colors">
              Companies
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="border-b border-muted-foreground/30">
        <div className="container mx-auto px-6 py-24 md:py-32">
          <div className="max-w-4xl">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-6">
              LAND YOUR
              <br />
              <span className="text-primary">DREAM JOB</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10">
              Prepare smarter. Interview better. Get hired faster. Wavelength connects 
              you with top companies and gives you the tools to ace every interview.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="shadow-[4px_4px_0_0_hsl(var(--muted-foreground)/0.5)] hover:shadow-[2px_2px_0_0_hsl(var(--muted-foreground)/0.5)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                Start Preparing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-b border-muted-foreground/30 bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-black">50K+</div>
              <div className="text-sm opacity-80">Active Candidates</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-black">2,500+</div>
              <div className="text-sm opacity-80">Companies Hiring</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-black">89%</div>
              <div className="text-sm opacity-80">Interview Success</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-black">14 Days</div>
              <div className="text-sm opacity-80">Avg. Time to Hire</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-b border-muted-foreground/30">
        <div className="container mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
              EVERYTHING YOU NEED
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From interview prep to landing offers, we've got you covered at every step.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-2 border-muted-foreground/40 shadow-[6px_6px_0_0_hsl(var(--muted-foreground)/0.3)] hover:shadow-[3px_3px_0_0_hsl(var(--muted-foreground)/0.3)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-primary flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg font-bold">AI Interview Prep</CardTitle>
                <CardDescription>
                  Practice with our AI-powered mock interviews tailored to your target role and company.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-muted-foreground/40 shadow-[6px_6px_0_0_hsl(var(--muted-foreground)/0.3)] hover:shadow-[3px_3px_0_0_hsl(var(--muted-foreground)/0.3)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-primary flex items-center justify-center mb-4">
                  <Briefcase className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg font-bold">Smart Job Matching</CardTitle>
                <CardDescription>
                  Our algorithm matches you with roles that fit your skills, experience, and career goals.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-muted-foreground/40 shadow-[6px_6px_0_0_hsl(var(--muted-foreground)/0.3)] hover:shadow-[3px_3px_0_0_hsl(var(--muted-foreground)/0.3)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-primary flex items-center justify-center mb-4">
                  <Video className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg font-bold">Video Interviews</CardTitle>
                <CardDescription>
                  Seamless video interview platform with recording, playback, and feedback tools.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-muted-foreground/40 shadow-[6px_6px_0_0_hsl(var(--muted-foreground)/0.3)] hover:shadow-[3px_3px_0_0_hsl(var(--muted-foreground)/0.3)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-primary flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg font-bold">Instant Feedback</CardTitle>
                <CardDescription>
                  Get real-time feedback on your answers, body language, and presentation skills.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-muted-foreground/40 shadow-[6px_6px_0_0_hsl(var(--muted-foreground)/0.3)] hover:shadow-[3px_3px_0_0_hsl(var(--muted-foreground)/0.3)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-primary flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg font-bold">Progress Tracking</CardTitle>
                <CardDescription>
                  Track your improvement over time with detailed analytics and performance metrics.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-muted-foreground/40 shadow-[6px_6px_0_0_hsl(var(--muted-foreground)/0.3)] hover:shadow-[3px_3px_0_0_hsl(var(--muted-foreground)/0.3)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-primary flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg font-bold">Community Support</CardTitle>
                <CardDescription>
                  Connect with other job seekers, share tips, and learn from success stories.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="border-b border-muted-foreground/30 bg-card">
        <div className="container mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Process</Badge>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
              HOW IT WORKS
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to your next career opportunity.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="w-16 h-16 bg-muted-foreground/20 text-foreground flex items-center justify-center text-3xl font-black mb-6">
                01
              </div>
              <h3 className="text-xl font-bold mb-3">Create Your Profile</h3>
              <p className="text-muted-foreground">
                Build your candidate profile with your experience, skills, and career preferences. Our AI helps optimize it for visibility.
              </p>
            </div>

            <div className="relative">
              <div className="w-16 h-16 bg-muted-foreground/20 text-foreground flex items-center justify-center text-3xl font-black mb-6">
                02
              </div>
              <h3 className="text-xl font-bold mb-3">Prepare & Practice</h3>
              <p className="text-muted-foreground">
                Use our AI interview coach to practice common questions, get feedback, and build confidence before the real thing.
              </p>
            </div>

            <div className="relative">
              <div className="w-16 h-16 bg-muted-foreground/20 text-foreground flex items-center justify-center text-3xl font-black mb-6">
                03
              </div>
              <h3 className="text-xl font-bold mb-3">Interview & Get Hired</h3>
              <p className="text-muted-foreground">
                Apply to matched positions, ace your interviews with our platform, and land your dream job faster than ever.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Companies Section */}
      <section id="companies" className="border-b border-muted-foreground/30">
        <div className="container mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Partners</Badge>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
              TOP COMPANIES HIRING
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join candidates who've landed roles at leading tech companies.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {["TechCorp", "StartupXYZ", "MegaSoft", "DataFlow", "CloudBase", "AILabs"].map((company) => (
              <div 
                key={company} 
                className="border border-muted-foreground/30 p-6 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <span className="font-bold text-sm">{company}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="border-b border-muted-foreground/30 bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="text-6xl font-black mb-8">"</div>
            <blockquote className="text-2xl md:text-3xl font-bold mb-8">
              Wavelength helped me prepare for interviews like nothing else. I went from nervous wreck to confident candidate in just 2 weeks.
            </blockquote>
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 bg-primary-foreground/20 flex items-center justify-center font-bold">
                SK
              </div>
              <div className="text-left">
                <div className="font-bold">Sarah Kim</div>
                <div className="text-sm opacity-80">Software Engineer at TechCorp</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-b border-muted-foreground/30">
        <div className="container mx-auto px-6 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">
              READY TO GET STARTED?
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Join thousands of candidates who've already transformed their job search with Wavelength.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <Input 
                placeholder="Enter your email" 
                className="border-muted-foreground/50 h-12 text-base"
              />
              <Button size="lg" className="shadow-[4px_4px_0_0_hsl(var(--muted-foreground)/0.5)] hover:shadow-[2px_2px_0_0_hsl(var(--muted-foreground)/0.5)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all whitespace-nowrap">
                Join Waitlist
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Free to get started. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Features List */}
      <section className="border-b border-muted-foreground/30 bg-card">
        <div className="container mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              "Unlimited mock interviews",
              "AI-powered feedback",
              "Company-specific prep",
              "Resume optimization",
              "Salary negotiation tips",
              "Interview scheduling",
              "Progress analytics",
              "Community access",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-muted-foreground/30">
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="text-2xl font-black tracking-tighter mb-4">WAVELENGTH</div>
              <p className="text-sm text-muted-foreground">
                The modern way to prepare for, find, and land your dream job.
              </p>
            </div>
            <div>
              <div className="font-bold mb-4">Product</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Companies</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Resources</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-bold mb-4">Company</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-bold mb-4">Legal</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">Privacy</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Terms</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-muted-foreground/30 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              2026 Wavelength. All rights reserved.
            </div>
            <div className="flex gap-6">
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Twitter</Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">LinkedIn</Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">GitHub</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
