//global variables
let currentUser = null;
let currentEra = null;
let currentLevel = 1;
let currentQIndex = 0;
let score = 0;
let questionsInRound = [];
let userDeck = [];
let answered = false;

//sound effects
function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.1;

    if (type === "dice") {
      //short click for dice
      osc.type = "square";
      osc.frequency.value = 320;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } 
    else if (type === "levelup") {
      //rising sound for level up
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523, ctx.currentTime);        // C5
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12); // E5
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.24); // G5
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) {
    //ignore if browser blocks audio
  }
}

//storage and hashing functions
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return "h" + Math.abs(hash).toString(16);
}

function saveUsers(users) {
  localStorage.setItem("kh_users", JSON.stringify(users));
}

function loadUsers() {
  return JSON.parse(localStorage.getItem("kh_users") || "{}");
}

function saveCurrentUser() {
  if (!currentUser || currentUser.isGuest) return;

  const users = loadUsers();
  users[currentUser.username] = currentUser;
  saveUsers(users);
  localStorage.setItem("kh_session", currentUser.username);
}

function loadSession() {
  const name = localStorage.getItem("kh_session");
  if (!name) return null;
  const users = loadUsers();
  return users[name] || null;
}

//password and username validations 
function isValidUsername(username) {
  return /^[a-zA-Z]{4,8}$/.test(username);
}

function isValidPassword(password) {
  return password.length === 8;
}

function clearErrors() {
  document.querySelectorAll('.error').forEach(el => el.textContent = '');
}

//register user
function register() {
  clearErrors();

  const user  = document.getElementById("regUser").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const pass  = document.getElementById("regPass").value;

  let hasError = false;

  if (!user) {
    document.getElementById("regUserError").textContent = "Username is required";
    hasError = true;
  } else if (!isValidUsername(user)) {
    document.getElementById("regUserError").textContent = "Username must be 4-8 letters only";
    hasError = true;
  }

  if (!email) {
    document.getElementById("regEmailError").textContent = "Email is required";
    hasError = true;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById("regEmailError").textContent = "Please enter a valid email";
    hasError = true;
  }

  if (!phone) {
    document.getElementById("regPhoneError").textContent = "Phone number is required";
    hasError = true;
  } else if (!/^(\+254|254|0)?[17]\d{8}$/.test(phone.replace(/\s/g, ""))) {
    document.getElementById("regPhoneError").textContent = "Enter a valid Kenyan phone number";
    hasError = true;
  }

  if (!pass) {
    document.getElementById("regPassError").textContent = "Password is required";
    hasError = true;
  } else if (!isValidPassword(pass)) {
    document.getElementById("regPassError").textContent = "Password must be exactly 8 characters";
    hasError = true;
  }

  if (hasError) return;

  const users = loadUsers();
  if (users[user]) {
    document.getElementById("regUserError").textContent = "Username already exists";
    return;
  }
   //create new user object
  users[user] = {
    username: user,
    email: email,
    phone: phone,
    passwordHash: simpleHash(pass),
    joined: new Date().toLocaleDateString(),
    matches: 0,
    correct: 0,
    totalAnswered: 0,
    eraStats: { precolonial: 0, trade: 0, resistance: 0, independence: 0 },
    eraCorrect: { precolonial: 0, trade: 0, resistance: 0, independence: 0 },
    history: [],
    deck: []
  };

  saveUsers(users);
  window.location.href = "login.html";
}

//user login
function login() {
  clearErrors();

  const user = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value;
  let hasError = false;

  if (!user) {
    document.getElementById("loginUserError").textContent = "Username is required";
    hasError = true;
  }
  if (!pass) {
    document.getElementById("loginPassError").textContent = "Password is required";
    hasError = true;
  }
  if (hasError) return;

  const users = loadUsers();

  if (!users[user] || users[user].passwordHash !== simpleHash(pass)) {
    document.getElementById("loginPassError").textContent = "Invalid username or password";
    return;
  }

  //clear guest flag if exists
  sessionStorage.removeItem("kh_guest");

  currentUser = users[user];
  localStorage.setItem("kh_session", user);
  afterLogin();
}

//play as a guest
function playAsGuest() {
  sessionStorage.setItem("kh_guest", "true");

  currentUser = {
    username: "Guest",
    isGuest: true,
    joined: new Date().toLocaleDateString(),
    matches: 0,
    correct: 0,
    totalAnswered: 0,
    eraStats: { precolonial: 0, trade: 0, resistance: 0, independence: 0 },
    eraCorrect: { precolonial: 0, trade: 0, resistance: 0, independence: 0 },
    history: [],
    deck: []
  };

  userDeck = [];
  window.location.href = "index.html";
}

