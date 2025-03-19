import React, { useState, useEffect, useRef } from "react";
import {
  Loader2,
  Send,
  RefreshCw,
  ChevronDown,
  X,
  Volume2,
  VolumeX,
  Mic,
} from "lucide-react";

const ChatComponent = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const voiceDropdownRef = useRef(null);
  const responseCache = useRef(new Map());
  const currentAudio = useRef(null);
  const audioQueue = useRef([]);
  const eleven_lab_api_key = import.meta.env.VITE_ELEVEN_LAB_API_KEY;

  useEffect(() => {
    const loadVoices = async () => {
      try {
        const response = await fetch("https://api.elevenlabs.io/v1/voices", {
          headers: {
            "xi-api-key": eleven_lab_api_key,
          },
        });
        const data = await response.json();
        setVoices(data.voices);
        if (data.voices.length > 0 && !selectedVoice) {
          setSelectedVoice(data.voices[0]);
        }
      } catch (error) {
        console.error("Failed to load ElevenLabs voices:", error);
        setSpeechEnabled(false);
      }
    };

    if (
      !("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    ) {
      console.log("Speech-to-text not supported in this browser");
    }
    loadVoices();

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) socket.close();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    let currentMessage = "";
    const speechEnabled = false;
    const connectWebSocket = () => {
      const ws = new WebSocket("ws://localhost:8003/ws");
      ws.onopen = () => {
        console.log("Connected to WebSocket");
        setSocket(ws);
      };
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("WebSocket Message Received:", data);
        if (data.error) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.error },
          ]);
          setLoading(false);
          return;
        }
        if (data.streak !== undefined) {
          console.log(`Streak updated: ${data.streak}`);
          return;
        }
        const responseText =
          data.response ||
          "I’m here, but I didn’t catch that. Can you say more?";
        // Directly append the full response since there's no streaming
        setMessages((prev) => {
          const lastMsgIndex = prev.length - 1;
          // Replace the last assistant message if it exists and is incomplete
          if (lastMsgIndex >= 0 && prev[lastMsgIndex].role === "assistant") {
            return [
              ...prev.slice(0, lastMsgIndex),
              { role: "assistant", content: responseText.trim() },
            ];
          }
          return [...prev, { role: "assistant", content: responseText.trim() }];
        });
        setLoading(false);
        if (speechEnabled && selectedVoice?.voice_id) {
          console.log("Calling speakText with:", {
            text: responseText.trim(),
            polarity: data.sentiment?.polarity || 0,
            speechEnabled,
            voiceId: selectedVoice.voice_id,
          });
          setTimeout(() => {
            speakText(responseText.trim(), data.sentiment?.polarity || 0);
          }, 100); // Slight delay to ensure DOM interaction
        } else {
          console.log("speakText not called. Conditions:", {
            speechEnabled,
            hasVoiceId: !!selectedVoice?.voice_id,
          });
        }
      };
      ws.onclose = (event) => {
        console.log("WebSocket Closed:", event.code, event.reason);
        setTimeout(() => connectWebSocket(), 3000);
      };
      ws.onerror = (error) => console.error("WebSocket Error:", error);
      return ws;
    };

    const ws = connectWebSocket();
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [speechEnabled, selectedVoice]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        voiceDropdownRef.current &&
        !voiceDropdownRef.current.contains(event.target)
      ) {
        setShowVoiceDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const streamAudio = async (text, polarity = 0, isFinal = false) => {
    await speakText(text, polarity);
    if (isFinal) {
      audioQueue.current = [];
    }
  };

  const playNextAudio = (forceEnd = false) => {
    if (!audioQueue.current.length || (isSpeaking && !forceEnd)) return;
    if (currentAudio.current) currentAudio.current.pause();

    const { url, rate } = audioQueue.current.shift();
    currentAudio.current = new Audio(url);
    currentAudio.current.playbackRate = rate;
    currentAudio.current.onplay = () => setIsSpeaking(true);
    currentAudio.current.onended = () => {
      setIsSpeaking(false);
      playNextAudio();
    };
    currentAudio.current.play();
  };

  const speakText = async (text, polarity = 0) => {
    if (responseCache.current.has(text)) {
      const audio = new Audio(responseCache.current.get(text));
      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => setIsSpeaking(false);
      audio.play();
      return;
    }

    const voiceSettings = {
      stability: polarity > 0 ? 0.7 : 0.9,
      similarity_boost: 0.75,
    };
    const rate = polarity > 0 ? 1.1 : 0.9;

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${
          selectedVoice?.voice_id ||
          voices[0]?.voice_id ||
          "21m00Tcm4TlvDq8ikWAM"
        }`,
        {
          method: "POST",
          headers: {
            "xi-api-key": eleven_lab_api_key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text, voice_settings: voiceSettings }),
        }
      );
      if (!response.ok) {
        throw new Error(`ElevenLabs TTS failed: ${response.statusText}`);
      }
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      responseCache.current.set(text, audioUrl);
      const audio = new Audio(audioUrl);
      audio.playbackRate = rate;
      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => setIsSpeaking(false);
      audio.play();
    } catch (error) {
      console.error("ElevenLabs TTS error:", error);
      setIsSpeaking(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.onresult = (event) => {
      setInput(event.results[0][0].transcript);
      handleSend();
    };
    recognition.onerror = (event) => console.error("STT error:", event);
    recognition.start();
  };

  const toggleSpeech = () => {
    if (isSpeaking && currentAudio.current) {
      currentAudio.current.pause();
      setIsSpeaking(false);
    }
    setSpeechEnabled(!speechEnabled);
  };

  const handleVoiceSelect = (voice) => {
    setSelectedVoice(voice);
    setShowVoiceDropdown(false);
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (socket && input.trim()) {
      const userMessage = { role: "user", content: input };
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      socket.send(
        JSON.stringify({ user_id: "user2", input, sentiment: "neutral" })
      );
      setInput("");
      setLoading(true);
      inputRef.current?.focus();
    }
  };

  const promptNewChat = () => {
    if (messages.length > 0) {
      setShowConfirmDialog(true);
    } else {
      handleNewChat();
    }
  };

  const handleNewChat = () => {
    if (currentAudio.current) currentAudio.current.pause();
    setMessages([]);
    setInput("");
    setLoading(false);
    setShowConfirmDialog(false);
    setIsSpeaking(false);
    audioQueue.current = [];
    inputRef.current?.focus();
  };

  const closeConfirmDialog = () => {
    setShowConfirmDialog(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const rateResponse = (index, rating) => {
    socket.send(JSON.stringify({ feedback: { msgIdx: index, rating } }));
  };

  return (
    <div className="w-full max-w-lg mx-auto my-8 bg-white rounded-xl shadow-lg overflow-hidden relative">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex justify-between items-center">
        <h2 className="text-xl font-bold">Therapy Chat</h2>
        <div className="flex items-center gap-2">
          <div className="relative" ref={voiceDropdownRef}>
            <button
              onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
              className="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all duration-200 flex items-center gap-1"
              disabled={!speechEnabled}
              title="Select voice"
            >
              <Mic size={16} />
              <span className="text-sm">
                {selectedVoice ? selectedVoice.name.split(" ")[0] : "Voice"}
              </span>
            </button>
            {showVoiceDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                {voices.map((voice) => (
                  <button
                    key={voice.voice_id}
                    onClick={() => handleVoiceSelect(voice)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-100 hover:text-blue-900 transition-colors duration-150"
                  >
                    {voice.name} ({voice.labels?.accent || "Neutral"})
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={toggleSpeech}
            className="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all duration-200"
            aria-label={speechEnabled ? "Turn off voice" : "Turn on voice"}
            title={speechEnabled ? "Turn off voice" : "Turn on voice"}
          >
            {speechEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            onClick={promptNewChat}
            className="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all duration-200 flex items-center gap-1"
            aria-label="New chat"
            title="Start a new chat"
          >
            <RefreshCw size={16} />
            <span className="text-sm">New Chat</span>
          </button>
        </div>
      </div>

      <div className="h-96 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 flex-col">
            <ChevronDown size={24} className="animate-bounce mb-2" />
            <p>Start a new conversation</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`my-3 max-w-[85%] ${
                msg.role === "user" ? "ml-auto" : "mr-auto"
              }`}
            >
              <div
                className={`p-3 rounded-xl shadow-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-200 text-gray-800 rounded-bl-none"
                }`}
              >
                <span className="whitespace-pre-wrap">{msg.content}</span>
                {msg.role === "assistant" && (
                  <button
                    onClick={() => speakText(msg.content)}
                    className="ml-2 p-1 text-gray-500 hover:text-gray-700"
                  >
                    <Volume2 size={16} />
                  </button>
                )}
              </div>
              <div
                className={`text-xs mt-1 text-gray-500 flex justify-between ${
                  msg.role === "user" ? "text-right" : "text-left"
                }`}
              >
                <span>
                  {msg.role === "user" ? "You" : "Therapist"} •{" "}
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {msg.role === "assistant" && (
                  <div>
                    <button
                      onClick={() => rateResponse(index, 1)}
                      className="text-green-500 hover:text-green-700"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => rateResponse(index, -1)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      👎
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-center space-x-2 p-3 bg-gray-200 text-gray-800 rounded-xl rounded-bl-none max-w-[85%] my-3 animate-pulse">
            <Loader2 size={16} className="animate-spin" />
            <span>Therapist is typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="p-4 border-t border-gray-200 bg-white"
      >
        <div className="flex items-center bg-gray-100 rounded-lg px-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all duration-200">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-grow p-3 bg-transparent border-none outline-none text-gray-700 placeholder-gray-500"
            placeholder="Type your message..."
            disabled={loading}
          />
          <button
            onClick={startListening}
            className="p-2 text-gray-500 hover:text-gray-700"
            aria-label="Speak your message"
          >
            <Mic size={18} />
          </button>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className={`p-2 rounded-full ${
              input.trim() && !loading
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            } transition-all duration-200`}
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Press Enter to send, Shift+Enter for a new line
        </p>
      </form>

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Start New Chat
              </h3>
              <button
                onClick={closeConfirmDialog}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mb-6 text-gray-600">
              Starting a new chat will clear the current conversation. Are you
              sure you want to continue?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeConfirmDialog}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNewChat}
                className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Start New
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatComponent;
