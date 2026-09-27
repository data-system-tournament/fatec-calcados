import type { StaffUser } from "../../types";
import { ApiError, ensureCsrfCookie, request } from "./http";

// Login da equipe na área /admin (usuário + senha, sessão do Django). Os usuários são criados com
// `manage.py criar_admin`.

export type ApiStaffUser = { usuario: string; nome: string };

const toStaffUser = (d: ApiStaffUser): StaffUser => ({ username: d.usuario, name: d.nome });

// Quem está logado, ou null se não houver sessão da equipe (401). Também traz o cookie csrftoken,
// necessário para os POST da loja (vendas, clientes, estoque).
export async function fetchStaff(): Promise<StaffUser | null> {
  try {
    return toStaffUser(await request<ApiStaffUser>("/api/equipe/"));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function staffSignIn(username: string, password: string): Promise<StaffUser> {
  await ensureCsrfCookie();
  return toStaffUser(
    await request<ApiStaffUser>("/api/equipe/entrar/", { method: "POST", body: { usuario: username, senha: password } }),
  );
}

export async function staffSignOut(): Promise<void> {
  await request("/api/equipe/sair/", { method: "POST" });
}
