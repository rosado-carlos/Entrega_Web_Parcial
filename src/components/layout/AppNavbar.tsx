import { useState } from "react";
import { Link } from "react-router";
import { useAppContext } from "../../context/useAppContext";

export default function AppNavbar() {
  const { currentUser, logout } = useAppContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
  }

  return (
    <nav className="navbar navbar-expand-lg bg-dark navbar-dark">
      <div className="container">
        <Link to="/" className="navbar-brand">ParchePlan U</Link>
        <div className="d-flex gap-2 align-items-center">
          {currentUser ? (
            <>
              <div className="d-flex align-items-center gap-2">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName}
                    width={28}
                    height={28}
                    className="rounded-circle"
                  />
                ) : (
                  <div
                    className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                    style={{ width: 28, height: 28, fontSize: 12 }}
                  >
                    {currentUser.fullName.charAt(0)}
                  </div>
                )}
                <span className="text-light small">{currentUser.fullName}</span>
              </div>
              <button className="btn btn-outline-light btn-sm" onClick={() => void handleLogout()} disabled={isLoggingOut}>
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline-light btn-sm">Login</Link>
              <Link to="/register" className="btn btn-warning btn-sm">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
