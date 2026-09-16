import type { SupabaseClient } from "@supabase/supabase-js";

// Ported from supabase/functions/scheduler/index.ts's WhatsAppService (Deno) —
// same Evolution API wrapper, same phone normalisation, config sourced from
// bcl_meetings_system_settings rather than env vars to match the existing scheduler.

export type WhatsAppSettings = Record<string, string>;

export class WhatsAppService {
  private baseUrl: string;
  private apiKey: string;
  private instanceName: string;

  constructor(settings: WhatsAppSettings) {
    this.baseUrl = settings["whatsapp_base_url"] || "https://evolution-api-production-15f8.up.railway.app";
    this.apiKey = settings["whatsapp_api_key"] || "";
    this.instanceName = settings["whatsapp_instance_name"] || "BCL REMINDERS";
  }

  formatPhoneNumber(phone: string): string | null {
    if (!phone) return null;

    let cleaned = phone.replace(/\D/g, "");

    if (cleaned.startsWith("0")) {
      cleaned = "254" + cleaned.slice(1);
    } else if (cleaned.startsWith("7") || cleaned.startsWith("1")) {
      cleaned = "254" + cleaned;
    } else if (!cleaned.startsWith("254")) {
      cleaned = "254" + cleaned;
    }

    if (cleaned.length !== 12 || !cleaned.startsWith("254")) {
      console.error(`❌ Invalid phone: ${phone} -> ${cleaned}`);
      return null;
    }

    return cleaned;
  }

  async sendText(to: string, text: string, isGroup = false, retries = 3): Promise<boolean> {
    if (!to) return false;

    let number = to;
    if (!isGroup) {
      const formatted = this.formatPhoneNumber(to);
      if (!formatted) return false;
      number = formatted;
    }

    const url = `${this.baseUrl}/message/sendText/${this.instanceName}`;
    const body = { number, text, linkPreview: false };

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: this.apiKey,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        });

        if (response.ok) {
          console.log(`✅ WhatsApp sent to ${number}`);
          return true;
        }
        console.error(`❌ API error (${attempt + 1}): ${response.status}`);
      } catch (e: any) {
        console.error(`❌ Send failed (${attempt + 1}):`, e?.message ?? e);
      }

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }

    return false;
  }
}

export async function getWhatsAppService(supabase: SupabaseClient): Promise<WhatsAppService> {
  const { data: settingRows } = await supabase.from("bcl_meetings_system_settings").select("*");
  const settings: WhatsAppSettings = {};
  settingRows?.forEach((r: any) => (settings[r.key] = r.value));
  return new WhatsAppService(settings);
}
