'use client';

import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronRight, Phone, Mail, MessageSquare, Calendar, BarChart3, Star, CheckCircle, Zap, Brain, Bot, Users, TrendingUp, ArrowRight, Menu, X, Headphones, Smartphone } from 'lucide-react';

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    business: '',
    message: ''
  });

  // Redirect signed-in users to dashboard
  useEffect(() => {
    if (isLoaded && user) {
      router.push('/dashboard');
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('[id]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Show loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = 'Sending... <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>';
    submitButton.disabled = true;

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        // Success - show success message
        alert('🎉 Thank you! We\'ve sent you a confirmation email and will be in touch within 24 hours to discuss how AI can transform your business!');
        
        // Clear form
        setFormData({ name: '', email: '', phone: '', business: '', message: '' });
      } else {
        // Error from API
        alert('❌ ' + (result.error || 'Something went wrong. Please try again or email us directly.'));
      }
    } catch (error) {
      // Network or other error
      console.error('Form submission error:', error);
      alert('❌ Unable to send message. Please check your internet connection and try again.');
    } finally {
      // Reset button state
      submitButton.innerHTML = originalText;
      submitButton.disabled = false;
    }
  };

  const features = [
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "AI Chat Bot",
      description: "24/7 intelligent customer service that handles inquiries, bookings, and support automatically."
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: "AI SMS Assistant",
      description: "Smart text messaging that follows up with leads, sends reminders, and nurtures customers."
    },
    {
      icon: <Headphones className="w-8 h-8" />,
      title: "AI Voice Representative",
      description: "Human-like phone conversations for appointments, sales calls, and customer support."
    },
    {
      icon: <Mail className="w-8 h-8" />,
      title: "AI Email Automation",
      description: "Intelligent email responses, follow-ups, and personalized marketing campaigns."
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: "Smart Scheduling",
      description: "Integrated calendar system with AI-powered appointment booking and management."
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Business Dashboard",
      description: "Real-time analytics, customer insights, and performance tracking in one place."
    }
  ];

  const industries = [
    "Healthcare", "Legal Services", "Real Estate", "Restaurants", "Fitness", "Beauty/Spa",
    "Automotive", "Financial Services", "Education", "E-commerce", "Consulting", "Construction"
  ];

  const testimonials = [
    {
      name: "Dr. Sarah Martinez",
      role: "Medical Practice Owner",
      content: "Cut our admin work by 80%! The AI handles appointments, reminders, and patient inquiries flawlessly.",
      rating: 5,
      industry: "Healthcare"
    },
    {
      name: "Mike Thompson",
      role: "Restaurant Owner",
      content: "Our AI takes reservations, answers menu questions, and handles delivery orders. Revenue up 35%!",
      rating: 5,
      industry: "Food Service"
    },
    {
      name: "Lisa Chen",
      role: "Fitness Studio Owner",
      content: "The AI voice calls remind clients about classes and follows up on memberships. Game changer!",
      rating: 5,
      industry: "Fitness"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
      {/* Show landing page for non-signed-in users */}
      <SignedOut>
        {/* Navigation */}
        <nav className="fixed top-0 w-full bg-black/20 backdrop-blur-md z-50 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-bold text-xl">BizzyBot AI</span>
              </div>
              
              <div className="hidden md:flex items-center space-x-8">
                <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
                <a href="#industries" className="text-gray-300 hover:text-white transition-colors">Industries</a>
                <a href="#testimonials" className="text-gray-300 hover:text-white transition-colors">Success Stories</a>
                <a href="#contact" className="text-gray-300 hover:text-white transition-colors">Contact</a>
                <a href="/amanda" className="text-gray-300 hover:text-white transition-colors">Demo</a>
                <SignInButton mode="modal">
                  <button className="text-gray-300 hover:text-white transition-colors font-medium">
                    Sign In
                  </button>
                </SignInButton>
                <SignInButton mode="modal">
                  <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105">
                    Start Free Trial
                  </button>
                </SignInButton>
              </div>

              <button 
                className="md:hidden text-white"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden bg-black/90 backdrop-blur-md">
              <div className="px-6 py-4 space-y-4">
                <a href="#features" className="block text-gray-300 hover:text-white">Features</a>
                <a href="#industries" className="block text-gray-300 hover:text-white">Industries</a>
                <a href="#testimonials" className="block text-gray-300 hover:text-white">Success Stories</a>
                <a href="#contact" className="block text-gray-300 hover:text-white">Contact</a>
                <a href="/amanda" className="block text-gray-300 hover:text-white">Demo</a>
                <SignInButton mode="modal">
                  <button className="block text-gray-300 hover:text-white font-medium w-full text-left">Sign In</button>
                </SignInButton>
                <SignInButton mode="modal">
                  <button className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-full text-center">
                    Start Free Trial
                  </button>
                </SignInButton>
              </div>
            </div>
          )}
        </nav>

        {/* Hero Section */}
        <section id="hero" className="pt-32 pb-20 px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <div className={`transition-all duration-1000 ${isVisible.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-2 mb-6 border border-white/20">
                  <Zap className="w-4 h-4 text-yellow-400 mr-2" />
                  <span className="text-white text-sm font-medium">AI Business Automation Platform</span>
                </div>
                
                <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                  Your Business,
                  <br />
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Powered by AI</span>
                </h1>
                
                <p className="text-xl lg:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto">
                  Create your AI-powered business website with <strong>enhanced lead scoring</strong>, automated conversations, and real-time SMS alerts in minutes.
                </p>

                {/* Feature Pills */}
                <div className="flex flex-wrap justify-center gap-3 mb-8">
                  {["AI Chat Bot", "AI SMS", "AI Voice Calls", "AI Email", "Smart Calendar", "Analytics Dashboard"].map((feature, index) => (
                    <div key={index} className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                      <span className="text-white text-sm font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <SignInButton mode="modal">
                    <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-2xl shadow-blue-500/25">
                      Start Free Trial
                      <ArrowRight className="w-5 h-5 ml-2 inline" />
                    </button>
                  </SignInButton>
                  <a href="/amanda" className="border border-white/30 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white/10 transition-all backdrop-blur-sm">
                    View Demo
                  </a>
                </div>
                
                <p className="text-gray-400 text-sm mt-4">
                  No credit card required • 14-day free trial • Cancel anytime
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-6 lg:px-8 bg-black/20">
          <div className="max-w-7xl mx-auto">
            <div className={`text-center mb-16 transition-all duration-1000 ${isVisible.features ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                Complete AI Business Suite
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Everything your business needs to automate customer interactions and boost productivity, all powered by advanced AI.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className={`bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-500 hover:transform hover:scale-105 ${
                    isVisible.features ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6 text-white">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
                  <p className="text-gray-300">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* What You Get Section */}
            <div className="mt-16 bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">What You Get:</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center text-gray-300">
                    <CheckCircle className="text-green-500 mr-3 w-5 h-5" />
                    AI-powered customer chat with lead scoring
                  </div>
                  <div className="flex items-center text-gray-300">
                    <CheckCircle className="text-green-500 mr-3 w-5 h-5" />
                    Professional business website
                  </div>
                  <div className="flex items-center text-gray-300">
                    <CheckCircle className="text-green-500 mr-3 w-5 h-5" />
                    Real-time SMS notifications
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center text-gray-300">
                    <CheckCircle className="text-green-500 mr-3 w-5 h-5" />
                    Google Sheets & Calendly integration
                  </div>
                  <div className="flex items-center text-gray-300">
                    <CheckCircle className="text-green-500 mr-3 w-5 h-5" />
                    24/7 AI customer support
                  </div>
                  <div className="flex items-center text-gray-300">
                    <CheckCircle className="text-green-500 mr-3 w-5 h-5" />
                    Advanced analytics dashboard
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Industries Section */}
        <section id="industries" className="py-20 px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className={`text-center mb-16 transition-all duration-1000 ${isVisible.industries ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                Built for Every Industry
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Our AI adapts to any business type, from healthcare to hospitality, legal to logistics.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {industries.map((industry, index) => (
                <div 
                  key={index}
                  className={`bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-white/10 text-center hover:bg-white/10 transition-all duration-300 ${
                    isVisible.industries ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  <span className="text-white font-medium">{industry}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="py-20 px-6 lg:px-8 bg-black/20">
          <div className="max-w-7xl mx-auto">
            <div className={`text-center mb-16 transition-all duration-1000 ${isVisible.testimonials ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                Success Stories
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                See how businesses across industries are transforming with AI automation.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div 
                  key={index}
                  className={`bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 transition-all duration-1000 ${
                    isVisible.testimonials ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${index * 200}ms` }}
                >
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-6 text-lg italic">"{testimonial.content}"</p>
                  <div>
                    <div className="text-white font-semibold">{testimonial.name}</div>
                    <div className="text-gray-400">{testimonial.role}</div>
                    <div className="text-blue-400 text-sm mt-1">{testimonial.industry}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-20 px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className={`text-center mb-12 transition-all duration-1000 ${isVisible.contact ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                Ready to Transform Your Business?
              </h2>
              <p className="text-xl text-gray-300">
                Get started with AI automation today. Free trial, no commitment required.
              </p>
            </div>

            <div className={`bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 transition-all duration-1000 ${isVisible.contact ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white font-medium mb-2">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-white font-medium mb-2">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="john@company.com"
                    />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white font-medium mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-white font-medium mb-2">Business Type</label>
                    <input
                      type="text"
                      value={formData.business}
                      onChange={(e) => setFormData({...formData, business: e.target.value})}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Healthcare, Legal, Restaurant, etc."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Tell us about your business needs</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    rows={4}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="What challenges are you facing? How many customers do you serve daily?"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105"
                  >
                    Send Message
                    <Mail className="w-5 h-5 ml-2 inline" />
                  </button>
                  <SignInButton mode="modal">
                    <button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-lg text-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 text-center">
                      Start Free Trial
                      <ArrowRight className="w-5 h-5 ml-2 inline" />
                    </button>
                  </SignInButton>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 lg:px-8 border-t border-white/10">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-bold text-xl">BizzyBot AI</span>
              </div>
              <div className="flex space-x-6 text-gray-400 text-center">
                <a href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </a>
                <span className="text-gray-600">•</span>
                <a href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </a>
              </div>
            </div>
            <div className="text-center mt-6 text-gray-400">
              <p>&copy; 2025 AI Business Automation Platform. Transform your business today.</p>
            </div>
          </div>
        </footer>
      </SignedOut>

      {/* Show redirect message for signed-in users */}
      <SignedIn>
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md mx-auto">
            <div className="mb-6">
              <UserButton />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome back!
            </h2>
            <p className="text-gray-600 mb-6">
              Redirecting you to your dashboard...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </SignedIn>
    </div>
  );
}
