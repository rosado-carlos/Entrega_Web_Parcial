export enum ParcheRoleEnum {
  owner = "Owner",
  moderator = "Moderator",
  member = "Member",
}

export enum PlanStateEnum {
  draft = "Draft",
  votingOpen = "VotingOpen",
  votingClosed = "VotingClosed",
  scheduled = "Scheduled",
}

export enum AttendanceStatusEnum {
  yes = "Yes",
  no = "No",
  maybe = "Maybe",
}

export type RequestStatus = "idle" | "loading" | "success" | "error";

export type ActionResult = {
  success: boolean;
  message: string;
};

export type User = {
  id: number;
  fullName: string;
  email: string;
  major: string;
  avatarUrl?: string;
  password: string;
};

export type ParcheMember = {
  userId: number;
  role: ParcheRoleEnum;
};

export type Parche = {
  id: number;
  name: string;
  description: string;
  coverImageUrl: string;
  inviteCode: string;
  members: ParcheMember[];
};

export type PlanOption = {
  id: number;
  place: string;
  time: string;
};

export type Vote = {
  planId: number;
  userId: number;
  optionId: number;
};

export type Attendance = {
  planId: number;
  userId: number;
  status: AttendanceStatusEnum;
  checkedIn: boolean;
};

export type Plan = {
  id: number;
  parcheId: number;
  createdBy: number;
  title: string;
  description: string;
  dateStart: string;
  dateEnd: string;
  state: PlanStateEnum;
  options: PlanOption[];
  winningOptionId?: number;
  votingDeadline: string;
  checkInStart: string;
  checkInEnd: string;
};

export type AppData = {
  users: User[];
  parches: Parche[];
  plans: Plan[];
  votes: Vote[];
  attendance: Attendance[];
  currentUserId: number | null;
};

export type RegisterData = {
  fullName: string;
  email: string;
  major: string;
  password: string;
  avatarUrl?: string;
};

export type NewParcheData = {
  name: string;
  description: string;
  coverImageUrl: string;
};

export type NewPlanData = {
  parcheId: number;
  title: string;
  description: string;
  dateStart: string;
  dateEnd: string;
  votingDeadline: string;
  options: { place: string; time: string }[];
};

export type AppDataResult = ActionResult & {
  data: AppData;
};
