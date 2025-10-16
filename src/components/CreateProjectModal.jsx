import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { createProject, fetchProjectsWithSubProjects } from "../services/projectService";

const CreateProjectModal = ({ isOpen, onClose, refreshProjects }) => {
  const [projectName, setProjectName] = useState("");
  const [projectPrice, setProjectPrice] = useState();
  const [isVisible, setIsVisible] = useState(true);
  const [desc, setDesc] = useState('');

  const handleCreateProject = async (e) => {
    e.preventDefault(); // prevent form reload

    try {
      const { data, status } = await createProject(projectName, projectPrice, isVisible, desc);

      if (status === 201) {
        toast.success("New Project created successfully");
        await refreshProjects();
        onClose();
      }
    } catch (error) {
      console.error("There was an error while creating a new project:", error?.response || error);
      toast.error("Project Creation Failed");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Create New <span className="text-blue-700">Project</span></h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <form className="space-y-4" onSubmit={handleCreateProject}>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
              <input
                type="text"
                value={projectName}
                placeholder="Project Name"
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
              <select
                value={isVisible ? "true" : "false"}
                onChange={(e) => setIsVisible(e.target.value === "true")}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="true">Visible</option>
                <option value="false">Hidden</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Price</label>
              <input
                type="number"
                value={projectPrice}
                placeholder="Project Price"
                onChange={(e) => setProjectPrice(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows="4"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="(Optional) Description"
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
