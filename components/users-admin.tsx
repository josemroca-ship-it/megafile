"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pencil, Trash2, UserPlus } from "lucide-react";

type UserRow = {
  id: string;
  username: string;
  role: "ANALISTA" | "CAPTURADOR";
  createdAt: string;
};

const COMPANIES = ["Banco", "Aseguradora", "Gestora"] as const;
type CompanyName = (typeof COMPANIES)[number];

export function UsersAdmin() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ANALISTA" | "CAPTURADOR">("CAPTURADOR");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<"ANALISTA" | "CAPTURADOR">("CAPTURADOR");
  const [userCompanyById, setUserCompanyById] = useState<Record<string, CompanyName>>({});

  async function loadUsers() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/users");
    const data = (await response.json().catch(() => null)) as { users?: UserRow[]; error?: string } | null;
    if (!response.ok || !data?.users) {
      setError(data?.error ?? "No se pudo cargar usuarios");
      setLoading(false);
      return;
    }
    const nextUsers = data.users;
    setUsers(nextUsers);
    setUserCompanyById((prev) => {
      const next = { ...prev };
      nextUsers.forEach((user, index) => {
        if (!next[user.id]) next[user.id] = COMPANIES[index % COMPANIES.length];
      });
      return next;
    });
    setLoading(false);
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role })
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error ?? "No se pudo crear usuario");
      return;
    }

    setUsername("");
    setPassword("");
    setRole("CAPTURADOR");
    await loadUsers();
  }

  function startEdit(user: UserRow) {
    setEditingId(user.id);
    setEditUsername(user.username);
    setEditPassword("");
    setEditRole(user.role);
  }

  async function saveEdit() {
    if (!editingId) return;
    setError(null);
    const response = await fetch(`/api/users/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: editUsername, password: editPassword || undefined, role: editRole })
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
        <h2 className="font-display text-3xl text-navy">Gestión de usuarios</h2>
        <p className="mt-1 text-sm text-slate-600">Solo analistas pueden crear, modificar y eliminar cuentas.</p>

        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={createUser}>
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
            <option value="CAPTURADOR">Operador</option>
            <option value="ANALISTA">Analista</option>
          </select>
          <button className="bank-btn inline-flex items-center justify-center gap-2" type="submit">
            <UserPlus size={16} /> Añadir usuario
          </button>
        </form>
        {error && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
      </article>

      <article className="bank-card p-6">
        <h3 className="font-display text-xl text-navy">Usuarios registrados</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-[1.1fr_1.9fr]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Gestión de empresas</p>
            <p className="mt-1 text-sm text-slate-600">Empresas disponibles para asignación visual de usuarios.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {COMPANIES.map((company) => (
                <span
                  key={company}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800"
                >
                  {company}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Asignación por usuario</p>
            <p className="mt-1 text-sm text-amber-900/80">
              Puedes asociar cada usuario a una empresa desde la tabla. Esta asignación es visual y no persiste.
            </p>
          </div>
        </div>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Cargando...</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="pb-2">Usuario</th>
                  <th className="pb-2">Rol</th>
                  <th className="pb-2">Empresa</th>
                  <th className="pb-2">Alta</th>
                  <th className="pb-2">Acciones</th>
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
                            <option value="CAPTURADOR">Operador</option>
                            <option value="ANALISTA">Analista</option>
                          </select>
                        ) : user.role === "ANALISTA" ? (
                          "Analista"
                        ) : (
                          "Operador"
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <select
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                            value={userCompanyById[user.id] ?? COMPANIES[0]}
                            onChange={(e) =>
                              setUserCompanyById((prev) => ({
                                ...prev,
                                [user.id]: e.target.value as CompanyName
                              }))
                            }
                          >
                            {COMPANIES.map((company) => (
                              <option key={company} value={company}>
                                {company}
                              </option>
                            ))}
                          </select>
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            visual
                          </span>
                        </div>
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
                              Cancelar
                            </button>
                            <button className="bank-btn" type="button" onClick={() => void saveEdit()}>
                              Guardar
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button className="bank-btn-secondary inline-flex items-center gap-1" onClick={() => startEdit(user)}>
                              <Pencil size={14} /> Editar
                            </button>
                            <button className="bank-btn-danger inline-flex items-center gap-1" onClick={() => void removeUser(user)}>
                              <Trash2 size={14} /> Eliminar
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
