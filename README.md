# 🚢 Nova Trade: AI Document Verification Pipeline

Nova is an intelligent, multi-agent trade document verification system. It automates the extraction, validation, and routing of international trade documents (Invoices, Packing Lists, etc.) while providing a real-time dashboard for shipment monitoring and historical analysis.

## 🚀 Live Demo
- **Frontend**: `https://nova-trade-frontend.onrender.com`
- **Backend API**: `https://trade-document-pipeline.onrender.com`

## ✨ Features

- **Multi-Agent Orchestration**: 
  - **Extractor Agent**: Uses GPT-4o Vision to perform high-accuracy OCR and field extraction from PDFs and Images.
  - **Validator Agent**: Cross-checks extracted data against customer-specific business rules.
  - **Router Agent**: Decides if a shipment should be approved, flagged for review, or if an amendment is required.
- **Traceability & Logs**: Real-time terminal logs with step-by-step progress tracking for every agent action.
- **Natural Language Search**: Query historical shipments using plain English (Text-to-SQL) powered by OpenAI.
- **Email Automation**: Automatic drafting of professional amendment or approval emails, with a manual "Send as CG" trigger.
- **Cloud Ready**: Fully deployed on Render with Neon PostgreSQL integration.

## 🛠 Tech Stack

- **Backend**: FastAPI, Pydantic, SQLAlchemy, OpenAI GPT-4o.
- **Frontend**: React (Vite), Vanilla CSS (Custom Design System).
- **Database**: PostgreSQL (Neon).
- **Deployment**: Render.

## 📦 Project Structure

```text
├── backend/
│   ├── app/
│   │   ├── services/       # AI Agent logic & Pipeline orchestration
│   │   ├── api/            # FastAPI routes
│   │   └── models/         # Database & Pydantic schemas
│   ├── inbox/              # Local processing storage
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── pages/          # Dashboard & Analytics
│   │   └── api/            # Frontend API client
│   └── package.json        # Node dependencies
└── customer_rules.json     # Business logic configuration
```

## 🛠 Installation & Local Setup

### 1. Prerequisites
- Python 3.11+
- Node.js 18+
- OpenAI API Key

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
```
Create a `.env` file in the `backend/` folder:
```env
OPENAI_API_KEY=your_key_here
DATABASE_URL=your_postgres_url
SMTP_USER=your_email
SMTP_PASSWORD=your_app_password
```
Run the server:
```bash
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🧪 Testing the Pipeline
1. Open the dashboard.
2. Upload a trade document (e.g., a Sales Tax Invoice).
3. Watch the **Real-time Pipeline** track the agents through Extraction, Validation, and Routing.
4. Review the **Validation Results** to see field-level matches and discrepancies.
5. Edit and send the **Draft Reply Email** directly from the console.
6. Use the **Database Query** at the bottom to find the shipment later!

---
Developed for the **GoComet Full-Stack AI Engineer Assignment**.
