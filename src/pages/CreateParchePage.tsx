import { useState, type SubmitEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import FeedbackAlert from "../components/ui/FeedbackAlert";
import { useAppContext } from "../context/useAppContext";
import type { RequestStatus } from "../types";

export default function CreateParchePage() {
  const { currentUser, createParche, joinParche } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteParam = searchParams.get("invite") ?? "";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [inviteCode, setInviteCode] = useState(inviteParam);
  const [createStatus, setCreateStatus] = useState<RequestStatus>("idle");
  const [createMessage, setCreateMessage] = useState("");
  const [joinStatus, setJoinStatus] = useState<RequestStatus>("idle");
  const [joinMessage, setJoinMessage] = useState("");

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  async function handleCreateParche(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateStatus("loading");
    setCreateMessage("");

    const result = await createParche({ name, description, coverImageUrl });
    if (!result.success) {
      setCreateStatus("error");
      setCreateMessage(result.message);
      return;
    }

    setCreateStatus("success");
    navigate("/", { state: { notice: result.message } });
  }

  async function handleJoinParche(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoinStatus("loading");
    setJoinMessage("");

    const result = await joinParche(inviteCode);
    if (!result.success) {
      setJoinStatus("error");
      setJoinMessage(result.message);
      return;
    }

    setJoinStatus("success");
    navigate("/", { state: { notice: result.message } });
  }

  const inviteLinkDetected = inviteParam.length > 0;

  return (
    <main className="container py-4">
      <div className="row g-4">
        <section className="col-12 col-lg-6">
          <div className="card shadow-sm p-4">
            <h1 className="h4">Create a parche</h1>
            <FeedbackAlert status={createStatus} message={createMessage} className="mt-3" />
            <form onSubmit={(event) => void handleCreateParche(event)}>
              <div className="mb-3">
                <label className="form-label" htmlFor="parche-name">Parche name</label>
                <input
                  id="parche-name"
                  className="form-control"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  minLength={3}
                  maxLength={50}
                />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="parche-description">Description</label>
                <textarea
                  id="parche-description"
                  className="form-control"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  required
                  minLength={10}
                  maxLength={250}
                />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="parche-cover-image">Cover image URL</label>
                <input
                  id="parche-cover-image"
                  className="form-control"
                  type="url"
                  value={coverImageUrl}
                  onChange={(event) => setCoverImageUrl(event.target.value)}
                  required
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={createStatus === "loading"}>
                {createStatus === "loading" ? "Creating..." : "Create"}
              </button>
            </form>
          </div>
        </section>

        <section className="col-12 col-lg-6">
          <div className="card shadow-sm p-4">
            <h2 className="h4">Join with invite code or link</h2>
            {inviteLinkDetected && (
              <p className="small text-muted">
                Invite link detected. Review the code below and confirm the join action.
              </p>
            )}
            <FeedbackAlert status={joinStatus} message={joinMessage} className="mb-3" />
            <form onSubmit={(event) => void handleJoinParche(event)}>
              <div className="mb-3">
                <label className="form-label" htmlFor="invite-code">Invite code</label>
                <input
                  id="invite-code"
                  className="form-control"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  required
                />
              </div>
              <button className="btn btn-outline-primary" type="submit" disabled={joinStatus === "loading"}>
                {joinStatus === "loading" ? "Joining..." : "Join parche"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
