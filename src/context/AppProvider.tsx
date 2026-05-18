import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppContext, type AppContextType } from "./AppContext";
import { getInitialAppData } from "../services/localStorage";
import { ApiError } from "../services/apiClient";

import {
  loginUser as loginUserApi,
  logoutUser as logoutUserApi,
  registerUser as registerUserApi,
  getStoredToken,
  getStoredEmail,
} from "../services/authApi";

import {
  getMyParches,
  createParche as createParcheApi,
  editParche as editParcheApi,
  joinParche as joinParcheApi,
  updateParcheRole,
} from "../services/parcheApi";

import {
  createPlan as createPlanApi,
  extractAttendanceFromPlans,
  extractVotesFromPlans,
  getPlansByParche,
  movePlanState as movePlanStateApi,
  voteForOption as voteForOptionApi,
  setAttendanceStatus as setAttendanceStatusApi,
  setPlanCheckIn as setPlanCheckInApi,
  type PlanFromApi,
} from "../services/planApi";

import {
  AttendanceStatusEnum,
  ParcheRoleEnum,
  type ActionResult,
  type AppData,
  type NewParcheData,
  type NewPlanData,
  type RegisterData,
} from "../types";

const SOFT_REFRESH_INTERVAL_MS = 5_000;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = atob(normalizedPayload);

    return JSON.parse(decodedPayload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getStringClaim(
  payload: Record<string, unknown>,
  claimNames: string[]
): string | null {
  for (const claimName of claimNames) {
    const value = payload[claimName];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function getStoredUserIdFromToken(): string | null {
  const token = getStoredToken();

  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);

  if (!payload) {
    return null;
  }

  return getStringClaim(payload, [
    "sub",
    "id",
    "userId",
    "nameid",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
  ]);
}

function createTemporaryUserId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `temp-${Date.now()}`;
}

function getLoggedOutAppData(): AppData {
  return {
    ...getInitialAppData(),
    currentUserId: null,
    parches: [],
    plans: [],
    votes: [],
    attendance: [],
  };
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

function syncCurrentUserFromParches(
  data: AppData,
  parches: AppData["parches"]
): AppData {
  const email = getStoredEmail()?.trim().toLowerCase();
  const userIdFromToken = getStoredUserIdFromToken();

  if (!email) {
    return {
      ...data,
      parches,
    };
  }

  const backendMember = parches
    .flatMap((parche) => parche.members)
    .find((member) => {
      const memberEmail = member.email?.trim().toLowerCase();

      return (
        memberEmail === email ||
        (!!userIdFromToken && member.userId === userIdFromToken)
      );
    });

  const existingUser = data.users.find(
    (user) => user.email.trim().toLowerCase() === email
  );

  const syncedUserId =
    backendMember?.userId ??
    userIdFromToken ??
    existingUser?.id ??
    createTemporaryUserId();

  const syncedUser = {
    id: syncedUserId,
    fullName: backendMember?.fullName ?? existingUser?.fullName ?? email,
    email,
    major: existingUser?.major ?? "N/A",
    password: existingUser?.password ?? "",
    avatarUrl: backendMember?.avatarUrl ?? existingUser?.avatarUrl,
  };

  return {
    ...data,
    parches,
    users: existingUser
      ? data.users.map((user) =>
          user.email.trim().toLowerCase() === email ? syncedUser : user
        )
      : [...data.users, syncedUser],
    currentUserId: syncedUserId,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return "No existe ese código o ese parche.";
    }

    if (error.status === 409) {
      return "Ya perteneces a ese parche.";
    }

    if (error.status === 401) {
      return "Tu sesión expiró o no estás autorizado. Inicia sesión nuevamente.";
    }

    if (error.status === 400) {
      return error.message || "La solicitud no es válida.";
    }

    return error.message || `Error de API ${error.status}.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error.";
}

function withAuthenticatedUser(data: AppData, email: string): AppData {
  const normalizedEmail = email.trim().toLowerCase();
  const userIdFromToken = getStoredUserIdFromToken();

  const existingUser = data.users.find(
    (user) => user.email.toLowerCase() === normalizedEmail
  );

  if (existingUser) {
    const syncedUser = {
      ...existingUser,
      id: userIdFromToken ?? existingUser.id,
    };

    return {
      ...data,
      users: data.users.map((user) =>
        user.email.toLowerCase() === normalizedEmail ? syncedUser : user
      ),
      currentUserId: syncedUser.id,
    };
  }

  const temporaryUser = {
    id: userIdFromToken ?? createTemporaryUserId(),
    fullName: normalizedEmail,
    email: normalizedEmail,
    major: "N/A",
    password: "",
    avatarUrl: undefined,
  };

  return {
    ...data,
    users: [...data.users, temporaryUser],
    currentUserId: temporaryUser.id,
  };
}

function applyStoredAuth(data: AppData): AppData {
  const token = getStoredToken();
  const email = getStoredEmail();

  if (!token || !email) {
    return data;
  }

  return withAuthenticatedUser(data, email);
}

async function getPlansForParches(
  parches: AppData["parches"]
): Promise<PlanFromApi[]> {
  const plansByParche = await Promise.all(
    parches.map(async (parche) => {
      try {
        return await getPlansByParche(parche.id);
      } catch {
        return [] as PlanFromApi[];
      }
    })
  );

  return plansByParche.flat();
}

function mergeBackendPlansIntoData(
  data: AppData,
  backendPlans: PlanFromApi[]
): AppData {
  if (!data.currentUserId) {
    return {
      ...data,
      plans: backendPlans,
      votes: [],
      attendance: [],
    };
  }

  const backendVotes = extractVotesFromPlans(backendPlans, data.currentUserId);
  const backendAttendance = extractAttendanceFromPlans(backendPlans, data.currentUserId);

  return {
    ...data,
    plans: backendPlans,
    votes: backendVotes.length > 0 ? backendVotes : data.votes,
    attendance: backendAttendance.length > 0 ? backendAttendance : data.attendance,
  };
}

function replacePlan(
  plans: AppData["plans"],
  updatedPlan: AppData["plans"][number]
): AppData["plans"] {
  const exists = plans.some((plan) => plan.id === updatedPlan.id);

  if (!exists) {
    return [...plans, updatedPlan];
  }

  return plans.map((plan) =>
    plan.id === updatedPlan.id ? { ...plan, ...updatedPlan } : plan
  );
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [appData, setAppData] = useState<AppData>(() =>
    applyStoredAuth(getInitialAppData())
  );

  const isSoftRefreshingRef = useRef(false);

  const currentUser = useMemo(() => {
    return appData.users.find((user) => user.id === appData.currentUserId) ?? null;
  }, [appData.currentUserId, appData.users]);

  const loadRealParches = useCallback(async () => {
    const parches = await getMyParches();
    const backendPlans = await getPlansForParches(parches);

    setAppData((previousData) => {
      const syncedData = syncCurrentUserFromParches(previousData, parches);

      return mergeBackendPlansIntoData(syncedData, backendPlans);
    });

    return parches;
  }, []);

  const softRefreshBackendData = useCallback(async () => {
    if (!getStoredToken() || isSoftRefreshingRef.current) {
      return;
    }

    isSoftRefreshingRef.current = true;

    try {
      const parches = await getMyParches();
      const backendPlans = await getPlansForParches(parches);

      setAppData((previousData) => {
        const syncedData = syncCurrentUserFromParches(previousData, parches);

        return mergeBackendPlansIntoData(syncedData, backendPlans);
      });
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await logoutUserApi();
        setAppData(getLoggedOutAppData());
      }

      // Si no es 401, no hacemos nada para no cambiar la pantalla actual.
    } finally {
      isSoftRefreshingRef.current = false;
    }
  }, []);

  const refreshAppData = useCallback(async (): Promise<ActionResult> => {
    try {
      const nextData = applyStoredAuth(getInitialAppData());

      setAppData(nextData);

      if (getStoredToken()) {
        try {
          await loadRealParches();
        } catch (error) {
          if (isUnauthorizedError(error)) {
            await logoutUserApi();
            setAppData(getLoggedOutAppData());

            return {
              success: false,
              message: "Tu sesión expiró. Inicia sesión nuevamente.",
            };
          }

          return {
            success: false,
            message: getErrorMessage(error),
          };
        }
      }

      return {
        success: true,
        message: "Data refreshed successfully.",
      };
    } catch (error) {
      return {
        success: false,
        message: getErrorMessage(error),
      };
    }
  }, [loadRealParches]);

  const register = useCallback(
    async (data: RegisterData): Promise<ActionResult> => {
      try {
        const registerResult = await registerUserApi(data);

        await loginUserApi(data.email, data.password);

        setAppData((previousData) =>
          withAuthenticatedUser(previousData, data.email)
        );

        await loadRealParches();

        return {
          success: registerResult.success,
          message: registerResult.message,
        };
      } catch (error) {
        return {
          success: false,
          message: getErrorMessage(error),
        };
      }
    },
    [loadRealParches]
  );

  const login = useCallback(
    async (email: string, password: string): Promise<ActionResult> => {
      try {
        const result = await loginUserApi(email, password);

        setAppData((previousData) => withAuthenticatedUser(previousData, email));

        await loadRealParches();

        return {
          success: result.success,
          message: result.message,
        };
      } catch (error) {
        return {
          success: false,
          message: getErrorMessage(error),
        };
      }
    },
    [loadRealParches]
  );

  const logout = useCallback(async (): Promise<ActionResult> => {
    try {
      const result = await logoutUserApi();

      setAppData(getLoggedOutAppData());

      return {
        success: result.success,
        message: result.message,
      };
    } catch (error) {
      setAppData(getLoggedOutAppData());

      return {
        success: false,
        message: getErrorMessage(error),
      };
    }
  }, []);

  const createParche = useCallback(
    async (data: NewParcheData): Promise<ActionResult> => {
      try {
        const newParche = await createParcheApi(data);

        setAppData((previousData) => ({
          ...previousData,
          parches: [...previousData.parches, newParche],
        }));

        void softRefreshBackendData();

        return {
          success: true,
          message: "Parche created successfully.",
        };
      } catch (error) {
        return {
          success: false,
          message: getErrorMessage(error),
        };
      }
    },
    [softRefreshBackendData]
  );

  const editParche = useCallback(
    async (parcheId: string, data: NewParcheData): Promise<ActionResult> => {
      try {
        const updatedParche = await editParcheApi(parcheId, data);

        setAppData((previousData) => ({
          ...previousData,
          parches: previousData.parches.map((parche) =>
            parche.id === parcheId ? updatedParche : parche
          ),
        }));

        void softRefreshBackendData();

        return {
          success: true,
          message: "Parche updated successfully.",
        };
      } catch (error) {
        return {
          success: false,
          message: getErrorMessage(error),
        };
      }
    },
    [softRefreshBackendData]
  );

  const joinParche = useCallback(
    async (inviteCode: string): Promise<ActionResult> => {
      try {
        const joinedParche = await joinParcheApi(inviteCode);

        setAppData((previousData) => {
          const alreadyExists = previousData.parches.some(
            (parche) => parche.id === joinedParche.id
          );

          const nextParches = alreadyExists
            ? previousData.parches.map((parche) =>
                parche.id === joinedParche.id ? joinedParche : parche
              )
            : [...previousData.parches, joinedParche];

          return syncCurrentUserFromParches(previousData, nextParches);
        });

        void softRefreshBackendData();

        return {
          success: true,
          message: `You joined ${joinedParche.name}.`,
        };
      } catch (error) {
        return {
          success: false,
          message: getErrorMessage(error),
        };
      }
    },
    [softRefreshBackendData]
  );

  const updateRole = useCallback(
    async (
      parcheId: string,
      targetUserId: string,
      role: ParcheRoleEnum
    ): Promise<ActionResult> => {
      try {
        await updateParcheRole(parcheId, targetUserId, role);

        await loadRealParches();
        void softRefreshBackendData();

        return {
          success: true,
          message: `Role updated to ${role}.`,
        };
      } catch (error) {
        return {
          success: false,
          message: getErrorMessage(error),
        };
      }
    },
    [loadRealParches, softRefreshBackendData]
  );

  const createPlan = useCallback(
    async (data: NewPlanData): Promise<ActionResult> => {
      try {
        const newPlan = await createPlanApi(data);

        let plansForParche: PlanFromApi[] = [newPlan];

        try {
          plansForParche = await getPlansByParche(data.parcheId);
        } catch {
          plansForParche = [newPlan];
        }

        setAppData((previousData) => {
          const plansFromOtherParches = previousData.plans.filter(
            (plan) => plan.parcheId !== data.parcheId
          );

          const backendPlans = [
            ...plansFromOtherParches,
            ...plansForParche,
          ] as PlanFromApi[];

          return mergeBackendPlansIntoData(previousData, backendPlans);
        });

        void softRefreshBackendData();

        return {
          success: true,
          message: "Plan created successfully.",
        };
      } catch (error) {
        return {
          success: false,
          message: getErrorMessage(error),
        };
      }
    },
    [softRefreshBackendData]
  );

  const movePlanState = useCallback(
    async (planId: string): Promise<ActionResult> => {
      try {
        const updatedPlan = await movePlanStateApi(planId);

        setAppData((previousData) => {
          const nextPlans = replacePlan(previousData.plans, updatedPlan);

          return mergeBackendPlansIntoData(
            previousData,
            nextPlans as PlanFromApi[]
          );
        });

        void softRefreshBackendData();

        return {
          success: true,
          message: "Plan state updated successfully.",
        };
      } catch (error) {
        return {
          success: false,
          message: getErrorMessage(error),
        };
      }
    },
    [softRefreshBackendData]
  );

  const voteForOption = useCallback(
    async (planId: string, optionId: string): Promise<ActionResult> => {
      try {
        const message = await voteForOptionApi(planId, optionId);

        setAppData((previousData) => {
          if (!previousData.currentUserId) {
            return previousData;
          }

          const existingVote = previousData.votes.find(
            (vote) =>
              vote.planId === planId &&
              vote.userId === previousData.currentUserId
          );

          const nextVotes = existingVote
            ? previousData.votes.map((vote) =>
                vote.planId === planId &&
                vote.userId === previousData.currentUserId
                  ? { ...vote, optionId }
                  : vote
              )
            : [
                ...previousData.votes,
                {
                  planId,
                  userId: previousData.currentUserId,
                  optionId,
                },
              ];

          return {
            ...previousData,
            votes: nextVotes,
          };
        });

        void softRefreshBackendData();

        return {
          success: true,
          message,
        };
      } catch (error) {
        return {
          success: false,
          message: getErrorMessage(error),
        };
      }
    },
    [softRefreshBackendData]
  );

  const setAttendance = useCallback(
    async (
      planId: string,
      status: AttendanceStatusEnum
    ): Promise<ActionResult> => {
      try {
        const message = await setAttendanceStatusApi(planId, status);

        setAppData((previousData) => {
          if (!previousData.currentUserId) {
            return previousData;
          }

          const existingAttendance = previousData.attendance.find(
            (entry) =>
              entry.planId === planId &&
              entry.userId === previousData.currentUserId
          );

          const nextAttendance = existingAttendance
            ? previousData.attendance.map((entry) =>
                entry.planId === planId &&
                entry.userId === previousData.currentUserId
                  ? {
                      ...entry,
                      status,
                      checkedIn:
                        status === AttendanceStatusEnum.yes
                          ? entry.checkedIn
                          : false,
                    }
                  : entry
              )
            : [
                ...previousData.attendance,
                {
                  planId,
                  userId: previousData.currentUserId,
                  status,
                  checkedIn: false,
                },
              ];

          return {
            ...previousData,
            attendance: nextAttendance,
          };
        });

        void softRefreshBackendData();

        return {
          success: true,
          message,
        };
      } catch (error) {
        return {
          success: false,
          message: getErrorMessage(error),
        };
      }
    },
    [softRefreshBackendData]
  );

  const setCheckIn = useCallback(
    async (planId: string): Promise<ActionResult> => {
      try {
        const message = await setPlanCheckInApi(planId);

        setAppData((previousData) => {
          if (!previousData.currentUserId) {
            return previousData;
          }

          return {
            ...previousData,
            attendance: previousData.attendance.map((entry) =>
              entry.planId === planId &&
              entry.userId === previousData.currentUserId
                ? { ...entry, checkedIn: true }
                : entry
            ),
          };
        });

        void softRefreshBackendData();

        return {
          success: true,
          message,
        };
      } catch (error) {
        return {
          success: false,
          message: getErrorMessage(error),
        };
      }
    },
    [softRefreshBackendData]
  );

  useEffect(() => {
    let isActive = true;

    async function hydrateAppData() {
      try {
        const baseData = applyStoredAuth(getInitialAppData());

        if (!isActive) {
          return;
        }

        setAppData(baseData);

        if (!getStoredToken()) {
          return;
        }

        try {
          const parches = await getMyParches();
          const backendPlans = await getPlansForParches(parches);

          if (!isActive) {
            return;
          }

          setAppData((previousData) => {
            const syncedData = syncCurrentUserFromParches(previousData, parches);

            return mergeBackendPlansIntoData(syncedData, backendPlans);
          });
        } catch (error) {
          if (!isActive) {
            return;
          }

          if (isUnauthorizedError(error)) {
            await logoutUserApi();
            setAppData(getLoggedOutAppData());
            return;
          }

          // Si falla por algo distinto de 401, dejamos la data base/local.
        }
      } catch {
        if (!isActive) {
          return;
        }

        setAppData(getLoggedOutAppData());
      }
    }

    void hydrateAppData();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void softRefreshBackendData();
    }, SOFT_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [softRefreshBackendData]);

  const value: AppContextType = useMemo(
    () => ({
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
      editParche,
      joinParche,
      updateRole,
      createPlan,
      movePlanState,
      voteForOption,
      setAttendance,
      setCheckIn,
    }),
    [
      appData,
      createParche,
      createPlan,
      currentUser,
      editParche,
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
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}