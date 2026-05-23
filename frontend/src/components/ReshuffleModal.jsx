export default function ReshuffleModal({ total, onConfirm, onCancel }) {
  return (
    <div className="nudge-backdrop">
      <div className="nudge-card">
        <p className="nudge-heading">
          You've seen them all!
        </p>
        <p className="nudge-subheading">
          You've watched every video in your library ({total.toLocaleString()} / {total.toLocaleString()}).
          Reset the shuffle history to start a new round?
        </p>
        <div className="nudge-actions">
          <button className="nudge-btn" onClick={onConfirm}>
            Reset &amp; shuffle
          </button>
          <button className="nudge-btn nudge-btn--kill" onClick={onCancel}>
            Not yet
          </button>
        </div>
      </div>
    </div>
  )
}