//logout function
function logout() {
  sessionStorage.removeItem("kh_guest");
  if (currentUser && !currentUser.isGuest) {
    localStorage.removeItem("kh_session");
  }
  currentUser = null;
  window.location.href = "login.html";
}

//after the user logs in
function afterLogin() {
  if (document.getElementById("logoutBtn")) {
    document.getElementById("logoutBtn").style.display = "inline-block";
  }

  if (document.getElementById("welcomeName")) {
    document.getElementById("welcomeName").textContent = currentUser.username;
  }

  const banner = document.getElementById("guestBanner");
  if (banner) {
    banner.style.display = currentUser.isGuest ? "block" : "none";
  }

  const guestNote = document.getElementById("guestNote");
  if (guestNote) {
    guestNote.style.display = currentUser.isGuest ? "block" : "none";
  }

  userDeck = currentUser.deck || [];

  if (document.getElementById("home")) {
    showScreen("home");
    updateProfile();
  } else {
    window.location.href = "index.html";
  }
}

//screen navigation function
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(id);
  if (target) target.classList.add("active");

  if (id === "browse") renderBrowse();
  if (id === "deck") renderDeck();
  if (id === "profile") updateProfile();
  if (id === "play") {
    document.getElementById("quizArea").style.display = "none";
    document.getElementById("diceResult").textContent = "";
    document.getElementById("diceFace").textContent = "?";
  }
}

//browse function
function renderBrowse() {
  const container = document.getElementById("eraDetails");
  if (!container) return;

  container.innerHTML = "";
  for (const key in ERAS) {
    const era = ERAS[key];
    const div = document.createElement("div");
    div.className = "era-card";
    div.style.borderTopColor = era.color;
    div.innerHTML = `
      <h3>${era.name}</h3>
      <p>${era.description}</p>
      <button class="btn" style="margin-top:0.8rem; font-size:0.9rem;" onclick="startEra('${key}')">Start this Era</button>
      <button class="btn btn-outline" style="margin-top:0.5rem; font-size:0.85rem;" onclick="addToDeck('${key}')">+ Add to Deck</button>
    `;
    container.appendChild(div);
  }
}

//deck function 
function addToDeck(key) {
  if (!userDeck.includes(key)) {
    userDeck.push(key);
  } else {
    alert("Already in your deck");
  }
  if (document.getElementById("deck")?.classList.contains("active")) renderDeck();
}

function renderDeck() {
  const list = document.getElementById("deckList");
  if (!list) return;

  if (userDeck.length === 0) {
    list.innerHTML = "<p>Your deck is empty. Browse eras and add some!</p>";
    return;
  }

  list.innerHTML = userDeck.map(k => `
    <div style="background:white; padding:0.8rem 1rem; margin:0.5rem 0; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
      <span><strong>${ERAS[k].name}</strong></span>
      <button class="btn btn-red" style="padding:0.3rem 0.7rem; font-size:0.8rem;" onclick="removeFromDeck('${k}')">Remove</button>
    </div>
  `).join("");
}

function removeFromDeck(key) {
  userDeck = userDeck.filter(k => k !== key);
  renderDeck();
}

function saveDeck() {
  if (!currentUser) return;

  if (currentUser.isGuest) {
    alert("Guest progress is not saved. Please register to keep your deck.");
    return;
  }

  currentUser.deck = [...userDeck];
  saveCurrentUser();
  alert("Deck saved to your profile!");
}

function clearDeck() {
  userDeck = [];
  renderDeck();
}

 //level progress function
 function updateLevelProgress() {
  for (let i = 1; i <= 6; i++) {
    const step = document.getElementById(`lvl${i}`);
    if (!step) continue;

    step.classList.remove("active", "completed");

    if (i < currentLevel) {
      step.classList.add("completed");
    } else if (i === currentLevel) {
      step.classList.add("active");
    }
  }

  const lines = document.querySelectorAll(".level-line");
  lines.forEach((line, index) => {
    if (index + 1 < currentLevel) {
      line.classList.add("completed");
    } else {
      line.classList.remove("completed");
    }
  });
}
//game play
function startEra(key) {
  currentEra = key;
  currentLevel = 1;
  score = 0;
  prepareQuestions();
  showScreen("play");
  document.getElementById("quizArea").style.display = "block";
  document.getElementById("diceResult").textContent = `You chose: ${ERAS[key].name} → Level 1`;
  document.getElementById("diceFace").textContent = Object.keys(ERAS).indexOf(key) + 1;
  updateLevelProgress();
  loadQuestion();
}

