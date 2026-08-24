// @ts-nocheck
// ==========================================
// BOOKING CONFIRMATION NOTIFICATION (FIXED)
// ==========================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { format, parseISO, addHours } from 'https://esm.sh/date-fns@2.30.0'

// ==========================================
// TYPES
// ==========================================
interface BookingData {
    id_main?: number
    client_name: string
    client_company: string
    client_mobile: string
    client_email?: string
    meeting_date: string
    meeting_day: string
    meeting_start_time: string
    meeting_end_time: string
    meeting_duration: number
    meeting_type: string
    meeting_venue_area: string
    meeting_agenda: string
    bcl_attendee: string
    bcl_attendee_mobile: string
    venue_distance: number
    meeting_slot_start_time: string
    meeting_slot_end_time: string
    booking_date: string
    booking_day: string
}

interface Settings {
    [key: string]: string
}

// ==========================================
// CONSTANTS
// ==========================================
const TIMEZONE = 'Africa/Nairobi'; // EAT = UTC+3

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
            console.error('No invite code provided');
            return null;
        }
        
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const url = `${this.baseUrl}/group/inviteInfo/${this.instanceName}?inviteCode=${inviteCode}`;
                const res = await fetch(url, { 
                    headers: { 'apikey': this.apiKey },
                    signal: AbortSignal.timeout(10000) // 10s timeout
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data?.id) {
                        console.log('✅ Group ID fetched successfully:', data.id);
                        return data.id;
                    }
                }
                
                console.error(`❌ Failed to fetch Group ID (attempt ${attempt + 1}): ${res.status}`);
            } catch (e) {
                console.error(`❌ Error fetching Group ID (attempt ${attempt + 1}):`, e.message);
            }
            
            if (attempt < retries) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        console.error('❌ All retry attempts failed for fetching Group ID');
        return null;
    }

    formatPhoneNumber(phone: string): string | null {
        if (!phone) return null;
        
        // Remove all non-digit characters
        let cleaned = phone.replace(/\D/g, '');
        
        // Handle Kenyan numbers
        if (cleaned.startsWith('0')) {
            cleaned = '254' + cleaned.slice(1);
        } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
            cleaned = '254' + cleaned;
        } else if (!cleaned.startsWith('254')) {
            cleaned = '254' + cleaned;
        }
        
        // Validate: should be 254 + 9 digits = 12 digits total
        if (cleaned.length !== 12 || !cleaned.startsWith('254')) {
            console.error(`❌ Invalid phone number format: ${phone} -> ${cleaned}`);
            return null;
        }
        
        console.log(`✅ Formatted phone: ${phone} -> ${cleaned}`);
        return cleaned;
    }

    async sendText(to: string, text: string, isGroup = false, retries = 3) {
        if (!to) {
            console.error('❌ No recipient provided');
            return false;
        }
        
        let number = to;
        if (!isGroup) {
            const formatted = this.formatPhoneNumber(to);
            if (!formatted) {
                console.error(`❌ Invalid phone number, skipping: ${to}`);
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
                console.log(`📤 Sending WhatsApp to ${number} (attempt ${attempt + 1}/${retries + 1})...`);
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': this.apiKey
                    },
                    body: JSON.stringify(body),
                    signal: AbortSignal.timeout(15000) // 15s timeout
                });
                
                const responseText = await response.text();
                
                if (response.ok) {
                    console.log(`✅ WhatsApp sent successfully to ${number}`);
                    console.log(`Response: ${responseText}`);
                    return true;
                } else {
                    console.error(`❌ WhatsApp API error (attempt ${attempt + 1}): ${response.status}`);
                    console.error(`Response: ${responseText}`);
                }
            } catch (e) {
                console.error(`❌ Failed to send WhatsApp to ${number} (attempt ${attempt + 1}):`, e.message);
            }
            
            if (attempt < retries) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
                console.log(`⏳ Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        console.error(`❌ All ${retries + 1} retry attempts failed for ${number}`);
        return false;
    }
}

// ==========================================
// CORS HEADERS
// ==========================================
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ==========================================
// MAIN HANDLER
// ==========================================
serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log('='.repeat(60));
        console.log('🚀 BOOKING CONFIRMATION HANDLER STARTED');
        console.log('='.repeat(60));
        
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Parse request body
        const booking: BookingData = await req.json();
        console.log('📋 Booking data received:', JSON.stringify(booking, null, 2));

        // Load settings
        const { data: settingRows, error: settingsError } = await supabase
            .from('bcl_meetings_system_settings')
            .select('*');
        
        if (settingsError) {
            console.error('❌ Error loading settings:', settingsError);
            throw new Error('Failed to load settings');
        }
        
        const settings: Settings = {};
        settingRows?.forEach(r => settings[r.key] = r.value);
        console.log('⚙️ Settings loaded:', Object.keys(settings).length, 'keys');

        const wa = new WhatsAppService(settings);

        // Get current time in EAT
        const nowUTC = new Date();
        const nowEAT = addHours(nowUTC, 3); // EAT = UTC+3
        console.log(`🕐 Current time: ${format(nowEAT, 'yyyy-MM-dd HH:mm:ss')} EAT`);

        // Format meeting date nicely
        const meetingDateFormatted = booking.meeting_date ? 
            format(parseISO(booking.meeting_date), 'EEEE, dd MMMM yyyy') : 
            booking.meeting_date;

        // Build comprehensive confirmation message for admin
        let confirmMsg = `✅ *NEW MEETING SCHEDULED*\n\n`;
        confirmMsg += `📅 *MEETING DETAILS*\n`;
        confirmMsg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        // Client Information
        confirmMsg += `👤 *CLIENT INFORMATION*\n`;
        confirmMsg += `Name: ${booking.client_name}\n`;
        confirmMsg += `Company: ${booking.client_company}\n`;
        confirmMsg += `Mobile: ${booking.client_mobile}\n`;
        if (booking.client_email) {
            confirmMsg += `Email: ${booking.client_email}\n`;
        }
        confirmMsg += `\n`;
        
        // Meeting Schedule
        confirmMsg += `🕒 *SCHEDULE*\n`;
        confirmMsg += `Date: ${meetingDateFormatted}\n`;
        confirmMsg += `Day: ${booking.meeting_day}\n`;
        confirmMsg += `Time: ${booking.meeting_start_time} - ${booking.meeting_end_time}\n`;
        confirmMsg += `Duration: ${booking.meeting_duration} minutes\n`;
        confirmMsg += `\n`;
        
        // Meeting Details
        confirmMsg += `📋 *MEETING DETAILS*\n`;
        confirmMsg += `Type: ${booking.meeting_type === 'inPerson' ? 'In-Person' : 'Virtual'}\n`;
        confirmMsg += `Venue: ${booking.meeting_venue_area}\n`;
        confirmMsg += `Agenda: ${booking.meeting_agenda}\n`;
        confirmMsg += `\n`;
        
        // BCL Attendee
        confirmMsg += `🏢 *BCL ATTENDEE*\n`;
        confirmMsg += `Name: ${booking.bcl_attendee}\n`;
        confirmMsg += `Mobile: ${booking.bcl_attendee_mobile}\n`;
        confirmMsg += `\n`;
        
        // Logistics
        confirmMsg += `🚗 *LOGISTICS*\n`;
        confirmMsg += `Travel Time (Each Way): ${booking.venue_distance} minutes\n`;
        confirmMsg += `Calendar Slot: ${booking.meeting_slot_start_time} - ${booking.meeting_slot_end_time}\n`;
        confirmMsg += `\n`;
        
        // Booking Info
        confirmMsg += `📝 *BOOKING INFO*\n`;
        confirmMsg += `Booked On: ${booking.booking_date} (${booking.booking_day})\n`;
        if (booking.id_main) {
            confirmMsg += `Meeting ID: #${booking.id_main}\n`;
        }
        confirmMsg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        confirmMsg += `✨ Meeting has been added to the calendar!`;

        let adminSent = false;
        let clientSent = false;

        // Send to admin group
        console.log('\n📢 Sending to admin group...');
        const groupId = await wa.getGroupId(settings['admin_whatsapp_group_code']);
        if (groupId) {
            adminSent = await wa.sendText(groupId, confirmMsg, true);
            
            if (adminSent) {
                // Log the notification for admin
                await supabase.from('bcl_meetings_reminder_logs').insert({
                    meeting_id: booking.id_main || null,
                    reminder_type: 'booking_confirmation_admin',
                    recipient_group: 'admin_group',
                    channel: 'whatsapp',
                    sent_at: nowUTC.toISOString()
                });
                console.log('✅ Admin notification logged');
            }
        } else {
            console.error('❌ Failed to get admin group ID');
        }

        // Send to client
        if (booking.client_mobile) {
            console.log('\n📱 Sending to client...');
            
            let clientMsg = `Hello *${booking.client_name}*,\n\n`;
            clientMsg += `Your appointment with *BCL* has been successfully scheduled.\n\n`;
            clientMsg += `*Date:* ${meetingDateFormatted}\n`;
            clientMsg += `*Time:* ${booking.meeting_start_time}\n`;
            clientMsg += `*Venue:* ${booking.meeting_venue_area}\n`;
            clientMsg += `*Agenda:* ${booking.meeting_agenda}\n\n`;
            clientMsg += `We look forward to seeing you. If you need to reschedule, please let us know in advance.\n\n`;
            clientMsg += `Best regards,\n*Booksmart Consultancy Limited*`;

            clientSent = await wa.sendText(booking.client_mobile, clientMsg);
            
            if (clientSent) {
                // Log the notification for client
                await supabase.from('bcl_meetings_reminder_logs').insert({
                    meeting_id: booking.id_main || null,
                    reminder_type: 'booking_confirmation_client',
                    recipient_group: 'client',
                    channel: 'whatsapp',
                    sent_at: nowUTC.toISOString()
                });
                console.log('✅ Client notification logged');
            }
        } else {
            console.log('⚠️ No client mobile number provided, skipping client notification');
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 BOOKING CONFIRMATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Admin notification: ${adminSent ? '✅ Sent' : '❌ Failed'}`);
        console.log(`Client notification: ${clientSent ? '✅ Sent' : '❌ Failed or skipped'}`);
        console.log('='.repeat(60));

        return new Response(
            JSON.stringify({ 
                success: true, 
                message: 'Booking confirmations processed',
                results: {
                    admin_sent: adminSent,
                    client_sent: clientSent
                }
            }),
            { 
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200
            }
        );

    } catch (error) {
        console.error('❌ ERROR in booking confirmation:', error);
        console.error('Stack trace:', error.stack);
        
        return new Response(
            JSON.stringify({ 
                success: false, 
                error: error.message,
                stack: error.stack
            }),
            { 
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500
            }
        );
    }
})