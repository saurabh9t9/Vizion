import '../styles/OptionsScreen.css'

function OptionsScreen({ options, onSelectOption, onBack }) {
  return (
    <div className="options-screen">
      <div className="options-content">
        <h1>Select Your Interview</h1>
        <p className="subtitle">We generated a few formats based on your topic.</p>

        <div className="options-list">
          {options.map((opt) => (
            <div
              key={opt.option_id}
              className="option-card"
              onClick={() => onSelectOption(opt)}
            >
              <h3 className="option-title">{opt.title}</h3>
              
              <p className="option-description">{opt.description}</p>
              
              <div className="option-difficulty">
                <span className="difficulty-label">DIFFICULTY:</span>
                <span className="difficulty-value">{opt.difficulty.replace('_', ' ')}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="options-actions">
          <button onClick={onBack} className="reject-button">
            Back to Search
          </button>
        </div>
      </div>
    </div>
  )
}

export default OptionsScreen