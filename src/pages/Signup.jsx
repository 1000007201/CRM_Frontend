import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSignup } from "@/hooks/useAuth";

const IMAGE_URL = "/images/Nima.jpg";

export default function SignupPage() {
  const navigate = useNavigate();
  const signup   = useSignup();
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "",
    password: "", password2: "",
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.full_name.trim())  e.full_name = "Full name is required.";
    if (!form.email.trim())      e.email     = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.password)          e.password  = "Password is required.";
    else if (form.password.length < 8) e.password = "Minimum 8 characters.";
    if (form.password !== form.password2) e.password2 = "Passwords do not match.";
    if (!form.phone || !form.phone.trim()) {
      e.phone = "Phone number is required.";
    } else {
      const match = form.phone.match(/^\+?(\d+)\s+(.+)$/);
      if (!match || !match[2].trim()) e.phone = "Please enter both country code and phone number.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await signup.mutateAsync(form);
      setSuccess(true);
    } catch (err) {
      const detail = err.response?.data;
      if (typeof detail === "object" && detail !== null && !Array.isArray(detail)) {
        const fe = {};
        Object.entries(detail).forEach(([k, v]) => {
          fe[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(fe);
      }
    }
  };

  const wrapper = {
    minHeight: "100vh", display: "flex",
    alignItems: "center", justifyContent: "center",
    background: "var(--bg)",
  };

  const card = {
    background: "var(--white)", border: "1px solid var(--border2)",
    borderRadius: 4, padding: "28px 28px",
    width: "100%", maxWidth: 360, boxShadow: "var(--shadow)",
  };

  if (success) {
    return (
      <div style={wrapper}>
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
            Account Created!
          </h2>
          <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 20, lineHeight: 1.6 }}>
            Your account is pending admin approval. You'll be able to log in once approved.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapper}>
      <div style={card}>
        {/* Logo */}
        <div style={{ width: "60%", marginLeft: "-8px" }}>
          <img src={IMAGE_URL} alt="CRM" style={{ width: "100%" }} />
        </div>

        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2, letterSpacing: "-0.01em" }}>
          Create your account
        </h1>
        <p style={{
          fontSize: 11, color: "var(--text3)", marginBottom: 20,
          textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          CRM Portal
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              className="form-input"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              placeholder="e.g. John Doe"
              autoFocus
            />
            {errors.full_name && <p className="form-error">{errors.full_name}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              className="form-input"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@company.com"
            />
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Phone *</label>
            <input
              className="form-input"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+XX 00000 00000"
            />
            {errors.phone && <p className="form-error">{errors.phone}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input
              className="form-input"
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="Min. 8 characters"
            />
            {errors.password && <p className="form-error">{errors.password}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password *</label>
            <input
              className="form-input"
              type="password"
              value={form.password2}
              onChange={(e) => set("password2", e.target.value)}
              placeholder="Re-enter password"
            />
            {errors.password2 && <p className="form-error">{errors.password2}</p>}
          </div>

          {errors.non_field_errors && (
            <p style={{
              fontSize: 12, color: "var(--red)",
              background: "var(--red-lt)", padding: "8px 12px",
              borderRadius: "var(--radius)", border: "1px solid #fecaca",
            }}>
              {errors.non_field_errors}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={signup.isPending}
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
          >
            {signup.isPending ? "Signing up…" : "Sign Up"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
