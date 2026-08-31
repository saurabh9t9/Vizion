import { useEffect, useState } from 'react'
import { ArrowLeft, BookOpen, BriefcaseBusiness, Calendar, Check, CheckCircle2, ChevronRight, Clock, CloudSun, Code2, ExternalLink, LayoutDashboard, LogOut, Mail, MapPin, Search, Settings, Sparkles, Target, Trash2, UserRound, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { applyToProblem, deleteAccount, deleteStudentProject, getCompanyProblems, getStudentApplications, getStudentCompetencies, getStudentProfile, getStudentProjects, getStudentStats, submitProject, updateProfilePhoto, updateStudentProfile, withdrawApplication } from '../api'
import ProfilePhotoPicker from './ProfilePhotoPicker'
import '../styles/StudentDashboard.css'

const careerPaths = ['Frontend engineering', 'Backend systems', 'Data and AI', 'Product design']
const interestOptions = ['DSA', 'Python developer', 'Frontend', 'Backend', 'Data science', 'Product']
const skillOptions = ['JavaScript', 'React', 'Python', 'FastAPI', 'SQL', 'Data analysis', 'UI/UX']
const views = [
  ['dashboard', LayoutDashboard, 'Dashboard'], 
  ['profile', UserRound, 'Personal details'], 
  ['practice', Code2, 'Practice problems'], 
  ['projects', BriefcaseBusiness, 'Projects'], 
  ['company', Target, 'Company needs']
]

function StudentDashboard() {
  const navigate = useNavigate()
  const { '*': viewPath } = useParams()
  
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('vizion-user') || '{}'))
  const view = viewPath || 'dashboard'

  const [projects, setProjects] = useState([])
  const [problems, setProblems] = useState([])
  const [applied, setApplied] = useState([])
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [projectForm, setProjectForm] = useState({ career_path: careerPaths[0], title: '', github_url: '' })
  const [profile, setProfile] = useState({ role: 'student', interests: [], skills: [] })
  const [stats, setStats] = useState({ login_streak: 0, average_score: 0, projects: 0, applications: 0, competencies: {} })

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('vizion-user') || '{}')
    if (storedUser.email && storedUser.email !== user.email) {
      setUser(storedUser)
    }
  }, [user.email])

  useEffect(() => {
    if (!user.email) return

    Promise.allSettled([
      getStudentProjects(user.email), 
      getCompanyProblems(), 
      getStudentApplications(user.email), 
      getStudentStats(user.email), 
      getStudentProfile(user.email), 
      getStudentCompetencies(user.email)
    ]).then(([projectResult, problemResult, applicationResult, statsResult, profileResult, competencyResult]) => {
      if (projectResult.status === 'fulfilled') setProjects(projectResult.value.data.projects || [])
      if (problemResult.status === 'fulfilled') setProblems(problemResult.value.data.problems || [])
      if (applicationResult.status === 'fulfilled') setApplied((applicationResult.value.data.applications || []).map((app) => app.problem_id))
      if (statsResult.status === 'fulfilled') {
        const nextStats = { ...statsResult.value.data, competencies: competencyResult.status === 'fulfilled' ? competencyResult.value.data.competencies || {} : {} }
        setStats(nextStats)
        localStorage.setItem('vizion-stats', JSON.stringify(nextStats))
      }
      if (profileResult.status === 'fulfilled') setProfile({ role: 'student', interests: profileResult.value.data.interests || [], skills: profileResult.value.data.skills || [] })
      if ([problemResult, statsResult, profileResult, competencyResult].some((res) => res.status === 'rejected')) {
        setError('Some workspace data is unavailable right now.')
      }
    }).finally(() => setLoading(false))
  }, [user.email])

  useEffect(() => {
    if (!notice) return undefined
    const timeoutId = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(timeoutId)
  }, [notice])

  const notify = (message) => { setNotice(message); setError('') }
  const setView = (nextView) => navigate(nextView === 'dashboard' ? '/student-dashboard' : `/student-dashboard/${nextView}`)
  const logout = () => { localStorage.removeItem('vizion-user'); navigate('/login', { replace: true }) }
  
  const deleteUser = async () => {
    if (!window.confirm('Delete your account permanently? This cannot be undone.')) return
    const password = window.prompt('Enter your password to confirm account deletion.')
    if (password === null) return
    try { 
      await deleteAccount({ email: user.email, password, role: user.role })
      localStorage.removeItem('vizion-user')
      localStorage.removeItem('vizion-profile')
      navigate('/register', { replace: true }) 
    } catch (err) { 
      setError(err.response?.data?.detail || 'Account could not be deleted.') 
    }
  }

  const toggleInterest = (interest) => setProfile({ 
    ...profile, 
    interests: profile.interests.includes(interest) ? profile.interests.filter((item) => item !== interest) : [...profile.interests, interest] 
  })

  const saveProfile = async (nextProfile) => { 
    try { 
      const response = await updateStudentProfile({ student_email: user.email, interests: nextProfile.interests, skills: nextProfile.skills })
      setProfile({ role: 'student', interests: response.data.interests, skills: response.data.skills })
      notify('Personal details saved.') 
    } catch (err) { 
      setError(err.response?.data?.detail || 'Profile could not be saved.') 
    } 
  }

  const savePhoto = async (profilePhoto) => {
    try {
      const response = await updateProfilePhoto({ email: user.email, role: user.role, profile_photo: profilePhoto })
      setUser(response.data.user)
      localStorage.setItem('vizion-user', JSON.stringify(response.data.user))
      notify(profilePhoto ? 'Profile photo updated.' : 'Profile photo removed.')
    } catch (err) { setError(err.response?.data?.detail || 'Profile photo could not be saved.') }
  }

  const updateProject = (event) => setProjectForm({ ...projectForm, [event.target.name]: event.target.value })
  
  const submitProjectForm = async (event) => { 
    event.preventDefault()
    try { 
      const response = await submitProject({ ...projectForm, student_email: user.email })
      setProjects([response.data, ...projects])
      setProjectForm({ ...projectForm, title: '', github_url: '' })
      notify('Project added to your portfolio.') 
    } catch (err) { 
      setError(err.response?.data?.detail || 'Project could not be submitted.') 
    } 
  }

  const deleteProject = async (projectId) => {
    if (!window.confirm('Delete this submitted project?')) return
    try {
      await deleteStudentProject(projectId, user.email)
      setProjects((current) => current.filter((p) => p.id !== projectId))
      notify('Project deleted.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Project could not be deleted.')
    }
  }

  const acceptProblem = async (problem) => { 
    try { 
      await applyToProblem({ problem_id: problem.id, student_email: user.email, student_name: user.name || 'Student' })
      setApplied([...applied, problem.id])
      notify(`Application sent. Contact ${problem.company} at ${problem.company_email}.`) 
    } catch (err) { 
      setError(err.response?.data?.detail || 'Application could not be sent.') 
    } 
  }

  const undoApplication = async (problem) => {
    try {
      await withdrawApplication(problem.id, user.email)
      setApplied((current) => current.filter((id) => id !== problem.id))
      notify('Application withdrawn.')
    } catch (err) { setError(err.response?.data?.detail || 'Application could not be withdrawn.') }
  }

  return (
    <main className="student-dashboard">
      <header className="student-header">
        <Link className="student-logo" to="/student-dashboard"><span>V</span> VIZION</Link>
        <div className="student-header-user">
          <span className="header-avatar">{user.profile_photo ? <img src={user.profile_photo} alt="" /> : <UserRound size={16} />}</span>
          <strong>{user.name || 'Student'}</strong>
          <button type="button" onClick={logout}><LogOut size={15} /> Logout</button>
          <button type="button" className="danger-button" onClick={deleteUser}><Trash2 size={15} /> Delete account</button>
        </div>
      </header>
      <div className="student-layout">
        <aside className="student-sidebar">
          <p className="dashboard-kicker">STUDENT WORKSPACE</p>
          <nav>
            {views.map(([key, Icon, label]) => (
              <button className={view === key ? 'active' : ''} key={key} onClick={() => setView(key)}>
                <Icon size={17} />{label}
              </button>
            ))}
          </nav>
          <Link className="sidebar-interview" to="/mock-interview">
            <Sparkles size={18} />
            <span><strong>Mock Interview</strong><small>Open VIZION practice</small></span>
            <ChevronRight size={15} />
          </Link>
        </aside>
        <section className="student-content">
          {view !== 'dashboard' && <button className="back-button" onClick={() => setView('dashboard')}><ArrowLeft size={15} /> Back to dashboard</button>}
          {notice && <p className="dashboard-notice"><Check size={16} />{notice}</p>}
          {error && <p className="dashboard-error">{error}</p>}
          {loading ? (
            <div className="loading-panel">Loading workspace...</div>
          ) : (
            <>
              {view === 'dashboard' && <DashboardView user={user} projects={projects} applied={applied} score={stats.average_score} stats={stats} setView={setView} />}
              {view === 'profile' && <ProfileView user={user} profile={profile} setProfile={setProfile} toggleInterest={toggleInterest} saveProfile={saveProfile} savePhoto={savePhoto} />}
              {view === 'practice' && <PracticeView notify={notify} setError={setError} />}
              {view === 'projects' && <ProjectView form={projectForm} update={updateProject} projects={projects} submit={submitProjectForm} onDelete={deleteProject} />}
              {view === 'company' && <CompanyView problems={problems} applied={applied} accept={acceptProblem} undo={undoApplication} />}
            </>
          )}
        </section>
      </div>
    </main>
  )
}

