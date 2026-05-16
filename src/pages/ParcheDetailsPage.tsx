import { useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router";
import PlanCard from "../components/plans/PlanCard";
import FeedbackAlert from "../components/ui/FeedbackAlert";
import EmptyState from "../components/ui/EmptyState";
import { useAppContext } from "../context/useAppContext";
import { ParcheRoleEnum, type RequestStatus } from "../types";

export default function ParcheDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { currentUser, parches, users, plans, updateRole } = useAppContext();

  const [status, setStatus] = useState<RequestStatus>("idle");
  const [message, setMessage] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const parcheId = id ?? "";
  const parche = parches.find((item) => item.id === parcheId);

  if (!parche) {
    return (
      <main className="container py-4">
        <Link to="/" className="btn btn-link ps-0 mb-2">
          &larr; Back home
        </Link>

        <EmptyState
          title="Parche not found"
          description="The parche does not exist or was removed."
        />
      </main>
    );
  }

  const activeParche = parche;

  const currentMembership = activeParche.members.find(
    (member) => member.userId === currentUser.id
  );

  if (!currentMembership) {
    return (
      <main className="container py-4">
        <Link to="/" className="btn btn-link ps-0 mb-2">
          &larr; Back home
        </Link>

        <EmptyState
          title="Access restricted"
          description="You must belong to this parche before viewing its members and plans."
        />
      </main>
    );
  }

  const notice =
    typeof location.state === "object" &&
    location.state &&
    "notice" in location.state
      ? String(location.state.notice ?? "")
      : "";

  const visibleStatus = message ? status : notice ? "success" : "idle";
  const visibleMessage = message || notice;
  const canManageRoles = currentMembership.role === ParcheRoleEnum.owner;
  const parchePlans = plans.filter((plan) => plan.parcheId === activeParche.id);
  const invitePath = `/parches/new?invite=${encodeURIComponent(
    activeParche.inviteCode
  )}`;

  async function handleRoleChange(
    targetUserId: string,
    role: ParcheRoleEnum
  ) {
    setStatus("loading");
    setMessage("");
    setPendingUserId(targetUserId);

    const result = await updateRole(activeParche.id, targetUserId, role);

    setStatus(result.success ? "success" : "error");
    setMessage(result.message);
    setPendingUserId(null);
  }

  return (
    <main className="container py-4">
      <Link to="/" className="btn btn-link ps-0 mb-2">
        &larr; Back home
      </Link>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="h3 mb-0">{activeParche.name}</h1>
          <p className="text-muted mb-0">{activeParche.description}</p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <Link
            to={`/parches/${activeParche.id}/plans/new`}
            className="btn btn-primary"
          >
            Create plan
          </Link>

          <Link to={invitePath} className="btn btn-outline-secondary">
            Open invite link
          </Link>
        </div>
      </div>

      <FeedbackAlert
        status={visibleStatus}
        message={visibleMessage}
        className="mb-3"
      />

      <section className="card p-3 mb-3 shadow-sm">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h2 className="h5 mb-1">Invite info</h2>
            <p className="small text-muted mb-0">
              Share the code <strong>{activeParche.inviteCode}</strong> or the
              invite link to let classmates join.
            </p>
          </div>

          <Link to={invitePath} className="btn btn-sm btn-outline-primary">
            Use invite link
          </Link>
        </div>
      </section>

      <section className="card p-3 mb-3 shadow-sm">
        <h2 className="h5">Members</h2>

        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {activeParche.members.map((member) => {
                const user = users.find((item) => item.id === member.userId);

                const memberName =
                  user?.fullName ??
                  member.fullName ??
                  member.email ??
                  "Unknown";

                const memberAvatarUrl = user?.avatarUrl ?? member.avatarUrl;
                const memberInitial = memberName.charAt(0).toUpperCase();

                const isOwner = member.role === ParcheRoleEnum.owner;

                const nextRole =
                  member.role === ParcheRoleEnum.member
                    ? ParcheRoleEnum.moderator
                    : ParcheRoleEnum.member;

                const isPending =
                  pendingUserId === member.userId && status === "loading";

                return (
                  <tr key={member.userId}>
                    <td>
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
                    </td>

                    <td>{member.role}</td>

                    <td>
                      {canManageRoles && !isOwner ? (
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() =>
                            void handleRoleChange(member.userId, nextRole)
                          }
                          disabled={isPending}
                        >
                          {isPending
                            ? "Saving..."
                            : member.role === ParcheRoleEnum.member
                              ? "Promote"
                              : "Demote"}
                        </button>
                      ) : (
                        <span className="text-muted small">
                          {isOwner
                            ? "Owner role is fixed"
                            : "Only the owner can change roles"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
          <h2 className="h5 mb-0">Plans</h2>

          <Link to="/rankings" className="btn btn-sm btn-outline-dark">
            View rankings
          </Link>
        </div>

        {parchePlans.length === 0 ? (
          <EmptyState
            title="No plans yet"
            description="Create the first plan for this parche."
          />
        ) : (
          parchePlans.map((plan) => <PlanCard key={plan.id} plan={plan} />)
        )}
      </section>
    </main>
  );
}