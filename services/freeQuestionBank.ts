import { Difficulty, Language, Question } from "../types";

const QUESTIONS_DE: Question[] = [
  {
    text: "Was bedeutet das Akronym SMART bei Lernzielen?",
    options: [
      "Speziell, Messbar, Attraktiv, Realistisch, Terminiert",
      "Schnell, Modern, Aktiv, Richtungsweisend, Transparent",
      "Standard, Minimal, Aktivierend, Real, Testbar",
      "Sicher, Motiviert, Adaptiv, Robust, Teamfähig"
    ],
    correctIndex: 0,
    timeLimitSeconds: 60,
    explanation:
      "SMART-Ziele sind präzise formuliert, objektiv überprüfbar, fordern genug heraus, bleiben erreichbar und haben einen klaren Endtermin."
  },
  {
    text: "Welche Technik hilft, Informationen dauerhaft zu behalten?",
    options: [
      "Alles in einer langen Sitzung lesen",
      "Spaced Repetition mit regelmäßigen Wiederholungen",
      "Nur Markierungen ohne Zusammenfassung",
      "Nur Videos schauen"
    ],
    correctIndex: 1,
    timeLimitSeconds: 60,
    explanation:
      "Verteiltes Lernen mit wachsendem Abstand nutzt den Vergessenskurven-Effekt und stärkt das Langzeitgedächtnis besser als Marathon-Sessions."
  },
  {
    text: "Welche Methode erleichtert das Verständnis eines neuen Themas am schnellsten?",
    options: [
      "Alles auswendig lernen",
      "Das Thema in eigenen Worten zusammenfassen",
      "Nur die Lösungen abschreiben",
      "Direkt Tests schreiben ohne Vorbereitung"
    ],
    correctIndex: 1,
    timeLimitSeconds: 60,
    explanation:
      "Aktives Umformulieren zwingt das Gehirn, Zusammenhänge zu bilden. Dadurch entstehen mentale Modelle statt reiner Wiederholung."
  },
  {
    text: "Wie steigert die Feynman-Methode das Lernen?",
    options: [
      "Indem man das Thema jemand anderem erklärt",
      "Indem man nur Fachbegriffe sammelt",
      "Indem man stumm Notizen abschreibt",
      "Indem man das Thema ignoriert"
    ],
    correctIndex: 0,
    timeLimitSeconds: 60,
    explanation:
      "Erklären deckt Wissenslücken auf. Wenn man etwas einfach erklären kann, hat man es selbst wirklich verstanden."
  },
  {
    text: "Wofür ist die Pomodoro-Technik bekannt?",
    options: [
      "Lernen ohne Pausen",
      "25 Minuten Fokus, dann 5 Minuten Pause",
      "Nur nachts lernen",
      "Lernen ausschließlich mit Musik"
    ],
    correctIndex: 1,
    timeLimitSeconds: 60,
    explanation:
      "Kurze, klare Intervalle halten die Konzentration hoch. Regelmäßige Pausen verhindern mentale Ermüdung."
  },
  {
    text: "Welche Strategie hilft direkt vor einer Prüfung am meisten?",
    options: [
      "Neue Themen beginnen",
      "Kurze Wiederholungen der eigenen Zusammenfassungen",
      "Unabhängige Videos ohne Bezug schauen",
      "Gar nichts mehr ansehen"
    ],
    correctIndex: 1,
    timeLimitSeconds: 60,
    explanation:
      "Eigenes Material erinnert an bereits aufgebautes Wissen und stärkt das Abrufen genau der Kernpunkte, die geprüft werden."
  },
  {
    text: "Warum wirken Selbsttests (Active Recall) so stark?",
    options: [
      "Sie verlängern die Lernzeit",
      "Sie zwingen zum Abrufen aus dem Gedächtnis",
      "Sie sind entspannender als Lesen",
      "Sie ersetzen Übung komplett"
    ],
    correctIndex: 1,
    timeLimitSeconds: 60,
    explanation:
      "Abrufen baut die neuronalen Verbindungen auf, die beim Test benötigt werden. Das ist effizienter als passives Lesen."
  },
  {
    text: "Wie hilft ein Lernplan bei großen Projekten?",
    options: [
      "Er verringert den Überblick",
      "Er macht den Fortschritt sichtbar und verteilt Aufgaben",
      "Er sorgt für mehr Ablenkung",
      "Er verhindert Pausen"
    ],
    correctIndex: 1,
    timeLimitSeconds: 60,
    explanation:
      "Ein klarer Plan teilt große Ziele in erreichbare Schritte auf und gibt ein realistisches Tempo vor."
  }
];

