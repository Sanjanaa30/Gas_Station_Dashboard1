'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Fuel, ArrowRight, BarChart3, FileText, Building2 } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fuel className="w-8 h-8 text-primary-600" />
            <span className="text-2xl font-bold text-gray-900">GasStation</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">
              Login
            </Link>
            <Link href="/register" className="btn-primary">
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Manage Your Gas Stations
          <span className="text-primary-600"> Smarter</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Track invoices, monitor sales, and analyze performance across all your gas stations from one powerful dashboard.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register" className="btn-primary flex items-center gap-2 text-lg px-8 py-3">
            Start Free Trial <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/login" className="btn-secondary text-lg px-8 py-3">
            View Demo
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Everything You Need to Run Your Gas Stations
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time Dashboard</h3>
            <p className="text-gray-600">
              See your sales, purchases, and profits at a glance with beautiful charts and KPIs.
            </p>
          </div>
          <div className="card text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Invoice Management</h3>
            <p className="text-gray-600">
              Track all fuel purchase invoices with supplier details, quantities, and costs.
            </p>
          </div>
          <div className="card text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Multi-Station Support</h3>
            <p className="text-gray-600">
              Manage multiple gas stations from one account with station-wise analytics.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-primary-600 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Streamline Your Operations?
          </h2>
          <p className="text-primary-100 mb-8 max-w-xl mx-auto">
            Join gas station owners who are already saving time and making better decisions.
          </p>
          <Link href="/register" className="inline-flex items-center gap-2 bg-white text-primary-600 font-semibold px-8 py-3 rounded-lg hover:bg-primary-50 transition-colors">
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fuel className="w-6 h-6 text-primary-600" />
            <span className="font-bold text-gray-900">GasStation</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2024 GasStation Dashboard. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
