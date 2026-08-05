# Database Schema

The system uses an SQLite database (`race_placement.db`) to store all information.

---

## 1. Entity Relationship Overview

The relationships are as follows:
* A `User` owns a `Student` (if role = `'student'`).
* A `Student` has one active `Resume`.
* A `Resume` has multiple parsed sections.
* A `Student` is linked to multiple `Skills` via `StudentSkill`.
* A `Student` has multiple `Projects` and `Certifications`.
* A `Job` is linked to multiple `Skills` via `JobSkill`.
* A `Job` has a vector representation stored in `JobEmbedding`.
* `FitScore` connects `Student` and `Job` with computed scores.
* `Application` links a `Student` to their applied `Job`.
* `JobDemandSnapshot` aggregates skill frequencies per role category.

---

## 2. Table Specifications

### `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY | Unique ID |
| `email` | VARCHAR | UNIQUE, NOT NULL | Authentication login email |
| `hashed_password` | VARCHAR | NOT NULL | Bcrypt hashed password |
| `role` | VARCHAR | NOT NULL | `'student'` or `'admin'` |
| `full_name` | VARCHAR | NOT NULL | User name |
| `is_active` | BOOLEAN | DEFAULT TRUE | Account state |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date created |

### `students`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY | Unique ID |
| `user_id` | INTEGER | FOREIGN KEY (`users.id`) | Links to credential user |
| `program` | VARCHAR | NOT NULL | `'AI & Analytics'`, `'Cybersecurity'`, `'Cloud Architecture'` |
| `target_role` | VARCHAR | NOT NULL | Target job profile |
| `experience_years` | FLOAT | DEFAULT 0.0 | Total experience in years |
| `preferred_locations`| VARCHAR | NULL | Preferred working location |
| `cohort` | VARCHAR | NULL | Student intake batch (e.g., `'Batch 2026'`) |
| `enrollment_id` | VARCHAR | UNIQUE, NULL | Student ID code |

### `resumes`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY | Unique ID |
| `student_id` | INTEGER | FOREIGN KEY (`students.id`) | Owner student |
| `file_path` | VARCHAR | NOT NULL | Relative path in storage |
| `file_hash` | VARCHAR | NOT NULL | SHA256 of file |
| `uploaded_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date uploaded |
| `quality_score` | FLOAT | DEFAULT 0.0 | Calculated score (0-100) |
| `parsed_status` | VARCHAR | DEFAULT `'pending'` | `'pending'`, `'success'`, `'failed'` |

### `parsed_resume_sections`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY | Unique ID |
| `resume_id` | INTEGER | FOREIGN KEY (`resumes.id`) | Associated resume |
| `section_name` | VARCHAR | NOT NULL | e.g. `'contact_info'`, `'skills'`, `'experience'` |
| `section_text` | TEXT | NOT NULL | Parsed content |

### `skills_master`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY | Unique ID |
| `skill_name` | VARCHAR | UNIQUE, NOT NULL | e.g. `'Python'` |
| `category` | VARCHAR | NOT NULL | e.g. `'AI & Analytics'`, `'Cybersecurity'`, etc. |
| `alias_list` | TEXT | NULL | JSON list of aliases/synonyms |

### `student_skills`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY | Unique ID |
| `student_id` | INTEGER | FOREIGN KEY (`students.id`) | Student possessing skill |
| `skill_id` | INTEGER | FOREIGN KEY (`skills_master.id`) | Skill reference |
| `proficiency_level` | VARCHAR | DEFAULT `'Intermediate'`| `'Beginner'`, `'Intermediate'`, `'Expert'` |
| `source` | VARCHAR | NOT NULL | `'parsed'` or `'manual'` |

### `jobs`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY | Unique ID |
| `title` | VARCHAR | NOT NULL | Job title |
| `company` | VARCHAR | NOT NULL | Company name |
| `location` | VARCHAR | NULL | Work location |
| `experience_required`| FLOAT | DEFAULT 0.0 | Required years of experience |
| `salary_min` | FLOAT | NULL | Minimum salary range |
| `salary_max` | FLOAT | NULL | Maximum salary range |
| `jd_text` | TEXT | NOT NULL | Job description text |
| `apply_url` | VARCHAR | NULL | External apply link |
| `source` | VARCHAR | DEFAULT `'upload'` | `'upload'`, `'url'`, `'adzuna'` |
| `posted_date` | DATETIME | NULL | Job posting date |
| `fetched_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Ingestion date |
| `is_active` | BOOLEAN | DEFAULT TRUE | Hiring status |

### `job_skills`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY | Unique ID |
| `job_id` | INTEGER | FOREIGN KEY (`jobs.id`) | Job listing |
| `skill_id` | INTEGER | FOREIGN KEY (`skills_master.id`) | Skill listing |
| `is_required` | BOOLEAN | DEFAULT TRUE | `True` for required, `False` for preferred |

### `fit_scores`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY | Unique ID |
| `student_id` | INTEGER | FOREIGN KEY (`students.id`) | Matched student |
| `job_id` | INTEGER | FOREIGN KEY (`jobs.id`) | Matched job |
| `final_score` | FLOAT | NOT NULL | Weighted match score |
| `semantic_similarity`| FLOAT | NOT NULL | Baseline semantic similarity score |
| `required_skill_coverage`| FLOAT | NOT NULL | Skill coverage score |
| `demand_aware_score`| FLOAT | NOT NULL | Demand weighted score |
| `evidence_quality` | FLOAT | NOT NULL | Experience evidence score |
| `experience_fit` | FLOAT | NOT NULL | Years eligibility score |
| `location_fit` | FLOAT | NOT NULL | Location matching score |
| `matching_date` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Score calculation time |

### `applications`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY | Unique ID |
| `student_id` | INTEGER | FOREIGN KEY (`students.id`) | Applicant student |
| `job_id` | INTEGER | FOREIGN KEY (`jobs.id`) | Target job |
| `status` | VARCHAR | NOT NULL | `'Saved'`, `'Applied'`, `'Shortlisted'`, etc. |
| `notes` | TEXT | NULL | Personal application notes |
| `follow_up_date` | DATE | NULL | Next action date |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Update tracker |
