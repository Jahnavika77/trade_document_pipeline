export default function ShipmentQueue({ shipments, selectedId, onSelect }) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>
          📥 Incoming
          {shipments.length > 0 && (
            <span className="badge">{shipments.length}</span>
          )}
        </h3>
        <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
          SU emails &amp; processing queue
        </p>
      </div>

      <div className="queue-list">
        {shipments.length === 0 && (
          <div style={{ padding: "20px 12px", textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
            No shipments yet
          </div>
        )}
        {shipments.map((s) => (
          <button
            key={s.id}
            className={`queue-item ${selectedId === s.id ? "active" : ""}`}
            onClick={() => onSelect(s.id)}
          >
            <div className="queue-top">
              <span className="queue-name">{s.customer_name}</span>
              <span className={`pill ${s.status}`}>{s.status?.replace("_", " ")}</span>
            </div>
            <div className="queue-subj">{s.subject}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
