import { apiRequest } from "./apiClient";
import {
  AttendanceStatusEnum,
  PlanStateEnum,
  type Attendance,
  type NewPlanData,
  type Plan,
  type Vote,
} from "../types";

type PlanOptionResponseDTO = {
  id?: string;
  idOption?: string;
  IdOption?: string;
  optionId?: string;

  place?: string;
  Place?: string;
  lugar?: string;

  time?: string;
  Time?: string;
  hora?: string;

  voteCount?: number;
  VoteCount?: number;
};

type PlanAttendanceResponseDTO = {
  userId?: string;
  UserId?: string;

  fullName?: string;
  FullName?: string;

  email?: string;
  Email?: string;

  avatarUrl?: string | null;
  AvatarUrl?: string | null;

  status?: string;
  Status?: string;

  checkedIn?: boolean;
  CheckedIn?: boolean;
};

type PlanResponseDTO = {
  id?: string;
  idPlan?: string;
  IdPlan?: string;
  planId?: string;

  parcheId?: string;
  ParcheId?: string;
  idParche?: string;

  createdBy?: string;
  CreatedBy?: string;
  createdById?: string;
  creatorId?: string;
  userId?: string;

  title?: string;
  Title?: string;
  titulo?: string;

  description?: string;
  Description?: string;
  descripcion?: string;

  dateStart?: string;
  DateStart?: string;
  fechaInicio?: string;

  dateEnd?: string;
  DateEnd?: string;
  fechaFin?: string;

  votingDeadline?: string;
  VotingDeadline?: string;
  fechaLimiteVotacion?: string;

  state?: string;
  State?: string;
  estado?: string;

  options?: PlanOptionResponseDTO[];
  Options?: PlanOptionResponseDTO[];
  opciones?: PlanOptionResponseDTO[];

  attendance?: PlanAttendanceResponseDTO[];
  Attendance?: PlanAttendanceResponseDTO[];

  winningOptionId?: string;
  WinningOptionId?: string;
  idWinningOption?: string;
  winnerOptionId?: string;

  checkInStart?: string;
  CheckInStart?: string;

  checkInEnd?: string;
  CheckInEnd?: string;

  currentUserVoteOptionId?: string | null;
  CurrentUserVoteOptionId?: string | null;

  currentUserAttendanceStatus?: string | null;
  CurrentUserAttendanceStatus?: string | null;

  currentUserCheckedIn?: boolean;
  CurrentUserCheckedIn?: boolean;
};

type MessageResponse = {
  message?: string;
  mensaje?: string;
};

export type PlanOptionFromApi = Plan["options"][number] & {
  voteCount: number;
};

export type PlanFromApi = Omit<Plan, "options"> & {
  options: PlanOptionFromApi[];
  currentUserVoteOptionId?: string;
  currentUserAttendanceStatus?: AttendanceStatusEnum;
  currentUserCheckedIn: boolean;
  attendance: Attendance[];
};

function normalizePlanState(value?: string): PlanStateEnum {
  if (!value) {
    return PlanStateEnum.draft;
  }

  const normalizedValue = value.toLowerCase();

  if (
    normalizedValue === PlanStateEnum.draft.toLowerCase() ||
    normalizedValue === "draft" ||
    normalizedValue === "borrador"
  ) {
    return PlanStateEnum.draft;
  }

  if (
    normalizedValue === PlanStateEnum.votingOpen.toLowerCase() ||
    normalizedValue === "votingopen" ||
    normalizedValue === "voting_open" ||
    normalizedValue === "voting open" ||
    normalizedValue === "abierto" ||
    normalizedValue === "votacionabierta"
  ) {
    return PlanStateEnum.votingOpen;
  }

  if (
    normalizedValue === PlanStateEnum.votingClosed.toLowerCase() ||
    normalizedValue === "votingclosed" ||
    normalizedValue === "voting_closed" ||
    normalizedValue === "voting closed" ||
    normalizedValue === "cerrado" ||
    normalizedValue === "votacioncerrada"
  ) {
    return PlanStateEnum.votingClosed;
  }

  if (
    normalizedValue === PlanStateEnum.scheduled.toLowerCase() ||
    normalizedValue === "scheduled" ||
    normalizedValue === "programado"
  ) {
    return PlanStateEnum.scheduled;
  }

  return PlanStateEnum.draft;
}

