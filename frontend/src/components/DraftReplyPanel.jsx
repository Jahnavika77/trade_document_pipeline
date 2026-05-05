import { useEffect, useState } from "react";

export default function DraftReplyPanel({ decision }) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDraft(decision?.draft_email || "");
  }, [decision]);

  const decisionType = decision?.decision; // "approved" | "amendment_required"

  return (
    <div className="draft-wrap">
      {/* Decision badge */}
      {decisionType && (
        <div className={`draft-decision ${decisionType}`}>
          {decisionType === "approved" ? "✅" : "✏️"}
          &nbsp;
          {decisionType === "approved" ? "Approved — ready to send" : "Amendment Required"}
        </div>
      )}

      <div className="section-title">Draft Reply Email</div>
      <p style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 8 }}>
        Agent drafts the reply. CG reviews and sends manually.
      </p>

      <textarea
        rows={14}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Draft amendment or approval reply will appear here after running the pipeline…"
      />

      <div className="send-row">
        <span className="send-note">
          🔒 Agent never sends automatically. You control what goes out.
        </span>
        <button
          className="btn-send"
          onClick={() =>
            alert("✅ Simulated: Email sent by CG after manual review.\n\nIn production this would open your email client.")
          }
          disabled={!draft}
          style={{ opacity: draft ? 1 : 0.4, cursor: draft ? "pointer" : "not-allowed" }}
        >
          ✉️ Send as CG
        </button>
      </div>
    </div>
  );
}
