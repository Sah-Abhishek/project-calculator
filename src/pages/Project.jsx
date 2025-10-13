import { useEffect, useState } from "react";
import CreateProjectModal from "../components/CreateProjectModal";
import PageHeader from "../components/PageHeader";
import { CiFileOn } from "react-icons/ci";
import { FaFile } from "react-icons/fa";
import CreateSubProjectModal from "../components/CreateSubProjectModal";
import { fetchProjectsWithSubProjects } from '../services/projectService.js'
import ProjectTable from "../components/Project/ProjectTable.jsx";
import toast from "react-hot-toast";



const ProjectPage = () => {
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isCreateSubProjectModalOpen, setIsCreateSubProjectModalOpen] = useState(false);
  const [tableData, setTableData] = useState([]);

  const fetchData = async () => {
    try {
      const { data, status } = await fetchProjectsWithSubProjects();
      setTableData(data);
    } catch (error) {
      // console.log("There was an error while fetching projects: ", error);
      toast.error("There was an error while fetching table data");
    }
  };



  useEffect(() => {

    fetchData();
  }, []);


  return (
    <div>
      <div>
        <PageHeader heading="Project Management" subHeading="Manage your projects and sub-projects with timelines and budgets" />
      </div>
      <div className="p-8 flex gap-4">
        <button
          onClick={() => setIsCreateProjectModalOpen(true)}
          className="bg-blue-600 text-white inline-flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-blue-700"
        >
          <FaFile size={20} />
          New Project
        </button>

        <button
          onClick={() => setIsCreateSubProjectModalOpen(true)}
          className=" text-blue-700 border border-blue-700 inline-flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-gray-200"
        >
          <FaFile size={20} />
          New Sub Project
        </button>
      </div>
      <div>

        <ProjectTable refreshProjects={fetchData} data={tableData} />
      </div>
      <CreateProjectModal refreshProjects={fetchData} isOpen={isCreateProjectModalOpen} onClose={() => setIsCreateProjectModalOpen(false)} />
      <CreateSubProjectModal refreshProjects={fetchData} isOpen={isCreateSubProjectModalOpen} onClose={() => setIsCreateSubProjectModalOpen(false)} />

    </div>
  )
}

export default ProjectPage;
