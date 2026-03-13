const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const tasksEl = document.getElementById("tasks");
const dailySummaryEl = document.getElementById("dailySummary");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const extractTasksBtn = document.getElementById("extractTasksBtn");
const clearTasksBtn = document.getElementById("clearTasksBtn");
const highRiskOnlyToggle = document.getElementById("highRiskOnlyToggle");
const geminiKeyInput = document.getElementById("geminiKeyInput");
const summaryRangeSelect = document.getElementById("summaryRangeSelect");
const customDaysInput = document.getElementById("customDaysInput");
const saveGeminiKeyBtn = document.getElementById("saveGeminiKeyBtn");
const summarizeEmailsBtn = document.getElementById("summarizeEmailsBtn");

const STORAGE_KEY = "extractedTasks";
const GEMINI_KEY_STORAGE = "geminiApiKey";
let tasks = [];

function setStatus(text) {
  statusEl.textContent = text;
}

function setResult(text) {
  resultEl.textContent = text;
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (data) => resolve(data[key]));
  });
}

function writeStorage(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve());
  });
}

function getHeaderValue(headers, name) {
  const header = (headers || []).find(
    (item) => String(item.name || "").toLowerCase() === name.toLowerCase()
  );
  return header?.value || "";
}

function decodeBase64Url(base64Url) {
  if (!base64Url) {
    return "";
  }
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  try {
    return decodeURIComponent(escape(atob(padded)));
  } catch {
    try {
      return atob(padded);
    } catch {
      return "";
    }
  }
}

function extractPlainTextFromPayload(payload) {
  if (!payload) {
    return "";
  }
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (!payload.parts || !payload.parts.length) {
    return payload.body?.data ? decodeBase64Url(payload.body.data) : "";
  }
  for (const part of payload.parts) {
    const text = extractPlainTextFromPayload(part);
    if (text) {
      return text;
    }
  }
  return "";
}

function formatDueText(iso) {
  if (!iso) {
    return "No parsed deadline";
  }
  return new Date(iso).toLocaleString();
}

function getRiskInfo(task) {
  const dueMs = new Date(task.dueAtIso || "").getTime();
  if (!Number.isFinite(dueMs)) {
    return { key: "normal", label: "NORMAL" };
  }
  const diffMs = dueMs - Date.now();
  if (diffMs < 0) {
    return { key: "overdue", label: "OVERDUE" };
  }
  if (diffMs <= 24 * 60 * 60 * 1000) {
    return { key: "urgent", label: "DUE <24H" };
  }
  if (diffMs <= 3 * 24 * 60 * 60 * 1000) {
    return { key: "soon", label: "DUE <3D" };
  }
  return { key: "normal", label: "UPCOMING" };
}

function getGroupName(task) {
  const due = new Date(task.dueAtIso || "");
  if (!Number.isFinite(due.getTime())) {
    return "This Week";
  }
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTomorrow = new Date(startToday);
  startTomorrow.setDate(startTomorrow.getDate() + 1);
  const startAfterTomorrow = new Date(startTomorrow);
  startAfterTomorrow.setDate(startAfterTomorrow.getDate() + 1);
  const endThisWeek = new Date(startToday);
  endThisWeek.setDate(endThisWeek.getDate() + 7);

  if (due < startToday) {
    return "Overdue";
  }
  if (due < startTomorrow) {
    return "Today";
  }
  if (due < startAfterTomorrow) {
    return "Tomorrow";
  }
  if (due < endThisWeek) {
    return "This Week";
  }
  return "Later";
}

function buildDailySummary(visibleTasks) {
  const pending = visibleTasks.filter((t) => !t.done);
  const overdue = pending.filter((t) => getRiskInfo(t).key === "overdue").length;
  const urgent = pending.filter((t) => getRiskInfo(t).key === "urgent").length;
  if (!pending.length) {
    return "No pending deadlines in this range. Next action: run Extract Tasks.";
  }
  const top = pending
    .slice()
    .sort((a, b) => String(a.dueAtIso).localeCompare(String(b.dueAtIso)))[0];
  return `You have ${overdue} overdue and ${urgent} due within 24h. Next action: ${top.subject} before ${formatDueText(
    top.dueAtIso
  )}.`;
}

