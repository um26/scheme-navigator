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
      className="bg-white/60 border border-borderc rounded-lg p-6 md:p-8"
    >
      <label className="block font-body text-ledger font-semibold mb-2 text-center">{t("freetext_label")}</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("freetext_placeholder")}
        rows={5}
        className="w-full rounded-lg border border-borderc bg-white p-4 font-body text-ink focus:outline-none focus:ring-2 focus:ring-saffron"
      />
      <button
        type="submit"
        disabled={loading || text.trim().length < 5}
        className="mt-4 w-full px-6 py-3 rounded-lg bg-bottle text-white font-body font-semibold hover:bg-bottle-light transition-colors disabled:opacity-50"
      >
        {loading ? t("freetext_checking") : t("freetext_submit")}
      </button>
    </form>
  );
}
