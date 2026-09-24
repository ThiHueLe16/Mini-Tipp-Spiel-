import React, { useState, useEffect } from 'react';
import {
  getMatches, getLeaderboard, submitPrediction,
  getQueueStatus, joinTrikotQueue, registerUser,
  loginUser, createMatch, updateMatchScore, evaluateMatch,
  getUserPredictions
} from './api/client';
import { Trophy, Shield, Clock, Users, LogOut, PlusCircle, CheckCircle, UserCheck } from 'lucide-react';

export default function App() {
  // Session & User State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('app_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthMode, setIsAuthMode] = useState('login'); // 'login' or 'register'
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState('USER'); // 'USER' or 'ADMIN'

  // App Navigation
  const [activeTab, setActiveTab] = useState('matches');
  const [matches, setMatches] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [predictions, setPredictions] = useState({});

  // Admin Form State
  const [newHomeTeam, setNewHomeTeam] = useState('');
  const [newAwayTeam, setNewAwayTeam] = useState('');
  const [newKickoff, setNewKickoff] = useState('');
  const [scoreInputs, setScoreInputs] = useState({});

  // Queue State
  const [queueStatus, setQueueStatus] = useState(null);
  const [inQueue, setInQueue] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchMatches();
      fetchLeaderboard();
      fetchUserPredictions(currentUser.id);
    }
  }, [currentUser]);

  // Queue polling
  useEffect(() => {
    let interval;
    if (inQueue && currentUser) {
      interval = setInterval(async () => {
        try {
          const res = await getQueueStatus(currentUser.id);
          setQueueStatus(res.data);
        } catch (err) {
          console.error('Queue polling error', err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [inQueue, currentUser]);

  const fetchMatches = async () => {
    try {
      const res = await getMatches();
      setMatches(res.data);
    } catch (err) {
      console.error('Failed to fetch matches', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await getLeaderboard();
      setLeaderboard(res.data);
    } catch (err) {
      console.error('Failed to fetch leaderboard', err);
    }
  };

  const fetchUserPredictions = async (userId) => {
    try {
      const res = await getUserPredictions(userId);
      const predictionMap = {};
      res.data.forEach((p) => {
        const matchId = p.match ? p.match.id : p.matchId;
        predictionMap[matchId] = {
          home: p.predictedHomeGoals,
          away: p.predictedAwayGoals
        };
      });
      setPredictions(predictionMap);
    } catch (err) {
      console.error('Failed to fetch user predictions', err);
    }
  };

  // Auth Handlers
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isAuthMode === 'register') {
        const res = await registerUser({ username: usernameInput, email: emailInput, role: roleInput });
        const user = res.data;
        setCurrentUser(user);
        localStorage.setItem('app_user', JSON.stringify(user));
      } else {
        const res = await loginUser(usernameInput);
        const user = res.data;
        if (!user) return alert('User not found! Please register first.');
        setCurrentUser(user);
        localStorage.setItem('app_user', JSON.stringify(user));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('app_user');
  };

  // User Handlers
  const handlePredictSubmit = async (matchId) => {
    const pred = predictions[matchId] || { home: 0, away: 0 };
    try {
      await submitPrediction({
        userId: currentUser.id,
        matchId: matchId,
        predictedHomeGoals: parseInt(pred.home || 0, 10),
        predictedAwayGoals: parseInt(pred.away || 0, 10)
      });
      alert('Prediction submitted successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error submitting prediction');
    }
  };

  const handleJoinQueue = async () => {
    try {
      const res = await joinTrikotQueue(currentUser.id);
      setQueueStatus(res.data);
      setInQueue(true);
    } catch (err) {
      alert('Error joining queue');
    }
  };

  // Admin Handlers
  const handleCreateMatch = async (e) => {
    e.preventDefault();
    try {
      await createMatch({
        homeTeam: newHomeTeam,
        awayTeam: newAwayTeam,
        kickoffTime: new Date(newKickoff).toISOString()
      });
      alert('Match created successfully!');
      setNewHomeTeam(''); setNewAwayTeam(''); setNewKickoff('');
      fetchMatches();
    } catch (err) {
      alert('Failed to create match');
    }
  };

  const handleUpdateAndEvaluate = async (matchId) => {
    const score = scoreInputs[matchId];

    // Safely check that inputs are non-empty strings or valid numbers (supports goal count of 0)
    if (!score || score.home === undefined || score.away === undefined || score.home === '' || score.away === '') {
      return alert('Enter home and away scores first');
    }

    try {
      // 1. Update Match Score using backend entity property names: finalHomeGoals / finalAwayGoals
      await updateMatchScore(matchId, {
        finalHomeGoals: parseInt(score.home, 10),
        finalAwayGoals: parseInt(score.away, 10)
      });

      // 2. Evaluate Match Predictions and update leaderboard
      await evaluateMatch(matchId);

      alert('Match score updated and points evaluated successfully!');
      fetchMatches();
      fetchLeaderboard();
    } catch (err) {
      console.error('Update & Evaluate failed:', err);
      const backendMessage = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null);
      alert(`Failed to update match score: ${backendMessage || err.message}`);
    }
  };

  // -------------------------------------------------------------
  // RENDER LOGIN / REGISTER VIEW
  // -------------------------------------------------------------
  if (!currentUser) {
    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-slate-100">
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <Trophy className="w-12 h-12 text-yellow-400 mx-auto" />
              <h1 className="text-2xl font-bold">MiniTippSpiel</h1>
              <p className="text-slate-400 text-sm">Sign in or create an account to start tipping</p>
            </div>

            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
              <button
                  onClick={() => setIsAuthMode('login')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${isAuthMode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
              >
                Log In
              </button>
              <button
                  onClick={() => setIsAuthMode('register')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${isAuthMode === 'register' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase">Username</label>
                <input
                    type="text" required
                    value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="e.g. alex24"
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {isAuthMode === 'register' && (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase">Email Address</label>
                      <input
                          type="email" required
                          value={emailInput} onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="alex@example.com"
                          className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase">Account Type</label>
                      <select
                          value={roleInput} onChange={(e) => setRoleInput(e.target.value)}
                          className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="USER">Standard User (Player)</option>
                        <option value="ADMIN">Admin (Manage Matches & Scoring)</option>
                      </select>
                    </div>
                  </>
              )}

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-bold py-3 rounded-lg transition mt-2">
                {isAuthMode === 'login' ? 'Log In' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER MAIN DASHBOARD VIEW
  // -------------------------------------------------------------
  return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 p-4">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Trophy className="text-yellow-400 w-8 h-8" />
              <div>
                <h1 className="text-xl font-bold text-blue-400">MiniTippSpiel</h1>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <UserCheck className="w-3 h-3 text-emerald-400" />
                  <span>{currentUser.username}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${currentUser.role === 'ADMIN' ? 'bg-purple-900 text-purple-300' : 'bg-slate-700 text-slate-300'}`}>
                  {currentUser.role || 'USER'}
                </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                  onClick={() => setActiveTab('matches')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'matches' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                Matches
              </button>
              <button
                  onClick={() => setActiveTab('leaderboard')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'leaderboard' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                Leaderboard
              </button>
              <button
                  onClick={() => setActiveTab('trikot')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'trikot' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                Trikot Queue
              </button>

              {currentUser.role === 'ADMIN' && (
                  <button
                      onClick={() => setActiveTab('admin')}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'admin' ? 'bg-purple-600 text-white' : 'bg-purple-900/60 text-purple-300 border border-purple-700'}`}
                  >
                    Admin Panel
                  </button>
              )}

              <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg bg-red-900/40 hover:bg-red-800 text-red-300 border border-red-700 ml-2"
                  title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto p-6">
          {/* MATCHES TAB */}
          {activeTab === 'matches' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-200 mb-4">Upcoming & Live Matches</h2>
                {matches.length === 0 ? (
                    <p className="text-slate-400">No matches available right now.</p>
                ) : (
                    matches.map((m) => (
                        <div key={m.id} className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                          <div className="flex items-center gap-6 text-lg font-semibold w-full md:w-auto justify-between md:justify-start">
                            <span className="w-28 text-right">{m.homeTeam}</span>
                            <span className="bg-slate-700 px-3 py-1 rounded text-sm text-slate-300">
                      {m.finalHomeGoals !== null && m.finalAwayGoals !== null && m.finalHomeGoals !== undefined && m.finalAwayGoals !== undefined
                          ? `${m.finalHomeGoals} : ${m.finalAwayGoals}`
                          : 'VS'}
                    </span>
                            <span className="w-28 text-left">{m.awayTeam}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <input
                                type="number" min="0" placeholder="0"
                                value={predictions[m.id]?.home ?? ''}
                                className="w-14 bg-slate-900 border border-slate-600 rounded p-2 text-center text-white"
                                onChange={(e) => setPredictions({
                                  ...predictions,
                                  [m.id]: { ...predictions[m.id], home: e.target.value }
                                })}
                            />
                            <span>:</span>
                            <input
                                type="number" min="0" placeholder="0"
                                value={predictions[m.id]?.away ?? ''}
                                className="w-14 bg-slate-900 border border-slate-600 rounded p-2 text-center text-white"
                                onChange={(e) => setPredictions({
                                  ...predictions,
                                  [m.id]: { ...predictions[m.id], away: e.target.value }
                                })}
                            />
                            <button
                                onClick={() => handlePredictSubmit(m.id)}
                                className="ml-4 bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg font-medium transition"
                            >
                              {predictions[m.id] ? 'Update' : 'Predict'}
                            </button>
                          </div>
                        </div>
                    ))
                )}
              </div>
          )}

          {/* LEADERBOARD TAB */}
          {activeTab === 'leaderboard' && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h2 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2">
                  <Users className="text-blue-400" /> Leaderboard
                </h2>
                <table className="w-full text-left border-collapse">
                  <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="p-3">Rank</th>
                    <th className="p-3">Username</th>
                    <th className="p-3">Total Points</th>
                  </tr>
                  </thead>
                  <tbody>
                  {leaderboard.map((u, idx) => (
                      <tr key={u.id} className={`border-b border-slate-700/50 ${u.id === currentUser.id ? 'bg-blue-900/30 font-bold' : ''}`}>
                        <td className="p-3 text-slate-400">#{idx + 1}</td>
                        <td className="p-3 text-slate-100">{u.username} {u.id === currentUser.id && '(You)'}</td>
                        <td className="p-3 text-emerald-400">{u.totalPoints || 0} pts</td>
                      </tr>
                  ))}
                  </tbody>
                </table>
              </div>
          )}

          {/* TRIKOT QUEUE TAB */}
          {activeTab === 'trikot' && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center max-w-lg mx-auto space-y-6">
                <Shield className="w-16 h-16 text-yellow-400 mx-auto" />
                <h2 className="text-2xl font-bold">Limited Trikot Promotion</h2>
                <p className="text-slate-400">Enter the live waiting room to claim your jersey!</p>

                {!inQueue ? (
                    <button onClick={handleJoinQueue} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition">
                      Enter Waiting Room
                    </button>
                ) : (
                    <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 space-y-3">
                      <div className="flex justify-center items-center gap-2 text-slate-400">
                        <Clock className="animate-spin text-blue-400" /> Live Status
                      </div>
                      {queueStatus?.canAccessSubmissionPage ? (
                          <p className="text-emerald-400 font-bold text-lg">It's your turn! Pass token granted.</p>
                      ) : (
                          <div>
                            <p className="text-3xl font-bold text-blue-400">#{queueStatus?.position || '...'}</p>
                            <p className="text-sm text-slate-400">Your position in line</p>
                          </div>
                      )}
                    </div>
                )}
              </div>
          )}

          {/* ADMIN PANEL TAB */}
          {activeTab === 'admin' && currentUser.role === 'ADMIN' && (
              <div className="space-y-8">
                {/* Create Match */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
                  <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2">
                    <PlusCircle className="w-5 h-5" /> Schedule New Match
                  </h3>
                  <form onSubmit={handleCreateMatch} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="text" placeholder="Home Team (e.g. Bayern)" required value={newHomeTeam}
                        onChange={(e) => setNewHomeTeam(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded p-2 text-white"
                    />
                    <input
                        type="text" placeholder="Away Team (e.g. Dortmund)" required value={newAwayTeam}
                        onChange={(e) => setNewAwayTeam(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded p-2 text-white"
                    />
                    <input
                        type="datetime-local" required value={newKickoff}
                        onChange={(e) => setNewKickoff(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded p-2 text-white"
                    />
                    <button type="submit" className="md:col-span-3 bg-purple-600 hover:bg-purple-500 font-bold py-2 rounded transition">
                      Create Match
                    </button>
                  </form>
                </div>

                {/* Evaluate Match */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
                  <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" /> Evaluate Match Scores & Award Points
                  </h3>
                  {matches.map((m) => (
                      <div key={m.id} className="bg-slate-900 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
                        <span className="font-semibold">{m.homeTeam} vs {m.awayTeam}</span>
                        <div className="flex items-center gap-2">
                          <input
                              type="number" min="0" placeholder="Home" className="w-16 bg-slate-800 border border-slate-700 p-2 text-center rounded text-white"
                              value={scoreInputs[m.id]?.home ?? ''}
                              onChange={(e) => setScoreInputs({ ...scoreInputs, [m.id]: { ...scoreInputs[m.id], home: e.target.value } })}
                          />
                          <span>:</span>
                          <input
                              type="number" min="0" placeholder="Away" className="w-16 bg-slate-800 border border-slate-700 p-2 text-center rounded text-white"
                              value={scoreInputs[m.id]?.away ?? ''}
                              onChange={(e) => setScoreInputs({ ...scoreInputs, [m.id]: { ...scoreInputs[m.id], away: e.target.value } })}
                          />
                          <button
                              onClick={() => handleUpdateAndEvaluate(m.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded font-bold transition text-sm ml-2"
                          >
                            Save Score & Evaluate
                          </button>
                        </div>
                      </div>
                  ))}
                </div>
              </div>
          )}
        </main>
      </div>
  );
}