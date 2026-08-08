import React, { useState, useEffect } from "react";
import IdentityGateway from "./components/IdentityGateway";
import PortalDashboard from "./components/PortalDashboard";

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      if (typeof localStorage !== "undefined") {
        const storedUser = localStorage.getItem("currentUser");
        if (storedUser) {
          return JSON.parse(storedUser);
        }
      }
    } catch (e) {
      console.error("Failed to load stored user from localStorage", e);
    }
    return null;
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      if (typeof localStorage !== "undefined") {
        const storedUser = localStorage.getItem("currentUser");
        const storedToken = localStorage.getItem("token") || localStorage.getItem("userToken");
        return !!(storedUser && (storedToken || JSON.parse(storedUser)?.token));
      }
    } catch (e) {
      // ignore
    }
    return false;
  });

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

  const handleLoginSuccess = (role: string, name: string, token: string, user: any) => {
    const userWithToken = { ...user, token };
    setIsLoggedIn(true);
    setCurrentUser(userWithToken);

    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("currentUser", JSON.stringify(userWithToken));
        if (token) {
          localStorage.setItem("token", token);
          localStorage.setItem("userToken", token);
          localStorage.setItem("authToken", token);
        }
      }
    } catch (e) {
      console.error("Failed to save session to localStorage", e);
    }
  };

  // Terminate secure session
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("currentUser");
        localStorage.removeItem("token");
        localStorage.removeItem("userToken");
        localStorage.removeItem("authToken");
      }
    } catch (e) {
      console.error("Failed to clear session from localStorage", e);
    }
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
          onSuccess={handleLoginSuccess}
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

