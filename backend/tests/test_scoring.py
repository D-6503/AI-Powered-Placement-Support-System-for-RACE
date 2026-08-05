import pytest
from backend.app.matching.engine import (
    keyword_overlap_score,
    required_skill_coverage,
    demand_aware_skill_score,
    eligibility_fit_score,
    location_freshness_score,
    calculate_final_fit_score
)

def test_keyword_overlap_score():
    res_skills = ["Python", "SQL", "Git"]
    jd_skills = ["Python", "Git & Version Control", "AWS", "SQL"]
    # Overlap is Python, SQL (2 out of 4) = 50%
    score = keyword_overlap_score(res_skills, jd_skills)
    assert score == 50.0

def test_required_skill_coverage():
    res_skills = ["Python", "TensorFlow", "Pandas"]
    req_skills = ["Python", "TensorFlow"]
    # Coverage is Python, TensorFlow (2 out of 2) = 100%
    score = required_skill_coverage(res_skills, req_skills)
    assert score == 100.0

def test_demand_aware_skill_score():
    student_skills = ["Python", "Git & Version Control"]
    jd_skills = ["Python", "Kubernetes"]
    demand_weights = {
        "python": 0.9,
        "kubernetes": 0.7,
        "git & version control": 0.5
    }
    # Matched Python: weight 0.9. Missed Kubernetes: weight 0.7.
    # Score = 0.9 / (0.9 + 0.7) = 0.9 / 1.6 = 56.25%
    score = demand_aware_skill_score(student_skills, jd_skills, demand_weights)
    assert score == 56.25

def test_eligibility_fit_score():
    # Student exp >= Required exp
    assert eligibility_fit_score(3.0, 2.0) == 100.0
    # Within 2 years gap
    assert eligibility_fit_score(1.0, 2.5) == 50.0
    # Outside gap
    assert eligibility_fit_score(1.0, 4.0) == 0.0

def test_location_freshness_score():
    assert location_freshness_score("Singapore", "Singapore") == 100.0
    assert location_freshness_score("Singapore", "Remote") == 100.0
    assert location_freshness_score("Singapore", "New York") == 50.0

def test_calculate_final_fit_score():
    # Final Fit Score = 0.30 * Sem + 0.25 * Cov + 0.20 * Dem + 0.15 * Ev + 0.05 * Exp + 0.05 * Loc
    final = calculate_final_fit_score(
        semantic_sim=80.0,
        skill_coverage=100.0,
        demand_score=90.0,
        evidence_score=70.0,
        experience_fit=100.0,
        location_fit=100.0
    )
    # Expected: 0.3*80 + 0.25*100 + 0.2*90 + 0.15*70 + 0.05*100 + 0.05*100
    # = 24 + 25 + 18 + 10.5 + 5 + 5 = 87.5
    assert final == 87.5

def test_classify_fit_score():
    from backend.app.matching.engine import classify_fit_score
    assert classify_fit_score(35.0) == "Low Fit"
    assert classify_fit_score(60.0) == "Moderate Fit"
    assert classify_fit_score(80.0) == "Strong Fit"
    assert classify_fit_score(90.0) == "Excellent Fit"

def test_generate_recommendation_reason():
    from backend.app.matching.engine import generate_recommendation_reason
    breakdown = {
        "required_skill_coverage": 0.8
    }
    missing_skills = ["Git & Version Control", "AWS"]
    reason = generate_recommendation_reason("Strong Fit", breakdown, missing_skills)
    assert "Git & Version Control" in reason
    assert "Strong match" in reason
