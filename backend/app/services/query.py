import re
from openai import OpenAI
from app.core.config import settings
from app.db.postgres import get_conn

client = OpenAI(api_key=settings.openai_api_key)

SCHEMA_HINT = """
Table shipments(id, customer_name, subject, status, decision_outcome, decision_reasoning, draft_email, created_at)
  -- status values: 'incoming', 'processing', 'verified', 'review_required', 'failed'
Table documents(id, shipment_id, file_name, file_path, created_at)
Table validation_results(id, shipment_id, document_id, field_name, status, expected, found, message)
  -- status values: 'match', 'mismatch', 'uncertain'
Table cross_validation_results(id, shipment_id, field_name, values_by_document, message)
"""


def nlp_query(question: str):
    prompt = f"Generate a safe PostgreSQL SELECT query only. No markdown. Schema:\n{SCHEMA_HINT}\nQuestion: {question}"
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    sql = resp.choices[0].message.content.strip()
    sql = sql.replace("```sql", "").replace("```", "").strip()

    if not sql.lower().startswith("select"):
        raise ValueError("Only SELECT queries are allowed")

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()

    return {"sql": sql, "rows": rows}
