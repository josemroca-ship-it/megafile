"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FileCheck2, MessageSquareQuote, Plus, ShieldCheck, Tags, Trash2 } from "lucide-react";
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
        title: "Rules and prompts",
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
        filterByCompany: "Filter by company",
        aiPrompts: "AI prompts by company",
        extractionPrompt: "Extraction prompt",
        searchPrompt: "Search agent prompt",
        extractionProvider: "Extraction API",
        extractionModel: "Extraction model",
        searchProvider: "Search API",
        searchModel: "Search model",
        openaiKey: "OpenAI API key",
        geminiKey: "Gemini API key",
        anthropicKey: "Anthropic API key",
        keyConfigured: "Configured",
        keyMissing: "Not configured",
        clearKey: "Clear key",
        savePrompts: "Save prompts",
        tabBase: "Base rules",
        tabField: "Match rules",
        tabPrompts: "Prompts"
      }
    : {
        title: "Reglas y prompts",
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
        filterByCompany: "Filtrar por empresa",
        aiPrompts: "Prompts IA por empresa",
        extractionPrompt: "Prompt extracción",
        searchPrompt: "Prompt agente búsqueda",
        extractionProvider: "API extracción",
        extractionModel: "Modelo extracción",
        searchProvider: "API búsqueda",
        searchModel: "Modelo búsqueda",
        openaiKey: "API key OpenAI",
        geminiKey: "API key Gemini",
        anthropicKey: "API key Anthropic",
        keyConfigured: "Configurada",
        keyMissing: "Sin configurar",
        clearKey: "Borrar key",
        savePrompts: "Guardar prompts",
        tabBase: "Reglas base",
        tabField: "Reglas de coincidencia",
        tabPrompts: "Prompts"
      };

  const [activeSection, setActiveSection] = useState<"base" | "field" | "prompts">("base");

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
  const [promptCompanyId, setPromptCompanyId] = useState("");
  const [extractionProvider, setExtractionProvider] = useState<"openai" | "gemini" | "anthropic">("openai");
  const [extractionModel, setExtractionModel] = useState("gpt-4.1-mini");
  const [extractionPrompt, setExtractionPrompt] = useState("");
  const [searchProvider, setSearchProvider] = useState<"openai" | "gemini" | "anthropic">("openai");
  const [searchModel, setSearchModel] = useState("gpt-4.1-mini");
  const [searchPrompt, setSearchPrompt] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [hasOpenaiApiKey, setHasOpenaiApiKey] = useState(false);
  const [hasGeminiApiKey, setHasGeminiApiKey] = useState(false);
  const [hasAnthropicApiKey, setHasAnthropicApiKey] = useState(false);
  const [clearOpenaiApiKey, setClearOpenaiApiKey] = useState(false);
  const [clearGeminiApiKey, setClearGeminiApiKey] = useState(false);
  const [clearAnthropicApiKey, setClearAnthropicApiKey] = useState(false);
  const [savingPrompts, setSavingPrompts] = useState(false);
  const extractionModelOptions = useMemo(
    () => ({
      openai: ["gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-4o-mini", "o4-mini"],
      gemini: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
      anthropic: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest", "claude-sonnet-4-0", "claude-haiku-4-0"]
    }),
    []
  );
  const searchModelOptions = extractionModelOptions;

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
      if (!promptCompanyId && data.companies[0]?.id) setPromptCompanyId(data.companies[0].id);
    }
    void loadCompanies();
  }, [companyId, promptCompanyId]);

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

  useEffect(() => {
    async function loadCompanyPrompts() {
      if (!promptCompanyId) return;
      const response = await fetch(`/api/company-ai-config?companyId=${encodeURIComponent(promptCompanyId)}`);
      const data = (await response.json().catch(() => null)) as
        | {
            config?: {
              extractionProvider?: "openai" | "gemini" | "anthropic" | null;
              extractionModel?: string | null;
              extractionPrompt?: string | null;
              searchProvider?: "openai" | "gemini" | "anthropic" | null;
              searchModel?: string | null;
              searchPrompt?: string | null;
              hasOpenaiApiKey?: boolean;
              hasGeminiApiKey?: boolean;
              hasAnthropicApiKey?: boolean;
            } | null;
          }
        | null;
      if (!response.ok) return;
      const nextExtractionProvider =
        data?.config?.extractionProvider === "gemini" || data?.config?.extractionProvider === "anthropic"
          ? data.config.extractionProvider
          : "openai";
      const nextSearchProvider =
        data?.config?.searchProvider === "gemini" || data?.config?.searchProvider === "anthropic"
          ? data.config.searchProvider
          : "openai";
      setExtractionProvider(nextExtractionProvider);
      setSearchProvider(nextSearchProvider);
      setExtractionModel(
        data?.config?.extractionModel?.trim() ||
          (nextExtractionProvider === "gemini"
            ? "gemini-2.5-flash"
            : nextExtractionProvider === "anthropic"
              ? "claude-3-5-sonnet-latest"
              : "gpt-4.1-mini")
      );
      setSearchModel(
        data?.config?.searchModel?.trim() ||
          (nextSearchProvider === "gemini"
            ? "gemini-2.5-flash"
            : nextSearchProvider === "anthropic"
              ? "claude-3-5-sonnet-latest"
              : "gpt-4.1-mini")
      );
      setExtractionPrompt(data?.config?.extractionPrompt ?? "");
      setSearchPrompt(data?.config?.searchPrompt ?? "");
      setHasOpenaiApiKey(Boolean(data?.config?.hasOpenaiApiKey));
      setHasGeminiApiKey(Boolean(data?.config?.hasGeminiApiKey));
      setHasAnthropicApiKey(Boolean(data?.config?.hasAnthropicApiKey));
      setOpenaiApiKey("");
      setGeminiApiKey("");
      setAnthropicApiKey("");
      setClearOpenaiApiKey(false);
      setClearGeminiApiKey(false);
      setClearAnthropicApiKey(false);
    }
    void loadCompanyPrompts();
  }, [promptCompanyId]);

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

  async function savePrompts() {
    if (!promptCompanyId || savingPrompts) return;
    setSavingPrompts(true);
    setError(null);
    const response = await fetch("/api/company-ai-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: promptCompanyId,
        extractionProvider,
        extractionModel,
        extractionPrompt,
        searchProvider,
        searchModel,
        searchPrompt,
        openaiApiKey: openaiApiKey.trim() || null,
        geminiApiKey: geminiApiKey.trim() || null,
        anthropicApiKey: anthropicApiKey.trim() || null,
        clearOpenaiApiKey,
        clearGeminiApiKey,
        clearAnthropicApiKey
      })
    });
    const data = (await response.json().catch(() => null)) as
      | {
          error?: string;
          config?: {
            hasOpenaiApiKey?: boolean;
            hasGeminiApiKey?: boolean;
            hasAnthropicApiKey?: boolean;
          };
        }
      | null;
    if (!response.ok) {
      setError(data?.error ?? "No se pudieron guardar prompts.");
      setSavingPrompts(false);
      return;
    }
    setHasOpenaiApiKey(Boolean(data?.config?.hasOpenaiApiKey));
    setHasGeminiApiKey(Boolean(data?.config?.hasGeminiApiKey));
    setHasAnthropicApiKey(Boolean(data?.config?.hasAnthropicApiKey));
    setOpenaiApiKey("");
    setGeminiApiKey("");
    setAnthropicApiKey("");
    setClearOpenaiApiKey(false);
    setClearGeminiApiKey(false);
    setClearAnthropicApiKey(false);
    setSavingPrompts(false);
  }

  return (
    <section className="space-y-5">
      <article className="bank-card p-4">
        <div className="inline-flex items-center gap-2 text-cyan-700">
          <ShieldCheck size={16} />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">Admin</p>
        </div>
        <h2 className="mt-1 font-display text-2xl text-navy">{t.title}</h2>
        <p className="mt-1 text-xs text-slate-600">{t.subtitle}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${activeSection === "base" ? "border-cyan-300 bg-cyan-100 text-cyan-800" : "border-slate-300 bg-white text-slate-700"}`}
            onClick={() => setActiveSection("base")}
          >
            <FileCheck2 size={13} />
            {t.tabBase}
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${activeSection === "field" ? "border-cyan-300 bg-cyan-100 text-cyan-800" : "border-slate-300 bg-white text-slate-700"}`}
            onClick={() => setActiveSection("field")}
          >
            <Tags size={13} />
            {t.tabField}
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${activeSection === "prompts" ? "border-cyan-300 bg-cyan-100 text-cyan-800" : "border-slate-300 bg-white text-slate-700"}`}
            onClick={() => setActiveSection("prompts")}
          >
            <MessageSquareQuote size={13} />
            {t.tabPrompts}
          </button>
        </div>

        {error && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
      </article>

      {activeSection === "base" && (
      <article className="bank-card p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-600">{t.filterByCompany}:</label>
          <select className="bank-input max-w-xs" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
            <option value="all">{t.allCompanies}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <h3 className="mb-3 text-xs font-semibold text-slate-800">{t.baseRules}</h3>
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
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs">
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
          <p className="mt-4 text-xs text-slate-500">{t.loading}</p>
        ) : rules.length === 0 ? (
          <p className="mt-4 text-xs text-slate-500">{t.empty}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
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
      )}

      {activeSection === "prompts" && (
      <article className="bank-card p-4">
        <h3 className="mb-3 text-xs font-semibold text-slate-800">{t.aiPrompts}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <select
            className="bank-input"
            value={promptCompanyId}
            onChange={(e) => setPromptCompanyId(e.target.value)}
          >
            <option value="">{t.company}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="bank-input"
              value={extractionProvider}
              onChange={(e) => {
                const provider = e.target.value as "openai" | "gemini" | "anthropic";
                setExtractionProvider(provider);
                if (!extractionModelOptions[provider].includes(extractionModel)) {
                  setExtractionModel(extractionModelOptions[provider][0]);
                }
              }}
            >
              <option value="openai">{t.extractionProvider}: OpenAI</option>
              <option value="gemini">{t.extractionProvider}: Gemini</option>
              <option value="anthropic">{t.extractionProvider}: Anthropic</option>
            </select>
            <input
              className="bank-input"
              placeholder={t.extractionModel}
              value={extractionModel}
              onChange={(e) => setExtractionModel(e.target.value)}
              list="extraction-model-options"
            />
          </div>
          <textarea
            className="bank-input min-h-24 text-xs"
            placeholder={t.extractionPrompt}
            value={extractionPrompt}
            onChange={(e) => setExtractionPrompt(e.target.value)}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="bank-input"
              value={searchProvider}
              onChange={(e) => {
                const provider = e.target.value as "openai" | "gemini" | "anthropic";
                setSearchProvider(provider);
                if (!searchModelOptions[provider].includes(searchModel)) {
                  setSearchModel(searchModelOptions[provider][0]);
                }
              }}
            >
              <option value="openai">{t.searchProvider}: OpenAI</option>
              <option value="gemini">{t.searchProvider}: Gemini</option>
              <option value="anthropic">{t.searchProvider}: Anthropic</option>
            </select>
            <input
              className="bank-input"
              placeholder={t.searchModel}
              value={searchModel}
              onChange={(e) => setSearchModel(e.target.value)}
              list="search-model-options"
            />
          </div>
          <textarea
            className="bank-input min-h-24 text-xs"
            placeholder={t.searchPrompt}
            value={searchPrompt}
            onChange={(e) => setSearchPrompt(e.target.value)}
          />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{t.openaiKey}</p>
              <input
                className="bank-input"
                type="password"
                placeholder="sk-..."
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
              />
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className={hasOpenaiApiKey ? "text-emerald-700" : "text-slate-500"}>
                  {hasOpenaiApiKey ? t.keyConfigured : t.keyMissing}
                </span>
                <label className="inline-flex items-center gap-1 text-slate-600">
                  <input type="checkbox" checked={clearOpenaiApiKey} onChange={(e) => setClearOpenaiApiKey(e.target.checked)} />
                  {t.clearKey}
                </label>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{t.geminiKey}</p>
              <input
                className="bank-input"
                type="password"
                placeholder="AIza..."
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
              />
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className={hasGeminiApiKey ? "text-emerald-700" : "text-slate-500"}>
                  {hasGeminiApiKey ? t.keyConfigured : t.keyMissing}
                </span>
                <label className="inline-flex items-center gap-1 text-slate-600">
                  <input type="checkbox" checked={clearGeminiApiKey} onChange={(e) => setClearGeminiApiKey(e.target.checked)} />
                  {t.clearKey}
                </label>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{t.anthropicKey}</p>
              <input
                className="bank-input"
                type="password"
                placeholder="sk-ant-..."
                value={anthropicApiKey}
                onChange={(e) => setAnthropicApiKey(e.target.value)}
              />
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className={hasAnthropicApiKey ? "text-emerald-700" : "text-slate-500"}>
                  {hasAnthropicApiKey ? t.keyConfigured : t.keyMissing}
                </span>
                <label className="inline-flex items-center gap-1 text-slate-600">
                  <input type="checkbox" checked={clearAnthropicApiKey} onChange={(e) => setClearAnthropicApiKey(e.target.checked)} />
                  {t.clearKey}
                </label>
              </div>
            </div>
          </div>
          <datalist id="extraction-model-options">
            {extractionModelOptions[extractionProvider].map((model) => (
              <option key={model} value={model} />
            ))}
          </datalist>
          <datalist id="search-model-options">
            {searchModelOptions[searchProvider].map((model) => (
              <option key={model} value={model} />
            ))}
          </datalist>
          <div>
            <button
              type="button"
              className="bank-btn"
              onClick={() => void savePrompts()}
              disabled={!promptCompanyId || savingPrompts}
            >
              {savingPrompts ? "Guardando..." : t.savePrompts}
            </button>
          </div>
        </div>
      </article>
      )}

      {activeSection === "field" && (
      <article className="bank-card p-4">
        <h3 className="mb-3 text-xs font-semibold text-slate-800">{t.fieldRules}</h3>
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
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs">
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
          <p className="mt-4 text-xs text-slate-500">{t.loading}</p>
        ) : fieldRules.length === 0 ? (
          <p className="mt-4 text-xs text-slate-500">{t.empty}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-xs">
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
      )}
    </section>
  );
}
