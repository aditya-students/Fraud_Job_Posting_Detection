# 🕵️ Fraud Job Posting Detection

A machine learning–powered web application that detects fraudulent job postings in real time. Users submit a job listing through a browser-based "Case File" interface, and a **FastAPI** backend classifies it as **LEGITIMATE** or **FRAUDULENT** along with a fraud-probability score.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [ML Pipeline](#ml-pipeline)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Screenshots](#screenshots)
- [License](#license)

---

## Overview

Online job scams exploit applicants by collecting personal information or charging upfront fees for positions that don't exist. This project tackles the problem by training a **Logistic Regression** model on the [EMSCAD (Employment Scam Aegean Dataset)](https://www.kaggle.com/datasets/shivamb/real-or-fake-fake-jobposting-prediction) to learn the textual and structural signals that distinguish legitimate postings from fraudulent ones.

The trained model is served behind a FastAPI endpoint and consumed by a retro "Fraud Review Desk" web UI where users can paste any job posting and receive an instant verdict.

---

## Features

| Feature | Description |
|---|---|
| **Real-time prediction** | Submit a job posting and get a LEGITIMATE / FRAUDULENT verdict with a fraud probability score |
| **Adjustable decision threshold** | Slider to tune precision vs. recall — lower values flag more postings (favors recall) |
| **Sample postings** | One-click buttons to load a suspicious or legitimate sample for quick testing |
| **Combined text + structured features** | Model leverages both free-text (TF-IDF) and structured metadata (missing fields, employment type, etc.) |
| **Responsive UI** | Works on desktop and mobile with a vintage case-file aesthetic |

---

## Tech Stack

### Backend
- **Python 3.10+**
- **FastAPI** — async REST API framework
- **Uvicorn** — ASGI server
- **scikit-learn** — model training and inference
- **pandas / NumPy / SciPy** — data processing

### Frontend
- **HTML5 / CSS3 / Vanilla JavaScript**
- Retro paper-textured "Fraud Review Desk" theme

### ML Artifacts
| File | Description |
|---|---|
| `best_logistic_regression_model.pkl` | Trained Logistic Regression classifier |
| `tfidf_vectorizer.pkl` | Fitted TF-IDF vectorizer for text features |
| `minmax_scaler.pkl` | MinMax scaler for structured numerical features |

---

## Project Structure

```
Fraud_Job_Posting_Detection/
├── Fake_Job_Posting_Detection_Final.ipynb   # Full EDA, training & evaluation notebook
├── main.py                                  # FastAPI application (prediction endpoint)
├── index.html                               # Frontend — Case File intake form
├── script.js                                # Frontend logic — API calls & verdict rendering
├── style.css                                # Retro paper-themed stylesheet
├── best_logistic_regression_model.pkl       # Trained model artifact
├── tfidf_vectorizer.pkl                     # TF-IDF vectorizer artifact
├── minmax_scaler.pkl                        # MinMax scaler artifact
├── requirements.txt                         # Python dependencies
└── README.md                               # This file
```

---

## ML Pipeline

The full pipeline is documented in [`Fake_Job_Posting_Detection_Final.ipynb`](Fake_Job_Posting_Detection_Final.ipynb) and follows these stages:

1. **Data Loading & EDA** — Dataset is heavily imbalanced (~4.8 % fraud). Explored class distribution, missing-value patterns, and text-length distributions.

2. **Preprocessing** — HTML/URL stripping, lowercasing, non-alpha removal, whitespace normalization on all free-text fields (`title`, `company_profile`, `description`, `requirements`, `benefits`).

3. **Feature Engineering**
   - **Text features:** TF-IDF on the concatenated text fields.
   - **Structured features:** Binary flags (`telecommuting`, `has_company_logo`, `has_questions`), missingness indicators (`company_profile_missing`, `salary_range_missing`, etc.), `text_len`, `word_count`, and one-hot encoded categoricals (`employment_type`, `required_experience`, `required_education`).

4. **Model Selection** — Compared Naive Bayes, Logistic Regression, Random Forest, and Gradient Boosting. Evaluated with Precision, Recall, F1-score, and ROC-AUC under stratified cross-validation.

5. **Hyperparameter Tuning** — Grid search on Logistic Regression (best by F1). Tuned decision threshold for precision-recall trade-off.

6. **Feature Ablation** — Confirmed that adding structured features on top of text-only TF-IDF provides measurable lift.

7. **Model Interpretation** — Top fraud-indicative TF-IDF terms align with known scam patterns (vague pay language, "home-based" / "data entry" keywords, missing company profiles).

---

## Getting Started

### Prerequisites

- Python 3.10 or higher
- pip

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/aditya-students/Fraud_Job_Posting_Detection.git
   cd Fraud_Job_Posting_Detection
   ```

2. **Create and activate a virtual environment**

   ```bash
   python -m venv venv

   # Windows
   venv\Scripts\activate

   # macOS / Linux
   source venv/bin/activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

### Running the Application

1. **Start the FastAPI server**

   ```bash
   uvicorn main:app --host 127.0.0.1 --port 2200 --reload
   ```

2. **Open the frontend**

   Open `index.html` in your browser (or use a live-server extension). The frontend talks to `http://127.0.0.1:2200` by default.

3. **Try it out** — Fill in a job posting or click **Load suspicious sample** / **Load legitimate sample**, then hit **Review posting**.

---

## API Reference

### `GET /`

Health-check endpoint.

**Response:**
```json
{ "message": "Fake Job Posting Detection API is running" }
```

### `POST /predict?threshold=0.5`

Classify a job posting as fraudulent or legitimate.

**Query Parameter:**
| Param | Type | Default | Description |
|---|---|---|---|
| `threshold` | float (0–1) | 0.5 | Probability cutoff for the FRAUDULENT label |

**Request Body (JSON):**
| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | ✅ | Job title |
| `company_profile` | string | | Company description |
| `description` | string | | Job description |
| `requirements` | string | | Skills & qualifications |
| `benefits` | string | | Perks & compensation |
| `salary_range` | string \| null | | e.g. `"60000-80000"` |
| `employment_type` | string | | `Full-time`, `Part-time`, `Contract`, `Temporary`, `Other`, or `Unspecified` |
| `required_experience` | string | | e.g. `Mid-Senior level`, `Entry level` |
| `required_education` | string | | e.g. `Bachelor's Degree`, `Master's Degree` |
| `telecommuting` | int (0/1) | | Remote position flag |
| `has_company_logo` | int (0/1) | | Company logo present |
| `has_questions` | int (0/1) | | Screening questions present |

**Response:**
```json
{
  "prediction": "LEGITIMATE",
  "fraud_probability": 0.0312
}
```

---

## Screenshots

### Legitimate Posting Verdict
The form is submitted with a well-detailed posting. The desk stamps it **LEGITIMATE** with a low fraud probability.

### Fraudulent Posting Verdict
A vague, too-good-to-be-true posting triggers a **FRAUDULENT** stamp with a high probability score.

---

## License

This project is developed for educational and research purposes.

---

> **Disclaimer:** This tool flags textual and structural patterns — it does not verify factual claims. Treat the prediction as a triage signal, not a final ruling.
