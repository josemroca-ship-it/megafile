"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import type { Lang } from "@/lib/i18n";

type CompanyOption = { id: string; name: string };
type RuleKey = "amount_consistency" | "identification_consistency" | "merchandise_consistency" | "date_consistency";
type DocType = "ALL" | "FACTURA" | "TRANSPORTE" | "IDENTIDAD" | "SOLICITUD" | "OTRO";
type Severity = "WARN" | "ERROR";
type Comparator = "EXACT" | "NORMALIZED_TEXT" | "NUMERIC";

type RuleRow = {
  id: string;
  companyId: string;
  name: string;
  ruleKey: RuleKey;
  documentType: DocType;
  severity: Severity;
  isActive: boolean;
  config: Record<string, unknown> | null;
  company: CompanyOption;
};

type FieldRuleRow = {
  id: string;
  companyId: string;
  name: string;
  sourceDocumentType: DocType;
  targetDocumentType: DocType;
  sourceFieldPath: string;
  targetFieldPath: string;
  comparator: Comparator;
  severity: Severity;
  tolerancePct: number | null;
  toleranceAbs: number | null;
  isActive: boolean;
  company: CompanyOption;
};

export function ValidationRulesAdmin({ lang }: { lang: Lang }) {
  const t = lang === "en"
    ? {
        title: "Validation rules by company",
        subtitle: "Configure deterministic validations and field-to-field matching for each company.",
        company: "Company",
        allCompanies: "All companies",
        name: "Rule name",
        add: "Add",
        edit: "Edit",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        loading: "Loading...",
        empty: "No rules yet.",
        severity: "Severity",
        active: "Active",
        sourceDoc: "Source doc",
        targetDoc: "Target doc",
        sourceField: "Source field",
        targetField: "Target field",
        comparator: "Comparator",
        tolerancePct: "Tolerance %",
        toleranceAbs: "Tolerance abs",
        baseRules: "Base rules",
        fieldRules: "Field match rules",
        filterByCompany: "Filter by company"
      }
    : {
        title: "Reglas de validación por empresa",
        subtitle: "Configura validaciones deterministas y coincidencia de campos por empresa.",
        company: "Empresa",
        allCompanies: "Todas las empresas",
        name: "Nombre regla",
        add: "Añadir",
        edit: "Editar",
        save: "Guardar",
        cancel: "Cancelar",
        delete: "Eliminar",
        loading: "Cargando...",
        empty: "Aún no hay reglas.",
        severity: "Severidad",
        active: "Activa",
        sourceDoc: "Doc origen",
        targetDoc: "Doc destino",
        sourceField: "Campo origen",
        targetField: "Campo destino",
        comparator: "Comparador",
        tolerancePct: "Tolerancia %",
        toleranceAbs: "Tolerancia abs",
        baseRules: "Reglas base",
        fieldRules: "Reglas de coincidencia de campos",
        filterByCompany: "Filtrar por empresa"
      };

  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyFilter, setCompanyFilter] = useState("all");
  const [companyId, setCompanyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [rules, setRules] = useState<RuleRow[]>([]);
  const [fieldRules, setFieldRules] = useState<FieldRuleRow[]>([]);

  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleDraft, setRuleDraft] = useState<RuleRow | null>(null);
  const [editingFieldRuleId, setEditingFieldRuleId] = useState<string | null>(null);
  const [fieldRuleDraft, setFieldRuleDraft] = useState<FieldRuleRow | null>(null);

  const [ruleName, setRuleName] = useState("");
  const [ruleKey, setRuleKey] = useState<RuleKey>("identification_consistency");
  const [ruleDocType, setRuleDocType] = useState<DocType>("ALL");
  const [ruleSeverity, setRuleSeverity] = useState<Severity>("ERROR");
  const [ruleActive, setRuleActive] = useState(true);
  const [tolerancePct, setTolerancePct] = useState("0.03");
  const [toleranceAbs, setToleranceAbs] = useState("250");
  const [toleranceDays, setToleranceDays] = useState("7");
  const [minCoverage, setMinCoverage] = useState("0.6");

  const [fieldName, setFieldName] = useState("");
  const [sourceDocType, setSourceDocType] = useState<DocType>("FACTURA");
  const [targetDocType, setTargetDocType] = useState<DocType>("TRANSPORTE");
  const [sourceFieldPath, setSourceFieldPath] = useState("");
  const [targetFieldPath, setTargetFieldPath] = useState("");
  const [comparator, setComparator] = useState<Comparator>("NORMALIZED_TEXT");
  const [fieldSeverity, setFieldSeverity] = useState<Severity>("ERROR");
  const [fieldTolerancePct, setFieldTolerancePct] = useState("0.03");
  const [fieldToleranceAbs, setFieldToleranceAbs] = useState("250");
  const [fieldActive, setFieldActive] = useState(true);

  const docTypeOptions = useMemo(
    () => ["ALL", "FACTURA", "TRANSPORTE", "IDENTIDAD", "SOLICITUD", "OTRO"] as DocType[],
    []
  );

  const ruleOptions = useMemo(
    () =>
      [
        { value: "identification_consistency", label: "Identificación" },
        { value: "amount_consistency", label: "Monto" },
        { value: "date_consistency", label: "Fecha" },
        { value: "merchandise_consistency", label: "Mercancía" }
      ] as Array<{ value: RuleKey; label: string }>,
    []
  );

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

  async function loadAllRules() {
    setLoading(true);
    setError(null);
    const query = companyFilter !== "all" ? `?companyId=${encodeURIComponent(companyFilter)}` : "";
    const [baseRes, fieldRes] = await Promise.all([
      fetch(`/api/validation-rules${query}`),
      fetch(`/api/validation-field-rules${query}`)
    ]);
    const baseData = (await baseRes.json().catch(() => null)) as { rules?: RuleRow[]; error?: string } | null;
    const fieldData = (await fieldRes.json().catch(() => null)) as { rules?: FieldRuleRow[]; error?: string } | null;

    if (!baseRes.ok || !baseData?.rules) {
      setError(baseData?.error ?? "No se pudieron cargar reglas base.");
      setLoading(false);
      return;
    }
    if (!fieldRes.ok || !fieldData?.rules) {
      setError(fieldData?.error ?? "No se pudieron cargar reglas de campos.");
      setLoading(false);
      return;
    }

    setRules(baseData.rules);
    setFieldRules(fieldData.rules);
    setLoading(false);
  }

  useEffect(() => {
    void loadAllRules();
  }, [companyFilter]);

  function ruleConfigPayload(selectedRuleKey: RuleKey) {
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

  async function createBaseRule(e: FormEvent) {
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
        name: ruleName,
        ruleKey,
        documentType: ruleDocType,
        severity: ruleSeverity,
        isActive: ruleActive,
        config: ruleConfigPayload(ruleKey)
      })
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error ?? "No se pudo crear la regla base.");
      return;
    }
    setRuleName("");
    await loadAllRules();
  }

  async function createFieldRule(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!companyId) {
      setError("Selecciona empresa.");
      return;
    }
    const response = await fetch("/api/validation-field-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        name: fieldName,
        sourceDocumentType: sourceDocType,
        targetDocumentType: targetDocType,
        sourceFieldPath,
        targetFieldPath,
        comparator,
        severity: fieldSeverity,
        tolerancePct: comparator === "NUMERIC" ? Number(fieldTolerancePct || "0.03") : null,
        toleranceAbs: comparator === "NUMERIC" ? Number(fieldToleranceAbs || "250") : null,
        isActive: fieldActive
      })
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error ?? "No se pudo crear la regla de campos.");
      return;
    }
    setFieldName("");
    setSourceFieldPath("");
    setTargetFieldPath("");
    await loadAllRules();
  }

  async function saveBaseRuleEdit() {
    if (!editingRuleId || !ruleDraft) return;
    const response = await fetch(`/api/validation-rules/${editingRuleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: ruleDraft.name,
        ruleKey: ruleDraft.ruleKey,
        documentType: ruleDraft.documentType,
        severity: ruleDraft.severity,
        isActive: ruleDraft.isActive,
        config: ruleDraft.config ?? {}
      })
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error ?? "No se pudo actualizar la regla base.");
      return;
    }
    setEditingRuleId(null);
    setRuleDraft(null);
    await loadAllRules();
  }

  async function saveFieldRuleEdit() {
    if (!editingFieldRuleId || !fieldRuleDraft) return;
    const response = await fetch(`/api/validation-field-rules/${editingFieldRuleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fieldRuleDraft.name,
        sourceDocumentType: fieldRuleDraft.sourceDocumentType,
        targetDocumentType: fieldRuleDraft.targetDocumentType,
        sourceFieldPath: fieldRuleDraft.sourceFieldPath,
        targetFieldPath: fieldRuleDraft.targetFieldPath,
        comparator: fieldRuleDraft.comparator,
        severity: fieldRuleDraft.severity,
        tolerancePct: fieldRuleDraft.tolerancePct,
        toleranceAbs: fieldRuleDraft.toleranceAbs,
        isActive: fieldRuleDraft.isActive
      })
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error ?? "No se pudo actualizar la regla de campos.");
      return;
    }
    setEditingFieldRuleId(null);
    setFieldRuleDraft(null);
    await loadAllRules();
  }

  async function removeRule(url: string, message: string) {
    if (!confirm("¿Eliminar regla?")) return;
    const response = await fetch(url, { method: "DELETE" });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error ?? message);
      return;
    }
    await loadAllRules();
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

        <h3 className="mb-3 text-sm font-semibold text-slate-800">{t.baseRules}</h3>
        <form className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" onSubmit={createBaseRule}>
          <select className="bank-input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
            <option value="">{t.company}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          <input className="bank-input" placeholder={t.name} value={ruleName} onChange={(e) => setRuleName(e.target.value)} required />
          <select className="bank-input" value={ruleKey} onChange={(e) => setRuleKey(e.target.value as RuleKey)}>
            {ruleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select className="bank-input" value={ruleDocType} onChange={(e) => setRuleDocType(e.target.value as DocType)}>
            {docTypeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select className="bank-input" value={ruleSeverity} onChange={(e) => setRuleSeverity(e.target.value as Severity)}>
            <option value="ERROR">ERROR</option>
            <option value="WARN">WARN</option>
          </select>
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <input type="checkbox" checked={ruleActive} onChange={(e) => setRuleActive(e.target.checked)} />
            {t.active}
          </label>
          {ruleKey === "amount_consistency" && (
            <>
              <input className="bank-input" value={tolerancePct} onChange={(e) => setTolerancePct(e.target.value)} placeholder={t.tolerancePct} />
              <input className="bank-input" value={toleranceAbs} onChange={(e) => setToleranceAbs(e.target.value)} placeholder={t.toleranceAbs} />
            </>
          )}
          {ruleKey === "date_consistency" && (
            <input className="bank-input" value={toleranceDays} onChange={(e) => setToleranceDays(e.target.value)} placeholder="Tolerance days" />
          )}
          {ruleKey === "merchandise_consistency" && (
            <input className="bank-input" value={minCoverage} onChange={(e) => setMinCoverage(e.target.value)} placeholder="Min coverage" />
          )}
          <button className="bank-btn inline-flex items-center justify-center gap-2 lg:col-span-3" type="submit">
            <Plus size={16} /> {t.add}
          </button>
        </form>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">{t.loading}</p>
        ) : rules.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">{t.empty}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="pb-2">{t.company}</th>
                  <th className="pb-2">{t.name}</th>
                  <th className="pb-2">Rule</th>
                  <th className="pb-2">Doc</th>
                  <th className="pb-2">{t.severity}</th>
                  <th className="pb-2">{t.active}</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => {
                  const editing = editingRuleId === rule.id;
                  const row = editing && ruleDraft ? ruleDraft : rule;
                  return (
                    <tr key={rule.id} className="border-b border-slate-100">
                      <td className="py-3">{rule.company.name}</td>
                      <td className="py-3">
                        {editing ? (
                          <input className="bank-input max-w-sm" value={row.name} onChange={(e) => setRuleDraft((prev) => (prev ? { ...prev, name: e.target.value } : prev))} />
                        ) : row.name}
                      </td>
                      <td className="py-3">
                        {editing ? (
                          <select className="bank-input max-w-xs" value={row.ruleKey} onChange={(e) => setRuleDraft((prev) => (prev ? { ...prev, ruleKey: e.target.value as RuleKey } : prev))}>
                            {ruleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        ) : row.ruleKey}
                      </td>
                      <td className="py-3">
                        {editing ? (
                          <select className="bank-input max-w-xs" value={row.documentType} onChange={(e) => setRuleDraft((prev) => (prev ? { ...prev, documentType: e.target.value as DocType } : prev))}>
                            {docTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        ) : row.documentType}
                      </td>
                      <td className="py-3">
                        {editing ? (
                          <select className="bank-input max-w-xs" value={row.severity} onChange={(e) => setRuleDraft((prev) => (prev ? { ...prev, severity: e.target.value as Severity } : prev))}>
                            <option value="ERROR">ERROR</option>
                            <option value="WARN">WARN</option>
                          </select>
                        ) : row.severity}
                      </td>
                      <td className="py-3">
                        {editing ? (
                          <input type="checkbox" checked={row.isActive} onChange={(e) => setRuleDraft((prev) => (prev ? { ...prev, isActive: e.target.checked } : prev))} />
                        ) : row.isActive ? "ON" : "OFF"}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          {editing ? (
                            <>
                              <button className="bank-btn-secondary" type="button" onClick={() => { setEditingRuleId(null); setRuleDraft(null); }}>{t.cancel}</button>
                              <button className="bank-btn" type="button" onClick={() => void saveBaseRuleEdit()}>{t.save}</button>
                            </>
                          ) : (
                            <button className="bank-btn-secondary" type="button" onClick={() => { setEditingRuleId(rule.id); setRuleDraft(rule); }}>{t.edit}</button>
                          )}
                          <button className="bank-btn-danger inline-flex items-center gap-1" type="button" onClick={() => void removeRule(`/api/validation-rules/${rule.id}`, "No se pudo eliminar la regla base.")}>
                            <Trash2 size={14} /> {t.delete}
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

      <article className="bank-card p-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">{t.fieldRules}</h3>
        <form className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" onSubmit={createFieldRule}>
          <select className="bank-input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
            <option value="">{t.company}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          <input className="bank-input" placeholder={t.name} value={fieldName} onChange={(e) => setFieldName(e.target.value)} required />
          <select className="bank-input" value={fieldSeverity} onChange={(e) => setFieldSeverity(e.target.value as Severity)}>
            <option value="ERROR">ERROR</option>
            <option value="WARN">WARN</option>
          </select>
          <select className="bank-input" value={sourceDocType} onChange={(e) => setSourceDocType(e.target.value as DocType)}>
            {docTypeOptions.map((option) => <option key={option} value={option}>{t.sourceDoc}: {option}</option>)}
          </select>
          <select className="bank-input" value={targetDocType} onChange={(e) => setTargetDocType(e.target.value as DocType)}>
            {docTypeOptions.map((option) => <option key={option} value={option}>{t.targetDoc}: {option}</option>)}
          </select>
          <select className="bank-input" value={comparator} onChange={(e) => setComparator(e.target.value as Comparator)}>
            <option value="EXACT">EXACT</option>
            <option value="NORMALIZED_TEXT">NORMALIZED_TEXT</option>
            <option value="NUMERIC">NUMERIC</option>
          </select>
          <input className="bank-input" placeholder={t.sourceField} value={sourceFieldPath} onChange={(e) => setSourceFieldPath(e.target.value)} required />
          <input className="bank-input" placeholder={t.targetField} value={targetFieldPath} onChange={(e) => setTargetFieldPath(e.target.value)} required />
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <input type="checkbox" checked={fieldActive} onChange={(e) => setFieldActive(e.target.checked)} />
            {t.active}
          </label>
          {comparator === "NUMERIC" && (
            <>
              <input className="bank-input" placeholder={t.tolerancePct} value={fieldTolerancePct} onChange={(e) => setFieldTolerancePct(e.target.value)} />
              <input className="bank-input" placeholder={t.toleranceAbs} value={fieldToleranceAbs} onChange={(e) => setFieldToleranceAbs(e.target.value)} />
            </>
          )}
          <button className="bank-btn inline-flex items-center justify-center gap-2 lg:col-span-3" type="submit">
            <Plus size={16} /> {t.add}
          </button>
        </form>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">{t.loading}</p>
        ) : fieldRules.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">{t.empty}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="pb-2">{t.company}</th>
                  <th className="pb-2">{t.name}</th>
                  <th className="pb-2">{t.sourceDoc}</th>
                  <th className="pb-2">{t.sourceField}</th>
                  <th className="pb-2">{t.targetDoc}</th>
                  <th className="pb-2">{t.targetField}</th>
                  <th className="pb-2">{t.comparator}</th>
                  <th className="pb-2">{t.severity}</th>
                  <th className="pb-2">{t.active}</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fieldRules.map((rule) => {
                  const editing = editingFieldRuleId === rule.id;
                  const row = editing && fieldRuleDraft ? fieldRuleDraft : rule;
                  return (
                    <tr key={rule.id} className="border-b border-slate-100">
                      <td className="py-3">{rule.company.name}</td>
                      <td className="py-3">
                        {editing ? (
                          <input className="bank-input max-w-sm" value={row.name} onChange={(e) => setFieldRuleDraft((prev) => (prev ? { ...prev, name: e.target.value } : prev))} />
                        ) : row.name}
                      </td>
                      <td className="py-3">
                        {editing ? (
                          <select className="bank-input max-w-xs" value={row.sourceDocumentType} onChange={(e) => setFieldRuleDraft((prev) => (prev ? { ...prev, sourceDocumentType: e.target.value as DocType } : prev))}>
                            {docTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        ) : row.sourceDocumentType}
                      </td>
                      <td className="py-3">
                        {editing ? (
                          <input className="bank-input max-w-xs" value={row.sourceFieldPath} onChange={(e) => setFieldRuleDraft((prev) => (prev ? { ...prev, sourceFieldPath: e.target.value } : prev))} />
                        ) : row.sourceFieldPath}
                      </td>
                      <td className="py-3">
                        {editing ? (
                          <select className="bank-input max-w-xs" value={row.targetDocumentType} onChange={(e) => setFieldRuleDraft((prev) => (prev ? { ...prev, targetDocumentType: e.target.value as DocType } : prev))}>
                            {docTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        ) : row.targetDocumentType}
                      </td>
                      <td className="py-3">
                        {editing ? (
                          <input className="bank-input max-w-xs" value={row.targetFieldPath} onChange={(e) => setFieldRuleDraft((prev) => (prev ? { ...prev, targetFieldPath: e.target.value } : prev))} />
                        ) : row.targetFieldPath}
                      </td>
                      <td className="py-3">
                        {editing ? (
                          <select className="bank-input max-w-xs" value={row.comparator} onChange={(e) => setFieldRuleDraft((prev) => (prev ? { ...prev, comparator: e.target.value as Comparator } : prev))}>
                            <option value="EXACT">EXACT</option>
                            <option value="NORMALIZED_TEXT">NORMALIZED_TEXT</option>
                            <option value="NUMERIC">NUMERIC</option>
                          </select>
                        ) : row.comparator}
                      </td>
                      <td className="py-3">
                        {editing ? (
                          <select className="bank-input max-w-xs" value={row.severity} onChange={(e) => setFieldRuleDraft((prev) => (prev ? { ...prev, severity: e.target.value as Severity } : prev))}>
                            <option value="ERROR">ERROR</option>
                            <option value="WARN">WARN</option>
                          </select>
                        ) : row.severity}
                      </td>
                      <td className="py-3">
                        {editing ? (
                          <input type="checkbox" checked={row.isActive} onChange={(e) => setFieldRuleDraft((prev) => (prev ? { ...prev, isActive: e.target.checked } : prev))} />
                        ) : row.isActive ? "ON" : "OFF"}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          {editing ? (
                            <>
                              <button className="bank-btn-secondary" type="button" onClick={() => { setEditingFieldRuleId(null); setFieldRuleDraft(null); }}>{t.cancel}</button>
                              <button className="bank-btn" type="button" onClick={() => void saveFieldRuleEdit()}>{t.save}</button>
                            </>
                          ) : (
                            <button className="bank-btn-secondary" type="button" onClick={() => { setEditingFieldRuleId(rule.id); setFieldRuleDraft(rule); }}>{t.edit}</button>
                          )}
                          <button className="bank-btn-danger inline-flex items-center gap-1" type="button" onClick={() => void removeRule(`/api/validation-field-rules/${rule.id}`, "No se pudo eliminar la regla de campos.")}>
                            <Trash2 size={14} /> {t.delete}
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
