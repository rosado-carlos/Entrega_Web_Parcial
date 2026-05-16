import { useState } from "react";
import { Link, Navigate } from "react-router";
import EmptyState from "../components/ui/EmptyState";
import { useAppContext } from "../context/useAppContext";
import { AttendanceStatusEnum, PlanStateEnum } from "../types";

type RankingRow = {
  userId: string;
  fullName: string;
  organizerScore: number;
  ghostScore: number;
};

export default function RankingsPage() {
  const { currentUser, users, parches, plans, attendance } = useAppContext();
  const [selectedParcheId, setSelectedParcheId] = useState<string>("");

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const userParches = parches.filter((parche) =>
    parche.members.some((member) => member.userId === currentUser.id)
  );

  if (userParches.length === 0) {
    return (
      <main className="container py-4">
        <Link to="/" className="btn btn-link ps-0">
          &larr; Back home
        </Link>
        <EmptyState
          title="No parches yet"
          description="Join or create a parche to unlock rankings."
        />
      </main>
    );
  }

  const selectedParche =
    userParches.find((parche) => parche.id === selectedParcheId) ??
    userParches[0];

  const now = new Date();

  const rows: RankingRow[] = selectedParche.members
    .map((member) => {
      const user = users.find((candidate) => candidate.id === member.userId);

      const plansInSelectedParche = plans.filter(
        (plan) => plan.parcheId === selectedParche.id
      );

      const userPlans = plansInSelectedParche.filter(
        (plan) => plan.createdBy === member.userId
      );

      const organizerScore =
        userPlans.length +
        userPlans.filter((plan) => plan.state === PlanStateEnum.scheduled)
          .length;

      const userGhostScore = attendance.filter((entry) => {
        if (
          entry.userId !== member.userId ||
          entry.status !== AttendanceStatusEnum.yes ||
          entry.checkedIn
        ) {
          return false;
        }

        const relatedPlan = plansInSelectedParche.find(
          (plan) => plan.id === entry.planId
        );

        if (!relatedPlan) {
          return false;
        }

        return new Date(relatedPlan.checkInEnd) < now;
      }).length;

      return {
        userId: member.userId,
        fullName: user?.fullName ?? "Unknown",
        organizerScore,
        ghostScore: userGhostScore,
      };
    })
    .sort(
      (left, right) =>
        right.organizerScore - left.organizerScore ||
        left.ghostScore - right.ghostScore ||
        left.fullName.localeCompare(right.fullName)
    );

  const rowsWithActivity = rows.filter(
    (row) => row.organizerScore > 0 || row.ghostScore > 0
  );

  return (
    <main className="container py-4">
      <Link to="/" className="btn btn-link ps-0">
        &larr; Back home
      </Link>

      <section className="card shadow-sm p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <div>
            <h1 className="h4 mb-1">Parche ranking</h1>
            <p className="text-muted mb-0">
              Organizer score = plans created + plans scheduled. Ghost score =
              attendance Yes with no check-in after the check-in window closes.
            </p>
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="ranking-parche-select">
              Selected parche
            </label>
            <select
              id="ranking-parche-select"
              className="form-select"
              value={selectedParche.id}
              onChange={(event) => setSelectedParcheId(event.target.value)}
            >
              {userParches.map((parche) => (
                <option key={parche.id} value={parche.id}>
                  {parche.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {rowsWithActivity.length === 0 ? (
          <p className="mb-0">No ranking data available for this parche yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped align-middle mb-0">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Organizer score</th>
                  <th>Ghost score</th>
                </tr>
              </thead>
              <tbody>
                {rowsWithActivity.map((row) => (
                  <tr key={row.userId}>
                    <td>{row.fullName}</td>
                    <td>{row.organizerScore}</td>
                    <td>{row.ghostScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}