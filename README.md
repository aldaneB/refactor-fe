# Therapy Bot

A compassionate AI-powered therapy chatbot built with Python and React, designed to provide empathetic responses and emotional support. The bot leverages OpenAI's GPT-4o for natural language understanding, ElevenLabs for text-to-speech (TTS) audio responses, and WebSocket for real-time communication.

## Features

- **Empathetic Responses**: Uses GPT-4o to generate supportive, therapist-like responses based on user input and sentiment analysis (via TextBlob).
- **Text-to-Speech**: Converts responses into audio using ElevenLabs TTS, with configurable voice settings.
- **Sentiment Analysis**: Analyzes user input to tailor responses based on emotional tone (positive, negative, neutral).
- **Real-Time Interaction**: Implements WebSocket for seamless, non-streaming communication between the frontend and backend.
- **Interactive UI**: Built with React, featuring a clean chat interface with voice toggle, feedback (thumbs up/down), and new chat options.
- **Speech-to-Text**: Supports voice input using browser-based SpeechRecognition.

## Tech Stack

### Backend:
- Python
- FastAPI
- Uvicorn
- OpenAI GPT-4o
- ElevenLabs TTS
- TextBlob

### Frontend:
- React
- Vite
- WebSocket
- Lucide React icons

### Communication:
- WebSocket for real-time messaging

## Setup

### Clone the Repository:
```bash
git clone https://github.com/your-username/therapy-bot.git
cd therapy-bot
```

### Backend Setup:

#### Install dependencies:
```bash
pip install -r backend/requirements.txt
```

#### Set environment variables:
Set environment variables (e.g., OpenAI API key, ElevenLabs API key) in a `.env` file.

#### Run the server:
```bash
uvicorn main:app --host 0.0.0.0 --port 8003
```

### Frontend Setup:

#### Navigate to the frontend directory:
```bash
cd frontend
```

#### Install dependencies:
```bash
npm install
```

#### Set the ElevenLabs API key:
Set the ElevenLabs API key in `.env` (e.g., `VITE_ELEVEN_LAB_API_KEY=your-key`).

#### Start the development server:
```bash
npm run dev
