import Backbone from 'backbone'

import { dispatch, subscribe } from '@blitz/store'
import { InfinityPuzzleDifficulty } from '../index'

export default class SetDifficulty extends Backbone.View {

  // @ts-ignore
  get el() {
    return document.querySelector(`.difficulties`)
  }

  events(): Backbone.EventsHash {
    return {
      'click [data-difficulty]': `_selectDifficulty`
    }
  }

  public initialize() {
    subscribe({
      'difficulty:set': difficulty => this.highlight(difficulty)
    })
  }

  highlight(difficulty: InfinityPuzzleDifficulty) {
    const selectedEl = this.el.querySelector(`.selected`)
    if (selectedEl) {
      selectedEl.classList.remove(`selected`)
    }
    this.el.querySelector(`[data-difficulty="${difficulty}"]`).classList.add(`selected`)
  }

  _selectDifficulty(e, childElement) {
    const el = childElement
    if (el.classList.toString().includes(`selected`)) {
      return
    }
    dispatch(`difficulty:selected`, el.dataset.difficulty)
  }
}
