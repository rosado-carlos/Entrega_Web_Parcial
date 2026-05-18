import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import FeedbackAlert from "../components/ui/FeedbackAlert";
import EmptyState from "../components/ui/EmptyState";
import { useAppContext } from "../context/useAppContext";
import { getAttendanceForPlan, getAllAttendanceForPlan } from "../services/planApi";
import {
  AttendanceStatusEnum,
  ParcheRoleEnum,
  PlanStateEnum,
  type Attendance,
  type Plan,
  type RequestStatus,
} from "../types";

type OptionWithVoteCount = Plan["options"][number] & {
  voteCount?: number;
};

export default function PlanDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const {
    currentUser,
    users,
    parches,
    plans,
    votes,
    attendance,
    movePlanState,
    voteForOption,
    setAttendance,
    setCheckIn,
  } = useAppContext();

  const [stateStatus, setStateStatus] = useState<RequestStatus>("idle");
  const [stateMessage, setStateMessage] = useState("");
  const [voteStatus, setVoteStatus] = useState<RequestStatus>("idle");
  const [voteMessage, setVoteMessage] = useState("");
  const [attendanceStatus, setAttendanceStatusMessage] =
    useState<RequestStatus>("idle");
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [checkInStatus, setCheckInStatus] = useState<RequestStatus>("idle");
  const [checkInMessage, setCheckInMessage] = useState("");

  const [fetchedAttendanceStatus, setFetchedAttendanceStatus] =
    useState<AttendanceStatusEnum | null>(null);
  const [fetchedCheckedIn, setFetchedCheckedIn] = useState(false);
  const [fetchedAllAttendance, setFetchedAllAttendance] = useState<Attendance[]>([]);

  const planId = id ?? "";

  useEffect(() => {
    let active = true;

    async function loadAttendance() {
      try {
        const [myResult, allResult] = await Promise.all([
          getAttendanceForPlan(planId),
          getAllAttendanceForPlan(planId).catch(() => [] as Attendance[]),
        ]);

        if (active) {
          setFetchedAttendanceStatus(myResult.status);
          setFetchedCheckedIn(myResult.checkedIn);
          setFetchedAllAttendance(allResult);
        }
      } catch {
        // If it fails, leave as defaults
      }
    }

    if (planId) {
      void loadAttendance();
    }

    return () => {
      active = false;
    };
  }, [planId]);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const plan = plans.find((item) => item.id === planId);

  if (!plan) {
    return (
      <main className="container py-4">
        <Link to="/" className="btn btn-link ps-0">
          &larr; Back home
        </Link>

        <EmptyState
          title="Plan not found"
          description="The plan was removed or does not exist."
        />
      </main>
    );
  }

  const activePlan = plan;

  const parche = parches.find((item) => item.id === activePlan.parcheId);

  if (!parche) {
    return (
      <main className="container py-4">
        <Link to="/" className="btn btn-link ps-0">
          &larr; Back home
        </Link>

        <EmptyState
          title="Parche not found"
          description="The parent parche for this plan no longer exists."
        />
      </main>
    );
  }

  const activeParche = parche;

  const member = activeParche.members.find(
    (item) => item.userId === currentUser.id
  );

  if (!member) {
    return (
      <main className="container py-4">
        <Link
          to={`/parches/${activePlan.parcheId}`}
          className="btn btn-link ps-0"
        >
          &larr; Back to parche
        </Link>

        <EmptyState
          title="Access restricted"
          description="Only members of this parche can see its plans, vote, and check in."
        />
      </main>
    );
  }

  const canManageState =
    member.role === ParcheRoleEnum.owner ||
    member.role === ParcheRoleEnum.moderator;

  function getOptionVoteCount(option: Plan["options"][number]): number {
    const optionWithVoteCount = option as OptionWithVoteCount;

    return (
      optionWithVoteCount.voteCount ??
      votes.filter(
        (vote) => vote.planId === activePlan.id && vote.optionId === option.id
      ).length
    );
  }

  const totalVotes = activePlan.options.reduce(
    (sum, option) => sum + getOptionVoteCount(option),
    0
  );

  const planAttendance = fetchedAllAttendance.length > 0
    ? fetchedAllAttendance
    : attendance.filter((item) => item.planId === activePlan.id);

  const myAttendance = planAttendance.find(
    (item) => item.userId === currentUser.id
  );

  const effectiveAttendanceStatus =
    fetchedAttendanceStatus ?? myAttendance?.status ?? null;
  const effectiveCheckedIn =
    fetchedCheckedIn || (myAttendance?.checkedIn ?? false);

  const myVote = votes.find(
    (vote) => vote.planId === activePlan.id && vote.userId === currentUser.id
  );

  const isVotingOpen = activePlan.state === PlanStateEnum.votingOpen;
  const checkInNow = new Date();
  const checkInStart = new Date(activePlan.checkInStart);
  const checkInEnd = new Date(activePlan.checkInEnd);
  const canCheckInNow = checkInNow >= checkInStart && checkInNow <= checkInEnd;

  const canCheckIn =
    canCheckInNow &&
    effectiveAttendanceStatus === AttendanceStatusEnum.yes &&
    !effectiveCheckedIn;

  const winningOption = activePlan.options.find(
    (option) => option.id === activePlan.winningOptionId
  );

  function getPercentage(optionVotes: number): number {
    if (totalVotes === 0) {
      return 0;
    }

    return Math.round((optionVotes / totalVotes) * 100);
  }

  function getNextStateButtonText(currentPlan: Plan): string {
    if (currentPlan.state === PlanStateEnum.draft) return "Open voting";
    if (currentPlan.state === PlanStateEnum.votingOpen) return "Close voting";
    if (currentPlan.state === PlanStateEnum.votingClosed) return "Schedule plan";
    return "No more actions";
  }

  async function handleMoveState() {
    setStateStatus("loading");
    setStateMessage("");

    const result = await movePlanState(activePlan.id);

    setStateStatus(result.success ? "success" : "error");
    setStateMessage(result.message);
  }

  async function handleVote(optionId: string) {
    setVoteStatus("loading");
    setVoteMessage("");

    const result = await voteForOption(activePlan.id, optionId);

    setVoteStatus(result.success ? "success" : "error");
    setVoteMessage(result.message);
  }

  async function handleAttendance(status: AttendanceStatusEnum) {
    setAttendanceStatusMessage("loading");
    setAttendanceMessage("");

    const result = await setAttendance(activePlan.id, status);

    setAttendanceStatusMessage(result.success ? "success" : "error");
    setAttendanceMessage(result.message);

    if (result.success) {
      setFetchedAttendanceStatus(status);

      if (status !== AttendanceStatusEnum.yes) {
        setFetchedCheckedIn(false);
      }

      // Refetch full attendance list
      try {
        const allResult = await getAllAttendanceForPlan(activePlan.id);
        setFetchedAllAttendance(allResult);
      } catch {
        // ignore
      }
    }
  }

  async function handleCheckIn() {
    setCheckInStatus("loading");
    setCheckInMessage("");

    const result = await setCheckIn(activePlan.id);

    setCheckInStatus(result.success ? "success" : "error");
    setCheckInMessage(result.message);

    if (result.success) {
      setFetchedCheckedIn(true);
    }
  }

  return (
    <main className="container py-4">
      <Link to={`/parches/${activePlan.parcheId}`} className="btn btn-link ps-0">
        &larr; Back to parche
      </Link>

      <section className="card shadow-sm p-4 mb-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <h1 className="h4 mb-1">{activePlan.title}</h1>
            <p className="text-muted mb-1">{activePlan.description}</p>
            <p className="small mb-1">
              <strong>State:</strong> {activePlan.state}
            </p>
            <p className="small text-muted mb-0">
              Voting deadline:{" "}
              {new Date(activePlan.votingDeadline).toLocaleString()}
            </p>
          </div>

          <div className="text-end">
            {canManageState && activePlan.state !== PlanStateEnum.scheduled ? (
              <button
                className="btn btn-outline-dark"
                onClick={() => void handleMoveState()}
                disabled={stateStatus === "loading"}
              >
                {stateStatus === "loading"
                  ? "Updating..."
                  : getNextStateButtonText(activePlan)}
              </button>
            ) : (
              <p className="small text-muted mb-0">
                Only owners and moderators can move this plan forward.
              </p>
            )}
          </div>
        </div>

        <FeedbackAlert
          status={stateStatus}
          message={stateMessage}
          className="mt-3 mb-0"
        />
      </section>

      <section className="card shadow-sm p-4 mb-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h2 className="h5 mb-0">Voting options</h2>
            <p className="small text-muted mb-0">
              Tie-breaking rule: the earliest created option wins any tie.
            </p>
          </div>

          {myVote && (
            <span className="badge bg-primary">You have an active vote</span>
          )}
        </div>

        <FeedbackAlert status={voteStatus} message={voteMessage} className="mb-3" />

        {activePlan.options.map((option) => {
          const optionVotes = getOptionVoteCount(option);
          const percentage = getPercentage(optionVotes);
          const isMyVote = myVote?.optionId === option.id;

          return (
            <div
              key={option.id}
              className={`border rounded p-3 mb-2 ${
                isMyVote ? "border-primary bg-primary-subtle shadow-sm" : ""
              }`}
            >
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                <div>
                  <p className="mb-1">
                    <strong>{option.place}</strong> at {option.time}
                  </p>
                  <p className="small text-muted mb-2">
                    {optionVotes} votes ({percentage}%)
                  </p>
                </div>

                <div className="d-flex flex-wrap align-items-center gap-2">
                  {isMyVote && <span className="badge bg-primary">Your vote</span>}
                  {activePlan.winningOptionId === option.id && (
                    <span className="badge bg-success">Winner</span>
                  )}
                </div>
              </div>

              {isVotingOpen ? (
                <button
                  className={`btn btn-sm ${isMyVote ? "btn-success" : "btn-primary"}`}
                  onClick={() => void handleVote(option.id)}
                  disabled={voteStatus === "loading" || isMyVote}
                >
                  {isMyVote ? "Selected" : myVote ? "Change vote" : "Vote"}
                </button>
              ) : (
                <p className="small text-muted mb-0">
                  Voting is closed for this plan.
                </p>
              )}
            </div>
          );
        })}
      </section>

      <section className="card shadow-sm p-4 mb-3">
        <h2 className="h5">Attendance</h2>
        <p className="small text-muted">Set whether you are going to the plan.</p>

        <FeedbackAlert
          status={attendanceStatus}
          message={attendanceMessage}
          className="mb-3"
        />

        <div className="d-flex flex-wrap gap-2 mb-3">
          <button
            className="btn btn-success btn-sm"
            onClick={() => void handleAttendance(AttendanceStatusEnum.yes)}
            disabled={attendanceStatus === "loading"}
          >
            Yes
          </button>

          <button
            className="btn btn-danger btn-sm"
            onClick={() => void handleAttendance(AttendanceStatusEnum.no)}
            disabled={attendanceStatus === "loading"}
          >
            No
          </button>

          <button
            className="btn btn-warning btn-sm"
            onClick={() => void handleAttendance(AttendanceStatusEnum.maybe)}
            disabled={attendanceStatus === "loading"}
          >
            Maybe
          </button>
        </div>

        <p className="small mb-2">
          Your current status: <strong>{effectiveAttendanceStatus ?? "Not set"}</strong>
        </p>

        <h3 className="h6">Attendance list</h3>

        {planAttendance.length === 0 ? (
          <p className="text-muted small mb-0">
            No one has confirmed attendance yet.
          </p>
        ) : (
          <ul className="list-group">
            {planAttendance.map((item) => {
              const memberItem = activeParche.members.find(
                (memberCandidate) => memberCandidate.userId === item.userId
              );

              const user = users.find(
                (candidate) => candidate.id === item.userId
              );

              const memberName =
                user?.fullName ??
                memberItem?.fullName ??
                memberItem?.email ??
                "Unknown";

              const memberAvatarUrl = user?.avatarUrl ?? memberItem?.avatarUrl;
              const memberInitial = memberName.charAt(0).toUpperCase();

              return (
                <li
                  key={`${activePlan.id}-${item.userId}`}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div className="d-flex align-items-center gap-2">
                    {memberAvatarUrl ? (
                      <img
                        src={memberAvatarUrl}
                        alt={memberName}
                        width={32}
                        height={32}
                        className="rounded-circle"
                      />
                    ) : (
                      <div
                        className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                        style={{ width: 32, height: 32, fontSize: 12 }}
                      >
                        {memberInitial}
                      </div>
                    )}

                    <span>{memberName}</span>
                  </div>

                  <span>
                    {item.status} {item.checkedIn ? "Checked in" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card shadow-sm p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
          <div>
            <h2 className="h5 mb-1">Check-in</h2>
            <p className="small text-muted mb-0">
              Window: {checkInStart.toLocaleString()} to{" "}
              {checkInEnd.toLocaleString()}
            </p>
          </div>

          {winningOption && (
            <span className="badge bg-success">
              Winner: {winningOption.place} at {winningOption.time}
            </span>
          )}
        </div>

        <FeedbackAlert
          status={checkInStatus}
          message={checkInMessage}
          className="mb-3"
        />

        <button
          className="btn btn-outline-success"
          disabled={!canCheckIn || checkInStatus === "loading"}
          onClick={() => void handleCheckIn()}
        >
          {checkInStatus === "loading"
            ? "Checking in..."
            : effectiveCheckedIn
              ? "Checked in"
              : "Check in now"}
        </button>

        {!canCheckInNow && (
          <p className="small text-muted mt-2 mb-0">
            Check-in is blocked because the current time is outside the allowed
            window.
          </p>
        )}

        {effectiveAttendanceStatus !== AttendanceStatusEnum.yes && (
          <p className="small text-muted mt-2 mb-0">
            Set your attendance to Yes before trying to check in.
          </p>
        )}
      </section>
    </main>
  );
}