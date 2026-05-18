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
  editParche: (parcheId: string, data: NewParcheData) => Promise<ActionResult>;
  joinParche: (inviteCode: string) => Promise<ActionResult>;
  updateRole: (
    parcheId: string,
    targetUserId: string,
    role: ParcheRoleEnum,
  ) => Promise<ActionResult>;
  createPlan: (data: NewPlanData) => Promise<ActionResult>;
  movePlanState: (planId: string) => Promise<ActionResult>;
  voteForOption: (planId: string, optionId: string) => Promise<ActionResult>;
  setAttendance: (
    planId: string,
    status: AttendanceStatusEnum,
  ) => Promise<ActionResult>;
  setCheckIn: (planId: string) => Promise<ActionResult>;
};

export const AppContext = createContext<AppContextType | undefined>(undefined);