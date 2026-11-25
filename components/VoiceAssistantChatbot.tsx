'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  X,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Square,
  Bot,
  Radio,
} from 'lucide-react';
import { StrawSyncStore } from '../lib/store';
import { useLanguage } from '../lib/i18n';
import type { ExecutionReceipt, PendingAssistantAction } from '../lib/assistant-nlu';
import type { UserProfile, UserRole } from '../types';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  receipt?: ExecutionReceipt | null;
}

function renderFormattedText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="px-1 py-0.5 rounded bg-sand text-[11px] font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function getQuickPrompts(role: UserRole | undefined, lang: 'en' | 'hi'): string[] {
  if (lang === 'hi') {
    if (role === 'farmer') {
      return [
        'Meri 45 quintal gehun ki bhusi 1650 rupaye quintal mein Ghaziabad se list karni hai',
        'Mera pending buyer order accept kar do',
        'Mera UPI ID himanshu@okaxis save kar do',
        'Payment kaise milti hai aur GPS tracking kaise kaam karti hai?',
      ];
    }
    if (role === 'buyer') {
      return [
        '20 tonne parali kharidni hai',
        'Mera pending escrow payment settle kar do',
        'Mera order kahan pahuncha hai?',
        'Payment kaise milti hai aur GPS tracking kaise kaam karti hai?',
      ];
    }
    if (role === 'logistics') {
      return [
        'Active order ka live GPS +25% update kar do',
        'Active shipment delivered mark kar do',
        'Logistics dashboard dikhao',
        'GPS tracking kaise kaam karti hai?',
      ];
    }
    return [
      'Payment kaise milti hai aur GPS tracking kaise kaam karti hai?',
      '5 bigha parali ki upaj aur kamai calculate karo',
      'StrawSync ke sabhi features samjhao',
      'Kitni active listings hain?',
    ];
  }

  if (role === 'farmer') {
    return [
      'List 45 quintal wheat straw at 1650 rupees per quintal in Ghaziabad',
      'Accept my pending buyer order',
      'Save my UPI ID himanshu@okaxis',
      'How do Escrow payouts and GPS tracking work?',
    ];
  }
  if (role === 'buyer') {
    return [
      'Buy 20 tonnes of paddy straw',
      'Settle my pending Escrow payment',
      'Where is my latest order?',
      'Open Buyer Marketplace',
    ];
  }
  if (role === 'logistics') {
    return [
      'Update live GPS +25% on active order',
      'Mark active shipment delivered',
      'Open Logistics Dashboard',
      'How does GPS tracking work?',
    ];
  }
  return [
    'How do Escrow payouts and GPS tracking work?',
    'Calculate yield for 5 bigha paddy straw',
    'How many active listings are available?',
    'Explain StrawSync units (Kg, Quintal, Bigha)',
  ];
}

