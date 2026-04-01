// @ts-nocheck
// ==========================================
// MEETING REMINDERS CRON (FIXED FOR EAT/NAIROBI)
// ==========================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { format, addDays, startOfDay, endOfDay, startOfWeek, endOfWeek, parseISO, addMinutes, addHours } from 'https://esm.sh/date-fns@2.30.0'

// ==========================================
// CONFIGURATION & TYPES
// ==========================================
const EAT_OFFSET_HOURS = 3; // EAT = UTC+3

// Helper functions for timezone conversion
function toEAT(utcDate: Date): Date {
    return addHours(utcDate, EAT_OFFSET_HOURS);
}

function toUTC(eatDate: Date): Date {
    return addHours(eatDate, -EAT_OFFSET_HOURS);
}

function formatEAT(utcDate: Date, formatStr: string): string {
    const eatDate = toEAT(utcDate);
    return format(eatDate, formatStr);
}

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
// WHATSAPP SERVICE
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

    async getGroupId(inviteCode: string, retries = 3): Promise<string | null> {
        if (!inviteCode) {
            console.error('❌ No invite code provided');
            return null;
        }
        
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const url = `${this.baseUrl}/group/inviteInfo/${this.instanceName}?inviteCode=${inviteCode}`;
                const res = await fetch(url, { 
                    headers: { 'apikey': this.apiKey },
                    signal: AbortSignal.timeout(10000)
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data?.id) {
                        console.log('✅ Group ID fetched:', data.id);
                        return data.id;
                    }
                }
                
                console.error(`❌ Failed to fetch Group ID (attempt ${attempt + 1}): ${res.status}`);
            } catch (e) {
                console.error(`❌ Error fetching Group ID (attempt ${attempt + 1}):`, e.message);
            }
            
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
        }
        
        return null;
    }

    formatPhoneNumber(phone: string): string | null {
        if (!phone) return null;
        
        let cleaned = phone.replace(/\D/g, '');
        
        if (cleaned.startsWith('0')) {
            cleaned = '254' + cleaned.slice(1);
        } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
            cleaned = '254' + cleaned;
        } else if (!cleaned.startsWith('254')) {
            cleaned = '254' + cleaned;
        }
        
        if (cleaned.length !== 12 || !cleaned.startsWith('254')) {
            console.error(`❌ Invalid phone: ${phone} -> ${cleaned}`);
            return null;
        }
        
        return cleaned;
    }

    async sendText(to: string, text: string, isGroup = false, retries = 3) {
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
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': this.apiKey
                    },
                    body: JSON.stringify(body),
                    signal: AbortSignal.timeout(15000)
                });
                
                if (response.ok) {
                    console.log(`✅ WhatsApp sent to ${number}`);
                    return true;
                }
                console.error(`❌ API error (${attempt + 1}): ${response.status}`);
            } catch (e) {
                console.error(`❌ Send failed (${attempt + 1}):`, e.message);
            }
            
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
        }
        
        return false;
    }
}

// ==========================================
// FIREBASE SERVICE
// ==========================================
class FirebaseService {
    private serverKey: string;

    constructor(serverKey: string) {
        this.serverKey = serverKey;
    }