function renderTasks() {
  let selectedDays = 14;
  try {
    selectedDays = resolveSummaryDays();
  } catch {
    selectedDays = 14;
  }
  const nowMs = Date.now();
  const windowMs = selectedDays * 24 * 60 * 60 * 1000;
  const filteredByRange = tasks.filter((task) => {
    const baseTime = task.receivedAtIso || task.dueAtIso || "";
    if (!baseTime) {
      return false;
    }
    const receivedMs = new Date(baseTime).getTime();
    if (!Number.isFinite(receivedMs)) {
      return false;
    }
    return nowMs - receivedMs <= windowMs;
  });
  const pendingInRange = filteredByRange.filter((task) => !task.done);
  const highRiskOnly = Boolean(highRiskOnlyToggle?.checked);
  const visibleTasks = highRiskOnly
    ? pendingInRange.filter((task) => {
        const risk = getRiskInfo(task).key;
        return risk === "overdue" || risk === "urgent";
      })
    : pendingInRange;

  dailySummaryEl.textContent = buildDailySummary(visibleTasks);
  if (!visibleTasks.length) {
    tasksEl.innerHTML = "";
    return;
  }
  const groupOrder = ["Overdue", "Today", "Tomorrow", "This Week", "Later"];
  const groups = {
    Overdue: [],
    Today: [],
    Tomorrow: [],
    "This Week": [],
    Later: []
  };
  for (const task of visibleTasks) {
    groups[getGroupName(task)].push(task);
  }
  for (const key of groupOrder) {
    groups[key].sort((a, b) => String(a.dueAtIso).localeCompare(String(b.dueAtIso)));
  }

  tasksEl.innerHTML = groupOrder
    .map((groupName) => {
      const groupTasks = groups[groupName];
      if (!groupTasks.length) {
        return "";
      }
      const cards = groupTasks
        .map((task) => {
      const dueText = formatDueText(task.dueAtIso);
      const risk = getRiskInfo(task);
      const gmailLink = task.messageId
        ? `https://mail.google.com/mail/u/0/#inbox/${encodeURIComponent(task.messageId)}`
        : "";
      const calInfo = task.calendarLink
        ? `<div class="task-meta">Calendar: <a href="${escapeHtml(
            task.calendarLink
          )}" target="_blank">Open</a></div>`
        : "";
      return `
      <div class="task">
        <div class="task-top">
          <div class="task-title">${escapeHtml(task.subject || "No subject")}</div>
          <span class="risk risk-${escapeHtml(risk.key)}">${escapeHtml(risk.label)}</span>
        </div>
        <div class="task-meta">Due: ${escapeHtml(dueText)}</div>
        ${calInfo}
        <div class="task-actions">
          <a href="${escapeHtml(gmailLink)}" target="_blank">Open in Gmail</a>
          <button data-add-calendar="${escapeHtml(task.id)}">${task.calendarEventId ? "Added to Calendar" : "Add to Calendar"}</button>
          <button data-mark-done="${escapeHtml(task.id)}">Done</button>
        </div>
      </div>`;
    })
    .join("");
      return `<div class="group-title">${groupName}</div>${cards}`;
    })
    .join("");
}

function getAuthToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!token) {
        reject(new Error("No token returned"));
        return;
      }
      resolve(token);
    });
  });
}

