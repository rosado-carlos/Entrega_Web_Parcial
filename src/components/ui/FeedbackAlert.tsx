import type { RequestStatus } from "../../types";

type Props = {
  status: RequestStatus;
  message: string;
  className?: string;
};

export default function FeedbackAlert({ status, message, className = "" }: Props) {
  if (!message || status === "idle") {
    return null;
  }

  const variant =
    status === "error"
      ? "danger"
      : status === "success"
        ? "success"
        : "info";

  const role = status === "error" ? "alert" : "status";

  return (
    <div
      className={`alert alert-${variant} py-2 ${className}`.trim()}
      role={role}
      aria-live="polite"
    >
      {message}
    </div>
  );
}
