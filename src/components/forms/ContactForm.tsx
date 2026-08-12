import { useEffect, useId, useRef, useState } from 'react';

import type { FormField } from '@/config/schema';

interface Props {
  fields: FormField[];
  privacyNotice: string;
  requireAcknowledgement: boolean;
  marketingOptIn: boolean;
  captchaSiteKey?: string;
  submitLabel?: string;
  fallbackEmail?: string;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'error'; message: string; fieldErrors?: Record<string, string> };

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: { sitekey: string; callback: (token: string) => void }) => void;
    };
  }
}

/**
 * Rendered entirely from site.config.form.fields, so a new project changes the
 * config and never this file.
 *
 * Hydrated with client:visible (I5): the form is below the fold on every page it
 * appears on, and nothing here is needed before the visitor scrolls to it.
 */
export default function ContactForm({
  fields,
  privacyNotice,
  requireAcknowledgement,
  marketingOptIn,
  captchaSiteKey,
  submitLabel = 'Envoyer',
  fallbackEmail,
}: Props) {
  const formId = useId();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaRef = useRef<HTMLDivElement>(null);

  // Generated once per mount and reused across retries: the server refuses to
  // deliver the same id twice, so a double click cannot create two leads.
  const submissionId = useRef(crypto.randomUUID());
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (!captchaSiteKey || !captchaRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => {
      if (captchaRef.current) {
        window.turnstile?.render(captchaRef.current, { sitekey: captchaSiteKey, callback: setCaptchaToken });
      }
    };
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [captchaSiteKey]);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: 'submitting' });

    const data = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      submissionId: submissionId.current,
      startedAt: startedAt.current,
      website: String(data.get('website') ?? ''),
    };

    if (captchaSiteKey) payload.captchaToken = captchaToken;

    for (const field of fields) {
      const value = data.get(field.name);
      if (field.type === 'checkbox') {
        payload[field.name] = value === 'on';
      } else if (value !== null) {
        payload[field.name] = String(value);
      }
    }

    if (requireAcknowledgement) payload.acknowledgement = data.get('acknowledgement') === 'on';
    if (marketingOptIn) payload.marketingOptIn = data.get('marketingOptIn') === 'on';

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
        redirectTo?: string;
        fieldErrors?: Record<string, string>;
      };

      if (result.ok && result.redirectTo) {
        window.location.assign(result.redirectTo);
        return;
      }

      setStatus({
        kind: 'error',
        message: result.message ?? "L'envoi a échoué.",
        fieldErrors: result.fieldErrors,
      });
    } catch {
      setStatus({
        kind: 'error',
        message: fallbackEmail
          ? `Connexion impossible. Écrivez-nous à ${fallbackEmail}.`
          : 'Connexion impossible. Merci de réessayer.',
      });
    }
  }

  const busy = status.kind === 'submitting';
  const fieldErrors = status.kind === 'error' ? (status.fieldErrors ?? {}) : {};

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {fields.map((field) => {
        const id = `${formId}-${field.name}`;
        const errorId = `${id}-error`;
        const error = fieldErrors[field.name];
        const shared = {
          id,
          name: field.name,
          required: field.required,
          'aria-invalid': error ? true : undefined,
          'aria-describedby': error ? errorId : undefined,
          autoComplete: field.autocomplete,
          placeholder: field.placeholder,
          className:
            'w-full rounded-(--radius-base) border border-(--color-border) px-3 py-2 text-base',
        };

        return (
          <div key={field.name} className="flex flex-col gap-2">
            <label htmlFor={id} className="text-sm font-medium">
              {field.label}
              {field.required && <span aria-hidden="true"> *</span>}
            </label>

            {field.type === 'textarea' ? (
              <textarea {...shared} rows={6} minLength={field.min} maxLength={field.max} />
            ) : field.type === 'select' ? (
              <select {...shared}>
                <option value="">—</option>
                {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            ) : field.type === 'checkbox' ? (
              <input {...shared} type="checkbox" className="size-5" />
            ) : (
              <input {...shared} type={field.type} minLength={field.min} maxLength={field.max} />
            )}

            {error && (
              <p id={errorId} className="text-sm text-red-700">
                {error}
              </p>
            )}
          </div>
        );
      })}

      {/* Honeypot: off-screen rather than display:none, which some bots detect. */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label htmlFor={`${formId}-website`}>Ne pas remplir</label>
        <input id={`${formId}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {requireAcknowledgement && (
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="acknowledgement" required className="mt-1 size-5" />
          <span>J'ai lu et compris l'utilisation de mes données.</span>
        </label>
      )}

      {marketingOptIn && (
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="marketingOptIn" className="mt-1 size-5" />
          <span>Je souhaite recevoir des actualités par email (facultatif).</span>
        </label>
      )}

      {captchaSiteKey && <div ref={captchaRef} />}

      <button
        type="submit"
        disabled={busy}
        className="rounded-(--radius-base) bg-(--color-brand) px-5 py-3 text-(--color-brand-contrast) disabled:opacity-60"
      >
        {busy ? 'Envoi…' : submitLabel}
      </button>

      <p className="text-xs text-(--color-muted)">{privacyNotice}</p>

      <p role="status" aria-live="polite" className="text-sm text-red-700">
        {status.kind === 'error' ? status.message : ''}
      </p>
    </form>
  );
}
