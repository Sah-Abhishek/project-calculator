import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { createProject } from "../services/projectService";

const CreateProjectModal = ({ isOpen, onClose, refreshProjects }) => {
  const [projectName, setProjectName] = useState("");
  const [projectPrice, setProjectPrice] = useState();
  const [isVisible, setIsVisible] = useState(true);
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return toast.error("Project name is required");

    setLoading(true);
    try {
      const { status } = await createProject(projectName, projectPrice, isVisible, desc);

      if (status === 201) {
        toast.success("New Project created successfully");
        await refreshProjects();
        onClose();
      }
    } catch (error) {
      console.log(error.status);
      if (error.status === 409) {
        toast.error("Project name already exists");
      } else {
        toast.error("Project creation failed",);
      }
      console.error("Error creating project:", error?.response || error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Create New <span className="text-blue-700">Project</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
            disabled={loading}
          >
            &times;
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleCreateProject}>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project Name"
                disabled={loading}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                required
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Visibility
              </label>
              <select
                value={isVisible ? "true" : "false"}
                onChange={(e) => setIsVisible(e.target.value === "true")}
                disabled={loading}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <option value="true">Visible</option>
                <option value="false">Hidden</option>
              </select>
            </div>
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
              disabled={loading}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded-md text-white transition-all ${loading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              {loading ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>

        {/* Optional overlay spinner (nice for UX polish) */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateProjectModal;
