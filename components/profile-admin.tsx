"use client";

import { FormEvent, useEffect, useState } from "react";

type Profile = {
  id: string;
  username: string;
  role: "ANALISTA" | "CAPTURADOR";
  createdAt: string;
};

export function ProfileAdmin() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadProfile() {
    const response = await fetch("/api/profile");
    const data = (await response.json().catch(() => null)) as { user?: Profile; error?: string } | null;
    if (!response.ok || !data?.user) {
      setError(data?.error ?? "No se pudo cargar perfil");
      return;
    }

    setProfile(data.user);
    setUsername(data.user.username);
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined
      })
    });

    const data = (await response.json().catch(() => null)) as { user?: Profile; error?: string } | null;
    if (!response.ok || !data?.user) {
      setError(data?.error ?? "No se pudo actualizar perfil");
      return;
    }

    setProfile(data.user);
    setUsername(data.user.username);
    setCurrentPassword("");
    setNewPassword("");
    setMsg("Perfil actualizado correctamente");
  }

  return (
    <section className="space-y-5">
      <article className="bank-card p-6">
        <h2 className="font-display text-3xl text-navy">Mi perfil</h2>
        <p className="mt-1 text-sm text-slate-600">Configuración de cuenta del analista.</p>

        {profile && (
          <div className="mt-4 grid gap-2 text-xs md:grid-cols-3">
            <p className="rounded-lg bg-slate-50 px-3 py-2"><span className="font-semibold">Usuario:</span> {profile.username}</p>
            <p className="rounded-lg bg-slate-50 px-3 py-2"><span className="font-semibold">Rol:</span> {profile.role}</p>
            <p className="rounded-lg bg-slate-50 px-3 py-2"><span className="font-semibold">Alta:</span> {new Date(profile.createdAt).toLocaleString("es-CL")}</p>
          </div>
        )}

        <form className="mt-5 grid gap-3 md:max-w-xl" onSubmit={onSave}>
          <input className="bank-input" placeholder="Nombre de usuario" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input
            className="bank-input"
            type="password"
            placeholder="Contraseña actual (si cambias contraseña)"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <input
            className="bank-input"
            type="password"
            placeholder="Nueva contraseña (opcional)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button className="bank-btn w-fit" type="submit">
            Guardar cambios
          </button>
        </form>

        {error && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
        {msg && <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{msg}</p>}
      </article>
    </section>
  );
}
