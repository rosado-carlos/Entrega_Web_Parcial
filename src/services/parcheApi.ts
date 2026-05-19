import { apiFetch } from "./apiClient";
import { ParcheRoleEnum, type NewParcheData, type Parche } from "../types";

type BackendParcheMember = {
  userId: string;
  fullName?: string;
  email?: string;
  avatarUrl?: string;
  role: string;
};

type BackendParche = {
  idParche?: string;
  id?: string;
  name: string;
  description: string;
  coverImageUrl: string;
  inviteCode: string;
  members: BackendParcheMember[];
};

function normalizeRole(role: string): ParcheRoleEnum {
  const normalizedRole = role.toLowerCase();

  if (normalizedRole === "owner") {
    return ParcheRoleEnum.owner;
  }

  if (normalizedRole === "moderator") {
    return ParcheRoleEnum.moderator;
  }

  return ParcheRoleEnum.member;
}

export function normalizeParche(parche: BackendParche): Parche {
  return {
    id: parche.idParche ?? parche.id ?? "",
    name: parche.name,
    description: parche.description,
    coverImageUrl: parche.coverImageUrl,
    inviteCode: parche.inviteCode,
   members: parche.members.map((member) => ({
    userId: member.userId,
    role: normalizeRole(member.role),
    fullName: member.fullName,
    email: member.email,
    avatarUrl: member.avatarUrl,
    })),
  };
}

export async function getMyParches(): Promise<Parche[]> {
  const parches = await apiFetch("/api/parches");

  console.log("Respuesta cruda backend /api/parches:", parches);

  return parches.map(normalizeParche);
}

export async function updateParcheRole(
  parcheId: string,
  targetUserId: string,
  role: ParcheRoleEnum,
) {
  return apiFetch(`/api/parches/${parcheId}/members/${targetUserId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function createParche(rawData: NewParcheData): Promise<Parche> {
  const parche = await apiFetch("/api/parches", {
    method: "POST",
    body: JSON.stringify({
      name: rawData.name.trim(),
      description: rawData.description.trim(),
      coverImageUrl: rawData.coverImageUrl.trim(),
    }),
  });

  return normalizeParche(parche);
}

export async function joinParche(inviteCode: string): Promise<Parche> {
  const parche = await apiFetch("/api/parches/join", {
    method: "POST",
    body: JSON.stringify({
      inviteCode: inviteCode.trim(),
    }),
  });

  return normalizeParche(parche);
}

export async function editParche(
  parcheId: string,
  data: NewParcheData
): Promise<Parche> {
  const parche = await apiFetch(`/api/parches/${parcheId}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: data.name.trim(),
      description: data.description.trim(),
      coverImageUrl: data.coverImageUrl.trim(),
    }),
  });

  return normalizeParche(parche);
}

export type RankingEntry = {
  userId: string;
  fullName: string;
  email: string;
  organizerScore: number;
  ghostScore: number;
};

export async function getRankings(parcheId: string): Promise<RankingEntry[]> {
  const response = await apiFetch(`/api/parches/${parcheId}/rankings`);

  return (response as RankingEntry[]).map((entry) => ({
    userId: entry.userId ?? "",
    fullName: entry.fullName ?? "Unknown",
    email: entry.email ?? "",
    organizerScore: Number(entry.organizerScore ?? 0),
    ghostScore: Number(entry.ghostScore ?? 0),
  }));
}