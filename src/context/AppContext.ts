import { createContext } from "react";
import {
  type ActionResult,
  AttendanceStatusEnum,
  type AppData,
  type NewParcheData,
  type NewPlanData,
  ParcheRoleEnum,
  type RegisterData,
  type Attendance,
  type Parche,
  type Plan,
  type User,
  type Vote,
} from "../types";

export type AppContextType = {
  appData: AppData;
  users: User[];
  parches: Parche[];
  plans: Plan[];
  votes: Vote[];
  attendance: Attendance[];
  currentUser: User | null;
  refreshAppData: () => Promise<ActionResult>;
  register: (data: RegisterData) => Promise<ActionResult>;
  login: (email: string, password: string) => Promise<ActionResult>;
  logout: () => Promise<ActionResult>;
  createParche: (data: NewParcheData) => Promise<ActionResult>;
  joinParche: (inviteCode: string) => Promise<ActionResult>;
  updateRole: (parcheId: number, targetUserId: number, role: ParcheRoleEnum) => Promise<ActionResult>;
  createPlan: (data: NewPlanData) => Promise<ActionResult>;
  movePlanState: (planId: number) => Promise<ActionResult>;
  voteForOption: (planId: number, optionId: number) => Promise<ActionResult>;
  closeVotingIfTimePassed: () => Promise<ActionResult>;
  setAttendance: (planId: number, status: AttendanceStatusEnum) => Promise<ActionResult>;
  setCheckIn: (planId: number) => Promise<ActionResult>;
};

export const AppContext = createContext<AppContextType | undefined>(undefined);
