import { allKnownEntries, getEntriesForSettings } from './kanji.js';

const rooms = new Map();
const playerRooms = new Map();

const defaultSettings = {
  mode: 'grade',
  grade: 'grade1',
  customKanjiInput: '\u68ee, \u6797, \u5ddd, \u5c71, \u706b, \u6c34',
  promptMode: 'random',
  roundLimit: 6,
  turnSeconds: 60,
  rescueEnabled: true,
  nextDrawerRule: 'winner'
};

function code() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 5; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return rooms.has(out) ? code() : out;
}

function shuffle(items) { return [...items].sort(() => Math.random() - 0.5); }
function pick(items) { return items[Math.floor(Math.random() * items.length)]; }

function choiceCount(player, room) {
  if (!room.settings.rescueEnabled) return 4;
  if (player.roundsWithoutCorrect >= 3) return 2;
  if (player.score === 0) return 3;
  return 4;
}

function choiceText(entry, promptType) {
  const values = promptType === 'reading' ? entry.reading : entry.meaning;
  return values?.[0] ?? entry.kanji;
}

function choicesFor(player, entry, room, promptType, correctChoice) {
  const needed = choiceCount(player, room);
  const knownEntries = [...room.entries, ...allKnownEntries()];
  for (const kanji of entry.distractors ?? []) {
    const match = room.entries.find((candidate) => candidate.kanji === kanji);
    if (match) knownEntries.push(match);
  }
  const pool = Array.from(new Set(
    knownEntries
      .filter((candidate) => candidate.kanji !== entry.kanji)
      .map((candidate) => choiceText(candidate, promptType))
      .filter((choice) => choice && choice !== correctChoice)
  ));
  return shuffle([correctChoice, ...shuffle(pool).slice(0, Math.max(0, needed - 1))]);
}

function makeView(room, socketId) {
  const you = room.players.find((p) => p.id === socketId);
  const isDrawer = room.turn?.drawerId === socketId;
  const hintAvailable = room.turn ? room.turn.secondsLeft <= Math.max(0, room.settings.turnSeconds - 10) : false;
  const turn = room.turn ? {
    round: room.turn.round,
    drawerId: room.turn.drawerId,
    drawerName: room.players.find((p) => p.id === room.turn?.drawerId)?.name ?? 'Drawer',
    promptType: room.turn.promptType,
    prompt: isDrawer ? room.turn.prompt : undefined,
    answer: room.phase === 'turn-reveal' || room.phase === 'results' || (isDrawer && hintAvailable) ? room.turn.answer : undefined,
    correctChoice: room.phase === 'turn-reveal' || room.phase === 'results' ? room.turn.correctChoice : undefined,
    statusMessage: room.turn.statusMessage,
    choices: !isDrawer && you ? room.turn.choicesByPlayer[socketId] : undefined,
    secondsLeft: room.turn.secondsLeft
  } : undefined;

  return {
    roomCode: room.roomCode,
    phase: room.phase,
    players: room.players.map((p) => ({ ...p })),
    settings: room.settings,
    currentTurn: turn,
    you,
    isDrawer: Boolean(isDrawer),
    canStart: room.players.length >= 2 && getEntriesForSettings(room.settings).length > 0,
    kanjiCount: getEntriesForSettings(room.settings).length
  };
}

function emitRoom(io, room) {
  for (const player of room.players) io.to(player.id).emit('game:state', makeView(room, player.id));
}

function clearTimer(room) {
  if (room.turn?.timer) clearInterval(room.turn.timer);
}

function startTurn(io, room, drawerId) {
  clearTimer(room);
  room.entries = getEntriesForSettings(room.settings);
  if (room.entries.length === 0 || room.players.length === 0) return;
  if (drawerId) room.drawerIndex = Math.max(0, room.players.findIndex((p) => p.id === drawerId));
  const drawer = room.players[room.drawerIndex % room.players.length];
  const entry = pick(room.entries);
  const allowed = entry.promptTypes?.length ? entry.promptTypes : ['reading', 'meaning'];
  const promptType = room.settings.promptMode === 'random' ? pick(allowed) : room.settings.promptMode;
  const prompt = promptType === 'reading' ? pick(entry.reading) : pick(entry.meaning);
  const correctChoice = prompt;
  const nextRound = room.turn ? room.turn.round + 1 : 1;

  room.phase = 'playing';
  room.turn = { round: nextRound, drawerId: drawer.id, entry, promptType, prompt, correctChoice, answer: entry.kanji, answered: new Set(), statusMessage: 'The drawer is writing the kanji.', secondsLeft: room.settings.turnSeconds, choicesByPlayer: {} };
  for (const player of room.players) if (player.id !== drawer.id) room.turn.choicesByPlayer[player.id] = choicesFor(player, entry, room, promptType, correctChoice);

  io.to(room.roomCode).emit('canvas:clear');
  room.turn.timer = setInterval(() => {
    if (!room.turn) return;
    room.turn.secondsLeft -= 1;
    if (room.turn.secondsLeft <= 0) finishTurn(io, room);
    else emitRoom(io, room);
  }, 1000);
  emitRoom(io, room);
}

function nextDrawer(room, winnerId) {
  if (room.settings.nextDrawerRule === 'winner' && winnerId && winnerId !== room.lastDrawerId) return winnerId;
  room.drawerIndex = (room.drawerIndex + 1) % Math.max(1, room.players.length);
  return room.players[room.drawerIndex]?.id;
}