function PracticeView({ notify, setError }) {
  const [topics, setTopics] = useState(() => {
    const saved = localStorage.getItem('vizion_practice_topics')
    return saved ? JSON.parse(saved) : []
  })

  const [activeTopicId, setActiveTopicId] = useState(topics[0]?.id || null)
  const [activeQuestionId, setActiveQuestionId] = useState(topics[0]?.questions[0]?.id || null)
  const [promptInput, setPromptInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [code, setCode] = useState('')
  const [evaluation, setEvaluation] = useState(null)
  const [evaluating, setEvaluating] = useState(false)

  useEffect(() => {
    localStorage.setItem('vizion_practice_topics', JSON.stringify(topics))
  }, [topics])

  const activeTopic = topics.find((t) => t.id === activeTopicId)
  const activeQuestion = activeTopic?.questions.find((q) => q.id === activeQuestionId)

  const generateTopics = async (e) => {
    e.preventDefault()
    if (!promptInput.trim() || generating) return
    setGenerating(true)

    try {
      const res = await fetch('http://localhost:8000/api/generate-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: promptInput })
      })

      if (!res.ok) throw new Error('Failed to generate practice questions.')
      const questionsData = await res.json()

      const newTopic = {
        id: `topic_${Date.now()}`,
        name: promptInput.trim(),
        questions: questionsData.map((q, idx) => ({
          ...q,
          id: `q_${Date.now()}_${idx}`,
          completed: false,
          userCode: q.starterCode || '# Write python code here\n'
        }))
      }

      setTopics((prev) => [newTopic, ...prev])
      setActiveTopicId(newTopic.id)
      setActiveQuestionId(newTopic.questions[0].id)
      setCode(newTopic.questions[0].userCode)
      setPromptInput('')
      notify('Practice topics generated successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleDeleteTopic = (topicId, event) => {
    event.stopPropagation()
    if (!window.confirm('Delete this practice topic?')) return

    const updated = topics.filter((t) => t.id !== topicId)
    setTopics(updated)

    if (activeTopicId === topicId) {
      const nextTopic = updated[0]
      setActiveTopicId(nextTopic?.id || null)
      setActiveQuestionId(nextTopic?.questions[0]?.id || null)
      setCode(nextTopic?.questions[0]?.userCode || '')
    }
    notify('Topic removed.')
  }

  const handleSelectQuestion = (topicId, question) => {
    setActiveTopicId(topicId)
    setActiveQuestionId(question.id)
    setCode(question.userCode || '')
    setEvaluation(null)
  }

  const handleEvaluate = async (e) => {
    e.preventDefault()
    if (!code.trim() || !activeQuestion || evaluating) return
    setEvaluating(true)

    try {
      const res = await fetch('http://localhost:8000/api/evaluate-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_title: activeQuestion.title,
          problem_description: activeQuestion.description,
          code
        })
      })

      if (!res.ok) throw new Error('Evaluation failed.')
      const evalData = await res.json()
      setEvaluation(evalData)

      if (evalData.passed) {
        setTopics((prevTopics) =>
          prevTopics.map((topic) =>
            topic.id === activeTopicId
              ? {
                  ...topic,
                  questions: topic.questions.map((q) =>
                    q.id === activeQuestionId ? { ...q, completed: true, userCode: code } : q
                  )
                }
              : topic
          )
        )
      }
      notify('Solution evaluated.')
    } catch (err) {
      setError(err.message)
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <section className="dashboard-section practice-view">
      <SectionHeading eyebrow="PRACTICE PROBLEMS" title="Turn practice into progress." />

      <form onSubmit={generateTopics} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          placeholder="What topic do you want to practice? (e.g. Graphs, SQL, Machine Learning)"
          disabled={generating}
          style={{ flex: 1, padding: '0.75rem', background: '#101616', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
        <button className="primary-button" type="submit" disabled={generating || !promptInput.trim()}>
          <Sparkles size={16} /> {generating ? 'Generating...' : 'Generate Questions'}
        </button>
      </form>

      <div className="practice-layout">
        <div className="practice-list">
          {topics.length === 0 ? (
            <p className="empty-panel">No saved practice sets. Input a topic above to generate persistent problems.</p>
          ) : (
            topics.map((topic) => {
              const completedCount = topic.questions.filter((q) => q.completed).length
              return (
                <div key={topic.id} style={{ marginBottom: '1.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.2rem 0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--primary-color)', fontWeight: 600, textTransform: 'uppercase' }}>
                      {topic.name} ({completedCount}/{topic.questions.length})
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteTopic(topic.id, e)}
                      style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {topic.questions.map((q) => (
                    <button
                      key={q.id}
                      className={activeQuestionId === q.id ? 'selected' : ''}
                      onClick={() => handleSelectQuestion(topic.id, q)}
                      style={{ width: '100%', marginTop: '0.35rem' }}
                    >
                      <span>
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {q.completed && <CheckCircle2 size={13} color="#4ade80" />}
                          {q.title}
                        </strong>
                        <small>{q.difficulty}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )
            })
          )}
        </div>

        {activeQuestion ? (
          <form className="code-panel" onSubmit={handleEvaluate}>
            <div className="code-panel-head">
              <span><BookOpen size={14} /> {activeQuestion.title}</span>
              <span>LLM evaluation interface</span>
            </div>
            <div style={{ padding: '0.8rem', background: '#111818', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              {activeQuestion.description}
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Write your Python solution here..."
              spellCheck="false"
              required
            />
            {evaluation && (
              <div className="evaluation-result" style={{ borderLeftColor: evaluation.passed ? '#4ade80' : '#ef4444' }}>
                <strong style={{ color: evaluation.passed ? '#4ade80' : '#ef4444' }}>{evaluation.score}%</strong>
                <span>{evaluation.feedback}</span>
              </div>
            )}
            <button className="primary-button" type="submit" disabled={evaluating}>
              <Code2 size={16} /> {evaluating ? 'Evaluating...' : 'Evaluate solution'}
            </button>
          </form>
        ) : (
          <div className="empty-panel" style={{ display: 'grid', placeItems: 'center' }}>
            Select or generate a topic to begin coding practice.
          </div>
        )}
      </div>
    </section>
  )
}

function DashboardView({ user, projects, applied, score, stats, setView }) { 
  const [timeState, setTimeState] = useState(new Date())
  const [weather, setWeather] = useState({ temp: '--', condition: 'Loading...', location: 'Detecting...' })

  useEffect(() => {
    const timer = setInterval(() => setTimeState(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          try {
            const weatherRes = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
            )
            const weatherData = await weatherRes.json()
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            )
            const geoData = await geoRes.json()

            const city = geoData.address.city || geoData.address.town || geoData.address.village || 'Local Region'
            const country = geoData.address.country || ''

            setWeather({
              temp: `${Math.round(weatherData.current_weather.temperature)}°C`,
              condition: getWeatherCondition(weatherData.current_weather.weathercode),
              location: country ? `${city}, ${country}` : city
            })
          } catch (err) {
            setWeather({ temp: '26°C', condition: 'Clear', location: 'Location unavailable' })
          }
        },
        () => {
          setWeather({ temp: '26°C', condition: 'Clear', location: 'Permission denied' })
        }
      )
    } else {
      setWeather({ temp: '26°C', condition: 'Clear', location: 'Geolocation unsupported' })
    }
  }, [])

  const getWeatherCondition = (code) => {
    if (code === 0) return 'Clear Sky'
    if (code <= 3) return 'Partly Cloudy'
    if (code <= 48) return 'Foggy'
    if (code <= 67) return 'Rainy'
    if (code <= 77) return 'Snowy'
    return 'Thunderstorm'
  }

  const activity = [
    ...projects.map((project) => ({ label: `Submitted ${project.title}`, detail: project.career_path, date: project.created_at })), 
    ...applied.map((id) => ({ label: 'Applied to a company need', detail: id }))
  ].slice(0, 5)

  const currentTime = timeState.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const currentDate = timeState.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <>
      <div className="student-welcome">
        <div>
          <p className="dashboard-kicker">YOUR DASHBOARD</p>
          <h1>Good to see you, {user.name?.split(' ')[0] || 'there'}.</h1>
          <p>Your workspace is connected to Vizion data. Every project, attempt, and application is tracked here.</p>
        </div>
      </div>

      <div className="metric-grid">
        <Metric label="Login streak" value={`${stats.login_streak || 0} days`} note="Since joining Vizion" />
        <Metric label="Projects done" value={projects.length} note="Submitted work" />
        <Metric label="Applications" value={applied.length} note="Company needs" />
      </div>

      <div className="analytics-grid">
        <section className="analytics-panel">
          <div className="panel-title"><h2>Workspace Environment</h2><span>Live status</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Clock size={18} style={{ color: '#ff4d4d' }} />
              <div>
                <small style={{ color: '#888', display: 'block', fontSize: '11px' }}>CURRENT TIME</small>
                <strong style={{ fontSize: '16px' }}>{currentTime}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Calendar size={18} style={{ color: '#ff4d4d' }} />
              <div>
                <small style={{ color: '#888', display: 'block', fontSize: '11px' }}>DATE & DAY</small>
                <strong style={{ fontSize: '14px' }}>{currentDate}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CloudSun size={18} style={{ color: '#ff4d4d' }} />
              <div>
                <small style={{ color: '#888', display: 'block', fontSize: '11px' }}>WEATHER CONDITIONS</small>
                <strong style={{ fontSize: '14px' }}>{weather.temp} — {weather.condition}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <MapPin size={18} style={{ color: '#ff4d4d' }} />
              <div>
                <small style={{ color: '#888', display: 'block', fontSize: '11px' }}>LOCAL REGION</small>
                <strong style={{ fontSize: '14px' }}>{weather.location}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="analytics-panel activity-panel">
          <div className="panel-title"><h2>Recent activity</h2><span>Saved</span></div>
          {activity.length ? activity.map((item, index) => (
            <div className="activity-row" key={`${item.label}-${index}`}>
              <span className="activity-dot" />
              <div><strong>{item.label}</strong><small>{item.detail}</small></div>
            </div>
          )) : <p className="empty-panel">Your saved projects, applications, and practice attempts will appear here.</p>}
          <button onClick={() => setView('projects')}>Manage projects <ChevronRight size={15} /></button>
        </section>
      </div>
    </>
  ) 
}

function Metric({ label, value, note }) { 
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></article> 
}

function ProfileView({ user, profile, setProfile, toggleInterest, saveProfile, savePhoto }) {
  const [customInterest, setCustomInterest] = useState('')
  const [customSkill, setCustomSkill] = useState('')
  const addCustomInterest = () => { 
    const interest = customInterest.trim()
    if (interest && !profile.interests.includes(interest)) { 
      setProfile({ ...profile, interests: [...profile.interests, interest] })
      setCustomInterest('') 
    } 
  }
  const addCustomSkill = () => {
    const skill = customSkill.trim()
    if (skill && !profile.skills.includes(skill)) {
      setProfile({ ...profile, skills: [...profile.skills, skill] })
      setCustomSkill('')
    }
  }
  const handleSubmit = (event) => { event.preventDefault(); saveProfile({ ...profile, role: 'student' }) }
  const toggleSkill = (skill) => setProfile({ ...profile, skills: profile.skills.includes(skill) ? profile.skills.filter((item) => item !== skill) : [...profile.skills, skill] })
  const removeInterest = (interest) => setProfile({ ...profile, interests: profile.interests.filter((item) => item !== interest) })
  const removeSkill = (skill) => setProfile({ ...profile, skills: profile.skills.filter((item) => item !== skill) })
  
  return (
    <section className="dashboard-section profile-view">
      <SectionHeading eyebrow="PERSONAL DETAILS" title="Shape your profile." />
      <ProfilePhotoPicker photo={user.profile_photo} name={user.name} onChange={savePhoto} />
      <form onSubmit={handleSubmit} className="profile-form">
        <label>Name<input value={user.name || ''} readOnly /></label>
        <label>Email<input value={user.email || ''} readOnly /></label>
        <label>Role<input value="Student" readOnly aria-describedby="role-note" /><small id="role-note" className="field-note">Your account role is set during registration.</small></label>
        <fieldset>
          <legend>Areas of interest</legend>
          <div className="interest-tags">
            {interestOptions.map((interest) => (
              <button type="button" className={profile.interests.includes(interest) ? 'selected' : ''} key={interest} onClick={() => toggleInterest(interest)}>
                {profile.interests.includes(interest) && <Check size={13} />}{interest}
              </button>
            ))}
          </div>
          <div className="custom-interest">
            <input value={customInterest} onChange={(event) => setCustomInterest(event.target.value)} placeholder="Type your own interest" />
            <button type="button" onClick={addCustomInterest}>Add</button>
          </div>
          {profile.interests.length > 0 && (
            <div className="selected-interests"><span>Selected interests</span><div>{profile.interests.map((interest) => <button type="button" key={interest} onClick={() => removeInterest(interest)} title={`Remove ${interest}`}>{interest}<Trash2 size={12} /></button>)}</div></div>
          )}
        </fieldset>
        <fieldset>
          <legend>Skills</legend>
          <div className="interest-tags">
            {skillOptions.map((skill) => <button type="button" className={profile.skills.includes(skill) ? 'selected' : ''} key={skill} onClick={() => toggleSkill(skill)}>{profile.skills.includes(skill) && <Check size={13} />}{skill}</button>)}
          </div>
          <div className="custom-interest">
            <input value={customSkill} onChange={(event) => setCustomSkill(event.target.value)} placeholder="Type your own skill" />
            <button type="button" onClick={addCustomSkill}>Add</button>
          </div>
          {profile.skills.length > 0 && (
            <div className="selected-interests"><span>Selected skills</span><div>{profile.skills.map((skill) => <button type="button" key={skill} onClick={() => removeSkill(skill)} title={`Remove ${skill}`}>{skill}<Trash2 size={12} /></button>)}</div></div>
          )}
        </fieldset>
        <button className="primary-button"><Settings size={16} /> Save details</button>
      </form>
    </section>
  )
}

function ProjectView({ form, update, projects, submit, onDelete }) {
  const careerPathOptions = [...new Set([
    ...careerPaths,
    ...projects.map((project) => project.career_path).filter(Boolean)
  ])]

  return (
    <section className="dashboard-section project-hub">
      <SectionHeading eyebrow="PROJECTS" title="Show the work behind your ambition." />
      <form className="project-form" onSubmit={submit}>
        <label>Career path
          <input
            name="career_path"
            list="career-path-options"
            value={form.career_path}
            onChange={update}
            placeholder="Select or type a career path"
            minLength={2}
            maxLength={100}
            required
          />
          <datalist id="career-path-options">
            {careerPathOptions.map((path) => <option key={path} value={path} />)}
          </datalist>
        </label>
        <label>Project title<input name="title" value={form.title} onChange={update} placeholder="What did you build?" required /></label>
        <label>GitHub repository URL<input name="github_url" type="url" value={form.github_url} onChange={update} placeholder="https://github.com/..." required /></label>
        <button className="primary-button"><BriefcaseBusiness size={16} /> Submit project</button>
      </form>
      <h3 className="subheading">Submitted projects</h3>
      {projects.length === 0 ? <p className="empty-panel">Your submitted projects will appear here.</p> : projects.map((project) => (
        <article className="project-row" key={project.id}>
          <div><strong>{project.title}</strong><span>{project.career_path}</span></div>
          <div className="project-row-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span className="status-pill">{project.status}</span>
            <button type="button" className="project-delete-button" onClick={() => onDelete(project.id)} aria-label={`Delete ${project.title}`} title="Delete project" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: '#ff4d4d' }}>
              <Trash2 size={16} />
            </button>
            <a href={project.github_url} target="_blank" rel="noreferrer" aria-label={`Open ${project.title} repository`} style={{ display: 'flex', alignItems: 'center' }}>
              <ExternalLink size={17} />
            </a>
          </div>
        </article>
      ))}
    </section>
  ) 
}

