// @ts-nocheck
// ==========================================
// IMPORTS (Deno Compatible)
// ==========================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { format, addDays, startOfDay, endOfDay, startOfWeek, endOfWeek, parseISO } from 'https://esm.sh/date-fns@2.30.0'

// ==========================================
// CONFIGURATION & TYPES
// ==========================================
interface Meeting {
    id: number
    client_name: string
    client_company: string
    client_phone: string
    meeting_start_time: string
    venue: string
    meeting_date: string
}

interface Settings {
    [key: string]: string
}

// ==========================================
// SERVICE: WHATSAPP (EVOLUTION API)
// ==========================================
class WhatsAppService {
    private baseUrl: string;
    private apiKey: string;
    private instanceName: string;

    constructor(settings: Settings) {
        this.baseUrl = settings['whatsapp_base_url'] || 'https://evolution-api-production-15f8.up.railway.app';
        this.apiKey = settings['whatsapp_api_key'] || '';
        this.instanceName = settings['whatsapp_instance_name'] || 'BCL REMINDERS';
    }

    async getGroupId(inviteCode: string): Promise<string | null> {
        try {
            const url = `${this.baseUrl}/group/inviteInfo/${this.instanceName}?inviteCode=${inviteCode}`;
            const res = await fetch(url, { headers: { 'apikey': this.apiKey } });
            const data = await res.json();
            return data?.id || null;
        } catch (e) {
            console.error('Error fetching Group ID:', e);
            return null;
        }
    }

    async sendText(to: string, text: string, isGroup = false) {
        if (!to) return;
        try {
            // Format number if individual (Kenya specific 254)
            let number = to;
            if (!isGroup) {
                number = to.replace(/\D/g, '');
                if (number.startsWith('0')) number = '254' + number.slice(1);
            }

            const url = `${this.baseUrl}/message/sendText/${this.instanceName}`;
            const body = {
                number: number,
                text: text,
                linkPreview: false
            };

            await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.apiKey
                },
                body: JSON.stringify(body)
            });
            console.log(`WhatsApp sent to ${to}`);
        } catch (e) {
            console.error(`Failed to send WhatsApp to ${to}:`, e);
        }
    }
}

// ==========================================
// SERVICE: FIREBASE (FCM)
// ==========================================
class FirebaseService {
    private projectId: string;
    private serverKey: string;

    constructor(settings: Settings, serverKey: string) {
        this.projectId = settings['firebase_project_id'] || '';
        this.serverKey = serverKey;
    }

