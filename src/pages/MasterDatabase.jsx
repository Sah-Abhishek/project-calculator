import KPICards from "../components/MasterDadatabase/KPICards";
import PageHeader from "../components/PageHeader"

const MasterDatabase = () => {

  return (
    <>
      <div>
        <PageHeader heading="Master Database" subHeading="Centralized view of all data entities" />
      </div>
      <div>

        <KPICards />
      </div>

    </>

  )
}

export default MasterDatabase;
