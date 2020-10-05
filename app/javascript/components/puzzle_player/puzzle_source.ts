// fetches puzzles from the server, handles player moves,
// and emits move events (move:success, move:almost, move:fail)

import _ from 'underscore'

import { fetchPuzzles } from '@blitz/api/requests'
import { dispatch, subscribe } from '@blitz/store'
import { ChessMove, Puzzle } from '@blitz/types'
import { uciToMove, moveToUci } from '@blitz/utils'
import { PuzzleSourceOptions } from './index'
import Puzzles from './puzzles'

// source:changed
// puzzles:fetched
// puzzles:start
// puzzles:lap
// puzzle:loaded
// fen:set
// move:make
// move:almost
// move:success
// move:fail

const responseDelay = 0

export interface PuzzleState {
  boardState?: object,
  puzzle?: Puzzle,
}

export default class PuzzleSource<PuzzleSourceInterface> {
  private i = 0
  private puzzles = new Puzzles()
  private started = false
  private shuffle = false
  private loopPuzzles = false
  private current: PuzzleState = {}
  private mode: string

  // options - shuffle, loopPuzzles, source
  constructor(options: PuzzleSourceOptions = {}) {
    this.shuffle = options.shuffle
    this.loopPuzzles = options.loopPuzzles
    this.mode = options.mode
    this.fetchPuzzles(options.source)
    subscribe({
      'source:changed': path => this.fetchPuzzles(path),
      'source:changed:add': path => this.fetchAndAddPuzzles(path),
      'puzzles:fetched': puzzles => {
        this.puzzles = new Puzzles()
        this.addPuzzles(puzzles)
        this.firstPuzzle()
      },
      'puzzles:added': puzzles => this.addPuzzles(puzzles),
      'puzzles:next': () => {
        const n = this.puzzles.count()
        dispatch(`puzzles:status`, {
          i: this.i,
          lastPuzzleId: this.puzzles.lastPuzzle().id,
          n,
        })
        this.nextPuzzle()
      },
      'move:try': move => this.tryUserMove(move),
    })
  }

  private fetchPuzzles(source) {
    fetchPuzzles(source).then(data => {
      dispatch(`puzzles:fetched`, data.puzzles)
      dispatch(`config:init`, data)
    })
  }

  private fetchAndAddPuzzles(source) {
    fetchPuzzles(source).then(data => dispatch(`puzzles:added`, data.puzzles))
  }

  private addPuzzles(puzzles) {
    this.puzzles.addPuzzles(puzzles)
  }

  private firstPuzzle() {
    this.i = 0
    this.loadPuzzleAtIndex(this.i)
  }

  private nextPuzzle() {
    this.i = this.i + 1
    if (this.i === this.puzzles.count()) {
      if (this.shuffle) {
        this.puzzles.shuffle()
      }
      if (this.loopPuzzles) {
        this.i = 0
        dispatch(`puzzles:lap`)
        this.loadPuzzleAtIndex(this.i)
      } else {
        dispatch(`puzzles:complete`)
      }
    } else {
      this.loadPuzzleAtIndex(this.i)
    }
  }

  // should make this one type of move
  private getInitialMoveSan(move): string|ChessMove {
    if (move.san) {
      return move.san
    } else {
      return move.uci ? uciToMove(move.uci) : uciToMove(move)
    }
  }

  private loadPuzzleAtIndex(i: number) {
    const puzzle = this.puzzles.puzzleAt(i)
    this.current = {
      boardState: Object.assign({}, puzzle.lines),
      puzzle,
    }
    dispatch(`puzzle:loaded`, this.current)
    dispatch(`board:flipped`, !!puzzle.fen.match(/ w /))
    dispatch(`fen:set`, puzzle.fen)
    setTimeout(() => {
      const move = this.getInitialMoveSan(puzzle.initialMove)
      dispatch(`move:make`, move, { opponent: true })
      dispatch(`move:sound`, move)
    }, 500)
  }

  private tryUserMove(move: ChessMove) {
    if (!this.started) {
      this.started = true
      dispatch(`puzzles:start`)
    }
    this.handleUserMove(move)
  }

  private handleUserMove(move: ChessMove) {
    const attempt = this.current.boardState[moveToUci(move)]
    if (attempt === `win`) {
      dispatch(`move:success`)
      if (this.mode === `rated`) {
        dispatch(`move:make`, move)
      } else if (this.i === this.puzzles.count() - 1) {
        // TODO look into whether this check is needed
        dispatch(`move:make`, move)
      }
      this.puzzleSolved()
      return
    } else if (attempt === `retry`) {
      dispatch(`move:almost`, move)
      return
    }
    const response = _.keys(attempt)[0]
    if (!response) {
      dispatch(`move:fail`, move)
      return
    }
    dispatch(`move:make`, move)
    dispatch(`move:success`)
    if (attempt[response] === `win`) {
      this.puzzleSolved()
    } else {
      dispatch(`move:sound`, move)
      const responseMove = uciToMove(response)
      setTimeout(() => {
        dispatch(`move:make`, responseMove, { opponent: true })
        this.current.boardState = attempt[response]
      }, responseDelay)
    }
  }

  private puzzleSolved() {
    dispatch(`puzzle:solved`, this.current.puzzle)
    dispatch(`puzzles:next`)
  }
}
