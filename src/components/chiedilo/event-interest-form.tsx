"use client";

import { useMemo, useState } from "react";
import ToastStack, { type ToastItem } from "./toast-stack";

type FormState = {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  profiloProfessionale: "dipendente" | "libero-professionista" | "imprenditore" | "altro" | "";
  interesseEventiFormativi: "si" | "no" | "forse" | "";
  usoIaQuotidiano: "mai" | "qualche-volta" | "spesso" | "quotidianamente" | "";
  kitPostEventoAccepted: boolean;
  trainingEventsAccepted: boolean;
  productsServicesAccepted: boolean;
  privacyAccepted: boolean;
  dataSecurityAccepted: boolean;
  website: string;
};

type FieldKey = Exclude<keyof FormState, "website">;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const INITIAL_STATE: FormState = {
  nome: "",
  cognome: "",
  email: "",
  telefono: "",
  profiloProfessionale: "",
  interesseEventiFormativi: "",
  usoIaQuotidiano: "",
  kitPostEventoAccepted: true,
  trainingEventsAccepted: false,
  productsServicesAccepted: false,
  privacyAccepted: false,
  dataSecurityAccepted: false,
  website: "",
};

type EventInterestFormProps = {
  sourcePage?: string;
  sourceContext?: string;
  introText?: string;
  submitLabel?: string;
};

