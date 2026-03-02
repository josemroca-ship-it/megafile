"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";

type Profile = {
  id: string;
  username: string;
  role: "ANALISTA" | "CAPTURADOR";
  createdAt: string;
};

export function ProfileAdmin({ lang }: { lang: Lang }) {
  const t = lang === "en"
    ? {
        title: "My profile",
        subtitle: "Analyst account settings.",
        user: "User:",
        role: "Role:",
        created: "Created:",
        username: "Username",
        currentPwd: "Current password (if changing password)",
        newPwd: "New password (optional)",
        save: "Save changes",
        loadError: "Unable to load profile",
        updateError: "Unable to update profile",
        updated: "Profile updated successfully"
      }
    : {
        title: "Mi perfil",
        subtitle: "Configuración de cuenta del analista.",
        user: "Usuario:",
        role: "Rol:",
        created: "Alta:",
        username: "Nombre de usuario",
        currentPwd: "Contraseña actual (si cambias contraseña)",
        newPwd: "Nueva contraseña (opcional)",
        save: "Guardar cambios",
        loadError: "No se pudo cargar perfil",
        updateError: "No se pudo actualizar perfil",
        updated: "Perfil actualizado correctamente"
      };
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
      setError(data?.error ?? t.loadError);
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
      setError(data?.error ?? t.updateError);
      return;
    }

    setProfile(data.user);
    setUsername(data.user.username);
    setCurrentPassword("");
    setNewPassword("");
    setMsg(t.updated);
  }

  return (
    <section className="space-y-5">
      <article className="bank-card p-6">
        <h2 className="font-display text-3xl text-navy">{t.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>

        {profile && (
          <div className="mt-4 grid gap-2 text-xs md:grid-cols-3">
            <p className="rounded-lg bg-slate-50 px-3 py-2"><span className="font-semibold">{t.user}</span> {profile.username}</p>
            <p className="rounded-lg bg-slate-50 px-3 py-2"><span className="font-semibold">{t.role}</span> {profile.role}</p>
            <p className="rounded-lg bg-slate-50 px-3 py-2"><span className="font-semibold">{t.created}</span> {new Date(profile.createdAt).toLocaleString("es-CL")}</p>
          </div>
        )}

        <form className="mt-5 grid gap-3 md:max-w-xl" onSubmit={onSave}>
          <input className="bank-input" placeholder={t.username} value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input
            className="bank-input"
            type="password"
            placeholder={t.currentPwd}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <input
            className="bank-input"
            type="password"
            placeholder={t.newPwd}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button className="bank-btn w-fit" type="submit">
            {t.save}
          </button>
        </form>

        {error && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
        {msg && <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{msg}</p>}
      </article>
    </section>
  );
}
