const getApiBase = () => {
  try {
    return import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
  } catch (e) {
    return "http://localhost:8000/api";
  }
};

const API_BASE = getApiBase();

export async function getShipments() {
  const res = await fetch(`${API_BASE}/shipments`);
  return res.json();
}

export async function getShipmentDetails(id) {
  const res = await fetch(`${API_BASE}/shipments/${id}`);
  return res.json();
}

export async function processShipment(id) {
  const res = await fetch(`${API_BASE}/shipments/${id}/process`, { method: "POST" });
  return res.json();
}

export async function ingestShipment({ customerName, subject, files }) {
  const formData = new FormData();
  formData.append("customer_name", customerName);
  formData.append("subject", subject);
  for (const file of files) formData.append("files", file);

  const res = await fetch(`${API_BASE}/shipments/ingest`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export async function runQuery(question) {
  const res = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  return res.json();
}
export async function sendEmail(id, subject, body) {
  const res = await fetch(`${API_BASE}/shipments/${id}/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, body }),
  });
  return res.json();
}
