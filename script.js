const STORAGE_KEY = "countdown-manager-data-v1";
const COLORS = ["#2563eb", "#16a34a", "#7c3aed", "#ea580c", "#db2777"];

const eventList = document.getElementById("eventList");
const emptyState = document.getElementById("emptyState");
const emptyTitle = document.getElementById("emptyTitle");
const emptyText = document.getElementById("emptyText");
const nearestCountdown = document.getElementById("nearestCountdown");
const nearestName = document.getElementById("nearestName");
const activeCount = document.getElementById("activeCount");
const completedCount = document.getElementById("completedCount");
const statusMessage = document.getElementById("statusMessage");
const dialog = document.getElementById("eventDialog");
const eventForm = document.getElementById("eventForm");
const eventId = document.getElementById("eventId");
const eventName = document.getElementById("eventName");
const eventDate = document.getElementById("eventDate");
const eventTime = document.getElementById("eventTime");
const eventMemo = document.getElementById("eventMemo");
const dialogTitle = document.getElementById("dialogTitle");
const importInput = document.getElementById("importInput");
const filterButtons = document.querySelectorAll(".filter-button");

let events = loadEvents();
let currentFilter = "active";
let statusTimer;
let ticker;

function loadEvents() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function eventTimestamp(event) {
  return new Date(`${event.date}T${event.time}:00`).getTime();
}

