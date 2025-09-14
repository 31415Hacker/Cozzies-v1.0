// participants.js
const accessKey = "1S2e3c4r5e6t7P8a9s0s-w=o1r2d3"; // 👈 match this with the one in your Firebase /secret

// Firebase Configuration (same as host)
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

let lastIndex = -1;
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const pinBtn = document.getElementById("pinBtn");
const userPinInput = document.getElementById("PINInput");
const userQuizInput = document.getElementById("quizId");

showPage("pin-page");

let pin;
let pinRef;
let quizId;
pinBtn.addEventListener("click", () => {
  pin = userPinInput.value.trim();
  if (!pin) {
    alert("PIN is required!");
    throw new Error("PIN is missing");
  }
  pinRef = db.ref(pin.trim());
  pinRef.child("accessKey").set(accessKey);
  
  quizId = userQuizInput.value.trim();
  pinRef = pinRef.child(quizId)
  
  // 👇 Move this here after pinRef is defined
  pinRef.child("recipients").on("value", snapshot => {
    const recipients = snapshot.val() || {};
    renderParticipantList(recipients);
  });

  pinRef.child("state/title").on("value", snapshot => {
    const titleText = snapshot.val();
    if (titleText) {
      document.getElementById("title").textContent = titleText;
    }
  });

  showPage("waiting-page");
});

// Global state variables
let username = null;
let selectedAvatar = null;
let totalPoints = 0;
let currentQuestionIndex = -1;
let questions = {};
let questionKeys = [];
let countdown = null;
let tickPitch = 1000;

// Utility: Format seconds as mm:ss
function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// Show one page and hide others
function showPage(pageId) {
  const pages = ["waiting-page", "quiz-page", "feedback-page", "tables-page", "pin-page"];
  pages.forEach(id => {
    document.getElementById(id).style.display = (id === pageId) ? "block" : "none";
  });
}

function textToBinary(text) {
  return text.split('')
    .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
    .join(' ');
}

// Join the waiting room: register participant info
function joinWaitingRoom() {
  const input = document.getElementById("usernameInput");
  const name = input.value.trim();
  if (!name) {
    alert("Please enter your name.");
    return;
  }
  if (!selectedAvatar) {
    alert("Please select an avatar.");
    return;
  }
  username = textToBinary(name);
  // Save participant data
  pinRef.child("recipients").child(username).set({
    joinedAt: new Date().toISOString(),
    avatar: selectedAvatar
  });
  // Increment participant count
  pinRef.child("state").child("participants").transaction(currentValue => (currentValue || 0) + 1)
    .catch(err => console.error("Error incrementing participant count:", err));
  
  // Remove participant data on unload
  window.addEventListener("beforeunload", () => {
    pinRef.child("recipients").child(username).remove();
  });
  
  // Listen for quiz start
  pinRef.child("state/start").on("value", snapshot => {
    const started = snapshot.val();
    if (started === true) {
      showPage("quiz-page");
      loadQuestionsAndStartQuiz();
    }
  });
}

