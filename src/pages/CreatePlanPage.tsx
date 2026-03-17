import { useState, type SubmitEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import FeedbackAlert from "../components/ui/FeedbackAlert";
import EmptyState from "../components/ui/EmptyState";
import { useAppContext } from "../context/useAppContext";
import type { RequestStatus } from "../types";

type OptionInput = {
  place: string;
  time: string;
};

export default function CreatePlanPage() {
  const { id } = useParams();
  const { currentUser, parches, createPlan } = useAppContext();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [votingDeadline, setVotingDeadline] = useState("");
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [message, setMessage] = useState("");
  const [options, setOptions] = useState<OptionInput[]>([
    { place: "", time: "" },
    { place: "", time: "" },
    { place: "", time: "" },
  ]);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const parcheId = Number(id);
  const parche = parches.find((item) => item.id === parcheId);

  if (!parche) {
    return (
      <main className="container py-4">
        <EmptyState title="Parche not found" description="The requested parche no longer exists." />
      </main>
    );
  }

  const isMember = parche.members.some((member) => member.userId === currentUser.id);

  if (!isMember) {
    return (
      <main className="container py-4">
        <EmptyState
          title="Access restricted"
          description="Only members of this parche can create a plan here."
        />
      </main>
    );
  }

  function handleOptionChange(index: number, field: "place" | "time", value: string) {
    setOptions((previousOptions) => {
      return previousOptions.map((option, optionIndex) => {
        if (optionIndex !== index) {
          return option;
        }

        return { ...option, [field]: value };
      });
    });
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    if (dateEnd && dateStart && dateEnd < dateStart) {
      setStatus("error");
      setMessage("Date end cannot be earlier than date start.");
      return;
    }

    const result = await createPlan({
      parcheId,
      title,
      description,
      dateStart,
      dateEnd,
      votingDeadline,
      options,
    });

    if (!result.success) {
      setStatus("error");
      setMessage(result.message);
      return;
    }

    setStatus("success");
    navigate(`/parches/${parcheId}`, { state: { notice: result.message } });
  }

  return (
    <main className="container py-4">
      <section className="card shadow-sm p-4">
        <h1 className="h4">Create a new plan in {parche.name}</h1>
        <p className="small text-muted mb-4">
          Any member can create a plan, but only owners and moderators can move it through the state machine.
        </p>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <FeedbackAlert status={status} message={message} className="mb-3" />

          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="plan-title">Title</label>
              <input
                id="plan-title"
                className="form-control"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                minLength={4}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="plan-voting-deadline">Voting deadline</label>
              <input
                id="plan-voting-deadline"
                className="form-control"
                type="datetime-local"
                value={votingDeadline}
                onChange={(event) => setVotingDeadline(event.target.value)}
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="plan-description">Description</label>
              <textarea
                id="plan-description"
                className="form-control"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
                minLength={10}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="plan-date-start">Date start</label>
              <input
                id="plan-date-start"
                className="form-control"
                type="date"
                value={dateStart}
                onChange={(event) => setDateStart(event.target.value)}
                required
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="plan-date-end">Date end</label>
              <input
                id="plan-date-end"
                className="form-control"
                type="date"
                value={dateEnd}
                onChange={(event) => setDateEnd(event.target.value)}
                required
                min={dateStart || undefined}
              />
            </div>
          </div>

          <h2 className="h5 mt-4">Options (minimum 3)</h2>
          {options.map((option, index) => (
            <div className="row g-2 mb-2" key={`plan-option-${index + 1}`}>
              <div className="col-12 col-md-8">
                <label className="form-label" htmlFor={`plan-option-place-${index + 1}`}>
                  Option {index + 1} place
                </label>
                <input
                  id={`plan-option-place-${index + 1}`}
                  className="form-control"
                  value={option.place}
                  onChange={(event) => handleOptionChange(index, "place", event.target.value)}
                  required
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor={`plan-option-time-${index + 1}`}>
                  Option {index + 1} time
                </label>
                <input
                  id={`plan-option-time-${index + 1}`}
                  className="form-control"
                  type="time"
                  value={option.time}
                  onChange={(event) => handleOptionChange(index, "time", event.target.value)}
                  required
                />
              </div>
            </div>
          ))}

          <button type="submit" className="btn btn-primary mt-2" disabled={status === "loading"}>
            {status === "loading" ? "Creating plan..." : "Create plan"}
          </button>
        </form>
      </section>
    </main>
  );
}
