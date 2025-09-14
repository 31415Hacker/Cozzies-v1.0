const firebaseConfig = {
  apiKey: "AIzaSyDXOxTQFbb7wbP50zsf-iku01wT4SVv_18",
  authDomain: "quiz-database-cb174.firebaseapp.com",
  databaseURL: "https://quiz-database-cb174-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "quiz-database-cb174",
  storageBucket: "quiz-database-cb174.firebasestorage.app",
  messagingSenderId: "181782754946",
  appId: "1:181782754946:web:1076aa4443b921b505669b",
  measurementId: "G-CGZW7ZWE25"
};

firebase.initializeApp(firebaseConfig);

let db;

document.addEventListener("DOMContentLoaded", () => {
  let participantAllowNext = true;
  let pin = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  document.getElementById("pin").innerHTML = `PIN: <strong>${pin}</strong>`;
  db = firebase.database().ref(pin).child("1");
  
  document.getElementById("quizId").addEventListener("blur", () => {
    db = firebase.database().ref(pin).child(document.getElementById("quizId").value.trim());
  });
  
  const autoAllowNextBtn = document.getElementById("nextQuestionAutoBtn");
  autoAllowNextBtn.addEventListener('click', () => {
    db.child("state/participantNext").set(participantAllowNext);
    participantAllowNext = !participantAllowNext;
    if (participantAllowNext) {
      autoAllowNextBtn.textContent = "⏭️ Enable Next Question By Participants";
    } else {
      autoAllowNextBtn.textContent = "⏭️ Unable Next Question By Participants";
    }
  });
});

let currentQuestionIndex = -1;

function saveQuestion() {
  const id = document.getElementById("qId").value.trim();
  const question = document.getElementById("questionText").value.trim();
  const answerA = document.getElementById("answerA").value.trim();
  const answerB = document.getElementById("answerB").value.trim();
  const answerC = document.getElementById("answerC").value.trim();
  const answerD = document.getElementById("answerD").value.trim();

  const answers = [answerA, answerB, answerC, answerD];
  const correct = document.getElementById("correct").value.split(",").map(c => c.trim());
  const explanation = document.getElementById("explanation").value.trim();
  const timer = Math.min(Math.max(5, parseInt(document.getElementById("timer").value.trim()) || 30), 1800);

  if (!id || !question || answers.some(ans => !ans) || correct.length === 0) {
    alert("Please fill all required fields.");
    return;
  }

  db.child("questions/" + id).set({
    question,
    answers,
    correct,
    explanation,
    timer
  }).then(() => alert("✅ Question saved!"))
    .catch(err => alert("❌ Error saving question: " + err.message));
}

function clearRecipients() {
  if (confirm("Are you sure you want to clear all recipient data?")) {
    db.child("recipients").remove().then(() => {
      alert("🧹 Recipients cleared.");
    });
  }
}

let quizRunning = false;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("startStop").addEventListener("click", () => {
    const btn = document.getElementById("startStop");

    if (quizRunning) {
      stopQuiz();
      btn.textContent = "Start Quiz";
    } else {
      startQuiz();
      btn.textContent = "Stop Quiz";
    }

    quizRunning = !quizRunning;
  });
});

function resetQuiz() {
  db.child("state/currentQuestionIndex").set(0);
}

function startQuiz() {
  db.child("state/start").set(true);
}

function stopQuiz() {
  db.child("state/start").set(false);
}

function nextQuestion() {
  currentQuestionIndex++;
  db.child("state/currentQuestionIndex").set(currentQuestionIndex);
}

window.addEventListener("DOMContentLoaded", () => {
  const timer = document.getElementById("timer");
  const QuizTitle = document.getElementById("Qtitle");
  
  QuizTitle.addEventListener("input", () => {
    db.child("state/title").set(QuizTitle.value);
  });

  db.child("questions").on("value", (questionSnap) => {
    const questions = questionSnap.val() || {};
    db.child("recipients").on("value", (recipientSnap) => {
      const recipients = recipientSnap.val() || {};
      buildRecipientTable(recipients);
      buildLeaderboard(recipients);
      buildQuestionInsights(recipients, questions);
    });
  });

  timer.addEventListener("blur", () => {
    timer.value = Math.min(1800, Math.max(5, parseInt(timer.value) || 30));
  });

  const nextBtn = document.getElementById("nextQuestionBtn");
  if (nextBtn) nextBtn.onclick = nextQuestion;
});

