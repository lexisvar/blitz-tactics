// Represents data structures used in the JS part of the codebase
// These are reflections of the data format used to persist the puzzles

export type FEN = string

export type UciMove = string

export type MoveColor = 'w' | 'b'

export type ChessMove = { // used by chess.js
  from: string
  to: string
  promotion?: string
}

interface InitialMove {
  san: string,
  uci: UciMove,
}

interface PuzzleLines {
  [uciMove: string]: PuzzleLines | "win"
}

// fields for all puzzles fetched from the server
export type Puzzle = {
  id: number
  fen: FEN
  lines: PuzzleLines
  initialMove: InitialMove
}
