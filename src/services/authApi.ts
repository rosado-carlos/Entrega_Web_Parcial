import { apiFetch } from "./apiClient";
import type { RegisterData } from "../types";

export async function loginUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const response = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: normalizedEmail,
      password,
    }),
  });

  localStorage.setItem("token", response.token);
  localStorage.setItem("authEmail", normalizedEmail);

  return {
    success: true,
    message: "Welcome back.",
    token: response.token,
  };
}

export async function registerUser(rawData: RegisterData) {
  const response = await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: rawData.email.trim().toLowerCase(),
      password: rawData.password.trim(),
      fullName: rawData.fullName.trim(),
      major: rawData.major.trim(),
      avatarUrl: rawData.avatarUrl?.trim() || null,
    }),
  });

  return {
    success: true,
    message: response.message ?? "Account created successfully.",
  };
}

export async function logoutUser() {
  localStorage.removeItem("token");
  localStorage.removeItem("authEmail");

  return {
    success: true,
    message: "Session closed.",
  };
}

export function getStoredToken() {
  return localStorage.getItem("token");
}

export function getStoredEmail() {
  return localStorage.getItem("authEmail");
}