function buildRecipientTable(recipients) {
  const recipientTable = document.querySelector("#recipientTable tbody");
  recipientTable.innerHTML = "";
  Object.entries(recipients).forEach(([user, responses]) => {
    Object.entries(responses).forEach(([qid, entry]) => {
      if (qid === "summary" || qid === "avatar" || qid === "joinedAt") return;
      // ✅ Check: is qid a number (even if it's a string)
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${binaryToText(user)}</td>
        <td>${qid.slice(1)}</td>
        <td>${(entry.selected || []).join("<br>")}</td>
        <td style="background-color: ${entry.correct ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)'}">${entry.correct ? "✅" : "❌"}</td>
      `;
      recipientTable.appendChild(row);
    });
  });
}

function buildLeaderboard(data) {
  const leaderboardBody = document.querySelector("#leaderboardTable tbody");
  leaderboardBody.innerHTML = "";

  const scores = [];

  Object.entries(data).forEach(([user, responses]) => {
    let correct = 0;
    let total = 0;
    let points = 0;

    Object.entries(responses).forEach(([key, entry]) => {
      if (key !== "summary") {
        total++;
        if (entry.correct) correct++;
      } else {
        points = entry.totalPoints || 0;
      }
    });

    scores.push({ name: user, correct, total: total - 2, points });
  });

  scores.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  scores.forEach((s, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${binaryToText(s.name)}</td>
      <td>${s.correct}</td>
      <td>${s.total}</td>
      <td>${Math.round((s.correct / (s.total || 1)) * 100)}%</td>
      <td>${s.points}</td>
    `;
    leaderboardBody.appendChild(row);
  });
}

function buildQuestionInsights(recipients, questions) {
  const table = document.querySelector("#insightTable tbody");
  table.innerHTML = "";

  // Sort question keys numerically (q1, q2, ..., q10)
  const sortedEntries = Object.entries(questions).sort(([aKey], [bKey]) => {
    const aNum = parseInt(aKey.replace(/\D/g, ''));
    const bNum = parseInt(bKey.replace(/\D/g, ''));
    return aNum - bNum;
  });

  sortedEntries.forEach(([qKey, qData]) => {
    const gotRight = [];
    const gotWrong = [];

    Object.entries(recipients).forEach(([user, answers]) => {
      const entry = answers[qKey];
      user = binaryToText(user);
      if (entry) {
        if (entry.correct) {
          gotRight.push(user);
        } else {
          const selected = (entry.selected || []).join(", ");
          gotWrong.push(`<strong>${user}</strong>: ${selected || "(no answer)"}`);
        }
      }
    });
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${qKey.replace(/\D/g, '')}</td>
      <td>${qData.question || ""}</td>
      <td>${
        (qData.correct || [])
          .map(letter => {
            const index = "abcd".indexOf(letter);
            return index >= 0 && qData.answers && qData.answers[index]
              ? `${letter}) ${qData.answers[index]}`
              : letter;
          })
          .join("<br>")
      }</td>
      <td>${qData.explanation || "-"}</td>
      <td>${gotRight.length ? gotRight.join("<br><hr>") : "❌ Nobody yet"}</td>
      <td>${gotWrong.length ? gotWrong.join("<br><hr>") : "✅ No mistakes"}</td>
      <td>${
        (qData.answers || [])
          .map((answer, i) => `<strong>${"abcd"[i]})</strong> ${answer.trim()}`)
          .join("<br>")
      }</td>
    `;
    table.appendChild(row);
  });
}

function binaryToText(binary) {
  return binary.split(' ')
    .map(bin => String.fromCharCode(parseInt(bin, 2)))
    .join('');
}

function importQuiz() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".xlsx,.xls";

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2) return alert("Not enough rows in the sheet!");

    const headers = rows[0];
    const mapping = {};

    // Ask which column maps to what
    const fields = ["question", "answers (comma-separated)", "correct (letters)", "explanation", "timer"];
    for (const field of fields) {
      const choice = prompt(`Which column is for: ${field}?\n\n${headers.map((h, i) => `${i}: ${h}`).join("\n")}`);
      const index = parseInt(choice);
      if (isNaN(index) || index < 0 || index >= headers.length) return alert(`Invalid column for "${field}"`);
      mapping[field] = index;
    }

    const quizData = {};
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      // Grab values first
      const question = (row[mapping["question"]] || "").trim();
      const answersRaw = (row[mapping["answers (comma-separated)"]] || "").trim();
      const correctRaw = (row[mapping["correct (letters)"]] || "").trim();
      const explanation = (row[mapping["explanation"]] || "").trim();
      const timerRaw = row[mapping["timer"]];

      // Skip row if all important fields are empty
      if (!question && !answersRaw && !correctRaw && !explanation && !timerRaw) {
          if (question === '' && answersRaw && correctRaw && explanation && timerRaw) {
            
          }
        continue;
      }

      const id = `q${i}`;
      const timer = Math.min(Math.max(5, parseInt(timerRaw) || 30), 1800);
      const answers = answersRaw.split(";").map(a => a.trim()).filter(a => a !== "");
      const correct = correctRaw.split(";").map(c => c.trim().toLowerCase()).filter(c => c !== "");

      quizData[id] = {
        question,
        answers,
        correct,
        explanation,
        timer
      };
    }

    const confirmUpload = confirm(`Import ${Object.keys(quizData).length} questions to Firebase?`);
    if (confirmUpload) {
      db.child("questions").set(quizData)
        .then(() => alert("✅ Questions imported successfully!"))
        .catch(err => alert("❌ Failed to upload: " + err.message));
    }
  };

  input.click();
}

window.importQuiz = importQuiz;