// Render avatar selection for participants
function renderAvatarSelection() {
  const avatarUrls = [
    "https://res.cloudinary.com/dxcfim96m/image/upload/v1743747987/Link_Zelda_asnnyb_rqxanp.png",
    "https://res.cloudinary.com/dxcfim96m/image/upload/v1743747984/Elon_Musk_msmxgz_szezb6.png",
    "https://res.cloudinary.com/dxcfim96m/image/upload/v1743747983/Einstein_bstjw7_ss40db.png",
    "https://res.cloudinary.com/dxcfim96m/image/upload/v1743747983/Superman_elglrk_t9pgyj.png",
    "https://res.cloudinary.com/dxcfim96m/image/upload/v1743747983/PrincessPeach_rs5poo_ed6law.png",
    "https://res.cloudinary.com/dxcfim96m/image/upload/v1743747983/mariobros_yabkts_nczauo.png",
    "https://res.cloudinary.com/dxcfim96m/image/upload/v1743746729/ZorroTomato_e98kbi.png",
    "https://res.cloudinary.com/dxcfim96m/image/upload/v1743746727/WeirdVeggie_b0ypkq.png",
    "https://res.cloudinary.com/dxcfim96m/image/upload/v1743746727/TeenGirl_xxxljf.png",
    "https://res.cloudinary.com/dxcfim96m/image/upload/v1743746726/Pilot_e0il9q.png",
    "https://res.cloudinary.com/dxcfim96m/image/upload/v1743746725/MonkeyBoy_txucd5.png",
    "https://res.cloudinary.com/dxcfim96m/image/upload/v1743746725/Men-Shirt_oucj0f.png",
    "https://res.cloudinary.com/dxcfim96m/image/upload/v1743746724/IndianGirl_delvbr.png",
    "https://res.cloudinary.com/dxcfim96m/image/upload/v1743746724/DonaldTrump_mgfvkm.png",
    "https://res.cloudinary.com/dxcfim96m/image/upload/v1743746724/Grandma_zq3koj.png",
    "https://res.cloudinary.com/dxcfim96m/image/upload/v1743746723/CoolBoy_xzvs5g.png",
    "https://res.cloudinary.com/dxcfim96m/image/upload/v1743746723/Batman_fk0zvc.png",
    "https://res.cloudinary.com/dxcfim96m/image/upload/v1743746723/ArabicMan_rohare.png",
    "https://res.cloudinary.com/dxcfim96m/image/upload/v1743746723/HappyBoy_vm5rpk.png",
    "https://res.cloudinary.com/dxcfim96m/image/upload/v1743746723/Grandpa_eb597i.png"
  ];
  const grid = document.getElementById("avatar-grid");
  avatarUrls.forEach(url => {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "Avatar";
    img.style.width = "60px";
    img.style.height = "60px";
    img.style.borderRadius = "50%";
    img.style.cursor = "pointer";
    img.style.border = "2px solid transparent";
    img.addEventListener("click", () => {
      document.querySelectorAll("#avatar-grid img").forEach(img => {
        img.style.border = "2px solid transparent";
      });
      img.style.border = "3px solid #2e86de";
      selectedAvatar = url;
    });
    grid.appendChild(img);
  });
}

// Load questions and start quiz
function loadQuestionsAndStartQuiz() {
  pinRef.child("questions").once("value").then(snapshot => {
    questions = snapshot.val() || {};
    questionKeys = Object.keys(questions).sort((a, b) => {
      const aNum = parseInt(a.replace(/\D/g, ''));
      const bNum = parseInt(b.replace(/\D/g, ''));
      return aNum - bNum;
    });
    if (!questionKeys.length) {
      alert("No questions found.");
      return;
    }
    // Listen for current question index updates
    pinRef.child("state/currentQuestionIndex").on("value", snap => {
      const index = snap.val();
      if (typeof index === "number" && index !== currentQuestionIndex) {
        currentQuestionIndex = index;
        lastIndex = currentQuestionIndex;
        showPage("quiz-page");
        loadQuestion(currentQuestionIndex);
      }
    });
  });
  setInterval(() => {
    if (lastIndex != currentQuestionIndex) {
        showPage("quiz-page");
        loadQuestion(currentQuestionIndex);
        return;
    }
  }, 1)
}

function binaryToText(binary) {
  return binary.split(' ')
    .map(bin => String.fromCharCode(parseInt(bin, 2)))
    .join('');
}

// Load a single question
function loadQuestion(index) {
  if (index < 0 || index >= questionKeys.length) return;
  const qKey = questionKeys[index];
  const data = questions[qKey];
  
  document.getElementById("question-number").textContent = index + 1;
  document.getElementById("question-title").innerHTML = `<strong>${renderQuestionContent(data.question)}</strong>`;
  
  const container = document.getElementById("answers-container");
  container.innerHTML = "";
  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = false;
  
  let timeLeft = data.timer || 30;
  const totalTime = timeLeft;
  updateTimerDisplay(timeLeft, totalTime);
  
  if (countdown) clearInterval(countdown);
  tickPitch = 1000;
  countdown = setInterval(() => {
    timeLeft--;
    updateTimerDisplay(timeLeft, totalTime);
    playTick(tickPitch);
    const growthRate = 1 + (0.1 / totalTime);
    tickPitch *= growthRate;
    if (timeLeft <= 0) {
      clearInterval(countdown);
      playTick(200, 0.2);
      submitAnswer(true);
    }
  }, 1000);
  
  // Build answer options
  data.answers.forEach((text, i) => {
    const letter = String.fromCharCode(65 + i);
    const label = document.createElement("label");
    label.className = "answer-option";
    
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "quiz-answer";
    radio.value = letter.toLowerCase();
    
    const circle = document.createElement("div");
    circle.className = "letter-circle";
    circle.textContent = letter;
    
    label.appendChild(radio);
    label.appendChild(circle);
    
    const answerText = document.createElement("span");
    answerText.textContent = ` ${text}`;
    label.appendChild(answerText);
    
    label.addEventListener("click", () => {
      document.querySelectorAll(".answer-option").forEach(opt => opt.classList.remove("selected"));
      radio.checked = true;
      label.classList.add("selected");
    });
    
    container.appendChild(label);
  });
  
  submitBtn.onclick = () => submitAnswer(false);
}

