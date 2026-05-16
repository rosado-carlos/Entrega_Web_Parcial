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
  id: string;
  fullName: string;
  email: string;
  major: string;
  avatarUrl?: string;
  password?: string;
};

export type ParcheMember = {
  userId: string;
  role: ParcheRoleEnum;
  fullName?: string;
  email?: string;
  avatarUrl?: string;
};

export type Parche = {
  id: string;
  name: string;
  description: string;
  coverImageUrl: string;
  inviteCode: string;
  members: ParcheMember[];
};

export type PlanOption = {
  id: string;
  place: string;
  time: string;
};

export type Vote = {
  planId: string;
  userId: string;
  optionId: string;
};

export type Attendance = {
  planId: string;
  userId: string;
  status: AttendanceStatusEnum;
  checkedIn: boolean;
};

export type Plan = {
  id: string;
  parcheId: string;
  createdBy: string;
  title: string;
  description: string;
  dateStart: string;
  dateEnd: string;
  state: PlanStateEnum;
  options: PlanOption[];
  winningOptionId?: string;
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
  currentUserId: string | null;
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
  parcheId: string;
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