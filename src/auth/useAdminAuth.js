import { useState, useEffect } from "react";

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if the special admin token exists in local storage
    const token = localStorage.getItem("perfume_admin_token");
    if (token === "logged_in_securely") {
      setIsAdmin(true);
    }
    setLoading(false);
  }, []);

  const login = () => {
    localStorage.setItem("perfume_admin_token", "logged_in_securely");
    setIsAdmin(true);
  };

  const logout = () => {
    localStorage.removeItem("perfume_admin_token");
    setIsAdmin(false);
    window.location.href = "/login";
  };

  return { isAdmin, loading, login, logout };
}