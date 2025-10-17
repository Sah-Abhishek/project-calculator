import { useEffect, useState } from "react";
import CreateProjectModal from "../components/CreateProjectModal";
import PageHeader from "../components/PageHeader";
import { FaFile, FaUpload, FaInfoCircle } from "react-icons/fa";
import CreateSubProjectModal from "../components/CreateSubProjectModal";
import { fetchProjectsWithSubProjects } from "../services/projectService.js";
import ProjectTable from "../components/Project/ProjectTable.jsx";
import toast from "react-hot-toast";
import axios from "axios";

const ProjectPage = () => {
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isCreateSubProjectModalOpen, setIsCreateSubProjectModalOpen] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [showCsvFormat, setShowCsvFormat] = useState(false); // ✅ toggle for format info

  const fetchData = async () => {
    try {
      const { data } = await fetchProjectsWithSubProjects();
      setTableData(data);
    } catch (error) {
      toast.error("There was an error while fetching table data");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ CSV Upload Handler
  const handleCSVUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== "text/csv") {
      toast.error("Please upload a valid CSV file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      toast.loading("Uploading CSV...");
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/project/upload-csv`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.dismiss();
      toast.success(res.data.message || "CSV uploaded successfully!");
      fetchData();
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.message || "Failed to upload CSV");
    } finally {
      event.target.value = ""; // reset
    }
  };

  return (
    <div>
      <PageHeader
        heading="Project Management"
        subHeading="Manage your projects and sub-projects with timelines and budgets"
      />

      <div className="p-8 flex flex-col gap-4">
        <div className="flex flex-wrap gap-4 items-center">
          <button
            onClick={() => setIsCreateProjectModalOpen(true)}
            className="bg-blue-600 text-white inline-flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-blue-700"
          >
            <FaFile size={20} />
            New Project
          </button>

          <button
            onClick={() => setIsCreateSubProjectModalOpen(true)}
            className="text-blue-700 border border-blue-700 inline-flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-gray-200"
          >
            <FaFile size={20} />
            New Sub Project
          </button>

          {/* ✅ Upload CSV Button */}
          <label className="cursor-pointer bg-green-600 text-white inline-flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-green-700">
            <FaUpload size={18} />
            Upload CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />
          </label>

          {/* ✅ Info toggle */}
          <button
            onClick={() => setShowCsvFormat(!showCsvFormat)}
            className="text-gray-600 inline-flex items-center gap-2 hover:text-gray-800"
          >
            <FaInfoCircle size={18} />
            CSV Format Info
          </button>
        </div>

        {/* ✅ Format info box */}
        {showCsvFormat && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm text-sm text-gray-700 animate-fadeIn">
            <h3 className="font-semibold text-gray-800 mb-2">CSV Format Guide</h3>
            <p className="mb-2">
              The CSV file must include the following columns (in order):
            </p>
            <pre className="bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto text-sm text-gray-800">
              serial_number, project_name, visibility, subprojects, created_on, project_price, updated_at
            </pre>

            <ul className="list-disc list-inside mt-3 text-gray-600">
              <li><strong>serial_number</strong>: Unique ID or order number</li>
              <li><strong>project_name</strong>: Name of the project</li>
              <li><strong>visibility</strong>: “public” or “private”</li>
              <li><strong>subprojects</strong>: Multiple subprojects separated by commas (e.g., “Design, Development, QA”)</li>
              <li><strong>created_on</strong>: Date of project creation (YYYY-MM-DD)</li>
              <li><strong>project_price</strong>: Numeric project cost</li>
              <li><strong>updated_at</strong>: Last updated date (YYYY-MM-DD)</li>
            </ul>
          </div>
        )}
      </div>

      <div>
        <ProjectTable refreshProjects={fetchData} data={tableData} />
      </div>

      <CreateProjectModal
        refreshProjects={fetchData}
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
      />

      <CreateSubProjectModal
        refreshProjects={fetchData}
        isOpen={isCreateSubProjectModalOpen}
        onClose={() => setIsCreateSubProjectModalOpen(false)}
      />
    </div>
  );
};

export default ProjectPage;