function normalizeAttendanceStatus(
  value?: string | null
): AttendanceStatusEnum | undefined {
  if (!value) {
    return undefined;
  }

  const normalizedValue = value.toLowerCase();

  if (
    normalizedValue === "yes" ||
    normalizedValue === AttendanceStatusEnum.yes.toLowerCase()
  ) {
    return AttendanceStatusEnum.yes;
  }

  if (
    normalizedValue === "no" ||
    normalizedValue === AttendanceStatusEnum.no.toLowerCase()
  ) {
    return AttendanceStatusEnum.no;
  }

  if (
    normalizedValue === "maybe" ||
    normalizedValue === AttendanceStatusEnum.maybe.toLowerCase()
  ) {
    return AttendanceStatusEnum.maybe;
  }

  return undefined;
}

function normalizeDateOnly(value?: string): string {
  if (!value) {
    return "";
  }

  return value.includes("T") ? value.split("T")[0] : value;
}

function normalizeDateTime(value?: string): string {
  return value ?? "";
}

function normalizeMessage(response: MessageResponse, fallback: string): string {
  return response.message ?? response.mensaje ?? fallback;
}

function normalizePlanOption(
  option: PlanOptionResponseDTO,
  index: number
): PlanOptionFromApi {
  return {
    id:
      option.id ??
      option.idOption ??
      option.IdOption ??
      option.optionId ??
      String(index + 1),
    place: option.place ?? option.Place ?? option.lugar ?? "",
    time: option.time ?? option.Time ?? option.hora ?? "",
    voteCount: Number(option.voteCount ?? option.VoteCount ?? 0),
  };
}

function normalizePlanAttendance(
  entry: PlanAttendanceResponseDTO,
  planId: string
): Attendance | null {
  const userId = entry.userId ?? entry.UserId ?? "";
  const status = normalizeAttendanceStatus(entry.status ?? entry.Status);

  if (!userId || !status) {
    return null;
  }

  return {
    planId,
    userId,
    status,
    checkedIn: entry.checkedIn ?? entry.CheckedIn ?? false,
  };
}

function normalizePlan(plan: PlanResponseDTO): PlanFromApi {
  const id = plan.id ?? plan.idPlan ?? plan.IdPlan ?? plan.planId ?? "";

  const parcheId = plan.parcheId ?? plan.ParcheId ?? plan.idParche ?? "";

  const createdBy =
    plan.createdBy ??
    plan.CreatedBy ??
    plan.createdById ??
    plan.creatorId ??
    plan.userId ??
    "";

  const optionsSource = plan.options ?? plan.Options ?? plan.opciones ?? [];
  const attendanceSource = plan.attendance ?? plan.Attendance ?? [];

  const currentUserVoteOptionId =
    plan.currentUserVoteOptionId ??
    plan.CurrentUserVoteOptionId ??
    undefined;

  const currentUserAttendanceStatus = normalizeAttendanceStatus(
    plan.currentUserAttendanceStatus ?? plan.CurrentUserAttendanceStatus
  );

  const currentUserCheckedIn =
    plan.currentUserCheckedIn ?? plan.CurrentUserCheckedIn ?? false;

  const normalizedAttendance = attendanceSource
    .map((entry) => normalizePlanAttendance(entry, id))
    .filter((entry): entry is Attendance => entry !== null);

  return {
    id,
    parcheId,
    createdBy,
    title: plan.title ?? plan.Title ?? plan.titulo ?? "",
    description: plan.description ?? plan.Description ?? plan.descripcion ?? "",
    dateStart: normalizeDateOnly(
      plan.dateStart ?? plan.DateStart ?? plan.fechaInicio
    ),
    dateEnd: normalizeDateOnly(plan.dateEnd ?? plan.DateEnd ?? plan.fechaFin),
    votingDeadline: normalizeDateTime(
      plan.votingDeadline ?? plan.VotingDeadline ?? plan.fechaLimiteVotacion
    ),
    state: normalizePlanState(plan.state ?? plan.State ?? plan.estado),
    options: optionsSource.map(normalizePlanOption),
    winningOptionId:
      plan.winningOptionId ??
      plan.WinningOptionId ??
      plan.idWinningOption ??
      plan.winnerOptionId ??
      undefined,
    checkInStart: plan.checkInStart ?? plan.CheckInStart ?? "",
    checkInEnd: plan.checkInEnd ?? plan.CheckInEnd ?? "",
    currentUserVoteOptionId: currentUserVoteOptionId ?? undefined,
    currentUserAttendanceStatus,
    currentUserCheckedIn,
    attendance: normalizedAttendance,
  };
}