function isCompleted(event) {
  return eventTimestamp(event) <= Date.now();
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatRemaining(milliseconds) {
  if (milliseconds <= 0) return "終了";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor(totalSeconds % 86400 / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}日 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function formatDateTime(event) {
  const date = new Date(`${event.date}T${event.time}:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}） ${event.time}`;
}

function showStatus(message, error = false) {
  clearTimeout(statusTimer);
  statusMessage.textContent = message;
  statusMessage.style.color = error ? "#dc2626" : "#15803d";
  statusTimer = setTimeout(() => statusMessage.textContent = "", 3500);
}

function getFilteredEvents() {
  return events
    .filter(event => currentFilter === "all" || (currentFilter === "completed" ? isCompleted(event) : !isCompleted(event)))
    .sort((a, b) => eventTimestamp(a) - eventTimestamp(b));
}

function renderSummary() {
  const active = events.filter(event => !isCompleted(event)).sort((a, b) => eventTimestamp(a) - eventTimestamp(b));
  const completed = events.length - active.length;
  activeCount.textContent = `${active.length}件`;
  completedCount.textContent = `${completed}件`;
  if (active.length) {
    nearestCountdown.textContent = formatRemaining(eventTimestamp(active[0]) - Date.now());
    nearestName.textContent = active[0].name;
  } else {
    nearestCountdown.textContent = "予定なし";
    nearestName.textContent = "予定を追加しましょう";
  }
}

function createEventCard(event) {
  const completed = isCompleted(event);
  const card = document.createElement("article");
  card.className = `event-card${completed ? " completed" : ""}`;
  card.style.setProperty("--event-color", event.color);

  const content = document.createElement("div");
  const heading = document.createElement("div");
  heading.className = "event-title-row";
  const title = document.createElement("h3");
  title.textContent = event.name;
  const chip = document.createElement("span");
  chip.className = "status-chip";
  chip.textContent = completed ? "終了済み" : "予定中";
  heading.append(title, chip);

  const date = document.createElement("p");
  date.className = "event-date";
  date.textContent = formatDateTime(event);
  content.append(heading, date);

  if (event.memo) {
    const memo = document.createElement("p");
    memo.className = "event-memo";
    memo.textContent = event.memo;
    content.append(memo);
  }

  const side = document.createElement("div");
  const countdown = document.createElement("div");
  countdown.className = "countdown-value";
  countdown.dataset.timestamp = String(eventTimestamp(event));
  countdown.textContent = formatRemaining(eventTimestamp(event) - Date.now());
  const sub = document.createElement("div");
  sub.className = "countdown-sub";
  sub.textContent = completed ? "予定日時を過ぎました" : "残り時間";
  const actions = document.createElement("div");
  actions.className = "event-actions";
  const edit = document.createElement("button");
  edit.className = "small-button";
  edit.type = "button";
  edit.textContent = "編集";
  edit.addEventListener("click", () => openDialog(event));
  const remove = document.createElement("button");
  remove.className = "small-button delete-button";
  remove.type = "button";
  remove.textContent = "削除";
  remove.addEventListener("click", () => deleteEvent(event.id));
  actions.append(edit, remove);
  side.append(countdown, sub, actions);
  card.append(content, side);
  return card;
}

function renderEvents() {
  const filtered = getFilteredEvents();
  eventList.replaceChildren(...filtered.map(createEventCard));
  emptyState.classList.toggle("hidden", filtered.length !== 0);
  if (!filtered.length) {
    emptyTitle.textContent = currentFilter === "completed" ? "終了済みの予定はありません" : currentFilter === "active" ? "予定を追加しましょう" : "登録された予定はありません";
    emptyText.textContent = currentFilter === "completed" ? "予定日時を過ぎた予定がここに表示されます。" : "テストや旅行など、楽しみな予定や大切な期限を登録できます。";
  }
}

function render() {
  renderSummary();
  renderEvents();
}

function refreshCountdowns() {
  document.querySelectorAll("[data-timestamp]").forEach(element => {
    element.textContent = formatRemaining(Number(element.dataset.timestamp) - Date.now());
  });
  renderSummary();
  if (events.some(event => Math.abs(eventTimestamp(event) - Date.now()) < 1500)) renderEvents();
}

function defaultDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function openDialog(event = null) {
  eventForm.reset();
  eventId.value = event?.id || "";
  eventName.value = event?.name || "";
  eventDate.value = event?.date || defaultDate();
  eventTime.value = event?.time || "09:00";
  eventMemo.value = event?.memo || "";
  dialogTitle.textContent = event ? "予定を編集" : "予定を追加";
  const color = event?.color || COLORS[0];
  const radio = eventForm.querySelector(`[name="eventColor"][value="${color}"]`);
  if (radio) radio.checked = true;
  dialog.showModal();
  setTimeout(() => eventName.focus(), 50);
}

function closeDialog() {
  dialog.close();
}

function saveEvent(eventObject) {
  eventObject.preventDefault();
  const name = eventName.value.trim();
  const date = eventDate.value;
  const time = eventTime.value;
  if (!name || !date || !time) return;
  const color = new FormData(eventForm).get("eventColor");
  const existing = events.find(event => event.id === eventId.value);
  const values = { name, date, time, memo: eventMemo.value.trim(), color };
  if (existing) Object.assign(existing, values);
  else events.push({ id: `event-${Date.now()}-${Math.random().toString(16).slice(2)}`, ...values, createdAt: new Date().toISOString() });
  saveEvents();
  closeDialog();
  render();
}

function deleteEvent(id) {
  const event = events.find(item => item.id === id);
  if (!event || !confirm(`「${event.name}」を削除しますか？`)) return;
  events = events.filter(item => item.id !== id);
  saveEvents();
  render();
}

function setFilter(filter) {
  currentFilter = filter;
  filterButtons.forEach(button => {
    const selected = button.dataset.filter === filter;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  renderEvents();
}

function exportData() {
  const payload = { version: 1, events, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `countdown-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showStatus("バックアップを書き出しました。");
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || !Array.isArray(parsed.events)) throw new Error("invalid");
    if (!confirm("現在の予定を、選択したバックアップで上書きしますか？")) return;
    events = parsed.events;
    saveEvents();
    render();
    showStatus("バックアップを読み込みました。");
  } catch {
    showStatus("このファイルは読み込めません。", true);
  } finally {
    importInput.value = "";
  }
}

function deleteCompleted() {
  const completed = events.filter(isCompleted);
  if (!completed.length) return showStatus("終了済みの予定はありません。", true);
  if (!confirm(`終了済みの予定${completed.length}件を削除しますか？`)) return;
  events = events.filter(event => !isCompleted(event));
  saveEvents();
  render();
  showStatus("終了済みの予定を削除しました。");
}

document.getElementById("openAddButton").addEventListener("click", () => openDialog());
document.getElementById("closeDialogButton").addEventListener("click", closeDialog);
document.getElementById("cancelButton").addEventListener("click", closeDialog);
document.getElementById("exportButton").addEventListener("click", exportData);
document.getElementById("deleteCompletedButton").addEventListener("click", deleteCompleted);
eventForm.addEventListener("submit", saveEvent);
importInput.addEventListener("change", importData);
filterButtons.forEach(button => button.addEventListener("click", () => setFilter(button.dataset.filter)));
dialog.addEventListener("click", event => { if (event.target === dialog) closeDialog(); });

render();
ticker = setInterval(refreshCountdowns, 1000);
