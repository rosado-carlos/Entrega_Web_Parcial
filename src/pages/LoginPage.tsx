import { useState, type SubmitEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import FeedbackAlert from "../components/ui/FeedbackAlert";
import { useAppContext } from "../context/useAppContext";
import type { RequestStatus } from "../types";

export default function LoginPage() {
  const { login, currentUser } = useAppContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [message, setMessage] = useState("");

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const result = await login(email, password);
    if (!result.success) {
      setStatus("error");
      setMessage(result.message);
      return;
    }

    setStatus("success");
    navigate("/", { state: { notice: result.message } });
  }

  return (
    <main className="container py-4">
      <section className="col-lg-6 mx-auto card shadow-sm p-4">
        <h1 className="h3 mb-3">Login</h1>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <FeedbackAlert status={status} message={message} className="mb-3" />
          <div className="mb-3">
            <label className="form-label" htmlFor="login-email">University email</label>
            <input
              id="login-email"
              className="form-control"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              aria-describedby="login-email-help"
            />
            <div id="login-email-help" className="form-text">Use your academic email address.</div>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="form-control"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={4}
              autoComplete="current-password"
            />
          </div>
          <button className="btn btn-primary w-100" type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Logging in..." : "Login"}
          </button>
        </form>
        <p className="small mt-3 mb-0">Need an account? <Link to="/register">Register</Link></p>
      </section>
    </main>
  );
}
