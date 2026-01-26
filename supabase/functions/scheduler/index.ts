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
    id_main: number
    client_name: string
    client_company: string
    client_phone: string
    client_mobile: string
    meeting_start_time: string
    venue: string
    meeting_venue_area: string
    meeting_date: string
    meeting_agenda: string
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

    async getGroupId(inviteCode: string, retries = 2): Promise<string | null> {
        if (!inviteCode) {
            console.error('No invite code provided');
            return null;
        }
        
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const url = `${this.baseUrl}/group/inviteInfo/${this.instanceName}?inviteCode=${inviteCode}`;
                const res = await fetch(url, { headers: { 'apikey': this.apiKey } });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data?.id) {
                        console.log('Group ID fetched successfully');
                        return data.id;
                    }
                }
                
                console.error(`Failed to fetch Group ID (attempt ${attempt + 1}): ${res.status}`);
            } catch (e) {
                console.error(`Error fetching Group ID (attempt ${attempt + 1}):`, e);
            }
            
            // Wait before retry
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
        
        console.error('All retry attempts failed for fetching Group ID');
        return null;
    }

    formatPhoneNumber(phone: string): string | null {
        if (!phone) return null;
        
        // Remove all non-digit characters
        let cleaned = phone.replace(/\D/g, '');
        
        // Handle Kenyan numbers
        if (cleaned.startsWith('0')) {
            // 07xx or 01xx -> 2547xx or 2541xx
            cleaned = '254' + cleaned.slice(1);
        } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
            // 7xx or 1xx -> 2547xx or 2541xx
            cleaned = '254' + cleaned;
        } else if (!cleaned.startsWith('254')) {
            // If doesn't start with 254, assume it needs it
            cleaned = '254' + cleaned;
        }
        
        // Validate: should be 254 + 9 digits = 12 digits total
        if (cleaned.length !== 12 || !cleaned.startsWith('254')) {
            console.error(`Invalid phone number format: ${phone}`);
            return null;
        }
        
        return cleaned;
    }

    async sendText(to: string, text: string, isGroup = false, retries = 2) {
        if (!to) return false;
        
        let number = to;
        if (!isGroup) {
            const formatted = this.formatPhoneNumber(to);
            if (!formatted) {
                console.error(`Invalid phone number, skipping: ${to}`);
                return false;
            }
            number = formatted;
        }

        const url = `${this.baseUrl}/message/sendText/${this.instanceName}`;
        const body = {
            number: number,
            text: text,
            linkPreview: false
        };

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': this.apiKey
                    },
                    body: JSON.stringify(body)
                });
                
                if (response.ok) {
                    console.log(`WhatsApp sent to ${number}`);
                    return true;
                } else {
                    console.error(`WhatsApp API error (attempt ${attempt + 1}): ${response.status}`);
                }
            } catch (e) {
                console.error(`Failed to send WhatsApp to ${number} (attempt ${attempt + 1}):`, e);
            }
            
            // Wait before retry (exponential backoff)
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
        
        console.error(`All retry attempts failed for ${number}`);
        return false;
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
    // DEPLOYMENT TEST SUMMARY (Last 5 + Next 5 Days)
    // ==========================================
    const todayStart = startOfDay(now).toISOString();
    
    // Check if deployment test was already sent today
    const { data: deploymentSent } = await supabase.from('bcl_meetings_reminder_logs')
        .select('*')
        .eq('reminder_type', 'deployment_test')
        .gte('sent_at', todayStart);
    
    if (!deploymentSent?.length) {
        const last5Days = Array.from({ length: 5 }, (_, i) => format(addDays(now, -(i + 1)), 'yyyy-MM-dd'));
        const next5Days = Array.from({ length: 5 }, (_, i) => format(addDays(now, i + 1), 'yyyy-MM-dd'));
        
        const { data: pastMeetings } = await supabase.from('bcl_meetings_meetings')
            .select('*')
            .in('meeting_date', last5Days)
            .order('meeting_date, meeting_start_time');
        
        const { data: futureMeetings } = await supabase.from('bcl_meetings_meetings')
            .select('*')
            .in('meeting_date', next5Days)
            .order('meeting_date, meeting_start_time');
        
        let testMsg = `🧪 *TESTING - DEPLOYMENT SUMMARY*\n📅 *${format(now, 'EEEE, dd MMMM yyyy HH:mm')}*\n\n`;
        testMsg += `📊 *LAST 5 DAYS SUMMARY:*\n`;
        testMsg += `Total Meetings: ${pastMeetings?.length || 0}\n`;
        
        if (pastMeetings && pastMeetings.length > 0) {
            const groupedPast = pastMeetings.reduce((acc: any, m: Meeting) => {
                if (!acc[m.meeting_date]) acc[m.meeting_date] = [];
                acc[m.meeting_date].push(m);
                return acc;
            }, {});
            
            Object.keys(groupedPast).sort().reverse().forEach(date => {
                const dayName = format(parseISO(date), 'EEE, MMM dd');
                testMsg += `\n*${dayName}:* ${groupedPast[date].length} meeting(s)\n`;
                groupedPast[date].forEach((m: Meeting) => {
                    testMsg += `  • ${m.meeting_start_time || 'TBD'} - ${m.client_name} (${m.client_company || 'N/A'})\n`;
                });
            });
        } else {
            testMsg += `No meetings in the last 5 days.\n`;
        }
        
        testMsg += `\n🔮 *NEXT 5 DAYS OUTLOOK:*\n`;
        testMsg += `Total Meetings: ${futureMeetings?.length || 0}\n`;
        
        if (futureMeetings && futureMeetings.length > 0) {
            const groupedFuture = futureMeetings.reduce((acc: any, m: Meeting) => {
                if (!acc[m.meeting_date]) acc[m.meeting_date] = [];
                acc[m.meeting_date].push(m);
                return acc;
            }, {});
            
            Object.keys(groupedFuture).sort().forEach(date => {
                const dayName = format(parseISO(date), 'EEE, MMM dd');
                testMsg += `\n*${dayName}:* ${groupedFuture[date].length} meeting(s)\n`;
                groupedFuture[date].forEach((m: Meeting) => {
                    testMsg += `  • ${m.meeting_start_time || 'TBD'} - ${m.client_name} (${m.client_company || 'N/A'})\n`;
                });
            });
        } else {
            testMsg += `No meetings scheduled for the next 5 days.\n`;
        }
        
        testMsg += `\n✅ Function deployed and running successfully!`;
        
        const groupId = await wa.getGroupId(settings['admin_whatsapp_group_code']);
        if (groupId) {
            await wa.sendText(groupId, testMsg, true);
            await supabase.from('bcl_meetings_reminder_logs').insert({
                reminder_type: 'deployment_test',
                recipient_group: 'admin_group',
                channel: 'whatsapp'
            });
            logs.push('Deployment test summary sent');
        }
    }

    // ==========================================
    // A. MORNING REPORT (Runs at ~6:00 AM EAT / 3:00 AM UTC)
    // ==========================================
    if (now.getHours() === 3 && now.getMinutes() < 15 && settings['enable_morning_report'] === 'true') {
        const todayStart = startOfDay(now).toISOString();
        const todayDateStr = format(now, 'yyyy-MM-dd');

        // Check if already sent
        const { data: sent } = await supabase.from('bcl_meetings_reminder_logs')
            .select('*')
            .eq('reminder_type', 'morning_report')
            .gte('sent_at', todayStart);

        if (!sent?.length) {
            // Fetch Today's Meetings using meeting_date field
            const { data: todaysMeetings, error: todayError } = await supabase.from('bcl_meetings_meetings')
                .select('*')
                .eq('meeting_date', todayDateStr)
                .order('meeting_start_time');

            if (todayError) {
                console.error('Error fetching today meetings:', todayError);
            }

            // Fetch Upcoming Week Stats (next 7 days)
            const weekDates = Array.from({ length: 7 }, (_, i) => format(addDays(now, i), 'yyyy-MM-dd'));
            const { data: weekMeetings, error: weekError } = await supabase.from('bcl_meetings_meetings')
                .select('*')
                .in('meeting_date', weekDates);
            const weekCount = weekMeetings?.length || 0;

            if (weekError) {
                console.error('Error fetching week meetings:', weekError);
            }

            // Fetch Tomorrow Stats
            const tomorrowDateStr = format(addDays(now, 1), 'yyyy-MM-dd');
            const { data: tomMeetings, error: tomError } = await supabase.from('bcl_meetings_meetings')
                .select('*')
                .eq('meeting_date', tomorrowDateStr);
            const tomCount = tomMeetings?.length || 0;

            if (tomError) {
                console.error('Error fetching tomorrow meetings:', tomError);
            }

            // BUILD MESSAGE
            let msg = `🌅 *MORNING REPORT*\n📅 *${format(now, 'EEEE, dd MMMM yyyy')}*\n\n`;
            msg += `📌 *TODAY'S SCHEDULE:*\n`;

            if (!todaysMeetings || todaysMeetings.length === 0) {
                msg += `No meetings scheduled for today.\n`;
            } else {
                todaysMeetings.forEach((m: Meeting) => {
                    const time = m.meeting_start_time || 'TBD';
                    const company = m.client_company ? `(${m.client_company})` : '';
                    const agenda = m.meeting_agenda ? `\n   📋 ${m.meeting_agenda}` : '';
                    msg += `🕒 ${time} - *${m.client_name}* ${company}${agenda}\n`;
                });
            }

            msg += `\n🔮 *UPCOMING OUTLOOK:*\n`;
            msg += `• Tomorrow: ${tomCount} meetings\n`;
            msg += `• Next 7 Days: ${weekCount} meetings\n`;

            // Get Group ID with fallback
            const groupId = await wa.getGroupId(settings['admin_whatsapp_group_code']);
            if (groupId) {
                const sent = await wa.sendText(groupId, msg, true);
                if (sent) {
                    await supabase.from('bcl_meetings_reminder_logs').insert({
                        reminder_type: 'morning_report',
                        recipient_group: 'admin_group',
                        channel: 'whatsapp'
                    });
                    logs.push('Morning report sent');
                } else {
                    logs.push('Morning report failed to send');
                }
            } else {
                logs.push('Failed to get admin group ID for morning report');
            }
        }
    }

    // ==========================================
    // B. WEEKLY REPORT (Fridays ~6:00 PM EAT / 3:00 PM UTC)
    // ==========================================
    if (now.getDay() === 5 && now.getHours() === 15 && now.getMinutes() < 15 && settings['enable_weekly_report'] === 'true') {
        const weekStartDate = startOfWeek(now, { weekStartsOn: 1 });
        const weekEndDate = endOfWeek(now, { weekStartsOn: 1 });
        const weekDates = [];
        for (let d = new Date(weekStartDate); d <= weekEndDate; d.setDate(d.getDate() + 1)) {
            weekDates.push(format(d, 'yyyy-MM-dd'));
        }

        const { data: sentWeek } = await supabase.from('bcl_meetings_reminder_logs')
            .select('*').eq('reminder_type', 'weekly_report').gte('sent_at', startOfDay(now).toISOString());

        if (!sentWeek?.length) {
            const { data: weekMeetings, error: weekError } = await supabase.from('bcl_meetings_meetings')
                .select('*')
                .in('meeting_date', weekDates)
                .order('meeting_date, meeting_start_time');

            if (weekError) {
                console.error('Error fetching week meetings:', weekError);
            }

            let wMsg = `📅 *END OF WEEK REPORT*\nWeek: ${format(now, 'do MMM')}\n\n`;
            wMsg += `📊 *SUMMARY:*\nTotal Meetings: ${weekMeetings?.length || 0}\n\n`;
            wMsg += `📝 *DETAILS:*\n`;

            weekMeetings?.forEach((m: Meeting) => {
                const day = m.meeting_date ? format(parseISO(m.meeting_date), 'EEE') : 'N/A';
                const agenda = m.meeting_agenda ? ` (${m.meeting_agenda})` : '';
                wMsg += `• ${day}: ${m.client_name} - ${m.client_company || 'N/A'}${agenda}\n`;
            });

            const groupId = await wa.getGroupId(settings['admin_whatsapp_group_code']);
            if (groupId) {
                const sent = await wa.sendText(groupId, wMsg, true);
                if (sent) {
                    await supabase.from('bcl_meetings_reminder_logs').insert({
                        reminder_type: 'weekly_report',
                        recipient_group: 'admin_group',
                        channel: 'whatsapp'
                    });
                    logs.push('Weekly report sent');
                } else {
                    logs.push('Weekly report failed to send');
                }
            } else {
                logs.push('Failed to get admin group ID for weekly report');
            }
        }
    }

    // ==========================================
    // C. 1 HOUR REMINDERS
    // ==========================================
    if (settings['enable_1hr_reminder'] === 'true') {
        const todayDateStr = format(now, 'yyyy-MM-dd');
        const tomorrowDateStr = format(addDays(now, 1), 'yyyy-MM-dd');
        
        // Fetch today's and tomorrow's meetings (in case we're near midnight)
        const { data: allMeetings, error: meetingsError } = await supabase.from('bcl_meetings_meetings')
            .select('*')
            .in('meeting_date', [todayDateStr, tomorrowDateStr]);

        if (meetingsError) {
            console.error('Error fetching meetings for 1hr reminder:', meetingsError);
        }

        // Filter meetings that are 1 hour away (with 10 min buffer)
        const upcoming1h = allMeetings?.filter((m: Meeting) => {
            if (!m.meeting_date || !m.meeting_start_time) return false;
            try {
                const meetingDateTime = parseISO(`${m.meeting_date}T${m.meeting_start_time}`);
                const timeDiff = meetingDateTime.getTime() - now.getTime();
                return timeDiff >= 50 * 60 * 1000 && timeDiff <= 70 * 60 * 1000; // 50-70 min window
            } catch (e) {
                console.error('Error parsing meeting time:', e);
                return false;
            }
        }) || [];

        for (const m of upcoming1h) {
            // Check Log
            const { data: exists } = await supabase.from('bcl_meetings_reminder_logs')
                .select('*').eq('meeting_id', m.id_main).eq('reminder_type', '1_hour');

            if (!exists?.length) {
                const timeStr = m.meeting_start_time || 'TBD';
                const phone = m.client_mobile || m.client_phone;
                const venue = m.meeting_venue_area || m.venue || 'Online';

                // 1. Send to Client
                if (phone) {
                    const cMsg = `👋 Hello *${m.client_name}*,\n\nThis is a reminder for your appointment today at *${timeStr}*\n\n📍 Venue: ${venue}\n📋 Purpose: ${m.meeting_agenda || 'Meeting'}\n\nSee you soon!`;
                    await wa.sendText(phone, cMsg);
                }

                // 2. Send to Admin Group
                const groupId = await wa.getGroupId(settings['admin_whatsapp_group_code']);
                if (groupId) {
                    const aMsg = `⏰ *UPCOMING MEETING (1 HR)*\n\n👤 ${m.client_name}\n🏢 ${m.client_company || 'N/A'}\n🕒 ${timeStr}\n📱 ${phone || 'N/A'}\n📋 ${m.meeting_agenda || 'N/A'}`;
                    await wa.sendText(groupId, aMsg, true);
                }

                // 3. Parallel Firebase
                await firebase.sendMulticastNotification('Upcoming Meeting', `Meeting with ${m.client_name} in 1 hour.`);

                // Log
                await supabase.from('bcl_meetings_reminder_logs').insert({
                    meeting_id: m.id_main,
                    reminder_type: '1_hour',
                    channel: 'multi'
                });
                logs.push(`1hr reminder sent for ${m.client_name}`);
            }
        }
    }

    // ==========================================
    // C2. 30 MINUTE REMINDERS
    // ==========================================
    if (settings['enable_30min_reminder'] === 'true') {
        const todayDateStr = format(now, 'yyyy-MM-dd');
        const tomorrowDateStr = format(addDays(now, 1), 'yyyy-MM-dd');
        
        // Fetch today's and tomorrow's meetings
        const { data: allMeetings30m, error: meetings30mError } = await supabase.from('bcl_meetings_meetings')
            .select('*')
            .in('meeting_date', [todayDateStr, tomorrowDateStr]);

        if (meetings30mError) {
            console.error('Error fetching meetings for 30min reminder:', meetings30mError);
        }

        // Filter meetings that are 30 minutes away (with 10 min buffer)
        const upcoming30m = allMeetings30m?.filter((m: Meeting) => {
            if (!m.meeting_date || !m.meeting_start_time) return false;
            try {
                const meetingDateTime = parseISO(`${m.meeting_date}T${m.meeting_start_time}`);
                const timeDiff = meetingDateTime.getTime() - now.getTime();
                return timeDiff >= 20 * 60 * 1000 && timeDiff <= 40 * 60 * 1000; // 20-40 min window
            } catch (e) {
                console.error('Error parsing meeting time:', e);
                return false;
            }
        }) || [];

        for (const m of upcoming30m) {
            // Check Log
            const { data: exists } = await supabase.from('bcl_meetings_reminder_logs')
                .select('*').eq('meeting_id', m.id_main).eq('reminder_type', '30_min');

            if (!exists?.length) {
                const timeStr = m.meeting_start_time || 'TBD';
                const phone = m.client_mobile || m.client_phone;
                const venue = m.meeting_venue_area || m.venue || 'Online';

                // 1. Send to Client
                if (phone) {
                    const cMsg = `⏰ Hi *${m.client_name}*,\n\nYour appointment is in *30 minutes* at *${timeStr}*\n\n📍 Venue: ${venue}\n📋 Purpose: ${m.meeting_agenda || 'Meeting'}\n\nPlease start preparing!`;
                    await wa.sendText(phone, cMsg);
                }

                // 2. Send to Admin Group
                const groupId = await wa.getGroupId(settings['admin_whatsapp_group_code']);
                if (groupId) {
                    const aMsg = `⏰ *UPCOMING MEETING (30 MIN)*\n\n👤 ${m.client_name}\n🏢 ${m.client_company || 'N/A'}\n🕒 ${timeStr}\n📱 ${phone || 'N/A'}\n📋 ${m.meeting_agenda || 'N/A'}`;
                    await wa.sendText(groupId, aMsg, true);
                }

                // 3. Firebase notification
                await firebase.sendMulticastNotification('Meeting in 30 Minutes', `Meeting with ${m.client_name} starts soon.`);

                // Log
                await supabase.from('bcl_meetings_reminder_logs').insert({
                    meeting_id: m.id_main,
                    reminder_type: '30_min',
                    channel: 'multi'
                });
                logs.push(`30min reminder sent for ${m.client_name}`);
            }
        }
    }

    // ==========================================
    // C3. DAY-BEFORE (24 HOUR) REMINDERS
    // ==========================================
    if (settings['enable_day_before_reminder'] === 'true') {
        const tomorrowDateStr = format(addDays(now, 1), 'yyyy-MM-dd');
        
        // Fetch tomorrow's meetings (run this check once per day, e.g., at 9 AM)
        if (now.getHours() === 6 && now.getMinutes() < 15) { // 9 AM EAT / 6 AM UTC
            const { data: tomorrowMeetings, error: tomorrowError } = await supabase.from('bcl_meetings_meetings')
                .select('*')
                .eq('meeting_date', tomorrowDateStr)
                .order('meeting_start_time');

            if (tomorrowError) {
                console.error('Error fetching tomorrow meetings for day-before reminder:', tomorrowError);
            }

            for (const m of tomorrowMeetings || []) {
                // Check Log
                const { data: exists } = await supabase.from('bcl_meetings_reminder_logs')
                    .select('*').eq('meeting_id', m.id_main).eq('reminder_type', 'day_before');

                if (!exists?.length) {
                    const timeStr = m.meeting_start_time || 'TBD';
                    const phone = m.client_mobile || m.client_phone;
                    const venue = m.meeting_venue_area || m.venue || 'Online';
                    const tomorrowDay = format(addDays(now, 1), 'EEEE, dd MMMM yyyy');

                    // 1. Send to Client
                    if (phone) {
                        const cMsg = `📅 Hello *${m.client_name}*,\n\nThis is a reminder that you have an appointment *tomorrow* (${tomorrowDay}) at *${timeStr}*\n\n📍 Venue: ${venue}\n📋 Purpose: ${m.meeting_agenda || 'Meeting'}\n\nLooking forward to meeting you!`;
                        await wa.sendText(phone, cMsg);
                    }

                    // 2. Send to Admin Group
                    const groupId = await wa.getGroupId(settings['admin_whatsapp_group_code']);
                    if (groupId) {
                        const aMsg = `📅 *TOMORROW'S MEETING REMINDER*\n\n👤 ${m.client_name}\n🏢 ${m.client_company || 'N/A'}\n🕒 ${timeStr}\n📱 ${phone || 'N/A'}\n📋 ${m.meeting_agenda || 'N/A'}\n📍 ${venue}`;
                        await wa.sendText(groupId, aMsg, true);
                    }

                    // 3. Firebase notification
                    await firebase.sendMulticastNotification('Meeting Tomorrow', `Don't forget: Meeting with ${m.client_name} tomorrow at ${timeStr}`);

                    // Log
                    await supabase.from('bcl_meetings_reminder_logs').insert({
                        meeting_id: m.id_main,
                        reminder_type: 'day_before',
                        channel: 'multi'
                    });
                    logs.push(`Day-before reminder sent for ${m.client_name}`);
                }
            }
        }
    }

    // ==========================================
    // D. 5 MINUTE REMINDERS
    // ==========================================
    if (settings['enable_5min_reminder'] === 'true') {
        const todayDateStr = format(now, 'yyyy-MM-dd');
        const tomorrowDateStr = format(addDays(now, 1), 'yyyy-MM-dd');
        
        // Fetch today's and tomorrow's meetings
        const { data: allMeetings5m, error: meetings5mError } = await supabase.from('bcl_meetings_meetings')
            .select('*')
            .in('meeting_date', [todayDateStr, tomorrowDateStr]);

        if (meetings5mError) {
            console.error('Error fetching meetings for 5min reminder:', meetings5mError);
        }

        // Filter meetings that are 5 minutes away (with 5 min buffer)
        const upcoming5m = allMeetings5m?.filter((m: Meeting) => {
            if (!m.meeting_date || !m.meeting_start_time) return false;
            try {
                const meetingDateTime = parseISO(`${m.meeting_date}T${m.meeting_start_time}`);
                const timeDiff = meetingDateTime.getTime() - now.getTime();
                return timeDiff >= 0 && timeDiff <= 10 * 60 * 1000; // 0-10 min window
            } catch (e) {
                console.error('Error parsing meeting time:', e);
                return false;
            }
        }) || [];

        for (const m of upcoming5m) {
            // Check Log
            const { data: exists } = await supabase.from('bcl_meetings_reminder_logs')
                .select('*').eq('meeting_id', m.id_main).eq('reminder_type', '5_min');

            if (!exists?.length) {
                const phone = m.client_mobile || m.client_phone;
                
                // 1. Send to Client
                if (phone) {
                    const cMsg = `🚀 *STARTING SOON*\n\nHi ${m.client_name}, your appointment starts in *5 minutes*. Please be ready.\n\n📋 Purpose: ${m.meeting_agenda || 'Meeting'}`;
                    await wa.sendText(phone, cMsg);
                }

                // 2. Parallel Firebase
                await firebase.sendMulticastNotification('Meeting Starting Soon', `Meeting with ${m.client_name} starting in 5 minutes.`);

                // Log
                await supabase.from('bcl_meetings_reminder_logs').insert({
                    meeting_id: m.id_main,
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
