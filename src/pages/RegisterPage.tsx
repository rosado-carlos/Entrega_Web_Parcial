import { useState, type SubmitEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import FeedbackAlert from "../components/ui/FeedbackAlert";
import { useAppContext } from "../context/useAppContext";
import type { RequestStatus } from "../types";

export default function RegisterPage() {
  const { register, currentUser } = useAppContext();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [major, setMajor] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
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

    const result = await register({ fullName, email, major, password, avatarUrl });
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
      <section className="col-lg-7 mx-auto card shadow-sm p-4">
        <h1 className="h3 mb-3">Register</h1>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <FeedbackAlert status={status} message={message} className="mb-3" />
          <div className="mb-3">
            <label className="form-label" htmlFor="register-full-name">Full name</label>
            <input
              id="register-full-name"
              className="form-control"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              minLength={5}
              autoComplete="name"
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="register-email">University email</label>
            <input
              id="register-email"
              className="form-control"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="register-major">Program / major</label>
            <input
              id="register-major"
              className="form-control"
              value={major}
              onChange={(event) => setMajor(event.target.value)}
              required
              minLength={3}
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="register-avatar-url">Avatar URL (optional)</label>
            <input
              id="register-avatar-url"
              className="form-control"
              type="url"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="register-password">Password</label>
            <input
              id="register-password"
              className="form-control"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={4}
              autoComplete="new-password"
            />
          </div>
          <button className="btn btn-success w-100" type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="small mt-3 mb-0">Already have an account? <Link to="/login">Login</Link></p>
      </section>
    </main>
  );
}
