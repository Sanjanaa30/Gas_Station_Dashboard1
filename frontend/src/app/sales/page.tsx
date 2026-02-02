'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { salesApi, stationsApi, fuelTypesApi } from '@/lib/api';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import { Plus, Edit2, Trash2, TrendingUp, X, Download } from 'lucide-react';

interface Sale {
  id: number;
  sale_date: string;
  station_id: number;
  station_name: string;
  fuel_type_id: number;
  fuel_type_name: string;
  quantity_sold: string;
  price_per_unit: string;
  total_sales: string;
  cost_price: string | null;
  profit_margin: string | null;
  total_profit: string | null;
  notes: string;
  created_at: string;
}

interface Station {
  id: number;
  name: string;
}

interface FuelType {
  id: number;
  name: string;
}

export default function SalesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [filterStation, setFilterStation] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formData, setFormData] = useState({
    sale_date: new Date().toISOString().split('T')[0],
    station_id: '',
    fuel_type_id: '',
    quantity_sold: '',
    price_per_unit: '',
    notes: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, filterStation, startDate, endDate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [salesRes, stationsRes, fuelTypesRes] = await Promise.all([
        salesApi.getAll({
          station_id: filterStation || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
        stationsApi.getAll(),
        fuelTypesApi.getAll(),
      ]);
      setSales(salesRes.data);
      setStations(stationsRes.data);
      setFuelTypes(fuelTypesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (sale?: Sale) => {
    if (sale) {
      setEditingSale(sale);
      setFormData({
        sale_date: sale.sale_date,
        station_id: sale.station_id.toString(),
        fuel_type_id: sale.fuel_type_id.toString(),
        quantity_sold: sale.quantity_sold,
        price_per_unit: sale.price_per_unit,
        notes: sale.notes || '',
      });
    } else {
      setEditingSale(null);
      setFormData({
        sale_date: new Date().toISOString().split('T')[0],
        station_id: stations[0]?.id.toString() || '',
        fuel_type_id: fuelTypes[0]?.id.toString() || '',
        quantity_sold: '',
        price_per_unit: '',
        notes: '',
      });
    }
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSale(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const payload = {
      sale_date: formData.sale_date,
      station_id: parseInt(formData.station_id),
      fuel_type_id: parseInt(formData.fuel_type_id),
      quantity_sold: parseFloat(formData.quantity_sold),
      price_per_unit: parseFloat(formData.price_per_unit),
      notes: formData.notes || null,
    };

    try {
      if (editingSale) {
        await salesApi.update(editingSale.id, payload);
      } else {
        await salesApi.create(payload);
      }
      closeModal();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save sale');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this sale entry?')) return;

    try {
      await salesApi.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete sale');
    }
  };

  const handleExportCsv = () => {
    salesApi.exportCsv({
      station_id: filterStation || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    });
  };

  // Calculate totals
  const totalSales = sales.reduce((sum, s) => sum + parseFloat(s.total_sales || '0'), 0);
  const totalProfit = sales.reduce((sum, s) => sum + parseFloat(s.total_profit || '0'), 0);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
            <p className="text-gray-600">Track daily fuel sales and profit margins</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCsv}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Sale
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={filterStation || ''}
              onChange={(e) => setFilterStation(e.target.value ? parseInt(e.target.value) : null)}
              className="input"
            >
              <option value="">All Stations</option>
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
            <input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </div>
        </div>

        {/* Summary Cards */}
        {sales.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card bg-green-50 border border-green-200">
              <p className="text-sm text-green-700">Total Sales</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(totalSales)}</p>
            </div>
            <div className="card bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-700">Total Profit</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalProfit)}</p>
            </div>
          </div>
        )}

        {/* Sales Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : sales.length === 0 ? (
          <div className="card text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sales found</h3>
            <p className="text-gray-600 mb-4">
              {startDate || endDate ? 'Try adjusting your filters' : 'Add your first daily sales entry'}
            </p>
            {!startDate && !endDate && (
              <button onClick={() => openModal()} className="btn-primary">
                Add Sale
              </button>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Station</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Fuel</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Qty (gal)</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Sell Price</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Cost Price</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Margin</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Total Sales</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Profit</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{formatDate(sale.sale_date)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{sale.station_name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                          {sale.fuel_type_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatNumber(sale.quantity_sold)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-right">${parseFloat(sale.price_per_unit).toFixed(4)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-right">
                        {sale.cost_price ? `$${parseFloat(sale.cost_price).toFixed(4)}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        {sale.profit_margin ? (
                          <span className={parseFloat(sale.profit_margin) >= 0 ? 'text-green-600' : 'text-red-600'}>
                            ${parseFloat(sale.profit_margin).toFixed(4)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-600 text-right">
                        {formatCurrency(sale.total_sales)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-right">
                        {sale.total_profit ? (
                          <span className={parseFloat(sale.total_profit) >= 0 ? 'text-blue-600' : 'text-red-600'}>
                            {formatCurrency(sale.total_profit)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openModal(sale)}
                            className="p-1.5 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(sale.id)}
                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingSale ? 'Edit Sale' : 'Add Sale'}
              </h2>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Sale Date *</label>
                <input
                  type="date"
                  value={formData.sale_date}
                  onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Station *</label>
                  <select
                    value={formData.station_id}
                    onChange={(e) => setFormData({ ...formData, station_id: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Select Station</option>
                    {stations.map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Fuel Type *</label>
                  <select
                    value={formData.fuel_type_id}
                    onChange={(e) => setFormData({ ...formData, fuel_type_id: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Select Fuel</option>
                    {fuelTypes.map((fuel) => (
                      <option key={fuel.id} value={fuel.id}>
                        {fuel.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Quantity Sold (Gallons) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity_sold}
                    onChange={(e) => setFormData({ ...formData, quantity_sold: e.target.value })}
                    className="input"
                    placeholder="e.g., 500"
                    required
                  />
                </div>
                <div>
                  <label className="label">Selling Price per Gallon ($) *</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.price_per_unit}
                    onChange={(e) => setFormData({ ...formData, price_per_unit: e.target.value })}
                    className="input"
                    placeholder="e.g., 3.5990"
                    required
                  />
                </div>
              </div>

              {formData.quantity_sold && formData.price_per_unit && (
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-700">Total Sales</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(parseFloat(formData.quantity_sold) * parseFloat(formData.price_per_unit))}
                  </p>
                </div>
              )}

              <div>
                <label className="label">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={2}
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  {editingSale ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