function finishTurn(io, room, winnerId) {
  if (!room.turn || room.phase !== 'playing') return;
  clearTimer(room);
  const drawer = room.players.find((p) => p.id === room.turn?.drawerId);
  const winner = winnerId ? room.players.find((p) => p.id === winnerId) : undefined;

  if (winner && drawer) {
    winner.score += 1;
    winner.correctCount += 1;
    winner.roundsWithoutCorrect = 0;
    drawer.score += 1;
    room.turn.statusMessage = winner.name + ' answered correctly!';
    room.turn.firstCorrectId = winner.id;
  } else {
    room.turn.statusMessage = 'Time is up! The answer was ' + room.turn.answer + '.';
  }

  for (const player of room.players) if (!winner || player.id !== winner.id) player.roundsWithoutCorrect += 1;
  room.phase = 'turn-reveal';
  room.lastDrawerId = drawer?.id;
  emitRoom(io, room);

  setTimeout(() => {
    if (room.turn && room.turn.round >= room.settings.roundLimit) {
      room.phase = 'results';
      emitRoom(io, room);
      return;
    }
    startTurn(io, room, nextDrawer(room, winner?.id));
  }, 3000);
}

export function registerGameHandlers(io, socket) {
  socket.on('room:create', ({ name }) => {
    const roomCode = code();
    const player = { id: socket.id, name: name?.trim() || 'Player', isHost: true, connected: true, score: 0, correctCount: 0, wrongCount: 0, roundsWithoutCorrect: 0 };
    const room = { roomCode, phase: 'lobby', players: [player], settings: { ...defaultSettings }, hostId: socket.id, drawerIndex: 0, entries: [] };
    rooms.set(roomCode, room);
    playerRooms.set(socket.id, roomCode);
    socket.join(roomCode);
    emitRoom(io, room);
  });

  socket.on('room:join', ({ name, roomCode }) => {
    const room = rooms.get(roomCode?.trim().toUpperCase());
    if (!room) return socket.emit('app:error', 'Room not found.');
    if (room.phase !== 'lobby') return socket.emit('app:error', 'This game has already started. Please join the next round.');
    const player = { id: socket.id, name: name?.trim() || 'Player', isHost: false, connected: true, score: 0, correctCount: 0, wrongCount: 0, roundsWithoutCorrect: 0 };
    room.players.push(player);
    playerRooms.set(socket.id, room.roomCode);
    socket.join(room.roomCode);
    emitRoom(io, room);
  });

  socket.on('settings:update', (settings) => {
    const room = rooms.get(playerRooms.get(socket.id) ?? '');
    if (!room || room.hostId !== socket.id || room.phase !== 'lobby') return;
    room.settings = { ...room.settings, ...settings };
    if (room.settings.mode === 'review') {
      room.settings.turnSeconds = 45;
      room.settings.roundLimit = Math.min(Math.max(room.settings.roundLimit, 1), 2);
      room.settings.rescueEnabled = true;
    }
    emitRoom(io, room);
  });

  socket.on('game:start', () => {
    const room = rooms.get(playerRooms.get(socket.id) ?? '');
    if (!room || room.hostId !== socket.id) return;
    room.entries = getEntriesForSettings(room.settings);
    if (room.players.length < 2 || room.entries.length === 0) return emitRoom(io, room);
    for (const player of room.players) Object.assign(player, { score: 0, correctCount: 0, wrongCount: 0, roundsWithoutCorrect: 0 });
    room.drawerIndex = 0;
    room.turn = undefined;
    startTurn(io, room);
  });

  socket.on('draw:stroke', (payload) => {
    const room = rooms.get(playerRooms.get(socket.id) ?? '');
    if (!room || room.turn?.drawerId !== socket.id || room.phase !== 'playing') return;
    socket.to(room.roomCode).emit('draw:stroke', payload);
  });

  socket.on('canvas:clear', () => {
    const room = rooms.get(playerRooms.get(socket.id) ?? '');
    if (!room || room.turn?.drawerId !== socket.id) return;
    io.to(room.roomCode).emit('canvas:clear');
  });

  socket.on('answer:submit', ({ choice }) => {
    const room = rooms.get(playerRooms.get(socket.id) ?? '');
    if (!room || !room.turn || room.phase !== 'playing' || room.turn.drawerId === socket.id) return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player || room.turn.firstCorrectId) return;
    room.turn.answered.add(socket.id);
    if (choice === room.turn.correctChoice) finishTurn(io, room, socket.id);
    else {
      player.wrongCount += 1;
      room.turn.statusMessage = player.name + ', try again!';
      emitRoom(io, room);
    }
  });

  socket.on('game:restart', () => {
    const room = rooms.get(playerRooms.get(socket.id) ?? '');
    if (!room || room.hostId !== socket.id) return;
    clearTimer(room);
    room.phase = 'lobby';
    room.turn = undefined;
    emitRoom(io, room);
  });

  socket.on('disconnect', () => {
    const room = rooms.get(playerRooms.get(socket.id) ?? '');
    if (!room) return;
    const player = room.players.find((p) => p.id === socket.id);
    if (player) player.connected = false;
    emitRoom(io, room);
  });
}
