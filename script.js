require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();

// ========================
// BACKEND IMPLEMENTATION
// ========================

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learnifypro', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Models
const solutionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  question: { type: String, required: true },
  subject: { type: String, required: true },
  classLevel: { type: Number, required: true },
  method: { type: String, enum: ['text', 'image', 'voice'], required: true },
  imagePath: { type: String },
  audioPath: { type: String },
  solution: { type: String, required: true },
  explanation: { type: String, required: true },
  resources: { type: [String], required: true },
  createdAt: { type: Date, default: Date.now }
});
const Solution = mongoose.model('Solution', solutionSchema);

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now }
});
const UserSession = mongoose.model('UserSession', sessionSchema);

// File Upload Configuration
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image or audio files are allowed!'), false);
    }
  }
});

// API Routes
app.post('/api/sessions', async (req, res) => {
  try {
    const session = new UserSession({
      sessionId: uuidv4(),
      createdAt: new Date()
    });
    await session.save();
    res.json({ sessionId: session.sessionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/solve/text', async (req, res) => {
  try {
    const { question, subject, classLevel, sessionId } = req.body;
    
    if (!question || !subject || !classLevel) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const solution = await generateSolution(question, subject, classLevel);
    
    const newSolution = new Solution({
      sessionId,
      question,
      subject,
      classLevel,
      method: 'text',
      solution: solution.solution,
      explanation: solution.explanation,
      resources: solution.resources
    });
    await newSolution.save();

    res.json(solution);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/solve/image', upload.single('image'), async (req, res) => {
  try {
    const { subject, classLevel, sessionId } = req.body;
    const imagePath = req.file.path;

    // Simulate OCR processing
    const extractedText = `Image content about ${subject} for class ${classLevel}`;
    
    const solution = await generateSolution(extractedText, subject, classLevel);
    
    const newSolution = new Solution({
      sessionId,
      question: `Image: ${extractedText.substring(0, 50)}...`,
      subject,
      classLevel,
      method: 'image',
      imagePath,
      solution: solution.solution,
      explanation: solution.explanation,
      resources: solution.resources
    });
    await newSolution.save();

    res.json(solution);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/solve/voice', upload.single('audio'), async (req, res) => {
  try {
    const { subject, classLevel, sessionId } = req.body;
    const audioPath = req.file.path;

    // Simulate speech-to-text processing
    const transcribedText = `Voice question about ${subject} for class ${classLevel}`;
    
    const solution = await generateSolution(transcribedText, subject, classLevel);
    
    const newSolution = new Solution({
      sessionId,
      question: transcribedText,
      subject,
      classLevel,
      method: 'voice',
      audioPath,
      solution: solution.solution,
      explanation: solution.explanation,
      resources: solution.resources
    });
    await newSolution.save();

    res.json(solution);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function to generate solutions
async function generateSolution(question, subject, classLevel) {
  const solutions = {
    'Mathematics': {
      solution: `
        <div class="space-y-4">
          <div>
            <div class="font-medium">Problem:</div>
            <p class="math-equation">${question}</p>
          </div>
          <div>
            <div class="font-medium">Solution:</div>
            <ol class="list-decimal pl-5 space-y-2">
              <li>Identify the variables and constants</li>
              <li>Apply appropriate mathematical operations</li>
              <li>Solve step by step</li>
            </ol>
          </div>
          <div class="bg-green-100 dark:bg-green-900 rounded-lg p-3 mt-3">
            <div class="font-medium">Answer:</div>
            <p>Solution for ${question}</p>
          </div>
        </div>
      `,
      explanation: "This is a mathematical problem that requires understanding of core concepts. The solution involves breaking down the problem into smaller steps and applying appropriate operations.",
      resources: [
        "Mathematics Textbook - Chapter 5",
        "Khan Academy - Algebra Basics",
        "YouTube: Math Problem Solving Techniques"
      ]
    },
    'Science': {
      solution: `
        <div class="space-y-4">
          <div>
            <div class="font-medium">Question:</div>
            <p>${question}</p>
          </div>
          <div>
            <div class="font-medium">Scientific Explanation:</div>
            <p>Based on scientific principles, the answer involves understanding core concepts in ${subject}.</p>
          </div>
        </div>
      `,
      explanation: "This scientific question requires application of fundamental principles. The explanation breaks down the phenomena into understandable parts.",
      resources: [
        "Science Journal - Vol. 12",
        "MIT OpenCourseWare - ${subject}",
        "ScienceDirect Research Papers"
      ]
    },
    // Other subjects...
    'default': {
      solution: `
        <div class="space-y-4">
          <div>
            <div class="font-medium">Question:</div>
            <p>${question}</p>
          </div>
          <div>
            <div class="font-medium">Solution:</div>
            <p>Comprehensive solution for this ${subject} question.</p>
          </div>
        </div>
      `,
      explanation: "Detailed explanation of the concepts involved in this question.",
      resources: [
        "${subject} Textbook Reference",
        "Online Learning Resources",
        "Educational Videos"
      ]
    }
  };

  return solutions[subject] || solutions['default'];
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadDir));

// ========================
// FRONTEND IMPLEMENTATION
// ========================

const frontendHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Learnify Pro - AI Homework Helper</title>
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Lottie Player CDN -->
    <script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <style>
        :root {
            --text-primary: #1f2937;
            --text-secondary: #4b5563;
            --bg-primary: #ffffff;
            --bg-secondary: #f3f4f6;
            --accent-primary: #7c3aed;
            --accent-secondary: #a78bfa;
            --card-bg: rgba(255, 255, 255, 0.9);
        }

        .dark {
            --text-primary: #f3f4f6;
            --text-secondary: #d1d5db;
            --bg-primary: #1a1a2e;
            --bg-secondary: #16213e;
            --accent-primary: #8b5cf6;
            --accent-secondary: #c4b5fd;
            --card-bg: rgba(26, 26, 46, 0.9);
        }

        body {
            font-family: 'Poppins', sans-serif;
            background-color: var(--bg-primary);
            color: var(--text-primary);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            min-height: 100vh;
            transition: all 0.3s ease;
        }

        .gradient-bg {
            background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
        }
        
        .card {
            background-color: var(--card-bg);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 1rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            transition: all 0.3s ease;
        }

        .card:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
        }

        .active-selection {
            transform: scale(1.03);
            box-shadow: 0 0 0 2px var(--accent-primary);
            background-color: rgba(124, 58, 237, 0.1);
        }

        .page {
            display: none;
            animation: fadeIn 0.5s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .disabled-btn {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .ai-helper-bubble {
            transform: scale(0);
            transform-origin: bottom right;
            transition: transform 0.3s ease;
        }

        .ai-helper-bubble.active {
            transform: scale(1);
        }

        .waveform {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 50px;
            height: 30px;
        }

        .waveform-bar {
            background-color: var(--accent-primary);
            width: 3px;
            border-radius: 3px;
            animation: waveform-animation 1.5s ease-in-out infinite;
        }

        @keyframes waveform-animation {
            0%, 100% { height: 5px; }
            50% { height: 20px; }
        }

        .math-equation {
            background-color: var(--bg-secondary);
            padding: 0.5rem;
            border-radius: 0.5rem;
            font-family: "Courier New", monospace;
            overflow-x: auto;
        }

        @media (max-width: 640px) {
            .subject-card {
                padding: 0.75rem;
            }
            
            .method-card {
                padding: 1rem;
            }
            
            h1 {
                font-size: 2rem;
            }
            
            h2 {
                font-size: 1.5rem;
            }
            
            .ai-helper-bubble {
                width: 90%;
                right: 5%;
                bottom: 80px;
            }
        }
    </style>
</head>
<body class="text-gray-800 dark:text-gray-100 overflow-x-hidden">

    <!-- Theme Toggle -->
    <button id="theme-toggle" class="fixed top-4 right-4 z-50 bg-white dark:bg-gray-700 p-2 rounded-full shadow-md">
        <svg id="theme-icon" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    </button>

    <!-- AI Helper Bubble -->
    <div id="ai-helper-bubble" class="ai-helper-bubble fixed bottom-20 right-4 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 z-40">
        <div class="flex justify-between items-center mb-2">
            <div class="flex items-center">
                <div class="bg-purple-100 dark:bg-purple-900 p-2 rounded-full mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-600 dark:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>
                <span class="font-semibold">Learnify AI</span>
            </div>
            <button id="close-helper" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        <div id="ai-helper-messages" class="mb-3 max-h-40 overflow-y-auto text-sm">
            <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-2 mb-1">How can I help with your homework today?</div>
        </div>
        <div class="flex">
            <input id="ai-helper-input" type="text" class="flex-1 border border-gray-300 dark:border-gray-600 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 dark:bg-gray-700" placeholder="Ask me anything...">
            <button id="ai-helper-send" class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-r-lg text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
            </button>
        </div>
    </div>

    <main class="relative min-h-screen w-full flex items-center justify-center p-4 py-8">

        <!-- Welcome Page -->
        <section id="welcome-page" class="page w-full max-w-4xl mx-auto text-center">
            <div class="flex flex-col items-center">
                <!-- App Branding -->
                <div class="mb-4">
                    <h1 class="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Learnify Pro</h1>
                    <p class="text-sm text-gray-500 dark:text-gray-400">By Thakur Digital - Advanced Learning Solutions</p>
                    <p class="mt-1 text-sm text-purple-500 dark:text-purple-400">"Your 24/7 AI-Powered Study Companion"</p>
                </div>
                
                <!-- Animation -->
                <div class="w-48 h-48 sm:w-56 sm:h-56">
                    <lottie-player src="https://assets10.lottiefiles.com/packages/lf20_v92o72md.json" background="transparent" speed="1" loop autoplay></lottie-player>
                </div>

                <h2 class="text-2xl sm:text-3xl font-bold mt-2">AI Homework Helper</h2>
                <p class="mt-1 text-gray-600 dark:text-gray-300">Get instant solutions, explanations, and learning resources</p>
                
                <!-- Features -->
                <div class="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full">
                    <div class="card p-4 text-center">
                        <div class="text-3xl mb-2">✍️</div>
                        <h3 class="font-semibold">Text Solver</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Type or paste your questions</p>
                    </div>
                    <div class="card p-4 text-center">
                        <div class="text-3xl mb-2">📷</div>
                        <h3 class="font-semibold">Image Solver</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Upload problems from photos</p>
                    </div>
                    <div class="card p-4 text-center">
                        <div class="text-3xl mb-2">🎤</div>
                        <h3 class="font-semibold">Voice Solver</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Ask questions verbally</p>
                    </div>
                </div>

                <!-- Additional Features -->
                <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                    <div class="card p-3 text-center">
                        <div class="text-xl mb-1">📝</div>
                        <h3 class="font-medium text-xs">Step-by-Step</h3>
                    </div>
                    <div class="card p-3 text-center">
                        <div class="text-xl mb-1">📊</div>
                        <h3 class="font-medium text-xs">Graphs & Charts</h3>
                    </div>
                    <div class="card p-3 text-center">
                        <div class="text-xl mb-1">🧮</div>
                        <h3 class="font-medium text-xs">Math Equations</h3>
                    </div>
                    <div class="card p-3 text-center">
                        <div class="text-xl mb-1">💾</div>
                        <h3 class="font-medium text-xs">Save History</h3>
                    </div>
                </div>

                <!-- CTA -->
                <div class="mt-8">
                    <button id="get-started-btn" class="bg-gradient-to-r from-purple-600 to-pink-500 text-white font-medium py-2 px-8 rounded-full text-sm shadow-md hover:from-purple-700 hover:to-pink-600 transition-all">
                        Get Started
                    </button>
                    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">No login required</p>
                </div>
            </div>
        </section>
        
        <!-- Subject Selection -->
        <section id="subject-page" class="page w-full max-w-4xl mx-auto">
            <header class="text-center mb-6">
                <h1 class="text-sm text-purple-600 dark:text-purple-400 mb-1">Learnify Pro</h1>
                <h2 class="text-xl sm:text-2xl font-bold">Choose your Subject</h2>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Select a subject and your class</p>
            </header>

            <!-- Subjects -->
            <div id="subject-grid" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div class="subject-card card p-3 flex flex-col items-center justify-center aspect-square cursor-pointer" data-subject="Mathematics">
                    <span class="text-3xl">🧮</span>
                    <span class="mt-1 font-medium text-sm">Mathematics</span>
                </div>
                <div class="subject-card card p-3 flex flex-col items-center justify-center aspect-square cursor-pointer" data-subject="Science">
                    <span class="text-3xl">🔬</span>
                    <span class="mt-1 font-medium text-sm">Science</span>
                </div>
                <div class="subject-card card p-3 flex flex-col items-center justify-center aspect-square cursor-pointer" data-subject="English">
                    <span class="text-3xl">📚</span>
                    <span class="mt-1 font-medium text-sm">English</span>
                </div>
                <div class="subject-card card p-3 flex flex-col items-center justify-center aspect-square cursor-pointer" data-subject="Nepali">
                    <span class="text-3xl">🇳🇵</span>
                    <span class="mt-1 font-medium text-sm">Nepali</span>
                </div>
                <div class="subject-card card p-3 flex flex-col items-center justify-center aspect-square cursor-pointer" data-subject="Social Studies">
                    <span class="text-3xl">🌍</span>
                    <span class="mt-1 font-medium text-sm">Social Studies</span>
                </div>
                <div class="subject-card card p-3 flex flex-col items-center justify-center aspect-square cursor-pointer" data-subject="General Knowledge">
                    <span class="text-3xl">🧠</span>
                    <span class="mt-1 font-medium text-sm">G.K.</span>
                </div>
            </div>
            
            <!-- Class Selector -->
            <div class="mt-6 text-center">
                <h3 class="text-sm font-medium mb-2">Select Your Class</h3>
                <div id="class-chips" class="flex flex-wrap justify-center gap-2">
                    <!-- Generated by JS -->
                </div>
            </div>

            <!-- Continue Button -->
            <div class="mt-8 text-center">
                <button id="continue-btn" class="bg-gradient-to-r from-purple-600 to-pink-500 text-white font-medium py-2 px-6 rounded-full text-sm shadow-md transition-all disabled-btn">
                    Continue
                </button>
            </div>
        </section>

        <!-- Method Selection -->
        <section id="method-page" class="page w-full max-w-4xl mx-auto">
            <header class="relative text-center mb-6">
                <!-- Back Button -->
                <button id="back-btn" class="absolute left-0 top-1/2 -translate-y-1/2 bg-gray-100 dark:bg-gray-700 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 class="text-sm text-purple-600 dark:text-purple-400 mb-1">Learnify Pro</h1>
                <h2 class="text-xl sm:text-2xl font-bold">How to Solve?</h2>
                <p id="selection-display" class="text-sm text-gray-600 dark:text-gray-400 mt-1">Class 10 - Mathematics</p>
            </header>

            <!-- Methods -->
            <div id="method-cards" class="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="method-card card p-4 text-center cursor-pointer" data-method="Text">
                    <span class="text-4xl">✍️</span>
                    <h3 class="font-semibold mt-2">Text Input</h3>
                    <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Type your question</p>
                </div>
                <div class="method-card card p-4 text-center cursor-pointer" data-method="Image">
                    <span class="text-4xl">📷</span>
                    <h3 class="font-semibold mt-2">Image Upload</h3>
                    <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Upload a picture</p>
                </div>
                <div class="method-card card p-4 text-center cursor-pointer" data-method="Voice">
                    <span class="text-4xl">🎤</span>
                    <h3 class="font-semibold mt-2">Voice Question</h3>
                    <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Speak your question</p>
                </div>
            </div>

            <!-- Start Button -->
            <div class="mt-8 text-center">
                 <button id="start-btn" class="bg-gradient-to-r from-purple-600 to-pink-500 text-white font-medium py-2 px-8 rounded-full text-sm shadow-md hover:from-purple-700 hover:to-pink-600 transition-all disabled-btn">
                    Select a Method
                </button>
            </div>
        </section>
        
        <!-- Question Input -->
        <section id="question-page" class="page w-full max-w-4xl mx-auto">
            <header class="relative text-center mb-6">
                <!-- Back Button -->
                <button id="back-to-method-btn" class="absolute left-0 top-1/2 -translate-y-1/2 bg-gray-100 dark:bg-gray-700 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 class="text-sm text-purple-600 dark:text-purple-400 mb-1">Learnify Pro</h1>
                <h2 class="text-xl sm:text-2xl font-bold">Ask Your Question</h2>
                <p id="current-method-display" class="text-sm text-gray-600 dark:text-gray-400 mt-1">Method: Text Input</p>
            </header>
            
            <!-- Input Area -->
            <div class="mt-6">
                <div id="text-input-container">
                    <textarea id="question-text" class="w-full h-40 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700" placeholder="Type your question here..."></textarea>
                    <div class="flex justify-end mt-2">
                        <button id="math-equation-btn" class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mr-2">
                            <i class="fas fa-square-root-alt mr-1"></i>Insert Math Equation
                        </button>
                        <button id="clear-text-btn" class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            <i class="fas fa-trash-alt mr-1"></i>Clear
                        </button>
                    </div>
                </div>
                
                <div id="image-input-container" class="hidden">
                    <div class="card p-4 text-center cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                        <span class="text-4xl">📁</span>
                        <h3 class="font-semibold mt-2">Upload Image</h3>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Click to browse or drag & drop</p>
                        <input type="file" id="image-upload" accept="image/*" class="hidden">
                        <button id="upload-btn" class="mt-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-medium py-1 px-4 rounded-full text-xs shadow-md hover:from-purple-700 hover:to-pink-600 transition">
                            Select Image
                        </button>
                    </div>
                    <div id="image-preview" class="mt-3 hidden">
                        <img id="preview-img" src="#" alt="Preview" class="max-w-full h-auto rounded-lg mx-auto max-h-40">
                        <div class="flex justify-center gap-2 mt-2">
                            <button id="remove-image-btn" class="bg-red-500 text-white font-medium py-1 px-3 rounded-full text-xs shadow hover:bg-red-600 transition">
                                <i class="fas fa-trash mr-1"></i>Remove
                            </button>
                            <button id="retake-image-btn" class="bg-gray-500 text-white font-medium py-1 px-3 rounded-full text-xs shadow hover:bg-gray-600 transition">
                                <i class="fas fa-camera-retro mr-1"></i>Retake
                            </button>
                        </div>
                    </div>
                </div>
                
                <div id="voice-input-container" class="hidden">
                    <div class="card p-4 text-center">
                        <span class="text-4xl">🎤</span>
                        <h3 class="font-semibold mt-2">Voice Question</h3>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Click below and speak clearly</p>
                        <button id="record-btn" class="mt-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-medium py-2 px-6 rounded-full text-xs shadow-md hover:from-purple-700 hover:to-pink-600 transition flex items-center justify-center mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                            Start Recording
                        </button>
                        <div id="recording-status" class="mt-3 hidden">
                            <div class="flex items-center justify-center">
                                <div class="waveform mr-2">
                                    <div class="waveform-bar" style="animation-delay: 0s"></div>
                                    <div class="waveform-bar" style="animation-delay: 0.2s"></div>
                                    <div class="waveform-bar" style="animation-delay: 0.4s"></div>
                                    <div class="waveform-bar" style="animation-delay: 0.6s"></div>
                                    <div class="waveform-bar" style="animation-delay: 0.8s"></div>
                                </div>
                                <span class="text-xs">Recording...</span>
                            </div>
                            <p id="transcript" class="mt-1 text-xs text-gray-600 dark:text-gray-400"></p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Additional Options -->
            <div class="mt-4 card p-3">
                <h3 class="text-sm font-medium mb-2">Additional Options</h3>
                <div class="flex flex-wrap gap-2">
                    <button id="show-example-btn" class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        <i class="fas fa-lightbulb mr-1"></i>Show Example
                    </button>
                    <button id="show-formula-btn" class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        <i class="fas fa-function mr-1"></i>Show Formula
                    </button>
                    <button id="show-diagram-btn" class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        <i class="fas fa-project-diagram mr-1"></i>Diagram
                    </button>
                </div>
            </div>
            
            <!-- Submit Button -->
            <div class="mt-6 text-center">
                <button id="submit-btn" class="bg-gradient-to-r from-purple-600 to-pink-500 text-white font-medium py-2 px-8 rounded-full text-sm shadow-md hover:from-purple-700 hover:to-pink-600 transition disabled-btn">
                    <i class="fas fa-paper-plane mr-2"></i>Submit Question
                </button>
            </div>
        </section>
        
        <!-- Results Page -->
        <section id="results-page" class="page w-full max-w-4xl mx-auto">
            <header class="text-center mb-6">
                <h1 class="text-sm text-purple-600 dark:text-purple-400 mb-1">Learnify Pro</h1>
                <h2 class="text-xl sm:text-2xl font-bold">Solution</h2>
                <p id="question-display" class="text-sm text-gray-600 dark:text-gray-400 mt-1"></p>
            </header>
            
            <!-- Loading -->
            <div id="loading-container" class="mt-8 text-center">
                <div class="w-20 h-20 mx-auto">
                    <lottie-player src="https://assets2.lottiefiles.com/packages/lf20_h9kds1my.json" background="transparent" speed="1" loop autoplay></lottie-player>
                </div>
                <p class="mt-2 text-sm">Generating solution...</p>
                <div class="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    <p>Analyzing question...</p>
                    <p class="mt-1">Searching knowledge base...</p>
                </div>
            </div>
            
            <!-- Results -->
            <div id="results-container" class="hidden">
                <!-- Solution Tabs -->
                <div class="flex border-b border-gray-200 dark:border-gray-700">
                    <button class="tab-btn py-2 px-4 border-b-2 border-purple-500 font-medium text-sm" data-tab="solution">
                        Solution
                    </button>
                    <button class="tab-btn py-2 px-4 text-gray-500 dark:text-gray-400 font-medium text-sm" data-tab="explanation">
                        Explanation
                    </button>
                    <button class="tab-btn py-2 px-4 text-gray-500 dark:text-gray-400 font-medium text-sm" data-tab="resources">
                        Resources
                    </button>
                </div>
                
                <!-- Tab Contents -->
                <div id="solution-tab" class="tab-content py-4">
                    <div id="solution-content" class="space-y-4">
                        <!-- Solution content here -->
                    </div>
                </div>
                
                <div id="explanation-tab" class="tab-content py-4 hidden">
                    <div id="explanation-content" class="space-y-3">
                        <!-- Explanation content here -->
                    </div>
                </div>
                
                <div id="resources-tab" class="tab-content py-4 hidden">
                    <div id="resources-content" class="space-y-3">
                        <!-- Resources content here -->
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button id="new-question-btn" class="card p-3 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        <span class="text-xl">🔄</span>
                        <h3 class="font-medium text-xs mt-1">New Question</h3>
                    </button>
                    <button id="save-solution-btn" class="card p-3 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        <span class="text-xl">💾</span>
                        <h3 class="font-medium text-xs mt-1">Save Solution</h3>
                    </button>
                    <button id="share-solution-btn" class="card p-3 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        <span class="text-xl">📤</span>
                        <h3 class="font-medium text-xs mt-1">Share</h3>
                    </button>
                    <button id="print-solution-btn" class="card p-3 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        <span class="text-xl">🖨️</span>
                        <h3 class="font-medium text-xs mt-1">Print</h3>
                    </button>
                </div>
                
                <!-- Feedback -->
                <div class="mt-6 card p-3">
                    <h3 class="text-sm font-medium mb-2">Was this solution helpful?</h3>
                    <div class="flex gap-2">
                        <button class="feedback-btn bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-xs" data-feedback="helpful">
                            <i class="fas fa-thumbs-up mr-1"></i>Helpful
                        </button>
                        <button class="feedback-btn bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-3 py-1 rounded-full text-xs" data-feedback="not-helpful">
                            <i class="fas fa-thumbs-down mr-1"></i>Not Helpful
                        </button>
                    </div>
                </div>
            </div>
        </section>

    </main>

    <!-- AI Helper Button -->
    <button id="ai-helper-btn" class="fixed bottom-4 right-4 bg-gradient-to-r from-purple-600 to-pink-500 h-12 w-12 rounded-full flex items-center justify-center shadow-lg hover:from-purple-700 hover:to-pink-600 transition-transform transform hover:scale-105 z-30">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
    </button>

    <!-- Math Equation Modal -->
    <div id="math-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-md">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-semibold">Insert Math Equation</h3>
                <button id="close-math-modal" class="text-gray-500 dark:text-gray-400">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="grid grid-cols-4 gap-2 mb-4">
                <button class="math-symbol bg-gray-100 dark:bg-gray-700 p-2 rounded">+</button>
                <button class="math-symbol bg-gray-100 dark:bg-gray-700 p-2 rounded">-</button>
                <button class="math-symbol bg-gray-100 dark:bg-gray-700 p-2 rounded">×</button>
                <button class="math-symbol bg-gray-100 dark:bg-gray-700 p-2 rounded">÷</button>
                <button class="math-symbol bg-gray-100 dark:bg-gray-700 p-2 rounded">=</button>
                <button class="math-symbol bg-gray-100 dark:bg-gray-700 p-2 rounded">√</button>
                <button class="math-symbol bg-gray-100 dark:bg-gray-700 p-2 rounded">^</button>
                <button class="math-symbol bg-gray-100 dark:bg-gray-700 p-2 rounded">π</button>
                <button class="math-symbol bg-gray-100 dark:bg-gray-700 p-2 rounded">(</button>
                <button class="math-symbol bg-gray-100 dark:bg-gray-700 p-2 rounded">)</button>
                <button class="math-symbol bg-gray-100 dark:bg-gray-700 p-2 rounded">{</button>
                <button class="math-symbol bg-gray-100 dark:bg-gray-700 p-2 rounded">}</button>
                <button class="math-symbol bg-gray-100 dark:bg-gray-700 p-2 rounded">α</button>
                <button class="math-symbol bg-gray-100 dark:bg-gray-700 p-2 rounded">β</button>
                <button class="math-symbol bg-gray-100 dark:bg-gray-700 p-2 rounded">θ</button>
                <button class="math-symbol bg-gray-100 dark:bg-gray-700 p-2 rounded">∞</button>
            </div>
            <div class="flex gap-2">
                <input type="text" id="math-equation-input" class="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-700" placeholder="Or type your equation">
                <button id="insert-math-btn" class="bg-purple-500 text-white px-3 py-2 rounded">Insert</button>
            </div>
        </div>
    </div>

<script>
// Frontend JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    const config = {
        apiEndpoint: window.location.origin + '/api',
        maxQuestionLength: 1000,
        maxImageSizeMB: 5,
        recordingTimeLimit: 60
    };

    // State Management
    const state = {
        selectedSubject: null,
        selectedClass: null,
        selectedMethod: null,
        currentQuestion: null,
        questionImage: null,
        audioRecorder: null,
        audioChunks: [],
        isRecording: false,
        isDarkMode: false,
        aiHelperOpen: false,
        activeTab: 'solution',
        sessionId: null
    };

    // DOM Elements
    const elements = {
        pages: {
            welcome: document.getElementById('welcome-page'),
            subject: document.getElementById('subject-page'),
            method: document.getElementById('method-page'),
            question: document.getElementById('question-page'),
            results: document.getElementById('results-page')
        },
        buttons: {
            getStarted: document.getElementById('get-started-btn'),
            continue: document.getElementById('continue-btn'),
            back: document.getElementById('back-btn'),
            backToMethod: document.getElementById('back-to-method-btn'),
            start: document.getElementById('start-btn'),
            submit: document.getElementById('submit-btn'),
            upload: document.getElementById('upload-btn'),
            removeImage: document.getElementById('remove-image-btn'),
            retakeImage: document.getElementById('retake-image-btn'),
            record: document.getElementById('record-btn'),
            newQuestion: document.getElementById('new-question-btn'),
            saveSolution: document.getElementById('save-solution-btn'),
            shareSolution: document.getElementById('share-solution-btn'),
            printSolution: document.getElementById('print-solution-btn'),
            themeToggle: document.getElementById('theme-toggle'),
            themeIcon: document.getElementById('theme-icon'),
            aiHelperBtn: document.getElementById('ai-helper-btn'),
            closeHelper: document.getElementById('close-helper'),
            aiHelperSend: document.getElementById('ai-helper-send'),
            clearText: document.getElementById('clear-text-btn'),
            mathEquation: document.getElementById('math-equation-btn'),
            showExample: document.getElementById('show-example-btn'),
            showFormula: document.getElementById('show-formula-btn'),
            showDiagram: document.getElementById('show-diagram-btn'),
            closeMathModal: document.getElementById('close-math-modal'),
            insertMath: document.getElementById('insert-math-btn')
        },
        containers: {
            textInput: document.getElementById('text-input-container'),
            imageInput: document.getElementById('image-input-container'),
            voiceInput: document.getElementById('voice-input-container'),
            imagePreview: document.getElementById('image-preview'),
            recordingStatus: document.getElementById('recording-status'),
            loading: document.getElementById('loading-container'),
            results: document.getElementById('results-container'),
            aiHelperBubble: document.getElementById('ai-helper-bubble'),
            aiHelperMessages: document.getElementById('ai-helper-messages'),
            mathModal: document.getElementById('math-modal')
        },
        inputs: {
            questionText: document.getElementById('question-text'),
            imageUpload: document.getElementById('image-upload'),
            previewImg: document.getElementById('preview-img'),
            transcript: document.getElementById('transcript'),
            aiHelperInput: document.getElementById('ai-helper-input'),
            mathEquationInput: document.getElementById('math-equation-input')
        },
        displays: {
            selection: document.getElementById('selection-display'),
            method: document.getElementById('current-method-display'),
            question: document.getElementById('question-display'),
            solution: document.getElementById('solution-content'),
            explanation: document.getElementById('explanation-content'),
            resources: document.getElementById('resources-content')
        },
        tabs: {
            solution: document.getElementById('solution-tab'),
            explanation: document.getElementById('explanation-tab'),
            resources: document.getElementById('resources-tab')
        }
    };

    // Utility Functions
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg ${
            type === 'error' ? 'bg-red-500 text-white' : 
            type === 'success' ? 'bg-green-500 text-white' : 'bg-gray-800 text-white'
        }`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Initialize App
    async function initialize() {
        // Check for saved theme preference
        if (localStorage.getItem('theme') === 'dark' || 
            (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            enableDarkMode();
        } else {
            disableDarkMode();
        }

        // Create a new session
        try {
            const response = await fetch(`${config.apiEndpoint}/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const data = await response.json();
            state.sessionId = data.sessionId;
        } catch (error) {
            console.error('Failed to create session:', error);
            state.sessionId = 'session-' + Math.random().toString(36).substring(2, 15);
        }

        showPage('welcome');
        createClassChips();
        setupEventListeners();
        updateButtonStates();
    }

    // Theme Management
    function enableDarkMode() {
        document.documentElement.classList.add('dark');
        state.isDarkMode = true;
        localStorage.setItem('theme', 'dark');
        elements.buttons.themeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />`;
    }

    function disableDarkMode() {
        document.documentElement.classList.remove('dark');
        state.isDarkMode = false;
        localStorage.setItem('theme', 'light');
        elements.buttons.themeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />`;
    }

    function toggleTheme() {
        if (state.isDarkMode) {
            disableDarkMode();
        } else {
            enableDarkMode();
        }
    }

    // AI Helper Functions
    function toggleAIHelper() {
        state.aiHelperOpen = !state.aiHelperOpen;
        if (state.aiHelperOpen) {
            elements.containers.aiHelperBubble.classList.add('active');
            elements.inputs.aiHelperInput.focus();
        } else {
            elements.containers.aiHelperBubble.classList.remove('active');
        }
    }

    function addAIMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `rounded-lg p-2 mb-1 text-sm ${isUser ? 'bg-purple-100 dark:bg-purple-900 ml-6' : 'bg-gray-100 dark:bg-gray-700'}`;
        messageDiv.textContent = message;
        elements.containers.aiHelperMessages.appendChild(messageDiv);
        elements.containers.aiHelperMessages.scrollTop = elements.containers.aiHelperMessages.scrollHeight;
    }

    function handleAIHelperQuery() {
        const query = elements.inputs.aiHelperInput.value.trim();
        if (!query) return;
        
        if (query.length > config.maxQuestionLength) {
            showToast(`Please keep questions under ${config.maxQuestionLength} characters`, 'error');
            return;
        }

        addAIMessage(query, true);
        elements.inputs.aiHelperInput.value = '';
        
        // Simulate AI response
        setTimeout(() => {
            const responses = {
                'math': "To solve math problems, first identify what's being asked and the relevant formulas. Break the problem into smaller steps and solve systematically.",
                'science': "For science questions, focus on understanding the underlying concepts. Relate the question to real-world examples to better grasp the principles.",
                'english': "When analyzing literature, consider themes, character development, and the author's techniques. Support your points with textual evidence.",
                'help': "I can help with math problems, science concepts, literature analysis, history questions, and general knowledge. Be specific with your questions!",
                'default': "I'd be happy to help with that. Could you provide more details about what specifically you're struggling with?"
            };
            
            let response = responses.default;
            const queryLower = query.toLowerCase();
            if (queryLower.includes('math')) response = responses.math;
            else if (queryLower.includes('science')) response = responses.science;
            else if (queryLower.includes('english') || queryLower.includes('literature')) response = responses.english;
            else if (queryLower.includes('help')) response = responses.help;
            
            addAIMessage(response);
        }, 1000);
    }

    // Page Navigation
    function showPage(pageId) {
        Object.values(elements.pages).forEach(page => page.style.display = 'none');
        if (elements.pages[pageId]) {
            elements.pages[pageId].style.display = 'block';
        }
    }

    // Dynamic UI Creation
    function createClassChips() {
        const container = document.getElementById('class-chips');
        container.innerHTML = '';
        
        for (let i = 1; i <= 12; i++) {
            const chip = document.createElement('button');
            chip.className = 'class-chip bg-gray-100 dark:bg-gray-700 text-sm font-medium py-1 px-3 rounded-full cursor-pointer';
            chip.textContent = i;
            chip.dataset.class = i;
            container.appendChild(chip);
        }
    }

    // Event Listeners Setup
    function setupEventListeners() {
        // Navigation
        elements.buttons.getStarted.addEventListener('click', () => showPage('subject'));
        elements.buttons.continue.addEventListener('click', handleContinue);
        elements.buttons.back.addEventListener('click', () => showPage('subject'));
        elements.buttons.backToMethod.addEventListener('click', () => showPage('method'));
        elements.buttons.start.addEventListener('click', handleStart);
        elements.buttons.newQuestion.addEventListener('click', () => {
            resetQuestionState();
            showPage('method');
        });
        
        // Question Input
        elements.buttons.submit.addEventListener('click', handleSubmit);
        elements.buttons.upload.addEventListener('click', () => elements.inputs.imageUpload.click());
        elements.buttons.removeImage.addEventListener('click', removeImage);
        elements.buttons.retakeImage.addEventListener('click', () => elements.inputs.imageUpload.click());
        elements.inputs.imageUpload.addEventListener('change', handleImageUpload);
        elements.buttons.record.addEventListener('click', toggleRecording);
        elements.inputs.questionText.addEventListener('input', updateButtonStates);
        elements.buttons.clearText.addEventListener('click', () => {
            elements.inputs.questionText.value = '';
            updateButtonStates();
        });
        elements.buttons.mathEquation.addEventListener('click', () => {
            elements.containers.mathModal.classList.remove('hidden');
        });
        elements.buttons.closeMathModal.addEventListener('click', () => {
            elements.containers.mathModal.classList.add('hidden');
        });
        elements.buttons.insertMath.addEventListener('click', insertMathEquation);
        
        // Math symbol buttons
        document.querySelectorAll('.math-symbol').forEach(button => {
            button.addEventListener('click', () => {
                elements.inputs.mathEquationInput.value += button.textContent;
            });
        });
        
        // Selection Cards
        document.querySelectorAll('.subject-card').forEach(card => {
            card.addEventListener('click', handleSubjectSelection);
        });
        
        document.querySelectorAll('.method-card').forEach(card => {
            card.addEventListener('click', handleMethodSelection);
        });
        
        document.querySelectorAll('.class-chip').forEach(chip => {
            chip.addEventListener('click', handleClassSelection);
        });

        // Solution Tabs
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', handleTabChange);
        });

        // Feedback buttons
        document.querySelectorAll('.feedback-btn').forEach(btn => {
            btn.addEventListener('click', handleFeedback);
        });

        // Additional options
        elements.buttons.showExample.addEventListener('click', showExample);
        elements.buttons.showFormula.addEventListener('click', showFormula);
        elements.buttons.showDiagram.addEventListener('click', showDiagram);
        elements.buttons.saveSolution.addEventListener('click', saveSolution);
        elements.buttons.shareSolution.addEventListener('click', shareSolution);
        elements.buttons.printSolution.addEventListener('click', printSolution);

        // Theme Toggle
        elements.buttons.themeToggle.addEventListener('click', toggleTheme);

        // AI Helper
        elements.buttons.aiHelperBtn.addEventListener('click', toggleAIHelper);
        elements.buttons.closeHelper.addEventListener('click', toggleAIHelper);
        elements.buttons.aiHelperSend.addEventListener('click', handleAIHelperQuery);
        elements.inputs.aiHelperInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleAIHelperQuery();
            }
        });

        // Drag and drop for image upload
        const dropArea = document.querySelector('#image-input-container .card');
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });

        function highlight() {
            dropArea.classList.add('border-purple-500', 'bg-purple-50', 'dark:bg-purple-900', 'dark:bg-opacity-20');
        }

        function unhighlight() {
            dropArea.classList.remove('border-purple-500', 'bg-purple-50', 'dark:bg-purple-900', 'dark:bg-opacity-20');
        }

        dropArea.addEventListener('drop', handleDrop, false);

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                elements.inputs.imageUpload.files = files;
                handleImageUpload({ target: elements.inputs.imageUpload });
            }
        }
    }

    // Event Handlers
    function handleSubjectSelection(event) {
        const selectedCard = event.currentTarget;
        state.selectedSubject = selectedCard.dataset.subject;
        
        document.querySelectorAll('.subject-card').forEach(card => card.classList.remove('active-selection'));
        selectedCard.classList.add('active-selection');
        
        updateButtonStates();
    }

    function handleClassSelection(event) {
        const selectedChip = event.currentTarget;
        state.selectedClass = selectedChip.dataset.class;
        
        document.querySelectorAll('.class-chip').forEach(chip => chip.classList.remove('active-selection'));
        selectedChip.classList.add('active-selection');
        
        updateButtonStates();
    }

    function handleContinue() {
        if (state.selectedSubject && state.selectedClass) {
            updateSelectionDisplay();
            showPage('method');
        }
    }
    
    function handleMethodSelection(event) {
        const selectedCard = event.currentTarget;
        state.selectedMethod = selectedCard.dataset.method;
        
        document.querySelectorAll('.method-card').forEach(card => card.classList.remove('active-selection'));
        selectedCard.classList.add('active-selection');
        
        updateButtonStates();
    }
    
    function handleStart() {
        if (state.selectedMethod) {
            updateMethodDisplay();
            showQuestionInput();
            showPage('question');
        }
    }
    
    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate image size
        if (file.size > config.maxImageSizeMB * 1024 * 1024) {
            showToast(`Please upload images smaller than ${config.maxImageSizeMB}MB`, 'error');
            return;
        }
        
        // Validate image type
        if (!file.type.match('image.*')) {
            showToast('Please upload a valid image file', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            elements.inputs.previewImg.src = e.target.result;
            elements.containers.imagePreview.classList.remove('hidden');
            state.questionImage = file;
            updateButtonStates();
        };
        reader.readAsDataURL(file);
    }
    
    function removeImage() {
        elements.inputs.imageUpload.value = '';
        elements.containers.imagePreview.classList.add('hidden');
        state.questionImage = null;
        updateButtonStates();
    }
    
    async function toggleRecording() {
        if (!state.isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                state.audioRecorder = new MediaRecorder(stream);
                state.audioChunks = [];
                
                state.audioRecorder.ondataavailable = event => {
                    state.audioChunks.push(event.data);
                };
                
                state.audioRecorder.onstop = async () => {
                    const audioBlob = new Blob(state.audioChunks, { type: 'audio/wav' });
                    // In a real app, you would send this to the backend for processing
                    simulateSpeechRecognition();
                };
                
                state.audioRecorder.start();
                state.isRecording = true;
                elements.buttons.record.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                    Stop
                `;
                elements.containers.recordingStatus.classList.remove('hidden');
                
                // Auto-stop after time limit
                setTimeout(() => {
                    if (state.isRecording) {
                        toggleRecording();
                    }
                }, config.recordingTimeLimit * 1000);
                
            } catch (error) {
                console.error('Microphone access error:', error);
                showToast('Could not access microphone. Please check permissions.', 'error');
            }
        } else {
            state.audioRecorder.stop();
            state.audioRecorder.stream.getTracks().forEach(track => track.stop());
            state.isRecording = false;
            elements.buttons.record.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Start
            `;
        }
    }
    
    async function handleSubmit() {
        // Validate input based on method
        if (state.selectedMethod === 'Text' && !elements.inputs.questionText.value.trim()) {
            showToast('Please enter your question', 'error');
            return;
        } else if (state.selectedMethod === 'Image' && !state.questionImage) {
            showToast('Please upload an image', 'error');
            return;
        } else if (state.selectedMethod === 'Voice' && !elements.inputs.transcript.textContent) {
            showToast('Please record your question', 'error');
            return;
        }
        
        // Set the current question
        if (state.selectedMethod === 'Text') {
            state.currentQuestion = elements.inputs.questionText.value.trim();
        } else if (state.selectedMethod === 'Image') {
            state.currentQuestion = "Image question: " + state.questionImage.name;
        } else if (state.selectedMethod === 'Voice') {
            state.currentQuestion = elements.inputs.transcript.textContent;
        }
        
        if (state.currentQuestion) {
            elements.displays.question.textContent = state.currentQuestion;
            showPage('results');
            showLoading();
            
            try {
                let response;
                
                if (state.selectedMethod === 'Text') {
                    response = await fetch(`${config.apiEndpoint}/solve/text`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            question: state.currentQuestion,
                            subject: state.selectedSubject,
                            classLevel: state.selectedClass,
                            sessionId: state.sessionId
                        })
                    });
                } 
                else if (state.selectedMethod === 'Image') {
                    const formData = new FormData();
                    formData.append('image', state.questionImage);
                    formData.append('subject', state.selectedSubject);
                    formData.append('classLevel', state.selectedClass);
                    formData.append('sessionId', state.sessionId);
                    
                    response = await fetch(`${config.apiEndpoint}/solve/image`, {
                        method: 'POST',
                        body: formData
                    });
                }
                else if (state.selectedMethod === 'Voice') {
                    const formData = new FormData();
                    const audioBlob = new Blob(state.audioChunks, { type: 'audio/wav' });
                    formData.append('audio', audioBlob, 'recording.wav');
                    formData.append('subject', state.selectedSubject);
                    formData.append('classLevel', state.selectedClass);
                    formData.append('sessionId', state.sessionId);
                    
                    response = await fetch(`${config.apiEndpoint}/solve/voice`, {
                        method: 'POST',
                        body: formData
                    });
                }
                
                if (!response.ok) throw new Error('API request failed');
                const data = await response.json();
                displaySolution(data);
                
            } catch (error) {
                console.error("Error processing question:", error);
                showToast('Error processing your question. Please try again.', 'error');
                // Fallback to simulated response
                const fallbackResponse = await generateSolution(state.currentQuestion, state.selectedSubject, state.selectedClass);
                displaySolution(fallbackResponse);
            }
        }
    }
    
    function handleTabChange(event) {
        const tabId = event.currentTarget.dataset.tab;
        state.activeTab = tabId;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(tab => {
            if (tab.dataset.tab === tabId) {
                tab.classList.add('border-purple-500', 'text-gray-800', 'dark:text-gray-200');
                tab.classList.remove('text-gray-500', 'dark:text-gray-400');
            } else {
                tab.classList.remove('border-purple-500', 'text-gray-800', 'dark:text-gray-200');
                tab.classList.add('text-gray-500', 'dark:text-gray-400');
            }
        });
        
        // Show active tab content
        Object.values(elements.tabs).forEach(tab => tab.classList.add('hidden'));
        elements.tabs[tabId].classList.remove('hidden');
    }

    function handleFeedback(event) {
        const feedbackType = event.currentTarget.dataset.feedback;
        const feedbackMessage = document.createElement('div');
        feedbackMessage.className = 'text-center text-sm text-green-600 dark:text-green-400 mt-2';
        feedbackMessage.textContent = feedbackType === 'helpful' ? 'Thanks for your feedback!' : 'We\'ll try to improve!';
        
        // Remove any existing feedback message
        const existingFeedback = document.querySelector('.feedback-message');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        feedbackMessage.classList.add('feedback-message');
        event.currentTarget.parentNode.appendChild(feedbackMessage);
        
        // In a real app, you would send this feedback to your server
        console.log(`Feedback: ${feedbackType} for question: ${state.currentQuestion}`);
    }

    function insertMathEquation() {
        const equation = elements.inputs.mathEquationInput.value.trim();
        if (equation) {
            const cursorPos = elements.inputs.questionText.selectionStart;
            const textBefore = elements.inputs.questionText.value.substring(0, cursorPos);
            const textAfter = elements.inputs.questionText.value.substring(cursorPos);
            
            elements.inputs.questionText.value = textBefore + ' ' + equation + ' ' + textAfter;
            elements.inputs.mathEquationInput.value = '';
            elements.containers.mathModal.classList.add('hidden');
            updateButtonStates();
        }
    }

    function showExample() {
        const examples = {
            'Mathematics': "Solve for x: 2x + 5 = 15",
            'Science': "Explain Newton's Third Law of Motion",
            'English': "Analyze the theme of Romeo and Juliet",
            'Nepali': "मुनामदन कविताको विषयवस्तु के हो?",
            'Social Studies': "What caused the French Revolution?",
            'General Knowledge': "What are the functions of the United Nations?"
        };
        
        const example = examples[state.selectedSubject] || "Example question about " + state.selectedSubject;
        
        if (state.selectedMethod === 'Text') {
            elements.inputs.questionText.value = example;
        } else if (state.selectedMethod === 'Voice') {
            elements.inputs.transcript.textContent = example;
        }
        
        updateButtonStates();
    }

    function showFormula() {
        if (state.selectedSubject === 'Mathematics') {
            const formula = "Quadratic formula: x = [-b ± √(b² - 4ac)] / 2a";
            showToast(`Common formula: ${formula}`, 'info');
        } else if (state.selectedSubject === 'Science') {
            const formula = "Newton's Second Law: F = ma (Force = mass × acceleration)";
            showToast(`Common formula: ${formula}`, 'info');
        } else {
            showToast(`No specific formula for ${state.selectedSubject}. Check the examples for guidance.`, 'info');
        }
    }

    function showDiagram() {
        showToast(`Diagram for ${state.selectedSubject} would be displayed here in a full implementation.`, 'info');
    }

    function saveSolution() {
        showToast('Solution saved to your history!', 'success');
    }

    function shareSolution() {
        if (navigator.share) {
            navigator.share({
                title: 'Learnify Pro Solution',
                text: `Check out this solution for ${state.selectedSubject}`,
                url: window.location.href
            }).catch(err => {
                console.log('Error sharing:', err);
                showToast('Sharing failed. Please try another method.', 'error');
            });
        } else {
            showToast('Web Share API not supported in your browser', 'info');
        }
    }

    function printSolution() {
        showToast('Print functionality would open print dialog here', 'info');
    }

    // UI Update Functions
    function updateButtonStates() {
        // Continue Button
        elements.buttons.continue.disabled = !(state.selectedSubject && state.selectedClass);
        elements.buttons.continue.classList.toggle('disabled-btn', !(state.selectedSubject && state.selectedClass));
        
        // Start Button
        elements.buttons.start.disabled = !state.selectedMethod;
        elements.buttons.start.classList.toggle('disabled-btn', !state.selectedMethod);
        elements.buttons.start.textContent = state.selectedMethod ? `Start with ${state.selectedMethod}` : 'Select a Method';
        
        // Submit Button
        let isValid = false;
        if (state.selectedMethod === 'Text') {
            isValid = elements.inputs.questionText.value.trim().length > 0;
        } else if (state.selectedMethod === 'Image') {
            isValid = state.questionImage !== null;
        } else if (state.selectedMethod === 'Voice') {
            isValid = elements.inputs.transcript.textContent.length > 0;
        }
        
        elements.buttons.submit.disabled = !isValid;
        elements.buttons.submit.classList.toggle('disabled-btn', !isValid);
    }
    
    function updateSelectionDisplay() {
        if (state.selectedClass && state.selectedSubject) {
            elements.displays.selection.textContent = `Class ${state.selectedClass} - ${state.selectedSubject}`;
        }
    }
    
    function updateMethodDisplay() {
        if (state.selectedMethod) {
            elements.displays.method.textContent = `Method: ${state.selectedMethod} Input`;
        }
    }
    
    function showQuestionInput() {
        elements.containers.textInput.classList.add('hidden');
        elements.containers.imageInput.classList.add('hidden');
        elements.containers.voiceInput.classList.add('hidden');
        
        if (state.selectedMethod === 'Text') {
            elements.containers.textInput.classList.remove('hidden');
        } else if (state.selectedMethod === 'Image') {
            elements.containers.imageInput.classList.remove('hidden');
            removeImage();
        } else if (state.selectedMethod === 'Voice') {
            elements.containers.voiceInput.classList.remove('hidden');
            elements.inputs.transcript.textContent = '';
            elements.containers.recordingStatus.classList.add('hidden');
        }
    }
    
    function showLoading() {
        elements.containers.loading.classList.remove('hidden');
        elements.containers.results.classList.add('hidden');
    }
    
    function showResults() {
        elements.containers.loading.classList.add('hidden');
        elements.containers.results.classList.remove('hidden');
        
        // Set active tab to solution
        document.querySelector('.tab-btn[data-tab="solution"]').click();
    }
    
    function displaySolution(apiResponse) {
        if (!apiResponse) {
            showToast('Error generating solution', 'error');
            return;
        }
        
        // Update all tab contents
        elements.displays.solution.innerHTML = apiResponse.solution || '';
        elements.displays.explanation.innerHTML = apiResponse.explanation || '';
        elements.displays.resources.innerHTML = apiResponse.resources ? 
            apiResponse.resources.map(res => `<div class="card p-3">${res}</div>`).join('') : '';
        
        showResults();
    }
    
    function resetQuestionState() {
        if (state.selectedMethod === 'Text') {
            elements.inputs.questionText.value = '';
        } else if (state.selectedMethod === 'Image') {
            removeImage();
        } else if (state.selectedMethod === 'Voice') {
            elements.inputs.transcript.textContent = '';
        }
        
        state.currentQuestion = null;
        updateButtonStates();
    }

    // Simulation Functions
    function simulateSpeechRecognition() {
        setTimeout(() => {
            const questions = {
                'Mathematics': "How do I solve quadratic equations?",
                'Science': "Explain Newton's laws of motion",
                'English': "Analyze the theme of Romeo and Juliet",
                'Nepali': "मुनामदन कविताको विषयवस्तु के हो?",
                'Social Studies': "What caused the French Revolution?",
                'General Knowledge': "What are the functions of the United Nations?"
            };
            
            elements.inputs.transcript.textContent = questions[state.selectedSubject] || "This is a simulated voice question about " + state.selectedSubject;
            updateButtonStates();
        }, 1000);
    }

    // Start the App
    initialize();
});
</script>
`;

// Serve frontend
app.get('/', (req, res) => {
    res.send(frontendHTML);
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the app at: http://localhost:${PORT}`);
});