function rollDice() {
  playSound("dice");
  const btn = document.getElementById("rollBtn");
  const face = document.getElementById("diceFace");
  btn.disabled = true;
  face.classList.add("rolling");
  face.textContent = "…";
  
  setTimeout(() => {
    const keys = Object.keys(ERAS);
    const roll = Math.floor(Math.random() * 4);
    const key = keys[roll];
    face.textContent = roll + 1;
    face.classList.remove("rolling");
    document.getElementById("diceResult").textContent = `You rolled ${roll + 1} → ${ERAS[key].name}`;
    currentEra = key;
    currentLevel = 1;
    score = 0;
    prepareQuestions();
    document.getElementById("quizArea").style.display = "block";
    updateLevelProgress();
    loadQuestion();
    btn.disabled = false;
  }, 700);
}
//question preparation and loading
function prepareQuestions() {
  let available = QUESTIONS[currentEra].filter(q => q.level === currentLevel);

  if (available.length < 4) {
    available = QUESTIONS[currentEra].filter(q => q.level <= currentLevel);
  }

  questionsInRound = available.sort(() => Math.random() - 0.5).slice(0, 4);
  currentQIndex = 0;
  answered = false;
  score = 0;
  updateLevelProgress();
}

function loadQuestion() {
  if (currentQIndex >= questionsInRound.length) {
    endRound();
    return;
  }

  answered = false;
  const q = questionsInRound[currentQIndex];

  document.getElementById("questionText").textContent = q.q;
  document.getElementById("currentLevel").textContent = currentLevel;
  document.getElementById("score").textContent = score;
  document.getElementById("progressFill").style.width = ((currentQIndex) / questionsInRound.length * 100) + "%";
  document.getElementById("feedback").textContent = "";
  document.getElementById("nextBtn").style.display = "none";

  const opts = document.getElementById("options");
  opts.innerHTML = "";
  q.options.forEach((opt, i) => {
    const b = document.createElement("button");
    b.textContent = opt;
    b.onclick = () => selectAnswer(i, q.a, b);
    opts.appendChild(b);
  });
  updateLevelProgress();
}
//answer selection and feedback
function selectAnswer(selected, correct, btn) {
  if (answered) return;
  answered = true;

  const buttons = document.querySelectorAll("#options button");
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === correct) b.classList.add("correct");
    if (i === selected && selected !== correct) b.classList.add("wrong");
  });

  if (selected === correct) {
    score++;
    document.getElementById("feedback").textContent = "✅ Correct!";
    document.getElementById("feedback").style.color = "#28a745";
    currentUser.correct = (currentUser.correct || 0) + 1;
    currentUser.eraCorrect[currentEra] = (currentUser.eraCorrect[currentEra] || 0) + 1;
  } else {
    document.getElementById("feedback").textContent = "❌ Wrong. The correct answer is highlighted.";
    document.getElementById("feedback").style.color = "#dc3545";
  }

  currentUser.totalAnswered = (currentUser.totalAnswered || 0) + 1;
  currentUser.eraStats[currentEra] = (currentUser.eraStats[currentEra] || 0) + 1;
  document.getElementById("score").textContent = score;
  document.getElementById("nextBtn").style.display = "inline-block";
}
//next question and round completion
function nextQuestion() {
  currentQIndex++;

  if (currentQIndex >= questionsInRound.length) {
    //record the completed level in history 
    currentUser.history = currentUser.history || [];
    currentUser.history.unshift({
      date: new Date().toLocaleString(),
      era: ERAS[currentEra].name,
      level: currentLevel,
      score: score + "/" + questionsInRound.length
    });

    //keep only the last 30 entries
    if (currentUser.history.length > 30) {
      currentUser.history.pop();
    }

    //save progress
    currentUser.matches = (currentUser.matches || 0) + 1;
    saveCurrentUser();

    //now decide whether to level up or end the round
    if (currentLevel < 6 && score >= 2) {
      currentLevel++;
      playSound("levelup");
      prepareQuestions();
      loadQuestion();
    } else {
      endRound();
    }
  } else {
    loadQuestion();
  }
}
//end of round summary
function endRound() {
  let message = `Round complete! You scored ${score} out of ${questionsInRound.length}.`;

  if (currentLevel === 6) {
    message += "\n\n🏆 You reached the highest level!";
  }

  document.getElementById("questionText").textContent = message;
  document.getElementById("options").innerHTML = "";
  document.getElementById("feedback").textContent = currentUser.isGuest
    ? "Guest progress is not saved."
    : "Progress saved. Check your profile for stats.";
  document.getElementById("nextBtn").style.display = "none";
  document.getElementById("progressFill").style.width = "100%";
}
//get top 3 players function
function getTopPlayers(limit = 3) {
  const users = loadUsers();
  const players = [];

  for (const username in users) {
    const user = users[username];
    if (!user || user.isGuest) continue;

    const correct = user.correct || 0;
    let highestLevel = 1;

    if (user.history && user.history.length > 0) {
      highestLevel = Math.max(...user.history.map(h => Number(h.level) || 1));
    }

    players.push({
      username: user.username,
      correct: correct,
      matches: user.matches || 0,
      highestLevel: highestLevel,
      accuracy: user.totalAnswered
        ? Math.round((correct / user.totalAnswered) * 100)
        : 0,
      rankingScore: correct * 10 + highestLevel
    });
  }
//sort from highest to lowest
  players.sort((a, b) => b.rankingScore - a.rankingScore);
  return players.slice(0, limit);
}