function toCreatePlanRequest(data: NewPlanData) {
  return {
    parcheId: data.parcheId,
    title: data.title,
    description: data.description,
    dateStart: data.dateStart,
    dateEnd: data.dateEnd,
    votingDeadline: data.votingDeadline,
    options: data.options.map((option) => ({
      place: option.place,
      time: option.time,
    })),
  };
}

export function extractVotesFromPlans(
  plans: PlanFromApi[],
  currentUserId: string
): Vote[] {
  return plans
    .filter((plan) => Boolean(plan.currentUserVoteOptionId))
    .map((plan) => ({
      planId: plan.id,
      userId: currentUserId,
      optionId: plan.currentUserVoteOptionId as string,
    }));
}

export function extractAttendanceFromPlans(
  plans: PlanFromApi[],
  currentUserId: string
): Attendance[] {
  const attendanceFromBackend = plans.flatMap((plan) => plan.attendance);

  if (attendanceFromBackend.length > 0) {
    return attendanceFromBackend;
  }

  return plans
    .filter((plan) => Boolean(plan.currentUserAttendanceStatus))
    .map((plan) => ({
      planId: plan.id,
      userId: currentUserId,
      status: plan.currentUserAttendanceStatus as AttendanceStatusEnum,
      checkedIn: plan.currentUserCheckedIn,
    }));
}

export async function getPlansByParche(
  parcheId: string
): Promise<PlanFromApi[]> {
  const response = await apiRequest<PlanResponseDTO[]>(
    `/api/parches/${parcheId}/plans`
  );

  return response.map(normalizePlan);
}

export async function createPlan(data: NewPlanData): Promise<PlanFromApi> {
  const response = await apiRequest<PlanResponseDTO>("/api/plans", {
    method: "POST",
    body: JSON.stringify(toCreatePlanRequest(data)),
  });

  return normalizePlan(response);
}

export async function movePlanState(planId: string): Promise<PlanFromApi> {
  const response = await apiRequest<PlanResponseDTO>(
    `/api/plans/${planId}/state`,
    {
      method: "PATCH",
    }
  );

  return normalizePlan(response);
}

export async function voteForOption(
  planId: string,
  optionId: string
): Promise<string> {
  const response = await apiRequest<MessageResponse>(
    `/api/plans/${planId}/votes`,
    {
      method: "POST",
      body: JSON.stringify({ optionId }),
    }
  );

  return normalizeMessage(response, "Vote recorded successfully.");
}

export async function setAttendanceStatus(
  planId: string,
  status: AttendanceStatusEnum
): Promise<string> {
  const response = await apiRequest<MessageResponse>(
    `/api/plans/${planId}/attendance`,
    {
      method: "PUT",
      body: JSON.stringify({ status }),
    }
  );

  return normalizeMessage(response, `Attendance updated to ${status}.`);
}

export async function setPlanCheckIn(planId: string): Promise<string> {
  const response = await apiRequest<MessageResponse>(
    `/api/plans/${planId}/check-in`,
    {
      method: "POST",
    }
  );

  return normalizeMessage(response, "Check-in completed successfully.");
}