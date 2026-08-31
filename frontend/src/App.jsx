import { useEffect, useState } from 'react'
import axios from 'axios'
import LandingScreen from './components/LandingScreen'
import OptionsScreen from './components/OptionsScreen' 
import PlanConfirmation from './components/PlanConfirmation'
import InterviewScreen from './components/InterviewScreen'
import ReportScreen from './components/ReportScreen'
import History from './components/History'
import AuthPage from './components/AuthPage'
import PasswordResetPage from './components/PasswordResetPage'
import ProtectedRoute from './components/ProtectedRoute'
import StudentDashboard from './components/StudentDashboard'
import CompanyDashboard from './components/CompanyDashboard'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './styles/App.css'

const API_BASE = 'http://localhost:8000'

function InterviewWorkspace() {
  const [screen, setScreen] = useState('landing') // landing, history, options, plan, interview, report
  const [reportSource, setReportSource] = useState('interview') // 'interview' | 'history'
  const [options, setOptions] = useState(null)
  const [interviewPlan, setInterviewPlan] = useState(null)
  const [sessionData, setSessionData] = useState({
    transcript: [],
    codeHistory: [],
    engagementLog: [],
    currentSegmentIndex: 0,
  })
  const [report, setReport] = useState(null)
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('vizion-interview-history')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  useEffect(() => {
    localStorage.setItem('vizion-interview-history', JSON.stringify(history))
  }, [history])

  // Step 1: Generate Options
  const handleGenerateOptions = async (topic) => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.post(`${API_BASE}/api/generate-options`, {
        topic: topic,
      })
      setOptions(response.data.options)
      setScreen('options')
      setLoading(false)
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to generate options. Please check your API configuration.'
      setError(errorMessage)
      setLoading(false)
    }
  }

  // Step 2: Generate Plan from selected option
  const handleGeneratePlan = async (selectedOption) => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.post(`${API_BASE}/api/generate-plan`, {
        raw_request: JSON.stringify(selectedOption),
      })
      setInterviewPlan(response.data)
      setScreen('plan')
      setLoading(false)
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to generate interview plan'
      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleConfirmPlan = () => {
    setScreen('interview')
    setSessionData({
      transcript: [],
      codeHistory: [],
      engagementLog: [],
      currentSegmentIndex: 0,
    })
  }

  const handleRejectPlan = () => {
    setScreen('landing')
    setInterviewPlan(null)
    setOptions(null)
  }

  const handleFinishInterview = async (finalSessionData) => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.post(`${API_BASE}/api/generate-report`, {
        plan: interviewPlan.segments,
        full_transcript: finalSessionData.transcript,
        code_history: finalSessionData.codeHistory,
        engagement_log: finalSessionData.engagementLog,
      })

      const payload = response?.data && typeof response.data === 'object'
        ? response.data
        : {}

      setReport(payload)
      setHistory((previous) => [{
        id: `${Date.now()}`,
        createdAt: new Date().toISOString(),
        plan: interviewPlan,
        sessionData: finalSessionData,
        report: payload,
      }, ...previous].slice(0, 50))
      
      setReportSource('interview') // Track origin: Interview
      setScreen('report')
      setLoading(false)
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to generate report'
      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleRestart = () => {
    setScreen('landing')
    setInterviewPlan(null)
    setOptions(null)
    setSessionData({
      transcript: [],
      codeHistory: [],
      engagementLog: [],
      currentSegmentIndex: 0,
    })
    setReport(null)
    setError(null)
  }

  const handleReportBack = () => {
    if (reportSource === 'history') {
      setScreen('history')
    } else {
      handleRestart()
    }
  }

  // Robust delete handler supporting single ID, array of IDs, and 'ALL'
  const handleDeleteHistory = (target) => {
    setHistory((previous) => {
      const updated = target === 'ALL'
        ? []
        : Array.isArray(target)
          ? previous.filter((record) => !target.includes(record.id))
          : previous.filter((record) => record.id !== target)
      
      localStorage.setItem('vizion-interview-history', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <div className="app">
      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button type="button" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="spinner">Loading...</div>
        </div>
      )}

      {screen === 'landing' && (
        <LandingScreen onGenerateOptions={handleGenerateOptions} onNavigate={setScreen} />
      )}

      {screen === 'history' && (
        <History
          history={history}
          onNavigate={setScreen}
          onViewReport={(selectedReport) => {
            setReport(selectedReport)
            setReportSource('history') 
            setScreen('report')
          }}
          onDelete={handleDeleteHistory}
        />
      )}

      {screen === 'options' && options && (
        <OptionsScreen 
          options={options} 
          onSelectOption={handleGeneratePlan} 
          onBack={() => setScreen('landing')} 
        />
      )}

      {screen === 'plan' && interviewPlan && (
        <PlanConfirmation
          plan={interviewPlan}
          onConfirm={handleConfirmPlan}
          onReject={handleRejectPlan}
        />
      )}

      {screen === 'interview' && interviewPlan && (
        <InterviewScreen
          plan={interviewPlan}
          initialSessionData={sessionData}
          onFinish={handleFinishInterview}
        />
      )}

      {screen === 'report' && report && (
        <ReportScreen
          report={report}
          onRestart={handleRestart}
          onBack={handleReportBack}
          reportSource={reportSource}
        />
      )}
    </div>
  )
}

function MockInterviewPage() {
  return <InterviewWorkspace />
}

function App() {
  let savedUser = null
  try {
    savedUser = JSON.parse(localStorage.getItem('vizion-user') || 'null')
  } catch {
    localStorage.removeItem('vizion-user')
  }
  const homePath = savedUser?.role === 'company' ? '/company-dashboard' : savedUser?.role === 'student' ? '/student-dashboard' : '/login'

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicOnlyRoute><AuthPage mode="login" /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><AuthPage mode="register" /></PublicOnlyRoute>} />
        <Route path="/reset-password" element={<PublicOnlyRoute><PasswordResetPage /></PublicOnlyRoute>} />
        <Route path="/student-dashboard/*" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
        <Route path="/mock-interview" element={<ProtectedRoute role="student"><MockInterviewPage /></ProtectedRoute>} />
        <Route path="/company-dashboard" element={<ProtectedRoute role="company"><CompanyDashboard /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to={homePath} replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App