function removeToken(token) {
  return new Promise((resolve, reject) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

async function fetchWithToken(url, options = {}) {
  const token = await getAuthToken(false);
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }

  return res.json();
}

function normalizeDueDate(date) {
  const normalized = new Date(date);
  normalized.setSeconds(0, 0);
  return normalized;
}

function parseDueFromText(text) {
  const value = text.toLowerCase();
  const now = new Date();

  if (value.includes("tomorrow")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return { date: normalizeDueDate(d), hint: "tomorrow" };
  }
  if (value.includes("today")) {
    const d = new Date(now);
    d.setHours(17, 0, 0, 0);
    return { date: normalizeDueDate(d), hint: "today" };
  }
  if (value.includes("next week")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    d.setHours(17, 0, 0, 0);
    return { date: normalizeDueDate(d), hint: "next week" };
  }

  const ymd = value.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (ymd) {
    const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 17, 0, 0);
    return { date: normalizeDueDate(d), hint: ymd[0] };
  }

  const mdy = value.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}))?\b/);
  if (mdy) {
    const year = mdy[3] ? Number(mdy[3]) : now.getFullYear();
    const d = new Date(year, Number(mdy[1]) - 1, Number(mdy[2]), 17, 0, 0);
    return { date: normalizeDueDate(d), hint: mdy[0] };
  }

  const monthNames =
    "(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)";
  const monthPattern = new RegExp(`\\b${monthNames}\\s+(\\d{1,2})(?:,\\s*(20\\d{2}))?\\b`);
  const monthMatch = value.match(monthPattern);
  if (monthMatch) {
    const monthMap = {
      jan: 0,
      january: 0,
      feb: 1,
      february: 1,
      mar: 2,
      march: 2,
      apr: 3,
      april: 3,
      may: 4,
      jun: 5,
      june: 5,
      jul: 6,
      july: 6,
      aug: 7,
      august: 7,
      sep: 8,
      sept: 8,
      september: 8,
      oct: 9,
      october: 9,
      nov: 10,
      november: 10,
      dec: 11,
      december: 11
    };
    const year = monthMatch[3] ? Number(monthMatch[3]) : now.getFullYear();
    const d = new Date(year, monthMap[monthMatch[1]], Number(monthMatch[2]), 17, 0, 0);
    return { date: normalizeDueDate(d), hint: monthMatch[0] };
  }

  return null;
}

function buildTaskFromMessage(message) {
  const headers = message.payload?.headers || [];
  const subject = getHeaderValue(headers, "Subject") || "(No Subject)";
  const snippet = message.snippet || "";
  const combinedText = `${subject} ${snippet}`;
  const due = parseDueFromText(combinedText);
  if (!due) {
    return null;
  }

  return {
    id: `${message.id}-${due.date.toISOString()}`,
    messageId: message.id,
    subject,
    snippet,
    receivedAtIso: message.internalDate
      ? new Date(Number(message.internalDate)).toISOString()
      : "",
    dueAtIso: due.date.toISOString(),
    dueText: due.hint,
    done: false,
    calendarEventId: "",
    calendarLink: ""
  };
}

async function loadTasks() {
  const stored = (await readStorage(STORAGE_KEY)) || [];
  let changed = false;
  tasks = stored.map((task) => {
    if (task.receivedAtIso) {
      return task;
    }
    changed = true;
    return {
      ...task,
      // Backward compatibility for tasks extracted before receivedAtIso existed.
      receivedAtIso: task.dueAtIso || "",
      done: Boolean(task.done)
    };
  });
  if (changed) {
    await writeStorage(STORAGE_KEY, tasks);
  }
  renderTasks();
}

async function saveTasks(newTasks) {
  tasks = newTasks;
  await writeStorage(STORAGE_KEY, tasks);
  renderTasks();
}

async function loadGeminiKey() {
  const key = (await readStorage(GEMINI_KEY_STORAGE)) || "";
  geminiKeyInput.value = key;
}

async function saveGeminiKey() {
  const key = geminiKeyInput.value.trim();
  if (!key) {
    setStatus("Gemini key is empty");
    return;
  }
  await writeStorage(GEMINI_KEY_STORAGE, key);
  setStatus("Gemini key saved");
  setResult("");
}

async function connectGoogle() {
  setStatus("Connecting...");
  setResult("");
  try {
    await getAuthToken(true);
    setStatus("Connected to Google");
  } catch (err) {
    setStatus("Connect failed");
    setResult(String(err.message || err));
  }
}

async function logoutGoogle() {
  setStatus("Logging out...");
  setResult("");
  try {
    const token = await getAuthToken(false);
    await removeToken(token);
    setStatus("Logged out");
  } catch (err) {
    setStatus("Logout finished");
    setResult(String(err.message || err));
  }
}

