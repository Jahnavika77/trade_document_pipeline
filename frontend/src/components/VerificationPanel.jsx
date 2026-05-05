export default function VerificationPanel({ details, onPickDiscrepancy, activeDiscrepancy }) {
  if (!details) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔍</div>
        <p>Select a shipment to see the verification result</p>
      </div>
    );
  }

  const rows = details.validation_results || [];
  const total  = rows.length;
  const matched = rows.filter((r) => r.status === "match").length;
  const mismatched = rows.filter((r) => r.status === "mismatch").length;
  const missing = rows.filter((r) => r.status === "missing").length;

  const dotClass = (status) =>
    status === "match" ? "dot-good" : status === "mismatch" ? "dot-bad" : "dot-warn";

  const confColor = (conf) => {
    if (conf === undefined || conf === null) return "var(--ink-3)";
    if (conf >= 0.8) return "var(--good)";
    if (conf >= 0.5) return "var(--warn)";
    return "var(--bad)";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary cards */}
      <div className="verify-meta">
        <div className="meta-card">
          <div className="label">Total Fields</div>
          <div className="value">{total}</div>
        </div>
        <div className="meta-card" style={{ borderColor: mismatched ? "var(--bad)" : "var(--border)" }}>
          <div className="label">Mismatches</div>
          <div className="value" style={{ color: mismatched ? "var(--bad)" : "var(--good)" }}>
            {mismatched}
          </div>
        </div>
        <div className="meta-card" style={{ borderColor: missing ? "var(--warn)" : "var(--border)" }}>
          <div className="label">Missing</div>
          <div className="value" style={{ color: missing ? "var(--warn)" : "var(--good)" }}>
            {missing}
          </div>
        </div>
      </div>

      {/* Field table */}
      <div className="verify-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Status</th>
              <th>Expected</th>
              <th>Found</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isActive = activeDiscrepancy?.field_name === row.field_name;
              return (
                <tr
                  key={i}
                  onClick={() => row.status !== "match" && onPickDiscrepancy(row)}
                  className={row.status !== "match" ? "row-clickable" : ""}
                  style={isActive ? { background: "var(--accent-dim)" } : {}}
                >
                  <td>
                    <div className="field-name-cell">
                      <span className={`field-dot ${dotClass(row.status)}`} />
                      {row.field_name}
                    </div>
                  </td>
                  <td>
                    <span className={`pill ${row.status}`}>{row.status}</span>
                  </td>
                  <td style={{ maxWidth: 140, wordBreak: "break-word" }}>
                    {row.expected ?? <span style={{ color: "var(--ink-3)" }}>—</span>}
                  </td>
                  <td style={{ maxWidth: 140, wordBreak: "break-word" }}>
                    {row.found ?? <span style={{ color: "var(--ink-3)" }}>—</span>}
                  </td>
                  <td>
                    {row.confidence !== undefined && row.confidence !== null ? (
                      <div className="conf-bar-wrap">
                        <div
                          className="conf-bar"
                          style={{
                            width: `${Math.round(row.confidence * 100)}%`,
                            maxWidth: 60,
                            background: confColor(row.confidence),
                          }}
                        />
                        <span className="conf-text">{Math.round(row.confidence * 100)}%</span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--ink-3)" }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
