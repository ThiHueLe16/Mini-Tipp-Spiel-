import React, { useState, useEffect } from 'react';
import {
  getMatches, getLeaderboard, submitPrediction,
  getQueueStatus, joinTrikotQueue, registerUser,
  loginUser, createMatch, updateMatchScore, evaluateMatch,
  getUserPredictions
} from './api/client';

// Line 10 — Add UserCheck to the import
import { Trash2, Users, Shield, Clock, PlusCircle, Play, Square, CheckSquare, Activity, X, UserCheck, Trophy, LogOut, Award } from 'lucide-react';

export default function App() {
  // Session & User State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('app_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthMode, setIsAuthMode] = useState('login');
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState('USER');

  // App Navigation & Data
  const [activeTab, setActiveTab] = useState('matches');
  const [matches, setMatches] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [now, setNow] = useState(new Date());

  // Store Match Events locally / in memory per match: { [matchId]: [ { minute, type, team, player, text } ] }
  const [matchEvents, setMatchEvents] = useState(() => {
    const saved = localStorage.getItem('app_match_events');
    return saved ? JSON.parse(saved) : {};
  });

  // Manual status override state for Admin (e.g., 'FINISHED' or 'LIVE')
  const [matchStatusOverrides, setMatchStatusOverrides] = useState(() => {
    const saved = localStorage.getItem('app_status_overrides');
    return saved ? JSON.parse(saved) : {};
  });

  // Selected Match for Timeline Modal
  const [selectedMatchForTimeline, setSelectedMatchForTimeline] = useState(null);

  // Admin Form State
  const [newHomeTeam, setNewHomeTeam] = useState('');
  const [newAwayTeam, setNewAwayTeam] = useState('');
  const [newKickoff, setNewKickoff] = useState('');
  const [scoreInputs, setScoreInputs] = useState({});

  // Admin Event Logging Form State (keyed by match ID)
  const [eventInputs, setEventInputs] = useState({});
  const handleEventInputChange = (matchId, field, value) => {
    setEventInputs((prev) => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] || {team: 'HOME', type: 'GOAL', player: '', minute: ''}),
        [field]: value,
      },
    }));
  };

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

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('app_match_events', JSON.stringify(matchEvents));
  }, [matchEvents]);

  useEffect(() => {
    localStorage.setItem('app_status_overrides', JSON.stringify(matchStatusOverrides));
  }, [matchStatusOverrides]);

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

      const initialScores = {};
      res.data.forEach((m) => {
        initialScores[m.id] = {
          home: m.finalHomeGoals !== null && m.finalHomeGoals !== undefined ? m.finalHomeGoals : '',
          away: m.finalAwayGoals !== null && m.finalAwayGoals !== undefined ? m.finalAwayGoals : ''
        };
      });
      setScoreInputs(initialScores);
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
          away: p.predictedAwayGoals,
          pointsEarned: p.pointsEarned ?? p.points ?? null
        };
      });
      setPredictions(predictionMap);
    } catch (err) {
      console.error('Failed to fetch user predictions', err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isAuthMode === 'register') {
        const res = await registerUser({username: usernameInput, email: emailInput, role: roleInput});
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

  const getMatchTimeStatus = (match) => {
    if (!match?.kickoffTime) return {
      status: 'NO_KICKOFF',
      text: 'Noch nicht gestartet',
      isStarted: false,
      elapsedMinutes: 0
    };

    // Check if admin manually forced a status
    const override = matchStatusOverrides[match.id];
    if (override === 'FINISHED') {
      return {status: 'FINISHED', text: 'Finished (FT)', isStarted: true, elapsedMinutes: 90};
    }

    const kickoff = new Date(match.kickoffTime);
    const diffInMs = now - kickoff;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInMinutes < 0) {
      return {status: 'NOT_STARTED', text: 'Noch nicht gestartet', isStarted: false, elapsedMinutes: 0};
    } else if (diffInMinutes <= 90 || override === 'LIVE') {
      return {status: 'LIVE', text: `Live: ${diffInMinutes}'`, isStarted: true, elapsedMinutes: diffInMinutes};
    } else {
      return {status: 'FINISHED', text: 'Finished (FT)', isStarted: true, elapsedMinutes: 90};
    }
  };

  const calculatePoints = (predHome, predAway, finalHome, finalAway) => {
    if (predHome === undefined || predAway === undefined || finalHome === null || finalAway === null || finalHome === undefined || finalAway === undefined) {
      return null;
    }

    const pH = parseInt(predHome, 10);
    const pA = parseInt(predAway, 10);
    const fH = parseInt(finalHome, 10);
    const fA = parseInt(finalAway, 10);

    if (pH === fH && pA === fA) return 3;

    const predDiff = pH - pA;
    const finalDiff = fH - fA;

    if ((predDiff > 0 && finalDiff > 0) || (predDiff < 0 && finalDiff < 0) || (predDiff === 0 && finalDiff === 0)) {
      return 1;
    }

    return 0;
  };

  const handlePredictSubmit = async (match) => {
    const timeStatus = getMatchTimeStatus(match);
    if (timeStatus.isStarted) {
      alert('The match has already started! You can no longer modify or submit predictions.');
      return;
    }

    const pred = predictions[match.id] || {home: 0, away: 0};
    try {
      await submitPrediction({
        userId: currentUser.id,
        matchId: match.id,
        predictedHomeGoals: parseInt(pred.home || 0, 10),
        predictedAwayGoals: parseInt(pred.away || 0, 10)
      });
      alert('Prediction submitted successfully!');
      fetchUserPredictions(currentUser.id);
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

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    try {
      await createMatch({
        homeTeam: newHomeTeam,
        awayTeam: newAwayTeam,
        kickoffTime: new Date(newKickoff).toISOString()
      });
      alert('Match created successfully!');
      setNewHomeTeam('');
      setNewAwayTeam('');
      setNewKickoff('');
      fetchMatches();
    } catch (err) {
      alert('Failed to create match');
    }
  };
  const handleDeleteMatch = async (matchId) => {
    if (!window.confirm('Are you sure you want to delete this match?')) return;
    try {
      // Add your API call here if available, e.g., await deleteMatch(matchId);
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      alert('Match deleted successfully!');
    } catch (err) {
      alert('Failed to delete match');
    }
  };

  const handleUpdateAndEvaluate = async (matchId) => {
    const score = scoreInputs[matchId];

    if (!score || score.home === undefined || score.away === undefined || score.home === '' || score.away === '') {
      return alert('Enter home and away scores first');
    }

    try {
      await updateMatchScore(matchId, {
        finalHomeGoals: parseInt(score.home, 10),
        finalAwayGoals: parseInt(score.away, 10)
      });

      await evaluateMatch(matchId);

      alert('Match score updated and points evaluated successfully!');
      fetchMatches();
      fetchLeaderboard();
      fetchUserPredictions(currentUser.id);
    } catch (err) {
      console.error('Update & Evaluate failed:', err);
      const backendMessage = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null);
      alert(`Failed to update match score: ${backendMessage || err.message}`);
    }
  };

  const toggleMatchFinishState = (matchId) => {
    const currentStatus = matchStatusOverrides[matchId];
    const newStatus = currentStatus === 'FINISHED' ? 'LIVE' : 'FINISHED';
    setMatchStatusOverrides({
      ...matchStatusOverrides,
      [matchId]: newStatus
    });
  };

  const handleAddMatchEvent = (match) => {
    // 1. Get the inputs specific to this match (or fall back to defaults)
    const status = getMatchTimeStatus(match);
    if (status.status === 'FINISHED' || matchStatusOverrides[match.id] === 'FINISHED') {
      return alert('This match is finished. Events cannot be logged for finished matches.');
    }
    const input = eventInputs[match.id] || {};
    const player = input.player || '';
    const team = input.team || 'HOME';
    const type = input.type || 'GOAL';

    if (!player.trim()) return alert('Please enter a player name');


    // Allow string minutes like "45+2" or parse numbers
    const minute = input.minute ? input.minute : Math.max(1, status.elapsedMinutes);
    const teamName = team === 'HOME' ? match.homeTeam : match.awayTeam;

    // 2. Generate event text
    let text = '';
    if (type === 'GOAL') text = `GOAL! ${player} scores for ${teamName}!`;
    else if (type === 'YELLOW_CARD') text = `Yellow Card issued to ${player} (${teamName})`;
    else if (type === 'RED_CARD') text = `RED CARD! ${player} (${teamName}) is sent off!`;
    else if (type === 'SUB') text = `Substitution for ${teamName}: ${player}`;
    else if (type === 'PENALTY') text = `Penalty awarded to ${teamName} (${player})`;

    const eventObj = {
      id: Date.now(),
      minute,
      type,
      team: teamName,
      player,
      text
    };

    const existingEvents = matchEvents[match.id] || [];
    const updatedEvents = [...existingEvents, eventObj].sort((a, b) => {
      return parseInt(a.minute, 10) - parseInt(b.minute, 10);
    });

    setMatchEvents({
      ...matchEvents,
      [match.id]: updatedEvents
    });

    // 3. Auto-increment score if goal
    if (type === 'GOAL') {
      const currentScore = scoreInputs[match.id] || {home: 0, away: 0};
      if (team === 'HOME') {
        const nextHome = (parseInt(currentScore.home || 0, 10) + 1).toString();
        setScoreInputs({...scoreInputs, [match.id]: {...currentScore, home: nextHome}});
      } else {
        const nextAway = (parseInt(currentScore.away || 0, 10) + 1).toString();
        setScoreInputs({...scoreInputs, [match.id]: {...currentScore, away: nextAway}});
      }
    }

    // 4. Reset inputs for THIS match only
    setEventInputs((prev) => ({
      ...prev,
      [match.id]: {team: 'HOME', type: 'GOAL', player: '', minute: ''}
    }));
  };
  const getGroupedMatches = () => {
    const sorted = [...matches].sort((a, b) => new Date(a.kickoffTime) - new Date(b.kickoffTime));

    const groups = {};
    sorted.forEach((match) => {
      const dateKey = match.kickoffTime
          ? new Date(match.kickoffTime).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
          : 'Unscheduled Matches';

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(match);
    });

    return groups;
  };

  const groupedMatches = getGroupedMatches();

  const currentUserLeaderboardEntry = leaderboard.find(u => u.id === currentUser?.id || u.username === currentUser?.username);
  const userTotalPoints = currentUserLeaderboardEntry ? (currentUserLeaderboardEntry.totalPoints || 0) : 0;

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
                  type="button"
                  onClick={() => setIsAuthMode('login')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${isAuthMode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
              >
                Log In
              </button>
              <button
                  type="button"
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
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="e.g. alex24"
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {isAuthMode === 'register' && (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase">Email Address</label>
                      <input
                          type="email"
                          required
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="alex@example.com"
                          className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase">Account Type</label>
                      <select
                          value={roleInput}
                          onChange={(e) => setRoleInput(e.target.value)}
                          className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="USER">Standard User (Player)</option>
                        <option value="ADMIN">Admin (Manage Matches & Scoring)</option>
                      </select>
                    </div>
                  </>
              )}

              <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 font-bold py-3 rounded-lg transition mt-2 text-white"
              >
                {isAuthMode === 'login' ? 'Log In' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-slate-900 text-slate-100 relative">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 p-4">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Trophy className="text-yellow-400 w-8 h-8"/>
              <div>
                <h1 className="text-xl font-bold text-blue-400">MiniTippSpiel</h1>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <UserCheck className="w-3 h-3 text-emerald-400"/>
                  <span>{currentUser.username}</span>
                  <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${currentUser.role === 'ADMIN' ? 'bg-purple-900 text-purple-300' : 'bg-slate-700 text-slate-300'}`}>
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
                <LogOut className="w-5 h-5"/>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto p-6">
          {/* MATCHES TAB */}
          {activeTab === 'matches' && (
              <div className="space-y-6">
                {/* User Points Summary Banner */}
                <div
                    className="bg-gradient-to-r from-blue-900/60 to-slate-800 p-4 rounded-xl border border-blue-700/50 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-yellow-500/20 p-2.5 rounded-lg border border-yellow-500/30">
                      <Award className="w-6 h-6 text-yellow-400"/>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-semibold">Your Total Score</p>
                      <p className="text-lg font-bold text-white">Points Earned Across All Matches</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-extrabold text-emerald-400">{userTotalPoints}</span>
                    <span className="text-sm font-medium text-slate-300 ml-1">pts</span>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-slate-200 mb-4">Matches Schedule</h2>
                {Object.keys(groupedMatches).length === 0 ? (
                    <p className="text-slate-400">No matches available right now.</p>
                ) : (
                    Object.entries(groupedMatches).map(([dateLabel, dateMatches]) => (
                        <div key={dateLabel} className="space-y-3">
                          <div
                              className="bg-slate-800/80 px-4 py-2 rounded-lg border-l-4 border-blue-500 flex justify-between items-center">
                            <span className="font-bold text-blue-300 text-sm md:text-base">{dateLabel}</span>
                            <span className="text-xs text-slate-400">{dateMatches.length} Match(es)</span>
                          </div>

                          <div className="space-y-3 pl-0 md:pl-2">
                            {dateMatches.map((m) => {
                              const timeStatus = getMatchTimeStatus(m);
                              const kickoffTimeFormatted = m.kickoffTime
                                  ? new Date(m.kickoffTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
                                  : '';

                              const userPred = predictions[m.id];
                              const isEvaluated = m.finalHomeGoals !== null && m.finalHomeGoals !== undefined && m.finalAwayGoals !== null && m.finalAwayGoals !== undefined;

                              let earnedPoints = userPred?.pointsEarned;
                              if ((earnedPoints === null || earnedPoints === undefined) && isEvaluated && userPred) {
                                earnedPoints = calculatePoints(userPred.home, userPred.away, m.finalHomeGoals, m.finalAwayGoals);
                              }

                              return (
                                  <div key={m.id}
                                       className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex flex-col items-center md:items-start w-full md:w-auto">
                                      <div
                                          className="flex items-center gap-3 text-lg font-semibold w-full justify-center md:justify-start">
                                        <span className="w-28 text-right truncate">{m.homeTeam}</span>
                                        <span className="bg-slate-700 px-3 py-1 rounded text-sm text-slate-300">
                                {isEvaluated ? `${m.finalHomeGoals} : ${m.finalAwayGoals}` : 'VS'}
                              </span>
                                        <span className="w-28 text-left truncate">{m.awayTeam}</span>

                                        {/* Timeline Modal Trigger Button */}
                                        <button
                                            onClick={() => setSelectedMatchForTimeline(m)}
                                            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-blue-400 transition ml-1"
                                            title="View Live Score Timeline & Events"
                                        >
                                          <Activity className="w-4 h-4"/>
                                        </button>
                                      </div>

                                      <div className="mt-2 flex items-center gap-2 text-xs">
                                        <Clock className="w-3.5 h-3.5 text-slate-400"/>
                                        <span className="text-slate-400">{kickoffTimeFormatted}</span>
                                        <span className="text-slate-600">•</span>
                                        <span className={`font-medium ${
                                            timeStatus.status === 'LIVE'
                                                ? 'text-emerald-400 animate-pulse font-bold'
                                                : timeStatus.status === 'FINISHED'
                                                    ? 'text-slate-400'
                                                    : 'text-amber-400/90'
                                        }`}>
                                {timeStatus.text}
                              </span>
                                      </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-center gap-3">
                                      <div className="flex items-center gap-2">
                                        <input
                                            type="number" min="0" placeholder="0"
                                            disabled={timeStatus.isStarted}
                                            value={predictions[m.id]?.home ?? ''}
                                            className={`w-14 bg-slate-900 border rounded p-2 text-center text-white ${
                                                timeStatus.isStarted ? 'opacity-50 border-slate-800 cursor-not-allowed' : 'border-slate-600'
                                            }`}
                                            onChange={(e) => setPredictions({
                                              ...predictions,
                                              [m.id]: {...predictions[m.id], home: e.target.value}
                                            })}
                                        />
                                        <span>:</span>
                                        <input
                                            type="number" min="0" placeholder="0"
                                            disabled={timeStatus.isStarted}
                                            value={predictions[m.id]?.away ?? ''}
                                            className={`w-14 bg-slate-900 border rounded p-2 text-center text-white ${
                                                timeStatus.isStarted ? 'opacity-50 border-slate-800 cursor-not-allowed' : 'border-slate-600'
                                            }`}
                                            onChange={(e) => setPredictions({
                                              ...predictions,
                                              [m.id]: {...predictions[m.id], away: e.target.value}
                                            })}
                                        />
                                        <button
                                            onClick={() => handlePredictSubmit(m)}
                                            disabled={timeStatus.isStarted}
                                            className={`ml-2 px-4 py-2 rounded-lg font-medium transition ${
                                                timeStatus.isStarted
                                                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                            }`}
                                        >
                                          {timeStatus.isStarted ? 'Locked' : predictions[m.id] ? 'Update' : 'Predict'}
                                        </button>
                                      </div>

                                      {isEvaluated && (
                                          <div className="mt-2 md:mt-0 flex items-center">
                                            {earnedPoints !== null && earnedPoints !== undefined ? (
                                                <span
                                                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border ${
                                                        earnedPoints === 3
                                                            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-600'
                                                            : earnedPoints === 1
                                                                ? 'bg-blue-950/80 text-blue-400 border-blue-600'
                                                                : 'bg-slate-900 text-slate-400 border-slate-700'
                                                    }`}>
                                    <Award className="w-3.5 h-3.5"/>
                                    +{earnedPoints} {earnedPoints === 1 ? 'pt' : 'pts'}
                                  </span>
                                            ) : (
                                                <span className="text-xs text-slate-500 italic">No prediction</span>
                                            )}
                                          </div>
                                      )}
                                    </div>
                                  </div>
                              );
                            })}
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
                  <Users className="text-blue-400"/> Leaderboard
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
                      <tr key={u.id}
                          className={`border-b border-slate-700/50 ${u.id === currentUser.id ? 'bg-blue-900/30 font-bold' : ''}`}>
                        <td className="p-3 text-slate-400">#{idx + 1}</td>
                        <td className="p-3 text-slate-100">{u.username} {u.id === currentUser.id && '(You)'}</td>
                        <td className="p-3 text-emerald-400 font-bold">{u.totalPoints || 0} pts</td>
                      </tr>
                  ))}
                  </tbody>
                </table>
              </div>
          )}

          {/* TRIKOT QUEUE TAB */}
          {activeTab === 'trikot' && (
              <div
                  className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center max-w-lg mx-auto space-y-6">
                <Shield className="w-16 h-16 text-yellow-400 mx-auto"/>
                <h2 className="text-2xl font-bold">Limited Trikot Promotion</h2>
                <p className="text-slate-400">Enter the live waiting room to claim your jersey!</p>

                {!inQueue ? (
                    <button onClick={handleJoinQueue}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition">
                      Enter Waiting Room
                    </button>
                ) : (
                    <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 space-y-3">
                      <div className="flex justify-center items-center gap-2 text-slate-400">
                        <Clock className="animate-spin text-blue-400"/> Live Status
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
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
                  <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2">
                    <PlusCircle className="w-5 h-5"/> Schedule New Match
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
                    <button type="submit"
                            className="md:col-span-3 bg-purple-600 hover:bg-purple-500 font-bold py-2 rounded transition">
                      Create Match
                    </button>
                  </form>
                </div>

                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-6">
                  <h3 className="text-lg font-bold text-purple-300">Manage Scores, Events & Lifecycle</h3>

                  {Object.keys(groupedMatches).length === 0 ? (
                      <p className="text-slate-400">No matches to manage.</p>
                  ) : (
                      Object.entries(groupedMatches).map(([dateLabel, dateMatches]) => (
                          <div key={dateLabel} className="space-y-4">
                            <div
                                className="bg-slate-900 px-4 py-2 rounded-lg border-l-4 border-purple-500 flex justify-between items-center">
                              <span className="font-bold text-purple-300 text-sm md:text-base">{dateLabel}</span>
                              <span className="text-xs text-slate-400">{dateMatches.length} Match(es)</span>
                            </div>

                            <div className="space-y-4 pl-0 md:pl-2">
                              {dateMatches.map((m) => {
                                const matchStatus = getMatchTimeStatus(m);
                                const isFinished = matchStatus.status === 'FINISHED';

                                return (
                                    <div key={m.id}
                                         className="bg-slate-900 p-5 rounded-xl border border-slate-700 space-y-4">
                                      <div
                                          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-3">
                                        <div>
                                          <p className="font-bold text-white text-lg">{m.homeTeam} vs {m.awayTeam}</p>
                                          <p className="text-xs text-slate-400">
                                            {m.kickoffTime ? new Date(m.kickoffTime).toLocaleTimeString([], {
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            }) : 'No date set'}
                                            <span
                                                className="ml-2 font-semibold text-emerald-400">({matchStatus.text})</span>
                                          </p>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                          {/* Force Match Stop / Resume Button */}
                                          <button
                                              onClick={() => toggleMatchFinishState(m.id)}
                                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                                                  isFinished
                                                      ? 'bg-amber-600/80 hover:bg-amber-500 text-white'
                                                      : 'bg-red-600 hover:bg-red-500 text-white'
                                              }`}
                                          >
                                            {isFinished ? <Play className="w-3.5 h-3.5"/> :
                                                <Square className="w-3.5 h-3.5"/>}
                                            {isFinished ? 'Reopen Match' : 'Force Finish / Stop Match'}
                                          </button>

                                          {/* Delete Match Button */}
                                          <button
                                              onClick={() => handleDeleteMatch(m.id)}
                                              className="bg-rose-700/80 hover:bg-rose-600 text-white text-xs px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition"
                                              title="Delete Match"
                                          >
                                            <Trash2 className="w-3.5 h-3.5"/> Delete
                                          </button>

                                          <div className="flex items-center gap-2">
                                            <input
                                                type="number" min="0" placeholder="Home"
                                                value={scoreInputs[m.id]?.home ?? ''}
                                                onChange={(e) => setScoreInputs({
                                                  ...scoreInputs,
                                                  [m.id]: {...scoreInputs[m.id], home: e.target.value}
                                                })}
                                                className="w-14 bg-slate-800 border border-slate-600 rounded p-1.5 text-center text-white text-sm"
                                            />
                                            <span className="text-sm font-bold">:</span>
                                            <input
                                                type="number" min="0" placeholder="Away"
                                                value={scoreInputs[m.id]?.away ?? ''}
                                                onChange={(e) => setScoreInputs({
                                                  ...scoreInputs,
                                                  [m.id]: {...scoreInputs[m.id], away: e.target.value}
                                                })}
                                                className="w-14 bg-slate-800 border border-slate-600 rounded p-1.5 text-center text-white text-sm"
                                            />
                                            <button
                                                onClick={() => handleUpdateAndEvaluate(m.id)}
                                                className="bg-purple-600 hover:bg-purple-500 font-bold px-3 py-1.5 rounded transition text-xs flex items-center gap-1"
                                            >
                                              <CheckSquare className="w-3.5 h-3.5"/> Save & Evaluate
                                            </button>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Detailed Live Match Event Creator */}
                                      {!isFinished ? (
                                          <div
                                              className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700/80 space-y-3">
                                            <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">Log
                                              Live Match Event (Cards, Goals, VAR)</p>
                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                                              <select
                                                  value={eventInputs[m.id]?.team || 'HOME'}
                                                  onChange={(e) => handleEventInputChange(m.id, 'team', e.target.value)}
                                                  className="bg-slate-900 border border-slate-700 text-xs rounded p-2 text-white"
                                              >
                                                <option value="HOME">{m.homeTeam} (Home)</option>
                                                <option value="AWAY">{m.awayTeam} (Away)</option>
                                              </select>

                                              <select
                                                  value={eventInputs[m.id]?.type || 'GOAL'}
                                                  onChange={(e) => handleEventInputChange(m.id, 'type', e.target.value)}
                                                  className="bg-slate-900 border border-slate-700 text-xs rounded p-2 text-white"
                                              >
                                                <option value="GOAL">⚽ Goal</option>
                                                <option value="YELLOW_CARD">🟨 Yellow Card</option>
                                                <option value="RED_CARD">🟥 Red Card</option>
                                                <option value="PENALTY">🎯 Penalty</option>
                                                <option value="SUB">🔄 Substitution</option>
                                              </select>

                                              <input
                                                  type="text"
                                                  placeholder="Player Name"
                                                  value={eventInputs[m.id]?.player || ''}
                                                  onChange={(e) => handleEventInputChange(m.id, 'player', e.target.value)}
                                                  className="bg-slate-900 border border-slate-700 text-xs rounded p-2 text-white"
                                              />

                                              <input
                                                  type="text"
                                                  placeholder={`Min (Default: ${matchStatus.elapsedMinutes}')`}
                                                  value={eventInputs[m.id]?.minute || ''}
                                                  onChange={(e) => handleEventInputChange(m.id, 'minute', e.target.value)}
                                                  className="bg-slate-900 border border-slate-700 text-xs rounded p-2 text-white"
                                              />

                                              <button
                                                  onClick={() => handleAddMatchEvent(m)}
                                                  className="bg-blue-600 hover:bg-blue-500 font-bold text-xs py-2 rounded text-white transition"
                                              >
                                                + Record Event
                                              </button>
                                            </div>
                                          </div>
                                      ) : (
                                          <div
                                              className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-center text-xs text-slate-400 italic">
                                            🔒 Match is finished. Event logging is locked.
                                          </div>
                                      )}
                                    </div>
                                );
                              })}
                            </div>
                          </div>
                      ))
                  )}
                </div>
              </div>
          )}
        </main>

        {/* MATCH TIMELINE MODAL */}
        {selectedMatchForTimeline && (
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div
                  className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                  <div className="flex items-center gap-2 text-blue-400 font-bold">
                    <Activity className="w-5 h-5"/> Match Events & Live Stats
                  </div>
                  <button
                      onClick={() => setSelectedMatchForTimeline(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                  >
                    <X className="w-5 h-5"/>
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  <div className="text-center bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <div className="flex justify-between items-center text-xl font-extrabold">
                      <span className="w-2/5 text-right">{selectedMatchForTimeline.homeTeam}</span>
                      <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-lg">
                      {selectedMatchForTimeline.finalHomeGoals ?? scoreInputs[selectedMatchForTimeline.id]?.home ?? 0} : {selectedMatchForTimeline.finalAwayGoals ?? scoreInputs[selectedMatchForTimeline.id]?.away ?? 0}
                    </span>
                      <span className="w-2/5 text-left">{selectedMatchForTimeline.awayTeam}</span>
                    </div>
                    <p className="text-xs text-emerald-400 font-bold mt-2 animate-pulse">
                      {getMatchTimeStatus(selectedMatchForTimeline).text}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Live Event
                      Timeline</h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                      {(!matchEvents[selectedMatchForTimeline.id] || matchEvents[selectedMatchForTimeline.id].length === 0) ? (
                          <div className="text-center py-6 text-slate-500 text-xs italic bg-slate-900/40 rounded-lg">
                            No events recorded for this match yet.
                          </div>
                      ) : (
                          matchEvents[selectedMatchForTimeline.id].map((evt) => (
                              <div key={evt.id}
                                   className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-700/60 text-sm">
                              <span
                                  className="bg-slate-800 border border-slate-600 text-blue-400 text-xs font-mono font-extrabold px-2 py-1 rounded-md">
                                {evt.minute}'
                              </span>
                                <div className="flex-1">
                                  <p className={`font-semibold flex items-center gap-1.5 ${
                                      evt.type === 'GOAL' ? 'text-yellow-400' :
                                          evt.type === 'YELLOW_CARD' ? 'text-amber-300' :
                                              evt.type === 'RED_CARD' ? 'text-red-400' : 'text-slate-200'
                                  }`}>
                                    {evt.type === 'GOAL' && '⚽'}
                                    {evt.type === 'YELLOW_CARD' && '🟨'}
                                    {evt.type === 'RED_CARD' && '🟥'}
                                    {evt.type === 'PENALTY' && '🎯'}
                                    {evt.type === 'SUB' && '🔄'}
                                    {evt.text}
                                  </p>
                                  <p className="text-[10px] text-slate-500 uppercase">{evt.team}</p>
                                </div>
                              </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}