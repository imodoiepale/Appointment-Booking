// ==========================================
// WHATSAPP SERVICE (EVOLUTION API)
// Borrowed and adapted from EFNS-AUTOMATIONS project
// ==========================================

export class WhatsAppService {
    private baseUrl: string;
    private apiKey: string;
    private instanceName: string;

    constructor(settings: { [key: string]: string }) {
        this.baseUrl = settings['whatsapp_base_url'] || 'https://evolution-api-production-15f8.up.railway.app';
        this.apiKey = settings['whatsapp_api_key'] || 'b4dfe130f8a7f80eee25e09e1e872ab0';
        this.instanceName = settings['whatsapp_instance_name'] || 'BCL REMINDERS';
    }

    // Borrowed from EFNS: Get Group ID from Invite Code
    async getGroupId(inviteCode: string): Promise<string | null> {
        try {
            const url = `${this.baseUrl}/group/inviteInfo/${this.instanceName}?inviteCode=${inviteCode}`;
            const response = await fetch(url, {
                headers: { 'apikey': this.apiKey }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data?.id || null;
        } catch (error) {
            console.error('Error fetching Group ID:', error);
            return null;
        }
    }

    async sendText(to: string, text: string, isGroup = false): Promise<boolean> {
        if (!to) return false;

        try {
            // Format number if individual (Kenya specific 254)
            let number = to;
            if (!isGroup) {
                number = to.replace(/\D/g, ''); // Remove non-digits
                if (number.startsWith('0')) number = '254' + number.slice(1);
            }

            const url = `${this.baseUrl}/message/sendText/${this.instanceName}`;
            const body = {
                number: number,
                text: text,
                linkPreview: false
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.apiKey
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            console.log(`WhatsApp sent to ${to}`);
            return true;
        } catch (error) {
            console.error(`Failed to send WhatsApp to ${to}:`, error);
            return false;
        }
    }

    // Test connection to Evolution API
    async testConnection(): Promise<boolean> {
        try {
            const url = `${this.baseUrl}/instance/${this.instanceName}/connection`;
            const response = await fetch(url, {
                headers: { 'apikey': this.apiKey }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data?.connected || false;
        } catch (error) {
            console.error('Error testing WhatsApp connection:', error);
            return false;
        }
    }
}