async function fetchMessageDetail(messageId) {
  return fetchWithToken(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Subject`
  );
}

async function fetchMessageForSummary(messageId) {
  return fetchWithToken(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`
  );
}

async function extractTasks() {
  setStatus("Extracting tasks from Gmail...");
  setResult("");
  try {
    const days = resolveSummaryDays();
    const query = `newer_than:${days}d`;
    const list = await fetchWithToken(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=40&q=${encodeURIComponent(query)}`
    );
    const ids = (list.messages || []).map((m) => m.id);
    if (!ids.length) {
      setStatus("No recent emails");
      await saveTasks([]);
      return;
    }

    const details = await Promise.all(ids.map((id) => fetchMessageDetail(id)));
    const extracted = details.map(buildTaskFromMessage).filter(Boolean);

    const dedupedMap = new Map();
    for (const task of extracted) {
      dedupedMap.set(task.id, task);
    }
    const merged = Array.from(dedupedMap.values()).sort((a, b) =>
      String(a.dueAtIso).localeCompare(String(b.dueAtIso))
    );

    await saveTasks(merged);
    setStatus(`Extracted ${extracted.length} tasks (${days}d)`);
    setResult(
      extracted.length
        ? "Tasks parsed with rule-based date extraction."
        : "No deadline-like text found in recent emails."
    );
  } catch (err) {
    setStatus("Task extraction failed");
    setResult(String(err.message || err));
  }
}

async function addTaskToCalendar(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) {
    return;
  }
  if (task.calendarEventId) {
    setStatus("Task already added to Calendar");
    setResult(task.calendarLink || task.calendarEventId);
    return;
  }

  setStatus("Adding task to Calendar...");
  try {
    const startDate = new Date(task.dueAtIso);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
    const data = await fetchWithToken(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        body: JSON.stringify({
          summary: `Task: ${task.subject}`,
          description: `From Gmail message: ${task.messageId}\n\n${task.snippet || ""}`,
          start: { dateTime: startDate.toISOString() },
          end: { dateTime: endDate.toISOString() }
        })
      }
    );

    const updatedTasks = tasks.map((item) =>
      item.id === taskId
        ? {
            ...item,
            calendarEventId: data.id || "",
            calendarLink: data.htmlLink || ""
          }
        : item
    );
    await saveTasks(updatedTasks);
    setStatus("Task added to Calendar");
    setResult(data.htmlLink || data.id || "Event created");
  } catch (err) {
    setStatus("Add to Calendar failed");
    setResult(String(err.message || err));
  }
}

async function clearTasks() {
  await saveTasks([]);
  setStatus("Tasks cleared");
  setResult("");
}

async function markTaskDone(taskId) {
  const updated = tasks.map((task) =>
    task.id === taskId ? { ...task, done: true } : task
  );
  await saveTasks(updated);
  setStatus("Task marked as done");
}

function buildSummaryPrompt(messages) {
  const content = messages
    .map(
      (m, i) =>
        `Email ${i + 1}\nFrom: ${m.from}\nDate: ${m.date}\nSubject: ${m.subject}\nBody:\n${m.body}\n---`
    )
    .join("\n");
  return [
    "You are an email assistant.",
    "Summarize the following emails.",
    "Return ENGLISH only.",
    "Output strictly 1-2 sentences total.",
    "Be clear and concise.",
    "Must include: (a) the most important deadline/date, and (b) the top required action(s).",
    "If no clear deadline exists, explicitly say: No clear deadline.",
    "Do not use bullets, headings, or extra formatting.",
    "",
    content
  ].join("\n");
}

function resolveSummaryDays() {
  const selected = summaryRangeSelect?.value || "14";
  if (selected === "custom") {
    const custom = Number(customDaysInput?.value || "");
    if (!Number.isFinite(custom) || custom < 1 || custom > 365) {
      throw new Error("Custom days must be a number between 1 and 365.");
    }
    return Math.floor(custom);
  }
  const days = Number(selected);
  if (!Number.isFinite(days) || days < 1) {
    return 14;
  }
  return Math.floor(days);
}

async function listGeminiModels(apiKey) {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
  );
  if (!resp.ok) {
    throw new Error(`ListModels HTTP ${resp.status}: ${await resp.text()}`);
  }
  const data = await resp.json();
  return data.models || [];
}

function pickCandidateModels(models) {
  const supported = models.filter((m) =>
    Array.isArray(m.supportedGenerationMethods) &&
    m.supportedGenerationMethods.includes("generateContent")
  );
  const ranked = supported.sort((a, b) => {
    const aFlash = a.name.includes("flash") ? 1 : 0;
    const bFlash = b.name.includes("flash") ? 1 : 0;
    return bFlash - aFlash;
  });
  return ranked.map((m) => m.name);
}

async function callGeminiWithFallback(apiKey, prompt) {
  let candidates = [];
  try {
    const models = await listGeminiModels(apiKey);
    candidates = pickCandidateModels(models);
  } catch {
    candidates = [];
  }

  if (!candidates.length) {
    candidates = [
      "models/gemini-2.0-flash",
      "models/gemini-2.0-flash-lite",
      "models/gemini-1.5-flash"
    ];
  }

  let lastError = "";
  for (const modelName of candidates) {
    const cleanName = modelName.replace(/^models\//, "");
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${cleanName}:generateContent?key=${encodeURIComponent(
        apiKey
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 120
          }
        })
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      lastError = `Model ${cleanName} -> HTTP ${resp.status}: ${text}`;
      continue;
    }

    const data = await resp.json();
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n") || "";
    if (text.trim()) {
      return { model: cleanName, text };
    }
    lastError = `Model ${cleanName} returned empty response.`;
  }

  throw new Error(lastError || "Gemini request failed on all candidate models.");
}

async function summarizeEmailsWithGemini() {
  setStatus("Summarizing emails with Gemini...");
  setResult("");
  try {
    const apiKey = (geminiKeyInput.value || "").trim() || (await readStorage(GEMINI_KEY_STORAGE));
    if (!apiKey) {
      throw new Error("Please paste Gemini API key and click Save Key first.");
    }

    const days = resolveSummaryDays();
    const query = `newer_than:${days}d`;
    const list = await fetchWithToken(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8&q=${encodeURIComponent(query)}`
    );
    const ids = (list.messages || []).map((m) => m.id);
    if (!ids.length) {
      setStatus("No recent emails to summarize");
      return;
    }

    const details = await Promise.all(ids.map((id) => fetchMessageForSummary(id)));
    const emails = details.map((m) => {
      const headers = m.payload?.headers || [];
      const bodyText = extractPlainTextFromPayload(m.payload) || m.snippet || "";
      return {
        from: getHeaderValue(headers, "From"),
        date: getHeaderValue(headers, "Date"),
        subject: getHeaderValue(headers, "Subject") || "(No Subject)",
        body: bodyText.slice(0, 1200)
      };
    });

    const prompt = buildSummaryPrompt(emails);
    const output = await callGeminiWithFallback(apiKey, prompt);
    setStatus(`Gemini summary ready (${output.model}, ${days}d)`);
    setResult(output.text);
  } catch (err) {
    setStatus("Gemini summary failed");
    setResult(String(err.message || err));
  }
}

loginBtn.addEventListener("click", connectGoogle);
logoutBtn.addEventListener("click", logoutGoogle);
extractTasksBtn.addEventListener("click", extractTasks);
clearTasksBtn.addEventListener("click", clearTasks);
saveGeminiKeyBtn.addEventListener("click", saveGeminiKey);
summarizeEmailsBtn.addEventListener("click", summarizeEmailsWithGemini);
summaryRangeSelect.addEventListener("change", renderTasks);
if (customDaysInput) {
  customDaysInput.addEventListener("input", renderTasks);
}
if (highRiskOnlyToggle) {
  highRiskOnlyToggle.addEventListener("change", renderTasks);
}
tasksEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const taskId = target.getAttribute("data-add-calendar");
  if (taskId) {
    addTaskToCalendar(taskId);
    return;
  }
  const doneId = target.getAttribute("data-mark-done");
  if (doneId) {
    markTaskDone(doneId);
  }
});

setStatus("Ready");
loadTasks();
loadGeminiKey();