const QUESTIONS_EN: Question[] = [
  {
    text: "What does the SMART acronym describe for study goals?",
    options: [
      "Specific, Measurable, Achievable, Relevant, Time-bound",
      "Swift, Modern, Active, Reliable, Transparent",
      "Standard, Minimal, Actionable, Real, Testable",
      "Secure, Motivated, Adaptive, Robust, Team-ready"
    ],
    correctIndex: 0,
    timeLimitSeconds: 60,
    explanation:
      "SMART goals are concrete, trackable, challenging yet attainable, connected to the outcome, and anchored to a deadline."
  },
  {
    text: "Which technique keeps knowledge longer?",
    options: [
      "Reading everything in one long sitting",
      "Spaced repetition with regular reviews",
      "Only highlighting without summarizing",
      "Watching videos only"
    ],
    correctIndex: 1,
    timeLimitSeconds: 60,
    explanation:
      "Distributed practice uses the forgetting curve to strengthen recall. Short reviews spaced out beat cramming marathons."
  },
  {
    text: "What speeds up understanding of a new topic the most?",
    options: [
      "Memorizing every line",
      "Summarizing the topic in your own words",
      "Copying solutions verbatim",
      "Taking tests with no prep"
    ],
    correctIndex: 1,
    timeLimitSeconds: 60,
    explanation:
      "Restating ideas forces the brain to build connections. That creates mental models instead of shallow repetition."
  },
  {
    text: "How does the Feynman technique help learning?",
    options: [
      "By teaching the topic to someone else",
      "By collecting jargon only",
      "By silently rewriting notes",
      "By ignoring the topic"
    ],
    correctIndex: 0,
    timeLimitSeconds: 60,
    explanation:
      "Teaching exposes gaps. If you can explain it simply, you truly grasp it yourself."
  },
  {
    text: "What is the Pomodoro method known for?",
    options: [
      "Studying without breaks",
      "25 minutes of focus, then a 5 minute pause",
      "Studying only at night",
      "Studying only with music"
    ],
    correctIndex: 1,
    timeLimitSeconds: 60,
    explanation:
      "Short, well-defined intervals keep concentration high. Regular breaks prevent mental fatigue."
  },
  {
    text: "Which tactic helps most right before an exam?",
    options: [
      "Starting brand-new chapters",
      "Brief reviews of your own summaries",
      "Watching unrelated videos",
      "Avoiding all material"
    ],
    correctIndex: 1,
    timeLimitSeconds: 60,
    explanation:
      "Personal summaries reactivate the exact concepts you already organized, boosting recall for the test."
  },
  {
    text: "Why is active recall so powerful?",
    options: [
      "It extends total study time",
      "It forces you to pull answers from memory",
      "It is more relaxing than reading",
      "It replaces practice entirely"
    ],
    correctIndex: 1,
    timeLimitSeconds: 60,
    explanation:
      "Retrieving information builds the neural pathways needed in the exam. It's far more potent than passive review."
  },
  {
    text: "How does a study plan help with big projects?",
    options: [
      "It makes progress harder to see",
      "It shows progress and spreads the workload",
      "It creates more distractions",
      "It blocks breaks"
    ],
    correctIndex: 1,
    timeLimitSeconds: 60,
    explanation:
      "A clear roadmap splits a big goal into achievable steps and sets a realistic pace you can track."
  }
];

export const getFreeQuestions = (
  topic: string,
  difficulty: Difficulty,
  count: number,
  lang: Language
): Question[] => {
  const base = lang === "DE" ? QUESTIONS_DE : QUESTIONS_EN;

  return Array.from({ length: count }).map((_, idx) => {
    const template = base[idx % base.length];
    const prefix = lang === "DE" ? `Thema "${topic}" – ` : `Topic "${topic}" – `;

    return {
      ...template,
      text: `${prefix}${template.text}`,
      // Slightly adjust time for harder levels
      timeLimitSeconds:
        difficulty === Difficulty.HARD || difficulty === Difficulty.EXTREME
          ? 45
          : template.timeLimitSeconds,
      imagePrompt:
        lang === "DE"
          ? `Vektorillustration zum Lernen: ${topic}, Lernkarten, Fokus-Lampe, motivierende Farben`
          : `Vector illustration about studying: ${topic}, flashcards, focus light, motivating colors`
    };
  });
};

export const hasFreeQuestionBank = true;