    async sendMulticastNotification(title: string, body: string, data?: { [key: string]: string }) {
        if (!this.serverKey) {
            console.log('Firebase Server Key missing. Skipping FCM.');
            return;
        }

        try {
            const url = 'https://fcm.googleapis.com/fcm/send';
            const payload = {
                to: '/topics/all_devices',
                notification: {
                    title: title,
                    body: body,
                    sound: 'default',
                    icon: '/android/android-launchericon-192-192.png',
                    click_action: 'FLUTTER_NOTIFICATION_CLICK'
                },
                data: {
                    url: '/schedule',
                    ...data
                }
            };

            await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `key=${this.serverKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            console.log('Firebase Notification Sent');
        } catch (e) {
            console.error('Firebase Error:', e);
        }
    }
}

// ==========================================
// MAIN LOGIC HANDLER
// ==========================================
serve(async (req) => {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. LOAD SETTINGS
    const { data: settingRows } = await supabase.from('bcl_meetings_system_settings').select('*');
    const settings: Settings = {};
    settingRows?.forEach(r => settings[r.key] = r.value);

    const wa = new WhatsAppService(settings);
    const firebase = new FirebaseService(settings, Deno.env.get('FIREBASE_SERVER_KEY') || '');

    const now = new Date();
    const logs: string[] = [];

    // ==========================================
    // A. MORNING REPORT (Runs at ~6:00 AM)
    // ==========================================
    if (now.getHours() === 6 && now.getMinutes() < 15 && settings['enable_morning_report'] === 'true') {
        const todayStart = startOfDay(now).toISOString();

        // Check if already sent
        const { data: sent } = await supabase.from('bcl_meetings_reminder_logs')
            .select('*')
            .eq('reminder_type', 'morning_report')
            .gte('sent_at', todayStart);

        if (!sent?.length) {
            // Fetch Today's Meetings
            const { data: todaysMeetings } = await supabase.from('bcl_meetings_meetings')
                .select('*')
                .gte('meeting_start_time', todayStart)
                .lte('meeting_start_time', endOfDay(now).toISOString())
                .order('meeting_start_time');

            // Fetch Upcoming Week Stats
            const { count: weekCount } = await supabase.from('bcl_meetings_meetings')
                .select('*', { count: 'exact', head: true })
                .gte('meeting_start_time', now.toISOString())
                .lte('meeting_start_time', addDays(now, 7).toISOString());

            // Fetch Tomorrow Stats
            const { count: tomCount } = await supabase.from('bcl_meetings_meetings')
                .select('*', { count: 'exact', head: true })
                .gte('meeting_start_time', startOfDay(addDays(now, 1)).toISOString())
                .lte('meeting_start_time', endOfDay(addDays(now, 1)).toISOString());

            // BUILD MESSAGE
            let msg = `🌅 *MORNING REPORT*\n📅 *${format(now, 'EEEE, dd MMMM yyyy')}*\n\n`;
            msg += `📌 *TODAY'S SCHEDULE:*\n`;

            if (!todaysMeetings || todaysMeetings.length === 0) {
                msg += `_No meetings scheduled for today._\n`;
            } else {
                todaysMeetings.forEach((m: Meeting) => {
                    const time = format(parseISO(m.meeting_start_time), 'hh:mm a');
                    const company = m.client_company ? `(${m.client_company})` : '';
                    msg += `🕒 ${time} - *${m.client_name}* ${company}\n`;
                });
            }

            msg += `\n🔮 *UPCOMING OUTLOOK:*\n`;
            msg += `• Tomorrow: ${tomCount} meetings\n`;
            msg += `• Next 7 Days: ${weekCount} meetings\n`;

            // Get Group ID
            const groupId = await wa.getGroupId(settings['admin_whatsapp_group_code']);
            if (groupId) {
                await wa.sendText(groupId, msg, true);
                await supabase.from('bcl_meetings_reminder_logs').insert({
                    reminder_type: 'morning_report',
                    recipient_group: 'admin_group',
                    channel: 'whatsapp'
                });
                logs.push('Morning report sent');
            }
        }
    }

    // ==========================================
    // B. WEEKLY REPORT (Fridays ~6:00 PM)
    // ==========================================
    if (now.getDay() === 5 && now.getHours() === 18 && now.getMinutes() < 15 && settings['enable_weekly_report'] === 'true') {
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();

        const { data: sentWeek } = await supabase.from('bcl_meetings_reminder_logs')
            .select('*').eq('reminder_type', 'weekly_report').gte('sent_at', startOfDay(now).toISOString());

        if (!sentWeek?.length) {
            const { data: weekMeetings } = await supabase.from('bcl_meetings_meetings')
                .select('*')
                .gte('meeting_start_time', weekStart)
                .lte('meeting_start_time', weekEnd)
                .order('meeting_start_time');

            let wMsg = `📅 *END OF WEEK REPORT*\nWeek: ${format(now, 'do MMM')}\n\n`;
            wMsg += `📊 *SUMMARY:*\nTotal Meetings: ${weekMeetings?.length || 0}\n\n`;
            wMsg += `📝 *DETAILS:*\n`;

            weekMeetings?.forEach((m: Meeting) => {
                const day = format(parseISO(m.meeting_start_time), 'EEE');
                wMsg += `• ${day}: ${m.client_name} - ${m.client_company || 'N/A'}\n`;
            });

            const groupId = await wa.getGroupId(settings['admin_whatsapp_group_code']);
            if (groupId) {
                await wa.sendText(groupId, wMsg, true);
                await supabase.from('bcl_meetings_reminder_logs').insert({
                    reminder_type: 'weekly_report',
                    recipient_group: 'admin_group',
                    channel: 'whatsapp'
                });
                logs.push('Weekly report sent');
            }
        }
    }

