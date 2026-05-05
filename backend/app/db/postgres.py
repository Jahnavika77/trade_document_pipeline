import psycopg
from psycopg.rows import dict_row
from app.core.config import settings


def get_conn():
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is required. Set Neon PostgreSQL connection string.")
    return psycopg.connect(settings.database_url, row_factory=dict_row)


def init_db():
    ddl = """
    CREATE TABLE IF NOT EXISTS shipments (
        id TEXT PRIMARY KEY,
        customer_name TEXT NOT NULL,
        subject TEXT NOT NULL,
        status TEXT NOT NULL,
        decision_outcome TEXT,
        decision_reasoning TEXT,
        draft_email TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        shipment_id TEXT REFERENCES shipments(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS field_extractions (
        id BIGSERIAL PRIMARY KEY,
        shipment_id TEXT REFERENCES shipments(id) ON DELETE CASCADE,
        document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
        field_name TEXT NOT NULL,
        field_value TEXT,
        confidence DOUBLE PRECISION NOT NULL
    );

    CREATE TABLE IF NOT EXISTS validation_results (
        id BIGSERIAL PRIMARY KEY,
        shipment_id TEXT REFERENCES shipments(id) ON DELETE CASCADE,
        document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
        field_name TEXT NOT NULL,
        status TEXT NOT NULL,
        expected TEXT,
        found TEXT,
        message TEXT
    );

    CREATE TABLE IF NOT EXISTS cross_validation_results (
        id BIGSERIAL PRIMARY KEY,
        shipment_id TEXT REFERENCES shipments(id) ON DELETE CASCADE,
        field_name TEXT NOT NULL,
        values_by_document JSONB NOT NULL,
        message TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shipment_events (
        id BIGSERIAL PRIMARY KEY,
        shipment_id TEXT REFERENCES shipments(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        payload JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
    );
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(ddl)
        conn.commit()
