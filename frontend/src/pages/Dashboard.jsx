import { useEffect, useState, useRef } from "react";
import {
  getShipments,
  getShipmentDetails,
  processShipment,
  ingestShipment,
  runQuery,
} from "../api/client";

// ── Pipeline step definitions ──────────────────────────────
const PIPELINE_STEPS = [
  { id: "ingest",   label: "Document Ingestion",   icon: "📄", desc: "Uploading files and creating shipment record…" },
  { id: "extract",  label: "Extraction Agent",      icon: "🔍", desc: "OCR and structured field extraction from documents…" },
  { id: "validate", label: "Validation Agent",      icon: "✅", desc: "Cross-checking fields against customer rules…" },
  { id: "route",    label: "Router Agent",          icon: "📝", desc: "Deciding outcome and drafting amendment/approval reply…" },
  { id: "save",     label: "Saved to Database",     icon: "💾", desc: "Verification record stored successfully." },
];

// status: idle | running | done | error
function stepStatus(stepIdx, activeStep, error) {
  if (error && activeStep === stepIdx) return "error";
  if (stepIdx < activeStep) return "done";
  if (stepIdx === activeStep) return "active";
  return "idle";
}

export default function Dashboard() {
  // ── Upload state ───────────────────────────
  const [customerName,  setCustomerName]  = useState("Max Enterprises");
  const [subject,       setSubject]       = useState("Manual Upload");
  const [files,        setFiles]        = useState([]);
  const fileRef = useRef();

  // ── Pipeline state ─────────────────────────
  const [phase,       setPhase]       = useState("idle");   // idle | running | done | error
  const [activeStep,  setActiveStep]  = useState(-1);
  const [stepMsgs,    setStepMsgs]    = useState({});       // stepIdx -> message
  const [pipelineErr, setPipelineErr] = useState("");

  // ── Result state ───────────────────────────
  const [result,      setResult]      = useState(null);     // shipment detail object
  const [draftSubject,setDraftSubject]    = useState("");
  const [draftEmail,  setDraftEmail]  = useState("");

  // ── History ────────────────────────────────
  const [history,     setHistory]     = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ── Query ──────────────────────────────────
  const [queryText,   setQueryText]   = useState("");
  const [queryResult, setQueryResult] = useState(null);
  const [queryErr,    setQueryErr]    = useState("");
  const [querying,    setQuerying]    = useState(false);
  const [sending,     setSending]     = useState(false);

  // Load history on mount and after each pipeline run
  const loadHistory = async () => {
    setLoadingHistory(true);
    try { setHistory(await getShipments()); }
    catch { setPipelineErr("connection_failed"); }
    finally { setLoadingHistory(false); }
  };

  useEffect(() => { loadHistory(); }, []);

  // ── Single "Upload & Process" handler ─────
  const handleRun = async () => {
    if (!files.length) {
      fileRef.current?.click();
      return;
    }
    setPhase("running");
    setActiveStep(0);
    setStepMsgs({});
    setPipelineErr("");
    setResult(null);
    setDraftSubject("");
    setDraftEmail("");

    try {
      // Step 0 — Ingest
      setActiveStep(0);
      const created = await ingestShipment({ customerName, subject, files });
      if (!created?.shipment_id) throw new Error("Ingest failed — no shipment ID returned.");
      const shipmentId = created.shipment_id;
      setStepMsgs(m => ({ ...m, 0: `Created shipment #${shipmentId}` }));

      // Step 1 — Extract (simulate progress while processShipment runs)
      setActiveStep(1);
      await sleep(600);
      setActiveStep(2);
      await sleep(400);
      setActiveStep(3);

      // Steps 2+3 run inside processShipment on the backend
      const processed = await processShipment(shipmentId);

      // Step 4 — Fetch full details
      setActiveStep(4);
      const detail = await getShipmentDetails(shipmentId);
      setResult(detail);
      setDraftSubject(detail?.decision?.email_subject || `Trade Document Verification - ${shipmentId}`);
      setDraftEmail(detail?.decision?.draft_email || "");

      setPhase("done");
      loadHistory();
    } catch (e) {
      setPipelineErr(e.message || "Pipeline failed.");
      setPhase("error");
    }
  };

  const handleFilePick = (e) => {
    const picked = Array.from(e.target.files || []);
    setFiles(picked);
    if (picked.length) setPhase("idle"); // reset if user picks new files
  };

  const handleSendEmail = async () => {
    if (!result || !draftEmail) return;
    setSending(true);
    try {
      const subject = draftSubject || result.subject;
      await import("../api/client").then(m => m.sendEmail(result.shipment_id, subject, draftEmail));
      alert("✅ Email sent successfully!");
    } catch (e) {
      alert("❌ Failed to send email: " + e.message);
    } finally {
      setSending(false);
    }
  };

  // ── Query handler ──────────────────────────
  const handleQuery = async () => {
    if (!queryText.trim() || querying) return;
    setQuerying(true);
    setQueryErr("");
    setQueryResult(null);
    try {
      const out = await runQuery(queryText);
      if (out?.detail) { setQueryErr(out.detail); return; }
      setQueryResult(out);
    } catch { setQueryErr("Query failed — is the backend running?"); }
    finally { setQuerying(false); }
  };

  // ── Derived ────────────────────────────────
  const isRunning = phase === "running";
  const isDone    = phase === "done";
  const isError   = phase === "error";

  const rows        = result?.validation_results || [];
  const matched     = rows.filter(r => r.status === "match").length;
  const mismatched  = rows.filter(r => r.status === "mismatch").length;
  const missing     = rows.filter(r => r.status === "missing").length;
  const decisionType = result?.decision?.decision; // "approved" | "amendment_required"

  if (pipelineErr === "connection_failed" && !history.length) {
    return (
      <div className="page" style={{ alignItems: "center", justifyContent: "center", height: "80vh", textAlign: "center" }}>
        <h2 style={{ color: "var(--bad)", marginBottom: 12 }}>Connection Error</h2>
        <p style={{ color: "var(--ink-2)", maxWidth: 300 }}>Could not connect to the backend server. Please check your VITE_API_BASE_URL.</p>
        <button className="btn btn-ghost" style={{ marginTop: 24 }} onClick={() => window.location.reload()}>Retry Connection</button>
      </div>
    );
  }

  return (
    <div className="page">

      {/* ── Header ───────────────────────────── */}
      <nav className="topnav">
        <div className="brand-icon">🚢</div>
        <h1>Nova CG Console</h1>
        <span className="badge">GoComet</span>
      </nav>

      {/* ══ SECTION 1 — Upload ════════════════ */}
      <div className="card">
        <div className="card-title">📥 Upload Shipment Documents</div>

        <div style={{ marginBottom: 16, color: "var(--ink-2)", fontSize: 13 }}>
          Verifying documents for <strong>{customerName}</strong>
        </div>

          <div
            className={`upload-dropzone ${files.length ? "has-files" : ""}`}
            onClick={() => !isRunning && fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFilePick}
              style={{ display: "none" }}
            />
            <div className="drop-icon">📂</div>
            {files.length ? (
              <div className="drop-files">
                {files.length} file{files.length > 1 ? "s" : ""} selected: {files.map(f => f.name).join(", ")}
              </div>
            ) : (
              <>
                <div className="drop-label">Click to select PDF / image files</div>
                <div className="drop-sub">BOL · Invoice · Packing List · Certificate of Origin</div>
              </>
            )}
          </div>

        <button
          className="btn btn-primary btn-full"
          onClick={handleRun}
          disabled={isRunning}
          style={{ marginTop: 4 }}
        >
          {isRunning
            ? "⏳ Processing…"
            : files.length
              ? "▶ Upload & Run Pipeline"
              : "📂 Select Files to Begin"}
        </button>

        {isError && <p className="error-msg">❌ {pipelineErr}</p>}
      </div>

      {/* ══ SECTION 2 — Pipeline Steps ════════ */}
      {phase !== "idle" && (
        <div className="card" style={{ animation: "rise .3s ease" }}>
          <div className="card-title">⚙️ Pipeline Progress</div>

          <div className="steps">
            {PIPELINE_STEPS.map((step, idx) => {
              const st = stepStatus(idx, activeStep, isError);
              const isLast = idx === PIPELINE_STEPS.length - 1;
              return (
                <div className="step-row" key={step.id}>
                  <div className="step-left">
                    <div className={`step-dot ${st}`}>
                      {st === "done"   ? "✓"
                       : st === "error" ? "✕"
                       : st === "active" ? <SpinnerDot />
                       : step.icon}
                    </div>
                    {!isLast && <div className={`step-line ${st === "done" ? "done" : ""}`} />}
                  </div>
                  <div className="step-body">
                    <div className={`step-name ${st === "idle" ? "muted" : ""}`}>{step.label}</div>
                    {(st === "active" || st === "done") && (
                      <div className="step-desc">
                        {st === "done" && stepMsgs[idx]
                          ? stepMsgs[idx]
                          : st === "done"
                            ? "Complete"
                            : step.desc}
                      </div>
                    )}
                    {st === "error" && (
                      <div className="step-desc" style={{ color: "var(--bad)" }}>{pipelineErr}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ SECTION 3 — Results ══════════════ */}
      {isDone && result && (
        <div className="card" style={{ animation: "rise .3s ease" }}>
          <div className="card-title">📊 Verification Result</div>

          {/* Summary stats */}
          <div className="result-summary">
            <div className="stat">
              <div className="stat-value">{rows.length}</div>
              <div className="stat-label">Fields Checked</div>
            </div>
            <div className="stat">
              <div className="stat-value" style={{ color: mismatched ? "var(--bad)" : "var(--good)" }}>
                {mismatched}
              </div>
              <div className="stat-label">Mismatches</div>
            </div>
            <div className="stat">
              <div className="stat-value" style={{ color: missing ? "var(--warn)" : "var(--good)" }}>
                {missing}
              </div>
              <div className="stat-label">Missing</div>
            </div>
          </div>

          {/* Field-by-field table grouped by document */}
          {result.documents?.map((doc) => {
            const docRows = rows.filter(r => r.document_id === doc.id);
            if (docRows.length === 0) return null;
            return (
              <div key={doc.id} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>📄</span> {doc.file_name}
                </div>
                <table className="field-table">
                  <thead>
                    <tr>
                      <th style={{ width: "30%" }}>Field</th>
                      <th style={{ width: "15%" }}>Status</th>
                      <th style={{ width: "27%" }}>Expected</th>
                      <th style={{ width: "28%" }}>Found</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docRows.map((row, i) => (
                      <tr key={i}>
                        <td>
                          <span className={`dot ${row.status}`} />
                          {row.field_name}
                        </td>
                        <td><span className={`pill ${row.status}`}>{row.status}</span></td>
                        <td style={{ color: "var(--ink-2)", wordBreak: "break-all" }}>
                          {row.expected ?? "—"}
                        </td>
                        <td style={{ wordBreak: "break-all" }}>
                          {row.found ?? <span style={{ color: "var(--ink-3)" }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* Cross-doc issues */}
          {result.cross_document_issues?.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--ink-3)", margin: "8px 0 10px" }}>
                Cross-Document Issues
              </div>
              {result.cross_document_issues.map((issue, i) => (
                <div key={i} style={{ background: "#f59e0b10", border: "1px solid #f59e0b30", borderLeft: "3px solid var(--warn)", borderRadius: "var(--r-sm)", padding: "8px 12px", marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: "var(--warn)", fontSize: 12 }}>{issue.field_name}</span>
                  <span style={{ color: "var(--ink-2)", fontSize: 12 }}> — {issue.message}</span>
                </div>
              ))}
            </>
          )}

          <hr className="divider" />

          {/* Draft email */}
          <div className="draft-label">Draft Reply Email</div>
          {decisionType && (
            <div className={`decision-badge ${decisionType}`}>
              {decisionType === "approved" ? "✅ Approved" : "✏️ Amendment Required"}
            </div>
          )}
          <input
            type="text"
            value={draftSubject}
            onChange={e => setDraftSubject(e.target.value)}
            placeholder="Email Subject..."
            style={{ marginBottom: 10, fontWeight: "600" }}
          />
          <textarea
            value={draftEmail}
            onChange={e => setDraftEmail(e.target.value)}
            placeholder="Draft reply will appear here…"
            rows={8}
          />
          <p className="muted-text" style={{ margin: "8px 0 14px" }}>
            🔒 Review the draft above. Agent never sends automatically — click below when ready.
          </p>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-green"
              onClick={handleSendEmail}
              disabled={sending || !draftEmail}
            >
              {sending ? "Sending..." : "📧 Send as CG"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => { setPhase("idle"); setFiles([]); setResult(null); }}
            >
              ↩ New Shipment
            </button>
          </div>
        </div>
      )}

      {/* ══ SECTION 4 — History ══════════════ */}
      <div className="card">
        <div className="card-title" style={{ justifyContent: "space-between" }}>
          <span>📋 Shipment History</span>
          <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={loadHistory}>
            {loadingHistory ? "…" : "↻ Refresh"}
          </button>
        </div>

        {history.length === 0 ? (
          <p className="muted-text">No shipments yet — upload your first documents above.</p>
        ) : (
          <>
            <div className="history-row">
              <span className="hl">Customer</span>
              <span className="hl">Subject</span>
              <span className="hl">Status</span>
              <span className="hl">ID</span>
            </div>
            {history.map(s => (
              <div className="history-row" key={s.id}>
                <span style={{ fontWeight: 500 }}>{s.customer_name}</span>
                <span style={{ color: "var(--ink-2)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.subject}
                </span>
                <span className={`pill ${s.status}`}>{s.status?.replace("_", " ")}</span>
                <span style={{ color: "var(--ink-3)", fontSize: 12 }}>#{s.id}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ══ SECTION 5 — NL Query ═════════════ */}
      <div className="card">
        <div className="card-title">🔎 Database Query</div>
        <p className="muted-text" style={{ marginBottom: 12 }}>
          Ask a question in plain English — e.g. "show all verified shipments for Max Enterprises"
        </p>

        <div className="query-row">
          <input
            type="text"
            value={queryText}
            onChange={e => setQueryText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleQuery()}
            placeholder="Type your question and press Enter…"
          />
          <button className="btn btn-primary" onClick={handleQuery} disabled={querying}>
            {querying ? "…" : "Run"}
          </button>
        </div>

        {queryErr && <p className="error-msg">{queryErr}</p>}

        {queryResult && (
          <div className="query-result">
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>SQL Generated</div>
            <div className="code-block sql">{queryResult.sql}</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", margin: "10px 0 4px", textTransform: "uppercase", letterSpacing: ".4px" }}>Results</div>
            <div className="code-block">{JSON.stringify(queryResult.rows, null, 2)}</div>
          </div>
        )}
      </div>

    </div>
  );
}

// Tiny animated spinner dot
function SpinnerDot() {
  return <span style={{ display: "inline-block", animation: "spin .8s linear infinite", fontSize: 13 }}>⏳</span>;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
