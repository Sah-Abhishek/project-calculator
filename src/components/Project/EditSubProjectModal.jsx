
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { updateSubProject } from '../../services/projectService'; // Adjust path
import Loader from '../Loader';

const EditSubProjectModal = ({ isOpen, onClose, project, subProject, allProjects = [], refreshProjects }) => {
  const [name, setName] = useState('');
  const [parentProjectId, setParentProjectId] = useState('');
  const [status, setStatus] = useState('Active');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // console.log("This is the parent project name: ", project._id);

  useEffect(() => {
    if (subProject) {
      setName(subProject.name || '');
      setParentProjectId(project?._id || '');
      setStatus(subProject.status || 'Active');
      setDescription(subProject.description || '');
    }
  }, [subProject]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const body = {
      name,
      parentProjectId,
      status,
      description
    };

    try {
      const { status: responseStatus } = await updateSubProject(subProject._id, body);

      if (responseStatus === 200) {
        toast.success("Sub-project updated successfully");
        refreshProjects?.();
        onClose();
      } else {
        toast.error("Failed to update sub-project");
      }
    } catch (err) {
      console.error("Error updating subproject:", err);
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !subProject) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit Sub-Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Project</label>
              <select
                value={parentProjectId}
                onChange={(e) => setParentProjectId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value={project._id}>{project.name}</option>
                {allProjects
                  .filter((proj) => proj._id !== project._id)
                  .map((proj) => (
                    <option key={proj._id} value={proj._id}>
                      {proj.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(Optional)"
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? <Loader /> : 'Update Sub-Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSubProjectModal;