//updated user profile
function updateProfile() {
  if (!currentUser) return;

  //update profile stats
  document.getElementById("profName").textContent = currentUser.username;
  document.getElementById("profJoined").textContent = currentUser.joined;
  document.getElementById("statMatches").textContent = currentUser.matches || 0;
  document.getElementById("statCorrect").textContent = currentUser.correct || 0;

  const total = currentUser.totalAnswered || 0;
  const acc = total ? Math.round((currentUser.correct || 0) / total * 100) : 0;
  document.getElementById("statAccuracy").textContent = acc + "%";

  //highest Level
  let highestLevel = 1;
  if (currentUser.history && currentUser.history.length > 0) {
    highestLevel = Math.max(...currentUser.history.map(h => Number(h.level) || 1));
  }
  if (document.getElementById("statHighestLevel")) {
    document.getElementById("statHighestLevel").textContent = highestLevel;
  }

  //weakest Era
  let weakest = "-";
  let lowestRatio = 2;
  for (const key in currentUser.eraStats) {
    const attempted = currentUser.eraStats[key] || 0;
    if (attempted === 0) continue;
    const ratio = (currentUser.eraCorrect[key] || 0) / attempted;
    if (ratio < lowestRatio) {
      lowestRatio = ratio;
      weakest = ERAS[key].name;
    }
  }
  if (document.getElementById("statWeakest")) {
    document.getElementById("statWeakest").textContent = weakest;
  }

  //levels Reached badges
  const levelsContainer = document.getElementById("levelsReached");
  if (levelsContainer) {
    levelsContainer.innerHTML = "";
    for (let i = 1; i <= 6; i++) {
      const badge = document.createElement("div");
      badge.className = "level-badge-profile";
      badge.textContent = i;
      if (i <= highestLevel) badge.classList.add("reached");
      if (i === highestLevel) badge.classList.add("current-highest");
      levelsContainer.appendChild(badge);
    }
  }

  //match History
  const tbody = document.getElementById("historyBody");
  if (tbody) {
    tbody.innerHTML = (currentUser.history || []).map(h => `
      <tr>
        <td>${h.date}</td>
        <td>${h.era}</td>
        <td><strong>Level ${h.level}</strong></td>
        <td>${h.score}</td>
      </tr>
    `).join("") || `<tr><td colspan="4" style="text-align:center;">No matches yet</td></tr>`;
  }

  //top players leaderboard
  const topPlayersList = document.getElementById("topPlayersList");
  if (topPlayersList) {
    const topPlayers = getTopPlayers(3);

    if (topPlayers.length === 0) {
      topPlayersList.innerHTML = `<p style="color:#666;">No registered players yet. Be the first!</p>`;
    } else {
      topPlayersList.innerHTML = topPlayers.map((player, index) => {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉";
        return `
          <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #eee;">
            <div style="font-size:1.6rem; width:36px;">${medal}</div>
            <div>
              <div style="font-weight:bold; font-size:1.15rem; color:#006600;">${player.username}</div>
              <div style="font-size:0.9rem; color:#555; margin-top:2px;">
                Level ${player.highestLevel} • ${player.correct} correct • ${player.accuracy}% accuracy
              </div>
            </div>
          </div>
        `;
      }).join("");
    }
  }
}      
//init function
window.onload = () => {
  // Check for Guest
  if (sessionStorage.getItem("kh_guest") === "true") {
    currentUser = {
      username: "Guest",
      isGuest: true,
      joined: new Date().toLocaleDateString(),
      matches: 0,
      correct: 0,
      totalAnswered: 0,
      eraStats: { precolonial: 0, trade: 0, resistance: 0, independence: 0 },
      eraCorrect: { precolonial: 0, trade: 0, resistance: 0, independence: 0 },
      history: [],
      deck: []
    };
    afterLogin();
    return;
  }

  //normal user
  currentUser = loadSession();

  if (currentUser) {
    afterLogin();
  } else if (document.getElementById("home")) {
    window.location.href = "login.html";
  }
};