export default function EventInterestForm({
  sourcePage = "chiedilo-all-ia",
  sourceContext = "evento-bcc-paliano",
  introText = "Inserisci nome, cognome ed email. Il numero di telefono è facoltativo e serve solo se preferisci lasciare anche un contatto diretto.",
  submitLabel = "Salva contatto e consensi",
}: EventInterestFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = (type: ToastItem["type"], message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const isValid = useMemo(() => {
    return (
      form.nome.trim().length >= 2 &&
      form.cognome.trim().length >= 2 &&
      EMAIL_REGEX.test(form.email.trim()) &&
      form.email.trim().length <= 160 &&
      form.privacyAccepted &&
      form.dataSecurityAccepted
    );
  }, [form]);

  const validateField = <K extends FieldKey>(key: K, value: FormState[K], state: FormState = form): string => {
    if (key === "nome") {
      const v = String(value).trim();
      if (v.length < 2) return "Inserisci un nome valido (minimo 2 caratteri).";
      if (v.length > 80) return "Nome troppo lungo (massimo 80 caratteri).";
    }
    if (key === "cognome") {
      const v = String(value).trim();
      if (v.length < 2) return "Inserisci un cognome valido (minimo 2 caratteri).";
      if (v.length > 80) return "Cognome troppo lungo (massimo 80 caratteri).";
    }
    if (key === "email") {
      const v = String(value).trim();
      if (!v) return "Email obbligatoria.";
      if (v.length > 160) return "Email troppo lunga (massimo 160 caratteri).";
      if (!EMAIL_REGEX.test(v)) return "Email non valida.";
    }
    if (key === "telefono") {
      const v = String(value).trim();
      if (v.length > 30) return "Telefono troppo lungo (massimo 30 caratteri).";
      if (v && !/^[+()\d\s\-/]+$/.test(v)) return "Telefono non valido.";
    }
    if (key === "privacyAccepted" && !state.privacyAccepted) return "Consenso privacy obbligatorio.";
    if (key === "dataSecurityAccepted" && !state.dataSecurityAccepted) return "Consenso al trattamento sicuro del dato obbligatorio.";

    return "";
  };

  const markTouched = (key: FieldKey) => setTouched((prev) => ({ ...prev, [key]: true }));

  const setFieldError = <K extends FieldKey>(key: K, message: string) => {
    setFieldErrors((prev) => ({ ...prev, [key]: message }));
  };

  const onChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    const next = { ...form, [key]: value };
    setForm(next);
    if (key !== "website" && (touched[key as FieldKey] || ["nome", "cognome", "email", "telefono"].includes(key))) {
      setFieldError(key as FieldKey, validateField(key as FieldKey, value, next));
    }
  };

  const onKitChange = (checked: boolean) => {
    onChange("kitPostEventoAccepted", checked);
    if (!checked) {
      pushToast("warning", "Ok, non riceverai il kit pratico via email.");
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (!isValid) {
      const nextTouched: Partial<Record<FieldKey, boolean>> = {
        nome: true,
        cognome: true,
        email: true,
        telefono: true,
        privacyAccepted: true,
        dataSecurityAccepted: true,
      };
      setTouched((prev) => ({ ...prev, ...nextTouched }));
      setFieldErrors((prev) => ({
        ...prev,
        nome: validateField("nome", form.nome),
        cognome: validateField("cognome", form.cognome),
        email: validateField("email", form.email),
        telefono: validateField("telefono", form.telefono),
        privacyAccepted: validateField("privacyAccepted", form.privacyAccepted),
        dataSecurityAccepted: validateField("dataSecurityAccepted", form.dataSecurityAccepted),
      }));
      const message = "Compila nome, cognome, email e accetta i consensi obbligatori.";
      setError(message);
      pushToast("error", message);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/consultation-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          eventId: "chiedilo-all-ia",
          sourcePage,
          sourceContext,
        }),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        const message = result.error ?? "Invio non riuscito.";
        setError(message);
        pushToast(response.status === 409 ? "warning" : "error", message);
        return;
      }

      setSuccess(true);
      setForm(INITIAL_STATE);
      setTouched({});
      setFieldErrors({});
      pushToast("success", "Contatto registrato correttamente. Grazie per aver indicato le tue preferenze.");
    } catch {
      const message = "Errore di rete. Riprova tra pochi minuti.";
      setError(message);
      pushToast("error", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 sm:space-y-8" noValidate>
      <input
        type="text"
        autoComplete="off"
        tabIndex={-1}
        className="hidden"
        value={form.website}
        onChange={(e) => onChange("website", e.target.value)}
      />

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm leading-relaxed text-zinc-700 sm:p-5">
        {introText}
      </div>

      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        <Field label="Nome" required>
          <input className={`form-control ${touched.nome && fieldErrors.nome ? "border-rose-500 focus:border-rose-500" : ""}`} value={form.nome} onChange={(e) => onChange("nome", e.target.value)} onBlur={() => { markTouched("nome"); setFieldError("nome", validateField("nome", form.nome)); }} placeholder="Mario" required aria-invalid={Boolean(touched.nome && fieldErrors.nome)} aria-describedby="nome-error" />
          {touched.nome && fieldErrors.nome ? <p id="nome-error" className="mt-1 text-xs text-rose-600">{fieldErrors.nome}</p> : null}
        </Field>
        <Field label="Cognome" required>
          <input className={`form-control ${touched.cognome && fieldErrors.cognome ? "border-rose-500 focus:border-rose-500" : ""}`} value={form.cognome} onChange={(e) => onChange("cognome", e.target.value)} onBlur={() => { markTouched("cognome"); setFieldError("cognome", validateField("cognome", form.cognome)); }} placeholder="Rossi" required aria-invalid={Boolean(touched.cognome && fieldErrors.cognome)} aria-describedby="cognome-error" />
          {touched.cognome && fieldErrors.cognome ? <p id="cognome-error" className="mt-1 text-xs text-rose-600">{fieldErrors.cognome}</p> : null}
        </Field>
        <Field label="Email" required>
          <input className={`form-control ${touched.email && fieldErrors.email ? "border-rose-500 focus:border-rose-500" : ""}`} type="email" value={form.email} onChange={(e) => onChange("email", e.target.value)} onBlur={() => { markTouched("email"); setFieldError("email", validateField("email", form.email)); }} placeholder="nome@email.it" required aria-invalid={Boolean(touched.email && fieldErrors.email)} aria-describedby="email-error" />
          {touched.email && fieldErrors.email ? <p id="email-error" className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.email}</p> : null}
        </Field>
        <Field label="Telefono (facoltativo)">
          <input className={`form-control ${touched.telefono && fieldErrors.telefono ? "border-rose-500 focus:border-rose-500" : ""}`} value={form.telefono} onChange={(e) => onChange("telefono", e.target.value)} onBlur={() => { markTouched("telefono"); setFieldError("telefono", validateField("telefono", form.telefono)); }} placeholder="+39 ..." aria-invalid={Boolean(touched.telefono && fieldErrors.telefono)} aria-describedby="telefono-error" />
          {touched.telefono && fieldErrors.telefono ? <p id="telefono-error" className="mt-1 text-xs text-rose-600">{fieldErrors.telefono}</p> : null}
        </Field>
      </div>

      <div className="grid gap-x-6 gap-y-5 md:grid-cols-3">
        <Field label="Ti presenti come">
          <select className="form-control" value={form.profiloProfessionale} onChange={(e) => onChange("profiloProfessionale", e.target.value as FormState["profiloProfessionale"])}>
            <option value="">Seleziona</option>
            <option value="dipendente">Dipendente</option>
            <option value="libero-professionista">Libero professionista</option>
            <option value="imprenditore">Imprenditore</option>
            <option value="altro">Altro</option>
          </select>
        </Field>
        <Field label="Ti interessano altri eventi formativi Evolve?">
          <select className="form-control" value={form.interesseEventiFormativi} onChange={(e) => onChange("interesseEventiFormativi", e.target.value as FormState["interesseEventiFormativi"])}>
            <option value="">Seleziona</option>
            <option value="si">Sì</option>
            <option value="no">No</option>
            <option value="forse">Forse, vorrei saperne di più</option>
          </select>
        </Field>
        <Field label="Hai già usato strumenti IA nella tua operatività?">
          <select className="form-control" value={form.usoIaQuotidiano} onChange={(e) => onChange("usoIaQuotidiano", e.target.value as FormState["usoIaQuotidiano"])}>
            <option value="">Seleziona</option>
            <option value="mai">Mai</option>
            <option value="qualche-volta">Qualche volta</option>
            <option value="spesso">Spesso</option>
            <option value="quotidianamente">Quotidianamente</option>
          </select>
        </Field>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-4 text-sm leading-relaxed text-zinc-700 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900">Kit pratico post-evento incluso</h2>
        <label className="mt-4 grid grid-cols-[1rem_1fr] items-start gap-3"><input type="checkbox" checked={form.kitPostEventoAccepted} onChange={(e) => onKitChange(e.target.checked)} className="mt-1" />
          <span>Desidero ricevere via email il kit pratico post-evento.</span>
        </label>
        <p className="mt-2 pl-7 text-xs leading-relaxed text-zinc-600 sm:text-sm">
          Include prompt, esempi ed esercizi in formato zip. Puoi togliere la spunta se non vuoi riceverlo.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 text-sm leading-relaxed text-zinc-700 sm:p-5">
        <label className="grid grid-cols-[1rem_1fr] items-start gap-3"><input type="checkbox" checked={form.privacyAccepted} onChange={(e) => onChange("privacyAccepted", e.target.checked)} onBlur={() => { markTouched("privacyAccepted"); setFieldError("privacyAccepted", validateField("privacyAccepted", form.privacyAccepted)); }} className="mt-1" required />
          <span>Ho letto la <a href="/chiedilo-all-ia/privacy" className="underline">Privacy Policy</a> e acconsento al trattamento dei dati per gestire richieste di aggiornamento, manifestazioni di interesse, iscrizioni agli eventi e comunicazioni organizzative collegate alle iniziative Evolve. (obbligatorio)</span>
        </label>
        {touched.privacyAccepted && fieldErrors.privacyAccepted ? <p className="text-xs text-rose-600">{fieldErrors.privacyAccepted}</p> : null}

        <label className="grid grid-cols-[1rem_1fr] items-start gap-3"><input type="checkbox" checked={form.dataSecurityAccepted} onChange={(e) => onChange("dataSecurityAccepted", e.target.checked)} onBlur={() => { markTouched("dataSecurityAccepted"); setFieldError("dataSecurityAccepted", validateField("dataSecurityAccepted", form.dataSecurityAccepted)); }} className="mt-1" required />
          <span>Acconsento alla conservazione sicura dei dati forniti per finalità organizzative legate all’iniziativa, secondo le misure descritte nella pagina <a href="/chiedilo-all-ia/sicurezza" className="underline">Sicurezza</a>. (obbligatorio)</span>
        </label>
        {touched.dataSecurityAccepted && fieldErrors.dataSecurityAccepted ? <p className="text-xs text-rose-600">{fieldErrors.dataSecurityAccepted}</p> : null}

        <label className="grid grid-cols-[1rem_1fr] items-start gap-3"><input type="checkbox" checked={form.trainingEventsAccepted} onChange={(e) => onChange("trainingEventsAccepted", e.target.checked)} className="mt-1" />
          <span>Acconsento a essere ricontattato da Evolve per altri eventi formativi. (facoltativo)</span>
        </label>

        <label className="grid grid-cols-[1rem_1fr] items-start gap-3"><input type="checkbox" checked={form.productsServicesAccepted} onChange={(e) => onChange("productsServicesAccepted", e.target.checked)} className="mt-1" />
          <span>Acconsento a essere ricontattato da Evolve per futuri prodotti e/o servizi. (facoltativo)</span>
        </label>
      </div>

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Contatto registrato correttamente. Grazie per aver indicato le tue preferenze.</p> : null}

      <button
        type="submit"
        disabled={!isValid || submitting}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 px-5 py-3 text-base font-semibold text-white shadow-xl transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 sm:px-6 sm:py-4 sm:text-lg"
      >
        {submitting ? "Invio in corso..." : submitLabel}
      </button>
      <ToastStack toasts={toasts} onDismiss={removeToast} />
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="form-field-label">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </span>
      {hint ? <span className="mb-2 block text-xs text-zinc-500">{hint}</span> : null}
      {children}
    </label>
  );
}
