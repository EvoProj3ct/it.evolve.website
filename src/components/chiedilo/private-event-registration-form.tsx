"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ADDITIONAL_GUEST_OPTIONS,
  BCC_VENUES,
  EVENT_REGISTRATION_EVENT_ID,
  PROFESSIONAL_PROFILE_OPTIONS,
} from "@/lib/chiedilo/event-registration-schema";

type FormState = {
  nome: string;
  cognome: string;
  email: string;
  venue: "paliano";
  profiloProfessionale: "dipendente" | "libero-professionista" | "imprenditore" | "altro" | "";
  additionalGuests: "0" | "1" | "2" | "3-plus" | "";
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
  venue: "paliano",
  profiloProfessionale: "",
  additionalGuests: "0",
  privacyAccepted: false,
  dataSecurityAccepted: false,
  website: "",
};

export default function PrivateEventRegistrationForm({ registrationToken }: { registrationToken: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isValid = useMemo(() => {
    return (
      form.nome.trim().length >= 2 &&
      form.cognome.trim().length >= 2 &&
      EMAIL_REGEX.test(form.email.trim()) &&
      form.email.trim().length <= 160 &&
      form.venue === "paliano" &&
      Boolean(form.profiloProfessionale) &&
      Boolean(form.additionalGuests) &&
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
    if (key === "profiloProfessionale" && !state.profiloProfessionale) return "Seleziona un profilo professionale.";
    if (key === "additionalGuests" && !state.additionalGuests) return "Indica eventuali persone aggiuntive.";
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
    if (key !== "website" && (touched[key as FieldKey] || ["nome", "cognome", "email"].includes(key))) {
      setFieldError(key as FieldKey, validateField(key as FieldKey, value, next));
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!isValid) {
      const nextTouched: Partial<Record<FieldKey, boolean>> = {
        nome: true,
        cognome: true,
        email: true,
        profiloProfessionale: true,
        additionalGuests: true,
        privacyAccepted: true,
        dataSecurityAccepted: true,
      };
      setTouched((prev) => ({ ...prev, ...nextTouched }));
      setFieldErrors((prev) => ({
        ...prev,
        nome: validateField("nome", form.nome),
        cognome: validateField("cognome", form.cognome),
        email: validateField("email", form.email),
        profiloProfessionale: validateField("profiloProfessionale", form.profiloProfessionale),
        additionalGuests: validateField("additionalGuests", form.additionalGuests),
        privacyAccepted: validateField("privacyAccepted", form.privacyAccepted),
        dataSecurityAccepted: validateField("dataSecurityAccepted", form.dataSecurityAccepted),
      }));
      setError("Compila tutti i campi obbligatori e accetta i consensi richiesti.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/event-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          registrationToken,
          eventId: EVENT_REGISTRATION_EVENT_ID,
        }),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Registrazione non riuscita.");
        return;
      }

      router.push("/chiedilo-all-ia/registrazione/thank-you");
    } catch {
      setError("Errore di rete. Riprova tra pochi minuti.");
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
        Compila i dati richiesti per registrare la partecipazione all’incontro “Chiedilo all’IA”.
      </div>

      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        <Field label="Nome" required>
          <input className={`form-control ${touched.nome && fieldErrors.nome ? "border-rose-500 focus:border-rose-500" : ""}`} value={form.nome} onChange={(e) => onChange("nome", e.target.value)} onBlur={() => { markTouched("nome"); setFieldError("nome", validateField("nome", form.nome)); }} placeholder="Mario" required aria-invalid={Boolean(touched.nome && fieldErrors.nome)} aria-describedby="private-nome-error" />
          {touched.nome && fieldErrors.nome ? <p id="private-nome-error" className="mt-1 text-xs text-rose-600">{fieldErrors.nome}</p> : null}
        </Field>
        <Field label="Cognome" required>
          <input className={`form-control ${touched.cognome && fieldErrors.cognome ? "border-rose-500 focus:border-rose-500" : ""}`} value={form.cognome} onChange={(e) => onChange("cognome", e.target.value)} onBlur={() => { markTouched("cognome"); setFieldError("cognome", validateField("cognome", form.cognome)); }} placeholder="Rossi" required aria-invalid={Boolean(touched.cognome && fieldErrors.cognome)} aria-describedby="private-cognome-error" />
          {touched.cognome && fieldErrors.cognome ? <p id="private-cognome-error" className="mt-1 text-xs text-rose-600">{fieldErrors.cognome}</p> : null}
        </Field>
        <Field label="Email" required>
          <input className={`form-control ${touched.email && fieldErrors.email ? "border-rose-500 focus:border-rose-500" : ""}`} type="email" value={form.email} onChange={(e) => onChange("email", e.target.value)} onBlur={() => { markTouched("email"); setFieldError("email", validateField("email", form.email)); }} placeholder="nome@email.it" required aria-invalid={Boolean(touched.email && fieldErrors.email)} aria-describedby="private-email-error" />
          {touched.email && fieldErrors.email ? <p id="private-email-error" className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.email}</p> : null}
        </Field>
        <Field label="Sede BCC" required>
          <select className="form-control" value={form.venue} onChange={(e) => onChange("venue", e.target.value as FormState["venue"])} required>
            {BCC_VENUES.map((venue) => (
              <option key={venue.value} value={venue.value} disabled={!venue.enabled}>
                {venue.label}{venue.enabled ? "" : " - non ancora disponibile"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Profilo professionale" required>
          <select className="form-control" value={form.profiloProfessionale} onChange={(e) => onChange("profiloProfessionale", e.target.value as FormState["profiloProfessionale"])} onBlur={() => { markTouched("profiloProfessionale"); setFieldError("profiloProfessionale", validateField("profiloProfessionale", form.profiloProfessionale)); }} required aria-invalid={Boolean(touched.profiloProfessionale && fieldErrors.profiloProfessionale)} aria-describedby="private-profilo-error">
            <option value="">Seleziona</option>
            {PROFESSIONAL_PROFILE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {touched.profiloProfessionale && fieldErrors.profiloProfessionale ? <p id="private-profilo-error" className="mt-1 text-xs text-rose-600">{fieldErrors.profiloProfessionale}</p> : null}
        </Field>
        <Field label="Persone aggiuntive" required>
          <select className="form-control" value={form.additionalGuests} onChange={(e) => onChange("additionalGuests", e.target.value as FormState["additionalGuests"])} onBlur={() => { markTouched("additionalGuests"); setFieldError("additionalGuests", validateField("additionalGuests", form.additionalGuests)); }} required aria-invalid={Boolean(touched.additionalGuests && fieldErrors.additionalGuests)} aria-describedby="private-guests-error">
            {ADDITIONAL_GUEST_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {touched.additionalGuests && fieldErrors.additionalGuests ? <p id="private-guests-error" className="mt-1 text-xs text-rose-600">{fieldErrors.additionalGuests}</p> : null}
        </Field>
      </div>

      <div className="space-y-4 rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 text-sm leading-relaxed text-zinc-700 sm:p-5">
        <label className="grid grid-cols-[1rem_1fr] items-start gap-3"><input type="checkbox" checked={form.privacyAccepted} onChange={(e) => onChange("privacyAccepted", e.target.checked)} onBlur={() => { markTouched("privacyAccepted"); setFieldError("privacyAccepted", validateField("privacyAccepted", form.privacyAccepted)); }} className="mt-1" required />
          <span>Ho letto la <a href="/privacy" className="underline">Privacy Policy</a> e acconsento al trattamento dei dati per gestire richieste di aggiornamento, manifestazioni di interesse, iscrizioni agli eventi e comunicazioni organizzative collegate alle iniziative Evolve. (obbligatorio)</span>
        </label>
        {touched.privacyAccepted && fieldErrors.privacyAccepted ? <p className="text-xs text-rose-600">{fieldErrors.privacyAccepted}</p> : null}

        <label className="grid grid-cols-[1rem_1fr] items-start gap-3"><input type="checkbox" checked={form.dataSecurityAccepted} onChange={(e) => onChange("dataSecurityAccepted", e.target.checked)} onBlur={() => { markTouched("dataSecurityAccepted"); setFieldError("dataSecurityAccepted", validateField("dataSecurityAccepted", form.dataSecurityAccepted)); }} className="mt-1" required />
          <span>Acconsento alla conservazione sicura dei dati forniti per finalità organizzative legate all'evento, secondo le misure descritte nella pagina <a href="/sicurezza" className="underline">Sicurezza</a>. (obbligatorio)</span>
        </label>
        {touched.dataSecurityAccepted && fieldErrors.dataSecurityAccepted ? <p className="text-xs text-rose-600">{fieldErrors.dataSecurityAccepted}</p> : null}
      </div>

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={!isValid || submitting}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 px-5 py-3 text-base font-semibold text-white shadow-xl transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 sm:px-6 sm:py-4 sm:text-lg"
      >
        {submitting ? "Registrazione in corso..." : "Conferma registrazione"}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="form-field-label">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </span>
      {children}
    </label>
  );
}