function renderQuestionContent(text) {
  // Replace any [img]URL[/img] marker with an <img> element.
  return text.replace(/\[img\](.*?)\[\/img\]/gi, (match, p1) => {
    return `<img src="${p1}" alt="Question Image" style="max-width:100%; display:block; margin:10px 0;"/>`;
  });
}

// Update timer display
function updateTimerDisplay(currentTime, totalTime) {
  const percent = currentTime / totalTime;
  const circle = document.getElementById("timer-progress");
  const radius = 28;
  const dasharray = 2 * Math.PI * radius;
  const offset = dasharray * (1 - percent);
  circle.style.strokeDasharray = dasharray;
  circle.style.strokeDashoffset = offset;
  document.getElementById("timer-label").textContent = formatTime(currentTime);
  circle.style.stroke = (currentTime <= 5) ? "#e74c3c" : "#2e86de";
}

// Play a tick sound (using Web Audio API)
function playTick(frequency = 1000, duration = 0.05) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// Submit the answer
function submitAnswer(autoSubmitted) {
  // Stop the timer and disable the submit button
  clearInterval(countdown);
  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;

  // Get the selected answer(s)
  const container = document.getElementById("answers-container");
  const selected = [];
  const selectedRadio = container.querySelector('input[name="quiz-answer"]:checked');
  if (selectedRadio) selected.push(selectedRadio.value);
  if (autoSubmitted) selected.push("timeout");

  // Ensure we have a current question available
  if (!questionKeys || currentQuestionIndex < 0 || currentQuestionIndex >= questionKeys.length) {
    console.error("No current question available.");
    return;
  }
  
  const qKey = questionKeys[currentQuestionIndex];
  const data = questions[qKey];
  if (!data) {
    console.error("No question data found for key:", qKey);
    return;
  }

  // Process the correct answers. Allow alphanumeric characters for flexibility.
  let correctAnswers = [];
  if (Array.isArray(data.correct)) {
    correctAnswers = data.correct.map(ans => {
      const match = ans.trim().match(/[a-zA-Z0-9]/); 
      return match ? match[0].toLowerCase() : "";
    }).sort();
  }
  
  // Process given answers similarly
  const givenAnswers = selected.map(x => x.toLowerCase()).sort();
  const isCorrect = JSON.stringify(givenAnswers) === JSON.stringify(correctAnswers);

  // Parse the timer label (assumed format "MM:SS")
  let secondsLeft = 0;
  const timerText = document.getElementById("timer-label").textContent;
  if (timerText) {
    const parts = timerText.split(":");
    if (parts.length === 2) {
      secondsLeft = parseInt(parts[1]);
      if (isNaN(secondsLeft)) secondsLeft = 0;
    }
  }
  
  // Calculate bonus and points
  const bonus = secondsLeft / data.timer;
  const points = isCorrect ? Math.round(500 + bonus * 500) : 0;
  totalPoints += points;
  
  // Save the answer for the current question in Firebase
  pinRef.child("recipients").child(username).child(qKey).set({
    selected: selected,
    correct: isCorrect,
    points: points,
    submittedAt: new Date().toISOString()
  }).then(() => {
    // Update user's summary
    return pinRef.child("recipients").child(username).child("summary").set({
      totalPoints: totalPoints,
      finishedAt: new Date().toISOString()
    });
  }).catch(err => {
    console.error("Error saving answer:", err);
  });
  
  // Show feedback page and render result
  showPage("feedback-page");

  const feedbackDiv = document.getElementById("feedbackContent");
  feedbackDiv.innerHTML = ""; // Clear previous feedback

  // ✅ Create image element instead of text icon
  const iconImg = document.createElement("img");
  iconImg.style.width = "60px";
  iconImg.style.marginBottom = "10px";

  // Set image source based on result
  if (autoSubmitted) {
    iconImg.src = "https://cdn.glitch.global/5688a322-5518-415d-9ba8-a0a61fb2fb96/Timer.png?v=1744292940811";
    iconImg.alt = "Time's up";
  } else if (isCorrect) {
    iconImg.src = "https://cdn.glitch.global/5688a322-5518-415d-9ba8-a0a61fb2fb96/Correct%20Sign.png?v=1744291639013";
    iconImg.alt = "Correct";
  } else {
    iconImg.src = "https://cdn.glitch.global/5688a322-5518-415d-9ba8-a0a61fb2fb96/Wrong%20Sign.png?v=1744291634319";
    iconImg.alt = "Incorrect";
  }

  feedbackDiv.appendChild(iconImg);

  // 🧠 Result message
  const resultText = document.createElement("h2");
  resultText.textContent = autoSubmitted
    ? "Time's up!"
    : isCorrect
    ? "Correct!"
    : "Wrong!";
  feedbackDiv.appendChild(resultText);

  // 🔢 Points display
  const pointsText = document.createElement("p");
  pointsText.textContent = `You earned ${points} points`;
  feedbackDiv.appendChild(pointsText);

  // ✅ Show correct answers
  const correctText = document.createElement("p");
  correctText.innerHTML = `<strong>Correct answer(s):</strong> ${data.correct.join(", ")}`;
  feedbackDiv.appendChild(correctText);

  // 📚 Explanation
  const explanationText = document.createElement("p");
  explanationText.innerHTML = `<strong>Explanation:</strong> ${data.explanation || "No explanation provided."}`;
  feedbackDiv.appendChild(explanationText);

  // Show insights/tables if host wants
  document.getElementById("questionInsights").style.display = "block";
  document.getElementById("recipients").style.display = "block";

  // Load insights and recipient answers — but do not move to tables page yet
  setTimeout(() => {
    pinRef.child("recipients").off("value");
    pinRef.child("recipients").on("value", snapshot => {
      const recipients = snapshot.val() || {};
      renderLeaderboard(recipients);
      renderRecipientAnswers(recipients);
      renderQuestionInsights(recipients);
    }).catch(err => {
      console.error("Error updating boards:", err);
    });
  }, 50);
}

