import '../styles/ReportScreen.css'

function normalizeReport(input) {
  if (!input || typeof input !== 'object') return {}

  const report = { ...input }

  if (!Array.isArray(report.segments) && Array.isArray(report.segment_breakdown)) {
    report.segments = report.segment_breakdown
  }

  if (!Array.isArray(report.improvements) && Array.isArray(report.improvement_items)) {
    report.improvements = report.improvement_items
  }

  if (typeof report.recommendation === 'string') {
    report.recommendation = { reason: report.recommendation }
  }

  if (Array.isArray(report.improvements)) {
    report.improvements = report.improvements.map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        return item.recommendation || item.problem || item.area || 'No additional feedback available.'
      }
      return 'No additional feedback available.'
    })
  }

  return report
}

function ReportScreen({ report, onRestart, onBack }) {
  const safeReport = normalizeReport(report)

  if (!safeReport || Object.keys(safeReport).length === 0) {
    return <div className="loading-screen">Generating performance report...</div>
  }

  const segments = Array.isArray(safeReport.segments) ? safeReport.segments : []
  const improvements = Array.isArray(safeReport.improvements) ? safeReport.improvements : []
  const recommendation = safeReport.recommendation && typeof safeReport.recommendation === 'object'
    ? safeReport.recommendation
    : {}
  const communication = safeReport.communication && typeof safeReport.communication === 'object'
    ? safeReport.communication
    : {}
  const behavioral = safeReport.behavioral && typeof safeReport.behavioral === 'object'
    ? safeReport.behavioral
    : {}
  const overallScore = Number.isFinite(Number(safeReport.overall_score ?? safeReport.overallScore))
    ? Number(safeReport.overall_score ?? safeReport.overallScore)
    : 0
  const strength = safeReport.strength || safeReport.final_summary || 'No major strengths were clearly demonstrated.'

  return (
    <div className="report-screen">
      <div className="report-content">
        {/* Minimal Top Back Button */}
        <div className="report-header-nav">
          <button onClick={onBack} className="minimal-back-btn">
            ← Back
          </button>
        </div>

        <h1>Interview Report</h1>
        <p className="subtitle">Here's how you performed</p>

        <section className="report-section">
          <h2>Overall Score</h2>
          <div className="score-display">{overallScore}/100</div>
        </section>

        {segments.length > 0 ? (
          <section className="report-section">
            <h2>Segment Breakdown</h2>
            <div className="segments-report">
              {segments.map((segment, index) => (
                <div key={index} className="segment-report-card">
                  <div className="segment-report-header">
                    <h3>{segment.type || segment.segment_name || 'Segment'}</h3>
                    <p className="focus">{segment.focus || 'N/A'}</p>
                  </div>

                  <div className="segment-report-body">
                    <div className="summary">
                      <h4>Summary</h4>
                      <p>{segment.summary || 'No summary available'}</p>
                    </div>

                    {segment.technical && (
                      <div className="technical-metrics">
                        <h4>Technical Performance</h4>
                        <ul>
                          {segment.technical.correctness && (
                            <li>
                              <strong>Correctness:</strong> {segment.technical.correctness}
                            </li>
                          )}
                          {segment.technical.complexity && (
                            <li>
                              <strong>Complexity:</strong> {segment.technical.complexity}
                            </li>
                          )}
                          {segment.technical.edgeCases && (
                            <li>
                              <strong>Edge Cases:</strong> {segment.technical.edgeCases}
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {segment.communication && (
                      <div className="communication-metrics">
                        <h4>Communication</h4>
                        <ul>
                          {segment.communication.explainBeforeCodeRatio && (
                            <li>
                              <strong>Explanation Ratio:</strong>{' '}
                              {segment.communication.explainBeforeCodeRatio}
                            </li>
                          )}
                          {segment.communication.silenceBehavior && (
                            <li>
                              <strong>Silence Behavior:</strong>{' '}
                              {segment.communication.silenceBehavior}
                            </li>
                          )}
                          {segment.communication.clarity && (
                            <li>
                              <strong>Clarity:</strong> {segment.communication.clarity}
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="report-section">
            <h2>Segment Breakdown</h2>
            <div className="overall-metrics-card">
              <p>No detailed segment breakdown was returned for this interview.</p>
            </div>
          </section>
        )}

        {Object.keys(communication).length > 0 && (
          <section className="report-section">
            <h2>Overall Communication</h2>
            <div className="overall-metrics-card">
              <p>
                <strong>Score:</strong> {communication.score ?? communication.consistency ?? 'N/A'}
              </p>
              <p>
                <strong>Clarity:</strong> {communication.clarity || 'N/A'}
              </p>
            </div>
          </section>
        )}

        {Object.keys(behavioral).length > 0 && (
          <section className="report-section">
            <h2>Overall Behavioral & Engagement</h2>
            <div className="overall-metrics-card">
              <p>
                <strong>Engagement Trend:</strong> {behavioral.engagementTrend || behavioral.trend || 'N/A'}
              </p>
              <p>
                <strong>Average Response Latency:</strong> {behavioral.avgResponseLatency || behavioral.responseLatency || 'N/A'}
              </p>
            </div>
          </section>
        )}

        {improvements.length > 0 && (
          <section className="report-section improvements-section">
            <h2>Top Areas for Improvement</h2>
            <ul className="improvements-list">
              {improvements.map((improvement, index) => (
                <li key={index}>
                  <span className="improvement-number">{index + 1}</span>
                  <span className="improvement-text">{improvement}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="report-section strength-section">
          <div className="strength-callout">
            <h3>✨ What You Did Well</h3>
            <p>{strength}</p>
          </div>
        </section>

        {recommendation && Object.keys(recommendation).length > 0 && (
          <section className="report-section">
            <h2>Next Steps</h2>
            <div className="recommendation-card">
              <p>{recommendation.reason || recommendation.summary || recommendation.decision || 'No recommendation available.'}</p>
            </div>
          </section>
        )}

        <div className="report-actions">
          <button onClick={onRestart} className="restart-button">
            Take Another Interview
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReportScreen