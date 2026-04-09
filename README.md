# JP-Norm++: Advanced NLP Normalization System 🇯🇵🚀

JP-Norm++ is a production-grade, hybrid NLP pipeline designed for high-accuracy Japanese text normalization. It bridges the gap between casual, noisy social media text and formal, grammatically correct Japanese (Desu/Masu style). The system combines rule-based heuristics with state-of-the-art Transformer models (powered by Gemini 3 Flash) to provide explainable, metric-backed results.

## 🧠 Architecture: The Hybrid Pipeline

The system follows a modular, multi-stage NLP architecture:
1.  **Noise Detection**: A pre-filter that identifies if a sentence is "noisy" (casual/slang) or "clean" (formal).
2.  **Input Preprocessing**: Sanitization and normalization of character encodings (full-width to half-width, etc.).
3.  **Morphological Analysis**: Tokenization and Part-of-Speech (POS) tagging to understand the linguistic structure.
4.  **Transformer Normalization (mT5-inspired)**: Seq2Seq conversion to standard formal Japanese for sentences flagged as noisy.
5.  **Explainable AI (XAI)**: Generation of POS-based reasoning for every modification, explaining *why* a token was kept, changed, or removed.
6.  **Multi-Metric Evaluation**: Real-time calculation of professional NLP metrics (BLEU, ROUGE-L, Edit Distance).

## 🚀 Key Features

- **Advanced Noise Generator**: Linguistically realistic simulation of casual Japanese speech patterns for testing and training.
- **Explainable AI (XAI)**: Detailed breakdown of linguistic transformations, providing transparency into the model's decision-making.
- **Performance vs. Complexity Matrix**: A scientific visualization (BLEU/ROUGE vs. Sentence Length) that tracks model accuracy as input complexity increases.
- **Linguistic Action Matrix**: A stacked bar chart correlating POS tags with specific pipeline actions (Keep, Change, Remove).
- **Style Transfer Matrix**: Instant generation of Casual, Polite, and Honorific variants for any input.
- **Personal Library (Firebase)**: Persistent storage for saved results, allowing users to build a custom dataset of normalization examples.
- **Dual Translation Layer**: English translations for both noisy input and normalized output to ensure semantic consistency.
- **Batch Processing**: Support for normalizing multiple sentences simultaneously.
- **URL Extraction**: Ability to pull text directly from social media URLs (simulated) for real-world testing.

## 📊 Advanced Analytics & Metrics

The system provides professional-grade evaluation tools:
- **BLEU Score**: Measures n-gram precision against the reference normalization.
- **ROUGE-L**: Measures longest common subsequence recall, focusing on fluency.
- **Edit Distance**: Standard Levenshtein distance representing the number of character-level changes.
- **Quality Radar**: A multi-dimensional view of pipeline performance across different metrics.
- **POS Distribution**: Advanced analysis of linguistic composition and transformation patterns.

## 🛠️ Technical Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4.
- **Animations**: Motion (formerly Framer Motion).
- **Data Visualization**: Recharts (Line, Bar, Radar, and Stacked charts).
- **Backend**: Node.js with Express v4.
- **AI Engine**: Google Gemini 3 Flash (Hybrid Pipeline).
- **Database & Auth**: Firebase (Firestore & Google Authentication).
- **Build Tool**: Vite 6.

## 📂 Project Structure

- `src/App.tsx`: Main application logic and UI components.
- `src/lib/firebase.ts`: Firebase configuration and data models.
- `src/services/nlpService.ts`: The core NLP pipeline logic and Gemini integration.
- `src/lib/advancedNoiseGenerator.ts`: Rule-based noise injection engine.
- `src/lib/metrics.ts`: Implementation of NLP evaluation metrics (BLEU, ROUGE).
- `server.ts`: Express backend serving the API and SPA.
- `firebase-blueprint.json`: Data structure definition for Firestore.
- `firestore.rules`: Security rules for the Personal Library.

## 🚦 Getting Started

1.  **Environment Variables**: Ensure `GEMINI_API_KEY` is set in your environment.
2.  **Installation**:
    ```bash
    npm install
    ```
3.  **Development**:
    ```bash
    npm run dev
    ```
    The system will start on `http://localhost:3000`.

## 📝 Example Pipeline Execution

**Input**: `すっごーい！今日わマジ暑い〜`
- **Normalized**: `すごいです。今日は本当に暑いです。`
- **XAI Reasoning**: 
    - `すっごーい` (Adjective) → `すごい` (Normalized intensifier)
    - `わ` (Particle) → `は` (Corrected grammatical particle)
    - `マジ` (Slang) → `本当に` (Formalized adverb)
- **Style Transfer**:
    - **Casual**: `すごーい！今日マジ暑いね。`
    - **Honorific**: `大変素晴らしゅうございます。本日は誠に暑うございます。`

---

*Developed as an advanced NLP research project demonstration.*