// RENDER FUNCTIONS

// Render the participant list with avatars.
function renderParticipantList(recipients) {
  const participantListEl = document.getElementById("participant-list");
  participantListEl.innerHTML = "";

  // Use fallback empty object
  Object.entries(recipients || {}).forEach(([user, data]) => {
    if (user === "summary") return;

    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.marginBottom = "5px";

    const avatar = document.createElement("img");
    avatar.src = (data && data.avatar) || "";
    avatar.alt = user;
    avatar.style.width = "30px";
    avatar.style.height = "30px";
    avatar.style.borderRadius = "50%";
    avatar.style.marginRight = "10px";

    const name = document.createElement("span");
    name.textContent = binaryToText(user);

    li.appendChild(avatar);
    li.appendChild(name);
    participantListEl.appendChild(li);
  });
}

// Render the leaderboard (simplified version).
function renderLeaderboard(recipients) {
  const leaderboardSection = document.getElementById("leaderboard-section") || document.getElementById("leaderboard");
  if (leaderboardSection) leaderboardSection.style.display = "block";
  const leaderboardBody = document.querySelector("#leaderboardTable tbody");
  leaderboardBody.innerHTML = "";

  const scores = [];
  // Ensure recipients is defined
  Object.entries(recipients || {}).forEach(([user, data]) => {
    if (binaryToText(user) === "summary") return;

    let correct = 0, total = 0, points = 0;
    Object.entries(data || {}).forEach(([key, entry]) => {
      if (key !== "summary" && entry) {
        total++;
        if (entry.correct) correct++;
      } else if (key === "summary" && entry) {
        points = entry.totalPoints || 0;
      }
    });
    // Adjust total if needed (here subtracting 2, as in your code)
    scores.push({ user: binaryToText(user), correct, total: total - 2, points, avatar: (data && data.avatar) || "" });
  });

  scores.sort((a, b) => b.points - a.points || a.user.localeCompare(b.user));
  
  scores.slice(0, 10).forEach((s, index) => {
    const imgTag = s.avatar ? `<img src="${s.avatar}" class="avatar-small" alt="${s.user}" style="width:20px;height:20px;border-radius:50%;margin-right:5px;">` : "";
    const row = document.createElement("tr");
    if (index === 0) row.style.backgroundColor = "#ffeaa7";  // Soft gold
    if (index === 1) row.style.backgroundColor = "#dfe6e9";  // Cool silver
    if (index === 2) row.style.backgroundColor = "#fab1a0";  // Warm bronze
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${imgTag} ${s.user}</td>
      <td>${s.correct}</td>
      <td>${s.total}</td>
      <td>${s.points}</td>
      <td>${(s.total > 0 ? (s.correct / s.total * 100).toFixed(1) : 0)}%</td>
    `;
    leaderboardBody.appendChild(row);
  });
}

// Render the question insights table.
function renderQuestionInsights(recipients) {
  // Ensure currentQuestionKey is valid.
  const currentQuestionKey = questionKeys[currentQuestionIndex];
  if (!currentQuestionKey) return;

  // Use Firebase to fetch the full question data.
  pinRef.child("questions").child(currentQuestionKey).once("value").then(qSnap => {
    const qData = qSnap.val() || {};
    const tbody = document.querySelector("#insightTable tbody");
    tbody.innerHTML = "";

    const gotRight = [];
    const gotWrong = [];

    Object.entries(recipients || {}).forEach(([user, answers]) => {
      if (!answers) return;
      const entry = answers[currentQuestionKey];
      const avatar = (recipients[user] && recipients[user].avatar) || "";
      const imgTag = avatar ? `<img src="${avatar}" class="avatar-small" alt="${user}" style="width:20px;height:20px;border-radius:50%;margin-right:5px;">` : "";
      if (entry) {
        const points = entry.points || 0;
        if (entry.correct) {
          gotRight.push(`${imgTag} ${binaryToText(user)} (${points})`);
        } else {
          const selected = Array.isArray(entry.selected) ? entry.selected.join(", ") : "";
          gotWrong.push(`${imgTag} <strong>${binaryToText(user)}</strong> (${points}): ${selected}`);
        }
      }
    });

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${currentQuestionIndex + 1}</td>
      <td>${qData.question || ""}</td>
      <td>${(qData.correct || []).join(", ")}</td>
      <td>${qData.explanation || "-"}</td>
      <td>${gotRight.length ? gotRight.join("<br>") : "None"}</td>
      <td>${gotWrong.length ? gotWrong.join("<br>") : "None"}</td>
    `;
    tbody.appendChild(row);
    document.getElementById("questionInsights").style.display = "block";
  });
}

