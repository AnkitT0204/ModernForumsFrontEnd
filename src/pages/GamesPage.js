import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { Chess } from 'chess.js';
import Chessboard from 'chessboardjsx';
import './GamesPage.css';

// Connect to the backend Socket.IO server
const socket = io('https://modernforumsbackend.onrender.com', { withCredentials: true });

function GamesPage() {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const evaluationBarRef = useRef(null);
  const evalGraphRef = useRef(null);
  const arrowCanvasRef = useRef(null);
  const stockfishRef = useRef(null);
  const chessboardRef = useRef(null);

  const [selectedGame, setSelectedGame] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [gameState, setGameState] = useState(null);
  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [error, setError] = useState(null);

  // Chess-specific state
  const [isAnalysisMode, setIsAnalysisMode] = useState(false);
  const [pgnInput, setPgnInput] = useState('');
  const [analysisGame, setAnalysisGame] = useState(null);
  const [currentMove, setCurrentMove] = useState(0);
  const [totalMoves, setTotalMoves] = useState(0);
  const [moveHistory, setMoveHistory] = useState([]);
  const [analysisEvaluation, setAnalysisEvaluation] = useState('Starting position');
  const [evaluationScore, setEvaluationScore] = useState(0);
  const [evaluationHistory, setEvaluationHistory] = useState([0]);
  const [moveQuality, setMoveQuality] = useState('');
  const [showMoveQuality, setShowMoveQuality] = useState(false);
  const [prevEvaluation, setPrevEvaluation] = useState(0);
  const [bestMove, setBestMove] = useState(null);
  const [isEngineLoaded, setIsEngineLoaded] = useState(false);
  const [currentDepth, setCurrentDepth] = useState(0);
  const [boardWidth, setBoardWidth] = useState(400);
  const [moveEvaluations, setMoveEvaluations] = useState({});

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Helper function to convert square notation to coordinates
  const squareToCoords = (square, orientation = 'white') => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
    
    const file = square[0];
    const rank = square[1];
    
    let x, y;
    
    if (orientation === 'white') {
      x = files.indexOf(file);
      y = 7 - ranks.indexOf(rank);
    } else {
      x = 7 - files.indexOf(file);
      y = ranks.indexOf(rank);
    }
    
    const squareSize = boardWidth / 8;
    return {
      x: x * squareSize + squareSize / 2,
      y: y * squareSize + squareSize / 2
    };
  };

  // Draw arrow on canvas
  const drawArrow = useCallback((fromSquare, toSquare, color = '#00e676') => {
    if (!arrowCanvasRef.current || !fromSquare || !toSquare) return;
    
    const canvas = arrowCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear previous arrows
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const orientation = 'white'; // You can make this dynamic based on player orientation
    const fromCoords = squareToCoords(fromSquare, orientation);
    const toCoords = squareToCoords(toSquare, orientation);
    
    // Draw arrow
    const headlen = 15; // Length of arrow head
    const dx = toCoords.x - fromCoords.x;
    const dy = toCoords.y - fromCoords.y;
    const angle = Math.atan2(dy, dx);
    
    // Shorten the arrow to not overlap with piece centers
    const shortenBy = 25;
    const length = Math.sqrt(dx * dx + dy * dy);
    const shortenedLength = length - shortenBy * 2;
    const ratio = shortenedLength / length;
    
    const adjustedFromX = fromCoords.x + dx * (shortenBy / length);
    const adjustedFromY = fromCoords.y + dy * (shortenBy / length);
    const adjustedToX = fromCoords.x + dx * (1 - shortenBy / length);
    const adjustedToY = fromCoords.y + dy * (1 - shortenBy / length);
    
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    
    // Draw arrow body
    ctx.beginPath();
    ctx.moveTo(adjustedFromX, adjustedFromY);
    ctx.lineTo(adjustedToX, adjustedToY);
    ctx.stroke();
    
    // Draw arrow head
    ctx.beginPath();
    ctx.moveTo(adjustedToX, adjustedToY);
    ctx.lineTo(
      adjustedToX - headlen * Math.cos(angle - Math.PI / 6),
      adjustedToY - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(adjustedToX, adjustedToY);
    ctx.lineTo(
      adjustedToX - headlen * Math.cos(angle + Math.PI / 6),
      adjustedToY - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
    
    // Fill arrow head
    ctx.beginPath();
    ctx.moveTo(adjustedToX, adjustedToY);
    ctx.lineTo(
      adjustedToX - headlen * Math.cos(angle - Math.PI / 6),
      adjustedToY - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      adjustedToX - headlen * Math.cos(angle + Math.PI / 6),
      adjustedToY - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }, [boardWidth]);

  // Calculate move quality based on evaluation difference
  const calculateMoveQuality = (currentEval, previousEval, isWhiteMove) => {
    if (previousEval === null || previousEval === undefined) return null;
    
    // Calculate the difference from the moving player's perspective
    const diff = isWhiteMove ? currentEval - previousEval : previousEval - currentEval;
    
    console.log(`Move quality calc: current=${currentEval}, previous=${previousEval}, diff=${diff}, isWhite=${isWhiteMove}`);
    
    if (diff >= 3) {
      return 'brilliant';
    } else if (diff >= 2) {
      return 'great-move';
    } else if (diff >= 1) {
      return 'best-move';
    } else if (diff >= 0.5) {
      return 'excellent';
    } else if (diff >= 0.1) {
      return 'good';
    } else if (diff >= -0.1) {
      return 'book';
    } else if (diff >= -0.5) {
      return 'inaccuracy';
    } else if (diff >= -1.5) {
      return 'mistake';
    } else if (diff >= -3) {
      return 'miss';
    } else {
      return 'blunder';
    }
  };

  // Initialize Stockfish
  const initializeStockfish = useCallback(() => {
    if (stockfishRef.current) {
      stockfishRef.current.terminate();
    }

    try {
      stockfishRef.current = new Worker('/stockfish.js');
      
      stockfishRef.current.onmessage = (event) => {
        const message = event.data;
        console.log('Stockfish message:', message);
        
        if (message === 'readyok') {
          setIsEngineLoaded(true);
          console.log('Stockfish engine ready');
        } else if (message.startsWith('info depth')) {
          const depthMatch = message.match(/depth (\d+)/);
          if (depthMatch) {
            setCurrentDepth(parseInt(depthMatch[1]));
          }

          const scoreMatch = message.match(/score (cp|mate) (-?\d+)/);
          if (scoreMatch) {
            let score;
            let evalText;
            
            if (scoreMatch[1] === 'cp') {
              score = parseInt(scoreMatch[2]) / 100;
              evalText = `${score > 0 ? '+' : ''}${score.toFixed(1)}`;
            } else {
              const mateValue = parseInt(scoreMatch[2]);
              score = mateValue > 0 ? 100 : -100; // Cap for visualization
              evalText = `Mate in ${Math.abs(mateValue)}`;
            }
            
            // Update evaluation for current position
            setEvaluationScore(score);
            setAnalysisEvaluation(evalText);
            
            // Store evaluation for this move
            setMoveEvaluations(prev => ({
              ...prev,
              [currentMove]: score
            }));
            
            // Update evaluation history
            setEvaluationHistory(prev => {
              const newHistory = [...prev];
              newHistory[currentMove] = score;
              return newHistory;
            });
          }
          
          // Extract best move and draw arrow
          const bestMoveMatch = message.match(/pv ([a-h][1-8][a-h][1-8])/);
          if (bestMoveMatch) {
            const bestMoveSan = bestMoveMatch[1];
            const moveObj = {
              from: bestMoveSan.substring(0, 2),
              to: bestMoveSan.substring(2, 4),
            };
            setBestMove(moveObj);
            
            // Draw arrow for best move
            if (isAnalysisMode) {
              setTimeout(() => {
                drawArrow(moveObj.from, moveObj.to, '#00e676');
              }, 100);
            }
          }
        }
      };
      
      stockfishRef.current.onerror = (error) => {
        console.error('Stockfish error:', error);
        setError('Chess engine failed to load');
      };
      
      stockfishRef.current.postMessage('uci');
      stockfishRef.current.postMessage('setoption name MultiPV value 1');
      stockfishRef.current.postMessage('setoption name Threads value 2');
      stockfishRef.current.postMessage('isready');
    } catch (error) {
      console.error("Error initializing Stockfish:", error);
      setError("Failed to load chess engine. Please refresh the page.");
    }
  }, [currentMove, isAnalysisMode, drawArrow]);

  // Initialize engine when needed
  useEffect(() => {
    if ((selectedGame === 'chess' || isAnalysisMode) && !stockfishRef.current) {
      initializeStockfish();
    }

    return () => {
      if (stockfishRef.current) {
        stockfishRef.current.terminate();
        stockfishRef.current = null;
      }
    };
  }, [selectedGame, isAnalysisMode, initializeStockfish]);

  // Trigger evaluation when position changes
  useEffect(() => {
    if (stockfishRef.current && isEngineLoaded && analysisGame) {
      console.log('Sending position to engine:', analysisGame.fen());
      stockfishRef.current.postMessage('stop');
      stockfishRef.current.postMessage('position fen ' + analysisGame.fen());
      stockfishRef.current.postMessage('go depth 15');
    }
  }, [analysisGame, isEngineLoaded, currentMove]);

  // Setup arrow canvas when board width changes
  useEffect(() => {
    if (arrowCanvasRef.current) {
      const canvas = arrowCanvasRef.current;
      canvas.width = boardWidth;
      canvas.height = boardWidth;
      canvas.style.width = `${boardWidth}px`;
      canvas.style.height = `${boardWidth}px`;
      
      // Redraw arrow if we have a best move
      if (bestMove && isAnalysisMode) {
        setTimeout(() => {
          drawArrow(bestMove.from, bestMove.to, '#00e676');
        }, 100);
      }
    }
  }, [boardWidth, bestMove, isAnalysisMode, drawArrow]);

  // Draw evaluation bar
  useEffect(() => {
    if (!evaluationBarRef.current) return;
    
    const canvas = evaluationBarRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set actual canvas size
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Calculate bar position based on evaluation
    let whiteHeight;
    const clampedScore = Math.max(-10, Math.min(10, evaluationScore));
    whiteHeight = height * (0.5 - (clampedScore / 20));
    whiteHeight = Math.max(0, Math.min(height, whiteHeight));
    
    // Draw white advantage (top)
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, whiteHeight);
    
    // Draw black advantage (bottom)
    ctx.fillStyle = '#2c2c2c';
    ctx.fillRect(0, whiteHeight, width, height - whiteHeight);
    
    // Draw center line
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    // Draw evaluation text
    ctx.fillStyle = whiteHeight < height * 0.3 ? '#f0f0f0' : '#2c2c2c';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const displayText = Math.abs(evaluationScore) >= 10 ? 
      (evaluationScore > 0 ? '+M' : '-M') : 
      (evaluationScore > 0 ? `+${Math.abs(evaluationScore).toFixed(1)}` : evaluationScore.toFixed(1));
    
    ctx.fillText(displayText, width / 2, height / 2);
  }, [evaluationScore]);

  // Draw evaluation graph
  useEffect(() => {
    if (!evalGraphRef.current || evaluationHistory.length === 0) return;

    const canvas = evalGraphRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);

    // Draw center line
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw grid lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (evaluationHistory.length < 2) return;

    // Normalize scores for display
    const maxDisplayScore = 5;
    const normalizedScores = evaluationHistory.map(score => 
      Math.max(-maxDisplayScore, Math.min(maxDisplayScore, score))
    );

    // Create points
    const step = width / Math.max(normalizedScores.length - 1, 1);
    const points = normalizedScores.map((score, index) => ({
      x: index * step,
      y: height / 2 - (score / maxDisplayScore) * (height / 2 * 0.8),
    }));

    // Fill area under the graph
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      points.forEach(point => ctx.lineTo(point.x, point.y));
      ctx.lineTo(points[points.length - 1].x, height / 2);
      ctx.closePath();
      
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(0, 170, 255, 0.3)');
      gradient.addColorStop(0.5, 'rgba(0, 170, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(255, 170, 0, 0.3)');
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Draw the line
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.forEach((point, index) => {
        if (index > 0) {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.strokeStyle = '#00aaff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Highlight current move
    if (currentMove < points.length) {
      const currentPoint = points[currentMove];
      ctx.beginPath();
      ctx.arc(currentPoint.x, currentPoint.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#00e676';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [evaluationHistory, currentMove]);

  // Socket event handlers
  useEffect(() => {
    if (!user) return;

    socket.on('roomCreated', ({ roomCode, playerSymbol }) => {
      setRoomCode(roomCode);
      setPlayerSymbol(playerSymbol);
      setError(null);
    });

    socket.on('joinedRoom', ({ roomCode, playerSymbol, gameState }) => {
      setRoomCode(roomCode);
      setPlayerSymbol(playerSymbol);
      setGameState(gameState);
      setError(null);
    });

    socket.on('gameUpdate', (newGameState) => {
      setGameState(newGameState);
    });

    socket.on('error', (message) => {
      setError(message);
    });

    return () => {
      socket.off('roomCreated');
      socket.off('joinedRoom');
      socket.off('gameUpdate');
      socket.off('error');
    };
  }, [user]);

  if (!user) {
    return null;
  }

  const createRoom = (gameType) => {
    setSelectedGame(gameType);
    socket.emit('createRoom', { gameType, displayUsername: user.username });
  };

  const joinRoom = () => {
    if (!joinCode) {
      setError('Please enter a room code.');
      return;
    }
    if (!selectedGame) {
      setError('Please select a game first.');
      return;
    }
    socket.emit('joinRoom', { roomCode: joinCode.toUpperCase(), displayUsername: user.username });
  };

  const handleChessMove = ({ sourceSquare, targetSquare }) => {
    if (selectedGame !== 'chess' || !gameState || isAnalysisMode) return;
    const player = gameState.players.find(p => p.id === socket.id);
    if (player.color !== gameState.currentTurn) return;

    const move = {
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    };
    
    socket.emit('makeMove', { gameType: 'chess', roomCode, position: null, move });
  };

  const resignChess = () => {
    if (selectedGame !== 'chess' || !gameState || gameState.winner) return;
    socket.emit('resign', { roomCode });
  };

  const resetGame = () => {
    socket.emit('resetGame', { gameType: selectedGame, roomCode });
    if (selectedGame === 'chess') {
      setIsAnalysisMode(false);
      setPgnInput('');
      setAnalysisGame(null);
      setCurrentMove(0);
      setAnalysisEvaluation('Starting position');
      setMoveHistory([]);
      setTotalMoves(0);
      setEvaluationScore(0);
      setEvaluationHistory([0]);
      setPrevEvaluation(0);
      setBestMove(null);
      setMoveQuality('');
      setShowMoveQuality(false);
      setMoveEvaluations({});
    }
  };

  const analyzePgn = () => {
    try {
      const chess = new Chess();
      if (!pgnInput.trim()) {
        setError('Please enter a PGN.');
        return;
      }
      
      chess.loadPgn(pgnInput);
      
      const fullHistory = [];
      const moves = chess.history({ verbose: true });
      
      const startingChess = new Chess();
      fullHistory.push({
        fen: startingChess.fen(),
        move: null,
        moveNumber: 0,
        san: null
      });
      
      let tempChess = new Chess();
      moves.forEach((move, index) => {
        tempChess.move(move);
        fullHistory.push({
          fen: tempChess.fen(),
          move: move,
          moveNumber: Math.floor(index / 2) + 1,
          san: move.san
        });
      });
      
      setMoveHistory(fullHistory);
      setTotalMoves(fullHistory.length - 1);
      
      setAnalysisGame(startingChess);
      setCurrentMove(0);
      setAnalysisEvaluation('Starting position');
      setEvaluationScore(0);
      setEvaluationHistory(new Array(fullHistory.length).fill(0));
      setPrevEvaluation(0);
      setBestMove(null);
      setMoveQuality('');
      setShowMoveQuality(false);
      setMoveEvaluations({});
      setError(null);
      setIsAnalysisMode(true);
    } catch (err) {
      console.error("PGN Analysis Error:", err);
      setError('Invalid PGN. Please check the format.');
    }
  };

  const navigateMoves = (direction) => {
    if (!moveHistory || moveHistory.length === 0) return;

    let newMoveIndex = currentMove + direction;
    if (newMoveIndex < 0) newMoveIndex = 0;
    if (newMoveIndex > totalMoves) newMoveIndex = totalMoves;
    
    if (newMoveIndex === currentMove) return;

    // Check for move quality when moving forward
    if (direction > 0 && newMoveIndex > 0) {
      const currentEval = moveEvaluations[newMoveIndex];
      const previousEval = moveEvaluations[newMoveIndex - 1];
      
      if (currentEval !== undefined && previousEval !== undefined) {
        const moveIsWhite = (newMoveIndex % 2 === 1);
        const quality = calculateMoveQuality(currentEval, previousEval, moveIsWhite);
        
        if (quality) {
          setMoveQuality(quality);
          setShowMoveQuality(true);
          setTimeout(() => setShowMoveQuality(false), 2500);
        }
      }
    }
    
    const position = moveHistory[newMoveIndex];
    const newChess = new Chess();
    newChess.load(position.fen);
    
    setAnalysisGame(newChess);
    setCurrentMove(newMoveIndex);
  };

  const jumpToMove = (moveIndex) => {
    if (!moveHistory || moveIndex < 0 || moveIndex > totalMoves || moveIndex === currentMove) return;
    
    // Check for move quality when jumping to a move
    if (moveIndex > 0) {
      const currentEval = moveEvaluations[moveIndex];
      const previousEval = moveEvaluations[moveIndex - 1];
      
      if (currentEval !== undefined && previousEval !== undefined) {
        const moveIsWhite = (moveIndex % 2 === 1);
        const quality = calculateMoveQuality(currentEval, previousEval, moveIsWhite);
        
        if (quality) {
          setMoveQuality(quality);
          setShowMoveQuality(true);
          setTimeout(() => setShowMoveQuality(false), 2500);
        }
      }
    }
    
    const position = moveHistory[moveIndex];
    const newChess = new Chess();
    newChess.load(position.fen);
    
    setAnalysisGame(newChess);
    setCurrentMove(moveIndex);
  };

  const formatMoveText = (historyItem, index) => {
    if (index === 0) return "Start";
    
    const moveNumber = Math.ceil(index / 2);
    const isWhiteMove = index % 2 === 1;
    
    if (isWhiteMove) {
      return `${moveNumber}. ${historyItem.san}`;
    } else {
      return `${historyItem.san}`;
    }
  };

  const renderChessBoard = () => {
    let orientation = 'white';
    if (!isAnalysisMode && gameState && gameState.players) {
      const player = gameState.players.find(p => p.id === socket.id);
      orientation = player?.color === 'w' ? 'white' : 'black';
    }
    
    const calcWidth = ({ screenWidth }) => {
      const width = screenWidth < 500 ? 320 : 400;
      setBoardWidth(width);
      return width;
    };
    
    return (
      <div className="chess-game">
        {isAnalysisMode ? (
          <div className="chess-analysis-container">
            <div className="chess-board-container">
              <div className="chess-board-with-eval">
                <div className="evaluation-bar-container">
                  <canvas 
                    ref={evaluationBarRef} 
                    className="evaluation-bar"
                  />
                  <div className="eval-labels">
                    <span className="eval-label-white">White</span>
                    <span className="eval-label-black">Black</span>
                  </div>
                </div>
                
                <div className="chessboard-wrapper" style={{ position: 'relative' }}>
                  <Chessboard
                    ref={chessboardRef}
                    position={analysisGame ? analysisGame.fen() : 'start'}
                    orientation={orientation}
                    width={400}
                    draggable={false}
                    boardStyle={{
                      borderRadius: '8px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                    }}
                    calcWidth={calcWidth}
                    squareStyles={{
                      ...(bestMove && {
                        [bestMove.from]: { backgroundColor: 'rgba(0, 230, 118, 0.4)' },
                        [bestMove.to]: { backgroundColor: 'rgba(0, 230, 118, 0.6)' },
                      }),
                    }}
                  />
                  
                  {/* Arrow Canvas Overlay */}
                  <canvas
                    ref={arrowCanvasRef}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      pointerEvents: 'none',
                      zIndex: 1,
                    }}
                  />
                  
                  {showMoveQuality && moveQuality && (
                    <div className={`move-quality-popup move-quality-${moveQuality}`}>
                      {moveQuality.charAt(0).toUpperCase() + moveQuality.slice(1).replace('-', ' ')}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="analysis-controls">
                <button 
                  onClick={() => navigateMoves(-1)} 
                  disabled={currentMove === 0}
                  className="control-button"
                >
                  ◀ Previous
                </button>
                <div className="move-indicator">
                  Move {currentMove} / {totalMoves}
                </div>
                <button 
                  onClick={() => navigateMoves(1)} 
                  disabled={currentMove === totalMoves}
                  className="control-button"
                >
                  Next ▶
                </button>
              </div>
              
              <div className="evaluation-display">
                <div className="eval-score">{analysisEvaluation}</div>
                {bestMove && (
                  <div className="best-move">Best: {bestMove.from}-{bestMove.to}</div>
                )}
                {currentDepth > 0 && (
                  <div className="engine-depth">Depth: {currentDepth}</div>
                )}
              </div>

              <div className="eval-graph-container">
                <h4>Evaluation Graph</h4>
                <canvas
                  ref={evalGraphRef}
                  className="evaluation-graph"
                />
              </div>
            </div>
            
            <div className="moves-display">
              <h3>Move History</h3>
              <div className="moves-list">
                {moveHistory.map((historyItem, index) => (
                  <span 
                    key={index}
                    className={`move-item ${index === currentMove ? 'active' : ''}`}
                    onClick={() => jumpToMove(index)}
                  >
                    {formatMoveText(historyItem, index)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="chess-game-online">
            <Chessboard
              position={gameState.fen}
              onDrop={handleChessMove}
              orientation={orientation}
              width={400}
              draggable={true}
              boardStyle={{
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
              }}
              calcWidth={({ screenWidth }) => (screenWidth < 500 ? 320 : 400)}
            />
            <div className="game-controls">
              <button onClick={resignChess} className="resign-button">Resign</button>
            </div>
            {gameState.pgn && (
              <div className="pgn-display">
                <h3>Game PGN</h3>
                <pre>{gameState.pgn}</pre>
              </div>
            )}
          </div>
        )}
        
        <div className="analysis-section">
          <h3>📊 Analyze a Chess Game</h3>
          <textarea
            value={pgnInput}
            onChange={(e) => setPgnInput(e.target.value)}
            placeholder="Paste your PGN here... Example:
1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7..."
            rows="4"
            className="pgn-input"
          />
          <div className="analysis-buttons">
            {selectedGame === 'chess' && roomCode && !isAnalysisMode && (
              <button 
                onClick={() => setIsAnalysisMode(true)} 
                className="toggle-analysis-button"
              >
                📈 Switch to Analysis Mode
              </button>
            )}
            {isAnalysisMode && roomCode && (
              <button 
                onClick={() => setIsAnalysisMode(false)} 
                className="toggle-analysis-button"
              >
                🎮 Back to Game
              </button>
            )}
            <button onClick={analyzePgn} className="analyze-button">
              🔍 Analyze PGN
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Game selection screen
  if (!selectedGame) {
    return (
      <div className="games-page-container">
        <div className="hero-section">
          <h1>♟️ Chess Master</h1>
          <p className="hero-subtitle">Welcome, <span className="username">{user.username}</span>!</p>
        </div>
        
        <div className="game-selection">
          <h2>Choose Your Battle</h2>
          <div className="game-options">
            <div 
              className="game-option-card"
              onClick={() => setSelectedGame('chess')}
            >
              <div className="game-icon">♚</div>
              <h3>Play Chess</h3>
              <p>Challenge a friend to an online chess match</p>
            </div>
            <div 
              className="game-option-card"
              onClick={() => {
                setSelectedGame('chess');
                setIsAnalysisMode(true);
              }}
            >
              <div className="game-icon">📊</div>
              <h3>Analyze Game</h3>
              <p>Study your games with powerful engine analysis</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Lobby screen
  if (!roomCode && !isAnalysisMode) {
    return (
      <div className="games-page-container">
        <h1>♟️ Chess Game</h1>
        <p className="hero-subtitle">Welcome, <span className="username">{user.username}</span>!</p>
        
        <div className="game-lobby">
          <div className="lobby-section">
            <h2>🎮 Create a Game Room</h2>
            <p>Start a new chess game and invite a friend</p>
            <button onClick={() => createRoom('chess')} className="create-room-button">
              Create Room
            </button>
          </div>
          
          <div className="lobby-divider">
            <span>OR</span>
          </div>
          
          <div className="lobby-section">
            <h2>🔗 Join a Game Room</h2>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter Room Code (e.g., ABC123)"
              className="join-code-input"
              maxLength="6"
            />
            <button onClick={joinRoom} className="join-room-button">
              Join Room
            </button>
          </div>
          
          {error && <div className="error-message">⚠️ {error}</div>}
        </div>
      </div>
    );
  }

  // Analysis mode screen
  if (isAnalysisMode) {
    return (
      <div className="games-page-container">
        <div className="analysis-header">
          <h1>📊 Chess Analysis</h1>
          <button 
            onClick={() => {
              setIsAnalysisMode(false);
              setSelectedGame(null);
            }} 
            className="back-button"
          >
            ← Back to Menu
          </button>
        </div>
        {renderChessBoard()}
        {error && <div className="error-message">⚠️ {error}</div>}
      </div>
    );
  }

  // Waiting for player screen
  if (!gameState || gameState.players.length < 2) {
    return (
      <div className="games-page-container">
        <h1>♟️ Chess Game (Room: {roomCode})</h1>
        <div className="waiting-room">
          <div className="room-code-display">
            <h2>Share this code with your friend:</h2>
            <div className="room-code">{roomCode}</div>
            <button 
              onClick={() => navigator.clipboard.writeText(roomCode)}
              className="copy-button"
            >
              📋 Copy Code
            </button>
          </div>
          <div className="waiting-animation">
            <div className="spinner"></div>
            <p>Waiting for another player to join...</p>
          </div>
        </div>
        {error && <div className="error-message">⚠️ {error}</div>}
      </div>
    );
  }

  // Main game screen
  return (
    <div className="games-page-container">
      <div className="game-header">
        <h1>♟️ Chess Game (Room: {roomCode})</h1>
      </div>
      
      <div className="player-info">
        <div className="player-card white-player">
          <div className="player-icon">♔</div>
          <div className="player-details">
            <span className="player-name">
              {gameState.players[0].displayUsername}
              {gameState.players[0].id === socket.id ? ' (You)' : ''}
            </span>
            <span className="player-color">White</span>
          </div>
        </div>
        
        <div className="vs-indicator">VS</div>
        
        <div className="player-card black-player">
          <div className="player-icon">♚</div>
          <div className="player-details">
            <span className="player-name">
              {gameState.players[1].displayUsername}
              {gameState.players[1].id === socket.id ? ' (You)' : ''}
            </span>
            <span className="player-color">Black</span>
          </div>
        </div>
      </div>
      
      <div className="turn-indicator">
        <span className={`turn-display ${gameState.currentTurn === 'w' ? 'white-turn' : 'black-turn'}`}>
          {gameState.currentTurn === 'w' ? '♔ White to move' : '♚ Black to move'}
        </span>
      </div>
      
      {(gameState.winner || gameState.winner === 'Draw') && (
        <div className="game-result">
          <div className="winner-message">
            {gameState.winner === 'Draw' ? '🤝 Game Drawn!' : `🏆 ${gameState.winner} Wins!`}
          </div>
        </div>
      )}
      
      {renderChessBoard()}
      
      {(gameState.winner || gameState.winner === 'Draw') && (
        <button onClick={resetGame} className="reset-button">
          🔄 Play Again
        </button>
      )}
      
      {error && <div className="error-message">⚠️ {error}</div>}
    </div>
  );
}

export default GamesPage;