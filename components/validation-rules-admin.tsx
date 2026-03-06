"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import type { Lang } from "@/lib/i18n";

type CompanyOption = { id: string; name: string };
type RuleKey = "amount_consistency" | "identification_consistency" | "merchandise_consistency" | "date_consistency";
type DocType = "ALL" | "FACTURA" | "TRANSPORTE" | "IDENTIDAD" | "SOLICITUD" | "OTRO";
type Severity = "WARN" | "ERROR";

type RuleRow = {
  id: string;
  companyId: string;
  name: string;
  ruleKey: RuleKey;
  documentType: DocType;
  severity: Severity;
  isActive: boolean;
  config: Record<string, unknown> | null;
  createdAt: string;
  company: CompanyOption;
};

export function ValidationRulesAdmin({ lang }: { lang: Lang }) {
  const t = lang === "en"
    ? {
        title: "Validation rules by company",
        subtitle: "Define rule logic, severity and thresholds per company and document type.",
        company: "Company",
        allCompanies: "All companies",
        name: "Rule name",
        rule: "Rule",
        docType: "Document type",
        severity: "Severity",
        active: "Active",
        actions: "Actions",
        add: "Add rule",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        loading: "Loading...",
        empty: "No rules yet for this company.",
        tolerancePct: "Tolerance %",
        toleranceAbs: "Abs tolerance",
        toleranceDays: "Tolerance days",
        minCoverage: "Min coverage",
        update: "Update",
        filterByCompany: "Filter by company"
      }
    : {
        title: "Reglas de validación por empresa",
        subtitle: "Define lógica, severidad y tolerancias por empresa y tipo documental.",
        company: "Empresa",
        allCompanies: "Todas las empresas",
        name: "Nombre regla",
        rule: "Regla",
        docType: "Tipo documental",
        severity: "Severidad",
        active: "Activa",
        actions: "Acciones",
        add: "Añadir regla",
        save: "Guardar",
        cancel: "Cancelar",
        delete: "Eliminar",
        loading: "Cargando...",
        empty: "Aún no hay reglas para esta empresa.",
        tolerancePct: "Tolerancia %",
        toleranceAbs: "Tolerancia abs",
        toleranceDays: "Tolerancia días",
        minCoverage: "Cobertura mínima",
        update: "Actualizar",
        filterByCompany: "Filtrar por empresa"
      };

  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyFilter, setCompanyFilter] = useState("all");
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyId, setCompanyId] = useState("");
  const [name, setName] = useState("");
  const [ruleKey, setRuleKey] = useState<RuleKey>("identification_consistency");
  const [documentType, setDocumentType] = useState<DocType>("ALL");
  const [severity, setSeverity] = useState<Severity>("ERROR");
  const [isActive, setIsActive] = useState(true);
  const [tolerancePct, setTolerancePct] = useState("0.03");
  const [toleranceAbs, setToleranceAbs] = useState("250");
  const [toleranceDays, setToleranceDays] = useState("7");
  const [minCoverage, setMinCoverage] = useState("0.6");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<RuleRow | null>(null);

  useEffect(() => {
    async function loadCompanies() {
      const response = await fetch("/api/companies");
      const data = (await response.json().catch(() => null)) as { companies?: CompanyOption[]; error?: string } | null;
      if (!response.ok || !data?.companies) {
        setError(data?.error ?? "No se pudo cargar empresas.");
        return;
      }
      setCompanies(data.companies);
      if (!companyId && data.companies[0]?.id) setCompanyId(data.companies[0].id);
    }
    void loadCompanies();
  }, [companyId]);

  async function loadRules() {
    setLoading(true);
    setError(null);
    const query = companyFilter !== "all" ? `?companyId=${encodeURIComponent(companyFilter)}` : "";
    const response = await fetch(`/api/validation-rules${query}`);
    const data = (await response.json().catch(() => null)) as { rules?: RuleRow[]; error?: string } | null;
    if (!response.ok || !data?.rules) {
      setError(data?.error ?? "No se pudieron cargar reglas.");
      setLoading(false);
      return;
    }
    setRules(data.rules);
    setLoading(false);
  }

  useEffect(() => {
    void loadRules();
  }, [companyFilter]);

  const ruleOptions = useMemo(
    () => [
      { value: "identification_consistency", label: "Identificación" },
      { value: "amount_consistency", label: "Monto" },
      { value: "date_consistency", label: "Fecha" },
      { value: "merchandise_consistency", label: "Mercancía" }
    ] as Array<{ value: RuleKey; label: string }>,
    []
  );

  function buildConfig(selectedRuleKey: RuleKey) {
    if (selectedRuleKey === "amount_consistency") {
      return { tolerancePct: Number(tolerancePct || "0.03"), toleranceAbs: Number(toleranceAbs || "250") };
    }
    if (selectedRuleKey === "date_consistency") {
      return { toleranceDays: Number(toleranceDays || "7") };
    }
    if (selectedRuleKey === "merchandise_consistency") {
      return { minCoverage: Number(minCoverage || "0.6") };
    }
    return {};
  }

  async function createRule(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!companyId) {
      setError("Selecciona empresa.");
      return;
    }
    const response = await fetch("/api/validation-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        name,
        ruleKey,
        documentType,
        severity,
        isActive,
        config: buildConfig(ruleKey)
      })
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error ?? "No se pudo crear la regla.");
      return;
    }
    setName("");
    await loadRules();
  }

  function startEdit(rule: RuleRow) {
    setEditingId(rule.id);
    setEditDraft(rule);
  }

  async function saveEdit() {
    if (!editingId || !editDraft) return;
    setError(null);
    const response = await fetch(`/api/validation-rules/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editDraft.name,
        ruleKey: editDraft.ruleKey,
        documentType: editDraft.documentType,
        severity: editDraft.severity,
        isActive: editDraft.isActive,
        config: editDraft.config ?? {}
      })
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error ?? "No se pudo actualizar la regla.");
      return;
    }
    setEditingId(null);
    setEditDraft(null);
    await loadRules();
  }

  async function removeRule(ruleId: string) {
    if (!confirm("¿Eliminar regla?")) return;
    setError(null);
    const response = await fetch(`/api/validation-rules/${ruleId}`, { method: "DELETE" });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error ?? "No se pudo eliminar la regla.");
      return;
    }
    if (editingId === ruleId) {
      setEditingId(null);
      setEditDraft(null);
    }
    await loadRules();
  }

  return (
    <section className="space-y-5">
      <article className="bank-card p-6">
        <div className="inline-flex items-center gap-2 text-cyan-700">
          <ShieldCheck size={18} />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">Admin</p>
        </div>
        <h2 className="mt-2 font-display text-3xl text-navy">{t.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>

        <form className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3" onSubmit={createRule}>
          <select className="bank-input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
            <option value="">{t.company}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          <input className="bank-input" placeholder={t.name} value={name} onChange={(e) => setName(e.target.value)} required />
          <select className="bank-input" value={ruleKey} onChange={(e) => setRuleKey(e.target.value as RuleKey)}>
            {ruleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select className="bank-input" value={documentType} onChange={(e) => setDocumentType(e.target.value as DocType)}>
            <option value="ALL">Todos</option>
            <option value="FACTURA">Factura</option>
            <option value="TRANSPORTE">Transporte</option>
            <option value="IDENTIDAD">Identidad</option>
            <option value="SOLICITUD">Solicitud</option>
            <option value="OTRO">Otro</option>
          </select>
          <select className="bank-input" value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
            <option value="ERROR">ERROR</option>
            <option value="WARN">WARN</option>
          </select>
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            {t.active}
          </label>

          {ruleKey === "amount_consistency" && (
            <>
              <input className="bank-input" value={tolerancePct} onChange={(e) => setTolerancePct(e.target.value)} placeholder={t.tolerancePct} />
              <input className="bank-input" value={toleranceAbs} onChange={(e) => setToleranceAbs(e.target.value)} placeholder={t.toleranceAbs} />
            </>
          )}
          {ruleKey === "date_consistency" && (
            <input className="bank-input" value={toleranceDays} onChange={(e) => setToleranceDays(e.target.value)} placeholder={t.toleranceDays} />
          )}
          {ruleKey === "merchandise_consistency" && (
            <input className="bank-input" value={minCoverage} onChange={(e) => setMinCoverage(e.target.value)} placeholder={t.minCoverage} />
          )}

          <button className="bank-btn inline-flex items-center justify-center gap-2 lg:col-span-3" type="submit">
            <Plus size={16} /> {t.add}
          </button>
        </form>
        {error && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
      </article>

      <article className="bank-card p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="text-sm text-slate-600">{t.filterByCompany}:</label>
          <select className="bank-input max-w-xs" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
            <option value="all">{t.allCompanies}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">{t.loading}</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-slate-500">{t.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="pb-2">{t.company}</th>
                  <th className="pb-2">{t.name}</th>
                  <th className="pb-2">{t.rule}</th>
                  <th className="pb-2">{t.docType}</th>
                  <th className="pb-2">{t.severity}</th>
                  <th className="pb-2">{t.active}</th>
                  <th className="pb-2">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => {
                  const isEditing = editingId === rule.id;
                  const row = isEditing && editDraft ? editDraft : rule;
                  return (
                    <tr key={rule.id} className="border-b border-slate-100">
                      <td className="py-3 text-slate-700">{rule.company.name}</td>
                      <td className="py-3">
                        {isEditing ? (
                          <input
                            className="bank-input max-w-sm"
                            value={row.name}
                            onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                          />
                        ) : (
                          <span className="font-medium text-slate-800">{rule.name}</span>
                        )}
                      </td>
                      <td className="py-3">
                        {isEditing ? (
                          <select
                            className="bank-input max-w-xs"
                            value={row.ruleKey}
                            onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, ruleKey: e.target.value as RuleKey } : prev))}
                          >
                            {ruleOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>{rule.ruleKey}</span>
                        )}
                      </td>
                      <td className="py-3">
                        {isEditing ? (
                          <select
                            className="bank-input max-w-xs"
                            value={row.documentType}
                            onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, documentType: e.target.value as DocType } : prev))}
                          >
                            <option value="ALL">ALL</option>
                            <option value="FACTURA">FACTURA</option>
                            <option value="TRANSPORTE">TRANSPORTE</option>
                            <option value="IDENTIDAD">IDENTIDAD</option>
                            <option value="SOLICITUD">SOLICITUD</option>
                            <option value="OTRO">OTRO</option>
                          </select>
                        ) : (
                          <span>{rule.documentType}</span>
                        )}
                      </td>
                      <td className="py-3">
                        {isEditing ? (
                          <select
                            className="bank-input max-w-[120px]"
                            value={row.severity}
                            onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, severity: e.target.value as Severity } : prev))}
                          >
                            <option value="ERROR">ERROR</option>
                            <option value="WARN">WARN</option>
                          </select>
                        ) : (
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${rule.severity === "ERROR" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                            {rule.severity}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {isEditing ? (
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={row.isActive}
                              onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, isActive: e.target.checked } : prev))}
                            />
                            {row.isActive ? "ON" : "OFF"}
                          </label>
                        ) : (
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${rule.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                            {rule.isActive ? "ON" : "OFF"}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {isEditing ? (
                            <>
                              <button className="bank-btn-secondary" type="button" onClick={() => { setEditingId(null); setEditDraft(null); }}>
                                {t.cancel}
                              </button>
                              <button className="bank-btn" type="button" onClick={() => void saveEdit()}>
                                {t.update}
                              </button>
                            </>
                          ) : (
                            <button className="bank-btn-secondary" type="button" onClick={() => startEdit(rule)}>
                              {t.save}
                            </button>
                          )}
                          <button className="bank-btn-danger inline-flex items-center gap-1" type="button" onClick={() => void removeRule(rule.id)}>
                            <Trash2 size={14} />
                            {t.delete}
                          </button>
                        </div>
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
