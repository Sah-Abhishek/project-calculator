
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { createProject, createSubProject, fetchProjects } from "../services/projectService";


const CreateSubProjectModal = ({ isOpen, onClose, refreshProjects }) => {

  const [allProjects, setAllProjects] = useState([]);
  const [desc, setDesc] = useState('');
  const [selectedParentProjectId, setSelectedParentProjectId] = useState('');
  const [subProjectName, setSubProjectName] = useState('');

  const fetchAllProjects = async () => {
    try {
      const { data, status } = await fetchProjects();
      setAllProjects(data);
    } catch (error) {
      console.error("There was an error while creating a new project:", error?.response || error);
      toast.error("Error fetching projects");
    }
  }

  useEffect(() => {
    fetchAllProjects();
  }, [isOpen])



  const handleCreateSubProject = async (e) => {
    e.preventDefault(); // prevent form reload

    try {
      // console.log("This is the selectedParentProjectId insinde the create subproject modal: ", selectedParentProjectId);
      const { data, status } = await createSubProject(subProjectName, selectedParentProjectId, desc);
      if (status === 201) {
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
          <h2 className="text-xl font-semibold">Create New <span className="text-blue-700">Sub-Project</span></h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <form className="space-y-4" onSubmit={handleCreateSubProject}>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Project Name</label>
              <input
                type="text"
                value={subProjectName}
                placeholder="Project Name"
                onChange={(e) => setSubProjectName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Project</label>
              <select
                value={selectedParentProjectId}
                onChange={(e) => setSelectedParentProjectId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="" disabled>Select a parent project</option>
                {allProjects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

          </div>
          <div>
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
              Create SubProject
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSubProjectModal;
