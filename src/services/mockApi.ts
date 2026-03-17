import {
  AttendanceStatusEnum,
  ParcheRoleEnum,
  PlanStateEnum,
  type AppData,
  type AppDataResult,
  type NewParcheData,
  type NewPlanData,
  type Parche,
  type Plan,
  type RegisterData,
  type User,
} from "../types";
import { getInitialAppData, saveAppData } from "./localStorage";

const API_DELAY_MS = 300;

function delay(ms = API_DELAY_MS): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function success(data: AppData, message: string): AppDataResult {
  return { success: true, message, data };
}

function fail(data: AppData, message: string): AppDataResult {
  return { success: false, message, data };
}

function getCurrentUser(data: AppData): User | undefined {
  return data.users.find((user) => user.id === data.currentUserId);
}

function getParche(data: AppData, parcheId: number): Parche | undefined {
  return data.parches.find((parche) => parche.id === parcheId);
}

function getPlan(data: AppData, planId: number): Plan | undefined {
  return data.plans.find((plan) => plan.id === planId);
}

function getPlanParche(data: AppData, plan: Plan): Parche | undefined {
  return getParche(data, plan.parcheId);
}

function isParcheMember(parche: Parche, userId: number): boolean {
  return parche.members.some((member) => member.userId === userId);
}

function getParcheRole(parche: Parche, userId: number): ParcheRoleEnum | undefined {
  return parche.members.find((member) => member.userId === userId)?.role;
}

