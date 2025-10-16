import { useState, useEffect, useMemo } from 'react';

// Assume PageHeader is correctly defined or removed if not needed in the single file structure
const PageHeader = ({ heading, subHeading }) => (
  <div className="p-6 bg-white border-b border-gray-200">
    <h1 className="text-3xl font-extrabold text-gray-900">{heading}</h1>
    <p className="text-sm text-gray-500 mt-1">{subHeading}</p>
  </div>
);

// This component now uses API calls instead of initial dummy data.
// FIX: Using http://localhost:8080 as a standard default placeholder for a running API service.
// *** IMPORTANT: Update this string with your actual API base URL. ***
const apiBaseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000/api';

const Costing = () => {
  // State for managing filters, data, and UI
  const [projectsData, setProjectsData] = useState([]);
  const [subprojectsData, setSubprojectsData] = useState([]);
  const [subprojects, setSubprojects] = useState([]);
  const [filters, setFilters] = useState({
    project: '',
    subProject: '',
    month: (new Date().getMonth() + 1).toString(), // Default to current month
    year: new Date().getFullYear().toString()  // Default to current year
  });
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNonBillable, setShowNonBillable] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [invoiceInfo, setInvoiceInfo] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [productivityRatesMap, setProductivityRatesMap] = useState({});
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // --- API & DATA HANDLING ---

  // Function to show a toast message
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  // Effect to fetch projects and subprojects on initial component mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/project`);
        if (!response.ok) throw new Error('Failed to fetch projects');
        const res = await fetch(`${apiBaseUrl}/project/project-subproject`);
        const subdata = await res.json();
        const data = await response.json();
        setProjectsData(data);
        setSubprojects(subdata);
      } catch (error) {
        console.error("Error fetching projects:", error);
        showToast(`Error fetching projects: ${error.message}`, 'error');
      }
    };
    fetchProjects();
  }, []);


  useEffect(() => {
    const { project, subProject, month, year } = filters;

    const fetchBillingData = async () => {
      if (projectsData.length === 0 || subprojects.length === 0) {
        return;
      }

      // Determine which subprojects to load productivity rates for.
      let subprojectIdsToFetchRates = [];
      if (subProject) {
        subprojectIdsToFetchRates = [subProject];
      } else {
        // All projects view: fetch rates for all subprojects
        subprojectIdsToFetchRates = subprojects.flatMap(p => (p.subprojects || []).map(sp => sp._id));
      }

      // Fetch all productivity rates required
      const productivityPromises = subprojectIdsToFetchRates.map(spId =>
        fetch(`${apiBaseUrl}/productivity?subproject_id=${spId}`).then(res => res.ok ? res.json() : [])
      );
      const allProductivityRatesNested = await Promise.all(productivityPromises);
      const ratesMap = subprojectIdsToFetchRates.reduce((acc, spId, index) => {
        acc[spId] = allProductivityRatesNested[index];
        return acc;
      }, {});
      setProductivityRatesMap(ratesMap);

      const allSubprojectsFlat = subprojects.flatMap(p => p.subprojects || []);

      if (!project) {
        // --- ALL PROJECTS VIEW (Combined Active Assignments + Monthly Records) ---
        setIsLoading(true);
        setIsDataLoaded(false);
        setInvoiceInfo(null);
        setResources([]);
        try {
          // Fetch ALL resources
          const resourcesRes = await fetch(`${apiBaseUrl}/resource`);
          if (!resourcesRes.ok) throw new Error('Could not fetch resources.');
          const allResources = await resourcesRes.json();
          const allResourcesMap = new Map(allResources.map(r => [r._id, r])); // Map for quick lookup

          // Fetch ALL billing records for the CURRENT month/year AND records with NULL month
          const currentMonthBillingRes = await fetch(`${apiBaseUrl}/billing?month=${month}&year=${year}`);
          if (!currentMonthBillingRes.ok) throw new Error('Could not fetch current month billing records.');
          const currentMonthBillingRecords = await currentMonthBillingRes.json();

          const nullMonthBillingRes = await fetch(`${apiBaseUrl}/billing?month=null`);
          if (!nullMonthBillingRes.ok) throw new Error('Could not fetch initial billing records.');
          const nullMonthBillingRecords = await nullMonthBillingRes.json();

          // Combine monthly records and initial (null month) records, prioritizing monthly records
          const billingRecordsMap = new Map();

          // 1. Add current month records (highest priority)
          currentMonthBillingRecords.forEach(billing => {
            const key = `${billing.subproject_id?._id || billing.subproject_id}-${billing.resource_id}`;
            billingRecordsMap.set(key, billing);
          });

          // 2. Add null month records if no monthly record exists yet for that subproject/resource
          nullMonthBillingRecords.forEach(billing => {
            const key = `${billing.subproject_id?._id || billing.subproject_id}-${billing.resource_id}`;
            if (!billingRecordsMap.has(key)) {
              billingRecordsMap.set(key, billing);
            }
          });

          const finalDataMap = new Map();

          // Pass 1: Active Assignments (Current Resources)
          // Only iterates over EXISTING resources
          allResources.forEach(resource => {
            (resource.assigned_subprojects || []).forEach(assignedSubproject => {
              let projectInfo, subProjectInfo;
              for (const p of subprojects) {
                const sp = (p.subprojects || []).find(s => s._id === assignedSubproject._id);
                if (sp) { projectInfo = p; subProjectInfo = sp; break; }
              }
              if (!projectInfo || !subProjectInfo) return;

              const subprojectId = subProjectInfo._id;
              const uniqueKey = `${subprojectId}-${resource._id}`;

              const billing = billingRecordsMap.get(uniqueKey);
              const ratesForSubproject = ratesMap[subprojectId] || [];

              let rowData;
              const defaultProductivity = 'Medium';
              const rateRecord = ratesForSubproject.find(r => r.level.toLowerCase() === defaultProductivity.toLowerCase());

              if (billing) {
                rowData = {
                  ...resource,
                  billingId: billing._id,
                  hours: billing.hours,
                  rate: billing.rate,
                  flatrate: billing.flatrate || resource.flatrate || 0,
                  productivity: billing.productivity_level,
                  description: billing.description || '',
                  isBillable: billing.billable_status === 'Billable'
                };
              } else {
                rowData = {
                  ...resource,
                  billingId: null,
                  hours: 0,
                  rate: rateRecord?.base_rate ?? 0,
                  flatrate: resource.flatrate || 0,
                  productivity: defaultProductivity,
                  description: '',
                  isBillable: true
                };
              }

              finalDataMap.set(uniqueKey, {
                ...rowData,
                uniqueId: `${projectInfo._id}-${subprojectId}-${resource._id}`,
                projectName: projectInfo.name,
                subProjectName: subProjectInfo.name,
                projectId: projectInfo._id,
                subprojectId: subprojectId,
                isEditable: true
              });
            });
          });

          // Pass 2: Historical/Orphaned Records (Handles Unassigned Existing and Deleted Resources)
          // We iterate over the combined map to catch all records not covered in Pass 1.
          billingRecordsMap.forEach(billing => {
            const subprojectId = billing.subproject_id?._id || billing.subproject_id;
            const uniqueKey = `${subprojectId}-${billing.resource_id}`;

            // 1. Skip if already handled by an active assignment (Pass 1)
            if (finalDataMap.has(uniqueKey)) return;

            // 2. Only show records that were explicitly billed (month != null).
            // This filters out auto-generated placeholders (month == null) for all unassigned/deleted resources.
            if (billing.month === null) return;

            // 3. Find resource info
            const resourceInfo = allResourcesMap.get(billing.resource_id);

            // Fetch Project/Subproject info (required for display regardless of resource status)
            let projectInfo = subprojects.find(p => (p.subprojects || []).some(sp => sp._id === subprojectId));
            let subProjectInfo = allSubprojectsFlat.find(sp => sp._id === subprojectId);
            if (!projectInfo || !subProjectInfo) return;

            const baseRecord = {
              uniqueId: `${projectInfo._id}-${subprojectId}-${billing.resource_id}`,
              billingId: billing._id,
              hours: billing.hours,
              rate: billing.rate,
              flatrate: billing.flatrate,
              productivity: billing.productivity_level,
              description: billing.description || '',
              isBillable: billing.billable_status === 'Billable',
              projectName: projectInfo.name,
              subProjectName: subProjectInfo.name,
              projectId: projectInfo._id,
              subprojectId: subprojectId,
              isEditable: false // Historical records are always non-editable
            };

            if (!resourceInfo) {
              // DELETED Resource (Orphaned Record) - Use denormalized data
              finalDataMap.set(uniqueKey, {
                ...baseRecord,
                name: billing.resource_name || `Deleted Resource (${billing.resource_id})`,
                avatar_url: 'https://placehold.co/40x40/f3f4f6/374151?text=DLT', // Placeholder avatar
                role: 'N/A',
              });
            } else {
              // Existing but Unassigned Resource (Historical Record)
              finalDataMap.set(uniqueKey, {
                ...resourceInfo,
                ...baseRecord
              });
            }
          });

          setResources(Array.from(finalDataMap.values()));
          setIsDataLoaded(true);
          if (finalDataMap.size > 0) showToast('All project data loaded!');

        } catch (error) {
          console.error("Error loading linked resource data:", error);
          showToast(error.message, 'error');
        } finally {
          setIsLoading(false);
        }
      } else if (project && subProject) {
        // --- FILTERED VIEW LOGIC (Specific Subproject) ---
        setIsLoading(true);
        setIsDataLoaded(false);
        setInvoiceInfo(null);
        setResources([]);
        try {
          const [productivityRes, resourcesRes] = await Promise.all([
            fetch(`${apiBaseUrl}/productivity?subproject_id=${subProject}`),
            fetch(`${apiBaseUrl}/resource`)
          ]);

          if (!productivityRes.ok) throw new Error('Could not fetch productivity rates.');
          if (!resourcesRes.ok) throw new Error('Could not fetch resources.');

          const ratesData = await productivityRes.json();
          const allResources = await resourcesRes.json();
          const allResourcesMap = new Map(allResources.map(r => [r._id, r]));
          setProductivityRatesMap({ [subProject]: ratesData });

          const linkedResources = allResources.filter(r => (r.assigned_subprojects || []).some(sp => sp._id === subProject));

          // Fetch billing records for the specific month/year AND the initial null month records for this subproject
          const monthlyParams = new URLSearchParams({ subproject_id: subProject, month, year });
          const nullMonthParams = new URLSearchParams({ subproject_id: subProject, month: 'null' });

          const [monthlyBillingRes, nullMonthBillingRes] = await Promise.all([
            fetch(`${apiBaseUrl}/billing?${monthlyParams.toString()}`),
            fetch(`${apiBaseUrl}/billing?${nullMonthParams.toString()}`)
          ]);

          if (!monthlyBillingRes.ok || !nullMonthBillingRes.ok) throw new Error('Could not fetch billing data.');

          const monthlyBillingRecords = await monthlyBillingRes.json();
          const nullMonthBillingRecords = await nullMonthBillingRes.json();

          // Combine records, prioritizing monthly records
          const billingRecordsMap = new Map();
          monthlyBillingRecords.forEach(billing => billingRecordsMap.set(billing.resource_id, billing));
          nullMonthBillingRecords.forEach(billing => {
            if (!billingRecordsMap.has(billing.resource_id)) {
              billingRecordsMap.set(billing.resource_id, billing);
            }
          });

          const finalDataMap = new Map();

          // Pass 1: Current Assignments (Editable)
          linkedResources.forEach(resource => {
            const billing = billingRecordsMap.get(resource._id);
            let rowData;

            const defaultProductivity = 'Medium';
            const rateRecord = ratesData.find(r => r.level.toLowerCase() === defaultProductivity.toLowerCase());

            if (billing) {
              rowData = {
                ...resource,
                billingId: billing._id,
                hours: billing.hours,
                rate: billing.rate, // Internal Cost Rate
                flatrate: billing.flatrate || resource.flatrate || 0, // Project Flat Rate
                productivity: billing.productivity_level,
                description: billing.description || '',
                isBillable: billing.billable_status === 'Billable'
              };
            } else {
              rowData = {
                ...resource,
                billingId: null,
                hours: 0,
                rate: rateRecord?.base_rate ?? 0, // Default Internal Cost Rate
                flatrate: resource.flatrate || 0, // Project Flat Rate
                productivity: defaultProductivity,
                description: '',
                isBillable: true
              };
            }
            finalDataMap.set(resource._id, { ...rowData, uniqueId: `${project}-${subProject}-${resource._id}`, projectId: project, subprojectId: subProject, isEditable: true });
          });


          // Pass 2: Historical/Orphaned Records (Non-Editable)
          monthlyBillingRecords.forEach(billing => {
            // 1. Skip if already handled by an active assignment (Pass 1)
            if (finalDataMap.has(billing.resource_id)) return;

            // 2. Resource info
            const resourceInfo = allResourcesMap.get(billing.resource_id);

            const baseRecord = {
              uniqueId: `${project}-${subProject}-${billing.resource_id}`,
              billingId: billing._id,
              hours: billing.hours,
              rate: billing.rate, // Internal Cost Rate
              flatrate: billing.flatrate, // Project Flat Rate
              productivity: billing.productivity_level,
              description: billing.description || '',
              isBillable: billing.billable_status === 'Billable',
              projectId: project,
              subprojectId: subProject,
              isEditable: false
            };

            if (!resourceInfo) {
              // DELETED Resource (Orphaned Record) - Use denormalized data
              finalDataMap.set(billing.resource_id, {
                ...baseRecord,
                name: billing.resource_name || `Deleted Resource (${billing.resource_id})`,
                avatar_url: 'https://placehold.co/40x40/f3f4f6/374151?text=DLT', // Placeholder avatar
                role: 'N/A',
              });
            } else {
              // Existing but Unassigned Resource (Historical Record)
              finalDataMap.set(billing.resource_id, {
                ...resourceInfo,
                ...baseRecord
              });
            }
          });


          setResources(Array.from(finalDataMap.values()));
          setIsDataLoaded(true);
          showToast('Billing data loaded successfully!');
        } catch (error) {
          console.error("Error loading billing data:", error);
          showToast(error.message, 'error');
        } finally {
          setIsLoading(false);
        }
      } else {
        setResources([]);
        setProductivityRatesMap({});
        setIsDataLoaded(false);
      }
    };
    fetchBillingData();
  }, [filters, projectsData, subprojects]);


  // Handler for filter changes
  const handleFilterChange = (e) => {
    const { id, value } = e.target;

    const newFilters = { ...filters, [id]: value };
    if (id === 'project') {
      newFilters.subProject = '';
    }
    setFilters(newFilters);
  };
  useEffect(() => {
    if (filters.project) {
      const selectedProject = subprojects.find(sp => sp._id === filters.project);
      setSubprojectsData(selectedProject?.subprojects || []);
    } else {
      const allSubprojects = subprojects.flatMap(p => p.subprojects || []);
      setSubprojectsData(allSubprojects);
    }
  }, [filters.project, subprojects]);

  // Handler for changing resource hours, productivity, etc. inline
  const handleResourceChange = async (uniqueId, field, value) => {
    const currentRates = productivityRatesMap[resources.find(r => r.uniqueId === uniqueId)?.subprojectId] || [];

    let targetResource = resources.find(r => r.uniqueId === uniqueId);
    if (!targetResource) return;

    let newRes = { ...targetResource, [field]: value };

    // Update internal cost rate if productivity changes
    if (field === 'productivity') {
      const rateRecord = currentRates.find(r => r.level.toLowerCase() === value.toLowerCase());
      newRes.rate = rateRecord ? rateRecord.base_rate : 0;
    }

    // Update resources state
    const updatedResources = resources.map(res =>
      res.uniqueId === uniqueId ? newRes : res
    );
    setResources(updatedResources);

    // Prepare payload for API
    const totalAmount = Number(newRes.hours) * Number(newRes.flatrate); // Revenue: Flatrate * Hours
    const costingAmount = Number(newRes.hours) * Number(newRes.rate); // Cost: Cost Rate * Hours

    const payload = {
      project_id: newRes.projectId,
      subproject_id: newRes.subprojectId,
      resource_id: newRes._id,
      hours: Number(newRes.hours),
      productivity_level: newRes.productivity,
      rate: Number(newRes.rate), // Internal Cost Rate
      flatrate: Number(newRes.flatrate), // Project Flat Rate
      costing: costingAmount, // New calculated field
      total_amount: totalAmount, // New calculated field
      description: newRes.description,
      billable_status: newRes.isBillable ? 'Billable' : 'Non-Billable',
      // If billingId is the auto-generated one (originally null month), we update it to the selected month/year.
      month: filters.month,
      year: filters.year,
    };

    try {
      let response, data;
      // If billingId exists, it's an update. If it was a null-month record, this PUT updates it to the current month.
      if (newRes.billingId) {
        response = await fetch(`${apiBaseUrl}/billing/${newRes.billingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // This should primarily handle brand new resource entries not covered by auto-billing
        response = await fetch(`${apiBaseUrl}/billing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to save billing record');

      if (!newRes.billingId) {
        // Update the local state with the new billingId
        setResources(currentResources => currentResources.map(res =>
          res.uniqueId === uniqueId ? { ...res, billingId: data._id } : res
        ));
      }
      showToast('Billing record saved!');
    } catch (error) {
      console.error('Error saving resource change:', error);
      showToast(error.message, 'error');
      // Simple revert attempt for better UX if save fails
      setResources(resources);
    }
  };

  // Function to handle saving billing and generating an invoice
  const handleSaveBilling = () => {
    const billableRecords = resources.filter(r => r.billingId && r.hours > 0 && r.isBillable);
    if (billableRecords.length === 0) {
      showToast("No billable hours to invoice for this period, or records haven't been saved yet.", "error");
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleConfirmInvoice = async () => {
    const billingRecordIds = resources
      .filter(r => r.billingId && r.hours > 0 && r.isBillable)
      .map(r => r.billingId);

    if (billingRecordIds.length === 0) {
      showToast("No billable hours to invoice.", "error");
      setIsConfirmModalOpen(false);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billing_records: billingRecordIds,
          month: filters.month,
          year: filters.year,
        }),
      });
      const newInvoice = await response.json();
      if (!response.ok) throw new Error(newInvoice.message || 'Failed to create invoice');

      setInvoiceInfo({
        id: newInvoice.invoice_number,
        message: `Invoice ${newInvoice.invoice_number} generated`,
      });
      showToast(`Invoice ${newInvoice.invoice_number} created successfully!`);

    } catch (error) {
      console.error("Invoice creation failed:", error);
      showToast(error.message, 'error');
    } finally {
      setIsConfirmModalOpen(false);
    }
  };


  const handleEditClick = async (resource) => {
    if (!productivityRatesMap[resource.subprojectId]) {
      try {
        const res = await fetch(`${apiBaseUrl}/productivity?subproject_id=${resource.subprojectId}`);
        if (!res.ok) throw new Error('Failed to fetch productivity rates');
        const rates = await res.json();
        setProductivityRatesMap(prev => ({ ...prev, [resource.subprojectId]: rates }));
      } catch (error) {
        console.error(error);
        showToast(error.message, 'error');
        return;
      }
    }
    setEditingResource({ ...resource });
    setIsModalOpen(true);
  };

  const handleDeleteBilling = async (resource) => {
    if (!resource.billingId) {
      showToast("This resource has no billing record to delete.", "error");
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/billing/${resource.billingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete billing record');
      }

      showToast('Billing record deleted successfully!');

      const ratesForSubproject = productivityRatesMap[resource.subprojectId] || [];
      const rateRecord = ratesForSubproject.find(r => r.level.toLowerCase() === 'medium');

      setResources(currentResources =>
        currentResources.map(res =>
          res.uniqueId === resource.uniqueId
            ? { ...res, hours: 0, productivity: 'Medium', rate: rateRecord?.base_rate ?? 0, isBillable: true, billingId: null, description: '' }
            : res
        )
      );

    } catch (error) {
      console.error('Error deleting billing record:', error);
      showToast(error.message, 'error');
    }
  };

  const handleModalFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    let newEditingResource = {
      ...editingResource,
      [name]: type === 'checkbox' ? checked : value
    };

    // Update Cost Rate if productivity changes
    if (name === 'productivity') {
      const rates = productivityRatesMap[editingResource.subprojectId] || [];
      const rateRecord = rates.find(r => r.level.toLowerCase() === value.toLowerCase());
      if (rateRecord) {
        newEditingResource.rate = rateRecord.base_rate;
      }
    }

    setEditingResource(newEditingResource);
  };

  const handleModalSave = async () => {
    if (!editingResource) return;

    const totalAmount = Number(editingResource.hours) * Number(editingResource.flatrate); // Revenue
    const costingAmount = Number(editingResource.hours) * Number(editingResource.rate); // Cost

    const payload = {
      project_id: editingResource.projectId,
      subproject_id: editingResource.subprojectId,
      resource_id: editingResource._id,
      hours: Number(editingResource.hours),
      productivity_level: editingResource.productivity,
      rate: Number(editingResource.rate), // Internal Cost Rate
      flatrate: Number(editingResource.flatrate), // Project Flat Rate
      costing: costingAmount,
      total_amount: totalAmount,
      description: editingResource.description,
      billable_status: editingResource.isBillable ? 'Billable' : 'Non-Billable',
      month: filters.month,
      year: filters.year,
    };

    try {
      const response = await fetch(`${apiBaseUrl}/billing/${editingResource.billingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update billing record');

      setResources(currentResources => currentResources.map(res =>
        res.uniqueId === editingResource.uniqueId ? { ...res, ...editingResource } : res
      ));

      showToast('Billing record updated successfully!');
      setIsModalOpen(false);
      setEditingResource(null);

    } catch (error) {
      console.error('Error updating billing record:', error);
      showToast(error.message, 'error');
    }
  };

  // --- UI HELPER FUNCTIONS ---

  const sortedResources = useMemo(() => {
    let sortableItems = [...resources];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Custom calculations for sorting the new financial fields
        if (sortConfig.key === 'totalbill') {
          aValue = a.hours * a.flatrate;
          bValue = b.hours * b.flatrate;
        } else if (sortConfig.key === 'costing') {
          aValue = a.hours * a.rate;
          bValue = b.hours * b.rate;
        } else if (sortConfig.key === 'resource') {
          aValue = a.name; bValue = b.name;
        }

        // Handle numeric and string sorting
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [resources, sortConfig]);

  const filteredResources = useMemo(() => {
    return sortedResources
      .filter(res => showNonBillable || res.isBillable)
      .filter(res => res.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [sortedResources, showNonBillable, searchTerm]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const totals = useMemo(() => {
    // Total Revenue (Only for Billable Status, using Flat Rate)
    const billableRevenue = resources
      .filter(r => r.isBillable)
      .reduce((sum, r) => sum + r.hours * r.flatrate, 0);

    // Total Internal Cost (for ALL resources, using Cost Rate)
    const totalCost = resources
      .reduce((sum, r) => sum + r.hours * r.rate, 0);

    // Grand Total is now Profit/Loss (Revenue - Cost)
    const grandProfitLoss = billableRevenue - totalCost;

    return {
      revenue: billableRevenue,
      cost: totalCost,
      grand: grandProfitLoss
    };
  }, [resources]);

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

  const selectedProjectName = projectsData.find(p => p._id === filters.project)?.name;
  const selectedSubProjectName = subprojectsData.find(sp => sp._id === filters.subProject)?.name;

  // Map for sortable columns
  const columnMap = [
    { header: 'Project', key: 'projectName' },
    { header: 'Sub-Project', key: 'subProjectName' },
    { header: 'Resource', key: 'resource' },
    { header: 'Flat Rate ($)', key: 'flatrate' }, // Project Revenue Rate
    { header: 'Role', key: 'role' },
    { header: 'Productivity', key: 'productivity' },
    { header: 'Hours', key: 'hours' },
    { header: 'Cost Rate ($)', key: 'rate' }, // Internal Cost Rate
    { header: 'Costing ($)', key: 'costing' }, // Calculated Cost
    { header: 'Billable', key: 'isBillable' },
    { header: 'Total Bill ($)', key: 'totalbill' }, // Calculated Revenue
    { header: 'Actions', key: 'actions' },
  ];
  const sortableKeys = ['projectName', 'subProjectName', 'resource', 'flatrate', 'productivity', 'rate', 'costing', 'totalbill'];

  return (
    <div className="bg-gray-50">
      {toast.show && (
        <div className={`fixed top-4 right-4 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white px-6 py-3 rounded-xl shadow-lg z-50 transform transition-transform duration-300`}>
          <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2`}></i>{toast.message}
        </div>
      )}
      <div>
        <PageHeader heading="Costing" subHeading="Analyze internal costs and billable revenue for projects" />
      </div>

      <div id="app-container" className="flex h-screen">
        <main id="main-content" className="flex-1 p-4 mb-50 flex flex-col w-full">
          <div id="billing-filters" className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-2">Select Project</label>
                <select id="project" value={filters.project} onChange={handleFilterChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent">
                  <option value="">All Projects</option>
                  {projectsData.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="subProject" className="block text-sm font-medium text-gray-700 mb-2">Select Sub-Project</label>
                <select id="subProject" value={filters.subProject} onChange={handleFilterChange} disabled={!filters.project} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-gray-100">
                  <option value="">Choose Sub-Project...</option>
                  {subprojectsData.map(sp => <option key={sp._id} value={sp._id}>{sp.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
                <select id="month" value={filters.month} onChange={handleFilterChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent">
                  {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">Select Year</label>
                <select id="year" value={filters.year} onChange={handleFilterChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent">
                  {/* Assuming years are 2024, 2025, 2026 for demonstration */}
                  <option>2026</option>
                  <option>2025</option>
                  <option>2024</option>
                </select>
              </div>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <div className="flex items-center space-x-2 text-blue-600">
                  <i className="fas fa-spinner fa-spin"></i>
                  <span className="font-medium">Loading billing data...</span>
                </div>
              </div>
            )}
            {isDataLoaded && !isLoading && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 text-green-700">
                  <i className="fas fa-check-circle"></i>
                  <span className="font-medium">{resources.length} records loaded for {new Date(filters.year, filters.month - 1, 1).toLocaleString('default', { month: 'long' })} {filters.year}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="text-sm text-gray-600 mb-2 md:mb-0">
                <span>{filteredResources.length} of {resources.length} records showing</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  <input type="text" placeholder="Search resources..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-48 focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
                </div>
                <button onClick={() => setShowNonBillable(!showNonBillable)} className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center space-x-2">
                  <i className={`fas ${showNonBillable ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  <span>{showNonBillable ? 'Hide' : 'Show'} Non-Billable</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg flex-1 flex flex-col">
            <div className="overflow-x-auto overflow-y-auto relative" style={{ maxHeight: '65vh' }}>
              <table className="w-full">
                <thead className="sticky top-0 bg-white z-10 border-b border-gray-200">
                  <tr>
                    {columnMap.map(({ header, key }) => {
                      const isSortable = sortableKeys.includes(key);
                      return (
                        <th key={key} className={`text-left py-4 px-4 font-semibold text-gray-700 ${isSortable ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
                          onClick={() => isSortable && requestSort(key)}>
                          {header}
                          {isSortable && <i className="fas fa-sort ml-1"></i>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredResources.map(res => (
                    <tr key={res.uniqueId} className={`border-b border-gray-100 transition-colors ${!res.isEditable ? 'bg-gray-100 opacity-70' : res.isBillable ? 'bg-green-50 hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'}`}>
                      <td className="py-4 px-4">{res.projectName || selectedProjectName}</td>
                      <td className="py-4 px-4">{res.subProjectName || selectedSubProjectName}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <img src={res.avatar_url} alt={res.name} className="w-8 h-8 rounded-full object-cover" />
                          <span className="font-medium">{res.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-600 font-semibold">{formatCurrency(res.flatrate)}</td>
                      <td className="py-4 px-4 text-gray-600">{res.role}</td>
                      <td className="py-4 px-4">
                        <select value={res.productivity} onChange={(e) => handleResourceChange(res.uniqueId, 'productivity', e.target.value)} className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 disabled:bg-gray-200 disabled:cursor-not-allowed" disabled={!res.isEditable}>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Best">Best</option>
                        </select>
                      </td>
                      <td className="py-4 px-4">
                        <input type="number" value={res.hours} onChange={(e) => handleResourceChange(res.uniqueId, 'hours', e.target.value)} className="w-16 px-2 py-1 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-center disabled:bg-gray-200 disabled:cursor-not-allowed" disabled={!res.isEditable} />
                      </td>
                      <td className="py-4 px-4 font-semibold text-red-600">{formatCurrency(res.rate)}</td>
                      <td className="py-4 px-4 font-bold text-red-700">
                        {formatCurrency(res.hours * res.rate)}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${res.isBillable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {res.isBillable ? '✅ Billable' : '🚫 Non-Billable'}
                        </span>
                      </td>
                      <td className={`py-4 px-4 font-bold ${res.isBillable ? 'text-blue-700' : 'text-gray-600'}`}>
                        {formatCurrency(res.hours * res.flatrate)}
                      </td>
                      <td className="py-4 px-4 text-left">
                        <button onClick={() => handleEditClick(res)} className="text-blue-600 hover:text-blue-800 mr-3 p-1 rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Edit" disabled={!res.isEditable || !res.billingId}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="flex items-center space-x-4 md:space-x-8 mb-4 md:mb-0">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-1"><div className="w-3 h-3 bg-blue-500 rounded-full"></div><div className="text-xs text-blue-600 font-medium">Total Billable Revenue</div></div>
                    <div className="text-xl font-bold text-blue-700">{formatCurrency(totals.revenue)}</div>
                  </div>
                  <div className="w-px h-12 bg-gray-200 hidden md:block"></div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-1"><div className="w-3 h-3 bg-red-500 rounded-full"></div><div className="text-xs text-red-600 font-medium">Total Internal Cost</div></div>
                    <div className="text-xl font-bold text-red-700">{formatCurrency(totals.cost)}</div>
                  </div>
                  <div className="w-px h-12 bg-gray-200 hidden md:block"></div>
                  {/* <div className="text-center"> */}
                  {/*   <div className="flex items-center justify-center space-x-1 mb-1"><div className={`w-3 h-3 ${totals.grand >= 0 ? 'bg-green-500' : 'bg-orange-500'} rounded-full`}></div><div className={`text-xs ${totals.grand >= 0 ? 'text-green-600' : 'text-orange-600'} font-medium`}>Profit / Loss</div></div> */}
                  {/*   <div className="text-xl font-bold text-gray-700">{formatCurrency(totals.grand)}</div> */}
                  {/* </div> */}
                </div>
                <div className="flex items-center space-x-3">
                  <button onClick={handleSaveBilling} className="bg-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-600 hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center space-x-2">
                    <i className="fas fa-file-invoice"></i>
                    <span>Generate Invoice</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        <div className={`fixed right-0 top-0 h-full w-80 bg-white shadow-2xl transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 z-50`}>
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Invoice Summary</h3>
              <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500 hover:text-gray-700"><i className="fas fa-times"></i></button>
            </div>
          </div>
          {invoiceInfo && (
            <div className="p-6 space-y-4">
              {/* Invoice details would be rendered here */}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && editingResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Edit Billing for {editingResource.name}</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="hours" className="block text-sm font-medium text-gray-700">Hours</label>
                <input type="number" name="hours" id="hours" value={editingResource.hours} onChange={handleModalFormChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="flatrate" className="block text-sm font-medium text-gray-700">Project Flat Rate ($)</label>
                  <input type="number" name="flatrate" id="flatrate" value={editingResource.flatrate} readOnly className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100 cursor-not-allowed" />
                </div>
                <div>
                  <label htmlFor="rate" className="block text-sm font-medium text-gray-700">Internal Cost Rate ($)</label>
                  <input type="number" name="rate" id="rate" value={editingResource.rate} readOnly className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100 cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label htmlFor="productivity" className="block text-sm font-medium text-gray-700">Productivity</label>
                <select name="productivity" id="productivity" value={editingResource.productivity} onChange={handleModalFormChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500">
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Best</option>
                </select>
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea name="description" id="description" value={editingResource.description} onChange={handleModalFormChange} rows="3" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"></textarea>
              </div>
              <div className="flex items-center">
                <input type="checkbox" name="isBillable" id="isBillable" checked={editingResource.isBillable} onChange={handleModalFormChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <label htmlFor="isBillable" className="ml-2 block text-sm text-gray-900">Is Billable?</label>
              </div>
            </div>
            <div className="mt-8 flex justify-end space-x-3">
              <button onClick={() => { setIsModalOpen(false); setEditingResource(null); }} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancel</button>
              <button onClick={handleModalSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Confirm Invoice Generation</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to generate an invoice for{' '}
              <span className="font-semibold text-blue-600">
                {new Date(0, filters.month - 1).toLocaleString('default', { month: 'long' })} {filters.year}
              </span>? This action is irreversible.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmInvoice}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Confirm & Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Costing;
