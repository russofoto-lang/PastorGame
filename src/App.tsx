import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { 
  Brain, 
  History, 
  Timer, 
  Swords, 
  ChevronLeft, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  XCircle,
  Trophy,
  AlertCircle,
  Zap,
  Settings,
  Lock,
  User,
  Eye,
  Send
} from 'lucide-react';
import { geminiService, Question, TimelineEvent } from './services/gemini';

type GameMode = 'home' | 'genio' | 'duellos' | 'timeline' | 'ring' | 'chie';

interface Team {
  id: number;
  name: string;
  score: number;
  color: string;
}

// Socket instance
let socket: Socket;

export default function App() {
  const [mode, setMode] = useState<GameMode>('home');
  const [role, setRole] = useState<'regia' | 'pubblico' | 'display'>('pubblico');
  const [teams, setTeams] = useState<Team[]>([
    { id: 1, name: 'Team A', score: 0, color: 'bg-retro-pink' },
    { id: 2, name: 'Team B', score: 0, color: 'bg-retro-cyan' },
    { id: 3, name: 'Team C', score: 0, color: 'bg-retro-yellow' },
  ]);

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [showTeamModal, setShowTeamModal] = useState(false);

  const [isRegiaAuthenticated, setIsRegiaAuthenticated] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const handleRoleClick = (newRole: 'regia' | 'pubblico' | 'display') => {
    if (newRole === 'regia' && !isRegiaAuthenticated) {
      setShowPasswordModal(true);
    } else if (newRole === 'pubblico') {
      setShowTeamModal(true);
    } else {
      setRole(newRole);
    }
  };

  const verifyPassword = () => {
    if (passwordInput === '0000') {
      setIsRegiaAuthenticated(true);
      setRole('regia');
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  // Shared game data for sync
  const [sharedState, setSharedState] = useState<any>({
    currentIndex: 0,
    showAnswer: false,
    selectedOption: null,
    topic: '',
    questions: [],
    revealedItems: [],
    // ... other game specific sync data
  });

  useEffect(() => {
    socket = io('/', { transports: ['websocket', 'polling'] });

    socket.on('connect', () => console.log('✅ SOCKET CONNECTED TO SERVER:', socket.id));
    socket.on('disconnect', () => console.log('❌ SOCKET DISCONNECTED'));

    socket.on('stateUpdate', (state: any) => {
      if (state.mode) setMode(state.mode);
      if (state.teams) setTeams(state.teams);
      if (state.gameData) setSharedState(state.gameData);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const emitUpdate = useCallback((updates: any) => {
    if (role !== 'regia' && role !== 'pubblico') return;
    socket.emit('updateState', updates);
  }, [role]);

  const emitOptionSelected = useCallback((option: string) => {
    if (role !== 'pubblico' || selectedTeamId === null) return;
    socket.emit('updateState', {
      gameData: {
        ...sharedState,
        teamAnswers: {
          ...(sharedState.teamAnswers || {}),
          [selectedTeamId]: option
        }
      }
    });
  }, [role, selectedTeamId, sharedState]);

  const updateScore = (teamId: number, delta: number) => {
    const newTeams = teams.map(t => t.id === teamId ? { ...t, score: t.score + delta } : t);
    setTeams(newTeams);
    emitUpdate({ teams: newTeams });
  };

  const changeMode = (newMode: GameMode) => {
    if (role !== 'regia') return;
    setMode(newMode);
    emitUpdate({ mode: newMode, gameData: { ...sharedState, questions: [], topic: '', currentIndex: 0, showAnswer: false, selectedOption: null } });
  };

  return (
    <div className="min-h-screen text-white font-sans selection:bg-retro-pink/50 relative overflow-x-hidden">
      <div className="scanline" />
      <div className="grid-bg" />
      
      {/* Global Header / Role Switcher - Only on Home */}
      {mode === 'home' && (
        <div className="fixed top-0 left-0 w-full z-[100] p-4 flex justify-end pointer-events-none">
          <div className="pointer-events-auto flex gap-2">
            {(['regia', 'pubblico', 'display'] as const).map((r) => (
              <button 
                key={r}
                onClick={() => handleRoleClick(r)}
                className={`px-3 py-1.5 border font-pixel text-[8px] tracking-widest transition-all ${
                  role === r 
                    ? 'bg-retro-yellow text-black border-transparent shadow-[0_0_15px_rgba(255,255,0,0.3)]' 
                    : 'bg-black/60 backdrop-blur-md text-retro-yellow border-retro-yellow/30 hover:bg-retro-yellow/10'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Global Scoreboard - REMOVED from bottom to avoid overlap */}
      
      <AnimatePresence mode="wait">
        {mode === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="max-w-4xl mx-auto px-6 py-12 relative z-20"
          >
            <header className="mb-16 text-center">
              <motion.h1 
                className="text-6xl md:text-9xl font-retro mb-4 retro-title tracking-tighter"
                initial={{ y: -50 }}
                animate={{ y: 0 }}
              >
                Infotainment <span className="text-retro-yellow">Night</span>
              </motion.h1>
              <div className="flex flex-col items-center gap-4">
                <p className="text-retro-cyan font-pixel text-lg max-w-xl mx-auto uppercase tracking-[0.3em] bg-black/40 py-4 px-8 inline-block border border-retro-cyan/30 backdrop-blur-md">
                  The Ultimate Retro Quiz Experience
                </p>
              </div>
            </header>

            {role === 'regia' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <GameCard 
                  title="Sfida al Genio"
                  description="Metti in difficoltà l'esperto del gruppo con domande impossibili."
                  icon={<Brain className="w-8 h-8" />}
                  onClick={() => changeMode('genio')}
                  color="bg-retro-purple"
                />
                <GameCard 
                  title="Duellos"
                  description="Un concorrente alla volta. Indovina la parola nascosta prima che il tempo scada!"
                  icon={<Swords className="w-8 h-8" />}
                  onClick={() => changeMode('duellos')}
                  color="bg-retro-pink"
                />
                <GameCard 
                  title="Timeline"
                  description="Riordina 5 eventi storici dal più antico al più recente."
                  icon={<Timer className="w-8 h-8" />}
                  onClick={() => changeMode('timeline')}
                  color="bg-retro-cyan"
                />
                <GameCard 
                  title="Chi È?"
                  description="Indovina il personaggio famoso dalla foto sfocata che si rivela gradualmente."
                  icon={<User className="w-8 h-8" />}
                  onClick={() => changeMode('chie')}
                  color="bg-green-500"
                />
                <GameCard 
                  title="Il Ring"
                  description="Scontro 1 vs 1 a ritmo serrato su temi geografici e non solo."
                  icon={<Swords className="w-8 h-8" />}
                  onClick={() => changeMode('ring')}
                  color="bg-retro-yellow"
                />
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="retro-card p-16 text-center bg-black/40 backdrop-blur-xl border-retro-cyan/20 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-retro-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative z-10">
                  <div className="mb-12 relative">
                    <div className="w-32 h-32 bg-retro-cyan/10 rounded-full flex items-center justify-center mx-auto border border-retro-cyan/30 shadow-[0_0_50px_rgba(0,255,255,0.1)]">
                      <div className="w-16 h-16 bg-retro-cyan/20 rounded-full animate-ping absolute" />
                      <div className="w-4 h-4 bg-retro-cyan rounded-full shadow-[0_0_15px_rgba(0,255,255,1)]" />
                    </div>
                  </div>
                  
                  <h2 className="text-5xl font-retro uppercase mb-6 tracking-tight text-white">
                    {role === 'display' ? 'BENVENUTI' : 'In attesa della Regia'}
                  </h2>
                  
                  <div className="flex flex-col items-center gap-6">
                    <p className="font-pixel text-[10px] text-retro-cyan/60 tracking-[0.3em] uppercase max-w-xs leading-relaxed">
                      {role === 'display' ? 'Sullo schermo appariranno le sfide comandate dalla regia.' : 'Lo spettacolo inizierà a breve. Mettiti comodo e preparati alla sfida.'}
                    </p>
                    
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          animate={{ opacity: [0.2, 1, 0.2] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                          className="w-2 h-2 bg-retro-cyan rounded-full"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {mode !== 'home' && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col relative z-20"
          >
            <nav className="px-4 py-3 border-b-4 border-retro-cyan bg-black/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-50 gap-4">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => changeMode('home')}
                  className="flex items-center gap-2 text-retro-yellow hover:text-retro-cyan transition-colors uppercase font-pixel text-[10px] tracking-[0.2em]"
                >
                  <ChevronLeft className="w-4 h-4" /> Home
                </button>

                {/* Integrated Team Scores */}
                <div className="flex gap-3">
                  {teams.map(team => (
                    <div key={team.id} className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-retro-cyan/20 rounded-full">
                      <span className={`text-[8px] font-pixel uppercase ${team.color.replace('bg-', 'text-')}`}>{team.name[team.name.length-1]}</span>
                      <span className="text-lg font-retro text-white leading-none">{team.score}</span>
                      {role === 'regia' && (
                        <div className="flex gap-1 ml-1">
                          <button onClick={() => updateScore(team.id, -1)} className="w-4 h-4 bg-retro-pink text-black text-[10px] font-bold flex items-center justify-center rounded-sm hover:scale-110 transition-transform">-</button>
                          <button onClick={() => updateScore(team.id, 1)} className="w-4 h-4 bg-green-500 text-black text-[10px] font-bold flex items-center justify-center rounded-sm hover:scale-110 transition-transform">+</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden xl:block text-[10px] font-pixel text-retro-pink uppercase tracking-widest animate-pulse mr-4">
                  LIVE SESSION
                </div>
                
                {/* Role Switcher integrated in Nav */}
                <div className="flex gap-1 bg-black/40 p-1 border border-white/10 rounded-sm">
                  {(['regia', 'pubblico', 'display'] as const).map((r) => (
                    <button 
                      key={r}
                      onClick={() => handleRoleClick(r)}
                      className={`px-2 py-1 font-pixel text-[7px] tracking-tighter transition-all ${
                        role === r 
                          ? 'bg-retro-yellow text-black' 
                          : 'text-retro-yellow/50 hover:text-retro-yellow'
                      }`}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>
                {/* Indicatore squadra attiva */}
                {role === 'pubblico' && selectedTeamId !== null && (() => {
                  const myTeam = teams.find(t => t.id === selectedTeamId);
                  return myTeam ? (
                    <div className={`px-3 py-1.5 font-retro text-sm uppercase tracking-widest border-2 shadow-[0_0_10px_rgba(255,255,255,0.2)] ${
                      myTeam.color === 'bg-retro-pink' ? 'border-retro-pink text-retro-pink bg-retro-pink/20 shadow-[0_0_15px_rgba(255,0,255,0.4)]' :
                      myTeam.color === 'bg-retro-cyan' ? 'border-retro-cyan text-retro-cyan bg-retro-cyan/20 shadow-[0_0_15px_rgba(0,255,255,0.4)]' :
                      'border-retro-yellow text-retro-yellow bg-retro-yellow/20 shadow-[0_0_15px_rgba(255,255,0,0.4)]'
                    }`}>
                      👤 {myTeam.name}
                    </div>
                  ) : null;
                })()}
              </div>
            </nav>

            <main className={`flex-1 flex flex-col items-center justify-center p-6 ${role === 'display' ? 'aspect-video w-full max-w-[177.78vh] max-h-screen mx-auto overflow-hidden relative' : ''}`}>
              {mode === 'genio' && <SfidaGenio role={role} sharedState={sharedState} emitUpdate={emitUpdate} emitOptionSelected={emitOptionSelected} selectedTeamId={selectedTeamId} teams={teams} />}
              {mode === 'duellos' && <Duellos role={role} sharedState={sharedState} emitUpdate={emitUpdate} teams={teams} />}
              {mode === 'timeline' && <TimelineGame role={role} sharedState={sharedState} emitUpdate={emitUpdate} />}
              {mode === 'ring' && <IlRing role={role} sharedState={{...sharedState, allTeams: teams, ringTeams: teams.map((t: any) => t.id)}} emitUpdate={emitUpdate} />}
              {mode === 'chie' && <ChiE role={role} sharedState={sharedState} emitUpdate={emitUpdate} selectedTeamId={selectedTeamId} teams={teams} />}
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team Selection Modal */}
      <AnimatePresence>
        {showTeamModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-sm w-full bg-[#000044] border-4 border-retro-pink p-8 shadow-[0_0_50px_rgba(255,0,255,0.3)]"
            >
              <div className="text-center mb-8">
                <Trophy className="w-12 h-12 text-retro-yellow mx-auto mb-4" />
                <h3 className="text-2xl font-retro uppercase retro-title">Sei la tua squadra?</h3>
                <p className="text-[10px] font-pixel text-retro-cyan/60 mt-2 uppercase">Seleziona la tua squadra per partecipare</p>
              </div>
              <div className="flex flex-col gap-3">
                {teams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => {
                      setSelectedTeamId(team.id);
                      setRole('pubblico');
                      setShowTeamModal(false);
                    }}
                    className={`w-full py-4 border-2 font-retro text-xl uppercase tracking-wide transition-all hover:scale-105 ${
                      team.color === 'bg-retro-pink' ? 'border-retro-pink text-retro-pink hover:bg-retro-pink hover:text-black' :
                      team.color === 'bg-retro-cyan' ? 'border-retro-cyan text-retro-cyan hover:bg-retro-cyan hover:text-black' :
                      'border-retro-yellow text-retro-yellow hover:bg-retro-yellow hover:text-black'
                    }`}
                  >
                    {team.name}
                  </button>
                ))}
                <button
                  onClick={() => setShowTeamModal(false)}
                  className="mt-2 text-center text-white/40 font-pixel text-[9px] uppercase hover:text-white transition-colors"
                >
                  Annulla
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-sm w-full bg-[#000044] border-4 border-retro-cyan p-8 shadow-[0_0_50px_rgba(0,255,255,0.3)]"
            >
              <div className="text-center mb-8">
                <Lock className="w-12 h-12 text-retro-yellow mx-auto mb-4" />
                <h3 className="text-2xl font-retro uppercase retro-title">Accesso Riservato</h3>
                <p className="text-[10px] font-pixel text-retro-cyan/60 mt-2 uppercase">Inserisci il codice di sicurezza</p>
              </div>

              <div className="space-y-6">
                <input 
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                  placeholder="****"
                  autoFocus
                  className={`w-full bg-black/50 border-2 p-4 text-center text-3xl font-retro tracking-[0.5em] focus:outline-none transition-colors ${
                    passwordError ? 'border-retro-pink text-retro-pink' : 'border-retro-cyan text-white'
                  }`}
                />
                
                {passwordError && (
                  <p className="text-center text-retro-pink font-pixel text-[8px] uppercase animate-bounce">
                    Codice Errato! Riprova.
                  </p>
                )}

                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordInput('');
                      setPasswordError(false);
                    }}
                    className="flex-1 py-3 border-2 border-white/20 font-pixel text-[10px] uppercase hover:bg-white/10 transition-colors"
                  >
                    Annulla
                  </button>
                  <button 
                    onClick={verifyPassword}
                    className="flex-1 py-3 bg-retro-cyan text-black font-pixel text-[10px] uppercase font-bold hover:bg-white transition-colors"
                  >
                    Conferma
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GameCard({ title, description, icon, onClick, color }: any) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, rotate: -1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`retro-card p-6 text-left transition-all group relative overflow-hidden`}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-20 blur-3xl group-hover:opacity-40 transition-opacity`} />
      <div className="relative z-10">
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center mb-4 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.1)] text-white`}>
          {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
        </div>
        <h3 className="text-xl font-retro uppercase mb-1 tracking-tighter">{title}</h3>
        <p className="text-retro-cyan/80 font-pixel text-[8px] leading-tight uppercase tracking-widest">{description}</p>
      </div>
    </motion.button>
  );
}

// --- GAME 1: SFIDA AL GENIO ---
function SfidaGenio({ role, sharedState, emitUpdate, emitOptionSelected, selectedTeamId, teams }: { 
  role: 'regia' | 'pubblico' | 'display', 
  sharedState: any, 
  emitUpdate: (u: any) => void,
  emitOptionSelected: (option: string) => void,
  selectedTeamId: number | null,
  teams: Team[]
}) {
  const [localTopic, setLocalTopic] = useState('');
  const [loading, setLoading] = useState(false);

  const { topic, questions, currentIndex, showAnswer, teamAnswers = {}, score } = sharedState;

  // Risposta della propria squadra (per i giocatori)
  const myAnswer = selectedTeamId !== null ? teamAnswers[selectedTeamId] : null;
  // Per la regia: la prima risposta disponibile (compatibilità)
  const selectedOption = Object.values(teamAnswers)[0] as string | undefined;

  const startChallenge = async () => {
    if (!localTopic || role !== 'regia') return;
    setLoading(true);
    try {
      const q = await geminiService.generateGenioQuestions(localTopic);
      emitUpdate({ 
        gameData: { 
          ...sharedState, 
          questions: q, 
          topic: localTopic, 
          currentIndex: 0, 
          score: 0, 
          showAnswer: false, 
          teamAnswers: {}
        } 
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionClick = (option: string) => {
    if (showAnswer) return;
    if (role === 'pubblico') {
      emitOptionSelected(option);
    } else if (role === 'regia') {
      // Regia può selezionare per tutti (modalità demo/test)
      emitUpdate({ 
        gameData: { 
          ...sharedState, 
          teamAnswers: { ...teamAnswers, 0: option }
        } 
      });
    }
  };

  const revealAnswer = () => {
    if (role !== 'regia') return;
    const correctAnswer = questions[currentIndex].answer;
    const anyCorrect = Object.values(teamAnswers).includes(correctAnswer);
    emitUpdate({ 
      gameData: { 
        ...sharedState, 
        showAnswer: true,
        score: anyCorrect ? score + 1 : score
      } 
    });
  };

  const nextQuestion = () => {
    if (role !== 'regia') return;
    emitUpdate({ 
      gameData: { 
        ...sharedState, 
        currentIndex: currentIndex + 1,
        showAnswer: false,
        teamAnswers: {}
      } 
    });
  };

  if (loading) return <LoadingState text="Il Genio sta preparando le domande..." />;
  
  if (questions && questions.length > 0 && currentIndex < questions.length) {
    const currentQ = questions[currentIndex];
    const difficultyLabels = ["Facile", "Intermedia", "Sfidante", "Difficile", "Esperto"];

    return (
      <div className="max-w-2xl w-full">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-pixel text-retro-cyan uppercase tracking-widest">DOMANDA {currentIndex + 1}/{questions.length}</span>
              <span className={`text-[10px] px-2 py-0.5 font-pixel uppercase tracking-tighter border-2 ${
                currentIndex % 5 === 0 ? 'border-retro-cyan text-retro-cyan' :
                currentIndex % 5 === 4 ? 'border-retro-pink text-retro-pink' :
                'border-retro-yellow text-retro-yellow'
              }`}>
                {difficultyLabels[currentIndex % 5]}
              </span>
            </div>
            <h2 className="text-4xl font-retro uppercase tracking-tight retro-title">{topic}</h2>
          </div>
          <div className="text-right">
            <span className="text-xs font-pixel text-retro-pink uppercase tracking-widest">SCORE</span>
            <div className="text-3xl font-retro text-retro-yellow">{score}</div>
          </div>
        </div>

        <motion.div 
          key={currentIndex}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="retro-card p-12 mb-6 relative"
        >
          <p className="text-2xl font-mono leading-tight tracking-tight mb-6 uppercase">
            {currentQ.question}
          </p>

          <div className="grid grid-cols-1 gap-3">
            {currentQ.options?.map((option: string, idx: number) => {
              const isCorrect = option === currentQ.answer;
              // Squadre che hanno scelto questa opzione
              const teamsWhoChose = teams.filter(t => teamAnswers[t.id] === option);
              const iChooseThis = selectedTeamId !== null && teamAnswers[selectedTeamId] === option;
              const anyoneChose = teamsWhoChose.length > 0;
              
              let style = "bg-[#000066] border-retro-cyan text-white hover:border-retro-pink hover:bg-retro-pink/10";
              
              if (showAnswer) {
                if (isCorrect) style = "bg-retro-cyan text-black border-transparent shadow-[0_0_20px_rgba(0,255,255,0.4)]";
                else if (anyoneChose) style = "bg-retro-pink text-black border-transparent shadow-[0_0_20px_rgba(255,0,255,0.4)]";
                else style = "bg-zinc-900/50 border-white/5 opacity-50";
              } else if (iChooseThis) {
                style = "border-retro-yellow bg-retro-yellow/20";
              } else if (anyoneChose && role !== 'pubblico') {
                style = "border-retro-pink/60 bg-retro-pink/10";
              }

              return (
                <button
                  key={idx}
                  disabled={showAnswer || role === 'display'}
                  onClick={() => handleOptionClick(option)}
                  className={`p-4 border-2 text-left font-mono text-lg uppercase transition-all flex items-center justify-between ${style}`}
                >
                  <div className="flex items-center flex-1">
                    <span className="text-retro-yellow mr-4 font-pixel text-xs">{String.fromCharCode(65 + idx)}.</span>
                    <span className="tracking-tight">{option}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {/* Indicatori squadre che hanno risposto */}
                    {teamsWhoChose.map(team => (
                      <span 
                        key={team.id}
                        className={`text-[9px] font-pixel px-1.5 py-0.5 rounded-sm font-bold ${
                          showAnswer && isCorrect ? 'bg-black/20 text-black' :
                          showAnswer ? 'bg-black/20 text-black' :
                          team.color === 'bg-retro-pink' ? 'bg-retro-pink text-black' :
                          team.color === 'bg-retro-cyan' ? 'bg-retro-cyan text-black' :
                          'bg-retro-yellow text-black'
                        }`}
                      >
                        {team.name}
                      </span>
                    ))}
                    {showAnswer && isCorrect && <CheckCircle2 className="w-5 h-5" />}
                    {showAnswer && anyoneChose && !isCorrect && <XCircle className="w-5 h-5" />}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        <div className="h-16 flex items-center justify-center gap-4">
          <AnimatePresence>
            {role === 'regia' && !showAnswer && Object.keys(teamAnswers).length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={revealAnswer}
                className="retro-btn w-full text-base py-3 bg-retro-yellow text-black"
              >
                RIVELA RISPOSTA ({Object.keys(teamAnswers).length} squadr{Object.keys(teamAnswers).length === 1 ? 'a' : 'e'} ha risposto)
              </motion.button>
            )}
            {role === 'regia' && showAnswer && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                onClick={nextQuestion}
                className="retro-btn w-full text-base py-3"
              >
                PROSSIMA DOMANDA {">>"}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (questions && questions.length > 0 && currentIndex >= questions.length) {
    return (
      <div className="text-center">
        <Trophy className="w-24 h-24 text-retro-yellow mx-auto mb-8 animate-bounce" />
        <h2 className="text-6xl font-retro retro-title mb-4">SFIDA COMPLETATA!</h2>
        <p className="text-2xl font-retro text-retro-cyan mb-12">PUNTEGGIO FINALE: {score}/{questions.length}</p>
        {role === 'regia' && (
          <button 
            onClick={() => emitUpdate({ gameData: { ...sharedState, questions: [], topic: '' } })}
            className="retro-btn px-12 py-6 text-2xl"
          >
            NUOVA SFIDA
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md w-full">
      <div className="text-center mb-12">
        <Brain className="w-20 h-20 text-retro-pink mx-auto mb-6" />
        <h2 className="text-5xl font-retro retro-title uppercase mb-4">Sfida al Genio</h2>
        <p className="text-retro-cyan font-mono text-lg uppercase tracking-widest leading-tight">
          Inserisci un argomento e l'IA genererà 5 domande a difficoltà crescente.
        </p>
      </div>

      <div className="retro-card p-8 bg-black/40 border-retro-pink">
        <label className="block text-xs font-pixel text-retro-pink uppercase mb-4 tracking-tighter">Argomento della sfida</label>
        <input 
          type="text" 
          value={localTopic}
          onChange={(e) => setLocalTopic(e.target.value)}
          placeholder="ES: STORIA ROMANA, ANIME ANNI 90..."
          className="w-full bg-black border-4 border-retro-cyan p-4 font-mono uppercase text-2xl text-white focus:border-retro-pink outline-none mb-8 placeholder:opacity-30"
          disabled={role !== 'regia'}
        />
        {role === 'regia' ? (
          <button 
            onClick={startChallenge}
            disabled={!localTopic}
            className="retro-btn w-full text-lg py-3 bg-retro-pink disabled:opacity-50 disabled:cursor-not-allowed"
          >
            GENERA SFIDA
          </button>
        ) : (
          <div className="text-center p-4 border-2 border-dashed border-retro-yellow text-retro-yellow font-pixel text-[10px] uppercase">
            In attesa che la regia scelga l'argomento...
          </div>
        )}
      </div>
    </div>
  );
}

// --- GAME 2: DUELLOS ---
interface DuelloTeamResult {
  teamId: number;
  teamName: string;
  teamColor: string;
  wordsFound: number;
  timeUsed: number;
  completed: boolean;
}

function Duellos({ role, sharedState, emitUpdate, teams }: { role: 'regia' | 'pubblico' | 'display'; sharedState: any; emitUpdate: (update: any) => void; teams?: Team[] }) {
  const [loading, setLoading] = useState(false);

  // ── STATO DAL SERVER (solo dati discreti, MAI il timer) ──
  // Durante il round attivo usa le parole del set della squadra corrente,
  // altrimenti usa il set della prima squadra (per conteggi nella UI di teamSelect)
  const wordsSets: { [teamId: number]: { word: string; definition: string }[] } = sharedState.wordsSets || {};
  const activeSetWords = sharedState.activeTeamId != null ? (wordsSets[sharedState.activeTeamId] || []) : [];
  const words: { word: string; definition: string }[] = activeSetWords.length > 0
    ? activeSetWords
    : (Object.values(wordsSets)[0] as any || []);
  const currentWordIndex: number = sharedState.currentWordIndex ?? 0;
  const revealedLetters: number[] = sharedState.revealedLetters || [];
  const wordRevealed: boolean = sharedState.wordRevealed || false;
  const phase: 'setup' | 'teamSelect' | 'playing' | 'finalResults' = sharedState.phase || 'setup';
  const activeTeamId: number | null = sharedState.activeTeamId ?? null;
  const teamResults: DuelloTeamResult[] = sharedState.teamResults || [];
  const teamsQueue: number[] = sharedState.teamsQueue || [];
  const currentTeamQueueIndex: number = sharedState.currentTeamQueueIndex ?? 0;

  // ── TIMER: COMPLETAMENTE LOCALE — nessun tick via socket ──
  // Il timer è solo UI. Viene resettato a 120 quando arriva phase='playing' dal server.
  // Quando scade, la regia invia la fine del round via socket (un singolo evento discreto).
  const [localTimer, setLocalTimer] = useState(60);
  
    // Pubblico e Display leggono il timer sincronizzato dalla regia via socket
    useEffect(() => {
      if (role !== 'regia' && sharedState.syncedTimer != null) {
        setLocalTimer(sharedState.syncedTimer);
      }
    }, [sharedState.syncedTimer]);
  const timerRef = React.useRef<any>(null);
  const localTimerRef = React.useRef(60);
  const wordRevealedRef = React.useRef(false);
  wordRevealedRef.current = wordRevealed;

  // Reset timer SOLO quando il round inizia (phase diventa 'playing').
  // NON resettare al cambio parola: il timer è UNICO per tutte le 15 parole del round.
  const prevPhaseRef = React.useRef(phase);
  useEffect(() => {
    if (prevPhaseRef.current !== 'playing' && phase === 'playing') {
      localTimerRef.current = 60;
      setLocalTimer(60);
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  // Avvia/ferma il countdown locale
  useEffect(() => {
    clearInterval(timerRef.current);
    // Il timer gira solo se: regia, fase playing, parola non ancora trovata
    if (role === 'regia' && phase === 'playing' && !wordRevealed) {
      timerRef.current = setInterval(() => {
        // Controlla sempre il ref per evitare stale closure
        if (wordRevealedRef.current) {
          clearInterval(timerRef.current);
          return;
        }
        localTimerRef.current -= 1;
        setLocalTimer(localTimerRef.current);

        if (localTimerRef.current % 5 === 0) {
          emitUpdate({ gameData: { ...sharedStateRef.current, syncedTimer: localTimerRef.current } });
        }
if (localTimerRef.current <= 0) {
          clearInterval(timerRef.current);
          // Tempo scaduto: invia evento discreto al server
          handleTimeOut();
        }
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [role, phase, wordRevealed, currentWordIndex]);

  // Ferma il timer quando la parola viene trovata (wordRevealed cambia via socket)
  useEffect(() => {
    if (wordRevealed) {
      clearInterval(timerRef.current);
    }
  }, [wordRevealed]);

  const handleTimeOut = () => {
    // Legge lo stato dal DOM/ref più aggiornato tramite sharedState
    // Usiamo una callback per accedere allo stato più recente
    setLoading(false); // dummy state read to force re-render closure
    // Timeout: fine round per questa squadra
    const timeoutCallback = () => {
      // Viene eseguito nel prossimo ciclo, sharedState sarà aggiornato
    };
    // Emettiamo subito con i dati che abbiamo
    emitTimeoutEvent();
  };

  // Ref che tiene sempre l'ultimo sharedState per timeOut
  const sharedStateRef = React.useRef(sharedState);
  sharedStateRef.current = sharedState;

  const emitTimeoutEvent = () => {
    const latest = sharedStateRef.current;
    const result: DuelloTeamResult = {
      teamId: latest.activeTeamId!,
      teamName: teams?.find(t => t.id === latest.activeTeamId)?.name || 'Squadra',
      teamColor: teams?.find(t => t.id === latest.activeTeamId)?.color || 'bg-retro-pink',
      wordsFound: latest.wordsFoundThisRound ?? 0,
      timeUsed: 60,
      completed: false,
    };
    const newResults = [...(latest.teamResults || []), result];
    const nextQueueIdx = (latest.currentTeamQueueIndex ?? 0) + 1;
    const nextPhase = nextQueueIdx < (latest.teamsQueue || []).length ? 'teamSelect' : 'finalResults';
    emitUpdate({
      gameData: {
        ...latest,
        isActive: false,
        phase: nextPhase,
        teamResults: newResults,
        currentTeamQueueIndex: nextQueueIdx,
        wordRevealed: false,
      }
    });
  };

  const getInitialLetters = (word: string): number[] => {
    const w = word.toUpperCase();
    if (w.length <= 2) return [0];
    const revealed: number[] = [];
    for (let i = 0; i < w.length; i++) {
      if (w[i] !== ' ') { revealed.push(i); break; }
    }
    for (let i = w.length - 1; i >= 0; i--) {
      if (w[i] !== ' ' && !revealed.includes(i)) { revealed.push(i); break; }
    }
    return revealed;
  };

  const generateWords = async () => {
    if (role !== 'regia') return;
    setLoading(true);
    try {
      const allTeamIds = teams?.map(t => t.id) || [];
      // Genera un set di parole DIVERSO per ogni squadra (in parallelo)
      const allSets = await Promise.all(allTeamIds.map(() => geminiService.generateDuelloWords()));
      const wordsSets: { [teamId: number]: { word: string; definition: string }[] } = {};
      allTeamIds.forEach((id, i) => { wordsSets[id] = allSets[i]; });
      emitUpdate({
        gameData: {
          wordsSets,
          duelloWords: [], // legacy, non usato
          currentWordIndex: 0,
          revealedLetters: [],
          wordRevealed: false,
          isActive: false,
          phase: 'teamSelect',
          teamResults: [],
          teamsQueue: allTeamIds,
          currentTeamQueueIndex: 0,
          activeTeamId: null,
          wordsFoundThisRound: 0,
        }
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startTeamRound = (teamId: number) => {
    if (role !== 'regia') return;
    const latest = sharedStateRef.current;
    const teamWords = (latest.wordsSets || {})[teamId] || [];
    emitUpdate({
      gameData: {
        ...latest,
        activeTeamId: teamId,
        currentWordIndex: 0,
        revealedLetters: getInitialLetters(teamWords[0]?.word || ''),
        wordRevealed: false,
        isActive: true,
        phase: 'playing',
        wordsFoundThisRound: 0,
      }
    });
  };

  const revealNextLetter = () => {
    const latest = sharedStateRef.current;
    if (role !== 'regia' || latest.wordRevealed) return;
    const word = (words[latest.currentWordIndex]?.word || '').toUpperCase();
    const unrevealed: number[] = [];
    for (let i = 0; i < word.length; i++) {
      if (word[i] !== ' ' && !(latest.revealedLetters || []).includes(i)) {
        unrevealed.push(i);
      }
    }
    if (unrevealed.length > 0) {
      const pick = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      // Penalità: -2 secondi sul timer locale (non via socket)
      localTimerRef.current = Math.max(0, localTimerRef.current - 2);
      setLocalTimer(localTimerRef.current);
      emitUpdate({
        gameData: {
          ...latest,
          revealedLetters: [...(latest.revealedLetters || []), pick],
        }
      });
    }
  };

  // RISPOSTA ESATTA: invia stato completo con wordRevealed:true
  // Il timer si ferma lato UI immediatamente (via wordRevealed → useEffect)
  const markFound = () => {
    if (role !== 'regia') return;
    const latest = sharedStateRef.current;
    clearInterval(timerRef.current); // ferma subito il timer locale
    emitUpdate({
      gameData: {
        ...latest,
        wordRevealed: true,
      }
    });
  };

  const nextWord = (found: boolean) => {
    if (role !== 'regia') return;
    const latest = sharedStateRef.current;
    const nextIdx = latest.currentWordIndex + 1;
    const wordsFoundSoFar = found
      ? (latest.wordsFoundThisRound ?? 0) + 1
      : (latest.wordsFoundThisRound ?? 0);

    if (nextIdx >= words.length) {
      const timeUsed = 120 - localTimerRef.current;
      const newResult: DuelloTeamResult = {
        teamId: latest.activeTeamId!,
        teamName: teams?.find(t => t.id === latest.activeTeamId)?.name || 'Squadra',
        teamColor: teams?.find(t => t.id === latest.activeTeamId)?.color || 'bg-retro-pink',
        wordsFound: wordsFoundSoFar,
        timeUsed,
        completed: true,
      };
      const newResults = [...(latest.teamResults || []), newResult];
      const nextQueueIdx = (latest.currentTeamQueueIndex ?? 0) + 1;
      const nextPhase = nextQueueIdx < (latest.teamsQueue || []).length ? 'teamSelect' : 'finalResults';
      emitUpdate({
        gameData: {
          ...latest,
          isActive: false,
          phase: nextPhase,
          teamResults: newResults,
          currentTeamQueueIndex: nextQueueIdx,
          wordRevealed: false,
        }
      });
    } else {
      emitUpdate({
        gameData: {
          ...latest,
          currentWordIndex: nextIdx,
          revealedLetters: getInitialLetters(words[nextIdx]?.word || ''),
          wordRevealed: false,
          wordsFoundThisRound: wordsFoundSoFar,
        }
      });
    }
  };

  const newCategory = async () => {
    if (role !== 'regia') return;
    setLoading(true);
    try {
      const t = await geminiService.generateRingTheme();
      emitUpdate({
        gameData: {
          ...sharedStateRef.current,
          theme: t,
          currentPlayerIdx: 0,
          isActive: false,
        }
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const resetGame = () => {
    if (role !== 'regia') return;
    emitUpdate({
      gameData: {
        phase: 'setup',
        duelloWords: [],
        wordsSets: {},
        teamResults: [],
        wordRevealed: false,
        isActive: false,
        currentWordIndex: 0,
        wordsFoundThisRound: 0,
        activeTeamId: null,
      }
    });
  };

  if (loading) return <LoadingState text="Duellos genera 3 set di parole diversi..." />;

  // ── FASE SETUP ──
  if (phase === 'setup') {
    return (
      <div className="max-w-lg w-full text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-10"
        >
          <Swords className="w-20 h-20 text-retro-pink mx-auto mb-4 drop-shadow-[0_0_20px_rgba(255,0,255,0.8)]" />
          <h2 className="text-6xl font-retro retro-title uppercase mb-3">Duellos</h2>
          <p className="text-retro-cyan font-pixel text-[11px] uppercase tracking-[0.25em] leading-loose max-w-sm mx-auto">
            Ogni squadra gioca a turno.<br />
            La regia rivela lettere, il concorrente indovina.<br />
            Ogni lettera svelata costa 2 secondi.
          </p>
        </motion.div>

        {role === 'regia' ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={generateWords}
            className="retro-btn w-full text-lg py-3 bg-retro-pink shadow-[0_0_30px_rgba(255,0,255,0.4)]"
          >
            <span className="flex items-center justify-center gap-3">
              <Zap className="w-6 h-6" /> GENERA LE PAROLE
            </span>
          </motion.button>
        ) : (
          <div className="p-6 border-2 border-dashed border-retro-yellow text-retro-yellow font-pixel text-[10px] uppercase tracking-widest">
            In attesa che la regia generi le parole...
          </div>
        )}
      </div>
    );
  }

  // ── FASE SELEZIONE SQUADRA ──
  if (phase === 'teamSelect') {
    const nextTeamId = teamsQueue[currentTeamQueueIndex];
    const nextTeam = teams?.find(t => t.id === nextTeamId);
    const alreadyPlayed = teamResults.map(r => r.teamId);

    return (
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <span className="text-xs font-pixel text-retro-pink uppercase tracking-[0.3em] block mb-2">DUELLOS</span>
          <h2 className="text-3xl font-retro retro-title uppercase mb-6">È il tuo turno!</h2>
          {nextTeam && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className={`inline-block mt-2 px-12 py-6 border-4 relative ${
                nextTeam.color === 'bg-retro-pink' ? 'border-retro-pink bg-retro-pink/10 shadow-[0_0_60px_rgba(255,0,255,0.5)]' :
                nextTeam.color === 'bg-retro-cyan' ? 'border-retro-cyan bg-retro-cyan/10 shadow-[0_0_60px_rgba(0,255,255,0.5)]' :
                'border-retro-yellow bg-retro-yellow/10 shadow-[0_0_60px_rgba(255,255,0,0.5)]'
              }`}
            >
              <span className={`text-[10px] font-pixel uppercase tracking-[0.4em] block mb-2 ${
                nextTeam.color === 'bg-retro-pink' ? 'text-retro-pink/70' :
                nextTeam.color === 'bg-retro-cyan' ? 'text-retro-cyan/70' : 'text-retro-yellow/70'
              }`}>GIOCA ORA</span>
              <span className={`text-5xl font-retro uppercase tracking-tight ${
                nextTeam.color === 'bg-retro-pink' ? 'text-retro-pink' :
                nextTeam.color === 'bg-retro-cyan' ? 'text-retro-cyan' : 'text-retro-yellow'
              }`}>{nextTeam.name}</span>
            </motion.div>
          )}
          <p className="mt-4 text-white/50 font-pixel text-[10px] uppercase tracking-widest">
            Squadre già giocate: {alreadyPlayed.length} / {teamsQueue.length}
          </p>
        </div>

        {/* Risultati squadre precedenti */}
        {teamResults.length > 0 && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-3">
            {teamResults.map((r, i) => (
              <div key={i} className="bg-black/40 border border-white/10 p-4 text-center">
                <span className={`text-xs font-pixel uppercase ${
                  r.teamColor === 'bg-retro-pink' ? 'text-retro-pink' :
                  r.teamColor === 'bg-retro-cyan' ? 'text-retro-cyan' :
                  'text-retro-yellow'
                }`}>{r.teamName}</span>
                <div className="text-3xl font-retro text-white mt-1">{r.wordsFound}<span className="text-base text-white/40">/{words.length}</span></div>
                <div className="text-[10px] font-pixel text-white/40 uppercase">
                  {r.completed ? `${r.timeUsed}s usati` : 'Tempo scaduto'}
                </div>
              </div>
            ))}
          </div>
        )}

        {role === 'regia' && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => nextTeamId !== undefined && startTeamRound(nextTeamId)}
            className="retro-btn w-full text-lg py-3 bg-retro-cyan text-black"
          >
            VIA! INIZIA IL ROUND →
          </motion.button>
        )}
      </div>
    );
  }

  // ── FASE GIOCO ──
  if (phase === 'playing') {
    const currentWord = words[currentWordIndex];
    if (!currentWord) return null;
    const wordUpper = currentWord.word.toUpperCase();
    const totalNonSpace = wordUpper.replace(/\s/g, '').length;
    const revealedNonSpace = revealedLetters.filter(i => wordUpper[i] !== ' ').length;
    const allRevealed = revealedNonSpace >= totalNonSpace;
    const activeTeam = teams?.find(t => t.id === activeTeamId);
    const wordsFoundSoFar: number = sharedState.wordsFoundThisRound ?? 0;
    const minutes = Math.floor(localTimer / 60);
    const seconds = localTimer % 60;
    const timerStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const timerPct = (localTimer / 60) * 100;

    return (
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-[10px] font-pixel text-retro-pink uppercase tracking-widest block">DUELLOS</span>
            {activeTeam && (
              <span className={`text-xl font-retro uppercase ${
                activeTeam.color === 'bg-retro-pink' ? 'text-retro-pink' :
                activeTeam.color === 'bg-retro-cyan' ? 'text-retro-cyan' :
                'text-retro-yellow'
              }`}>{activeTeam.name}</span>
            )}
          </div>
          <div className="text-center">
            <div className={`text-5xl font-retro tabular-nums ${
              localTimer <= 10 ? 'text-red-500 animate-pulse' :
              localTimer <= 30 ? 'text-retro-yellow' : 'text-white'
            }`}>{timerStr}</div>
            <div className="w-48 h-2 bg-black/40 border border-white/10 mt-1 mx-auto overflow-hidden">
              <motion.div
                className={`h-full ${
                  localTimer <= 10 ? 'bg-red-500' :
                  localTimer <= 30 ? 'bg-retro-yellow' : 'bg-retro-cyan'
                }`}
                animate={{ width: `${timerPct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-pixel text-white/40 uppercase block">Parola</span>
            <span className="text-2xl font-retro text-white">{currentWordIndex + 1}<span className="text-white/30">/{words.length}</span></span>
            <span className="text-[10px] font-pixel text-retro-cyan uppercase block mt-1">✓ {wordsFoundSoFar} indovinate</span>
          </div>
        </div>

        {/* Card parola */}
        <motion.div
          key={currentWordIndex}
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={`retro-card p-8 mb-6 relative ${
            wordRevealed ? 'border-retro-cyan shadow-[0_0_40px_rgba(0,255,255,0.3)]' : ''
          }`}
        >
          {/* Definizione */}
          <div className="mb-6">
            <span className="text-[10px] font-pixel text-white/40 uppercase tracking-widest block mb-2">Definizione</span>
            <p className="text-xl md:text-2xl font-mono text-white leading-snug uppercase tracking-tight">
              {currentWord.definition}
            </p>
          </div>

          {/* Parola in chiaro — solo regia */}
          {role === 'regia' && (
            <div className="mb-6 px-4 py-3 bg-retro-pink/10 border border-retro-pink/40 flex items-center gap-3">
              <span className="text-[9px] font-pixel text-retro-pink uppercase tracking-widest whitespace-nowrap">RISPOSTA</span>
              <span className="font-retro text-2xl text-retro-pink uppercase tracking-widest">{wordUpper}</span>
            </div>
          )}

          {/* Parola con lettere */}
          <div className="border-t-2 border-white/10 pt-6">
            <span className="text-[10px] font-pixel text-white/40 uppercase tracking-widest block mb-3">
              {wordUpper.length} lettere
            </span>
            <div className="flex flex-wrap gap-2 justify-center">
              {wordUpper.split('').map((char, idx) => {
                if (char === ' ') return <div key={idx} className="w-4" />;
                const isRevealed = wordRevealed || revealedLetters.includes(idx);
                return (
                  <motion.div
                    key={idx}
                    initial={false}
                    animate={isRevealed ? {
                      backgroundColor: wordRevealed ? 'rgba(0,255,255,0.2)' : 'rgba(255,255,0,0.15)',
                      borderColor: wordRevealed ? 'rgba(0,255,255,0.8)' : 'rgba(255,255,0,0.6)',
                      scale: isRevealed ? [1, 1.2, 1] : 1,
                    } : {}}
                    transition={{ duration: 0.3 }}
                    className={`w-10 h-14 md:w-12 md:h-16 flex items-center justify-center border-2 text-2xl md:text-3xl font-retro transition-all ${
                      isRevealed
                        ? wordRevealed
                          ? 'border-retro-cyan bg-retro-cyan/20 text-retro-cyan'
                          : 'border-retro-yellow bg-retro-yellow/20 text-retro-yellow'
                        : 'border-white/20 bg-white/5 text-transparent'
                    }`}
                  >
                    {isRevealed ? char : '_'}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {wordRevealed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-center"
            >
              <CheckCircle2 className="w-10 h-10 text-retro-cyan mx-auto mb-2" />
              <span className="text-retro-cyan font-pixel text-[11px] uppercase tracking-widest">Risposta corretta!</span>
            </motion.div>
          )}
        </motion.div>

        {/* Controlli Regia */}
        {role === 'regia' && (
          <div className="flex flex-col gap-3">
            {!wordRevealed ? (
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={revealNextLetter}
                  disabled={allRevealed}
                  className="retro-btn flex-1 py-4 text-lg bg-retro-yellow text-black disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Eye className="w-5 h-5" /> LETTERA (-2s)
                  </span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={markFound}
                  className="retro-btn flex-1 py-4 text-lg bg-retro-cyan text-black"
                >
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> RISPOSTA ESATTA!
                  </span>
                </motion.button>
              </div>
            ) : (
              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => nextWord(true)}
                className="retro-btn w-full py-3 text-lg bg-retro-pink shadow-[0_0_20px_rgba(255,0,255,0.4)]"
              >
                PROSSIMA PAROLA →
              </motion.button>
            )}
            
            {!wordRevealed && (
              <div className="flex justify-center mt-2">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => nextWord(false)}
                  className="retro-btn w-full py-3 text-sm bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                >
                  SALTA PAROLA →
                </motion.button>
              </div>
            )}
          </div>
        )}

        {role !== 'regia' && (
          <div className="text-center p-4 border-2 border-dashed border-white/20 text-white/40 font-pixel text-[10px] uppercase tracking-widest">
            {role === 'display' ? 'La regia gestisce il gioco' : 'Ascolta la definizione e dì la risposta!'}
          </div>
        )}
      </div>
    );
  }

  // ── FASE RISULTATI FINALI ──
  if (phase === 'finalResults') {
    // Determina il vincitore: più parole indovinate. In caso di parità, meno tempo usato.
    const sorted = [...teamResults].sort((a, b) => {
      if (b.wordsFound !== a.wordsFound) return b.wordsFound - a.wordsFound;
      return a.timeUsed - b.timeUsed;
    });
    const winner = sorted[0];

    return (
      <div className="max-w-2xl w-full text-center">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
          <Trophy className="w-24 h-24 text-retro-yellow mx-auto mb-4 drop-shadow-[0_0_30px_rgba(255,255,0,0.8)] animate-bounce" />
          <h2 className="text-6xl font-retro retro-title uppercase mb-2">Duellos Finito!</h2>
          {winner && (
            <p className={`text-3xl font-retro mt-4 uppercase ${
              winner.teamColor === 'bg-retro-pink' ? 'text-retro-pink' :
              winner.teamColor === 'bg-retro-cyan' ? 'text-retro-cyan' :
              'text-retro-yellow'
            }`}>
              🏆 {winner.teamName} vince!
            </p>
          )}
        </motion.div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {sorted.map((r, i) => (
            <motion.div
              key={r.teamId}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.15 }}
              className={`p-6 border-2 relative ${
                i === 0
                  ? r.teamColor === 'bg-retro-pink' ? 'border-retro-pink shadow-[0_0_30px_rgba(255,0,255,0.3)] bg-retro-pink/10' :
                    r.teamColor === 'bg-retro-cyan' ? 'border-retro-cyan shadow-[0_0_30px_rgba(0,255,255,0.3)] bg-retro-cyan/10' :
                    'border-retro-yellow shadow-[0_0_30px_rgba(255,255,0,0.3)] bg-retro-yellow/10'
                  : 'border-white/10 bg-black/20'
              }`}
            >
              {i === 0 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-retro-yellow text-black text-[9px] font-pixel px-3 py-1 uppercase">
                  🥇 Vincitore
                </div>
              )}
              <span className={`text-sm font-pixel uppercase ${
                r.teamColor === 'bg-retro-pink' ? 'text-retro-pink' :
                r.teamColor === 'bg-retro-cyan' ? 'text-retro-cyan' :
                'text-retro-yellow'
              }`}>{r.teamName}</span>
              <div className="text-5xl font-retro text-white my-2">{r.wordsFound}<span className="text-xl text-white/30">/{words.length}</span></div>
              <div className="text-[10px] font-pixel text-white/40 uppercase space-y-1">
                <div>{r.completed ? `Completato in ${r.timeUsed}s` : `Tempo scaduto`}</div>
                <div>{r.wordsFound} parole indovinate</div>
              </div>
            </motion.div>
          ))}
        </div>

        {role === 'regia' && (
          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                // Assegna punti: 3 al primo, 2 al secondo, 1 al terzo
                const points = [3, 2, 1];
                const newTeams = teams ? [...teams] : [];
                sorted.forEach((r, i) => {
                  const pts = points[i] ?? 0;
                  const idx = newTeams.findIndex(t => t.id === r.teamId);
                  if (idx !== -1) newTeams[idx] = { ...newTeams[idx], score: newTeams[idx].score + pts };
                });
                emitUpdate({ teams: newTeams });
              }}
              className="retro-btn flex-1 py-3 text-base bg-retro-yellow text-black"
            >
              <Trophy className="w-5 h-5 inline mr-2" /> ASSEGNA PUNTI
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={generateWords}
              className="retro-btn flex-1 py-3 text-base bg-retro-pink"
            >
              <Zap className="w-5 h-5 inline mr-2" /> NUOVE PAROLE
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={resetGame}
              className="retro-btn px-8 py-5 text-xl bg-white/10 border border-white/20"
            >
              <RotateCcw className="w-5 h-5 inline mr-2" /> RESET
            </motion.button>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// --- GAME 3: TIMELINE ---
function TimelineGame({ role, sharedState, emitUpdate }: { role: 'regia' | 'pubblico' | 'display'; sharedState: any; emitUpdate: (update: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [preloadedEvents, setPreloadedEvents] = useState<{ [round: number]: any[] }>({});

  const CATEGORY = 'Tutto il Sapere: storia, scienza, sport, cultura generale, cinema, musica, geografia';
  const CATEGORY_LABEL = 'Tutto il Sapere';
  const roundConfig = [3, 5, 7];

  const selectedCategory = sharedState.category || '';
  const round = sharedState.round || 1;
  const events = sharedState.events || [];
  const shuffled = sharedState.shuffled || [];
  const isActive = sharedState.isActive || false;
  const gameOver = sharedState.gameOver || false;
  const result = sharedState.result || null;

  // ── TIMER LOCALE ──
  const [localTimer, setLocalTimer] = useState(90);
  const localTimerRef = React.useRef(90);
  const timerRef = React.useRef<any>(null);
  const sharedStateRef = React.useRef(sharedState);
  sharedStateRef.current = sharedState;

  const prevIsActiveRef = React.useRef(isActive);
  useEffect(() => {
    const justStarted = !prevIsActiveRef.current && isActive && round === 1;
    if (justStarted) {
      localTimerRef.current = 90;
      setLocalTimer(90);
    }
    prevIsActiveRef.current = isActive;
  }, [isActive, round]);

  // Timer si ferma quando result != null (verifica in corso), riparte su riprova
  useEffect(() => {
    clearInterval(timerRef.current);
    if (role === 'regia' && isActive && !gameOver && !result) {
      timerRef.current = setInterval(() => {
        localTimerRef.current -= 1;
        setLocalTimer(localTimerRef.current);
        if (localTimerRef.current % 5 === 0) {
          emitUpdate({ gameData: { ...sharedStateRef.current, syncedTimer: localTimerRef.current } });
        }
        if (localTimerRef.current <= 0) {
          clearInterval(timerRef.current);
          emitUpdate({ gameData: { ...sharedStateRef.current, gameOver: true, isActive: false } });
        }
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [role, isActive, gameOver, result, round]);

  useEffect(() => {
    if (role !== 'regia' && sharedState.syncedTimer != null) {
      setLocalTimer(sharedState.syncedTimer);
    }
  }, [sharedState.syncedTimer]);

  const startGame = async () => {
    console.log('startGame chiamato, role:', role, 'socket:', socket?.id);
    if (role !== 'regia') return;
    setLoading(true);
    setPreloadedEvents({});
    try {
      const data1 = await geminiService.generateTimelineEvents(CATEGORY, roundConfig[0]);
      emitUpdate({
        gameData: {
          ...sharedStateRef.current,
          category: CATEGORY_LABEL,
          events: data1,
          shuffled: [...data1].sort(() => Math.random() - 0.5),
          round: 1,
          isActive: true,
          gameOver: false,
          result: null,
          syncedTimer: 90,
        }
      });
      
      // Precarica round 2 e 3 in background mentre si gioca
      geminiService.generateTimelineEvents(CATEGORY, roundConfig[1])
        .then(d => setPreloadedEvents(prev => ({ ...prev, 2: d })))
        .catch(console.error);
      geminiService.generateTimelineEvents(CATEGORY, roundConfig[2])
        .then(d => setPreloadedEvents(prev => ({ ...prev, 3: d })))
        .catch(console.error);
       setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const nextRound = async () => {
    if (role !== 'regia') return;
    const nextR = round + 1;
    if (nextR > roundConfig.length) {
      emitUpdate({ gameData: { ...sharedStateRef.current, gameOver: true } });
      return;
    }
    const preloaded = preloadedEvents[nextR];
    if (preloaded) {
      emitUpdate({
        gameData: {
          ...sharedStateRef.current,
          events: preloaded,
          shuffled: [...preloaded].sort(() => Math.random() - 0.5),
          round: nextR,
          result: null,
          isActive: true,
          syncedTimer: 90,
        }
      });
    } else {
      setLoading();
      try {
        const data = await geminiService.generateTimelineEvents(CATEGORY, roundConfig[nextR - 1]);
        emitUpdate({
          gameData: {
            ...sharedStateRef.current,
            events: data,
            shuffled: [...data].sort(() => Math.random() - 0.5),
            round: nextR,
            result: null,
            isActive: true,
            syncedTimer: 90,
          }
        });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
  };

  const move = (index: number, direction: 'up' | 'down') => {
    if (result?.correct || (role !== 'regia' && role !== 'pubblico')) return;
    const newArr = [...shuffled];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newArr.length) return;
    [newArr[index], newArr[targetIndex]] = [newArr[targetIndex], newArr[index]];
    emitUpdate({ gameData: { ...sharedStateRef.current, shuffled: newArr } });
  };

  const check = () => {
    if (role !== 'regia') return;
    const sorted = [...events].sort((a: any, b: any) => a.year - b.year);
    const isPerfect = shuffled.every((ev: any, i: number) => ev.year === sorted[i].year);
    // NON tocca isActive: timer riprende se si clicca RIPROVA
    emitUpdate({
      gameData: {
        ...sharedStateRef.current,
        result: { correct: isPerfect, score: isPerfect ? (round * 10) : 0 },
      }
    });
  };

  if (loading) return <LoadingState text="Costruendo la linea del tempo..." />;

  if (gameOver) {
    return (
      <div className="max-w-md w-full text-center">
        <Trophy className="w-16 h-16 text-retro-yellow mx-auto mb-6" />
        <h2 className="text-4xl md:text-6xl font-retro retro-title uppercase mb-4">GAME OVER</h2>
        <p className="text-lg font-retro text-retro-cyan mb-6 uppercase">Round completati: {round} / {roundConfig.length}</p>
        <div className="bg-[#000044] p-6 border border-retro-cyan/30 mb-8">
          <span className="text-xs font-pixel text-retro-yellow uppercase tracking-widest block mb-2">TEMPO RIMANENTE</span>
          <div className="text-4xl font-retro">{localTimer}s</div>
        </div>
        {role === 'regia' && (
          <button
            onClick={() => emitUpdate({ gameData: { ...sharedStateRef.current, category: '', events: [], gameOver: false, round: 1, isActive: false, result: null } })}
            className="retro-btn w-full text-lg py-3 bg-retro-pink"
          >
            RIPROVA
          </button>
        )}
      </div>
    );
  }

  if (selectedCategory && events.length > 0) {
    const sorted = [...events].sort((a: any, b: any) => a.year - b.year);
    return (
      <div className="max-w-3xl w-full">
        <div className="flex justify-between items-center mb-4">
          <div className="text-left">
            <span className="text-[10px] font-pixel text-retro-cyan uppercase tracking-widest block mb-0.5">ROUND {round}/{roundConfig.length}</span>
            <h2 className="text-2xl md:text-4xl font-retro uppercase tracking-tight retro-title">{selectedCategory}</h2>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-pixel text-retro-yellow uppercase tracking-widest block">TIMER</span>
            <div className={`text-3xl md:text-4xl font-retro ${localTimer < 20 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{localTimer}s</div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {shuffled.map((ev: any, i: number) => {
            const isCorrectPosition = result && ev.year === sorted[i].year;
            return (
              <motion.div
                layout
                key={ev.event}
                className={`p-3 border flex items-center gap-3 transition-all ${
                  result
                    ? (isCorrectPosition ? 'bg-green-500 border-transparent text-black' : 'bg-retro-pink border-transparent text-black')
                    : 'bg-[#000066] border-retro-cyan/30'
                }`}
              >
                {(role === 'regia' || role === 'pubblico') && (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => move(i, 'up')}
                      className={`p-1.5 border-2 transition-colors ${result?.correct ? 'border-black/20 text-black/40' : 'bg-black/20 border-retro-cyan text-retro-cyan hover:bg-retro-cyan hover:text-black'}`}
                      disabled={i === 0 || !!result?.correct}
                    >
                      <ChevronLeft className="w-4 h-4 rotate-90" />
                    </button>
                    <button
                      onClick={() => move(i, 'down')}
                      className={`p-1.5 border-2 transition-colors ${result?.correct ? 'border-black/20 text-black/40' : 'bg-black/20 border-retro-cyan text-retro-cyan hover:bg-retro-cyan hover:text-black'}`}
                      disabled={i === shuffled.length - 1 || !!result?.correct}
                    >
                      <ChevronLeft className="w-4 h-4 -rotate-90" />
                    </button>
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm md:text-lg font-mono uppercase leading-tight">{ev.event}</p>
                  {result && <span className="text-xs font-pixel text-black/70 mt-1 block">{ev.year}</span>}
                </div>
                <div className={`text-2xl md:text-3xl font-retro ${isCorrectPosition ? 'text-black' : result ? 'text-black/40' : 'text-retro-yellow'}`}>
                  {i + 1 < 10 ? `0${i + 1}` : i + 1}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex gap-3">
          {role === 'regia' && !result && (
            <button onClick={check} className="retro-btn w-full text-base py-3 bg-retro-cyan">
              VERIFICA ORDINE
            </button>
          )}
          {result && (
            <div className="w-full space-y-3">
              <div className={`text-xl font-retro uppercase text-center retro-title ${result.correct ? 'text-green-500' : 'text-retro-pink'}`}>
                {result.correct ? '✓ ROUND SUPERATO!' : '✗ ERRORE — RIPROVA!'}
              </div>
              <div className="flex gap-3">
                {role === 'regia' && result.correct && (
                  <button onClick={nextRound} className="retro-btn flex-1 text-base py-3 bg-green-500 text-black">
                    {round < roundConfig.length ? 'PROSSIMO ROUND →' : 'VITTORIA! 🏆'}
                  </button>
                )}
                {role === 'regia' && !result.correct && (
                  <button
                    onClick={() => emitUpdate({ gameData: { ...sharedStateRef.current, result: null } })}
                    className="retro-btn flex-1 text-base py-3 bg-retro-yellow text-black"
                  >
                    RIPROVA →
                  </button>
                )}
                {role === 'regia' && (
                  <button
                    onClick={() => emitUpdate({ gameData: { ...sharedStateRef.current, category: '', events: [], gameOver: false, result: null, isActive: false } })}
                    className="retro-btn px-4 py-3 bg-white/10 border border-white/20 text-sm"
                  >
                    QUIT
                  </button>
                )}
              </div>
            </div>
          )}
          {role === 'pubblico' && !result && (
            <div className="flex-1 text-center p-3 border-2 border-dashed border-retro-yellow text-retro-yellow font-pixel text-[10px] uppercase">
              Usa le frecce per ordinare gli eventi!
            </div>
          )}
          {role === 'display' && !result && (
            <div className="flex-1 text-center p-3 border-2 border-dashed border-retro-cyan text-retro-cyan font-pixel text-[10px] uppercase">
              In attesa della regia...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full text-center">
      <History className="w-16 h-16 text-retro-cyan mx-auto mb-6" />
      <h2 className="text-5xl font-retro retro-title uppercase mb-4">TIMELINE</h2>
      <p className="text-retro-cyan font-mono text-sm mb-10 uppercase leading-tight tracking-widest">
        METTI IN ORDINE GLI EVENTI. 3 ROUND (3, 5, 7 EVENTI). HAI 90 SECONDI!
      </p>
      {role === 'regia' ? (
        <button onClick={startGame} className="retro-btn w-full text-lg py-3 bg-retro-cyan flex items-center justify-center gap-3">
          <Play className="w-5 h-5" /> INIZIA SFIDA
        </button>
      ) : (
        <div className="text-center p-4 border-2 border-dashed border-retro-yellow text-retro-yellow font-pixel text-[10px] uppercase">
          In attesa che la regia inizi la sfida...
        </div>
      )}
    </div>
  );
}

// --- GAME 4: IL RING ---
function IlRing({ role, sharedState, emitUpdate }: { role: 'regia' | 'pubblico' | 'display'; sharedState: any; emitUpdate: (update: any) => void }) {
  const [loading, setLoading] = useState(false);

  // Stato dal server
  const theme: string = sharedState.theme || '';
  const phase: 'setup' | 'playing' | 'eliminated' | 'winner' = sharedState.phase || 'setup';
  const activePlayers: number[] = sharedState.activePlayers || [];
  const currentPlayerIdx: number = sharedState.currentPlayerIdx ?? 0;
  const eliminated: number[] = sharedState.eliminated || [];
  const isActive: boolean = sharedState.isActive || false;
  const wordCounts: { [teamId: number]: number } = sharedState.wordCounts || {};
  const turnDuration: number = sharedState.turnDuration ?? 5;

  // Timer locale
  const [localTimer, setLocalTimer] = useState(turnDuration);
  const localTimerRef = React.useRef(turnDuration);
  const timerRef = React.useRef<any>(null);
  const sharedStateRef = React.useRef(sharedState);
  sharedStateRef.current = sharedState;

  // Reset timer quando cambia turno o parte il gioco
  const prevActivePlayerIdxRef = React.useRef(currentPlayerIdx);
  const prevIsActiveRef = React.useRef(isActive);
  useEffect(() => {
    const turnChanged = prevActivePlayerIdxRef.current !== currentPlayerIdx;
    const justStarted = !prevIsActiveRef.current && isActive;
    if (turnChanged || justStarted) {
      const dur = sharedStateRef.current.turnDuration ?? 5;
      localTimerRef.current = dur;
      setLocalTimer(dur);
    }
    prevActivePlayerIdxRef.current = currentPlayerIdx;
    prevIsActiveRef.current = isActive;
  }, [currentPlayerIdx, isActive]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (role === 'regia' && isActive && phase === 'playing') {
      timerRef.current = setInterval(() => {
        localTimerRef.current -= 1;
        setLocalTimer(localTimerRef.current);
        if (localTimerRef.current % 2 === 0) {
          emitUpdate({ gameData: { ...sharedStateRef.current, syncedTimer: localTimerRef.current } });
        }
        if (localTimerRef.current <= 0) {
          clearInterval(timerRef.current);
          handleTimeOut();
        }
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [role, isActive, phase, currentPlayerIdx]);

  useEffect(() => {
    if (role !== 'regia' && sharedState.syncedTimer != null) {
      setLocalTimer(sharedState.syncedTimer);
    }
  }, [sharedState.syncedTimer]);

  const handleTimeOut = () => {
    const latest = sharedStateRef.current;
    const ap = latest.activePlayers || [];
    const nextIdx = ((latest.currentPlayerIdx ?? 0) + 1) % ap.length;
    emitUpdate({
      gameData: {
        ...latest,
        isActive: true,
        phase: 'playing',
        currentPlayerIdx: nextIdx,
      }
    });
  };

  const startGame = async () => {
    if (role !== 'regia') return;
    setLoading(true);
    try {
      const t = await geminiService.generateRingTheme();
      const ap = sharedState.ringTeams || [1, 2, 3];
      const initCounts: { [id: number]: number } = {};
      ap.forEach((id: number) => { initCounts[id] = 0; });
      emitUpdate({
        gameData: {
          ...sharedStateRef.current,
          theme: t,
          phase: 'playing',
          activePlayers: ap,
          eliminated: [],
          currentPlayerIdx: 0,
          isActive: false,
          wordCounts: initCounts,
          turnDuration: sharedStateRef.current.turnDuration ?? 5,
        }
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Regia: +1 parola alla squadra corrente
  const addWord = () => {
    if (role !== 'regia') return;
    const latest = sharedStateRef.current;
    const currentId = latest.activePlayers[latest.currentPlayerIdx ?? 0];
    const newCounts = { ...latest.wordCounts, [currentId]: (latest.wordCounts?.[currentId] ?? 0) + 1 };
    emitUpdate({ gameData: { ...latest, wordCounts: newCounts } });
  };

  const passTurn = () => {
    if (role !== 'regia') return;
    clearInterval(timerRef.current);
    const latest = sharedStateRef.current;
    const ap = latest.activePlayers || [];
    const nextIdx = ((latest.currentPlayerIdx ?? 0) + 1) % ap.length;
    emitUpdate({
      gameData: {
        ...latest,
        currentPlayerIdx: nextIdx,
        isActive: true,
        phase: 'playing',
      }
    });
  };

  const startTurn = () => {
    if (role !== 'regia') return;
    emitUpdate({ gameData: { ...sharedStateRef.current, isActive: true, phase: 'playing' } });
  };

  const continueAfterElimination = () => {
    if (role !== 'regia') return;
    emitUpdate({ gameData: { ...sharedStateRef.current, isActive: true, phase: 'playing' } });
  };

  const resetGame = () => {
    if (role !== 'regia') return;
    emitUpdate({
      gameData: {
        ...sharedStateRef.current,
        theme: '',
        phase: 'setup',
        activePlayers: [],
        eliminated: [],
        currentPlayerIdx: 0,
        isActive: false,
        wordCounts: {},
      }
    });
  };

  const setTurnDuration = (dur: number) => {
    if (role !== 'regia') return;
    emitUpdate({ gameData: { ...sharedStateRef.current, turnDuration: dur } });
  };

  if (loading) return <LoadingState text="Preparando il Ring..." />;

  // ── SETUP ──
  if (!theme || phase === 'setup') {
    return (
      <div className="max-w-md w-full text-center">
        <Swords className="w-16 h-16 text-retro-cyan mx-auto mb-6" />
        <h2 className="text-5xl font-retro retro-title uppercase mb-4">IL RING</h2>
        <p className="text-retro-cyan font-mono text-sm mb-8 uppercase leading-tight tracking-widest">
          TUTTI CONTRO TUTTI. DICI UN NOME, PASSA IL TURNO. CHI FINISCE IL TEMPO È ELIMINATO!
        </p>
        {role === 'regia' && (
          <div className="mb-6">
            <span className="text-[10px] font-pixel text-retro-yellow uppercase tracking-widest block mb-3">DURATA TURNO</span>
            <div className="flex gap-3 justify-center">
              {[5, 7].map(d => (
                <button
                  key={d}
                  onClick={() => setTurnDuration(d)}
                  className={`px-6 py-2 border-2 font-retro text-xl transition-all ${
                    turnDuration === d
                      ? 'border-retro-cyan bg-retro-cyan/20 text-retro-cyan'
                      : 'border-white/20 text-white/40 hover:border-white/50'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
        )}
        {role === 'regia' ? (
          <button onClick={startGame} className="retro-btn w-full text-lg py-3 bg-retro-cyan flex items-center justify-center gap-3">
            <Play className="w-5 h-5" /> ENTRA NEL RING
          </button>
        ) : (
          <div className="text-center p-4 border-2 border-dashed border-retro-yellow text-retro-yellow font-pixel text-[10px] uppercase">
            In attesa che la regia inizi...
          </div>
        )}
      </div>
    );
  }

  const teamColor = (teamId: number) => {
    const t = (sharedState.allTeams || []).find((t: any) => t.id === teamId);
    if (!t) return { border: 'border-white', text: 'text-white', bg: 'bg-white/10', name: `Team ${teamId}` };
    return {
      border: t.color === 'bg-retro-pink' ? 'border-retro-pink' : t.color === 'bg-retro-cyan' ? 'border-retro-cyan' : 'border-retro-yellow',
      text: t.color === 'bg-retro-pink' ? 'text-retro-pink' : t.color === 'bg-retro-cyan' ? 'text-retro-cyan' : 'text-retro-yellow',
      bg: t.color === 'bg-retro-pink' ? 'bg-retro-pink/20' : t.color === 'bg-retro-cyan' ? 'bg-retro-cyan/20' : 'bg-retro-yellow/20',
      name: t.name,
    };
  };

  const currentTeamId = activePlayers[currentPlayerIdx];
  const currentTeam = teamColor(currentTeamId);

  // ── VINCITORE ──
  if (phase === 'winner') {
    const allTeamIds = [...activePlayers];
    const sorted = [...allTeamIds].sort((a, b) => (wordCounts[b] ?? 0) - (wordCounts[a] ?? 0));
    const winnerTeam = activePlayers[0] != null ? teamColor(activePlayers[0]) : null;
    return (
      <div className="max-w-md w-full text-center">
        <Trophy className="w-20 h-20 text-retro-yellow mx-auto mb-6 animate-bounce" />
        <h2 className="text-5xl font-retro retro-title uppercase mb-2">VINCITORE!</h2>
        <p className="text-retro-cyan font-pixel text-sm uppercase mb-6">Classifica finale parole</p>
        {/* Classifica parole */}
        <div className="bg-black/40 border border-white/10 p-4 mb-6">
          <span className="text-[10px] font-pixel text-retro-yellow uppercase tracking-widest block mb-3">CLASSIFICA PAROLE</span>
          {sorted.map((tid, i) => {
            const tc = teamColor(tid);
            return (
                <div key={tid} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className={`font-pixel text-[10px] uppercase ${tc.text}`}>
                    {i + 1}. {tc.name}
                  </span>
                <span className="font-retro text-2xl text-white">
                  {wordCounts[tid] ?? 0}
                </span>
              </div>
            );
          })}
        </div>
        {role === 'regia' && (
          <div className="flex gap-3">
            <button onClick={startGame} className="retro-btn flex-1 text-base py-3 bg-retro-cyan">
              NUOVA CATEGORIA
            </button>
            <button onClick={resetGame} className="retro-btn px-4 py-3 bg-white/10 border border-white/20 text-sm">
              RESET
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── GIOCO ──
  return (
    <div className="max-w-2xl w-full">
      {/* Tema */}
      <div className="text-center mb-4">
        <span className="text-[10px] font-pixel text-retro-cyan uppercase tracking-widest block mb-1">CATEGORIA</span>
        <h2 className="text-3xl md:text-5xl font-retro uppercase tracking-tighter retro-title">{theme}</h2>
      </div>

      {/* Squadre con contatore parole */}
      <div className="flex gap-2 justify-center mb-4">
        {activePlayers.map((tid: number, idx: number) => {
          const tc = teamColor(tid);
          const isCurrent = idx === currentPlayerIdx;
          return (
            <div key={tid} className={`flex-1 p-3 border-2 text-center transition-all ${
              isCurrent
                ? `${tc.border} ${tc.bg} scale-105 shadow-[0_0_20px_rgba(255,255,255,0.1)]`
                : 'border-white/10 bg-black/20 opacity-50'
            }`}>
              <span className={`text-[9px] font-pixel uppercase tracking-widest block ${isCurrent ? tc.text : 'text-white/40'}`}>
                {isCurrent ? '▶ IN GIOCO' : 'ATTENDE'}
              </span>
              <span className={`font-retro text-base uppercase ${isCurrent ? tc.text : 'text-white/40'}`}>{tc.name}</span>
              <div className={`text-3xl font-retro mt-1 ${isCurrent ? 'text-white' : 'text-white/30'}`}>
                {wordCounts[tid] ?? 0}
              </div>
              <span className={`text-[8px] font-pixel uppercase ${isCurrent ? 'text-white/50' : 'text-white/20'}`}>parole</span>
            </div>
          );
        })}
        {eliminated.map((tid: number) => {
          const tc = teamColor(tid);
          return (
            <div key={tid} className="flex-1 p-3 border-2 border-red-500/20 bg-black/20 opacity-30 text-center">
              <span className="text-[9px] font-pixel text-red-400/50 uppercase tracking-widest block">OUT</span>
              <span className="font-retro text-base uppercase text-white/20 line-through">{tc.name}</span>
              <div className="text-3xl font-retro mt-1 text-white/20">{wordCounts[tid] ?? 0}</div>
              <span className="text-[8px] font-pixel uppercase text-white/20">parole</span>
            </div>
          );
        })}
      </div>

      {/* Timer */}
      <div className="text-center mb-4">
        <div className={`text-8xl font-retro tabular-nums ${
          localTimer <= 2 ? 'text-red-500 animate-pulse' :
          localTimer <= 3 ? 'text-retro-yellow' : 'text-white'
        }`}>{localTimer}</div>
        <span className="text-[10px] font-pixel text-white/40 uppercase tracking-widest">secondi</span>
      </div>
      
      {/* Controlli regia */}
      {role === 'regia' && (
        <div className="flex flex-col gap-2">
          {!isActive ? (
            <button onClick={startTurn} className="retro-btn w-full text-2xl py-5 bg-retro-yellow text-black">         
              VIA! ▶
            </button>
          ) : (
            <div className="flex gap-2">
              {/* +1 parola — bottone grande e prominente */}
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={addWord}
                className={`flex-1 py-5 border-4 text-black font-retro text-2xl uppercase ${currentTeam.bg} ${currentTeam.border}`}
                style={{ color: 'black' }}
              >
                +1 PAROLA
              </motion.button>
              {/* Passa turno */}
              <button onClick={passTurn} className="px-4 py-5 bg-white/10 border-2 border-white/20 font-pixel text-[9px] uppercase text-white/60 flex flex-col items-center justify-center gap-1">
                <span>PASSA</span>
                <ChevronLeft className="w-4 h-4 -rotate-90" />
              </button>
            </div>
          )}
          <div className="flex gap-2 mt-1">
            <button onClick={newCategory} className="retro-btn flex-1 py-2 bg-retro-cyan text-black text-sm">
              🔄 NUOVA CAT.
            </button>
            <button onClick={() => emitUpdate({ gameData: { ...sharedStateRef.current, isActive: false, phase: 'winner' } })} className="retro-btn flex-1 py-2 bg-retro-pink text-black text-sm">
              🏆 FINE
            </button>
            <button onClick={resetGame} className="retro-btn px-3 py-2 bg-white/5 border border-white/10 text-sm text-white/40">
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {role !== 'regia' && (
        <div className={`text-center p-4 border-2 border-dashed font-pixel text-[10px] uppercase ${
          isActive ? `${currentTeam.border} ${currentTeam.text} animate-pulse` : 'border-white/20 text-white/40'
        }`}>
          {isActive ? `${currentTeam.name} IN AZIONE!` : phase === 'eliminated' ? 'ELIMINAZIONE!' : 'In attesa del via...'}
        </div>
      )}
    </div>
  );
}

// --- GAME 5: CHI È? ---
function ChiE({ role, sharedState, emitUpdate, selectedTeamId, teams }: {
  role: 'regia' | 'pubblico' | 'display';
  sharedState: any;
  emitUpdate: (u: any) => void;
  selectedTeamId: number | null;
  teams: Team[];
}) {
  const [loading, setLoading] = useState(false);
  const [previewPersonaggi, setPreviewPersonaggi] = useState<{ name: string; hint: string }[]>([]);
  const [previewPhotos, setPreviewPhotos] = useState<Record<string, string | null>>({});
  const [previewMode, setPreviewMode] = useState(false);
  const [removedNames, setRemovedNames] = useState<Set<string>>(new Set());

  const personaggi = sharedState.personaggi || [];
  const currentIndex = sharedState.currentIndex ?? 0;
  const blurLevel = sharedState.blurLevel ?? 20;
  const revealed = sharedState.revealed || false;
  const photos = sharedState.photos || {};
  const buzzer: { teamId: number; teamName: string; teamColor: string; ts: number } | null = sharedState.buzzer || null;
  const buzzerWrong: number[] = sharedState.buzzerWrong || []; // teamId che hanno sbagliato su questo personaggio
  const currentPersonaggio = personaggi[currentIndex] || null;
  const currentPhoto = currentPersonaggio ? photos[currentPersonaggio.name] : null;

  const sharedStateRef = React.useRef(sharedState);
  sharedStateRef.current = sharedState;

  // ── SUONO BUZZER (effetto visivo/vibrazione sul dispositivo del pubblico) ──
  const prevBuzzerRef = React.useRef<any>(null);
  useEffect(() => {
    if (buzzer && !prevBuzzerRef.current && role === 'pubblico') {
      // Vibrazione breve se supportata
      if (navigator.vibrate) navigator.vibrate(200);
    }
    prevBuzzerRef.current = buzzer;
  }, [buzzer]);

  const startGame = async () => {
    if (role !== 'regia') return;
    setLoading(true);
    setPreviewMode(false);
    setRemovedNames(new Set());
    try {
      const lista = await geminiService.generateChiEPersonaggi();
      const photoEntries = await Promise.all(
        lista.map(async (p) => {
          const url = await geminiService.getWikipediaPhoto(p.name);
          return [p.name, url] as [string, string | null];
        })
      );
      const photosMap: Record<string, string | null> = Object.fromEntries(photoEntries);
      setPreviewPersonaggi(lista);
      setPreviewPhotos(photosMap);
      setPreviewMode(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleRemove = (name: string) => {
    setRemovedNames(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const confirmAndStart = () => {
    const filteredPersonaggi = previewPersonaggi.filter(p => !removedNames.has(p.name));
    const filteredPhotos: Record<string, string> = {};
    filteredPersonaggi.forEach(p => {
      if (previewPhotos[p.name]) filteredPhotos[p.name] = previewPhotos[p.name] as string;
    });
    emitUpdate({
      gameData: {
        ...sharedState,
        personaggi: filteredPersonaggi,
        photos: filteredPhotos,
        currentIndex: 0,
        blurLevel: 20,
        revealed: false,
        buzzer: null,
        buzzerWrong: [],
      }
    });
    setPreviewMode(false);
  };

  const decreaseBlur = () => {
    if (role !== 'regia' || revealed) return;
    const newBlur = Math.max(0, blurLevel - 5);
    emitUpdate({ gameData: { ...sharedStateRef.current, blurLevel: newBlur } });
  };

  const revealAnswer = () => {
    if (role !== 'regia') return;
    emitUpdate({ gameData: { ...sharedStateRef.current, revealed: true, blurLevel: 0, buzzer: null } });
  };

  const nextPersonaggio = () => {
    if (role !== 'regia') return;
    emitUpdate({
      gameData: {
        ...sharedStateRef.current,
        currentIndex: currentIndex + 1,
        blurLevel: 20,
        revealed: false,
        buzzer: null,
        buzzerWrong: [],
      }
    });
  };

  // Pubblico preme il buzzer
  const pressBuzzer = () => {
    if (role !== 'pubblico' || selectedTeamId === null) return;
    const latest = sharedStateRef.current;
    // Non premere se: già rivelato, buzzer già preso da qualcuno, hai già sbagliato su questo personaggio
    if (latest.revealed || latest.buzzer || (latest.buzzerWrong || []).includes(selectedTeamId)) return;
    const myTeam = teams.find(t => t.id === selectedTeamId);
    if (!myTeam) return;
    emitUpdate({
      gameData: {
        ...latest,
        buzzer: { teamId: selectedTeamId, teamName: myTeam.name, teamColor: myTeam.color, ts: Date.now() }
      }
    });
  };

  // Regia: risposta esatta → punto + avanti
  const buzzerCorrect = () => {
    if (role !== 'regia' || !buzzer) return;
    emitUpdate({
      gameData: {
        ...sharedStateRef.current,
        revealed: true,
        blurLevel: 0,
        buzzer: null,
      }
    });
  };

  // Regia: risposta sbagliata → azzera buzzer, team finisce in buzzerWrong
  const buzzerWrongAnswer = () => {
    if (role !== 'regia' || !buzzer) return;
    const latest = sharedStateRef.current;
    emitUpdate({
      gameData: {
        ...latest,
        buzzer: null,
        buzzerWrong: [...(latest.buzzerWrong || []), buzzer.teamId],
      }
    });
  };

  if (loading) return <LoadingState text="Cerco i personaggi su Wikipedia..." />;

  // ── ANTEPRIMA REGIA ──
  if (previewMode && role === 'regia') {
    const attivi = previewPersonaggi.filter(p => !removedNames.has(p.name));
    return (
      <div className="max-w-4xl w-full">
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="text-[9px] font-pixel text-green-400 uppercase tracking-widest block mb-1">ANTEPRIMA REGIA</span>
            <h2 className="text-4xl font-retro uppercase retro-title text-green-400">Verifica Personaggi</h2>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-pixel text-retro-yellow uppercase tracking-widest block">SELEZIONATI</span>
            <span className="text-3xl font-retro text-white">{attivi.length}/{previewPersonaggi.length}</span>
          </div>
        </div>
        <p className="font-pixel text-[10px] text-retro-cyan/70 uppercase tracking-widest mb-6">
          Clicca su un personaggio per escluderlo. Quelli senza foto verranno mostrati con icona utente.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
          {previewPersonaggi.map((p) => {
            const removed = removedNames.has(p.name);
            const photo = previewPhotos[p.name];
            return (
              <div
                key={p.name}
                onClick={() => toggleRemove(p.name)}
                className={`relative cursor-pointer border-2 transition-all duration-200 ${
                  removed ? 'border-red-500/60 opacity-40 scale-95' : 'border-green-500/40 hover:border-green-400 hover:scale-105'
                }`}
                style={{ aspectRatio: '3/4' }}
              >
                {photo ? (
                  <img src={photo} alt={p.name} className="w-full h-full object-cover object-top" />
                ) : (
                  <div className="w-full h-full bg-[#000044] flex flex-col items-center justify-center gap-2">
                    <User className="w-8 h-8 text-retro-cyan/30" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-1 py-1.5">
                  <p className="font-pixel text-[7px] text-white uppercase text-center leading-tight truncate">{p.name}</p>
                  <p className="font-pixel text-[6px] text-retro-cyan/60 uppercase text-center leading-tight truncate">{p.hint}</p>
                </div>
                {removed && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-red-500" />
                  </div>
                )}
                {!photo && !removed && (
                  <div className="absolute top-1 right-1">
                    <AlertCircle className="w-4 h-4 text-retro-yellow" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={confirmAndStart}
            disabled={attivi.length === 0}
            className="retro-btn flex-1 py-3 bg-green-500 text-black text-lg flex items-center justify-center gap-3 disabled:opacity-40"
          >
            <Play className="w-5 h-5" /> CONFERMA E INIZIA ({attivi.length} personaggi)
          </button>
          <button
            onClick={() => { setPreviewMode(false); startGame(); }}
            className="retro-btn px-6 py-3 bg-black border-2 border-retro-cyan text-retro-cyan text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> RIGENERA
          </button>
        </div>
      </div>
    );
  }

  // ── FINE GIOCO ──
  if (personaggi.length > 0 && currentIndex >= personaggi.length) {
    return (
      <div className="text-center max-w-md w-full">
        <Trophy className="w-24 h-24 text-retro-yellow mx-auto mb-8 animate-bounce" />
        <h2 className="text-6xl font-retro retro-title mb-4">FINE!</h2>
        <p className="text-retro-cyan font-pixel text-sm uppercase mb-12">Tutti i personaggi sono stati mostrati!</p>
        {role === 'regia' && (
          <button onClick={startGame} className="retro-btn w-full text-lg py-3 bg-retro-pink">
            NUOVA PARTITA
          </button>
        )}
      </div>
    );
  }

  // ── SCHERMATA DI GIOCO ──
  if (personaggi.length > 0 && currentPersonaggio) {
    const allTeamsWrong = teams.length > 0 && teams.every(t => buzzerWrong.includes(t.id));

    return (
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-xs font-pixel text-retro-cyan uppercase tracking-widest block mb-1">
              PERSONAGGIO {currentIndex + 1}/{personaggi.length}
            </span>
            <h2 className="text-3xl font-retro uppercase tracking-tight retro-title text-green-400">Chi È?</h2>
          </div>
          <div className="text-right">
            <span className="text-xs font-pixel text-retro-yellow uppercase tracking-widest block">SFOCATURA</span>
            <div className="text-2xl font-retro text-white">{blurLevel}px</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Foto */}
          <div className="relative overflow-hidden border-4 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.2)]" style={{ aspectRatio: '1/1' }}>
            {currentPhoto ? (
              <img
                src={currentPhoto}
                alt="Chi è?"
                className="w-full h-full object-cover object-top transition-all duration-700"
                style={{ filter: `blur(${blurLevel}px) brightness(0.95)`, transform: blurLevel > 0 ? 'scale(1.15)' : 'scale(1)' }}
              />
            ) : (
              <div className="w-full h-full bg-[#000044] flex items-center justify-center">
                <User className="w-24 h-24 text-retro-cyan/30" />
              </div>
            )}
            {blurLevel > 0 && !revealed && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/40 backdrop-blur-sm px-4 py-2 border border-white/10">
                  <span className="font-pixel text-[10px] text-white/60 uppercase tracking-widest">
                    {blurLevel > 15 ? '???' : blurLevel > 10 ? 'quasi...' : 'quasi ci sei!'}
                  </span>
                </div>
              </div>
            )}
            {revealed && (
              <div className="absolute bottom-0 left-0 right-0 bg-green-500 py-3 text-center">
                <span className="font-retro text-black text-xl uppercase tracking-tight">{currentPersonaggio.name}</span>
              </div>
            )}
          </div>

          {/* Pannello laterale */}
          <div className="flex flex-col gap-3">
            {/* Indizio */}
            <div className="bg-[#000044] border border-retro-cyan/20 p-3">
              <span className="text-[9px] font-pixel text-retro-cyan uppercase tracking-widest block mb-1">INDIZIO</span>
              <p className="font-mono text-white uppercase text-base">{currentPersonaggio.hint}</p>
            </div>

            {/* BUZZER attivo — chi ha premuto */}
            {buzzer && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`p-4 border-4 text-center ${
                  buzzer.teamColor === 'bg-retro-pink' ? 'border-retro-pink bg-retro-pink/20' :
                  buzzer.teamColor === 'bg-retro-cyan' ? 'border-retro-cyan bg-retro-cyan/20' :
                  'border-retro-yellow bg-retro-yellow/20'
                }`}
              >
                <span className="text-[10px] font-pixel uppercase tracking-widest block mb-1 text-white/60">HA PREMUTO</span>
                <span className={`text-2xl font-retro uppercase ${
                  buzzer.teamColor === 'bg-retro-pink' ? 'text-retro-pink' :
                  buzzer.teamColor === 'bg-retro-cyan' ? 'text-retro-cyan' :
                  'text-retro-yellow'
                }`}>{buzzer.teamName}</span>

                {/* Bottoni regia per giudicare */}
                {role === 'regia' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={buzzerCorrect}
                      className="flex-1 py-2 bg-green-500 text-black font-pixel text-[10px] uppercase flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="w-4 h-4" /> ESATTO
                    </button>
                    <button
                      onClick={buzzerWrongAnswer}
                      className="flex-1 py-2 bg-retro-pink text-black font-pixel text-[10px] uppercase flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-4 h-4" /> SBAGLIATO
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Squadre che hanno già sbagliato */}
            {buzzerWrong.length > 0 && (
              <div className="bg-black/30 border border-white/10 p-2">
                <span className="text-[9px] font-pixel text-white/40 uppercase tracking-widest block mb-1">HANNO SBAGLIATO</span>
                <div className="flex flex-wrap gap-2">
                  {buzzerWrong.map(tid => {
                    const t = teams.find(t => t.id === tid);
                    if (!t) return null;
                    return (
                      <span key={tid} className={`text-[9px] font-pixel uppercase px-2 py-0.5 bg-black/40 line-through ${
                        t.color === 'bg-retro-pink' ? 'text-retro-pink/50' :
                        t.color === 'bg-retro-cyan' ? 'text-retro-cyan/50' : 'text-retro-yellow/50'
                      }`}>{t.name}</span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* BUZZER pubblico — bottone grande */}
            {role === 'pubblico' && selectedTeamId !== null && !revealed && (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                {buzzerWrong.includes(selectedTeamId) ? (
                  <div className="w-full py-4 bg-black/40 border-2 border-white/10 text-center">
                    <XCircle className="w-8 h-8 text-retro-pink/50 mx-auto mb-1" />
                    <span className="font-pixel text-[10px] text-white/40 uppercase">Hai già sbagliato</span>
                  </div>
                ) : buzzer && buzzer.teamId !== selectedTeamId ? (
                  <div className="w-full py-4 bg-black/40 border-2 border-white/10 text-center">
                    <span className="font-pixel text-[10px] text-white/40 uppercase">Buzzer preso da {buzzer.teamName}</span>
                  </div>
                ) : buzzer && buzzer.teamId === selectedTeamId ? (
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="w-full py-6 bg-green-500/20 border-4 border-green-500 text-center"
                  >
                    <span className="font-retro text-2xl text-green-400 uppercase">Parla!</span>
                  </motion.div>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={pressBuzzer}
                    className="w-full py-8 bg-retro-pink border-4 border-retro-pink text-black font-retro text-3xl uppercase shadow-[0_0_40px_rgba(255,0,255,0.5)] active:shadow-none transition-all"
                  >
                    🔔 BUZZER!
                  </motion.button>
                )}
              </div>
            )}

            {/* Controlli regia */}
            {role === 'regia' && !buzzer && (
              <div className="flex flex-col gap-2">
                {!revealed ? (
                  <>
                    <button
                      onClick={decreaseBlur}
                      disabled={blurLevel === 0}
                      className="retro-btn py-2 bg-retro-yellow text-black disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
                    >
                      <Eye className="w-4 h-4" /> RIVELA UN PO' ({blurLevel > 0 ? `-5px` : 'max'})
                    </button>
                    <button
                      onClick={revealAnswer}
                      className="retro-btn py-2 bg-green-500 text-black flex items-center justify-center gap-2 text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" /> RIVELA RISPOSTA
                    </button>
                    {buzzerWrong.length > 0 && (
                      <button
                        onClick={() => emitUpdate({ gameData: { ...sharedStateRef.current, buzzerWrong: [] } })}
                        className="retro-btn py-2 bg-retro-purple text-white text-sm flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" /> RIAPRI BUZZER
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={nextPersonaggio}
                    className="retro-btn py-2 bg-retro-cyan text-black text-sm"
                  >
                    PROSSIMO PERSONAGGIO {'>>'}
                  </button>
                )}
              </div>
            )}

            {/* Regia: dopo aver giudicato il buzzer e rivelato */}
            {role === 'regia' && revealed && (
              <button
                onClick={nextPersonaggio}
                className="retro-btn py-2 bg-retro-cyan text-black text-sm"
              >
                PROSSIMO PERSONAGGIO {'>>'}
              </button>
            )}

            {/* Display */}
            {role === 'display' && !revealed && (
              <div className="bg-black/20 border border-white/10 p-4 text-center">
                <span className="font-pixel text-[10px] text-white/40 uppercase tracking-widest">In attesa...</span>
              </div>
            )}

            {revealed && role !== 'regia' && (
              <div className="bg-green-500/10 border border-green-500 p-4 text-center">
                <span className="font-retro text-green-400 text-2xl uppercase">{currentPersonaggio.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── SCHERMATA INIZIALE ──
  return (
    <div className="max-w-md w-full text-center">
      <User className="w-20 h-20 text-green-400 mx-auto mb-8" />
      <h2 className="text-6xl font-retro retro-title uppercase mb-4 text-green-400">Chi È?</h2>
      <p className="text-retro-cyan font-mono text-sm mb-10 uppercase leading-tight tracking-widest">
        5 PERSONAGGI, DIFFICOLTÀ VARIABILE. PREMI IL BUZZER E RISPONDI!
      </p>
      {role === 'regia' ? (
        <button
          onClick={startGame}
          className="retro-btn w-full text-lg py-3 bg-green-500 text-black flex items-center justify-center gap-4"
        >
          <Play className="w-6 h-6" /> INIZIA SFIDA
        </button>
      ) : (
        <div className="text-center p-4 border-2 border-dashed border-retro-yellow text-retro-yellow font-pixel text-[10px] uppercase">
          In attesa che la regia inizi la sfida...
        </div>
      )}
    </div>
  );
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="text-center">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-8"
      />
      <p className="text-xl font-mono uppercase tracking-widest text-zinc-500 animate-pulse">{text}</p>
    </div>
  );
}
