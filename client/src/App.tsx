import { useEffect, useMemo, useState } from 'react';
import type { GameSettings, GradeKey, RoomView } from '@shared/types';
import DrawingCanvas from './DrawingCanvas';
import { socket } from './socket';

const grades: Array<{ value: GradeKey; label: string }> = [
  { value: 'grade1', label: 'Grade 1' },
  { value: 'grade2', label: 'Grade 2' },
  { value: 'grade3', label: 'Grade 3' },
  { value: 'grade4', label: 'Grade 4' },
  { value: 'grade5', label: 'Grade 5' },
  { value: 'grade6', label: 'Grade 6' },
  { value: 'juniorHigh', label: 'Junior High and above' },
  { value: 'advanced', label: 'AP Japanese / Advanced Learners' }
];

export default function App() {
  const [name, setName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [view, setView] = useState<RoomView | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    socket.on('game:state', setView);
    socket.on('app:error', setError);
    return () => {
      socket.off('game:state', setView);
      socket.off('app:error', setError);
    };
  }, []);

  const sortedPlayers = useMemo(() => [...(view?.players ?? [])].sort((a, b) => b.score - a.score), [view?.players]);
  const updateSettings = (patch: Partial<GameSettings>) => socket.emit('settings:update', patch);

  if (!view) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-yuzu/50 via-white to-sora/40 p-4 text-sumi">
        <section className="mx-auto flex min-h-screen max-w-5xl items-center justify-center">
          <div className="grid w-full gap-6 rounded-[2rem] bg-white/90 p-6 shadow-soft md:grid-cols-[1.1fr_0.9fr] md:p-10">
            <div className="flex flex-col justify-center">
              <p className="text-lg font-black text-sakura">Real-time kanji learning battle</p>
              <h1 className="mt-3 text-5xl font-black leading-tight md:text-7xl">Kanji Draw Battle</h1>
              <p className="mt-5 text-lg font-bold leading-8 text-slate-600">One player sees a reading or English meaning, writes the matching kanji, and everyone else chooses the correct reading or meaning.</p>
            </div>
            <div className="rounded-[1.5rem] bg-sora/20 p-5">
              <label className="label">Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Example: Aoi" />
              <button className="primary-button mt-4 w-full" onClick={() => socket.emit('room:create', { name })}>Create Room</button>
              <div className="my-5 h-px bg-slate-200" />
              <label className="label">Room Code</label>
              <input className="input uppercase" value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())} placeholder="ABCDE" />
              <button className="secondary-button mt-4 w-full" onClick={() => socket.emit('room:join', { name, roomCode: roomCodeInput })}>Join Room</button>
              {error && <p className="mt-4 rounded-xl bg-red-100 p-3 font-bold text-red-700">{error}</p>}
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (view.phase === 'results') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-yuzu/40 via-white to-sakura/20 p-4 text-sumi">
        <section className="mx-auto max-w-4xl py-10">
          <h1 className="text-center text-5xl font-black">Final Results</h1>
          <div className="mt-8 grid gap-3">
            {sortedPlayers.map((p, index) => (
              <div key={p.id} className="flex items-center justify-between rounded-3xl bg-white p-5 shadow-soft">
                <div className="text-2xl font-black">#{index + 1} {p.name}</div>
                <div className="text-xl font-black text-sakura">{p.score} pts / {p.correctCount} correct</div>
              </div>
            ))}
          </div>
          {view.you?.isHost && <button className="primary-button mx-auto mt-8 block" onClick={() => socket.emit('game:restart')}>Back to Lobby</button>}
        </section>
      </main>
    );
  }

  if (view.phase === 'lobby') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-sora/30 via-white to-yuzu/40 p-4 text-sumi">
        <section className="mx-auto grid max-w-6xl gap-5 py-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="panel">
            <h1 className="text-4xl font-black">Lobby</h1>
            <p className="mt-3 text-lg font-bold text-slate-600">Room Code</p>
            <div className="mt-2 rounded-3xl bg-sumi p-5 text-center text-5xl font-black tracking-[0.2em] text-white">{view.roomCode}</div>
            <h2 className="mt-6 text-2xl font-black">Players</h2>
            <div className="mt-3 grid gap-2">{view.players.map((p) => <div key={p.id} className="rounded-2xl bg-yuzu/30 px-4 py-3 font-black">{p.name}{p.isHost ? ' (Host)' : ''}</div>)}</div>
          </div>

          <div className="panel">
            <h2 className="text-3xl font-black">Game Settings</h2>
            {!view.you?.isHost && <p className="mt-3 rounded-2xl bg-sora/20 p-3 font-bold">The host is choosing the settings.</p>}
            <fieldset disabled={!view.you?.isHost} className="mt-5 grid gap-4">
              <label className="label">Question Mode</label>
              <select className="input" value={view.settings.mode} onChange={(e) => updateSettings({ mode: e.target.value as GameSettings['mode'] })}>
                <option value="grade">Grade Kanji Mode</option>
                <option value="custom">Teacher Custom Kanji Mode</option>
                <option value="review">Today Review Mode</option>
              </select>
              {view.settings.mode === 'grade' && <><label className="label">Grade</label><select className="input" value={view.settings.grade} onChange={(e) => updateSettings({ grade: e.target.value as GradeKey })}>{grades.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</select></>}
              {view.settings.mode !== 'grade' && <><label className="label">Kanji for this game</label><textarea className="input min-h-28" value={view.settings.customKanjiInput} onChange={(e) => updateSettings({ customKanjiInput: e.target.value })} placeholder={'\u68ee, \u6797, \u5ddd, \u5c71, \u706b, \u6c34'} /></>}
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="label">Prompt Type</label><select className="input" value={view.settings.promptMode} onChange={(e) => updateSettings({ promptMode: e.target.value as GameSettings['promptMode'] })}><option value="random">Random reading or meaning</option><option value="reading">Reading only</option><option value="meaning">Meaning only</option></select></div>
                <div><label className="label">Next Drawer</label><select className="input" value={view.settings.nextDrawerRule} onChange={(e) => updateSettings({ nextDrawerRule: e.target.value as GameSettings['nextDrawerRule'] })}><option value="winner">Winner draws next</option><option value="order">Take turns in order</option></select></div>
                <div><label className="label">Rounds</label><input className="input" type="number" min="1" max="20" value={view.settings.roundLimit} onChange={(e) => updateSettings({ roundLimit: Number(e.target.value) })} /></div>
                <div><label className="label">Time Limit (seconds)</label><input className="input" type="number" min="15" max="180" value={view.settings.turnSeconds} onChange={(e) => updateSettings({ turnSeconds: Number(e.target.value) })} /></div>
              </div>
              <label className="flex items-center gap-3 rounded-2xl bg-matcha/10 p-4 text-lg font-black"><input type="checkbox" checked={view.settings.rescueEnabled} onChange={(e) => updateSettings({ rescueEnabled: e.target.checked })} />Rescue rule ON</label>
            </fieldset>
            <p className="mt-4 font-bold text-slate-600">Available kanji: {view.kanjiCount}</p>
            {view.you?.isHost && <button className="primary-button mt-5 w-full" disabled={!view.canStart} onClick={() => socket.emit('game:start')}>{view.canStart ? 'Start Game' : 'Need 2+ players and kanji'}</button>}
          </div>
        </section>
      </main>
    );
  }

  const answerKind = view.currentTurn?.promptType === 'reading' ? 'reading' : 'English meaning';
  const hintCountdown = Math.max(0, (view.settings.turnSeconds - 10) - (view.currentTurn?.secondsLeft ?? 0));

  return (
    <main className="min-h-screen bg-gradient-to-br from-sora/25 via-white to-yuzu/30 p-3 text-sumi">
      <section className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1fr_330px]">
        <div>
          <div className="mb-3 grid gap-3 rounded-[1.5rem] bg-white p-4 shadow-soft md:grid-cols-4">
            <div><p className="meta">Round</p><p className="status-text">{view.currentTurn?.round} / {view.settings.roundLimit}</p></div>
            <div><p className="meta">Time Left</p><p className="status-text text-sakura">{view.currentTurn?.secondsLeft}s</p></div>
            <div><p className="meta">Drawer</p><p className="status-text">{view.currentTurn?.drawerName}</p></div>
            <div><p className="meta">Status</p><p className="status-text text-matcha">{view.currentTurn?.statusMessage}</p></div>
          </div>

          {view.isDrawer && <div className="mb-3 rounded-[1.5rem] bg-yuzu/40 p-4 text-center">
            <p className="text-lg font-black">Prompt: {view.currentTurn?.prompt}</p>
            <p className="font-bold">Write the kanji that matches this {answerKind}.</p>
            {view.currentTurn?.answer
              ? <p className="mt-2 rounded-2xl bg-white/80 p-3 text-2xl font-black text-sakura">10-second hint: {view.currentTurn.answer}</p>
              : <p className="mt-2 font-bold text-slate-600">The kanji hint appears {hintCountdown > 0 ? `in ${hintCountdown}s` : 'soon'}.</p>}
          </div>}

          {!view.isDrawer && <div className="mb-3 rounded-[1.5rem] bg-sora/20 p-4 text-center text-lg font-black">Look at the handwritten kanji and choose the correct {answerKind}.</div>}
          <DrawingCanvas canDraw={view.isDrawer} phase={view.phase} />
          {!view.isDrawer && view.currentTurn?.choices && <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{view.currentTurn.choices.map((choice, index) => <button key={choice} className="choice-button" onClick={() => socket.emit('answer:submit', { choice })}>{String.fromCharCode(65 + index)}. {choice}</button>)}</div>}
          {view.currentTurn?.answer && !view.isDrawer && view.phase === 'turn-reveal' && <div className="mt-4 rounded-3xl bg-white p-5 text-center text-3xl font-black shadow-soft">Answer: {view.currentTurn.answer}<span className="block text-xl text-slate-600">{answerKind}: {view.currentTurn.correctChoice}</span></div>}
        </div>
        <aside className="panel h-fit">
          <h2 className="text-2xl font-black">Score</h2>
          <div className="mt-4 grid gap-3">{view.players.map((p) => <div key={p.id} className="rounded-2xl bg-slate-50 p-3"><div className="flex justify-between font-black"><span>{p.name}</span><span>{p.score} pts</span></div><p className="mt-1 text-sm font-bold text-slate-500">Correct {p.correctCount} / Wrong {p.wrongCount} / Help {p.roundsWithoutCorrect >= 3 ? '2 choices' : p.score === 0 ? '3 choices' : 'normal'}</p></div>)}</div>
        </aside>
      </section>
    </main>
  );
}
