# System Architecture

This document describes the system architecture and processing pipelines for the **AI-Powered Placement Intelligence System for REVA**.

---

## 1. High-Level Architecture Overview

The system follows a classic **Three-Tier Architecture** tailored for offline/local AI operations on a Windows laptop:

1. **Frontend Presentation Layer (React/Next.js)**:
   - Interfaces for students (dashboard, resume auditor, job matches, skill gaps, learning paths) and placement officers (student search, analytics, heatmaps, model evaluation).
   - Local state management, animations (Framer Motion), interactive charts (Recharts), and visual walkthroughs (React Joyride).

2. **Backend Services Layer (FastAPI)**:
   - Exposes REST endpoints, validates inputs, verifies user auth tokens (JWT), and coordinates pipelines.
   - Core Python processing modules for document parsing, NLP extraction, matching models, demand snapshots, and local generation.

3. **Storage & Embedding Layer (SQLite, FAISS & FS)**:
   - **SQLite Database**: Core relational database mapping users, students, resumes, jobs, matching scores, applications, and logs.
   - **FAISS Vector Index**: Flat CPU-based vector search storing high-dimensional Sentence-BERT embeddings of job postings for rapid semantic matches.
   - **File System Storage**: Persistent repository for uploaded resume files.

---

## 2. Ingestion & Matching Pipeline

```
   [Resume Document]                     [Job Postings]
          │                                     │
          ▼                                     ▼
   ┌──────────────┐                      ┌──────────────┐
   │  spaCy / PDF │                      │  Ingestion   │
   │  Extraction  │                      │ (CSV/Crawler)│
   └──────┬───────┘                      └──────┬───────┘
          │                                     │
          ▼                                     ▼
   ┌──────────────┐                      ┌──────────────┐
   │ Skill Match  │                      │ Skill Match  │
   │  Taxonomy    │                      │  Taxonomy    │
   └──────┬───────┘                      └──────┬───────┘
          │                                     │
          ▼                                     ▼
   ┌──────────────┐                      ┌──────────────┐
   │   Resume     │                      │     Job      │
   │  Text Block  │                      │  Text Block  │
   └──────┬───────┘                      └──────┬───────┘
          │                                     │
          └─────────────────┬───────────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ Sentence-BERT│
                     │  Embeddings  │
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ FAISS Index  │
                     │ Search Query │
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ Demand-Aware │
                     │ Score Engine │
                     └──────────────┘
```

### Ingestion Details
* **Resume Parser**: Extracts sections (Contact, Education, Skills, Projects, Experience) using custom regex rule heuristics and a trained spaCy pipeline (`en_core_web_sm`).
* **Skill Extraction**: Matches extracted tokens against the canonical `skills_master` catalog (compiled from standard AI, Cybersecurity, and Cloud domains).
* **Job Crawler**: Downloads job text from specific target links, parses headers, extracts required skills, and saves raw metadata.

---

## 3. Demand-Aware Scoring Engine

The matching score consists of six distinct variables, weighted to prioritize real-world live market demand:

$$\text{Final Score} = 0.30 \cdot S_{\text{semantic}} + 0.25 \cdot C_{\text{skills}} + 0.20 \cdot D_{\text{demand}} + 0.15 \cdot Q_{\text{evidence}} + 0.05 \cdot E_{\text{experience}} + 0.05 \cdot L_{\text{location}}$$

### Sub-Score Formulations

1. **Semantic Similarity ($S_{\text{semantic}}$)**:
   - Cosine similarity between the S-BERT embedding (`all-MiniLM-L6-v2`) of the student's resume text and the job description text.
   - Ranges between $-1.0$ and $1.0$, normalized to $0.0 - 100.0$.

2. **Required Skill Coverage ($C_{\text{skills}}$)**:
   - Ratio of matched required skills to total required job skills.
   - $$C_{\text{skills}} = \frac{|\text{Student Skills} \cap \text{Job Required Skills}|}{|\text{Job Required Skills}|}$$

3. **Demand-Aware Skill Score ($D_{\text{demand}}$)**:
   - Weights matching skills by their normalised frequency in the active job market.
   - $$D_{\text{demand}} = \frac{\sum_{s \in \text{Matched Skills}} W_s}{\sum_{s \in \text{Job Required Skills}} W_s}$$
   - Where $W_s$ is the demand weight of skill $s$ computed from active job listings.

4. **Evidence Quality ($Q_{\text{evidence}}$)**:
   - Assesses if matched skills are verified by experience or academic projects.
   - For each matched skill, if the skill appears within a project description or work experience description in the resume, it receives higher evidence weighting.

5. **Experience Fit ($E_{\text{experience}}$)**:
   - Boolean check:
     $$\text{Experience Fit} = \begin{cases} 100.0 & \text{if Student Experience} \ge \text{Job Required Experience} \\ 50.0 & \text{if Student Experience} < \text{Job Required Experience} \text{ (within 2 years gap)} \\ 0.0 & \text{otherwise} \end{cases}$$

6. **Location & Freshness Fit ($L_{\text{location}}$)**:
   - Assesses if job location matches student preference and penalizes stale postings.
