# Evaluation Plan

This document outlines the validation and evaluation methodology to verify the proposed **Demand-Aware Resume-Job Matching** approach against classic matching baselines.

---

## 1. Evaluation Objectives

The objective is to demonstrate that integrating demand-weighted skill scoring with semantic similarity yields recommendations that are more aligned with recruiter preferences and job market requirements compared to standard models.

---

## 2. Baseline Models

We will compare the proposed model against three standard benchmark configurations:
1. **Keyword Overlap**: Direct count-based intersection of extracted resume skills and job requirements.
2. **TF-IDF + Cosine**: Classic term-frequency representation matching between parsed resume text and job description text.
3. **Sentence-BERT Semantic Similarity**: Standard cosine similarity using `all-MiniLM-L6-v2` dense vectors of the full texts (no demand weighting).

---

## 3. Evaluation Metrics

For a given cohort of students and jobs, we evaluate recommendation quality using the following ranking metrics:

* **Precision@K (P@5, P@10)**:
  $$P@K = \frac{\text{Relevant Recommendations in Top } K}{K}$$

* **Recall@10 (R@10)**:
  $$R@10 = \frac{\text{Relevant Recommendations in Top 10}}{\text{Total Relevant Jobs in Catalog}}$$

* **NDCG@10 (Normalized Discounted Cumulative Gain)**:
  Measures ranking quality based on graded relevance:
  $$\text{DCG}@10 = \sum_{i=1}^{10} \frac{2^{rel_i} - 1}{\log_2(i + 1)}$$
  $$\text{NDCG}@10 = \frac{\text{DCG}@10}{\text{IDCG}@10}$$

* **Spearman Rank Correlation ($\rho$)**:
  Measures the correlation between the ranking order of the scoring models and the ground-truth ratings given by human placement officers/recruiters.
  $$\rho = 1 - \frac{6 \sum d_i^2}{n(n^2 - 1)}$$

---

## 4. Ground-Truth Data Collection

1. **Recruiter/Placement Officer Labeling**:
   Placement officers will grade resume-job matches on a scale of $1$ (Poor fit) to $5$ (Perfect fit).
2. **Student Usefulness Rating**:
   Students provide ratings (1-5) on how relevant the job suggestions are to their skills and career goals.

---

## 5. Statistical Significance Testing

To prove the improvements are not due to chance, the evaluation dashboard runs:
* **Paired t-test**: Assesses difference in mean NDCG scores across models.
* **Wilcoxon Signed-Rank Test**: A non-parametric test comparing the median ranking ranks of relevant jobs between the S-BERT baseline and the proposed method.
* **Bootstrap Confidence Intervals**: Resampling matches 1,000 times to compute 95% confidence intervals on P@5.