    // ==========================================
    // C. 1 HOUR REMINDERS
    // ==========================================
    if (settings['enable_1hr_reminder'] === 'true') {
        const startWindow = new Date(now.getTime() + 60 * 60 * 1000); // 1 hr from now
        const endWindow = new Date(startWindow.getTime() + 10 * 60 * 1000); // 10 min buffer

        const { data: upcoming1h } = await supabase.from('bcl_meetings_meetings')
            .select('*')
            .gte('meeting_start_time', startWindow.toISOString())
            .lte('meeting_start_time', endWindow.toISOString());

        for (const m of upcoming1h || []) {
            // Check Log
            const { data: exists } = await supabase.from('bcl_meetings_reminder_logs')
                .select('*').eq('meeting_id', m.id).eq('reminder_type', '1_hour');

            if (!exists?.length) {
                const timeStr = format(parseISO(m.meeting_start_time), 'hh:mm a');

                // 1. Send to Client
                if (m.client_phone) {
                    const cMsg = `👋 Hello *${m.client_name}*,\n\nThis is a reminder for your appointment today at *${timeStr}*\n\n📍 Venue: ${m.venue || 'Online'}\n\nSee you soon!`;
                    await wa.sendText(m.client_phone, cMsg);
                }

                // 2. Send to Admin Group
                const groupId = await wa.getGroupId(settings['admin_whatsapp_group_code']);
                if (groupId) {
                    const aMsg = `⏰ *UPCOMING MEETING (1 HR)*\n\n👤 ${m.client_name}\n🏢 ${m.client_company || 'N/A'}\n🕒 ${timeStr}\n📱 ${m.client_phone}`;
                    await wa.sendText(groupId, aMsg, true);
                }

                // 3. Parallel Firebase
                await firebase.sendMulticastNotification('Upcoming Meeting', `Meeting with ${m.client_name} in 1 hour.`);

                // Log
                await supabase.from('bcl_meetings_reminder_logs').insert({
                    meeting_id: m.id,
                    reminder_type: '1_hour',
                    channel: 'multi'
                });
                logs.push(`1hr reminder sent for ${m.client_name}`);
            }
        }
    }

    // ==========================================
    // D. 5 MINUTE REMINDERS
    // ==========================================
    if (settings['enable_5min_reminder'] === 'true') {
        const startWindow = new Date(now.getTime() + 5 * 60 * 1000); // 5 mins from now
        const endWindow = new Date(startWindow.getTime() + 5 * 60 * 1000); // 5 min buffer

        const { data: upcoming5m } = await supabase.from('bcl_meetings_meetings')
            .select('*')
            .gte('meeting_start_time', startWindow.toISOString())
            .lte('meeting_start_time', endWindow.toISOString());

        for (const m of upcoming5m || []) {
            // Check Log
            const { data: exists } = await supabase.from('bcl_meetings_reminder_logs')
                .select('*').eq('meeting_id', m.id).eq('reminder_type', '5_min');

            if (!exists?.length) {
                // 1. Send to Client
                if (m.client_phone) {
                    const cMsg = `🚀 *STARTING SOON*\n\nHi ${m.client_name}, your appointment starts in *5 minutes*. Please be ready.`;
                    await wa.sendText(m.client_phone, cMsg);
                }

                // 2. Parallel Firebase
                await firebase.sendMulticastNotification('Meeting Starting Soon', `Meeting with ${m.client_name} starting in 5 minutes.`);

                // Log
                await supabase.from('bcl_meetings_reminder_logs').insert({
                    meeting_id: m.id,
                    reminder_type: '5_min',
                    channel: 'multi'
                });
                logs.push(`5min reminder sent for ${m.client_name}`);
            }
        }
    }

    return new Response(JSON.stringify({ success: true, logs }), {
        headers: { "Content-Type": "application/json" },
    })
})
