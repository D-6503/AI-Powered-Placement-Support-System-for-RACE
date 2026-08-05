import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from backend.app.database import get_db, Student, Resume, SkillsMaster, StudentSkill, FitScore, SkillGapReport, LearningPath
from backend.app.auth.utils import get_current_user
from backend.app.matching.engine import fetch_demand_weights

router = APIRouter(prefix="/skill-gap", tags=["Skill Gap"])

def generate_default_path(skill_name: str) -> List[str]:
    # Default fallback path if skill not in CSV
    return [
        f"1. Understand the core concepts and architecture of {skill_name}.",
        f"2. Configure and run a simple local hello-world example using {skill_name}.",
        f"3. Build a small integration project (e.g. API endpoint, security monitor) using {skill_name}.",
        f"4. Add the completed {skill_name} project to your resume and Github portfolio."
    ]

@router.get("/student/{student_id}")
def get_student_skill_gaps(student_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify permissions
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    if current_user.role == "student":
        cur_student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not cur_student or cur_student.id != student_id:
            raise HTTPException(status_code=403, detail="Not authorized to view these skill gaps")

    # Get student skills
    student_skills = [sk.skill.skill_name.lower() for sk in student.skills]

    # Fetch demand weights
    demand_weights = fetch_demand_weights(student.target_role, db)

    # Load canonical learning path database from CSV
    # We will query learning paths details
    learning_paths_map = {}
    import os
    import csv
    csv_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "learning_paths.csv")
    if os.path.exists(csv_path):
        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                learning_paths_map[row["skill_name"].lower()] = {
                    "steps": json.loads(row["steps_json"]),
                    "hours": int(row["estimated_hours"]),
                    "difficulty": row["difficulty"]
                }

    # Find missing skills
    missing_skills = []
    
    # Query all skills matching the student's program
    program_skills = db.query(SkillsMaster).filter(SkillsMaster.category == student.program).all()
    
    for skill in program_skills:
        skill_lower = skill.skill_name.lower()
        if skill_lower not in student_skills:
            weight = demand_weights.get(skill_lower, 0.4)
            
            # Prioritization
            if weight >= 0.7:
                priority = "High"
            elif weight >= 0.4:
                priority = "Medium"
            else:
                priority = "Low"

            # Get steps
            path_details = learning_paths_map.get(skill_lower, {
                "steps": generate_default_path(skill.skill_name),
                "hours": 12,
                "difficulty": "Medium"
            })

            missing_skills.append({
                "skill_id": skill.id,
                "skill": skill.skill_name,
                "priority": priority,
                "demand_weight": round(weight, 2),
                "estimated_hours": path_details["hours"],
                "difficulty": path_details["difficulty"],
                "learning_path": path_details["steps"]
            })

    # Sort missing skills: High first, then Medium, then Low
    priority_order = {"High": 0, "Medium": 1, "Low": 2}
    missing_skills.sort(key=lambda x: (priority_order[x["priority"]], -x["demand_weight"]))

    # Save snapshot report to DB
    existing_report = db.query(SkillGapReport).filter(SkillGapReport.student_id == student.id).first()
    if existing_report:
        existing_report.missing_skills_json = json.dumps(missing_skills)
        existing_report.generated_at = datetime_now()
    else:
        db.add(SkillGapReport(
            student_id=student.id,
            missing_skills_json=json.dumps(missing_skills),
            generated_at=datetime_now()
        ))
    db.commit()

    return {
        "student_id": student_id,
        "missing_skills": missing_skills
    }

@router.get("/learning-path/{student_id}")
def get_learning_path_timeline(student_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if current_user.role == "student":
        cur_student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not cur_student or cur_student.id != student_id:
            raise HTTPException(status_code=403, detail="Not authorized")

    # Get active learning paths from db
    paths = db.query(LearningPath).filter(LearningPath.student_id == student_id).all()
    
    # If empty, initialize using the top 3 high/medium priority missing skills
    if not paths:
        gaps_res = get_student_skill_gaps(student_id, current_user, db)
        missing_list = gaps_res["missing_skills"]
        
        # Take up to 3 critical ones
        for item in missing_list[:3]:
            # Check if exists
            exists = db.query(LearningPath).filter(
                LearningPath.student_id == student_id,
                LearningPath.skill_id == item["skill_id"]
            ).first()
            if not exists:
                db.add(LearningPath(
                    student_id=student_id,
                    skill_id=item["skill_id"],
                    steps_json=json.dumps(item["learning_path"]),
                    estimated_hours=item["estimated_hours"],
                    difficulty=item["difficulty"],
                    current_step_index=0,
                    status="In Progress"
                ))
        db.commit()
        paths = db.query(LearningPath).filter(LearningPath.student_id == student_id).all()

    formatted_paths = []
    for path in paths:
        try:
            steps = json.loads(path.steps_json)
        except Exception:
            steps = []
            
        formatted_paths.append({
            "id": path.id,
            "skill_name": path.skill.skill_name,
            "estimated_hours": path.estimated_hours,
            "difficulty": path.difficulty,
            "current_step_index": path.current_step_index,
            "status": path.status,
            "steps": steps
        })
        
    return formatted_paths

@router.put("/learning-path/{path_id}/step")
def update_learning_path_step(path_id: int, current_step_index: int, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    path = db.query(LearningPath).filter(LearningPath.id == path_id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Learning path not found")
        
    student = db.query(Student).filter(Student.id == path.student_id).first()
    if current_user.role == "student" and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    steps = json.loads(path.steps_json)
    if current_step_index >= len(steps):
        path.current_step_index = len(steps) - 1
        path.status = "Completed"
        
        # Automatically insert the newly learned skill to student's manual skills!
        # This is a super interactive feature - when they complete the roadmap, it updates their readiness
        existing_skill = db.query(StudentSkill).filter(
            StudentSkill.student_id == student.id,
            StudentSkill.skill_id == path.skill_id
        ).first()
        if not existing_skill:
            db.add(StudentSkill(
                student_id=student.id,
                skill_id=path.skill_id,
                proficiency_level="Intermediate",
                source="manual"
            ))
            # Delete old scores to recalculate matches
            db.query(FitScore).filter(FitScore.student_id == student.id).delete()
    else:
        path.current_step_index = current_step_index
        path.status = "In Progress"
        
    db.commit()
    return {"status": "success", "current_step_index": path.current_step_index, "status_text": path.status}

def datetime_now():
    import datetime
    return datetime.datetime.utcnow()
