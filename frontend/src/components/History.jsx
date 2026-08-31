import { useState } from 'react'
import { ArrowLeft, BarChart3, CalendarDays, ChevronRight, FileText, MessageSquare, Trash2, CheckSquare, Square, X } from 'lucide-react'
import '../styles/InfoPages.css'
import '../styles/History.css'

function getRole(record) {
  return record.plan?.interview_metadata?.target_role || 'Interview session'
}

function getScore(record) {
  return record.report?.overall_score ?? record.report?.overallScore ?? '—'
}

function formatDate(value) {
  if (!value) return 'Unknown date'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function getQuestionAnswers(transcript = []) {
  const pairs = []
  let currentQuestion = null

  transcript.forEach((entry) => {
    const speaker = entry.speaker || entry.role
    const text = entry.text || entry.content || entry.question || entry.answer
    if (!text) return
    if (speaker === 'interviewer' || speaker === 'assistant') {
      currentQuestion = text
    } else if (speaker === 'candidate' || speaker === 'user') {
      pairs.push({ question: currentQuestion || 'Candidate response', answer: text })
      currentQuestion = null
    }
  })

  if (currentQuestion) pairs.push({ question: currentQuestion, answer: 'No answer recorded.' })
  return pairs
}

function History({ history = [], onNavigate, onDelete, onViewReport }) {
  const [selectedId, setSelectedId] = useState(null)
  const [selectedBatchIds, setSelectedBatchIds] = useState([])
  const [isDeleteMode, setIsDeleteMode] = useState(false)

  const selected = history.find((record) => record.id === selectedId)

  // Toggle single item checkbox inside delete mode
  const handleToggleCheck = (e, id) => {
    e.stopPropagation()
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    )
  }

  // Select/Deselect All Checkboxes
  const handleSelectAll = (e) => {
    e.stopPropagation()
    if (selectedBatchIds.length === history.length) {
      setSelectedBatchIds([])
    } else {
      setSelectedBatchIds(history.map((record) => record.id))
    }
  }

  // Delete Selected Items Handler
  const handleDeleteSelected = (e) => {
    e.stopPropagation()
    if (selectedBatchIds.length === 0) return
    if (window.confirm(`Are you sure you want to delete ${selectedBatchIds.length} selected session(s)?`)) {
      onDelete(selectedBatchIds)
      if (selectedBatchIds.includes(selectedId)) setSelectedId(null)
      setSelectedBatchIds([])
      setIsDeleteMode(false)
    }
  }

  // Delete All Items Handler
  const handleDeleteAll = (e) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to permanently delete ALL interview history?')) {
      onDelete('ALL')
      setSelectedId(null)
      setSelectedBatchIds([])
      setIsDeleteMode(false)
    }
  }

  // Exit Delete Mode
  const handleCancelDeleteMode = (e) => {
    e.stopPropagation()
    setIsDeleteMode(false)
    setSelectedBatchIds([])
  }

  // Row selection handler
  const handleSelect = (id) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  // Single Item Delete Handler
  const handleDeleteSingle = (e, id) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this session?')) {
      onDelete(id)
      if (selectedId === id) {
        setSelectedId(null)
      }
    }
  }

  return (
    <main className="info-page history-page">
      <header className="info-nav">
        <button type="button" className="info-brand" onClick={() => onNavigate('landing')}>
          <span>V</span> VIZION
        </button>
        <nav aria-label="Primary navigation">
          <button type="button" onClick={() => onNavigate('landing')}>HOME</button>
          <button type="button" className="active" onClick={() => onNavigate('history')}>HISTORY</button>
        </nav>
        <span className="info-status">HISTORY / 01</span>
      </header>

      <section className="info-hero history-heading">
        <span className="info-kicker">YOUR PRACTICE LOG</span>
        <h1>Past<br /><em>sessions.</em></h1>
        <p>Review every interview, the evidence behind your score, and the questions that shaped the conversation.</p>
      </section>

      {history.length === 0 ? (
        <section className="history-empty">
          <BarChart3 size={28} />
          <h2>No interviews yet</h2>
          <p>Complete your first interview and its report will appear here.</p>
          <button type="button" onClick={() => onNavigate('landing')}>
            <ArrowLeft size={15} /> Start an interview
          </button>
        </section>
      ) : (
        <section className="history-layout">
          <div className="history-list" aria-label="Previous interviews">
            <div className="history-list-header">
              <div className="history-header-left">
                {isDeleteMode && (
                  <button 
                    type="button" 
                    onClick={handleSelectAll} 
                    className="history-checkbox-btn" 
                    title="Select all sessions"
                  >
                    {selectedBatchIds.length === history.length && history.length > 0 ? (
                      <CheckSquare size={16} />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                )}
                <span>SESSION ARCHIVE</span>
              </div>

              <div className="history-header-right">
                {isDeleteMode ? (
                  <>
                    <button 
                      type="button" 
                      onClick={handleDeleteSelected} 
                      className="history-action-btn danger"
                      disabled={selectedBatchIds.length === 0}
                    >
                      <Trash2 size={13} /> Delete ({selectedBatchIds.length})
                    </button>
                    
                    <button type="button" onClick={handleDeleteAll} className="history-action-btn danger">
                      <Trash2 size={13} /> Delete All
                    </button>

                    <button type="button" onClick={handleCancelDeleteMode} className="history-action-btn cancel">
                      <X size={13} /> Cancel
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setIsDeleteMode(true)} className="history-action-btn">
                    <Trash2 size={13} /> Delete
                  </button>
                )}

                <strong className="history-count">{history.length.toString().padStart(2, '0')}</strong>
              </div>
            </div>

            {history.map((record, index) => {
              const isBatchSelected = selectedBatchIds.includes(record.id)
              return (
                <div
                  key={record.id}
                  className={`history-item ${selected?.id === record.id ? 'selected' : ''}`}
                  onClick={() => handleSelect(record.id)}
                  role="button"
                  tabIndex={0}
                >
                  {isDeleteMode && (
                    <div 
                      className="history-item-checkbox"
                      onClick={(e) => handleToggleCheck(e, record.id)}
                    >
                      {isBatchSelected ? (
                        <CheckSquare size={16} color="var(--primary-color, #ff2d78)" />
                      ) : (
                        <Square size={16} />
                      )}
                    </div>
                  )}

                  <span className="history-item-index">{String(index + 1).padStart(2, '0')}</span>
                  
                  <span className="history-item-copy">
                    <strong>{getRole(record)}</strong>
                    <small>{formatDate(record.createdAt)}</small>
                  </span>
                  
                  <span className="history-item-score">{getScore(record)}<small>/100</small></span>
                  
                  {!isDeleteMode && (
                    <button
                      type="button"
                      className="history-delete"
                      title="Delete session"
                      onClick={(e) => handleDeleteSingle(e, record.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}

                  <ChevronRight size={16} className="history-item-arrow" />
                </div>
              )
            })}
          </div>

          {selected ? (
            <article className="history-detail">
              <div className="history-detail-header">
                <div>
                  <span className="info-kicker">INTERVIEW RECORD</span>
                  <h2>{getRole(selected)}</h2>
                  <p><CalendarDays size={14} /> {formatDate(selected.createdAt)}</p>
                </div>
                <button
                  type="button"
                  className="history-delete"
                  title="Delete interview"
                  onClick={(e) => handleDeleteSingle(e, selected.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="history-score">
                <span>OVERALL SCORE</span>
                <strong>{getScore(selected)}<small>/100</small></strong>
              </div>

              <div className="history-meta">
                <span><MessageSquare size={15} /> {selected.sessionData?.transcript?.length || 0} transcript entries</span>
                <span>{selected.plan?.segments?.length || 0} planned segments</span>
                <button type="button" className="history-report-link" onClick={() => onViewReport(selected.report)}>
                  <FileText size={14} /> Full report
                </button>
              </div>

              <div className="history-report-summary">
                <h3>Report summary</h3>
                <p>{selected.report?.strength || selected.report?.final_summary || 'No summary available.'}</p>
                {selected.report?.recommendation?.reason && (
                  <p><strong>Next step:</strong> {selected.report.recommendation.reason}</p>
                )}
              </div>

              <div className="history-transcript">
                <h3>Questions & answers</h3>
                {getQuestionAnswers(selected.sessionData?.transcript).length ? (
                  getQuestionAnswers(selected.sessionData?.transcript).map((pair, index) => (
                    <div className="qa-entry" key={index}>
                      <span>Q{index + 1}</span>
                      <p className="qa-question">{pair.question}</p>
                      <span className="answer-label">ANSWER</span>
                      <p>{pair.answer}</p>
                    </div>
                  ))
                ) : (
                  <p>No questions or answers were recorded for this session.</p>
                )}
              </div>
            </article>
          ) : (
            <div className="history-detail-placeholder">
              <p>Select a session from the archive to view details.</p>
            </div>
          )}
        </section>
      )}

      <button type="button" className="info-back" onClick={() => onNavigate('landing')}>
        <ArrowLeft size={15} /> Return to home
      </button>
    </main>
  )
}

export default History