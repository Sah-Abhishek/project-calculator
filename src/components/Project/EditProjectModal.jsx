
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { updateProject } from '../../services/projectService';

const EditProjectModal = ({ isOpen, onClose, project, refreshProjects }) => {
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState('visible');
  const [desc, setDesc] = useState('');
  console.log("This is the project: ", project);

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setVisibility(project.visibility || 'visible');
      setDesc(project.description || '');
    }
  }, [project]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = {
      name,
      visibility,
      description: desc
    }

    console.log("This is the body: ", body);
    try {
      const { status } = await updateProject(project._id, body);

      if (status === 200) {
        toast.success("Project updated successfully");
        refreshProjects?.(); // refresh project list
        onClose();
      } else {
        toast.error("Failed to update project");
      }
    } catch (err) {
      console.error("Update error:", err);
      toast.error("An error occurred");
    }
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="visible">Visible</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Update Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProjectModal;
