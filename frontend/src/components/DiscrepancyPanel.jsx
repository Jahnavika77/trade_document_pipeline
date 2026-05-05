export default function DiscrepancyPanel({ discrepancy, crossIssues }) {
  return (
    <div className="right-sidebar">
      <div className="rside-header">
        <h3>🔎 Discrepancy</h3>
        <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
          Click any flagged field to inspect
        </p>
      </div>

      <div className="rside-body">
        {/* Selected field detail */}
        {discrepancy ? (
          <div className="disc-card" key={discrepancy.field_name}>
            <div className="disc-title">
              <span>⚠️</span>
              {discrepancy.field_name}
            </div>

            <div className="disc-row">
              <div className="disc-side expected">
                <div className="lbl">Expected</div>
                <div className="val">{discrepancy.expected ?? "—"}</div>
              </div>
              <div className="disc-side found">
                <div className="lbl">Found</div>
                <div className="val">{discrepancy.found ?? "—"}</div>
              </div>
            </div>

            {discrepancy.message && (
              <div className="disc-msg">💬 {discrepancy.message}</div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--ink-3)", fontSize: 12 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>👆</div>
            Click a flagged field<br />in the table to inspect
          </div>
        )}

        {/* Cross-document issues */}
        {crossIssues?.length > 0 && (
          <div className="cross-issues">
            <div className="section-title">Cross-Doc Issues</div>
            {crossIssues.map((issue, idx) => (
              <div className="cross-issue-card" key={idx}>
                <div className="ci-icon">⚡</div>
                <div>
                  <div className="ci-field">{issue.field_name}</div>
                  <div className="ci-msg">{issue.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!discrepancy && (!crossIssues || crossIssues.length === 0) && (
          <div style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: "var(--ink-3)" }}>
            No cross-document issues
          </div>
        )}
      </div>
    </div>
  );
}
