import { useState, useEffect } from "react";
import FancyDropdown from "../FancyDropdown";
import axios from "axios";
import MonthlyAnalysisTable from "./Table/MonthlyAnalysisTable";

const MonthlyBudgetAnalysis = () => {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const apiUrl = import.meta.env.VITE_BACKEND_URL;
  const [tableData, setTableData] = useState({});

  const currentYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth(); // 0–11
  const monthNames = [
    "All Months",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Generate list of options dynamically
  const months = monthNames.map((month) =>
    month === "All Months" ? month : `${month} ${currentYear}`
  );

  // 🧠 Set the default selected month when component mounts
  useEffect(() => {
    const currentMonth = `${monthNames[currentMonthIndex + 1]} ${currentYear}`;
    setSelectedMonth(currentMonth);
  }, []);

  const handleCalculate = async () => {
    if (!selectedMonth) {
      alert("Please select a month before calculating.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const res = await axios.post(`${apiUrl}/calculator/monthly-analysis`, {
        month: selectedMonth === "All Months" ? "all" : selectedMonth,
      });
      setTableData(res.data);
      setMessage("Budget analysis completed successfully!");
      console.log("Budget analysis result:", res.data);
    } catch (error) {
      console.error("Error calculating budget analysis:", error);
      setMessage("Failed to calculate budget analysis.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    // Reset to current month instead of blank for better UX
    const currentMonth = `${monthNames[currentMonthIndex + 1]} ${currentYear}`;
    setSelectedMonth(currentMonth);
    setMessage("");
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-8 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Monthly Budget Analysis
        </h2>

        {/* Month Dropdown */}
        <FancyDropdown
          label="Select Month"
          options={months}
          value={selectedMonth}
          onChange={setSelectedMonth}
        />

        {/* Action Buttons */}
        <div className="flex gap-x-4">
          <button
            onClick={handleCalculate}
            disabled={!selectedMonth || loading}
            className={`w-1/2 bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition ${
              !selectedMonth || loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Calculating..." : "Calculate"}
          </button>

          <button
            onClick={handleReset}
            className="w-1/2 bg-gray-200 text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-300 transition"
          >
            Reset
          </button>
        </div>

        {/* Result / Message */}
        {message && (
          <div className="text-sm text-gray-900 bg-gray-100 p-3 rounded">
            {message}
          </div>
        )}

        <div>
          <MonthlyAnalysisTable data={tableData} />
        </div>
      </div>
    </div>
  );
};

export default MonthlyBudgetAnalysis;
