import type { AppData } from "../types";
import { seedAttendance, seedParches, seedPlans, seedUsers, seedVotes } from "../data/seed";

const APP_KEY = "parcheplan_u_data";

function cloneAppData(data: AppData): AppData {
  return JSON.parse(JSON.stringify(data)) as AppData;
}

export function createSeedAppData(): AppData {
  return {
    users: seedUsers,
    parches: seedParches,
    plans: seedPlans,
    votes: seedVotes,
    attendance: seedAttendance,
    currentUserId: null,
  };
}

export function getInitialAppData(): AppData {
  const dataText = localStorage.getItem(APP_KEY);

  if (!dataText) {
    const initialData = createSeedAppData();
    localStorage.setItem(APP_KEY, JSON.stringify(initialData));
    return cloneAppData(initialData);
  }

  return cloneAppData(JSON.parse(dataText) as AppData);
}

export function saveAppData(data: AppData): void {
  localStorage.setItem(APP_KEY, JSON.stringify(data));
}
