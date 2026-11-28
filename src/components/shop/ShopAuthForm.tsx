"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { accountSchema } from "@/lib/ecommerce/contracts";
import { errorText, safeReturnTo, sessionChanged, storefrontMutate } from "@/lib/ecommerce/browser";
import { shopApi, useShopStore } from "@/lib/ecommerce/shop-store";
import { ShopAuthArcade } from "./ShopAuthArcade";
import styles from "./Storefront.module.css";

export const AUTH_ACTIONS = {
  login: { title: "Bentornato.", button: "Accedi" },
  register: { title: "Piacere di conoscerti.", button: "Crea il tuo account" },
  "verify-email": { title: "È proprio la tua email.", button: "Verifica email" },
  "forgot-password": { title: "Ripartiamo da qui.", button: "Invia il link" },
  "resend-verification": { title: "Un nuovo inizio.", button: "Richiedi il link" },
  "reset-password": { title: "Una nuova chiave.", button: "Reimposta la password" },
  "change-password": { title: "Cambia la tua chiave.", button: "Cambia password" },
  "change-email": { title: "Restiamo in contatto.", button: "Richiedi il cambio email" },
  "confirm-email": { title: "Il tuo nuovo indirizzo.", button: "Conferma la nuova email" },
  logout: { title: "A presto.", button: "Esci dal tuo account" },
  "logout-all": { title: "Chiudiamo tutte le porte.", button: "Esci da tutte le sessioni" },
} as const;
export type AuthAction = keyof typeof AUTH_ACTIONS;
type Legal = { termsVersion: string; privacyVersion: string; termsPath: string; privacyPath: string; registrationReady: boolean };
const messageSchema = z.object({ message: z.string().max(2000) }).strict();
const loginSchema = z.object({ account: accountSchema, csrfToken: z.string() }).strict();

