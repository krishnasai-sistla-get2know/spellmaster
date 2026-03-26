let allWords = [];
let sessionWords = [];
let currentIndex = 0;
let audioTimeout;
let attempts = 0;
let correctCount = 0;
let totalAttempted = 0;
let hasEarnedPoint = false;

// Load Local File
document.getElementById('fileInput').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) { processJson(event.target.result); };
    reader.readAsText(file);
});

// Keyboard shortcuts for spell input
document.getElementById('spellInput').addEventListener('keydown', function (e) {
    // Enter key triggers check spelling
    if (e.key === 'Enter') {
        e.preventDefault();
        checkSpelling();
    }
    // Right arrow key triggers next word
    else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextWord();
    }
});

// Dynamic rank display
document.getElementById('rankFilter').addEventListener('input', function() {
    const value = parseInt(this.value) || 0;
    const labels = {
        0: "Unranked",
        1: "Very Easy",
        2: "Easy",
        3: "Moderate",
        4: "Difficult",
        5: "Very Hard"
    };
    const label = labels[value] || "Invalid";
    document.getElementById('rankDisplay').innerText = `${value}: ${label}`;
});

// Load External File (with CORS fallback)
async function loadFromUrl() {
    const status = document.getElementById('loadStatus');
    status.innerText = "Connecting to library...";
    try {
        const response = await fetch('./mywords.json', {
            headers: { 'X-Bin-Meta': 'false' }
        });
        const data = await response.json();
        processJson(JSON.stringify(data));
    } catch (err) {
        status.innerText = "Using internal fallback list.";
        const fallback = [
            { "WORD": "manoeuvre", "RANK": 5, "PHONETIC": "/məˈnuːvə/" },
            { "WORD": "programme", "RANK": 2, "PHONETIC": "/ˈprəʊɡræm/" },
            { "WORD": "honour", "RANK": 1, "PHONETIC": "/ˈɒnə/" },
            { "WORD": "skilful", "RANK": 3, "PHONETIC": "/ˈskɪlf(ə)l/" }
        ];
        processJson(JSON.stringify(fallback));
    }
}

function processJson(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        allWords = data.map(w => ({
            WORD: w.WORD,
            RANK: w.RANK || 0,
            PHONETIC: w.PHONETIC || "Phonetic not available",
            MEANING: w.MEANING || "Definition not available"
        }));
        startSession(allWords);
        document.getElementById('setup').style.display = 'none';
        document.getElementById('game').style.display = 'block';
    } catch (err) { alert("Format Error: Ensure keys are WORD and RANK."); }
}

function startSession(wordList) {
    sessionWords = [...wordList].sort(() => Math.random() - 0.5);
    currentIndex = 0;
    correctCount = 0;
    totalAttempted = 0;
    updateUI();
    schedulePronunciation();
}

function schedulePronunciation() {
    clearTimeout(audioTimeout);
    audioTimeout = setTimeout(pronounceWord, 2000);
}

function pronounceWord() {
    if (!sessionWords[currentIndex]) return;
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(sessionWords[currentIndex].WORD);
    const voices = window.speechSynthesis.getVoices();
    const britishVoice = voices.find(v => v.lang === 'en-GB' || v.lang === 'en_GB');
    if (britishVoice) msg.voice = britishVoice;
    msg.lang = 'en-GB';
    msg.rate = 0.85;
    window.speechSynthesis.speak(msg);
}

function checkSpelling() {
    const input = document.getElementById('spellInput').value.trim().toLowerCase();
    const correctWord = sessionWords[currentIndex].WORD.toLowerCase();
    const feedback = document.getElementById('feedback');

    if (input === correctWord) {
        feedback.innerHTML = "✓ Correct spelling";
        feedback.className = "correct";
        if (!hasEarnedPoint) {
            correctCount++;
            hasEarnedPoint = true;
            updateScore();
        }
    } else {
        attempts++;
        feedback.innerHTML = `✗ Try again (${attempts}/3)`;
        feedback.className = "wrong";
        if (attempts >= 3) document.getElementById('hintBtn').style.display = "block";
    }
}

function showHint() {
    const wordObj = sessionWords[currentIndex];
    const display = document.getElementById('hintDisplay');
    display.style.display = "block";
    display.innerHTML = `<strong>${wordObj.WORD}</strong> ${wordObj.PHONETIC}`;
}

function toggleMeaning() {
    const wordObj = sessionWords[currentIndex];
    const display = document.getElementById('meaningDisplay');
    const button = document.getElementById('meaningBtn');

    if (display.style.display === "none") {
        display.style.display = "block";
        display.innerHTML = `<strong>Definition:</strong> ${wordObj.MEANING}`;
        button.innerHTML = "📖 Hide Definition";
    } else {
        display.style.display = "none";
        button.innerHTML = "📖 Show Definition";
    }
}

function updateScore() {
    document.getElementById('scoreDisplay').innerText = `Score: ${correctCount}/${totalAttempted}`;
}

function applyFilter() {
    const minRank = parseInt(document.getElementById('rankFilter').value);
    const filtered = allWords.filter(w => w.RANK >= minRank);
    if (filtered.length === 0) return alert("No words match this rank.");
    startSession(filtered);
}

function updateRankInList() {
    const newRank = parseInt(document.getElementById('currentRank').value);
    const wordText = sessionWords[currentIndex].WORD;
    sessionWords[currentIndex].RANK = newRank;
    const masterWord = allWords.find(w => w.WORD === wordText);
    if (masterWord) masterWord.RANK = newRank;
    document.getElementById('feedback').innerText = "Rank saved locally!";
}

function nextWord() {
    totalAttempted++;
    currentIndex++;
    if (currentIndex >= sessionWords.length) {
        alert("All words complete!");
        currentIndex = 0;
        sessionWords.sort(() => Math.random() - 0.5);
    }
    updateUI();
    schedulePronunciation();
}

function updateUI() {
    attempts = 0;
    hasEarnedPoint = false;
    document.getElementById('spellInput').value = "";
    document.getElementById('feedback').innerHTML = "";
    document.getElementById('hintDisplay').style.display = "none";
    document.getElementById('hintBtn').style.display = "none";
    document.getElementById('meaningDisplay').style.display = "none";
    document.getElementById('meaningBtn').innerHTML = "📖 Show Definition";
    document.getElementById('sessionStats').innerText = `Word ${currentIndex + 1}/${sessionWords.length}`;
    document.getElementById('currentRank').value = sessionWords[currentIndex].RANK || 0;
    updateScore();
    document.getElementById('spellInput').focus();
}

async function exportJson() {
    const dataStr = JSON.stringify(allWords, null, 2);

    // 1. Try modern System File Picker (Allows choosing name AND location)
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'spellmaster_updated_ranking.json',
                types: [{
                    description: 'JSON File',
                    accept: { 'application/json': ['.json'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(dataStr);
            await writable.close();
            return; // Success
        } catch (err) {
            if (err.name === 'AbortError') return; // User clicked cancel
            console.error("System picker failed, trying fallback...", err);
        }
    }

    // 2. Fallback: Simple Prompt (Name only, location depends on browser settings)
    const customName = prompt("Enter a name for your file:", "british_spellings_updated.json");
    if (!customName) return; // User clicked cancel

    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = customName.endsWith('.json') ? customName : customName + '.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

window.speechSynthesis.getVoices();