function getNextId(items: Array<{ id: number }>): number {
  const currentMaxId = items.reduce((maxId, item) => Math.max(maxId, item.id), 0);
  return currentMaxId + 1;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  return !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function isValidDateTime(value: string): boolean {
  return value.length > 0 && !Number.isNaN(new Date(value).getTime());
}

function closeVotingForPlan(plan: Plan, data: AppData): void {
  let winningOptionId = plan.options[0]?.id;
  let highestVoteCount = -1;

  for (const option of plan.options) {
    const optionVoteCount = data.votes.filter(
      (vote) => vote.planId === plan.id && vote.optionId === option.id,
    ).length;

    if (optionVoteCount > highestVoteCount) {
      highestVoteCount = optionVoteCount;
      winningOptionId = option.id;
    }
  }

  plan.state = PlanStateEnum.votingClosed;
  plan.winningOptionId = winningOptionId;
}

function closeExpiredVoting(data: AppData): number {
  const now = new Date();
  let changedPlans = 0;

  for (const plan of data.plans) {
    if (plan.state !== PlanStateEnum.votingOpen) {
      continue;
    }

    const deadline = new Date(plan.votingDeadline);
    if (Number.isNaN(deadline.getTime()) || now < deadline) {
      continue;
    }

    closeVotingForPlan(plan, data);
    changedPlans += 1;
  }

  return changedPlans;
}

function prepareData(): { data: AppData; autoClosedPlans: number } {
  const data = getInitialAppData();
  const autoClosedPlans = closeExpiredVoting(data);

  if (autoClosedPlans > 0) {
    saveAppData(data);
  }

  return { data, autoClosedPlans };
}

function createInviteCode(name: string, data: AppData): string {
  const baseCode = name.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() || "PRCH";
  let suffix = getNextId(data.parches);
  let inviteCode = `${baseCode}-${suffix.toString().padStart(3, "0")}`;

  while (data.parches.some((parche) => parche.inviteCode === inviteCode)) {
    suffix += 1;
    inviteCode = `${baseCode}-${suffix.toString().padStart(3, "0")}`;
  }

  return inviteCode;
}

async function saveAndResolve(data: AppData, message: string): Promise<AppDataResult> {
  saveAppData(data);
  await delay();
  return success(data, message);
}

async function reject(data: AppData, message: string): Promise<AppDataResult> {
  await delay();
  return fail(data, message);
}

export async function loadAppData(): Promise<AppDataResult> {
  const { data } = prepareData();
  await delay();
  return success(data, "App data loaded.");
}

export async function registerUser(rawData: RegisterData): Promise<AppDataResult> {
  const { data } = prepareData();
  const fullName = rawData.fullName.trim();
  const email = rawData.email.trim().toLowerCase();
  const major = rawData.major.trim();
  const password = rawData.password.trim();
  const avatarUrl = rawData.avatarUrl?.trim();

  if (!fullName || !email || !major || !password) {
    return reject(data, "Please complete all required fields.");
  }

  if (fullName.length < 5) {
    return reject(data, "Full name must have at least 5 characters.");
  }

  if (!isValidEmail(email)) {
    return reject(data, "Please enter a valid university email.");
  }

  if (major.length < 3) {
    return reject(data, "Program or major must have at least 3 characters.");
  }

  if (password.length < 4) {
    return reject(data, "Password must have at least 4 characters.");
  }

  if (avatarUrl && !isValidUrl(avatarUrl)) {
    return reject(data, "Avatar URL must be a valid URL.");
  }

  const emailAlreadyExists = data.users.some((user) => user.email.toLowerCase() === email);
  if (emailAlreadyExists) {
    return reject(data, "Email already registered.");
  }

  const newUser: User = {
    id: getNextId(data.users),
    fullName,
    email,
    major,
    password,
    avatarUrl: avatarUrl || undefined,
  };

  data.users.push(newUser);
  data.currentUserId = newUser.id;
  return saveAndResolve(data, "Account created successfully.");
}

export async function loginUser(email: string, password: string): Promise<AppDataResult> {
  const { data } = prepareData();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (!normalizedEmail || !normalizedPassword) {
    return reject(data, "Please complete all required fields.");
  }

  const user = data.users.find(
    (candidate) =>
      candidate.email.toLowerCase() === normalizedEmail && candidate.password === normalizedPassword,
  );

  if (!user) {
    return reject(data, "Invalid credentials.");
  }

  data.currentUserId = user.id;
  return saveAndResolve(data, "Welcome back.");
}

export async function logoutUser(): Promise<AppDataResult> {
  const { data } = prepareData();
  data.currentUserId = null;
  return saveAndResolve(data, "Session closed.");
}

export async function createParche(rawData: NewParcheData): Promise<AppDataResult> {
  const { data } = prepareData();
  const currentUser = getCurrentUser(data);

  if (!currentUser) {
    return reject(data, "You must be logged in.");
  }

  const name = rawData.name.trim();
  const description = rawData.description.trim();
  const coverImageUrl = rawData.coverImageUrl.trim();

  if (!name || !description || !coverImageUrl) {
    return reject(data, "Please complete all required fields.");
  }

  if (name.length < 3 || name.length > 50) {
    return reject(data, "Parche name must contain between 3 and 50 characters.");
  }

  if (description.length < 10 || description.length > 250) {
    return reject(data, "Description must contain between 10 and 250 characters.");
  }

  if (!isValidUrl(coverImageUrl)) {
    return reject(data, "Cover image URL must be valid.");
  }

  data.parches.push({
    id: getNextId(data.parches),
    name,
    description,
    coverImageUrl,
    inviteCode: createInviteCode(name, data),
    members: [{ userId: currentUser.id, role: ParcheRoleEnum.owner }],
  });

  return saveAndResolve(data, "Parche created successfully.");
}

export async function joinParche(inviteCode: string): Promise<AppDataResult> {
  const { data } = prepareData();
  const currentUser = getCurrentUser(data);

  if (!currentUser) {
    return reject(data, "You must be logged in.");
  }

  const normalizedCode = inviteCode.trim();
  if (!normalizedCode) {
    return reject(data, "Please enter an invite code.");
  }

  const parche = data.parches.find(
    (candidate) => candidate.inviteCode.toLowerCase() === normalizedCode.toLowerCase(),
  );

  if (!parche) {
    return reject(data, "Invite code or invite link not found.");
  }

  if (isParcheMember(parche, currentUser.id)) {
    return reject(data, "You are already a member of this parche.");
  }

  parche.members.push({ userId: currentUser.id, role: ParcheRoleEnum.member });
  return saveAndResolve(data, `You joined ${parche.name}.`);
}

export async function updateParcheRole(
  parcheId: number,
  targetUserId: number,
  role: ParcheRoleEnum,
): Promise<AppDataResult> {
  const { data } = prepareData();
  const currentUser = getCurrentUser(data);

  if (!currentUser) {
    return reject(data, "You must be logged in.");
  }

  const parche = getParche(data, parcheId);
  if (!parche) {
    return reject(data, "Parche not found.");
  }

  if (getParcheRole(parche, currentUser.id) !== ParcheRoleEnum.owner) {
    return reject(data, "Only the owner can change roles.");
  }

  const targetMember = parche.members.find((member) => member.userId === targetUserId);
  if (!targetMember) {
    return reject(data, "Target user is not part of this parche.");
  }

  if (targetMember.role === ParcheRoleEnum.owner) {
    return reject(data, "The owner role cannot be changed here.");
  }

  targetMember.role = role;
  return saveAndResolve(data, `Role updated to ${role}.`);
}

export async function createPlan(rawData: NewPlanData): Promise<AppDataResult> {
  const { data } = prepareData();
  const currentUser = getCurrentUser(data);

  if (!currentUser) {
    return reject(data, "You must be logged in.");
  }

  const parche = getParche(data, rawData.parcheId);
  if (!parche) {
    return reject(data, "Parche not found.");
  }

  if (!isParcheMember(parche, currentUser.id)) {
    return reject(data, "Only parche members can create plans.");
  }

  const title = rawData.title.trim();
  const description = rawData.description.trim();

  if (!title || !description || !rawData.dateStart || !rawData.dateEnd || !rawData.votingDeadline) {
    return reject(data, "Please complete all required fields.");
  }

  if (title.length < 4) {
    return reject(data, "Title must contain at least 4 characters.");
  }

  if (description.length < 10) {
    return reject(data, "Description must contain at least 10 characters.");
  }

  if (!isValidDate(rawData.dateStart) || !isValidDate(rawData.dateEnd)) {
    return reject(data, "Please use valid dates for the plan window.");
  }

  if (!isValidDateTime(rawData.votingDeadline)) {
    return reject(data, "Please use a valid voting deadline.");
  }

  if (rawData.dateEnd < rawData.dateStart) {
    return reject(data, "Date end cannot be earlier than date start.");
  }

  const windowStart = new Date(`${rawData.dateStart}T00:00:00`);
  const windowEnd = new Date(`${rawData.dateEnd}T23:59:59`);
  const votingDeadline = new Date(rawData.votingDeadline);

  if (votingDeadline < windowStart || votingDeadline > windowEnd) {
    return reject(data, "Voting deadline must stay inside the selected date window.");
  }

  if (rawData.options.length < 3) {
    return reject(data, "Plan needs at least 3 options.");
  }

  const normalizedOptions = rawData.options.map((option) => ({
    place: option.place.trim(),
    time: option.time.trim(),
  }));

  if (normalizedOptions.some((option) => !option.place || !option.time)) {
    return reject(data, "Each option needs both a place and a time.");
  }

  const newPlanId = getNextId(data.plans);

  data.plans.push({
    id: newPlanId,
    parcheId: rawData.parcheId,
    createdBy: currentUser.id,
    title,
    description,
    dateStart: rawData.dateStart,
    dateEnd: rawData.dateEnd,
    votingDeadline: rawData.votingDeadline,
    state: PlanStateEnum.draft,
    options: normalizedOptions.map((option, index) => ({
      id: newPlanId * 10 + index + 1,
      place: option.place,
      time: option.time,
    })),
    checkInStart: `${rawData.dateStart}T18:00`,
    checkInEnd: `${rawData.dateStart}T23:00`,
  });

  return saveAndResolve(data, "Plan created successfully.");
}

export async function movePlanState(planId: number): Promise<AppDataResult> {
  const { data } = prepareData();
  const currentUser = getCurrentUser(data);

  if (!currentUser) {
    return reject(data, "You must be logged in.");
  }

  const plan = getPlan(data, planId);
  if (!plan) {
    return reject(data, "Plan not found.");
  }

  const parche = getPlanParche(data, plan);
  if (!parche || !isParcheMember(parche, currentUser.id)) {
    return reject(data, "You do not have access to this plan.");
  }

  const currentRole = getParcheRole(parche, currentUser.id);
  const canManageState =
    currentRole === ParcheRoleEnum.owner || currentRole === ParcheRoleEnum.moderator;

  if (!canManageState) {
    return reject(data, "Only owners and moderators can move the plan state forward.");
  }

  if (plan.state === PlanStateEnum.draft) {
    plan.state = PlanStateEnum.votingOpen;
    return saveAndResolve(data, "Voting is now open.");
  }

  if (plan.state === PlanStateEnum.votingOpen) {
    closeVotingForPlan(plan, data);
    return saveAndResolve(
      data,
      "Voting closed. Tie-breaking rule: the earliest created option wins any tie.",
    );
  }

  if (plan.state === PlanStateEnum.votingClosed) {
    if (!plan.winningOptionId) {
      closeVotingForPlan(plan, data);
    }

    plan.state = PlanStateEnum.scheduled;
    return saveAndResolve(data, "Plan scheduled successfully.");
  }

  return reject(data, "This plan is already scheduled.");
}

export async function voteForOption(planId: number, optionId: number): Promise<AppDataResult> {
  const { data } = prepareData();
  const currentUser = getCurrentUser(data);

  if (!currentUser) {
    return reject(data, "You must be logged in.");
  }

  const plan = getPlan(data, planId);
  if (!plan) {
    return reject(data, "Plan not found.");
  }

  const parche = getPlanParche(data, plan);
  if (!parche || !isParcheMember(parche, currentUser.id)) {
    return reject(data, "Only parche members can vote in this plan.");
  }

  if (plan.state !== PlanStateEnum.votingOpen) {
    return reject(data, "Voting is closed for this plan.");
  }

  const optionExists = plan.options.some((option) => option.id === optionId);
  if (!optionExists) {
    return reject(data, "Selected option not found.");
  }

  const existingVote = data.votes.find(
    (vote) => vote.planId === plan.id && vote.userId === currentUser.id,
  );

  if (existingVote) {
    existingVote.optionId = optionId;
    return saveAndResolve(data, "Vote updated successfully.");
  }

  data.votes.push({ planId: plan.id, userId: currentUser.id, optionId });
  return saveAndResolve(data, "Vote recorded successfully.");
}

export async function setAttendanceStatus(
  planId: number,
  status: AttendanceStatusEnum,
): Promise<AppDataResult> {
  const { data } = prepareData();
  const currentUser = getCurrentUser(data);

  if (!currentUser) {
    return reject(data, "You must be logged in.");
  }

  const plan = getPlan(data, planId);
  if (!plan) {
    return reject(data, "Plan not found.");
  }

  const parche = getPlanParche(data, plan);
  if (!parche || !isParcheMember(parche, currentUser.id)) {
    return reject(data, "Only parche members can confirm attendance.");
  }

  const existingAttendance = data.attendance.find(
    (entry) => entry.planId === plan.id && entry.userId === currentUser.id,
  );

  if (existingAttendance) {
    existingAttendance.status = status;
    existingAttendance.checkedIn =
      status === AttendanceStatusEnum.yes ? existingAttendance.checkedIn : false;
  } else {
    data.attendance.push({
      planId: plan.id,
      userId: currentUser.id,
      status,
      checkedIn: false,
    });
  }

  return saveAndResolve(data, `Attendance updated to ${status}.`);
}

export async function setPlanCheckIn(planId: number): Promise<AppDataResult> {
  const { data } = prepareData();
  const currentUser = getCurrentUser(data);

  if (!currentUser) {
    return reject(data, "You must be logged in.");
  }

  const plan = getPlan(data, planId);
  if (!plan) {
    return reject(data, "Plan not found.");
  }

  const parche = getPlanParche(data, plan);
  if (!parche || !isParcheMember(parche, currentUser.id)) {
    return reject(data, "Only parche members can check in.");
  }

  const now = new Date();
  const checkInStart = new Date(plan.checkInStart);
  const checkInEnd = new Date(plan.checkInEnd);

  if (now < checkInStart || now > checkInEnd) {
    return reject(data, "Check-in is only available inside the defined window.");
  }

  const existingAttendance = data.attendance.find(
    (entry) => entry.planId === plan.id && entry.userId === currentUser.id,
  );

  if (!existingAttendance || existingAttendance.status !== AttendanceStatusEnum.yes) {
    return reject(data, "Set your attendance to Yes before checking in.");
  }

  if (existingAttendance.checkedIn) {
    return reject(data, "You are already checked in.");
  }

  existingAttendance.checkedIn = true;
  return saveAndResolve(data, "Check-in completed successfully.");
}

export async function closeVotingIfTimePassed(): Promise<AppDataResult> {
  const { data, autoClosedPlans } = prepareData();
  await delay();

  if (autoClosedPlans > 0) {
    return success(
      data,
      `${autoClosedPlans} plan${autoClosedPlans === 1 ? "" : "s"} closed automatically.`,
    );
  }

  return success(data, "No plans required automatic voting closure.");
}
