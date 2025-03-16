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
  const speechSynthRef = useRef(window.speechSynthesis);
  const voiceDropdownRef = useRef(null);

  // Initialize speech synthesis and voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechSynthRef.current.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(availableVoices[0]); // Default to first voice
      }
    };

    if (!("speechSynthesis" in window)) {
      console.log("Text-to-speech not supported in this browser");
      setSpeechEnabled(false);
    } else {
      loadVoices();
      // Voices might not be loaded immediately in some browsers
      speechSynthRef.current.onvoiceschanged = loadVoices;
    }

    return () => {
      if (speechSynthRef.current) {
        speechSynthRef.current.cancel();
        speechSynthRef.current.onvoiceschanged = null;
      }
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // WebSocket connection (unchanged)
  useEffect(() => {
      const connectWebSocket = () => {
        const ws = new WebSocket("ws://localhost:8001/ws");
        ws.onopen = () => {
          console.log("Connected to WebSocket");
          setSocket(ws);
        };
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          const responseMessage = { role: "assistant", content: data.response };
          setMessages((prevMessages) => [...prevMessages, responseMessage]);
          setLoading(false);
          if (speechEnabled) {
            speakText(data.response);
          }
        };
        ws.onclose = () => {
          console.log("WebSocket Disconnected");
          setTimeout(() => connectWebSocket(), 3000);
        };
        ws.onerror = (error) => console.error("WebSocket Error:", error);
        return ws;
      };

      const ws = connectWebSocket();
      return () => {
        if (ws && ws.readyState === WebSocket.OPEN) ws.close();
      };
    }, [speechEnabled]);

  // Handle clicks outside voice dropdown
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

  const speakText = (text) => {
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setIsSpeaking(false);
    };

    speechSynthRef.current.speak(utterance);
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      if (speechSynthRef.current) {
        speechSynthRef.current.cancel();
        setIsSpeaking(false);
      }
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
      socket.send(JSON.stringify({ user_id: "user1", input }));
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
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel();
      setIsSpeaking(false);
    }
    setMessages([]);
    setInput("");
    setLoading(false);
    setShowConfirmDialog(false);
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

  return (
    <div className="w-full max-w-lg mx-auto my-8 bg-white rounded-xl shadow-lg overflow-hidden relative">
      {/* Header */}
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
                    key={voice.name}
                    onClick={() => handleVoiceSelect(voice)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-100 hover:text-blue-900 transition-colors duration-150"
                  >
                    {voice.name} ({voice.lang})
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

      {/* Messages container (unchanged) */}
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
              </div>
              <div
                className={`text-xs mt-1 text-gray-500 ${
                  msg.role === "user" ? "text-right" : "text-left"
                }`}
              >
                {msg.role === "user" ? "You" : "Therapist"} •{" "}
                {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
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

      {/* Input area (unchanged) */}
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

      {/* Confirmation Dialog (unchanged) */}
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
