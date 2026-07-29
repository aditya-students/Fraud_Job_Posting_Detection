import re
import joblib
import pandas as pd
from scipy.sparse import hstack, csr_matrix
from fastapi.middleware.cors import CORSMiddleware

from fastapi import FastAPI, Query
from pydantic import BaseModel, Field

app = FastAPI(title="Fake Job Posting Detection API")

# ---------------------------------------------------------
# Load the trained artifacts
# ---------------------------------------------------------
tfidf = joblib.load("tfidf_vectorizer.pkl")
scaler = joblib.load("minmax_scaler.pkl")
model = joblib.load("best_logistic_regression_model.pkl")

# Exact structured column order the scaler/model were trained on
STRUCT_COLUMNS = list(scaler.feature_names_in_)
CAT_COLS = ["employment_type", "required_experience", "required_education"]
TEXT_FIELDS = ["title", "company_profile", "description", "requirements", "benefits"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Text cleaning (same as the notebook)
# ---------------------------------------------------------
def clean_text(text):
    text = str(text or "")
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"http\S+|www\.\S+", " ", text)
    text = text.lower()
    text = re.sub(r"[^a-z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ---------------------------------------------------------
# Request schema (with validation)
# ---------------------------------------------------------
class JobPosting(BaseModel):
    title: str = Field(..., min_length=1, description="Job title (required)")
    company_profile: str = ""
    description: str = ""
    requirements: str = ""
    benefits: str = ""

    # binary flags: only 0 or 1 allowed
    telecommuting: int = Field(0, ge=0, le=1)
    has_company_logo: int = Field(0, ge=0, le=1)
    has_questions: int = Field(0, ge=0, le=1)

    employment_type: str = "Unspecified"
    required_experience: str = "Unspecified"
    required_education: str = "Unspecified"
    salary_range: str | None = None


# ---------------------------------------------------------
# Feature building + prediction
# ---------------------------------------------------------
def predict_posting(posting: dict, threshold: float = 0.5):
    # text features
    combined = " ".join(str(posting.get(f, "")) for f in TEXT_FIELDS)
    cleaned = clean_text(combined)
    text_vec = tfidf.transform([cleaned])

    # structured features
    row = {
        "telecommuting": int(posting.get("telecommuting", 0) or 0),
        "has_company_logo": int(posting.get("has_company_logo", 0) or 0),
        "has_questions": int(posting.get("has_questions", 0) or 0),
        "company_profile_missing": int(not posting.get("company_profile")),
        "requirements_missing": int(not posting.get("requirements")),
        "benefits_missing": int(not posting.get("benefits")),
        "salary_range_missing": int(not posting.get("salary_range")),
        "text_len": len(cleaned),
        "word_count": len(cleaned.split()),
    }
    for col in CAT_COLS:
        row[col] = posting.get(col) or "Unspecified"

    row_df = pd.DataFrame([row])
    row_df = pd.get_dummies(row_df, columns=CAT_COLS)
    row_df = row_df.reindex(columns=STRUCT_COLUMNS, fill_value=0)
    struct_scaled = scaler.transform(row_df)

    # combine text + structured, predict
    X = hstack([text_vec, csr_matrix(struct_scaled)]).tocsr()
    proba = model.predict_proba(X)[0, 1]
    label = "FRAUDULENT" if proba >= threshold else "LEGITIMATE"

    return {"prediction": label, "fraud_probability": round(float(proba), 4)}


# ---------------------------------------------------------
# Routes
# ---------------------------------------------------------
@app.get("/")
def home():
    return {"message": "Fake Job Posting Detection API is running"}


@app.post("/predict")
def predict(
    posting: JobPosting,
    threshold: float = Query(0.5, ge=0.0, le=1.0, description="Probability cutoff for FRAUDULENT label"),
):
    return predict_posting(posting.dict(), threshold)