"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { 
  initPushNotifications, 
  scheduleAllMeetingNotifications, 
  checkDueNotifications 
} from '@/utils/notificationService';

// Define notification types
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  timestamp: Date;
  meetingId?: number;
  // Optional link to navigate when clicking the notification
  link?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
  requestNotificationPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Supabase client setup
const supabaseUrl = 'https://zyszsqgdlrpnunkegipk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5c3pzcWdkbHJwbnVua2VnaXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDgzMjc4OTQsImV4cCI6MjAyMzkwMzg5NH0.fK_zR8wR6Lg8HeK7KBTTnyF0zoyYBqjkeWeTKqi32ws';
const supabase = createClient(supabaseUrl, supabaseKey);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState<boolean>(false);
  const { toast } = useToast();

  // Calculate unread count
  const unreadCount = notifications.filter(notif => !notif.read).length;

  // Function to request notification permission
  const requestNotificationPermission = async () => {
    try {
      const initialized = await initPushNotifications();
      setPushNotificationsEnabled(initialized);
      return initialized;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  // Add a new notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Show a toast for new notifications
    toast({
      title: notification.title,
      description: notification.message,
      variant: notification.type === 'error' ? 'destructive' : 'default',
    });
  }, [toast]);

  // Mark a notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  // Remove a specific notification
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Initialize push notifications and check permissions on mount
  useEffect(() => {
    const initNotifications = async () => {
      // Check if we're in a browser environment and if notifications are supported
      if (typeof window !== 'undefined' && 'Notification' in window) {
        // Check if permission is already granted
        if (Notification.permission === 'granted') {
          setPushNotificationsEnabled(true);
          
          // Set up a regular check for due notifications
          const checkInterval = setInterval(() => {
            checkDueNotifications().catch(err => 
              console.error('Error checking due notifications:', err)
            );
          }, 60000); // Check every minute
          
          return () => clearInterval(checkInterval);
        } 
        // Auto-request permission if not denied
        else if (Notification.permission !== 'denied') {
          await requestNotificationPermission();
        }
      }
    };
    
    initNotifications();
  }, []);

  // Set up real-time listener for meeting changes and schedule push notifications
  useEffect(() => {
    const meetingsSubscription = supabase
      .channel('meetings-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'meetings' }, 
        payload => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          // Handle different types of changes
          if (eventType === 'INSERT') {
            addNotification({
              title: 'New Meeting Scheduled',
              message: `New meeting with ${newRecord.client_name} on ${new Date(newRecord.meeting_date).toLocaleDateString()}`,
              type: 'info',
              meetingId: newRecord.id_main,
              link: '/schedule' // Link to schedule page
            });
            
            // Schedule push notifications for this new meeting
            if (pushNotificationsEnabled) {
              scheduleAllMeetingNotifications(newRecord).catch(err => 
                console.error('Error scheduling meeting notifications:', err)
              );
            }
          } 
          else if (eventType === 'UPDATE') {
            // Status changed to canceled
            if (newRecord.status === 'canceled' && oldRecord.status !== 'canceled') {
              addNotification({
                title: 'Meeting Canceled',
                message: `Meeting with ${newRecord.client_name} on ${new Date(newRecord.meeting_date).toLocaleDateString()} has been canceled.`,
                type: 'warning',
                meetingId: newRecord.id_main,
                link: '/schedule'
              });
            }
            // Status changed to completed
            else if (newRecord.status === 'completed' && oldRecord.status !== 'completed') {
              addNotification({
                title: 'Meeting Completed',
                message: `Meeting with ${newRecord.client_name} has been marked as completed.`,
                type: 'success',
                meetingId: newRecord.id_main,
                link: '/schedule'
              });
            }
            // Meeting rescheduled
            else if (newRecord.status === 'rescheduled' || 
                    (newRecord.meeting_date !== oldRecord.meeting_date || 
                     newRecord.meeting_start_time !== oldRecord.meeting_start_time)) {
              addNotification({
                title: 'Meeting Rescheduled',
                message: `Meeting with ${newRecord.client_name} has been rescheduled to ${new Date(newRecord.meeting_date).toLocaleDateString()} at ${newRecord.meeting_start_time}.`,
                type: 'info',
                meetingId: newRecord.id_main,
                link: '/schedule'
              });
              
              // Re-schedule push notifications for this updated meeting
              if (pushNotificationsEnabled) {
                scheduleAllMeetingNotifications(newRecord).catch(err => 
                  console.error('Error rescheduling meeting notifications:', err)
                );
              }
            }
            // Badge status changed to Confirmed
            else if (newRecord.badge_status === 'Confirmed' && oldRecord.badge_status !== 'Confirmed') {
              addNotification({
                title: 'Meeting Confirmed',
                message: `Meeting with ${newRecord.client_name} on ${new Date(newRecord.meeting_date).toLocaleDateString()} has been confirmed.`,
                type: 'success',
                meetingId: newRecord.id_main,
                link: '/schedule'
              });
            }
          }
        }
      )
      .subscribe();

    // Add meeting reminder notifications based on today's meetings and schedule push notifications
    const checkUpcomingMeetings = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      try {
        const { data, error } = await supabase
          .from('meetings')
          .select('*')
          .eq('meeting_date', today)
          .in('status', ['upcoming', 'rescheduled']);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          data.forEach(meeting => {
            const meetingTime = new Date(`${meeting.meeting_date}T${meeting.meeting_start_time}`);
            const now = new Date();
            const minutesUntilMeeting = Math.floor((meetingTime.getTime() - now.getTime()) / (1000 * 60));
            
            // Only create reminder for meetings happening within the next 60 minutes
            if (minutesUntilMeeting > 0 && minutesUntilMeeting <= 60) {
              addNotification({
                title: 'Upcoming Meeting Reminder',
                message: `You have a meeting with ${meeting.client_name} in ${minutesUntilMeeting} minutes.`,
                type: 'info',
                meetingId: meeting.id_main,
                link: '/schedule'
              });
            }
            
            // Schedule push notifications for upcoming meetings (if not already scheduled)
            if (pushNotificationsEnabled) {
              scheduleAllMeetingNotifications(meeting).catch(err => 
                console.error('Error scheduling meeting notifications:', err)
              );
            }
          });
        }
      } catch (error) {
        console.error('Error checking upcoming meetings:', error);
      }
    };
    
    // Check for upcoming meetings when the component mounts
    checkUpcomingMeetings();
    
    // Set up interval to check for upcoming meetings every 5 minutes
    const reminderInterval = setInterval(checkUpcomingMeetings, 5 * 60 * 1000);
    
    // Clean up subscriptions on unmount
    return () => {
      supabase.removeChannel(meetingsSubscription);
      clearInterval(reminderInterval);
    };
  }, [addNotification, pushNotificationsEnabled]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        removeNotification,
        requestNotificationPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