export function ShopAuthForm({ action, legal, nextPath }: { action: AuthAction; legal: Legal; nextPath?: string }) {
  const router = useRouter();
  const store = useShopStore();
  const next = safeReturnTo(nextPath);
  const returnQuery = next === "/account" ? "" : `?next=${encodeURIComponent(next)}`;
  const info = AUTH_ACTIONS[action];
  const tokenAction = ["verify-email", "reset-password", "confirm-email"].includes(action);
  const [token, setToken] = useState("");
  const [captured, setCaptured] = useState(!tokenAction);
  const capture = useRef(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [kind, setKind] = useState("individual");
  const [visible, setVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const confirmation = useRef<HTMLInputElement>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  const disabled = busy || action === "register" && !legal.registrationReady || tokenAction && !token;
  const clearPasswordMismatch = () => setPasswordMismatch(false);
  useLayoutEffect(() => {
    if (!tokenAction || capture.current) return;
    capture.current = true;
    const fragments = new URLSearchParams(window.location.hash.slice(1)).getAll("token");
    window.history.replaceState(null, "", window.location.pathname);
    if (fragments.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(fragments[0])) setToken(fragments[0]);
    setCaptured(true);
  }, [tokenAction]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || disabled) return;
    const form = event.currentTarget, data = new FormData(form), body: Record<string, unknown> = {};
    if (["login", "register", "forgot-password", "resend-verification", "change-email"].includes(action)) body.email = data.get("email");
    if (["login", "register", "verify-email"].includes(action)) body.password = data.get("password");
    if (["change-password", "change-email", "confirm-email", "logout-all"].includes(action)) body.currentPassword = data.get("currentPassword");
    if (["change-password", "reset-password"].includes(action)) body.newPassword = data.get("newPassword");
    if (tokenAction) body.token = token;
    if (action === "register") {
      if (data.get("accepted") !== "on") return;
      if (data.get("passwordConfirmation") !== body.password) {
        setError("");
        setPasswordMismatch(true);
        confirmation.current?.focus();
        return;
      }
      clearPasswordMismatch();
      Object.assign(body, { name: data.get("name"), kind, termsVersion: legal.termsVersion, privacyVersion: legal.privacyVersion });
    }
    const newPassword = action === "register" ? body.password : body.newPassword;
    if (typeof newPassword === "string" && (Array.from(newPassword.normalize("NFC")).length < 15 || Array.from(newPassword.normalize("NFC")).length > 128)) { setError("Scegli una passphrase da 15 a 128 caratteri."); return; }
    submitting.current = true; setBusy(true); setError(""); setMessage("");
    try {
      if (action === "login") {
        const { account } = await storefrontMutate(`/auth/${action}`, "POST", body, loginSchema);
        sessionChanged();
        store.dispatch(shopApi.util.upsertQueryEntries([{ endpointName: "profile", arg: undefined, value: { account } }]));
        router.replace(next);
      } else {
        const result = await storefrontMutate(`/auth/${action}`, "POST", body, messageSchema);
        if (["logout", "logout-all", "reset-password", "change-password", "confirm-email"].includes(action)) sessionChanged();
        setMessage(result.message);
        if (tokenAction) setToken("");
      }
    } catch (reason) { setError(errorText(reason)); }
    finally {
      form.querySelectorAll<HTMLInputElement>('input[type="password"],input[data-password="true"]').forEach(input => { input.value = ""; });
      for (const key of ["password", "currentPassword", "newPassword", "token"]) delete body[key];
      submitting.current = false; setBusy(false); requestAnimationFrame(() => feedback.current?.focus());
    }
  }

  return <main id="shop-content" className={styles.authPage}>
    <section className={styles.authPanel} aria-labelledby="auth-title"><Link className={styles.back} href="/shop/e-linker" prefetch={false}>Torna agli oggetti</Link><h1 id="auth-title">{info.title}</h1>
      <p ref={feedback} tabIndex={-1} className={error ? styles.error : styles.success} role={error ? "alert" : "status"}>{error || message}</p>
      {action === "register" && !legal.registrationReady && <p className={styles.notice}>La registrazione non è ancora disponibile. Riprova più tardi.</p>}
      {tokenAction && captured && !token && !message ? <div className={styles.notice}>Apri il link ricevuto via email. Se è scaduto o hai ricaricato questa pagina, richiedine uno nuovo.<Link href={action === "verify-email" ? "/account/resend-verification" : action === "confirm-email" ? "/account/change-email" : "/account/forgot-password"} prefetch={false}>Richiedi un nuovo link <ArrowRight size={15} /></Link></div> : !message && <form method="post" className={styles.form} onSubmit={submit} aria-busy={busy}>
        {action === "register" && <><fieldset className={styles.kind}><legend>Il tuo account</legend>{[["individual", "Privato"], ["company", "Azienda"]].map(([value, label]) => <label key={value} data-selected={kind === value}><input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} />{label}</label>)}</fieldset><label htmlFor="auth-name">{kind === "company" ? "Ragione sociale" : "Nome e cognome"}<input id="auth-name" name="name" required autoComplete={kind === "company" ? "organization" : "name"} maxLength={200} /></label></>}
        {["login", "register", "forgot-password", "resend-verification", "change-email"].includes(action) && <label htmlFor="auth-email">{action === "change-email" ? "Nuovo indirizzo email" : "Email"}<input id="auth-email" type="email" name="email" required autoComplete={action === "change-email" ? "email" : "username"} maxLength={254} /></label>}
        {["login", "register", "verify-email"].includes(action) && <label htmlFor="auth-password">{action === "verify-email" ? "Password scelta alla registrazione" : "Password"}<span className={styles.password}><input data-password="true" id="auth-password" name="password" type={visible ? "text" : "password"} required maxLength={256} autoComplete={action === "register" ? "new-password" : "current-password"} aria-describedby={action === "register" ? "password-help" : undefined} onChange={action === "register" ? clearPasswordMismatch : undefined} /><button type="button" aria-label={visible ? "Nascondi la password" : "Mostra la password"} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>}
        {["change-password", "change-email", "confirm-email", "logout-all"].includes(action) && <label htmlFor="auth-current-password">Password corrente<input id="auth-current-password" type="password" name="currentPassword" required maxLength={256} autoComplete="current-password" /></label>}
        {["change-password", "reset-password"].includes(action) && <label htmlFor="auth-new-password">Nuova password<input id="auth-new-password" type="password" name="newPassword" required maxLength={256} autoComplete="new-password" aria-describedby="password-help" /></label>}
        {["register", "change-password", "reset-password"].includes(action) && <p id="password-help" className={styles.help}>Da 15 a 128 caratteri. Puoi usare una frase facile da ricordare.</p>}
        {action === "register" && <div className={styles.passwordConfirmation}>
          <label htmlFor="auth-password-confirmation">Conferma password</label>
          <div className={styles.password}>
            <input ref={confirmation} data-password="true" id="auth-password-confirmation" name="passwordConfirmation"
              type={confirmationVisible ? "text" : "password"} autoComplete="new-password" required maxLength={256}
              aria-invalid={passwordMismatch || undefined} aria-describedby={passwordMismatch ? "password-confirmation-error" : undefined}
              onChange={clearPasswordMismatch} />
            <button type="button" aria-controls="auth-password-confirmation"
              aria-label={confirmationVisible ? "Nascondi la conferma della password" : "Mostra la conferma della password"}
              onClick={() => setConfirmationVisible(value => !value)}>
              {confirmationVisible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {passwordMismatch && <p id="password-confirmation-error" className={styles.error} role="alert">Le password non coincidono.</p>}
        </div>}
        {action === "register" && <label className={styles.check}><input type="checkbox" name="accepted" required disabled={!legal.registrationReady} /><span>Ho letto e accetto le {legal.termsPath ? <Link href={legal.termsPath} prefetch={false} target="_blank" rel="noreferrer">condizioni dell’account</Link> : "condizioni dell’account"} e ho letto l’{legal.privacyPath ? <Link href={legal.privacyPath} prefetch={false} target="_blank" rel="noreferrer">informativa privacy</Link> : "informativa privacy"}.</span></label>}
        {action === "login" && <Link className={styles.inlineLink} href="/account/forgot-password" prefetch={false}>Password dimenticata?</Link>}
        <button className={styles.primary} type="submit" disabled={disabled}>{busy ? "Attendi…" : info.button}<ArrowRight size={18} /></button>
      </form>}
      <nav className={styles.authLinks} aria-label="Account">{action === "login" ? <span>Non hai ancora un account? <Link href={`/account/register${returnQuery}`} prefetch={false}>Registrati <ArrowUpRight size={13} /></Link></span> : <Link href={`/account/login${returnQuery}`} prefetch={false}>Vai all’accesso <ArrowRight size={14} /></Link>}{action === "login" && <Link href={`/account/resend-verification${returnQuery}`} prefetch={false}>Verifica la tua email</Link>}</nav>
      {["register", "change-password", "reset-password"].includes(action) && <p className={styles.attribution}>Il controllo delle password compromesse usa Pwned Passwords di <a href="https://haveibeenpwned.com/Passwords" target="_blank" rel="noreferrer">Have I Been Pwned</a>.</p>}
    </section>
    <div className={styles.authStory} aria-hidden="true"><ShopAuthArcade /></div>
  </main>;
}
