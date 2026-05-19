import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import EmptyState from "../components/ui/EmptyState";
import { useAppContext } from "../context/useAppContext";
import { getRankings, type RankingEntry } from "../services/parcheApi";

export default function RankingsPage() {
  const { currentUser, parches } = useAppContext();
  const [selectedParcheId, setSelectedParcheId] = useState<string>("");
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const userParches = parches.filter((parche) =>
    parche.members.some((member) => member.userId === currentUser?.id)
  );

  const selectedParche =
    userParches.find((parche) => parche.id === selectedParcheId) ??
    userParches[0];

  useEffect(() => {
    if (!selectedParche) return;

    let active = true;
    setLoading(true);

    async function fetchRankings() {
      try {
        const data = await getRankings(selectedParche.id);
        if (active) setRankings(data);
      } catch {
        if (active) setRankings([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchRankings();

    return () => {
      active = false;
    };
  }, [selectedParche?.id]);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

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

  const organizerBoard = [...rankings].sort(
    (a, b) => b.organizerScore - a.organizerScore || a.fullName.localeCompare(b.fullName)
  );

  const ghostBoard = [...rankings].sort(
    (a, b) => b.ghostScore - a.ghostScore || a.fullName.localeCompare(b.fullName)
  );

  function getAvatar(userId: string): string | undefined {
    const member = selectedParche?.members.find((m) => m.userId === userId);
    return member?.avatarUrl;
  }

  function renderRow(entry: RankingEntry, score: number, index: number) {
    const avatarUrl = getAvatar(entry.userId);
    const initial = entry.fullName.charAt(0).toUpperCase();

    return (
      <tr key={entry.userId}>
        <td className="text-center" style={{ width: 40 }}>
          <strong>{index + 1}</strong>
        </td>
        <td>
          <div className="d-flex align-items-center gap-2">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={entry.fullName}
                width={28}
                height={28}
                className="rounded-circle"
              />
            ) : (
              <div
                className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                style={{ width: 28, height: 28, fontSize: 11 }}
              >
                {initial}
              </div>
            )}
            <span>{entry.fullName}</span>
          </div>
        </td>
        <td className="text-center">{score}</td>
      </tr>
    );
  }

  return (
    <main className="container py-4">
      <Link to="/" className="btn btn-link ps-0">
        &larr; Back home
      </Link>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <h1 className="h4 mb-0">Rankings</h1>

        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="ranking-parche-select">
            Selected parche
          </label>
          <select
            id="ranking-parche-select"
            className="form-select"
            value={selectedParche?.id ?? ""}
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

      {loading ? (
        <p className="text-muted">Loading rankings...</p>
      ) : rankings.length === 0 ? (
        <p className="text-muted">No ranking data available for this parche yet.</p>
      ) : (
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <section className="card shadow-sm p-4">
              <h2 className="h5 mb-1">Organizer Board</h2>
              <p className="small text-muted mb-3">
                Plans created that reached Scheduled state. Higher is better.
              </p>

              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th className="text-center">#</th>
                      <th>Member</th>
                      <th className="text-center">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizerBoard.map((entry, i) =>
                      renderRow(entry, entry.organizerScore, i)
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="col-12 col-lg-6">
            <section className="card shadow-sm p-4">
              <h2 className="h5 mb-1">Ghost Board</h2>
              <p className="small text-muted mb-3">
                RSVPs "Yes" but never checked in. Higher is worse.
              </p>

              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th className="text-center">#</th>
                      <th>Member</th>
                      <th className="text-center">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ghostBoard.map((entry, i) =>
                      renderRow(entry, entry.ghostScore, i)
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
