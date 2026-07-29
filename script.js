// Base URL of the FastAPI backend. Change this if the API runs elsewhere.
const API_BASE = "http://127.0.0.1:2200";

const form = document.getElementById("job-form");
const submitBtn = document.getElementById("submit-btn");
const thresholdInput = document.getElementById("threshold");
const thresholdValue = document.getElementById("threshold-value");

const stateEmpty = document.getElementById("verdict-empty");
const stateLoading = document.getElementById("verdict-loading");
const stateError = document.getElementById("verdict-error");
const stateResult = document.getElementById("verdict-result");
const errorMessage = document.getElementById("error-message");

const stamp = document.getElementById("stamp");
const stampLabel = document.getElementById("stamp-label");
const probabilityValue = document.getElementById("probability-value");
const probabilityFill = document.getElementById("probability-fill");
const thresholdNote = document.getElementById("threshold-note");

// Sample postings for quick testing
const SAMPLES = {
  suspicious: {
    title: "Data Entry Clerk - Work From Home - Earn $5000/week!!!",
    company_profile: "",
    description:
      "No experience needed! Just enter data and earn easy money daily from home. " +
      "Payment via wire transfer immediately, send your bank details to get started today.",
    requirements: "",
    benefits: "Unlimited earning potential, be your own boss",
    salary_range: "",
    employment_type: "Other",
    required_experience: "Not Applicable",
    required_education: "Unspecified",
    telecommuting: true,
    has_company_logo: false,
    has_questions: false,
  },
  legit: {
    title: "Senior Software Engineer",
    company_profile:
      "We are a 200-person fintech company based in New York, founded in 2015, " +
      "backed by top-tier VCs, building payments infrastructure for small businesses.",
    description:
      "We are looking for a Senior Software Engineer to join our backend team. " +
      "You will design and build scalable APIs, mentor junior engineers, and collaborate with product.",
    requirements:
      "5+ years of experience with Python or Go, strong understanding of distributed systems, " +
      "BS/MS in Computer Science or equivalent experience.",
    benefits: "Health, dental, vision insurance, 401k match, unlimited PTO, annual learning stipend.",
    salary_range: "120000-160000",
    employment_type: "Full-time",
    required_experience: "Mid-Senior level",
    required_education: "Bachelor's Degree",
    telecommuting: false,
    has_company_logo: true,
    has_questions: true,
  },
};

// ---- threshold slider display ----
thresholdInput.addEventListener("input", () => {
  thresholdValue.textContent = Number(thresholdInput.value).toFixed(2);
});

// ---- sample / clear buttons ----
document.querySelectorAll("[data-sample]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.sample;
    if (key === "clear") {
      form.reset();
      thresholdValue.textContent = "0.50";
      showState(stateEmpty);
      return;
    }
    fillForm(SAMPLES[key]);
  });
});

function fillForm(sample) {
  form.title.value = sample.title;
  form.company_profile.value = sample.company_profile;
  form.description.value = sample.description;
  form.requirements.value = sample.requirements;
  form.benefits.value = sample.benefits;
  form.salary_range.value = sample.salary_range;
  form.employment_type.value = sample.employment_type;
  form.required_experience.value = sample.required_experience;
  form.required_education.value = sample.required_education;
  form.telecommuting.checked = sample.telecommuting;
  form.has_company_logo.checked = sample.has_company_logo;
  form.has_questions.checked = sample.has_questions;
}

// ---- verdict panel state switching ----
function showState(el) {
  [stateEmpty, stateLoading, stateError, stateResult].forEach((s) =>
    s.classList.add("hidden")
  );
  el.classList.remove("hidden");
}

// ---- form submit -> call API -> render verdict ----
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const threshold = Number(thresholdInput.value);

  const payload = {
    title: form.title.value.trim(),
    company_profile: form.company_profile.value,
    description: form.description.value,
    requirements: form.requirements.value,
    benefits: form.benefits.value,
    salary_range: form.salary_range.value.trim() || null,
    employment_type: form.employment_type.value,
    required_experience: form.required_experience.value,
    required_education: form.required_education.value,
    telecommuting: form.telecommuting.checked ? 1 : 0,
    has_company_logo: form.has_company_logo.checked ? 1 : 0,
    has_questions: form.has_questions.checked ? 1 : 0,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Reviewing…";
  showState(stateLoading);

  try {
    const url = `${API_BASE}/predict?threshold=${encodeURIComponent(threshold)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      const detail = errBody && errBody.detail
        ? formatErrorDetail(errBody.detail)
        : `Request failed with status ${response.status}`;
      throw new Error(detail);
    }

    const result = await response.json();
    renderResult(result, threshold);
  } catch (err) {
    errorMessage.textContent =
      err.message || "Could not reach the API. Is the FastAPI server running?";
    showState(stateError);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Review posting";
  }
});

function formatErrorDetail(detail) {
  if (Array.isArray(detail)) {
    return detail
      .map((d) => `${(d.loc || []).slice(-1)[0]}: ${d.msg}`)
      .join("; ");
  }
  return String(detail);
}

function renderResult(result, threshold) {
  const isFraud = result.prediction === "FRAUDULENT";
  const pct = Math.round(result.fraud_probability * 100);

  stampLabel.textContent = result.prediction;
  stamp.classList.toggle("fraud", isFraud);

  probabilityValue.textContent = `${pct}%`;
  probabilityFill.style.width = `${pct}%`;
  probabilityFill.classList.toggle("fraud", isFraud);

  thresholdNote.textContent = `Flagged as FRAUDULENT when probability ≥ ${threshold.toFixed(2)}.`;

  showState(stateResult);
}