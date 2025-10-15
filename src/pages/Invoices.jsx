import React, { useState, useMemo, useEffect } from 'react';

const apiBaseUrl = import.meta.env.VITE_BACKEND_URL;

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // UPDATED: Initial state for new filters
  const [filters, setFilters] = useState({
    search: '',
    billingMonth: 'all',
    projectName: '',
    subprojectName: ''
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isPdfLibReady, setIsPdfLibReady] = useState(false);

  // --- LOAD PDF LIBRARIES ---
  useEffect(() => {
    const loadPdfScripts = async () => {
      const loadScript = (src) => new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.body.appendChild(script);
      });

      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
        setIsPdfLibReady(true);
      } catch (err) {
        console.error('Failed to load PDF libraries:', err);
      }
    };

    loadPdfScripts();
  }, []);

  // --- FETCH INVOICES ONLY ---
  useEffect(() => {
    const fetchInvoices = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${apiBaseUrl}/invoices`);
        if (!res.ok) throw new Error('Failed to fetch invoices');
        const data = await res.json();
        setInvoices(data);
      } catch (err) {
        console.error('Error fetching invoices:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  // --- DIRECT LOOKUPS (NO EXTERNAL DATA) ---
  const getLookups = (invoice) => {
    return invoice.billing_records.map(record => ({
      ...record,
      projectName: record.project_name || record.project_id?.name || 'N/A',
      subprojectName: record.subproject_name || record.subproject_id?.name || 'N/A',
      resourceName: record.resource_name || record.resource_id?.name || 'N/A'
    }));
  };

  // --- GENERATE UNIQUE MONTH/YEAR FOR DROPDOWN ---
  const uniqueBillingPeriods = useMemo(() => {
    const periods = new Set();
    invoices.forEach(invoice => {
      const firstRecord = invoice.billing_records?.[0];
      if (firstRecord && firstRecord.month && firstRecord.year) {
        const monthName = new Date(0, firstRecord.month - 1).toLocaleString('default', { month: 'long' });
        periods.add(`${monthName} ${firstRecord.year}`);
      }
    });

    // Convert set to array and sort by date (newest first)
    return ['all', ...Array.from(periods).sort((a, b) => {
      const [monthA, yearA] = a.split(' ');
      const [monthB, yearB] = b.split(' ');
      // Use Date object for accurate month/year sorting
      const dateA = new Date(yearA, new Date(Date.parse(monthA + " 1, 2020")).getMonth());
      const dateB = new Date(yearB, new Date(Date.parse(monthB + " 1, 2020")).getMonth());
      return dateB - dateA; // Descending order (newest first)
    })];
  }, [invoices]);


  // --- FILTERED INVOICES ---
  const filteredInvoices = useMemo(() => {
    const searchLower = filters.search.toLowerCase();
    const monthFilter = filters.billingMonth;
    const projectFilterLower = filters.projectName.toLowerCase();
    const subprojectFilterLower = filters.subprojectName.toLowerCase();

    return invoices.filter(inv => {
      // 1. Invoice Number Search
      if (!inv.invoice_number.toLowerCase().includes(searchLower)) {
        return false;
      }

      // 2. Billing Month Filter
      if (monthFilter !== 'all') {
        const firstRecord = inv.billing_records?.[0];
        if (!firstRecord) return false;

        const monthName = new Date(0, firstRecord.month - 1).toLocaleString('default', { month: 'long' });
        const invoicePeriod = `${monthName} ${firstRecord.year}`;
        if (invoicePeriod !== monthFilter) {
          return false;
        }
      }

      // 3 & 4. Project/Subproject Filtering (Check if ANY record matches)
      const records = getLookups(inv);

      // Filter by Project Name
      if (projectFilterLower) {
        const projectMatch = records.some(r => r.projectName.toLowerCase().includes(projectFilterLower));
        if (!projectMatch) return false;
      }

      // Filter by Subproject Name
      if (subprojectFilterLower) {
        const subprojectMatch = records.some(r => r.subprojectName.toLowerCase().includes(subprojectFilterLower));
        if (!subprojectMatch) return false;
      }

      return true;
    });
  }, [invoices, filters]);

  // --- HELPERS ---
  const formatCurrency = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

  const formatDate = (d) =>
    new Date(d).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  // NEW HELPER: Retrieves the billing month/year string for the table display
  const getBillingMonthText = (invoice) => {
    const firstRecord = invoice.billing_records?.[0];
    if (firstRecord && firstRecord.month && firstRecord.year) {
      const monthName = new Date(0, firstRecord.month - 1).toLocaleString('default', { month: 'long' });
      return `${monthName} ${firstRecord.year}`;
    }
    return 'N/A';
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleDownloadPdf = () => {
    // NOTE: alert is used here as a placeholder for a custom UI modal, which is required per instructions.
    if (!isPdfLibReady || !selectedInvoice) return alert("PDF not ready or no invoice selected.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text(`Invoice: ${selectedInvoice.invoice_number}`, 14, 22);

    const first = selectedInvoice.billing_records[0];
    if (first) {
      const period = `${new Date(0, first.month - 1).toLocaleString('default', { month: 'long' })} ${first.year}`;
      doc.setFontSize(12);
      doc.text(`For Period: ${period}`, 14, 30);
    }
    doc.text(`Date Generated: ${formatDate(selectedInvoice.createdAt)}`, 14, 36);

    const rows = getLookups(selectedInvoice);
    const head = [['Project', 'Sub-Project', 'Resource', 'Hours', 'Rate', 'Total', 'Status']];
    const body = rows.map(r => [
      r.projectName,
      r.subprojectName,
      r.resourceName,
      r.hours,
      formatCurrency(r.rate),
      formatCurrency(r.hours * r.rate),
      r.billable_status
    ]);

    doc.autoTable({ startY: 45, head, body });
    const finalY = doc.autoTable.previous.finalY;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Amount: ${formatCurrency(selectedInvoice.total_amount)}`, 14, finalY + 15);

    doc.save(`Invoice-${selectedInvoice.invoice_number}.pdf`);
  };

  // --- RENDER ---
  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Invoice Dashboard</h1>
          <p className="text-gray-600 mt-1">A summary of all generated invoices.</p>
        </header>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
          {/* UPDATED: Grid layout changed to accommodate 4 filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* 1. Search by Invoice # (Kept) */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">Search by Invoice #</label>
              <input
                type="text"
                name="search"
                id="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="e.g., INV-2025-10-001"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* 2. NEW: Billing Month Filter */}
            <div>
              <label htmlFor="billingMonth" className="block text-sm font-medium text-gray-700">Billing Month</label>
              <select
                id="billingMonth"
                name="billingMonth"
                value={filters.billingMonth}
                onChange={handleFilterChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {uniqueBillingPeriods.map(period => (
                  <option key={period} value={period}>
                    {period === 'all' ? 'All Months' : period}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. NEW: Project Name Filter */}
            <div>
              <label htmlFor="projectName" className="block text-sm font-medium text-gray-700">Project Name</label>
              <input
                type="text"
                name="projectName"
                id="projectName"
                value={filters.projectName}
                onChange={handleFilterChange}
                placeholder="e.g., Alpha Project"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* 4. NEW: Subproject Name Filter */}
            <div>
              <label htmlFor="subprojectName" className="block text-sm font-medium text-gray-700">Subproject Name</label>
              <input
                type="text"
                name="subprojectName"
                id="subprojectName"
                value={filters.subprojectName}
                onChange={handleFilterChange}
                placeholder="e.g., Phase 2 Migration"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* REMOVED: Status filter */}
          </div>
        </div>

        {/* Invoice Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* UPDATED HEADER ARRAY */}
                  {['Invoice #', 'Billing Month', 'Amount', 'Billable Amount', 'Non-Billable Amount', 'Items', 'Created'].map(header => (
                    <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr><td colSpan="7" className="text-center py-10">Loading invoices...</td></tr>
                ) : filteredInvoices.map(invoice => (
                  <tr key={invoice._id} onClick={() => setSelectedInvoice(invoice)} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{invoice.invoice_number}</td>

                    {/* NEW BILLING MONTH COLUMN */}
                    <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                      {getBillingMonthText(invoice)}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatCurrency(invoice.total_amount)}</td>
                    <td className="px-6 py-4 text-sm text-green-700">{formatCurrency(invoice.total_billable_amount)}</td>
                    <td className="px-6 py-4 text-sm text-red-700">{formatCurrency(invoice.total_non_billable_amount)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{invoice.billing_records.length}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(invoice.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Invoice {selectedInvoice.invoice_number}</h2>
                <p className="text-sm text-gray-500">Total: {formatCurrency(selectedInvoice.total_amount)}</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <div className="p-6 overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Billing Records ({selectedInvoice.billing_records.length})</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Project', 'Sub-Project', 'Resource', 'Hours', 'Rate', 'Total', 'Status'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getLookups(selectedInvoice).map(record => (
                      <tr key={record._id}>
                        <td className="px-4 py-3 text-sm text-gray-700">{record.projectName}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{record.subprojectName}</td>
                        <td className="px-4 py-3 text-sm text-gray-800">{record.resourceName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{record.hours}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatCurrency(record.rate)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">{formatCurrency(record.hours * record.rate)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{record.billable_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={handleDownloadPdf}
                disabled={!isPdfLibReady}
                className={`px-4 py-2 rounded-lg text-white flex items-center space-x-2 ${isPdfLibReady ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
                  }`}
              >
                <span>{isPdfLibReady ? 'Download PDF' : 'Loading Libs...'}</span>
              </button>
              <button onClick={() => setSelectedInvoice(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