// Render the reciepient answers table.
function renderRecipientAnswers(recipients) {
  const tbody = document.querySelector("#recipientTable tbody");
  tbody.innerHTML = "";
  const currentQuestionKey = questionKeys[currentQuestionIndex];
  if (!currentQuestionKey) return;

  const entries = [];

  Object.entries(recipients || {}).forEach(([user, responses]) => {
    if (!responses || user === "summary") return;

    const entry = responses[currentQuestionKey];
    if (!entry || !entry.submittedAt) return;

    const avatar = responses.avatar || (recipients[user] && recipients[user].avatar) || "";
    const imgTag = avatar ? `<img src="${avatar}" class="avatar-small" alt="${user}" style="width:20px;height:20px;border-radius:50%;margin-right:5px;">` : "";

    entries.push({
      user: binaryToText(user),
      avatar,
      imgTag,
      selected: Array.isArray(entry.selected) ? entry.selected.join(", ") : "(none)",
      correct: entry.correct,
      points: entry.points || 0,
      submittedAt: new Date(entry.submittedAt)
    });
  });

  // Sort by submission time (earliest first)
  entries.sort((a, b) => a.submittedAt - b.submittedAt);

  // Render rows
  entries.forEach(entry => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${entry.imgTag} ${entry.user}</td>
      <td>${currentQuestionKey.toUpperCase()}</td>
      <td>${entry.selected}</td>
      <td style="color: ${entry.correct ? "green" : "red"}">
        ${entry.correct ? "✅" : "❌"}
      </td>
      <td>${entry.points}</td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById("recipients").style.display = "block";
}

// Attach event listeners after DOM loads
document.addEventListener("DOMContentLoaded", () => {
  renderAvatarSelection();
  document.getElementById("joinQuizBtn").addEventListener("click", joinWaitingRoom);
  
  document.getElementById("toTablesBtn").addEventListener("click", () => {
    showPage("tables-page");
  });

  
  // Optional: scroll-to-bottom button
  const scrollBtn = document.getElementById("scrollToBottomBtn");
  if (scrollBtn) {
    scrollBtn.addEventListener("click", () => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    });
  }
  const nxtBtn = document.getElementById("nextQuestion");
  nxtBtn.addEventListener('click', () => {
    db.child("state/participantNext").once((snap) => {
      const value = snap.value();
      if (value) {
        lastIndex = currentQuestionIndex;
        currentQuestionIndex++;
      }
    });
  });
});

// Expose functions for debugging if needed
window.joinWaitingRoom = joinWaitingRoom;
window.loadQuestionsAndStartQuiz = loadQuestionsAndStartQuiz;
window.loadQuestion = loadQuestion;
window.submitAnswer = submitAnswer;
