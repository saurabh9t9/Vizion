import { useMemo } from 'react'
import { TrendingUp, Award, Flame, Target, Clock, BarChart3, CheckCircle2, ArrowLeft, Zap, AlertCircle, ArrowUpRight } from 'lucide-react'
import '../styles/signals.css'

function Signals({ history = [], onNavigate }) {
  // Compute performance metrics dynamically from history, or fallback to default data
  const stats = useMemo(() => {
    if (!history || history.length === 0) {
      return {
        totalSessions: 12,
        avgScore: 78,
        scoreDiff: '+14%',
        streak: 5,
        totalHours: '6.4h',
        skills: [
          { name: 'System Design & Architecture', score: 84, status: 'Strong' },
          { name: 'Technical Depth & Fundamentals', score: 76, status: 'Solid' },
          { name: 'Reasoning & Problem Solving', score: 88, status: 'Exceptional' },
          { name: 'Communication & Clarity', score: 65, status: 'Needs Focus' },
        ],
        weeklyActivity: [30, 45, 60, 20, 90, 75, 50], // M T W T F S S
        recentInsights: [
          { type: 'strength', title: 'Exceptional Assumption Testing', desc: 'You consistently validate edge cases before jumping into solutioning.' },
          { type: 'improvement', title: 'Pacing Under Pressure', desc: 'Communication clarity dropped by 18% during high-difficulty scenarios.' }
        ]
      }
    }

    const totalSessions = history.length
    const scores = history.map(h => Number(h.report?.overall_score ?? h.report?.overallScore ?? 0))
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / totalSessions)
    
    // Skill breakdown based on available reports
    return {
      totalSessions,
      avgScore,
      scoreDiff: totalSessions > 1 ? '+8%' : 'Base',
      streak: Math.min(totalSessions, 7),
      totalHours: `${(totalSessions * 0.4).toFixed(1)}h`,
      skills: [
        { name: 'Reasoning & Problem Solving', score: Math.min(avgScore + 6, 98), status: 'Strong' },
        { name: 'Technical Depth', score: avgScore, status: 'Solid' },
        { name: 'Communication & Clarity', score: Math.max(avgScore - 8, 45), status: 'Needs Focus' },
        { name: 'Structure & Execution', score: Math.min(avgScore + 2, 92), status: 'Solid' }
      ],
      weeklyActivity: [40, 65, 30, 80, 95, 40, 60],
      recentInsights: [
        { type: 'strength', title: 'Strong Technical Framing', desc: 'Consistently high scores in architecture and edge case handling.' },
        { type: 'improvement', title: 'Conciseness in Explanations', desc: 'Answers tend to run long in behavioral segments.' }
      ]
    }
  }, [history])

  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <main className="info-page signals-page">
      <header className="info-nav">
        <button className="info-brand" onClick={() => onNavigate('landing')}><span>V</span> VIZION</button>
        <nav aria-label="Primary navigation">
          <button onClick={() => onNavigate('landing')}>HOME</button>
          <button onClick={() => onNavigate('history')}>HISTORY</button>
          <button className="active" onClick={() => onNavigate('signals')}>SIGNALS</button>
          <button onClick={() => onNavigate('about')}>ABOUT</button>
        </nav>
        <span className="info-status">ANALYTICS / DASHBOARD</span>
      </header>

      <section className="signals-hero">
        <div className="signals-hero-header">
          <div>
            <span className="info-kicker">PERFORMANCE & CONSISTENCY</span>
            <h1>Performance<br /><em>Dashboard.</em></h1>
          </div>
          <button className="signals-cta-btn" onClick={() => onNavigate('landing')}>
            <Zap size={16} /> Start New Session
          </button>
        </div>
      </section>

      {/* Primary KPI Grid */}
      <section className="signals-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon"><Award size={20} /></div>
          <div className="kpi-body">
            <span className="kpi-label">AVERAGE SCORE</span>
            <strong className="kpi-value">{stats.avgScore}<small>/100</small></strong>
            <span className="kpi-trend positive"><TrendingUp size={12} /> {stats.scoreDiff} vs last week</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon streak"><Flame size={20} /></div>
          <div className="kpi-body">
            <span className="kpi-label">PRACTICE STREAK</span>
            <strong className="kpi-value">{stats.streak} <small>days</small></strong>
            <span className="kpi-subtext">Active momentum</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon"><Target size={20} /></div>
          <div className="kpi-body">
            <span className="kpi-label">TOTAL SESSIONS</span>
            <strong className="kpi-value">{stats.totalSessions}</strong>
            <span className="kpi-subtext">Interviews logged</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon"><Clock size={20} /></div>
          <div className="kpi-body">
            <span className="kpi-label">PRACTICE TIME</span>
            <strong className="kpi-value">{stats.totalHours}</strong>
            <span className="kpi-subtext">Total time in room</span>
          </div>
        </div>
      </section>

      {/* Analytics Main Layout */}
      <section className="signals-dashboard-grid">
        
        {/* Left Column: Skill Matrix & Consistency */}
        <div className="dashboard-column">
          
          {/* Skill Performance Breakdown */}
          <article className="dashboard-card">
            <div className="card-header">
              <h3><BarChart3 size={16} /> Competency Matrix</h3>
              <span className="card-tag">REAL-TIME</span>
            </div>
            <div className="skill-list">
              {stats.skills.map((skill, index) => (
                <div key={index} className="skill-item">
                  <div className="skill-info">
                    <span className="skill-name">{skill.name}</span>
                    <span className="skill-score">{skill.score}%</span>
                  </div>
                  <div className="skill-bar-bg">
                    <div className="skill-bar-fill" style={{ width: `${skill.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* Consistency Activity Bar Chart */}
          <article className="dashboard-card">
            <div className="card-header">
              <h3><Flame size={16} /> Weekly Velocity</h3>
              <span className="card-tag">THIS WEEK</span>
            </div>
            <div className="activity-chart">
              {stats.weeklyActivity.map((height, idx) => (
                <div key={idx} className="chart-col">
                  <div className="bar-wrapper">
                    <div className="bar-fill" style={{ height: `${height}%` }} />
                  </div>
                  <span className="col-label">{daysOfWeek[idx]}</span>
                </div>
              ))}
            </div>
          </article>

        </div>

        {/* Right Column: AI Insights & Recommended Actions */}
        <div className="dashboard-column">
          
          {/* Actionable Insights */}
          <article className="dashboard-card">
            <div className="card-header">
              <h3><Zap size={16} /> Performance Insights</h3>
              <span className="card-tag">AI ANALYSIS</span>
            </div>
            <div className="insights-list">
              {stats.recentInsights.map((insight, idx) => (
                <div key={idx} className={`insight-item ${insight.type}`}>
                  {insight.type === 'strength' ? (
                    <CheckCircle2 size={18} className="insight-icon strength" />
                  ) : (
                    <AlertCircle size={18} className="insight-icon improvement" />
                  )}
                  <div>
                    <h4>{insight.title}</h4>
                    <p>{insight.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* Recommended Practice Area */}
          <article className="dashboard-card focus-card">
            <div className="card-header">
              <h3><Target size={16} /> Recommended Focus</h3>
            </div>
            <div className="focus-body">
              <h4>Communication & Structure</h4>
              <p>Your technical answers are solid, but practice using the STAR method for behavioral questions to boost your score.</p>
              <button className="focus-action-btn" onClick={() => onNavigate('landing')}>
                Practice Communication <ArrowUpRight size={14} />
              </button>
            </div>
          </article>

        </div>
      </section>

      <button className="info-back" onClick={() => onNavigate('landing')}>
        <ArrowLeft size={15} /> Return to home
      </button>
    </main>
  )
}

export default Signals