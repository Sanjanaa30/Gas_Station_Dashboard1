'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { dashboardApi, stationsApi } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Fuel,
  DollarSign,
  Building2,
  ShoppingCart,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardData {
  kpis: {
    total_sales_today: string;
    total_sales_this_month: string;
    total_fuel_purchased_this_month: string;
    total_fuel_sold_this_month: string;
    total_purchase_cost_this_month: string;
    profit_this_month: string;
    station_count: number;
  };
  charts: {
    station_comparison: Array<{
      station_id: number;
      station_name: string;
      total_sales: string;
      total_quantity: string;
    }>;
    sales_trend: Array<{
      date: string;
      total_sales: string;
      total_quantity: string;
    }>;
    fuel_breakdown: Array<{
      fuel_type_id: number;
      fuel_type_name: string;
      quantity_purchased: string;
      quantity_sold: string;
    }>;
  };
}

interface Station {
  id: number;
  name: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedStation]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [dashRes, stationsRes] = await Promise.all([
        dashboardApi.get({ station_id: selectedStation || undefined, days: 30 }),
        stationsApi.getAll(),
      ]);
      setDashboardData(dashRes.data);
      setStations(stationsRes.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const kpis = dashboardData?.kpis;
  const profit = parseFloat(kpis?.profit_this_month || '0');

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user.full_name}</p>
          </div>
          <select
            value={selectedStation || ''}
            onChange={(e) => setSelectedStation(e.target.value ? parseInt(e.target.value) : null)}
            className="input max-w-xs"
          >
            <option value="">All Stations</option>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Today's Sales</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(kpis?.total_sales_today || 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Monthly Sales</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(kpis?.total_sales_this_month || 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Monthly Profit</p>
                    <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(profit)}
                    </p>
                  </div>
                  <div className={`w-12 h-12 ${profit >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-xl flex items-center justify-center`}>
                    {profit >= 0 ? (
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Stations</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {kpis?.station_count || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Fuel className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fuel Purchased</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatNumber(kpis?.total_fuel_purchased_this_month || 0)} gal
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fuel Sold</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatNumber(kpis?.total_fuel_sold_this_month || 0)} gal
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Purchase Cost</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(kpis?.total_purchase_cost_this_month || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Trend */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend (30 Days)</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={dashboardData?.charts.sales_trend.slice(-14).map((d) => ({
                        date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                        sales: parseFloat(d.total_sales),
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), 'Sales']}
                        labelStyle={{ color: '#374151' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="sales"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Station Comparison */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Station Comparison</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dashboardData?.charts.station_comparison.map((s) => ({
                        name: s.station_name,
                        sales: parseFloat(s.total_sales),
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'Sales']} />
                      <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Fuel Breakdown */}
              <div className="card lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Fuel Type Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dashboardData?.charts.fuel_breakdown.map((f, i) => ({
                            name: f.fuel_type_name,
                            value: parseFloat(f.quantity_sold),
                            color: COLORS[i % COLORS.length],
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {dashboardData?.charts.fuel_breakdown.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${formatNumber(value)} L`, 'Sold']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col justify-center space-y-4">
                    {dashboardData?.charts.fuel_breakdown.map((fuel, index) => (
                      <div key={fuel.fuel_type_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium text-gray-900">{fuel.fuel_type_name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatNumber(fuel.quantity_sold)} L sold
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatNumber(fuel.quantity_purchased)} L purchased
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
