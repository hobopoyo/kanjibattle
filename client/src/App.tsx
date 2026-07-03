import { useEffect, useMemo, useState } from 'react';
import type { GameSettings, GradeKey, RoomView } from '@shared/types';
import DrawingCanvas from './DrawingCanvas';
import { socket } from './socket';

const grades: Array<{ value: GradeKey; label: string }> = [
  { value: 'grade1', label: '小学1年生' },
  { value: 'grade2', label: '小学2年生' },
  { value: 'grade3', label: '小学3年生' },
  { value: 'grade4', label: '小学4年生' },
  { value: 'grade5', label: '小学5年生' },
  { value: 'grade6', label: '小学6年生' },
  { value: 'juniorHigh', label: '中学生以上' },
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
              <p className="text-lg font-black text-sakura">漢字学習リアルタイムバトル</p>
              <h1 className="mt-3 text-5xl font-black leading-tight md:text-7xl">Kanji Draw Battle</h1>
              <p className="mt-5 text-lg font-bold leading-8 text-slate-600">読み方や意味を見て漢字を書き、みんなは読み方や英語の意味を選んで答える、教室向けの対戦型漢字ゲームです。</p>
            </div>
            <div className="rounded-[1.5rem] bg-sora/20 p-5">
              <label className="label">名前</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：あおい先生" />
              <button className="primary-button mt-4 w-full" onClick={() => socket.emit('room:create', { name })}>ルーム作成</button>
              <div className="my-5 h-px bg-slate-200" />
              <label className="label">ルームコード</label>
              <input className="input uppercase" value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())} placeholder="ABCDE" />
              <button className="secondary-button mt-4 w-full" onClick={() => socket.emit('room:join', { name, roomCode: roomCodeInput })}>ルーム参加</button>
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
          <h1 className="text-center text-5xl font-black">結果発表</h1>
          <div className="mt-8 grid gap-3">
            {sortedPlayers.map((p, index) => (
              <div key={p.id} className="flex items-center justify-between rounded-3xl bg-white p-5 shadow-soft">
                <div className="text-2xl font-black">{index + 1}位 {p.name}</div>
                <div className="text-xl font-black text-sakura">{p.score}点 / 正解 {p.correctCount}</div>
              </div>
            ))}
          </div>
          {view.you?.isHost && <button className="primary-button mx-auto mt-8 block" onClick={() => socket.emit('game:restart')}>ルームに戻る</button>}
        </section>
      </main>
    );
  }

  if (view.phase === 'lobby') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-sora/30 via-white to-yuzu/40 p-4 text-sumi">
        <section className="mx-auto grid max-w-6xl gap-5 py-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="panel">
            <h1 className="text-4xl font-black">待機ルーム</h1>
            <p className="mt-3 text-lg font-bold text-slate-600">ルームコード</p>
            <div className="mt-2 rounded-3xl bg-sumi p-5 text-center text-5xl font-black tracking-[0.2em] text-white">{view.roomCode}</div>
            <h2 className="mt-6 text-2xl font-black">参加者</h2>
            <div className="mt-3 grid gap-2">{view.players.map((p) => <div key={p.id} className="rounded-2xl bg-yuzu/30 px-4 py-3 font-black">{p.name}{p.isHost ? '（ホスト）' : ''}</div>)}</div>
          </div>

          <div className="panel">
            <h2 className="text-3xl font-black">ゲーム設定</h2>
            {!view.you?.isHost && <p className="mt-3 rounded-2xl bg-sora/20 p-3 font-bold">ホストが設定中です。</p>}
            <fieldset disabled={!view.you?.isHost} className="mt-5 grid gap-4">
              <label className="label">出題モード</label>
              <select className="input" value={view.settings.mode} onChange={(e) => updateSettings({ mode: e.target.value as GameSettings['mode'] })}>
                <option value="grade">学年別漢字モード</option>
                <option value="custom">教師指定漢字モード</option>
                <option value="review">今日の復習モード</option>
              </select>
              {view.settings.mode === 'grade' && <><label className="label">学年</label><select className="input" value={view.settings.grade} onChange={(e) => updateSettings({ grade: e.target.value as GradeKey })}>{grades.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</select></>}
              {view.settings.mode !== 'grade' && <><label className="label">今回使う漢字</label><textarea className="input min-h-28" value={view.settings.customKanjiInput} onChange={(e) => updateSettings({ customKanjiInput: e.target.value })} placeholder="森, 林, 川, 山, 火, 水" /></>}
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="label">お題</label><select className="input" value={view.settings.promptMode} onChange={(e) => updateSettings({ promptMode: e.target.value as GameSettings['promptMode'] })}><option value="random">読み方・意味をランダム</option><option value="reading">読み方だけ</option><option value="meaning">意味だけ</option></select></div>
                <div><label className="label">次のお題担当</label><select className="input" value={view.settings.nextDrawerRule} onChange={(e) => updateSettings({ nextDrawerRule: e.target.value as GameSettings['nextDrawerRule'] })}><option value="winner">勝者が次のお題</option><option value="order">順番制</option></select></div>
                <div><label className="label">ラウンド数</label><input className="input" type="number" min="1" max="20" value={view.settings.roundLimit} onChange={(e) => updateSettings({ roundLimit: Number(e.target.value) })} /></div>
                <div><label className="label">制限時間（秒）</label><input className="input" type="number" min="15" max="180" value={view.settings.turnSeconds} onChange={(e) => updateSettings({ turnSeconds: Number(e.target.value) })} /></div>
              </div>
              <label className="flex items-center gap-3 rounded-2xl bg-matcha/10 p-4 text-lg font-black"><input type="checkbox" checked={view.settings.rescueEnabled} onChange={(e) => updateSettings({ rescueEnabled: e.target.checked })} />救済ルール ON</label>
            </fieldset>
            <p className="mt-4 font-bold text-slate-600">出題可能な漢字：{view.kanjiCount}個</p>
            {view.you?.isHost && <button className="primary-button mt-5 w-full" disabled={!view.canStart} onClick={() => socket.emit('game:start')}>{view.canStart ? 'ゲーム開始' : '2人以上・漢字リスト必須'}</button>}
          </div>
        </section>
      </main>
    );
  }

  const answerKind = view.currentTurn?.promptType === 'reading' ? '読み方' : '英語の意味';
  const hintCountdown = Math.max(0, (view.settings.turnSeconds - 10) - (view.currentTurn?.secondsLeft ?? 0));

  return (
    <main className="min-h-screen bg-gradient-to-br from-sora/25 via-white to-yuzu/30 p-3 text-sumi">
      <section className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1fr_330px]">
        <div>
          <div className="mb-3 grid gap-3 rounded-[1.5rem] bg-white p-4 shadow-soft md:grid-cols-4">
            <div><p className="meta">ラウンド</p><p className="status-text">{view.currentTurn?.round} / {view.settings.roundLimit}</p></div>
            <div><p className="meta">残り時間</p><p className="status-text text-sakura">{view.currentTurn?.secondsLeft}秒</p></div>
            <div><p className="meta">お題担当</p><p className="status-text">{view.currentTurn?.drawerName}</p></div>
            <div><p className="meta">状況</p><p className="status-text text-matcha">{view.currentTurn?.statusMessage}</p></div>
          </div>

          {view.isDrawer && <div className="mb-3 rounded-[1.5rem] bg-yuzu/40 p-4 text-center">
            <p className="text-lg font-black">お題：{view.currentTurn?.prompt}</p>
            <p className="font-bold">この{answerKind}に合う漢字を書いてください。</p>
            {view.currentTurn?.answer
              ? <p className="mt-2 rounded-2xl bg-white/80 p-3 text-2xl font-black text-sakura">10秒ヒント：{view.currentTurn.answer}</p>
              : <p className="mt-2 font-bold text-slate-600">漢字ヒントは{hintCountdown > 0 ? `あと${hintCountdown}秒` : 'もうすぐ'}で表示されます。</p>}
          </div>}

          {!view.isDrawer && <div className="mb-3 rounded-[1.5rem] bg-sora/20 p-4 text-center text-lg font-black">手書き漢字を見て、正しい{answerKind}を選ぼう</div>}
          <DrawingCanvas canDraw={view.isDrawer} phase={view.phase} />
          {!view.isDrawer && view.currentTurn?.choices && <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{view.currentTurn.choices.map((choice, index) => <button key={choice} className="choice-button" onClick={() => socket.emit('answer:submit', { choice })}>{String.fromCharCode(65 + index)}. {choice}</button>)}</div>}
          {view.currentTurn?.answer && !view.isDrawer && view.phase === 'turn-reveal' && <div className="mt-4 rounded-3xl bg-white p-5 text-center text-3xl font-black shadow-soft">正解：{view.currentTurn.answer}<span className="block text-xl text-slate-600">{answerKind}：{view.currentTurn.correctChoice}</span></div>}
        </div>
        <aside className="panel h-fit">
          <h2 className="text-2xl font-black">スコア</h2>
          <div className="mt-4 grid gap-3">{view.players.map((p) => <div key={p.id} className="rounded-2xl bg-slate-50 p-3"><div className="flex justify-between font-black"><span>{p.name}</span><span>{p.score}点</span></div><p className="mt-1 text-sm font-bold text-slate-500">正解 {p.correctCount} / 不正解 {p.wrongCount} / 救済 {p.roundsWithoutCorrect >= 3 ? '二択' : p.score === 0 ? '三択' : '通常'}</p></div>)}</div>
        </aside>
      </section>
    </main>
  );
}
