"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import type { Lang } from "@/lib/i18n";

type CompanyRow = {
  id: string;
  name: string;
  createdAt: string;
};

export function CompaniesAdmin({ lang }: { lang: Lang }) {
  const t = lang === "en"
    ? {
        title: "Company management",
        subtitle: "Create, edit and delete companies for your operating model.",
        addCompany: "Add company",
        companyName: "Company name",
        loading: "Loading...",
        empty: "No companies yet.",
        createdAt: "Created",
        actions: "Actions",
        edit: "Edit",
        delete: "Delete",
        save: "Save",
        cancel: "Cancel",
        deleteConfirm: "Delete this company?"
      }
    : {
        title: "Gestión de empresas",
        subtitle: "Crea, edita y elimina empresas para tu modelo operativo.",
        addCompany: "Añadir empresa",
        companyName: "Nombre empresa",
        loading: "Cargando...",
        empty: "Aún no hay empresas.",
        createdAt: "Alta",
        actions: "Acciones",
        edit: "Editar",
        delete: "Eliminar",
        save: "Guardar",
        cancel: "Cancelar",
        deleteConfirm: "¿Eliminar esta empresa?"
      };

  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function loadCompanies() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/companies");
    const data = (await response.json().catch(() => null)) as { companies?: CompanyRow[]; error?: string } | null;
    if (!response.ok || !data?.companies) {
      setError(data?.error ?? "No se pudo cargar empresas");
      setLoading(false);
      return;
    }
    setCompanies(data.companies);
    setLoading(false);
  }

  useEffect(() => {
    void loadCompanies();
  }, []);

  async function createCompany(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const response = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error ?? "No se pudo crear empresa");
      return;
    }

    setName("");
    await loadCompanies();
  }

  function startEdit(company: CompanyRow) {
    setEditingId(company.id);
    setEditName(company.name);
  }

  async function saveEdit() {
    if (!editingId) return;
    setError(null);
    const response = await fetch(`/api/companies/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName })
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error ?? "No se pudo actualizar empresa");
      return;
    }

    setEditingId(null);
    await loadCompanies();
  }

  async function removeCompany(company: CompanyRow) {
    if (!confirm(t.deleteConfirm)) return;
    setError(null);
    const response = await fetch(`/api/companies/${company.id}`, { method: "DELETE" });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error ?? "No se pudo eliminar empresa");
      return;
    }
    await loadCompanies();
  }

  return (
    <section className="space-y-5">
      <article className="bank-card p-6">
        <div className="inline-flex items-center gap-2 text-cyan-700">
          <Building2 size={18} />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">Admin</p>
        </div>
        <h2 className="mt-2 font-display text-3xl text-navy">{t.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>

        <form className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={createCompany}>
          <input
            className="bank-input"
            placeholder={t.companyName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button className="bank-btn inline-flex items-center justify-center gap-2" type="submit">
            <Plus size={16} /> {t.addCompany}
          </button>
        </form>

        {error && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
      </article>

      <article className="bank-card p-6">
        {loading ? (
          <p className="text-sm text-slate-500">{t.loading}</p>
        ) : companies.length === 0 ? (
          <p className="text-sm text-slate-500">{t.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="pb-2">{t.companyName}</th>
                  <th className="pb-2">{t.createdAt}</th>
                  <th className="pb-2">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => {
                  const isEditing = editingId === company.id;
                  return (
                    <tr key={company.id} className="border-b border-slate-100">
                      <td className="py-3">
                        {isEditing ? (
                          <input className="bank-input max-w-lg" value={editName} onChange={(e) => setEditName(e.target.value)} />
                        ) : (
                          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
                            {company.name}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-slate-600">{new Date(company.createdAt).toLocaleString("es-CL")}</td>
                      <td className="py-3">
                        {isEditing ? (
                          <div className="flex flex-wrap gap-2">
                            <button className="bank-btn-secondary" type="button" onClick={() => setEditingId(null)}>
                              {t.cancel}
                            </button>
                            <button className="bank-btn" type="button" onClick={() => void saveEdit()}>
                              {t.save}
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button className="bank-btn-secondary inline-flex items-center gap-1" onClick={() => startEdit(company)}>
                              <Pencil size={14} /> {t.edit}
                            </button>
                            <button className="bank-btn-danger inline-flex items-center gap-1" onClick={() => void removeCompany(company)}>
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
