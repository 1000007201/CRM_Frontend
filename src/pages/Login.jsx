/**
 * pages/Login.jsx
 * This stub lets the router work immediately so you can test the setup.
 */
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { login }    = useAuth();
  const navigate     = useNavigate();
  const location     = useLocation();
  const from         = location.state?.from?.pathname;

  const getHomePage = (user) => {
    if (!user) return "/login";
    if (user?.department === "operations") return "/advertisers";
    return "/dashboard";
  };

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const IMAGE_URL = "/images/NimaDesk.jpg";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      navigate(from ?? getHomePage(loggedInUser), { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail ?? "";
      if (detail.toLowerCase().includes("pending admin approval")) {
        setError("Your account is awaiting admin approval. Please try again later.");
      } else if (detail.toLowerCase().includes("no active account")) {
        setError("Invalid email or password.");
      } else {
        setError(detail || "Invalid credentials. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "var(--bg)",
    }}>
      <div style={{
        background: "var(--white)", border: "1px solid var(--border2)",
        borderRadius: 4, padding: "28px 28px",
        width: "100%", maxWidth: 360, boxShadow: "var(--shadow)",
      }}>
        {/* Logo */}
        <div style={{width: "60%", marginLeft: "-8px"}}>
          <img src={IMAGE_URL} alt="CRM" style={{width: "100%", marginLeft: "-40px"}}/>
        </div>

        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2, letterSpacing: "-0.01em" }}>Sign in</h1>
        <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          CRM Portal
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p style={{
              fontSize: 12, color: "var(--red)",
              background: "var(--red-lt)", padding: "8px 12px",
              borderRadius: "var(--radius)", border: "1px solid #fecaca",
            }}>
              {error}
            </p>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
          Don't have an account?{" "}
          <Link to="/signup" style={{ color: "var(--accent)", fontWeight: 600 }}>
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}