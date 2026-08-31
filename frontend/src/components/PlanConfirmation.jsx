import '../styles/PlanConfirmation.css'

function PlanConfirmation({ plan, onConfirm, onReject }) {
  return (
    <div className="plan-confirmation">
      <div className="plan-content">
        <h1>Interview Plan</h1>
        <p className="subtitle">
          Target Role: {plan.interview_metadata.target_role} | {plan.interview_metadata.total_duration_minutes} mins
        </p>

        <div className="segments-list">
          {plan.segments.map((segment, index) => (
            <div key={index} className="segment-card">
              <div className="segment-header">
                <span className="segment-number">{index + 1}</span>
                <h3 className="segment-type">{segment.segment_name} ({segment.type})</h3>
              </div>
              <p className="segment-focus">{segment.focus}</p>
              {segment.questions && segment.questions.length > 0 && (
                <div className="segment-questions">
                  <p className="questions-label">Opening question:</p>
                  <p className="question">"{segment.questions[0].question_text}"</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="plan-actions">
          <button onClick={onConfirm} className="confirm-button">
            Start Interview
          </button>
          <button onClick={onReject} className="reject-button">
            Change Plan
          </button>
        </div>
      </div>
    </div>
  )
}

export default PlanConfirmation