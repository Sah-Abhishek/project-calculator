import React from 'react';
import { useState, useMemo, useEffect } from 'react';
import PageHeader from '../components/PageHeader';

// This component now uses live API calls.
const apiBaseUrl = import.meta.env.VITE_BACKEND_URL;

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [allResources, setAllResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: 'all' });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isPdfLibReady, setIsPdfLibReady] = useState(false); // New state to track library loading

  // --- SCRIPT LOADER ---
  // Loads jspdf and jspdf-autotable for PDF generation using Promises for reliability
  useEffect(() => {
    const loadPdfScripts = () => {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.jspdf && typeof new window.jspdf.jsPDF().autoTable === 'function') {
          resolve();
          return;
        }

        const loadScript = (src) => {
          return new Promise((scriptResolve, scriptReject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
              scriptResolve();
              return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => scriptResolve();
            script.onerror = () => scriptReject(new Error(`Failed to load script: ${src}`));
            document.body.appendChild(script);
          });
        };

        // Load jspdf first, then autotable sequentially
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
          .then(() => loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js')) // CORRECTED URL
          .then(() => resolve())
          .catch(error => reject(error));
      });
    };

    loadPdfScripts()
      .then(() => {
        setIsPdfLibReady(true);
      })
      .catch(error => {
        console.error("Failed to load PDF libraries:", error);
        // Optionally show a toast to the user here
      });
  }, []); // Run only once on mount

  // --- LIVE API CALLS ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch invoices, projects, and resources from the API
        const [invoiceRes, projectRes, resourceRes] = await Promise.all([
          fetch(`${apiBaseUrl}/invoices`), // Replaced mock data with API call
          fetch(`${apiBaseUrl}/project/project-subproject`),
          fetch(`${apiBaseUrl}/resource`)
        ]);

        if (!invoiceRes.ok) throw new Error('Failed to fetch invoices.');
        if (!projectRes.ok) throw new Error('Failed to fetch project data.');
        if (!resourceRes.ok) throw new Error('Failed to fetch resource data.');

        const invoiceData = await invoiceRes.json();
        const projectData = await projectRes.json();
        const resourceData = await resourceRes.json();

        setInvoices(invoiceData);
        setAllProjects(projectData);
        setAllResources(resourceData);

      } catch (error) {
        console.error("Error fetching data:", error);
        // Optionally, add a toast notification for the user
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- DATA PROCESSING & FILTERING ---
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter(invoice => {
        const searchLower = filters.search.toLowerCase();
        return invoice.invoice_number.toLowerCase().includes(searchLower);
      })
      .filter(invoice => {
        if (filters.status === 'all') return true;
        return invoice.status === filters.status;
      });
  }, [invoices, filters]);

  const getLookups = (invoice) => {
    const flatSubprojects = allProjects.flatMap(p =>
      (p.subprojects || []).map(sp => ({ ...sp, parentProjectName: p.name, parentProjectId: p._id }))
    );

    return invoice.billing_records.map(record => {
      const resource = allResources.find(r => r._id === record.resource_id);
      const subproject = flatSubprojects.find(sp => sp._id === record.subproject_id);
      return {
        ...record,
        resourceName: resource?.name || 'N/A',
        projectName: subproject?.parentProjectName || 'N/A',
        subprojectName: subproject?.name || 'N/A'
      };
    });
  };

  // --- UI HELPER & PDF FUNCTIONS ---
  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  const formatDate = (dateString) => new Date(dateString).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleDownloadPdf = () => {
    // The button is disabled if not ready, but we keep this as a safeguard.
    if (!isPdfLibReady || !selectedInvoice) {
      console.error("PDF generation library not ready or no invoice selected.");
      alert("PDF generation is not ready. Please wait a moment and try again.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text(`Invoice: ${selectedInvoice.invoice_number}`, 14, 22);

    const firstRecord = selectedInvoice.billing_records[0];
    if (firstRecord) {
      const monthYear = `${new Date(0, firstRecord.month - 1).toLocaleString('default', { month: 'long' })} ${firstRecord.year}`;
      doc.setFontSize(12);
      doc.text(`For Period: ${monthYear}`, 14, 30);
    }
    doc.setFontSize(10);
    doc.text(`Date Generated: ${formatDate(selectedInvoice.createdAt)}`, 14, 36);

    // Table
    const tableData = getLookups(selectedInvoice);
    const head = [['Project', 'Sub-Project', 'Resource', 'Hours', 'Rate', 'Total', 'Status']];
    const body = tableData.map(row => [
      row.projectName,
      row.subprojectName,
      row.resourceName,
      row.hours,
      formatCurrency(row.rate),
      formatCurrency(row.hours * row.rate),
      row.billable_status
    ]);

    doc.autoTable({ startY: 45, head: head, body: body });

    // Summary
    const finalY = doc.autoTable.previous.finalY;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Amount: ${formatCurrency(selectedInvoice.total_amount)}`, 14, finalY + 15);

    // Save
    doc.save(`Invoice-${selectedInvoice.invoice_number}.pdf`);
  };

  // --- RENDER ---
  return (

    <div>
      <div>
        <PageHeader heading="Invoices Dashboard" subHeading="Invoices of Projects" />
      </div>
      <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 font-sans">
        <div className="max-w-7xl mx-auto">

          {/* Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700">Search by Invoice #</label>
                <input
                  type="text"
                  name="search"
                  id="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="e.g., INV-2025-10-001"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              {/* <div className="sm:col-span-1"> */}
              {/*   <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label> */}
              {/*   <select */}
              {/*     id="status" */}
              {/*     name="status" */}
              {/*     value={filters.status} */}
              {/*     onChange={handleFilterChange} */}
              {/*     className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md" */}
              {/*   > */}
              {/*     <option value="all">All Statuses</option> */}
              {/*     <option value="draft">Draft</option> */}
              {/*     <option value="paid">Paid</option> */}
              {/*     <option value="void">Void</option> */}
              {/*   </select> */}
              {/* </div> */}
            </div>
          </div>

          {/* Invoice Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Invoice #', 'Amount', 'Billable Amount', 'Non-Billable Amount', 'Items', 'Created'].map(header => (
                      <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr><td colSpan="6" className="text-center py-10">Loading invoices...</td></tr>
                  ) : filteredInvoices.map(invoice => (
                    <tr key={invoice._id} onClick={() => setSelectedInvoice(invoice)} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{invoice.invoice_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(invoice.total_amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700">{formatCurrency(invoice.total_billable_amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-700">{formatCurrency(invoice.total_non_billable_amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.billing_records.length}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(invoice.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal for Billing Details */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Invoice {selectedInvoice.invoice_number}</h2>
                    <p className="text-sm text-gray-500">Total: {formatCurrency(selectedInvoice.total_amount)}</p>
                  </div>
                  <button onClick={() => setSelectedInvoice(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                </div>
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
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.projectName}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.subprojectName}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800">{record.resourceName}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.hours}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatCurrency(record.rate)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-800">{formatCurrency(record.hours * record.rate)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.billable_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end items-center space-x-3">
                <button onClick={handleDownloadPdf} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed" disabled={!isPdfLibReady}>
                  {!isPdfLibReady ? (
                    <span>Loading Libs...</span>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      <span>Download PDF</span>
                    </>
                  )}
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Invoices;
