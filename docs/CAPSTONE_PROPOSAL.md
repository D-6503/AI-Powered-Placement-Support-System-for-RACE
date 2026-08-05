# REVA University Project Proposal

**Project Title**: AI-Powered Placement Intelligence System for REVA  
**Subtitle**: Demand-Aware Resume–Job Matching, Skill-Gap Analysis & Outreach Support  
**Target Programs**: Postgraduate students in AI & Analytics, Cybersecurity, and Cloud Architecture (REVA)

---

## 1. Introduction & Background

REVA (Postgraduate Programs) prepares students for highly technical roles. However, matching graduates to jobs remains inefficient. Traditional approaches rely on static resume-job matching using keywords or simple semantic similarity. These models do not account for dynamic, regional job market demand. A skill like AWS, Git & Version Control, or Software Engineering might be a hard requirement in current job postings for AI Engineers, but standard semantic matching might classify a candidate with standard python skills as a high match, ignoring the missing critical tooling skills.

---

## 2. Problem Statement

Graduates face three key difficulties:
1. **Dynamic Skill Valuation**: Standard match scores do not weigh highly sought-after tools (e.g. Terraform in Cloud, Splunk in Cyber) more than standard baseline concepts.
2. **Actionable Skill Gap Reports**: Existing platforms tell students what skills they lack but fail to map out a clear, step-by-step learning path to resolve the gaps.
3. **Outreach Optimization**: Tailoring cover letters and recruiter emails for dozens of roles is time-consuming and often lacks specific alignment with job descriptions.

---

## 3. Proposed Methodology

Our system introduces a **Demand-Aware Resume-Job Matching Framework**:
1. **In-Domain Skill Taxonomy**: Maps skills to three key domains: AI & Analytics, Cybersecurity, and Cloud Architecture.
2. **Weekly Job Demand Aggregator**: Ingests active job descriptions, parses and extracts skills, and calculates normalized demand weights $W_s \in [0, 1]$.
3. **Multi-Criteria Scoring Engine**: Combines semantic embeddings (Sentence-BERT + FAISS) with required skill coverage, demand-aware importance weights, evidence quality assessments, and candidate eligibility criteria.
4. **Learning Roadmaps**: Translates missing skills directly into a sequential roadmap (e.g., learn concept -> build project -> verify).
5. **Evaluation Dashboard**: Supports academic evaluation by running comparative tests against standard baseline models.

---

## 4. Expected Deliverables

1. **Intelligent Student Portal**: Onboarding guide, resume checker, recommended match cards with explanation drawers, learning paths, outreach generator.
2. **Placement Officer Analytics Console**: Batch readiness reports, program-wise heatmaps, model comparator dashboards, CSV ingestion modules.
3. **Evaluation Metrics Suite**: Benchmarks comparing precision, recall, NDCG, and Spearman correlation of the proposed method against baselines.
