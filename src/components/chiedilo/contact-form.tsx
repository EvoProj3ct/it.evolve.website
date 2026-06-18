"use client";

import { useState, type FormEvent } from "react";

const DESTINATARIO = "info@evolvecompany.tech";
const SUBJECT = "Richiesta informazioni - Chiedilo all'IA";

export default function ContactForm() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [messaggio, setMessaggio] = useState("");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const body = `Nome: ${nome}\nEmail: ${email}\n\nMessaggio:\n${messaggio}`;
    const mailtoUrl = `mailto:${DESTINATARIO}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div>
        <label htmlFor="nome" className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          className="w-full rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-gray-900 placeholder-gray-400 transition-colors focus:border-emerald-500 focus:outline-none"
          placeholder="Nome e cognome"
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-gray-900 placeholder-gray-400 transition-colors focus:border-emerald-500 focus:outline-none"
          placeholder="nome@email.it"
        />
      </div>

      <div>
        <label htmlFor="messaggio" className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Messaggio
        </label>
        <textarea
          id="messaggio"
          name="messaggio"
          required
          rows={5}
          value={messaggio}
          onChange={(event) => setMessaggio(event.target.value)}
          className="w-full resize-none rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-gray-900 placeholder-gray-400 transition-colors focus:border-emerald-500 focus:outline-none"
          placeholder="Scrivi la tua richiesta"
        />
      </div>

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-pink-500 to-orange-500 px-6 py-4 text-lg text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
      >
        Invia richiesta
      </button>

      <p className="text-center text-xs text-gray-500">
        Al click si apre il tuo client email. I dati non vengono salvati dal sito.
      </p>
    </form>
  );
}
