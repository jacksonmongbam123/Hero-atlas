import React, { useState, useEffect } from "react";
import IdentityGateway from "./components/IdentityGateway";
import PortalDashboard from "./components/PortalDashboard";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      if (typeof localStorage !== "undefined") {
        const stored = localStorage.getItem("theme");
        return (stored === "dark" || stored === "light") ? stored : "light";
      }
    } catch (e) {
      // ignore storage access errors
    }
    return "light";
  });

  useEffect(() => {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("theme", theme);
      }
    } catch (e) {
      // ignore storage access errors
    }
  }, [theme]);

  // Terminate secure session
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  return (
    <div className={`${theme} min-h-screen bg-portal-main text-slate-100 transition-colors duration-200`}>
      {!isLoggedIn ? (
        <IdentityGateway 
          theme={theme}
          onToggleTheme={toggleTheme}
          onSuccess={(role, name, token, user) => {
            setIsLoggedIn(true);
            // Include the token inside the user object so the dashboard can make authenticated requests
            setCurrentUser({ ...user, token });
          }}
        />
      ) : (
        <PortalDashboard 
          user={currentUser} 
          onLogout={handleLogout} 
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
    </div>
  );
}

