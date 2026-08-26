"use client";

import { useState } from "react";
import { useLanguage } from "../lib/i18n/LanguageContext";

export default function FreeTextIntake({ onSubmit, loading }) {
  const { t } = useLanguage();
  const [text, setText] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(text);
      }}
      className="rounded-xl border border-borderc bg-white/60 p-6 shadow-sm md:p-8"
    >
      <label className="mb-2 block text-center font-body font-semibold text-ledger">{t("freetext_label")}</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("freetext_placeholder")}
        rows={5}
        className="w-full resize-y rounded-lg border border-borderc bg-white p-4 font-body text-ink transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
      />
      <button
        type="submit"
        disabled={loading || text.trim().length < 5}
        className="mt-4 w-full rounded-lg bg-bottle px-6 py-3 font-body font-semibold text-white shadow-sm transition-all hover:bg-bottle-light active:scale-[.99] disabled:opacity-50"
      >
        {loading ? t("freetext_checking") : t("freetext_submit")}
      </button>
    </form>
  );
}
