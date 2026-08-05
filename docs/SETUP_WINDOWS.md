# Setup Instructions for Windows (No Git & Version Control)

This document describes how to set up and run the AI-Powered Placement Intelligence System for REVA locally on a Windows machine.

## Prerequisites

1. **Python 3.10+**: Ensure Python is installed and added to your system PATH.
2. **Node.js 18+ & npm**: Ensure Node.js is installed for frontend development.
3. **C++ Build Tools** (Optional): Needed if building some wheels (e.g. FAISS) from source, though precompiled binaries are used.

---

## Backend Setup

1. **Navigate to the Backend Directory**:
   Open a terminal (PowerShell or CMD) in the project root.

2. **Create the Python Virtual Environment**:
   ```bash
   python -m venv backend/.venv
   ```

3. **Activate the Virtual Environment**:
   * **PowerShell**:
     ```powershell
     backend\.venv\Scripts\Activate.ps1
     ```
   * **Command Prompt**:
     ```cmd
     backend\.venv\Scripts\activate.bat
     ```

4. **Install Dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

5. **Download spaCy Language Model**:
   ```bash
   python -m spacy download en_core_web_sm
   ```

6. **Install Playwright Browsers**:
   ```bash
   playwright install chromium
   ```

7. **Create Environment Variables**:
   Verify that a `.env` file exists in the workspace root with standard local defaults:
   ```env
   DATABASE_URL=sqlite:///./race_placement.db
   JWT_SECRET_KEY=change-this-secret-key-12345
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
   ENABLE_EXTERNAL_LLM=false
   GEMINI_API_KEY=
   ```

8. **Start Backend Server**:
   ```bash
   python -m uvicorn backend.app.main:app --reload --port 8000
   ```
   The backend API docs will be available at: http://localhost:8000/docs

---

## Frontend Setup

1. **Navigate to the Frontend Directory**:
   ```bash
   cd frontend
   ```

2. **Install Node Modules**:
   ```bash
   npm install
   ```

3. **Start the Next.js Dev Server**:
   ```bash
   npm run dev
   ```
   The frontend will run at: http://localhost:3000

---

## System Verification

Once both servers are running:
1. Open http://localhost:3000 in your browser.
2. Complete the onboarding walkthrough.
3. Upload a sample student resume.
4. Verify the placement readiness score and recommended jobs dashboard.
