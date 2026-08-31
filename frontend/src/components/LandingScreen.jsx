import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, ArrowUpRight, BrainCircuit, Mic, MicOff, Radio, ShieldCheck, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import heroAsset from '../assets/hero.png'
import '../styles/LandingScreen.css'

function LandingScreen({ onGenerateOptions, onNavigate }) {
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)
  const baseInputRef = useRef('')

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in your browser')
      return
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {
        // cleanup previous instance
      }
    }

    // Save existing text before speech starts
    baseInputRef.current = input

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)

    recognition.onresult = (event) => {
      let finalTranscript = ''
      
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        }
      }

      const trimmed = finalTranscript.trim()
      if (trimmed) {
        const base = baseInputRef.current.trim()
        setInput(base ? `${base} ${trimmed}` : trimmed)
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch (err) {
      console.error('Failed to start speech recognition:', err)
      setIsListening(false)
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (err) {
        console.error('Failed to stop speech recognition:', err)
      }
      setIsListening(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim()) {
      onGenerateOptions(input)
    }
  }

  const suggestedTopics = [
    'React frontend developer',
    'Python backend developer',
    'Full-stack engineer',
    'Data scientist',
  ]

  return (
    <div className="landing-screen">
      <header className="landing-nav">
        <div className="brand-mark"><span>V</span> VIZION</div>
        <nav aria-label="Primary navigation">
          <a className="active" href="#home">HOME</a>
          <a href="#history" onClick={(event) => { event.preventDefault(); onNavigate('history') }}>HISTORY</a>
          <Link className="dashboard-nav-link" to="/student-dashboard"><ArrowLeft size={13} /> DASHBOARD</Link>
        </nav>
        <div className="nav-status"><span className="signal-dot" /> SYSTEM ONLINE</div>
      </header>
      <aside className="landing-rail" aria-label="Utility navigation">
        <span className="rail-grid">::</span><span className="rail-line" /><span className="rail-label">VIZION | LIVE-INTERVIEW</span><span className="rail-line" /><span className="rail-index">28 / 07</span>
      </aside>
      <motion.div
        className="landing-content"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
      >
        <div className="landing-kicker"><span className="signal-dot" /> Interview-IQ / Live Assessment System</div>
        <h1>VIZION</h1>
        <p className="subtitle">A high-fidelity interview simulator that adapts to your reasoning, not just your resume.</p>

        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-container">
            <input
              type="text"
              placeholder="Describe the interview you want... (e.g., 'React frontend role')"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="interview-input"
            />
            <button
              type="button"
              className={`mic-button ${isListening ? 'listening' : ''}`}
              onClick={isListening ? stopListening : startListening}
              title={isListening ? 'Stop listening' : 'Start listening'}
            >
              {isListening ? <MicOff size={17} strokeWidth={1.8} /> : <Mic size={17} strokeWidth={1.8} />}
            </button>
          </div>
          <button type="submit" className="submit-button">
            Configure assessment <ArrowUpRight size={16} />
          </button>
        </form>

        <div className="suggested-topics">
          <p className="topics-label">Or try one of these:</p>
          <div className="topic-chips">
            {suggestedTopics.map((topic, idx) => (
              <button
                key={idx}
                type="button"
                className="topic-chip"
                onClick={() => {
                  setInput(topic)
                  onGenerateOptions(topic)
                }}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.aside
        className="landing-telemetry"
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.65, delay: 0.12, ease: 'easeOut' }}
      >
        <div className="telemetry-head"><span>System readout</span><span>v2.4.0 / stable</span></div>
        <div className="telemetry-panel">
          <div className="visual-beacon"><img src={heroAsset} alt="VIZION system core" /></div>
          <BrainCircuit size={24} color="var(--primary-color)" strokeWidth={1.5} />
          <h2 className="telemetry-title">Adaptive interview engine</h2>
          <p className="telemetry-copy">Build a role-specific session with live probing, signal capture, and evidence-based scoring.</p>
          <div className="telemetry-grid">
            <div className="telemetry-cell"><span><Radio size={12} /> Session mode</span><strong>ADAPTIVE</strong></div>
            <div className="telemetry-cell"><span><Sparkles size={12} /> Prompt depth</span><strong>HIGH</strong></div>
            <div className="telemetry-cell"><span><ShieldCheck size={12} /> Evidence</span><strong>TRACEABLE</strong></div>
            <div className="telemetry-cell"><span>Latency target</span><strong>&lt; 1.2s</strong></div>
          </div>
        </div>
      </motion.aside>
    </div>
  )
}

export default LandingScreen