function CompanyView({ problems, applied, accept, undo }) { 
  const [query, setQuery] = useState('')
  const [skillQuery, setSkillQuery] = useState('')
  const [interestQuery, setInterestQuery] = useState('')
  const [selectedCompany, setSelectedCompany] = useState(null)
  const companies = [...new Map(problems.map((problem) => [problem.company_email, {
    name: problem.company,
    email: problem.company_email,
    profile_photo: problem.profile_photo,
    briefs: problems.filter((item) => item.company_email === problem.company_email)
  }])).values()]
  const filteredCompanies = companies.filter((company) => {
    const companyText = `${company.name} ${company.email}`.toLowerCase()
    const skills = company.briefs.flatMap((brief) => brief.skills || []).map((item) => item.toLowerCase())
    const companyQuery = query.trim().toLowerCase()
    const skillFilter = skillQuery.trim().toLowerCase()
    const interestFilter = interestQuery.trim().toLowerCase()
    return (!companyQuery || companyText.includes(companyQuery)) && (!skillFilter || skills.some((item) => item.includes(skillFilter))) && (!interestFilter || skills.some((item) => item.includes(interestFilter)))
  })
  return (
    <section className="dashboard-section company-view">
      <SectionHeading eyebrow="COMPANY NEEDS" title="Find a challenge worth solving." />
      <div className="company-search"><label><Search size={16} />Company name<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company names" /></label><label>Skill<input value={skillQuery} onChange={(event) => setSkillQuery(event.target.value)} placeholder="React, Python..." /></label><label>Interest<input value={interestQuery} onChange={(event) => setInterestQuery(event.target.value)} placeholder="Data science..." /></label></div>
      <div className="company-results">
        {filteredCompanies.length === 0 ? <p className="empty-panel">No companies match these filters.</p> : filteredCompanies.map((company) => (
          <button className="company-result" type="button" key={company.email} onClick={() => setSelectedCompany(company)}><span className="company-result-avatar">{company.profile_photo ? <img src={company.profile_photo} alt="" /> : company.name.slice(0, 1).toUpperCase()}</span><span><strong>{company.name}</strong><small>{company.briefs.length} {company.briefs.length === 1 ? 'open brief' : 'open briefs'} / {company.briefs.flatMap((brief) => brief.skills || []).slice(0, 3).join(', ')}</small></span><ChevronRight size={17} /></button>
        ))}
      </div>
      <div className="problem-list">
        {problems.length === 0 ? <p className="empty-panel">No company challenges are available right now.</p> : problems.map((problem) => (
          <article className="problem-card" key={problem.id}>
            <div className="problem-company">{problem.company}<span>OPEN BRIEF</span></div>
            <h3>{problem.title}</h3>
            <p>{problem.description}</p>
            <div className="company-contact"><Mail size={15} /><a href={`mailto:${problem.company_email}`}>{problem.company_email}</a></div>
            <div className="problem-footer">
              <div>{(problem.skills || []).map((skill) => <span key={skill}>{skill}</span>)}</div>
              <button onClick={() => applied.includes(problem.id) ? undo(problem) : accept(problem)}>
                {applied.includes(problem.id) ? 'Undo application' : 'Accept'}<Check size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {selectedCompany && <CompanyDetails company={selectedCompany} onClose={() => setSelectedCompany(null)} applied={applied} accept={accept} undo={undo} />}
    </section>
  ) 
}

function CompanyDetails({ company, onClose, applied, accept, undo }) {
  return <div className="profile-overlay" role="presentation" onClick={onClose}><section className="company-details" role="dialog" aria-modal="true" aria-label={`${company.name} details`} onClick={(event) => event.stopPropagation()}><button className="close-profile" type="button" onClick={onClose} aria-label="Close company details"><X size={18} /></button><span className="company-detail-avatar">{company.profile_photo ? <img src={company.profile_photo} alt={`${company.name} profile`} /> : company.name.slice(0, 1).toUpperCase()}</span><p className="dashboard-kicker">COMPANY DETAILS</p><h2>{company.name}</h2><a className="company-contact" href={`mailto:${company.email}`}><Mail size={15} />{company.email}</a><h3>Open briefs</h3><div className="company-detail-briefs">{company.briefs.map((brief) => <article key={brief.id}><strong>{brief.title}</strong><p>{brief.description}</p><div className="brief-skills">{(brief.skills || []).map((skill) => <span key={skill}>{skill}</span>)}</div><button onClick={() => applied.includes(brief.id) ? undo(brief) : accept(brief)}>{applied.includes(brief.id) ? 'Undo application' : 'Accept'}<Check size={15} /></button></article>)}</div></section></div>
}

function SectionHeading({ eyebrow, title }) { 
  return (
    <div className="section-heading">
      <div>
        <p className="dashboard-kicker">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
    </div>
  ) 
}

export default StudentDashboard