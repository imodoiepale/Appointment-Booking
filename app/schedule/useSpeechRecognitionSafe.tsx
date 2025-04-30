/* eslint-disable react-hooks/rules-of-hooks */
// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from 'react';

// This is a wrapper to safely use speech recognition only in the browser
export default function useSpeechRecognitionSafe(options: { commands?: any[] } = {}) {
  // Default state that works on both server and client
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [browserSupportsSpeechRecognition, setBrowserSupportsSpeechRecognition] = useState(false);
  const [speechRecognitionModule, setSpeechRecognitionModule] = useState<any>(null);

  // Method to start listening
  const startListening = useCallback(async (options = { continuous: true }) => {
    if (!speechRecognitionModule) return;
    
    try {
      await speechRecognitionModule.startListening(options);
      setListening(true);
    } catch (error) {
      console.error("Error starting speech recognition:", error);
    }
  }, [speechRecognitionModule]);

  // Method to stop listening
  const stopListening = useCallback(async () => {
    if (!speechRecognitionModule) return;
    
    try {
      await speechRecognitionModule.stopListening();
      setListening(false);
    } catch (error) {
      console.error("Error stopping speech recognition:", error);
    }
  }, [speechRecognitionModule]);

  // Method to reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  // Load speech recognition module on mount (client-side only)
  useEffect(() => {
    let isMounted = true;

    const loadSpeechRecognition = async () => {
      try {
        // Dynamic import of react-speech-recognition (only happens in browser)
        const speechRecognitionLib = await import('react-speech-recognition');
        if (!isMounted) return;

        // Get the module components
        const SpeechRecognition = speechRecognitionLib.default;
        const useSpeechRecognition = speechRecognitionLib.useSpeechRecognition;

        // Store module for later use
        setSpeechRecognitionModule(SpeechRecognition);
        
        // Set up listener for transcript changes
        if (useSpeechRecognition) {
          // Initialize with provided commands
          const { transcript: hookTranscript, listening: hookListening, browserSupportsSpeechRecognition: hookSupport } = 
            useSpeechRecognition(options);
          
          // Update our state with values from hook
          setBrowserSupportsSpeechRecognition(hookSupport);
          
          // Set up interval to sync our state with the hook's state
          const intervalId = setInterval(() => {
            if (!isMounted) return;
            setTranscript(hookTranscript);
            setListening(hookListening);
          }, 100);
          
          return () => {
            clearInterval(intervalId);
          };
        }
      } catch (error) {
        console.error("Failed to load speech recognition:", error);
        if (isMounted) {
          setBrowserSupportsSpeechRecognition(false);
        }
      }
    };

    loadSpeechRecognition();

    return () => {
      isMounted = false;
    };
  }, [options]);

  return {
    transcript,
    listening,
    browserSupportsSpeechRecognition,
    startListening,
    stopListening,
    resetTranscript
  };
}
