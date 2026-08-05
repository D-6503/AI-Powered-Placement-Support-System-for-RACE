import pytest
from backend.app.evaluation.router import run_wilcoxon_test, run_paired_t_test, compute_spearman

def test_spearman_correlation():
    x = [80.0, 90.0, 70.0, 60.0]
    y = [85.0, 95.0, 75.0, 55.0]
    corr = compute_spearman(x, y)
    # Perfect correlation rank ordering (1.0)
    assert round(corr, 1) == 1.0

def test_paired_t_test():
    x = [80.0, 86.0, 89.0, 88.0, 93.0]
    y = [70.0, 75.0, 80.0, 77.0, 82.0]
    t_stat, p_val = run_paired_t_test(x, y)
    assert t_stat > 0
    assert 0.0 <= p_val <= 1.0

def test_wilcoxon_test():
    x = [80.0, 86.0, 89.0, 88.0, 93.0, 95.0]
    y = [70.0, 75.0, 80.0, 77.0, 82.0, 84.0]
    w_stat, p_val = run_wilcoxon_test(x, y)
    assert w_stat >= 0
    assert 0.0 <= p_val <= 1.0
