A compassionate AI-powered therapy chatbot built with Python and React, designed to provide empathetic responses and emotional support. The bot leverages OpenAI's GPT-4o for natural language understanding, ElevenLabs for text-to-speech (TTS) audio responses, and WebSocket for real-time communication.

Features
Empathetic Responses: Uses GPT-4o to generate supportive, therapist-like responses based on user input and sentiment analysis (via TextBlob).
Text-to-Speech: Converts responses into audio using ElevenLabs TTS, with configurable voice settings.
Sentiment Analysis: Analyzes user input to tailor responses based on emotional tone (positive, negative, neutral).
Real-Time Interaction: Implements WebSocket for seamless, non-streaming communication between the frontend and backend.
Interactive UI: Built with React, featuring a clean chat interface with voice toggle, feedback (thumbs up/down), and new chat options.
Speech-to-Text: Supports voice input using browser-based SpeechRecognition.
Tech Stack
Backend: Python, FastAPI, Uvicorn, OpenAI GPT-4o, ElevenLabs TTS, TextBlob
Frontend: React, Vite, WebSocket, Lucide React icons
Communication: WebSocket for real-time messaging