    async sendMulticastNotification(title: string, body: string, data?: { [key: string]: string }) {
        if (!this.serverKey) {
            console.log('⚠️ Firebase Server Key missing, skipping FCM');
            return;
        }

        try {
            const url = 'https://fcm.googleapis.com/fcm/send';
            const payload = {
                to: '/topics/all_devices',
                notification: {
                    title,
                    body,
                    sound: 'default',
                    icon: '/android/android-launchericon-192-192.png',
                    click_action: 'FLUTTER_NOTIFICATION_CLICK'
                },
                data: { url: '/schedule', ...data }
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `key=${this.serverKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                console.log('✅ Firebase notification sent');
            } else {
                console.error('❌ Firebase error:', response.status);
            }
        } catch (e) {
            console.error('❌ Firebase error:', e.message);
        }
    }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function getMeetingDateTime(meeting: Meeting, eatNow: Date): Date | null {
    if (!meeting.meeting_date || !meeting.meeting_start_time) {
        console.error(`❌ Missing date/time for meeting ${meeting.id_main}`);
        return null;
    }
    
    try {
        // Parse the meeting date and time as if it's in EAT
        // meeting_date is like "2025-01-28", meeting_start_time is like "14:30:00"
        const dateTimeStr = `${meeting.meeting_date}T${meeting.meeting_start_time}`;
        const meetingEAT = parseISO(dateTimeStr);
        
        // Convert EAT to UTC by subtracting 3 hours
        const meetingUTC = toUTC(meetingEAT);
        
        console.log(`📅 Meeting ${meeting.id_main}: ${dateTimeStr} EAT = ${meetingUTC.toISOString()} UTC`);
        return meetingUTC;
    } catch (e) {
        console.error(`❌ Error parsing time for meeting ${meeting.id_main}:`, e.message);
        return null;
    }
}

function getMinutesDifference(meetingUTC: Date, nowUTC: Date): number {
    return Math.floor((meetingUTC.getTime() - nowUTC.getTime()) / (60 * 1000));
}

// ==========================================
// MAIN LOGIC HANDLER
// ==========================================
serve(async (req) => {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 MEETING REMINDERS CRON JOB STARTED');
    console.log('='.repeat(80));
    
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current time in both UTC and EAT
    const nowUTC = new Date();
    const nowEAT = toEAT(nowUTC);
    const eatTimeStr = formatEAT(nowUTC, 'yyyy-MM-dd HH:mm:ss');
    
    console.log(`🕐 UTC Time: ${nowUTC.toISOString()}`);
    console.log(`🕐 EAT Time: ${eatTimeStr} EAT`);
    console.log(`📅 EAT Date: ${format(nowEAT, 'yyyy-MM-dd')}`);
    console.log(`🕒 EAT Hour: ${nowEAT.getHours()}, Minute: ${nowEAT.getMinutes()}`);

    // 1. LOAD SETTINGS
    const { data: settingRows } = await supabase.from('bcl_meetings_system_settings').select('*');
    const settings: Settings = {};
    settingRows?.forEach(r => settings[r.key] = r.value);
    console.log(`⚙️ Settings loaded: ${Object.keys(settings).length} keys`);

    const wa = new WhatsAppService(settings);
    const firebase = new FirebaseService(Deno.env.get('FIREBASE_SERVER_KEY') || '');

    const logs: string[] = [];

    // ==========================================
    // MORNING REPORT (6:00 AM EAT) - Enhanced with all pending meetings
    // ==========================================
    if (nowEAT.getHours() === 6 && nowEAT.getMinutes() < 15 && settings['enable_morning_report'] === 'true') {
        console.log('\n📋 Generating morning report...');
        
        const todayStartEAT = startOfDay(nowEAT);
        const todayStartUTC = toUTC(todayStartEAT);
        const todayDateStr = format(nowEAT, 'yyyy-MM-dd');

        const { data: sent } = await supabase.from('bcl_meetings_reminder_logs')
            .select('*')
            .eq('reminder_type', 'morning_report')
            .gte('sent_at', todayStartUTC.toISOString());

        if (!sent?.length) {
            // Get today's meetings
            const { data: todaysMeetings } = await supabase.from('bcl_meetings_meetings')
                .select('*')
                .eq('meeting_date', todayDateStr)
                .order('meeting_start_time');

            // Get ALL pending meetings (today and future)
            const { data: allPendingMeetings } = await supabase.from('bcl_meetings_meetings')
                .select('*')
                .gte('meeting_date', todayDateStr)
                .order('meeting_date, meeting_start_time');

            // Get tomorrow's count
            const tomorrowDateStr = format(addDays(nowEAT, 1), 'yyyy-MM-dd');
            const { data: tomMeetings } = await supabase.from('bcl_meetings_meetings')
                .select('*')
                .eq('meeting_date', tomorrowDateStr);

            // BUILD ENHANCED MESSAGE
            let msg = `🌅 *GOOD MORNING*\n`;
            msg += `📅 *${format(nowEAT, 'EEEE, dd MMMM yyyy')}*\n`;
            msg += `🕐 ${formatEAT(nowUTC, 'HH:mm')} EAT\n\n`;

            // TODAY'S SCHEDULE
            msg += `📌 *TODAY'S SCHEDULE:*\n`;
            if (!todaysMeetings?.length) {
                msg += `No meetings scheduled for today.\n`;
            } else {
                todaysMeetings.forEach((m: Meeting) => {
                    const company = m.client_company ? ` (${m.client_company})` : '';
                    msg += `🕒 ${m.meeting_start_time || 'TBD'} - *${m.client_name}*${company}\n`;
                    if (m.meeting_agenda) msg += `   📋 ${m.meeting_agenda}\n`;
                    if (m.meeting_venue_area) msg += `   📍 ${m.meeting_venue_area}\n`;
                });
            }

            // QUICK STATS
            msg += `\n📊 *QUICK STATS:*\n`;
            msg += `• Tomorrow: ${tomMeetings?.length || 0} meeting(s)\n`;
            msg += `• Total Pending: ${allPendingMeetings?.length || 0} meeting(s)\n`;

            // ALL PENDING MEETINGS (grouped by date)
            if (allPendingMeetings && allPendingMeetings.length > 0) {
                msg += `\n📋 *ALL PENDING MEETINGS:*\n`;
                
                // Group meetings by date
                const groupedByDate = allPendingMeetings.reduce((acc: any, m: Meeting) => {
                    if (!acc[m.meeting_date]) acc[m.meeting_date] = [];
                    acc[m.meeting_date].push(m);
                    return acc;
                }, {});
                
                // Display grouped meetings
                Object.keys(groupedByDate).sort().forEach(date => {
                    const dateObj = parseISO(date);
                    const dayLabel = format(dateObj, 'EEE, MMM dd');
                    const isToday = date === todayDateStr;
                    const isTomorrow = date === tomorrowDateStr;
                    
                    let dateLabel = dayLabel;
                    if (isToday) dateLabel = `Today (${dayLabel})`;
                    else if (isTomorrow) dateLabel = `Tomorrow (${dayLabel})`;
                    
                    msg += `\n*${dateLabel}:* ${groupedByDate[date].length} meeting(s)\n`;
                    groupedByDate[date].forEach((m: Meeting) => {
                        const time = m.meeting_start_time || 'TBD';
                        const company = m.client_company ? ` - ${m.client_company}` : '';
                        msg += `  • ${time} - ${m.client_name}${company}\n`;
                    });
                });
            } else {
                msg += `\n📋 *ALL PENDING MEETINGS:*\n`;
                msg += `No pending meetings scheduled.\n`;
            }

            msg += `\n✅ System running smoothly!`;
            msg += `\nHave a productive day! 💼`;

            const groupId = await wa.getGroupId(settings['admin_whatsapp_group_code']);
            if (groupId && await wa.sendText(groupId, msg, true)) {
                await supabase.from('bcl_meetings_reminder_logs').insert({
                    reminder_type: 'morning_report',
                    recipient_group: 'admin_group',
                    channel: 'whatsapp'
                });
                logs.push('✅ Morning report sent');
            }
        }
    }

    // ==========================================
    // WEEKLY REPORT (Friday 6:00 PM EAT)
    // ==========================================
    if (nowEAT.getDay() === 5 && nowEAT.getHours() === 18 && nowEAT.getMinutes() < 15 && 
        settings['enable_weekly_report'] === 'true') {
        console.log('\n📊 Checking weekly report...');
        
        const weekStartDate = startOfWeek(nowEAT, { weekStartsOn: 1 });
        const weekEndDate = endOfWeek(nowEAT, { weekStartsOn: 1 });
        const weekDates = [];
        for (let d = new Date(weekStartDate); d <= weekEndDate; d.setDate(d.getDate() + 1)) {
            weekDates.push(format(d, 'yyyy-MM-dd'));
        }

        const { data: sentWeek } = await supabase.from('bcl_meetings_reminder_logs')
            .select('*')
            .eq('reminder_type', 'weekly_report')
            .gte('sent_at', startOfDay(nowEAT).toISOString());

        if (!sentWeek?.length) {
            const { data: weekMeetings } = await supabase.from('bcl_meetings_meetings')
                .select('*')
                .in('meeting_date', weekDates)
                .order('meeting_date, meeting_start_time');

            let wMsg = `📅 *WEEK IN REVIEW*\n`;
            wMsg += `Week of ${format(weekStartDate, 'MMM dd')} - ${format(weekEndDate, 'MMM dd')}\n\n`;
            wMsg += `📊 *SUMMARY:*\nTotal Meetings: ${weekMeetings?.length || 0}\n\n`;
            wMsg += `📝 *DETAILS:*\n`;

            weekMeetings?.forEach((m: Meeting) => {
                const day = format(parseISO(m.meeting_date), 'EEE');
                wMsg += `• ${day}: ${m.client_name} - ${m.client_company || 'N/A'}\n`;
            });

            const groupId = await wa.getGroupId(settings['admin_whatsapp_group_code']);
            if (groupId && await wa.sendText(groupId, wMsg, true)) {
                await supabase.from('bcl_meetings_reminder_logs').insert({
                    reminder_type: 'weekly_report',
                    recipient_group: 'admin_group',
                    channel: 'whatsapp'
                });
                logs.push('✅ Weekly report sent');
            }
        }
    }

    // ==========================================
    // TIME-BASED REMINDERS (DAY BEFORE, 1HR, 30MIN, 5MIN)
    // ==========================================
    const todayDateStr = format(nowEAT, 'yyyy-MM-dd');
    const tomorrowDateStr = format(addDays(nowEAT, 1), 'yyyy-MM-dd');
    
    // Fetch meetings for today and tomorrow
    const { data: allMeetings } = await supabase.from('bcl_meetings_meetings')
        .select('*')
        .in('meeting_date', [todayDateStr, tomorrowDateStr]);
    
    console.log(`\n📅 Found ${allMeetings?.length || 0} meetings for today/tomorrow`);

    // ==========================================
    // DAY-BEFORE REMINDER (9:00 AM EAT, for tomorrow's meetings)
    // ==========================================
    if (nowEAT.getHours() === 9 && nowEAT.getMinutes() < 15 && settings['enable_day_before_reminder'] === 'true') {
        console.log('\n📅 Processing day-before reminders...');
        
        const tomorrowMeetings = allMeetings?.filter(m => m.meeting_date === tomorrowDateStr) || [];
        console.log(`Found ${tomorrowMeetings.length} meetings tomorrow`);

        for (const m of tomorrowMeetings) {
            const { data: exists } = await supabase.from('bcl_meetings_reminder_logs')
                .select('*')
                .eq('meeting_id', m.id_main)
                .eq('reminder_type', 'day_before');

            if (!exists?.length) {
                const phone = m.client_mobile || m.client_phone;
                const venue = m.meeting_venue_area || m.venue || 'TBD';
                const tomorrowDay = format(addDays(nowEAT, 1), 'EEEE, dd MMMM yyyy');

                // Client message
                if (phone) {
                    const cMsg = `📅 Hello *${m.client_name}*,\n\nReminder: You have an appointment *tomorrow* (${tomorrowDay}) at *${m.meeting_start_time || 'TBD'}*\n\n📍 Venue: ${venue}\n📋 Purpose: ${m.meeting_agenda || 'Meeting'}\n\nLooking forward to meeting you!\n\nBest regards,\n*BCL*`;
                    await wa.sendText(phone, cMsg);
                }

                // Admin message
                const groupId = await wa.getGroupId(settings['admin_whatsapp_group_code']);
                if (groupId) {
                    const aMsg = `📅 *TOMORROW'S MEETING*\n\n👤 ${m.client_name}\n🏢 ${m.client_company || 'N/A'}\n🕒 ${m.meeting_start_time || 'TBD'}\n📱 ${phone || 'N/A'}\n📋 ${m.meeting_agenda || 'N/A'}\n📍 ${venue}`;
                    await wa.sendText(groupId, aMsg, true);
                }

                await firebase.sendMulticastNotification('Meeting Tomorrow', `${m.client_name} - ${m.meeting_start_time || 'TBD'}`);

                await supabase.from('bcl_meetings_reminder_logs').insert({
                    meeting_id: m.id_main,
                    reminder_type: 'day_before',
                    channel: 'multi'
                });
                logs.push(`✅ Day-before: ${m.client_name}`);
            }
        }
    }

    // ==========================================
    // 1 HOUR REMINDER
    // ==========================================
    if (settings['enable_1hr_reminder'] === 'true') {
        console.log('\n⏰ Processing 1-hour reminders...');
        
        for (const m of allMeetings || []) {
            const meetingUTC = getMeetingDateTime(m, nowEAT);
            if (!meetingUTC) continue;
            
            const minutesDiff = getMinutesDifference(meetingUTC, nowUTC);
            console.log(`Meeting ${m.id_main}: ${minutesDiff} minutes away`);
            
            // 55-65 minute window
            if (minutesDiff >= 55 && minutesDiff <= 65) {
                const { data: exists } = await supabase.from('bcl_meetings_reminder_logs')
                    .select('*')
                    .eq('meeting_id', m.id_main)
                    .eq('reminder_type', '1_hour');

                if (!exists?.length) {
                    const phone = m.client_mobile || m.client_phone;
                    const venue = m.meeting_venue_area || m.venue || 'TBD';

                    if (phone) {
                        const cMsg = `⏰ Hello *${m.client_name}*,\n\nYour appointment is in *1 HOUR* at *${m.meeting_start_time || 'TBD'}*\n\n📍 Venue: ${venue}\n📋 Purpose: ${m.meeting_agenda || 'Meeting'}\n\nSee you soon!`;
                        await wa.sendText(phone, cMsg);
                    }

                    const groupId = await wa.getGroupId(settings['admin_whatsapp_group_code']);
                    if (groupId) {
                        const aMsg = `⏰ *MEETING IN 1 HOUR*\n\n👤 ${m.client_name}\n🏢 ${m.client_company || 'N/A'}\n🕒 ${m.meeting_start_time || 'TBD'}\n📱 ${phone || 'N/A'}\n📋 ${m.meeting_agenda || 'N/A'}`;
                        await wa.sendText(groupId, aMsg, true);
                    }

                    await firebase.sendMulticastNotification('Meeting in 1 Hour', `${m.client_name} at ${m.meeting_start_time || 'TBD'}`);

                    await supabase.from('bcl_meetings_reminder_logs').insert({
                        meeting_id: m.id_main,
                        reminder_type: '1_hour',
                        channel: 'multi'
                    });
                    logs.push(`✅ 1-hour: ${m.client_name}`);
                }
            }
        }
    }

    // ==========================================
    // 30 MINUTE REMINDER
    // ==========================================
    if (settings['enable_30min_reminder'] === 'true') {
        console.log('\n⏰ Processing 30-minute reminders...');
        
        for (const m of allMeetings || []) {
            const meetingUTC = getMeetingDateTime(m, nowEAT);
            if (!meetingUTC) continue;
            
            const minutesDiff = getMinutesDifference(meetingUTC, nowUTC);
            
            // 25-35 minute window
            if (minutesDiff >= 25 && minutesDiff <= 35) {
                const { data: exists } = await supabase.from('bcl_meetings_reminder_logs')
                    .select('*')
                    .eq('meeting_id', m.id_main)
                    .eq('reminder_type', '30_min');

                if (!exists?.length) {
                    const phone = m.client_mobile || m.client_phone;
                    const venue = m.meeting_venue_area || m.venue || 'TBD';

                    if (phone) {
                        const cMsg = `⏰ Hi *${m.client_name}*,\n\nYour appointment is in *30 MINUTES* at *${m.meeting_start_time || 'TBD'}*\n\n📍 Venue: ${venue}\n📋 Purpose: ${m.meeting_agenda || 'Meeting'}\n\nPlease start preparing!`;
                        await wa.sendText(phone, cMsg);
                    }

                    const groupId = await wa.getGroupId(settings['admin_whatsapp_group_code']);
                    if (groupId) {
                        const aMsg = `⏰ *MEETING IN 30 MINUTES*\n\n👤 ${m.client_name}\n🏢 ${m.client_company || 'N/A'}\n🕒 ${m.meeting_start_time || 'TBD'}\n📱 ${phone || 'N/A'}\n📋 ${m.meeting_agenda || 'N/A'}`;
                        await wa.sendText(groupId, aMsg, true);
                    }

                    await firebase.sendMulticastNotification('Meeting in 30 Minutes', `${m.client_name} starts soon`);

                    await supabase.from('bcl_meetings_reminder_logs').insert({
                        meeting_id: m.id_main,
                        reminder_type: '30_min',
                        channel: 'multi'
                    });
                    logs.push(`✅ 30-min: ${m.client_name}`);
                }
            }
        }
    }

    // ==========================================
    // 5 MINUTE REMINDER
    // ==========================================
    if (settings['enable_5min_reminder'] === 'true') {
        console.log('\n⏰ Processing 5-minute reminders...');
        
        for (const m of allMeetings || []) {
            const meetingUTC = getMeetingDateTime(m, nowEAT);
            if (!meetingUTC) continue;
            
            const minutesDiff = getMinutesDifference(meetingUTC, nowUTC);
            
            // 0-10 minute window
            if (minutesDiff >= 0 && minutesDiff <= 10) {
                const { data: exists } = await supabase.from('bcl_meetings_reminder_logs')
                    .select('*')
                    .eq('meeting_id', m.id_main)
                    .eq('reminder_type', '5_min');

                if (!exists?.length) {
                    const phone = m.client_mobile || m.client_phone;

                    if (phone) {
                        const cMsg = `🚀 *STARTING NOW*\n\nHi ${m.client_name}, your appointment is starting!\n\n📋 ${m.meeting_agenda || 'Meeting'}`;
                        await wa.sendText(phone, cMsg);
                    }

                    await firebase.sendMulticastNotification('Meeting Starting Now', `${m.client_name}`);

                    await supabase.from('bcl_meetings_reminder_logs').insert({
                        meeting_id: m.id_main,
                        reminder_type: '5_min',
                        channel: 'multi'
                    });
                    logs.push(`✅ 5-min: ${m.client_name}`);
                }
            }
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 EXECUTION SUMMARY');
    console.log('='.repeat(80));
    logs.forEach(log => console.log(log));
    console.log('='.repeat(80));

    return new Response(JSON.stringify({ 
        success: true, 
        timestamp: eatTimeStr,
        logs 
    }), {
        headers: { "Content-Type": "application/json" },
    });
})