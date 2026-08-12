import { site } from "../../config/site.config";
import type { LeadRequest } from "../leads/types";
import type { MailMessage } from "../adapters/types";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

export function leadAutoReply(lead: LeadRequest): MailMessage {
  const name = escapeHtml(lead.name);
  return {
    to: lead.email ?? site.contact.email,
    subject: `Votre demande — ${site.name}`,
    replyTo: site.contact.email,
    html: `<p>Bonjour ${name},</p><p>Votre demande a bien été reçue. Nous reviendrons vers vous après lecture.</p><p>${escapeHtml(site.name)}</p>`,
    text: `Bonjour ${lead.name},\n\nVotre demande a bien été reçue. Nous reviendrons vers vous après lecture.\n\n${site.name}`,
  };
}

export function leadNotification(lead: LeadRequest): MailMessage {
  const lines = Object.entries(lead.fields)
    .map(([key, value]) => `<li><strong>${escapeHtml(key)}</strong> : ${escapeHtml(String(value ?? ""))}</li>`)
    .join("");
  return {
    to: site.contact.email,
    subject: `Nouvelle demande — ${lead.company}`,
    replyTo: lead.email,
    html: `<h1>Nouvelle demande</h1><p><strong>${escapeHtml(lead.name)}</strong> (${escapeHtml(lead.company)})</p><ul>${lines}</ul>`,
    text: `Nouvelle demande\n${lead.name} (${lead.company})\n${Object.entries(lead.fields).map(([key, value]) => `${key}: ${String(value ?? "")}`).join("\n")}`,
  };
}
