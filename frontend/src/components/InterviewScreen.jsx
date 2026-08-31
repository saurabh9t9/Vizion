import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import axios from 'axios'
import { Activity, Camera, Clock3, Code2, FileText, Mic, Radio, Send, Square, Terminal, UserRound, Volume2, Wifi } from 'lucide-react'
import '../styles/InterviewScreen.css'

const API_BASE = 'http://localhost:8000'
const MAX_FOLLOW_UPS = 3

function looksLikeCodingQuestion(question) {
  if (!question) return false

  const implementationLanguage = /\b(implement|write code|coding task|program|solution|pseudocode)\b/i.test(question)
  const codeSignature = /\b(class\s+[A-Za-z_]\w*|def\s+[A-Za-z_]\w*|function\s+[A-Za-z_]\w*|method\s+[A-Za-z_]\w*|allow_request\s*\()/i.test(question)
  const algorithmLanguage = /\b(algorithm|constraints|edge cases|return true|return false|time complexity|space complexity)\b/i.test(question)

  return codeSignature || (implementationLanguage && algorithmLanguage)
}

function InterviewScreen({ plan, initialSessionData, onFinish }) {
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [transcript, setTranscript] = useState(initialSessionData?.transcript || [])
  const [codeHistory, setCodeHistory] = useState(initialSessionData?.codeHistory || [])
  const [engagementLog, setEngagementLog] = useState(initialSessionData?.engagementLog || [])
  const [currentCode, setCurrentCode] = useState('')
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [userInput, setUserInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [sessionActive, setSessionActive] = useState(true)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [followUpCount, setFollowUpCount] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiCodeEditorVisible, setAiCodeEditorVisible] = useState(false)

  const recognitionRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const codeChangeTimerRef = useRef(null)
  const engagementTimerRef = useRef(null)
  const interviewTimerRef = useRef(null)
  const videoRef = useRef(null)
  const lastSpokenRef = useRef('')
  const segmentsWithFirstQuestionRef = useRef(new Set())
  const cameraStreamRef = useRef(null)
  
  const transcriptEndRef = useRef(null)
  const sessionActiveRef = useRef(true)

  const currentSegment = plan.segments[currentSegmentIndex]
  const isCodingSegment = currentSegment?.type === 'dsa' || currentSegment?.type === 'system_design'
  const showCodeEditor = isCodingSegment || aiCodeEditorVisible || looksLikeCodingQuestion(currentQuestion)

  useEffect(() => {
    setAiCodeEditorVisible(false)
  }, [currentSegmentIndex])

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [transcript])

  const speakText = (text) => {
    if (!text || !('speechSynthesis' in window) || !sessionActiveRef.current) return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1.1
    utterance.volume = 1

    window.speechSynthesis.onvoiceschanged = () => {
      const voices = window.speechSynthesis.getVoices()
      let preferredVoice = voices.find(
        (voice) => voice.lang === 'en-IN' || voice.lang.startsWith('hi-IN')
      )
      if (!preferredVoice) preferredVoice = voices.find((voice) => voice.lang.startsWith('en-IN'))
      if (!preferredVoice) preferredVoice = voices.find((voice) => voice.lang.startsWith('en') && voice.name.toLowerCase().includes('indian'))
      if (!preferredVoice) preferredVoice = voices.find((voice) => voice.lang.startsWith('en') && (voice.name.toLowerCase().includes('female') || voice.name.toLowerCase().includes('woman')))

      if (preferredVoice) utterance.voice = preferredVoice
    }

    utterance.onstart = () => {
      setIsSpeaking(true)
      pauseMicrophoneDuringSpeech()
    }
    utterance.onend = () => {
      setIsSpeaking(false)
      resumeMicrophoneAfterSpeech()
      resetSilenceTimer() 
    }
    utterance.onerror = () => {
      setIsSpeaking(false)
      resumeMicrophoneAfterSpeech()
    }

    lastSpokenRef.current = text
    window.speechSynthesis.speak(utterance)
  }

  const pauseMicrophoneDuringSpeech = () => {
    if (recognitionRef.current && recognitionRef.current.abort) {
      try { recognitionRef.current.abort() } catch (e) {}
    }
  }

  const resumeMicrophoneAfterSpeech = () => {
    setTimeout(() => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition && recognitionRef.current && sessionActiveRef.current) {
        try { recognitionRef.current.start() } catch (e) {}
      }
    }, 100)
  }

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const handleVoicesChanged = () => { window.speechSynthesis.getVoices() }
    window.speechSynthesis.onvoiceschanged = handleVoicesChanged
    return () => { window.speechSynthesis.cancel() }
  }, [])

  useEffect(() => {
    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })
        if (videoRef.current) { videoRef.current.srcObject = stream }
        cameraStreamRef.current = stream
        setCameraEnabled(true)
        setCameraError('')
      } catch (error) {
        setCameraEnabled(false)
        setCameraError('Camera access is blocked. The interview will still work without it.')
      }
    }
    startCamera()
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition && !recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onstart = () => setIsListening(true)
      recognitionRef.current.onend = () => setIsListening(false)

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptText = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            setUserInput((prev) => (prev ? prev + ' ' + transcriptText : transcriptText))
            resetSilenceTimer()
          } else {
            interimTranscript += transcriptText
          }
        }
      }
      recognitionRef.current.start()
    }
    return () => {
      if (recognitionRef.current) { recognitionRef.current.stop() }
    }
  }, [])

  useEffect(() => {
    if (currentSegment && currentSegment.questions && currentSegment.questions.length > 0 && !segmentsWithFirstQuestionRef.current.has(currentSegmentIndex)) {
      const firstQuestion = currentSegment.questions[0].question_text
      setCurrentQuestion(firstQuestion)
      segmentsWithFirstQuestionRef.current.add(currentSegmentIndex)
      
      setTranscript((prev) => [
        ...prev,
        {
          speaker: 'interviewer',
          text: firstQuestion.trim(),
          timestamp: Date.now() / 1000,
          segment_index: currentSegmentIndex,
        },
      ])
      
      setTimeout(() => {
        speakText(firstQuestion)
      }, 300)
    }
  }, [currentSegmentIndex, currentSegment])

  useEffect(() => {
    interviewTimerRef.current = setInterval(() => {
      setTimeElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interviewTimerRef.current)
  }, [])

  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current) }
    silenceTimerRef.current = setTimeout(() => {
      handleInterviewerTurn('silence')
    }, 40000)
  }

  useEffect(() => {
    engagementTimerRef.current = setInterval(() => {
      setEngagementLog((prev) => [
        ...prev,
        { face_detected: true, centered: true, timestamp: Date.now() / 1000 },
      ])
    }, 10000)
    return () => clearInterval(engagementTimerRef.current)
  }, [])

  const addToTranscript = (speaker, text) => {
    const cleanText = text?.trim()
    if (!cleanText) return

    setTranscript((prev) => [
      ...prev,
      {
        speaker,
        text: cleanText,
        timestamp: Date.now() / 1000,
        segment_index: currentSegmentIndex,
      },
    ])

    if (speaker === 'interviewer' && cleanText !== lastSpokenRef.current && sessionActiveRef.current) {
      speakText(cleanText)
    }
  }

  const handleUserSubmit = () => {
    const textToSubmit = userInput.trim()
    if (textToSubmit && !isProcessing) {
      addToTranscript('candidate', textToSubmit)
      setUserInput('')
      resetSilenceTimer()
      setIsProcessing(true)
      handleInterviewerTurn('user_response', textToSubmit)
    }
  }

  const handleCodeSubmit = () => {
    if (!currentCode.trim() || isProcessing) return
    
    const uiMessage = "I have submitted my code for review."
    const backendMessage = `I have submitted my code for review. Here is the code:\n\n${currentCode}`
    
    addToTranscript('candidate', uiMessage)
    resetSilenceTimer()
    setIsProcessing(true)
    handleInterviewerTurn('code_submission', backendMessage)
  }

  const handleCodeChange = (value) => {
    setCurrentCode(value || '')
    if (codeChangeTimerRef.current) { clearTimeout(codeChangeTimerRef.current) }
    codeChangeTimerRef.current = setTimeout(() => {
      setCodeHistory((prev) => [
        ...prev,
        { code: value || '', timestamp: Date.now() / 1000, segment_index: currentSegmentIndex },
      ])
    }, 2000)
  }

  const handleInterviewerTurn = async (triggerReason, pendingUserText = null) => {
    try {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }

      let currentTranscriptForApi = [...transcript]
      
      if (pendingUserText) {
        currentTranscriptForApi.push({
          speaker: 'candidate',
          text: pendingUserText,
          timestamp: Date.now() / 1000,
          segment_index: currentSegmentIndex
        })
      }

      const response = await axios.post(`${API_BASE}/api/interview-turn`, {
        plan: plan.segments,
        current_segment_index: currentSegmentIndex,
        question: currentQuestion,
        current_question_id: currentSegment?.questions?.[currentQuestionIndex]?.question_id || null,
        asked_question_ids: currentSegment?.questions?.[currentQuestionIndex]?.question_id
          ? [currentSegment.questions[currentQuestionIndex].question_id]
          : [],
        follow_up_count: followUpCount,
        transcript: currentTranscriptForApi, 
        current_code: showCodeEditor ? currentCode : null,
        seconds_since_last_activity: Math.random() * 30,
        trigger_reason: triggerReason,
      })

      if (!sessionActiveRef.current) return;

      const interviewerLine = response.data.interviewer_line || response.data.intervener_line || response.data.line || response.data.response || ''
      const advanceSegment = Boolean(response.data.advance_segment)
      const action = response.data.action
      const responseShowsEditor = Boolean(
        response.data.show_code_editor ||
        (response.data.editor_mode && response.data.editor_mode !== 'none')
      )

      if (!isCodingSegment) {
        setAiCodeEditorVisible(responseShowsEditor)
      }
      
      if (interviewerLine) {
        const shouldFollowUp = action === 'follow_up' && followUpCount < MAX_FOLLOW_UPS

        if (shouldFollowUp) {
          addToTranscript('interviewer', interviewerLine)
          setCurrentQuestion(interviewerLine) // Dynamically update prompt box with follow-up probe
          setFollowUpCount((prev) => prev + 1)
        } else {
          const nextQIndex = currentQuestionIndex + 1;

          if (currentSegment.questions && nextQIndex < currentSegment.questions.length) {
            const nextMainQuestion = currentSegment.questions[nextQIndex].question_text;
            const transitionLine = `${interviewerLine} Moving on... ${nextMainQuestion}`;

            addToTranscript('interviewer', transitionLine);
            setCurrentQuestion(nextMainQuestion); // Dynamically update prompt box with next main question
            setCurrentQuestionIndex(nextQIndex);
            setFollowUpCount(0);
          } else {
            addToTranscript('interviewer', interviewerLine);
            setCurrentQuestion(interviewerLine); // Dynamically update prompt box with response line
          }
        }
      }

      if (advanceSegment && currentSegmentIndex < plan.segments.length - 1) {
        setCurrentSegmentIndex((prev) => prev + 1)
        setCurrentQuestionIndex(0)
        setFollowUpCount(0)
        setCurrentCode('')
      } else if (advanceSegment && currentSegmentIndex === plan.segments.length - 1) {
        handleFinishInterview()
      }
    } catch (error) {
      console.error('Error getting interviewer response:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to get interviewer response'
      addToTranscript('system', `⚠️ Error: ${errorMessage}. Please check your API configuration.`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFinishInterview = () => {
    sessionActiveRef.current = false 
    setSessionActive(false)

    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }
    
    onFinish({
      transcript,
      codeHistory,
      engagementLog,
    })
  }

  if (!sessionActive) {
    return null
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="interview-screen">
      <div className="interview-header">
        <div className="segment-progress">
          <div className="progress-meta">
            <span className="eyebrow">SESSION / {String(currentSegmentIndex + 1).padStart(2, '0')}</span>
            <span className="progress-text">{currentSegment?.segment_name || currentSegment?.type}</span>
            <span className="progress-count">{currentSegmentIndex + 1} / {plan.segments.length}</span>
          </div>
          <div className="progress-bar" aria-label={`Segment ${currentSegmentIndex + 1} of ${plan.segments.length}`}>
            <div
              className="progress-fill"
              style={{
                width: `${((currentSegmentIndex + 1) / plan.segments.length) * 100}%`,
              }}
            ></div>
          </div>
        </div>
        <div className="session-clock"><Clock3 size={15} /><span>{formatTime(timeElapsed)}</span></div>
        <div className="connection-status"><Wifi size={13} /> API LINKED</div>
      </div>

      <div className="interview-main">
        <div className="left-panel">
          <div className="interviewer-section">
            <div className="interviewer-avatar"><Activity size={22} /></div>
            <div>
              <div className="interviewer-name"><h3>AI Interviewer</h3><span className="live-badge">LIVE</span></div>
              <div className="live-status">
                <span className="status-dot" /> {isSpeaking ? 'Speaking now' : isListening ? 'Listening for response' : 'Standby'}
              </div>
            </div>
            <div className="interviewer-mode"><Radio size={14} /> ADAPTIVE PROBE</div>
          </div>

          <div className="live-question-box">
            <div className="question-header"><span className="question-label">Current prompt</span><span className="question-index">Q{currentQuestionIndex + 1} / {currentSegment?.questions?.length || 0}</span></div>
            <p>{currentQuestion || 'Preparing your next question...'}</p>
            <div className="question-signal"><span /> Evaluating response depth <b>{followUpCount}/3 probes</b></div>
          </div>

          <div className="transcript-box">
            {transcript.map((entry, index) => (
              <div key={index} className={`transcript-entry ${entry.speaker}`}>
                <span className="speaker">{entry.speaker === 'interviewer' ? <Activity size={14} /> : <UserRound size={14} />}</span>
                <span className="text">{entry.text}</span>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>

          <div className="user-input-section">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type or speak your response..."
              className="user-textarea"
              disabled={isProcessing}
            />
            <button 
              onClick={handleUserSubmit} 
              className="submit-response"
              disabled={isProcessing || !userInput.trim()}
            >
              {isProcessing ? <><Activity size={16} className="spin-icon" /> Processing</> : <><Send size={16} /> Send response</>} {isListening ? <Mic size={14} /> : ''}
            </button>
          </div>
        </div>

        <div className="right-panel">
          <div className="camera-panel">
            <div className="camera-header">
              <h3><Camera size={15} /> Candidate feed</h3>
              <span className={`camera-pill ${cameraEnabled ? 'online' : 'offline'}`}>
                {cameraEnabled ? 'Live' : 'Off'}
              </span>
            </div>

            <div className="camera-frame">
              {cameraEnabled ? (
                <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
              ) : (
                <div className="camera-placeholder">
                  <Camera size={28} />
                  <p>{cameraError || 'Camera preview unavailable'}</p>
                </div>
              )}
            </div>
          </div>

          {showCodeEditor && (
            <div className="code-panel">
              <div className="code-editor-header">
                <h3><Code2 size={15} /> Workspace</h3>
                <span><Terminal size={13} /> {currentSegment?.type?.toUpperCase()}</span>
              </div>
              
              <div style={{ flex: 1, minHeight: 0 }}>
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  value={currentCode}
                  onChange={handleCodeChange}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                  }}
                />
              </div>

              <div style={{ 
                padding: '0.75rem 1.25rem', 
                backgroundColor: 'var(--surface)', 
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end'
              }}>
                <button 
                  onClick={handleCodeSubmit} 
                  className="submit-response" 
                  style={{ padding: '0.6rem 1.5rem', fontSize: '0.95rem' }}
                  disabled={isProcessing || !currentCode.trim()}
                >
                  {isProcessing ? <><Activity size={15} className="spin-icon" /> Processing</> : <><FileText size={15} /> Submit work</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="interview-footer">
        <button onClick={handleFinishInterview} className="finish-button">
          <Square size={13} fill="currentColor" /> End session
        </button>
        <div className="footer-note"><Volume2 size={13} /> Voice capture {isListening ? 'active' : 'paused'} <span>•</span> All responses are timestamped</div>
      </div>
    </div>
  )
}

export default InterviewScreen