export default function VoiceAssistantChatbot() {
  const router = useRouter();
  const { lang } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Namaste! Main aapka **Kisan AI Copilot** hoon. Aap Hindi ya English mein bolkar fasal list kar sakte hain, order accept kar sakte hain, UPI save kar sakte hain, ya hisaab laga sakte hain.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAssistantAction | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [micError, setMicError] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [autoMic, setAutoMic] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'groq' | 'openai' | 'built-in' | null>(null);

  const isExecutingRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const mountedRef = useRef(true);
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const micSubmittedRef = useRef(false);
  const micHadErrorRef = useRef(false);
  const manualStopRef = useRef(false);
  const listenStartedAtRef = useRef(0);
  const autoListenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const lastInputWasVoiceRef = useRef(false);
  const isOpenRef = useRef(isOpen);
  const autoMicRef = useRef(autoMic);
  const isMutedRef = useRef(isMuted);
  const pendingRef = useRef<PendingAssistantAction | null>(pendingAction);
  const langRef = useRef(lang);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);
  useEffect(() => {
    autoMicRef.current = autoMic;
  }, [autoMic]);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);
  useEffect(() => {
    pendingRef.current = pendingAction;
  }, [pendingAction]);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    const syncUser = () => {
      const nextUser = StrawSyncStore.getCurrentUser();
      const nextId = nextUser?.id ?? null;
      if (lastUserIdRef.current !== null && lastUserIdRef.current !== nextId) {
        setPendingAction(null);
      }
      lastUserIdRef.current = nextId;
      setCurrentUser(nextUser);
    };
    syncUser();
    const unsub = StrawSyncStore.subscribe(syncUser);
    fetch('/api/assistant')
      .then((r) => r.json())
      .then((d) => {
        if (d?.aiProvider) setAiProvider(d.aiProvider);
      })
      .catch(() => {});
    return () => unsub();
  }, []);

  const clearAutoListenTimer = () => {
    if (autoListenTimerRef.current) {
      clearTimeout(autoListenTimerRef.current);
      autoListenTimerRef.current = null;
    }
  };

  const cleanupRecognition = (abortSession: boolean) => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    isListeningRef.current = false;
    if (mountedRef.current) {
      setIsListening(false);
      setInterimTranscript('');
    }
    if (!rec) return;

    // Detach handlers first so an async onend/onerror cannot clobber a newly started session.
    rec.onstart = null;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try {
      if (abortSession) rec.abort();
      else rec.stop();
    } catch {
      // ignore teardown errors
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(Boolean(SR));

    return () => {
      mountedRef.current = false;
      clearAutoListenTimer();
      cleanupRecognition(true);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingAction, isOpen, interimTranscript]);

  const stopSpeaking = () => {
    clearAutoListenTimer();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const getMicErrorMessage = (code: string): string => {
    const hi = langRef.current === 'hi';
    switch (code) {
      case 'not-allowed':
      case 'service-not-allowed':
        return hi
          ? 'Microphone ki permission blocked hai. Browser address bar mein Mic allow karein, ya neeche type karke puchein.'
          : 'Microphone access blocked. Please allow mic permission in your browser settings, or type below.';
      case 'no-speech':
        return hi
          ? 'Koi aawaz sunai nahi di. Mic dubara dabakar saaf bolein ya type karein.'
          : 'No speech detected. Tap the mic and speak clearly, or type below.';
      case 'audio-capture':
        return hi
          ? 'Working microphone nahi mila. Apna mic device check karein ya type karein.'
          : 'No working microphone found. Check your audio input device or type below.';
      case 'network':
        return hi
          ? 'Browser voice service se network connect nahi ho raha. Aap neeche type karke baat kar sakte hain.'
          : 'Speech recognition network error. You can continue typing below.';
      case 'aborted':
        return '';
      default:
        return hi
          ? `Voice input ruk gaya (${code || 'unknown'}). Dubara koshish karein ya type karein.`
          : `Voice capture stopped (${code || 'unknown'}). Try again or type below.`;
    }
  };

  const startListening = () => {
    if (typeof window === 'undefined' || !mountedRef.current || isExecutingRef.current) return;
    if (isListeningRef.current) {
      stopListening();
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSpeechSupported(false);
      return;
    }

    clearAutoListenTimer();
    stopSpeaking();
    cleanupRecognition(true);
    setMicError('');

    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    micSubmittedRef.current = false;
    micHadErrorRef.current = false;
    manualStopRef.current = false;
    listenStartedAtRef.current = Date.now();

    const recognition = new SR();
    recognition.lang = langRef.current === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      if (recognitionRef.current !== recognition || !mountedRef.current) return;
      listenStartedAtRef.current = Date.now();
      isListeningRef.current = true;
      setIsListening(true);
      setInterimTranscript('');
    };

    recognition.onresult = (event: any) => {
      if (recognitionRef.current !== recognition || !mountedRef.current) return;
      let accumulatedFinal = '';
      let liveInterim = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = (result?.[0]?.transcript || '').trim();
        if (!transcript) continue;
        if (result.isFinal) {
          accumulatedFinal += (accumulatedFinal ? ' ' : '') + transcript;
        } else {
          liveInterim += (liveInterim ? ' ' : '') + transcript;
        }
      }
      finalTranscriptRef.current = accumulatedFinal.trim();
      interimTranscriptRef.current = liveInterim.trim();
      setInterimTranscript([finalTranscriptRef.current, interimTranscriptRef.current].filter(Boolean).join(' '));
    };

    recognition.onerror = (event: any) => {
      if (recognitionRef.current !== recognition) return;
      const errCode = String(event?.error || 'unknown');
      micHadErrorRef.current = true;
      recognitionRef.current = null;
      isListeningRef.current = false;
      if (!mountedRef.current) return;
      setIsListening(false);
      setInterimTranscript('');
      const msg = getMicErrorMessage(errCode);
      if (msg) setMicError(msg);
    };

    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      isListeningRef.current = false;
      if (!mountedRef.current) return;

      const elapsedMs = Date.now() - listenStartedAtRef.current;
      const captured = (finalTranscriptRef.current || interimTranscriptRef.current).trim();
      setIsListening(false);
      setInterimTranscript('');

      if (micHadErrorRef.current || micSubmittedRef.current) return;

      if (captured) {
        micSubmittedRef.current = true;
        lastInputWasVoiceRef.current = true;
        sendAssistantRequest(captured);
        return;
      }

      if (!manualStopRef.current && elapsedMs < 750) {
        setMicError(
          langRef.current === 'hi'
            ? 'Microphone start hote hi band ho gaya. Browser/Windows mic permission aur mic device check karein, ya type karein.'
            : 'Microphone closed right after starting. Check browser/system mic permission and input device, or type below.'
        );
      } else if (!manualStopRef.current) {
        setMicError(getMicErrorMessage('no-speech'));
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err: any) {
      cleanupRecognition(false);
      setMicError(
        langRef.current === 'hi'
          ? 'Microphone start nahi ho paya. Browser permission check karein ya neeche type karein.'
          : `Could not start microphone (${err?.message || 'permission or device busy'}). You can type below.`
      );
    }
  };

  const stopListening = () => {
    manualStopRef.current = true;
    isListeningRef.current = false;
    setIsListening(false);
    try {
      recognitionRef.current?.stop();
    } catch {
      cleanupRecognition(false);
    }
  };

  const speakReply = (rawText: string, stage: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || isMutedRef.current) {
      return;
    }
    clearAutoListenTimer();
    window.speechSynthesis.cancel();
    const cleanText = rawText
      .replace(/[*`#]/g, '')
      .replace(/₹/g, 'rupaye ')
      .replace(/\n+/g, '. ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const hasDevanagari = /[\u0900-\u097F]/.test(rawText);
    const targetLocale = hasDevanagari || langRef.current === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.lang = targetLocale;
    utterance.rate = 1.02;

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => v.lang.toLowerCase() === targetLocale.toLowerCase()) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(targetLocale.slice(0, 2))) ||
      voices.find((v) => v.lang.toLowerCase().includes('in'));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => {
      if (mountedRef.current) setIsSpeaking(true);
    };
    utterance.onend = () => {
      if (!mountedRef.current) return;
      setIsSpeaking(false);
      if (
        isOpenRef.current &&
        autoMicRef.current &&
        !isMutedRef.current &&
        lastInputWasVoiceRef.current &&
        (stage === 'collecting' || stage === 'awaiting_permission')
      ) {
        clearAutoListenTimer();
        autoListenTimerRef.current = setTimeout(() => {
          if (
            mountedRef.current &&
            isOpenRef.current &&
            autoMicRef.current &&
            !isMutedRef.current &&
            !isExecutingRef.current
          ) {
            startListening();
          }
        }, 700);
      }
    };
    utterance.onerror = () => {
      if (mountedRef.current) setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const sendAssistantRequest = async (
    text: string,
    options?: { confirmExecution?: boolean; cancelExecution?: boolean; fromText?: boolean }
  ) => {
    const clean = text.trim();
    if (!clean && !options?.confirmExecution && !options?.cancelExecution) return;
    if (isExecutingRef.current) return;

    setMicError('');
    if (options?.fromText) {
      lastInputWasVoiceRef.current = false;
      clearAutoListenTimer();
    }

    if (clean) {
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, sender: 'user', text: clean },
      ]);
      setInputText('');
    }

    isExecutingRef.current = true;
    setIsBusy(true);
    stopSpeaking();

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: clean || (options?.confirmExecution ? 'Confirm' : 'Cancel'),
          lang: langRef.current,
          pendingAction: pendingRef.current,
          confirmExecution: Boolean(options?.confirmExecution),
          cancelExecution: Boolean(options?.cancelExecution),
        }),
      });

      const data = await res.json();
      setPendingAction(data.pendingAction || null);
      if (data.aiProvider) {
        setAiProvider(data.aiProvider);
      }

      const botMsg: ChatMessage = {
        id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        sender: 'assistant',
        text: String(data.reply || 'Done.'),
        receipt: data.executionReceipt || null,
      };
      setMessages((prev) => [...prev, botMsg]);

      if (data.refreshBootstrap) {
        await StrawSyncStore.initFromServer(true);
        router.refresh();
      }
      if (data.navigateTo && !data.executionReceipt) {
        router.push(data.navigateTo);
      }

      speakReply(botMsg.text, String(data.stage || 'idle'));
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text:
            langRef.current === 'hi'
              ? 'Network error aaya. Kripya dubara koshish karein.'
              : 'Network error communicating with Copilot. Please try again.',
        },
      ]);
    } finally {
      isExecutingRef.current = false;
      setIsBusy(false);
    }
  };

  const quickPrompts = getQuickPrompts(currentUser?.role, lang);

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Kisan AI Copilot"
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-forest hover:bg-forest-700 text-white font-bold text-xs shadow-elevated border border-forest-200/30 transition"
        >
          <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-50" />
            <Mic className="w-3.5 h-3.5 text-white relative" />
          </span>
          <span>Kisan AI Copilot</span>
        </button>
      ) : (
        <div className="w-[400px] max-w-[94vw] h-[590px] max-h-[85vh] bg-white rounded-3xl border border-earth-border shadow-elevated flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3.5 bg-forest text-white flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-bold truncate">Kisan AI Copilot</span>
                  {aiProvider && aiProvider !== 'built-in' ? (
                    <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-400/25 border border-emerald-200/40 text-[9px] font-bold uppercase tracking-wide text-white">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                      <span>
                        AI Active • {aiProvider === 'gemini' ? 'Gemini' : aiProvider === 'groq' ? 'Groq' : 'OpenAI'}
                      </span>
                    </span>
                  ) : (
                    <span className="shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded-full bg-white/15 text-[9px] font-bold uppercase tracking-wide">
                      Neon AI
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-emerald-100 truncate">
                  {isListening
                    ? lang === 'hi' ? '🎙️ Sun raha hoon...' : '🎙️ Listening...'
                    : isSpeaking
                    ? lang === 'hi' ? '🔊 Bol raha hoon...' : '🔊 Speaking...'
                    : currentUser
                    ? `${currentUser.name} (${currentUser.role})`
                    : lang === 'hi' ? 'Hindi • English Voice' : 'Hindi • English Copilot'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setAutoMic((v) => !v)}
                title="Toggle hands-free auto microphone after reply"
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition ${
                  autoMic
                    ? 'bg-emerald-400/20 border-emerald-200/40 text-white'
                    : 'bg-white/10 border-white/15 text-emerald-100'
                }`}
              >
                <Radio className="w-3 h-3" />
                <span>Auto-Mic: {autoMic ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!isMuted) stopSpeaking();
                  setIsMuted((m) => !m);
                }}
                aria-label={isMuted ? 'Unmute Copilot Voice' : 'Mute Copilot Voice'}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  stopListening();
                  stopSpeaking();
                  cleanupRecognition(true);
                  setMicError('');
                  setIsOpen(false);
                }}
                aria-label="Close Copilot"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Live Voice Waveform Strip */}
          {(isListening || isSpeaking) && (
            <div className="px-4 py-2 bg-sage border-b border-forest-100 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex items-end gap-1 h-4 shrink-0">
                  <span className="w-1 bg-forest rounded-full animate-pulse h-2" />
                  <span className="w-1 bg-forest rounded-full animate-bounce h-4" />
                  <span className="w-1 bg-moss rounded-full animate-pulse h-3" />
                  <span className="w-1 bg-forest rounded-full animate-bounce h-4" />
                  <span className="w-1 bg-moss rounded-full animate-pulse h-2" />
                </div>
                <span className="text-[11px] font-bold text-forest-800 truncate">
                  {isListening
                    ? interimTranscript
                      ? `${lang === 'hi' ? 'Sun raha hoon' : 'Listening'}: "${interimTranscript}"`
                      : lang === 'hi'
                        ? 'Boliye, main sun raha hoon...'
                        : 'Speak now, listening...'
                    : lang === 'hi'
                      ? 'Copilot bol raha hai...'
                      : 'Copilot speaking...'}
                </span>
              </div>
              {isSpeaking ? (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  className="px-2 py-1 rounded-md bg-white border border-forest-200 text-[10px] font-bold text-forest flex items-center gap-1 shrink-0"
                >
                  <Square className="w-2.5 h-2.5 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopListening}
                  className="px-2 py-1 rounded-md bg-white border border-red-200 text-[10px] font-bold text-red-700 shrink-0"
                >
                  Done
                </button>
              )}
            </div>
          )}

          {/* Visible Microphone Feedback Banner */}
          {micError && !isListening && (
            <div className="px-3.5 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-2 shrink-0">
              <p className="text-[11px] font-semibold text-amber-900 leading-snug">{micError}</p>
              <button
                type="button"
                onClick={() => setMicError('')}
                aria-label="Dismiss microphone notice"
                className="text-amber-700 hover:text-amber-950 p-0.5 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Chat Message Canvas */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-sand">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line shadow-subtle ${
                    msg.sender === 'user'
                      ? 'bg-forest text-white rounded-br-md font-medium'
                      : 'bg-white text-charcoal border border-earth-border rounded-bl-md'
                  }`}
                >
                  {renderFormattedText(msg.text)}
                </div>

                {/* Verified Execution Receipt Card */}
                {msg.receipt && (
                  <div className="mt-2 w-[92%] bg-white rounded-2xl border border-forest-200 p-3.5 shadow-subtle space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-forest border border-forest-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Executed in Neon DB</span>
                      </span>
                      <span className="text-[10px] font-mono text-charcoal-muted">
                        #{msg.receipt.referenceId}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-charcoal">{msg.receipt.summary}</div>
                    <div className="space-y-1 text-[11px] bg-sand rounded-xl p-2.5 border border-earth-border">
                      {msg.receipt.fields.map((f, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="text-charcoal-muted">{f.label}</span>
                          <span className="font-bold text-charcoal text-right">{f.value}</span>
                        </div>
                      ))}
                    </div>
                    {msg.receipt.navigateTo && (
                      <button
                        type="button"
                        onClick={() => router.push(msg.receipt!.navigateTo!)}
                        className="w-full py-2 px-3 rounded-xl bg-forest hover:bg-forest-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        <span>View Live on Page</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Explicit Permission Preview Card */}
            {pendingAction?.stage === 'awaiting_permission' && (
              <div className="bg-white rounded-2xl border-2 border-amber-300 p-3.5 shadow-card space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    <ShieldAlert className="w-3 h-3" />
                    <span>Permission Required • अनुमति आवश्यक</span>
                  </span>
                </div>
                <div className="text-xs font-bold text-charcoal">{pendingAction.title}</div>
                <div className="space-y-1.5 bg-sand rounded-xl p-2.5 border border-earth-border text-[11px]">
                  {pendingAction.summaryFields.map((f, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-charcoal-muted">{f.label}</span>
                      <span className="font-bold text-charcoal text-right">{f.value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-charcoal-muted italic">
                  {lang === 'hi'
                    ? 'Bolkar "Haan kar do" kahein (ya bhav/matra badlein) ya neeche Confirm dabayein.'
                    : 'Say "Yes, confirm" (or edit price/qty by voice) or click Confirm below.'}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => sendAssistantRequest('Haan, Confirm', { confirmExecution: true })}
                    className="flex-1 py-2 px-3 rounded-xl bg-forest hover:bg-forest-700 disabled:opacity-60 text-white text-xs font-bold shadow-subtle transition"
                  >
                    ✅ Haan, Confirm &amp; Execute
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => sendAssistantRequest('Cancel', { cancelExecution: true })}
                    className="px-3 py-2 rounded-xl border border-earth-border bg-white hover:bg-red-50 text-charcoal-muted hover:text-red-700 text-xs font-bold transition"
                  >
                    ✖ Cancel
                  </button>
                </div>
              </div>
            )}

            {isBusy && (
              <div className="text-[11px] font-semibold text-forest flex items-center gap-1.5 px-2">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>{lang === 'hi' ? 'Neon database se janch raha hoon...' : 'Processing with Neon DB...'}</span>
              </div>
            )}
            <div ref={scrollEndRef} />
          </div>

          {/* Quick Role Prompt Chips */}
          <div className="px-3 py-2 bg-white border-t border-earth-border flex gap-1.5 overflow-x-auto shrink-0">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isBusy}
                onClick={() => sendAssistantRequest(prompt, { fromText: true })}
                className="shrink-0 px-2.5 py-1 rounded-full bg-sage/60 hover:bg-sage border border-forest-200/70 text-[10px] font-bold text-forest-800 whitespace-nowrap transition"
              >
                {prompt.length > 34 ? `${prompt.slice(0, 34)}...` : prompt}
              </button>
            ))}
          </div>

          {/* Bottom Voice + Text Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendAssistantRequest(inputText, { fromText: true });
            }}
            className="p-3 bg-white border-t border-earth-border flex items-center gap-2 shrink-0"
          >
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={!speechSupported || isBusy}
              aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              title={speechSupported ? 'Speak in Hindi or English' : 'Browser voice recognition unavailable'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition border ${
                isListening
                  ? 'bg-red-600 text-white border-red-600 animate-pulse'
                  : 'bg-sage text-forest border-forest-200 hover:bg-forest hover:text-white disabled:opacity-50'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (micError) setMicError('');
              }}
              placeholder={
                isListening
                  ? interimTranscript ||
                    (lang === 'hi' ? 'Sun raha hoon, boliye...' : 'Listening... speak now')
                  : lang === 'hi'
                    ? 'Bolkar ya likhkar puchein...'
                    : 'Ask in Hindi, Hinglish, or English...'
              }
              className="flex-1 min-w-0 px-3 py-2.5 bg-sand border border-earth-border rounded-xl text-xs font-medium text-charcoal focus:outline-none focus:border-forest"
            />

            <button
              type="submit"
              disabled={isBusy || !inputText.trim()}
              aria-label="Send message"
              className="w-10 h-10 rounded-xl bg-forest hover:bg-forest-700 disabled:opacity-50 text-white flex items-center justify-center shrink-0 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
