import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { createSubProject, fetchProjects } from "../services/projectService";

const CreateSubProjectModal = ({ isOpen, onClose, refreshProjects }) => {
  const [allProjects, setAllProjects] = useState([]);
  const [desc, setDesc] = useState("");
  const [selectedParentProjectId, setSelectedParentProjectId] = useState("");
  const [subProjectName, setSubProjectName] = useState("");
  const [subProjectPrice, setSubProjectPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchingProjects, setFetchingProjects] = useState(false);

  const fetchAllProjects = async () => {
    try {
      setFetchingProjects(true);
      const { data } = await fetchProjects();
      setAllProjects(data);
    } catch (error) {
      console.error("Error fetching projects:", error?.response || error);
      toast.error("Error fetching projects");
    } finally {
      setFetchingProjects(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchAllProjects();
  }, [isOpen]);

  const handleCreateSubProject = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const { status } = await createSubProject(
        subProjectName,
        subProjectPrice,
        selectedParentProjectId,
        desc
      );

      if (status === 201) {
        toast.success("Sub-project created successfully");
        await refreshProjects();
        onClose();
      }
    } catch (error) {
      if (error.status === 409) {
        toast.error("Sub-Project with the same name already exists");
      } else {
        console.error("Error creating sub-project:", error?.response || error);
        toast.error("Project creation failed");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
            <div className="flex items-center gap-2 text-blue-600 font-medium">
              <svg
                className="animate-spin h-5 w-5 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                ></path>
              </svg>
              <span>Creating SubProject...</span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Create New <span className="text-blue-700">Sub-Project</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
            disabled={loading}
          >
            &times;
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleCreateSubProject}>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sub-Project Name
              </label>
              <input
                type="text"
                value={subProjectName}
                onChange={(e) => setSubProjectName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Project Name"
                required
                disabled={loading}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent Project
              </label>
              <select
                value={selectedParentProjectId}
                onChange={(e) => setSelectedParentProjectId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading || fetchingProjects}
              >
                <option value="" disabled>
                  {fetchingProjects ? "Loading..." : "Select a parent project"}
                </option>
                {allProjects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Price ($)
            </label>
            <input
              type="number"
              value={subProjectPrice}
              onChange={(e) => setSubProjectPrice(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Project Price"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows="4"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="(Optional) Description"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  ></path>
                </svg>
              )}
              {loading ? "Creating..." : "Create SubProject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSubProjectModal;
