import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppContext, type AppContextType } from "./AppContext";
import { getInitialAppData } from "../services/localStorage";
import {
  closeVotingIfTimePassed as closeVotingIfTimePassedOnServer,
  createParche as createParcheOnServer,
  createPlan as createPlanOnServer,
  joinParche as joinParcheOnServer,
  loadAppData,
  loginUser,
  logoutUser,
  registerUser,
  setAttendanceStatus,
  setPlanCheckIn,
  updateParcheRole,
  voteForOption as voteForOptionOnServer,
  movePlanState as movePlanStateOnServer,
} from "../services/mockApi";
import {
  AttendanceStatusEnum,
  ParcheRoleEnum,
  type ActionResult,
  type AppData,
  type AppDataResult,
  type NewParcheData,
  type NewPlanData,
  type RegisterData,
} from "../types";

function toActionResult(result: AppDataResult): ActionResult {
  return { success: result.success, message: result.message };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [appData, setAppData] = useState<AppData>(() => getInitialAppData());

  const currentUser = useMemo(() => {
    return appData.users.find((user) => user.id === appData.currentUserId) ?? null;
  }, [appData.currentUserId, appData.users]);

  const syncResult = useCallback((result: AppDataResult): ActionResult => {
    setAppData(result.data);
    return toActionResult(result);
  }, []);

  const refreshAppData = useCallback(async () => {
    return syncResult(await loadAppData());
  }, [syncResult]);

  const register = useCallback(async (data: RegisterData) => {
    return syncResult(await registerUser(data));
  }, [syncResult]);

  const login = useCallback(async (email: string, password: string) => {
    return syncResult(await loginUser(email, password));
  }, [syncResult]);

  const logout = useCallback(async () => {
    return syncResult(await logoutUser());
  }, [syncResult]);

  const createParche = useCallback(async (data: NewParcheData) => {
    return syncResult(await createParcheOnServer(data));
  }, [syncResult]);

  const joinParche = useCallback(async (inviteCode: string) => {
    return syncResult(await joinParcheOnServer(inviteCode));
  }, [syncResult]);

  const updateRole = useCallback(async (parcheId: number, targetUserId: number, role: ParcheRoleEnum) => {
    return syncResult(await updateParcheRole(parcheId, targetUserId, role));
  }, [syncResult]);

  const createPlan = useCallback(async (data: NewPlanData) => {
    return syncResult(await createPlanOnServer(data));
  }, [syncResult]);

  const movePlanState = useCallback(async (planId: number) => {
    return syncResult(await movePlanStateOnServer(planId));
  }, [syncResult]);

  const voteForOption = useCallback(async (planId: number, optionId: number) => {
    return syncResult(await voteForOptionOnServer(planId, optionId));
  }, [syncResult]);

  const closeVotingIfTimePassed = useCallback(async () => {
    return syncResult(await closeVotingIfTimePassedOnServer());
  }, [syncResult]);

  const setAttendance = useCallback(async (planId: number, status: AttendanceStatusEnum) => {
    return syncResult(await setAttendanceStatus(planId, status));
  }, [syncResult]);

  const setCheckIn = useCallback(async (planId: number) => {
    return syncResult(await setPlanCheckIn(planId));
  }, [syncResult]);

  useEffect(() => {
    let isActive = true;

    async function hydrateAppData() {
      const result = await loadAppData();
      if (isActive) {
        setAppData(result.data);
      }
    }

    async function syncExpiredVoting() {
      const result = await closeVotingIfTimePassedOnServer();
      if (isActive) {
        setAppData(result.data);
      }
    }

    void hydrateAppData();

    const interval = window.setInterval(() => {
      void syncExpiredVoting();
    }, 30000);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, []);

  const value: AppContextType = useMemo(() => ({
    appData,
    users: appData.users,
    parches: appData.parches,
    plans: appData.plans,
    votes: appData.votes,
    attendance: appData.attendance,
    currentUser,
    refreshAppData,
    register,
    login,
    logout,
    createParche,
    joinParche,
    updateRole,
    createPlan,
    movePlanState,
    voteForOption,
    closeVotingIfTimePassed,
    setAttendance,
    setCheckIn,
  }), [
    appData,
    closeVotingIfTimePassed,
    createParche,
    createPlan,
    currentUser,
    joinParche,
    login,
    logout,
    movePlanState,
    refreshAppData,
    register,
    setAttendance,
    setCheckIn,
    updateRole,
    voteForOption,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
