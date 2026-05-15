import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type VoiceState = "idle" | "listening";

interface UseVoiceRecorderProps {
  onFinalTranscript: (text: string) => void;
}

interface UseVoiceRecorderReturn {
  voiceState: VoiceState;
  interimText: string;
  voiceError: string | null;
  isVoiceSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
}

const getRecognitionConstructor = (): (new () => SpeechRecognitionInstance) | null => {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export function useVoiceRecorder({
  onFinalTranscript,
}: UseVoiceRecorderProps): UseVoiceRecorderReturn {
  const { t, i18n } = useTranslation();
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [interimText, setInterimText] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isVoiceSupported = !!getRecognitionConstructor();

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setVoiceState("idle");
    setInterimText("");
  }, []);

  const startListening = useCallback(() => {
    const Constructor = getRecognitionConstructor();
    if (!Constructor) return;

    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    setVoiceError(null);
    setInterimText("");

    const recognition = new Constructor();
    recognition.lang = i18n.language ?? "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalAccumulated = "";

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalAccumulated += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceError(t("chat.voice.permissionDenied"));
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        setVoiceError(t("chat.voice.error"));
      }
      recognitionRef.current = null;
      setVoiceState("idle");
      setInterimText("");
    };

    recognition.onend = () => {
      if (finalAccumulated.trim()) {
        onFinalTranscript(finalAccumulated.trim());
      }
      recognitionRef.current = null;
      setVoiceState("idle");
      setInterimText("");
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setVoiceState("listening");
    } catch {
      recognitionRef.current = null;
      setVoiceError(t("chat.voice.error"));
    }
  }, [i18n.language, onFinalTranscript, t]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (voiceError) {
      const timer = setTimeout(() => setVoiceError(null), 100);
      return () => clearTimeout(timer);
    }
  }, [voiceError]);

  return {
    voiceState,
    interimText,
    voiceError,
    isVoiceSupported,
    startListening,
    stopListening,
  };
}
