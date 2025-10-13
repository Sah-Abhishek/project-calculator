
import React from "react";

const PageHeader = ({ heading, subHeading }) => {
  const user = JSON.parse(localStorage.getItem("user")) || {
    full_name: "Guest User",
    email: "guest@example.com",
    role: "user",
  };

  const initials = user.full_name
    ? user.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
    : "GU";

  return (
    <div className="flex justify-between items-center p-8 pb-4 bg-white">
      {/* Left side */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{heading}</h1>
        <p className="text-sm text-gray-500">{subHeading}</p>
      </div>

      {/* Right side user info */}
      <div className="flex items-center space-x-3">
        <div className="text-right">
          <h2 className="text-sm font-medium text-gray-900">{user.full_name}</h2>
          <p className="text-xs text-gray-500 capitalize">{user.role}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
          {initials}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
