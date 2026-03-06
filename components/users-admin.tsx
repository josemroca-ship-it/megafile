"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import type { Lang } from "@/lib/i18n";

type CompanyOption = {
  id: string;
  name: string;
};

type UserRow = {
  id: string;
  username: string;
  role: "ANALISTA" | "CAPTURADOR";
  createdAt: string;
  companyId: string | null;
  company?: CompanyOption | null;
};

export function UsersAdmin({ lang }: { lang: Lang }) {
  const t =
    lang === "en"
      ? {
          title: "User management",
          subtitle: "Only analysts can create, modify and delete accounts.",
          users: "Users",
          loading: "Loading...",
          addUser: "Add user",
          operator: "Operator",
          analyst: "Analyst",
          createdAt: "Created",
          actions: "Actions",
          edit: "Edit",
          delete: "Delete",
          save: "Save",
          cancel: "Cancel",
          user: "User",
          role: "Role",
          company: "Company",
          noCompany: "No company"
        }
      : {
          title: "Gestión de usuarios",
          subtitle: "Solo analistas pueden crear, modificar y eliminar cuentas.",
          users: "Usuarios registrados",
          loading: "Cargando...",
          addUser: "Añadir usuario",
          operator: "Operador",
          analyst: "Analista",
          createdAt: "Alta",
          actions: "Acciones",
          edit: "Editar",
          delete: "Eliminar",
          save: "Guardar",
          cancel: "Cancelar",
          user: "Usuario",
          role: "Rol",
          company: "Empresa",
          noCompany: "Sin empresa"
        };

  const [users, setUsers] = useState<UserRow[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ANALISTA" | "CAPTURADOR">("CAPTURADOR");
  const [companyId, setCompanyId] = useState<string>("none");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<"ANALISTA" | "CAPTURADOR">("CAPTURADOR");
  const [editCompanyId, setEditCompanyId] = useState<string>("none");

  async function loadUsers() {
    const response = await fetch("/api/users");
    const data = (await response.json().catch(() => null)) as { users?: UserRow[]; error?: string } | null;
    if (!response.ok || !data?.users) {
      throw new Error(data?.error ?? "No se pudo cargar usuarios");
    }
    setUsers(data.users);
  }

  async function loadCompanies() {
    const response = await fetch("/api/companies");
    const data = (await response.json().catch(() => null)) as { companies?: CompanyOption[]; error?: string } | null;
    if (!response.ok || !data?.companies) {
      throw new Error(data?.error ?? "No se pudo cargar empresas");
    }
    setCompanies(data.companies);
  }

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadUsers(), loadCompanies()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        role,
        companyId: companyId === "none" ? null : companyId
      })
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error ?? "No se pudo crear usuario");
      return;
    }

    setUsername("");
    setPassword("");
    setRole("CAPTURADOR");
    setCompanyId("none");
    await loadUsers();
  }

  function startEdit(user: UserRow) {
    setEditingId(user.id);
    setEditUsername(user.username);
    setEditPassword("");
    setEditRole(user.role);
    setEditCompanyId(user.companyId ?? "none");
  }

  async function saveEdit() {
    if (!editingId) return;
    setError(null);
    const response = await fetch(`/api/users/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: editUsername,
        password: editPassword || undefined,
        role: editRole,
        companyId: editCompanyId === "none" ? null : editCompanyId
      })
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error ?? "No se pudo actualizar usuario");
      return;
    }

    setEditingId(null);
    await loadUsers();
  }

  async function removeUser(user: UserRow) {
    if (!confirm(`¿Eliminar usuario ${user.username}?`)) return;
    setError(null);
    const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error ?? "No se pudo eliminar usuario");
      return;
    }
    await loadUsers();
  }

  return (
    <section className="space-y-5">
      <article className="bank-card p-6">
        <h2 className="font-display text-3xl text-navy">{t.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>

        <form className="mt-4 grid gap-3 md:grid-cols-5" onSubmit={createUser}>
          <input className="bank-input" placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input
            className="bank-input"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <select className="bank-input" value={role} onChange={(e) => setRole(e.target.value as "ANALISTA" | "CAPTURADOR")}>
            <option value="CAPTURADOR">{t.operator}</option>
            <option value="ANALISTA">{t.analyst}</option>
          </select>
          <select className="bank-input" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            <option value="none">{t.noCompany}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          <button className="bank-btn inline-flex items-center justify-center gap-2" type="submit">
            <UserPlus size={16} /> {t.addUser}
          </button>
        </form>
        {error && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
      </article>

      <article className="bank-card p-6">
        <h3 className="font-display text-xl text-navy">{t.users}</h3>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">{t.loading}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="pb-2">{t.user}</th>
                  <th className="pb-2">{t.role}</th>
                  <th className="pb-2">{t.company}</th>
                  <th className="pb-2">{t.createdAt}</th>
                  <th className="pb-2">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isEditing = editingId === user.id;
                  return (
                    <tr key={user.id} className="border-b border-slate-100">
                      <td className="py-3">
                        {isEditing ? (
                          <input className="bank-input" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
                        ) : (
                          user.username
                        )}
                      </td>
                      <td className="py-3">
                        {isEditing ? (
                          <select className="bank-input" value={editRole} onChange={(e) => setEditRole(e.target.value as "ANALISTA" | "CAPTURADOR")}>
                            <option value="CAPTURADOR">{t.operator}</option>
                            <option value="ANALISTA">{t.analyst}</option>
                          </select>
                        ) : user.role === "ANALISTA" ? (
                          t.analyst
                        ) : (
                          t.operator
                        )}
                      </td>
                      <td className="py-3">
                        {isEditing ? (
                          <select className="bank-input" value={editCompanyId} onChange={(e) => setEditCompanyId(e.target.value)}>
                            <option value="none">{t.noCompany}</option>
                            {companies.map((company) => (
                              <option key={company.id} value={company.id}>
                                {company.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                            {user.company?.name ?? t.noCompany}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-slate-600">{new Date(user.createdAt).toLocaleString("es-CL")}</td>
                      <td className="py-3">
                        {isEditing ? (
                          <div className="flex flex-wrap gap-2">
                            <input
                              className="bank-input max-w-56"
                              type="password"
                              placeholder="Nueva contraseña (opcional)"
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                            />
                            <button className="bank-btn-secondary" type="button" onClick={() => setEditingId(null)}>
                              {t.cancel}
                            </button>
                            <button className="bank-btn" type="button" onClick={() => void saveEdit()}>
                              {t.save}
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button className="bank-btn-secondary inline-flex items-center gap-1" onClick={() => startEdit(user)}>
                              <Pencil size={14} /> {t.edit}
                            </button>
                            <button className="bank-btn-danger inline-flex items-center gap-1" onClick={() => void removeUser(user)}>
                              <Trash2 size={14} /> {t.delete}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
