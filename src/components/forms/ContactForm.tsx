import { useMemo, useState } from "react";
import type { SubmitEvent } from "react";

export interface FormField {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "select" | "checkbox";
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

interface Props {
  fields: FormField[];
  privacyNotice: string;
  requireAcknowledgement: boolean;
  turnstileSiteKey: string;
}

type FormState = "idle" | "loading" | "success" | "error";

function submissionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ContactForm({
  fields,
  privacyNotice,
  requireAcknowledgement,
  turnstileSiteKey,
}: Props) {
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");
  const [startedAt] = useState(() => Date.now());
  const fieldIds = useMemo(() => new Map(fields.map((field) => [field.name, `field-${field.name}`])), [fields]);

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const data: Record<string, unknown> = {
      submissionId: submissionId(),
      startedAt,
      turnstileToken: String(formData.get("turnstileToken") ?? ""),
      website: String(formData.get("website") ?? ""),
      consent: true,
    };

    for (const field of fields) {
      data[field.name] = field.type === "checkbox"
        ? formData.get(field.name) === "on"
        : String(formData.get(field.name) ?? "");
    }

    const params = new URLSearchParams(window.location.search);
    data.utm = {
      source: params.get("utm_source") ?? undefined,
      medium: params.get("utm_medium") ?? undefined,
      campaign: params.get("utm_campaign") ?? undefined,
      term: params.get("utm_term") ?? undefined,
      content: params.get("utm_content") ?? undefined,
    };

    try {
      const response = await fetch("/api/leads/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = (await response.json()) as { ok?: boolean; message?: string; bookingUrl?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.message || "La demande n’a pas pu être envoyée.");
      }
      setState("success");
      setMessage("Votre demande a bien été envoyée.");
      form.reset();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  }

  return (
    <form className="form-grid" onSubmit={submit} noValidate>
      {fields.map((field) => {
        const id = fieldIds.get(field.name)!;
        if (field.type === "checkbox") {
          return (
            <label className="form-checkbox" htmlFor={id} key={field.name}>
              <input id={id} name={field.name} type="checkbox" required={field.required} />
              <span>{field.label}</span>
            </label>
          );
        }
        return (
          <div className="form-field" key={field.name}>
            <label htmlFor={id}>{field.label}{field.required ? " *" : ""}</label>
            {field.type === "textarea" ? (
              <textarea id={id} name={field.name} placeholder={field.placeholder} required={field.required} />
            ) : field.type === "select" ? (
              <select id={id} name={field.name} required={field.required} defaultValue="">
                <option value="" disabled>Choisir une option</option>
                {field.options?.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
              </select>
            ) : (
              <input id={id} name={field.name} type={field.type} placeholder={field.placeholder} required={field.required} />
            )}
          </div>
        );
      })}
      {requireAcknowledgement && (
        <label className="form-checkbox" htmlFor="privacy-acknowledgement">
          <input id="privacy-acknowledgement" name="privacyAcknowledgement" type="checkbox" required />
          <span>J’ai lu les informations relatives au traitement de mes données.</span>
        </label>
      )}
      <input name="turnstileToken" type="hidden" value="" readOnly />
      <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-10000px" }} />
      <p className="form-notice">{privacyNotice}</p>
      {!turnstileSiteKey && <p className="form-notice">Captcha : configurez `PUBLIC_TURNSTILE_SITE_KEY` avant la mise en production.</p>}
      <button className="button-primary" type="submit" disabled={state === "loading"}>
        {state === "loading" ? "Envoi…" : "Envoyer la demande"}
      </button>
      <p className="form-status" data-state={state} aria-live="polite">{message}</p>
    </form>
  );
}
