// src/auth/Login.jsx
import React, { useState } from "react";
import { supabase } from "../supabase/client";
import { useAdminAuth } from "./useAdminAuth"; // Import the hook we just made
import "./Login.css"; // We will add styles below

export default function Login() {
  const [username, setUsername] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { login } = useAdminAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Check against our custom 'admins' table
      const { data, error } = await supabase
        .from("admins")
        .select("*")
        .eq("username", username)
        .eq("secret_key", secretKey) // Checking exact match
        .single();

      if (error || !data) {
        setError("Invalid Username or Secret Key");
        setLoading(false);
        return;
      }

      // Success! Save session locally
      login();
      window.location.href = "/";

    } catch (err) {
      console.error(err);
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-circle">🔒</div>
          <h2>Admin Portal</h2>
          <p>Enter your secure credentials</p>
        </div>

        <form onSubmit={handleLogin}>
          {error && <div className="error-msg">{error}</div>}

          <div className="input-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="e.g. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Secret Key</label>
            <input
              type="password"
              placeholder="••••••••"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? "Verifying..." : "Access Dashboard"}
          </button>
        </form>
        
        <p className="footer-text">Perfume Box Control Panel</p>
      </div>
    </div>
  );
}