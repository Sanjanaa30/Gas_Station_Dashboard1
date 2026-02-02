'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { invoicesApi, stationsApi, fuelTypesApi } from '@/lib/api';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import { Plus, Edit2, Trash2, FileText, X, Search, Download, Upload, Paperclip } from 'lucide-react';

interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  supplier_name: string;
  station_id: number;
  station_name: string;
  fuel_type_id: number;
  fuel_type_name: string;
  quantity: string;
  price_per_unit: string;
  total_amount: string;
  notes: string;
  pdf_file_path: string | null;
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

export default function InvoicesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [filterStation, setFilterStation] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [uploadingPdf, setUploadingPdf] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    station_id: '',
    fuel_type_id: '',
    quantity: '',
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
  }, [user, filterStation, searchQuery, startDate, endDate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [invoicesRes, stationsRes, fuelTypesRes] = await Promise.all([
        invoicesApi.getAll({
          station_id: filterStation || undefined,
          search: searchQuery || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
        stationsApi.getAll(),
        fuelTypesApi.getAll(),
      ]);
      setInvoices(invoicesRes.data);
      setStations(stationsRes.data);
      setFuelTypes(fuelTypesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (invoice?: Invoice) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setFormData({
        invoice_number: invoice.invoice_number || '',
        invoice_date: invoice.invoice_date,
        supplier_name: invoice.supplier_name,
        station_id: invoice.station_id.toString(),
        fuel_type_id: invoice.fuel_type_id.toString(),
        quantity: invoice.quantity,
        price_per_unit: invoice.price_per_unit,
        notes: invoice.notes || '',
      });
    } else {
      setEditingInvoice(null);
      setFormData({
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        supplier_name: '',
        station_id: stations[0]?.id.toString() || '',
        fuel_type_id: fuelTypes[0]?.id.toString() || '',
        quantity: '',
        price_per_unit: '',
        notes: '',
      });
    }
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingInvoice(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const payload = {
      invoice_number: formData.invoice_number || null,
      invoice_date: formData.invoice_date,
      supplier_name: formData.supplier_name,
      station_id: parseInt(formData.station_id),
      fuel_type_id: parseInt(formData.fuel_type_id),
      quantity: parseFloat(formData.quantity),
      price_per_unit: parseFloat(formData.price_per_unit),
      notes: formData.notes || null,
    };

    try {
      if (editingInvoice) {
        await invoicesApi.update(editingInvoice.id, payload);
      } else {
        await invoicesApi.create(payload);
      }
      closeModal();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save invoice');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      await invoicesApi.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete invoice');
    }
  };

  const handleExportCsv = () => {
    invoicesApi.exportCsv({
      station_id: filterStation || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    });
  };

  const handlePdfUpload = async (invoiceId: number, file: File) => {
    setUploadingPdf(invoiceId);
    try {
      await invoicesApi.uploadPdf(invoiceId, file);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to upload PDF');
    } finally {
      setUploadingPdf(null);
    }
  };

  const triggerPdfUpload = (invoiceId: number) => {
    setUploadingPdf(invoiceId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingPdf) {
      handlePdfUpload(uploadingPdf, file);
    }
    e.target.value = '';
  };

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
        {/* Hidden file input for PDF upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600">Track fuel purchase invoices</p>
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
              Add Invoice
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoice # or supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
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

        {/* Invoices Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || startDate || endDate
                ? 'Try adjusting your filters'
                : 'Add your first fuel purchase invoice'}
            </p>
            {!searchQuery && !startDate && !endDate && (
              <button onClick={() => openModal()} className="btn-primary">
                Add Invoice
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
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Station</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Supplier</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Fuel</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Qty (gal)</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">PDF</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{formatDate(invoice.invoice_date)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{invoice.invoice_number || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{invoice.station_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{invoice.supplier_name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                          {invoice.fuel_type_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatNumber(invoice.quantity)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-right">${invoice.price_per_unit}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                        {formatCurrency(invoice.total_amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {invoice.pdf_file_path ? (
                          <span className="inline-flex items-center text-green-600" title="PDF attached">
                            <Paperclip className="w-4 h-4" />
                          </span>
                        ) : (
                          <button
                            onClick={() => triggerPdfUpload(invoice.id)}
                            disabled={uploadingPdf === invoice.id}
                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                            title="Upload PDF"
                          >
                            {uploadingPdf === invoice.id ? (
                              <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openModal(invoice)}
                            className="p-1.5 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(invoice.id)}
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
                {editingInvoice ? 'Edit Invoice' : 'Add Invoice'}
              </h2>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Invoice Date *</label>
                  <input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Invoice Number</label>
                  <input
                    type="text"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    className="input"
                    placeholder="e.g., 2071504"
                  />
                </div>
              </div>

              <div>
                <label className="label">Supplier Name *</label>
                <input
                  type="text"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  className="input"
                  placeholder="e.g., P & J Fuel Inc"
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
                  <label className="label">Quantity (Gallons) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="input"
                    placeholder="e.g., 8000"
                    required
                  />
                </div>
                <div>
                  <label className="label">Price per Gallon ($) *</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.price_per_unit}
                    onChange={(e) => setFormData({ ...formData, price_per_unit: e.target.value })}
                    className="input"
                    placeholder="e.g., 3.3310"
                    required
                  />
                </div>
              </div>

              {formData.quantity && formData.price_per_unit && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(parseFloat(formData.quantity) * parseFloat(formData.price_per_unit))}
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
                  {editingInvoice ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
