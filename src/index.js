import twemoji from 'twemoji'
import emojiSearch from '@groupher/emoji-search'

import {
  make,
  debounce,
  CSS,
  INLINE_BLOCK_TAG,
  moveCaretToEnd,
  keepCustomInlineToolOnly,
  restoreDefaultInlineTools,
  removeElementByClass,
  convertElementToText,
  insertHtmlAtCaret,
} from '@groupher/editor-utils'

import './index.css'
import { COMMON_EMOJIS } from './constant'

/**
 * @typedef {Object} EmojiItem
 * @description emoji item data for twitter emoji
 * @property {String} title - emoji title
 * @property {String} imgEl — emoji image HTMLElement string
 */

/**
 * Emoji Tool for the Editor.js
 *
 * Allows to wrap inline fragment and style it somehow.
 */
export default class Emoji {
  /**
   * Specifies Tool as Inline Toolbar Tool
   *
   * @return {boolean}
   */
  static get isInline() {
    return true
  }

  /**
   * @param {{api: object}}  - Editor.js API
   */
  constructor({ api }) {
    this.api = api

    /**
     * Tag represented the term
     *
     * @type {string}
     */

    this.CSS = {
      emoji: CSS.emoji,
      emojiToolbarBlock: 'cdx-emoji-toolbar-block',
      emojiContainer: 'cdx-emoji__container',
      emojiInput: 'cdx-emoji__input',
      emojiIntro: 'cdx-emoji-suggestion__intro',
      emojiAvatar: 'cdx-emoji-suggestion__avatar',
      emojiTitle: 'cdx-emoji-suggestion__title',
      suggestionsWrapper: 'cdx-emoji-suggestions-wrapper',
      simpleSuggestionsWrapper: 'cdx-emoji-simple-suggestions-wrapper',
      simpleSuggestion: 'cdx-emoji-simple-suggestion',
      suggestion: 'cdx-emoji-suggestion',
      inlineToolBar: 'ce-inline-toolbar',
      inlineToolBarOpen: 'ce-inline-toolbar--showed',
      inlineToolbarButtons: 'ce-inline-toolbar__buttons',
    }

    /**
     * CSS classes
     */
    this.iconClasses = {
      base: this.api.styles.inlineToolButton,
      active: this.api.styles.inlineToolButtonActive,
    }

    this.nodes = {
      emojiWrapper: make('div', this.CSS.emojiContainer),
      suggestionsWrapper: make('div', this.CSS.suggestionsWrapper),
      // include latest-used && common-suggestions
      simpleSuggestionsWrapper: make('div', this.CSS.simpleSuggestionsWrapper),
      emojiInput: make('input', this.CSS.emojiInput),
    }

    this.nodes.emojiInput.addEventListener('focus', () => {
      const emojiEl = document.querySelector('#' + this.CSS.emoji)

      if (emojiEl) {
        const emojiCursorHolder = make('span', CSS.focusHolder)
        emojiEl.parentNode.insertBefore(emojiCursorHolder, emojiEl.nextSibling)
      }
    })

    // TODO: cache it
    COMMON_EMOJIS.forEach((emoji) => {
      const EmojiEl = make('div', this.CSS.simpleSuggestion, {
        innerHTML: emoji.imgEl,
      })
      this.api.tooltip.onHover(EmojiEl, emoji.title, {
        delay: 400,
        placement: 'top',
      })
      this._bindSuggestionClick(EmojiEl, emoji)
      this.nodes.simpleSuggestionsWrapper.appendChild(EmojiEl)
    })

    this.nodes.emojiWrapper.appendChild(this.nodes.simpleSuggestionsWrapper)
    this.nodes.emojiWrapper.appendChild(this.nodes.emojiInput)
    this.nodes.emojiWrapper.appendChild(this.nodes.suggestionsWrapper)

    this.nodes.emojiInput.addEventListener(
      'keyup',
      debounce(this._handleInput.bind(this), 100),
    )
  }

  /**
   * handle emoji input
   *
   * @return {void}
   */
  _handleInput(e) {
    if (e.code === 'Escape') return this._hideMentionPanel()

    if (e.code === 'Enter') {
      return console.log('select first item')
    }
    const inputVal = e.target.value

    if (inputVal.trim() !== '') {
      this.nodes.simpleSuggestionsWrapper.style.display = 'none'
      this.nodes.suggestionsWrapper.style.display = 'block'
    } else {
      setTimeout(() => {
        this.nodes.simpleSuggestionsWrapper.style.display = 'flex'
        this.nodes.suggestionsWrapper.style.display = 'none'
      })
    }

    // empty the existed suggestion if need
    const emptyContainer = make('div', this.CSS.suggestionsWrapper)
    this.nodes.suggestionsWrapper.replaceWith(emptyContainer)
    this.nodes.suggestionsWrapper = emptyContainer

    const emojiSearchResults = emojiSearch(inputVal).map((item) => {
      return {
        title: item.name,
        imgEl: twemoji.parse(item.char),
      }
    })

    for (let index = 0; index < emojiSearchResults.length; index++) {
      const { title, imgEl } = emojiSearchResults[index]

      const suggestion = this._drawSuggestion({ title, imgEl })
      this.nodes.suggestionsWrapper.appendChild(suggestion)
    }
  }

  /**
   * generate suggestion block
   * @param {EmojiItem} emoji
   * @return {HTMLElement}
   */
  _drawSuggestion(emoji) {
    const WrapperEl = make('div', this.CSS.suggestion)

    const AvatarEl = make('div', this.CSS.emojiAvatar, {
      innerHTML: emoji.imgEl,
    })

    const IntroEl = make('div', this.CSS.emojiIntro)
    const TitleEl = make('div', [this.CSS.emojiTitle], {
      innerText: emoji.title,
    })

    WrapperEl.appendChild(AvatarEl)
    IntroEl.appendChild(TitleEl)
    WrapperEl.appendChild(IntroEl)

    this._bindSuggestionClick(WrapperEl, emoji)

    return WrapperEl
  }

  /**
   * handle suggestion click
   *
   * @param {HTMLElement} el
   * @param {EmojiItem} emoji
   * @memberof Emoji
   */
  _bindSuggestionClick(el, emoji) {
    el.addEventListener('click', () => {
      this.nodes.emojiInput.value = emoji.title
      const EmojiEl = document.querySelector('#' + this.CSS.emoji)
      if (!EmojiEl) return false

      EmojiEl.innerHTML = emoji.imgEl
      EmojiEl.classList.add('no-pseudo')

      const EmojiParentEl = EmojiEl.parentNode

      // 防止重复插入 holder, 否则会导致多次聚焦后光标错位
      if (!EmojiParentEl.querySelector(`.${CSS.focusHolder}`)) {
        const EmojiCursorHolder = make('span', CSS.focusHolder)
        EmojiParentEl.insertBefore(EmojiCursorHolder, EmojiEl.nextSibling)
      }

      EmojiEl.contenteditable = true
      this.closeEmojiPopover()
      moveCaretToEnd(EmojiEl.nextElementSibling)
      // it worked !
      document.querySelector(`.${CSS.focusHolder}`).remove()
      insertHtmlAtCaret('&nbsp;')
    })
  }

  /**
   * close the emoji popover, then focus to emoji holder
   *
   * @return {void}
   */
  closeEmojiPopover() {
    this._clearSuggestions()
    const emoji = document.querySelector('#' + this.CSS.emoji)
    const inlineToolBar = document.querySelector('.' + this.CSS.inlineToolBar)

    this._clearInput()

    // this.api.toolbar.close is not work
    // so close the toolbar by remove the optn class mannully
    inlineToolBar.classList.remove(this.CSS.inlineToolBarOpen)

    // emoji holder id should be uniq
    // 在 moveCaret 定位以后才可以删除，否则定位会失败
    setTimeout(() => {
      this.removeAllHolderIds()
    }, 50)
  }

  /**
   * close the emoji popover, then focus to emoji holder
   *
   * @return {void}
   */
  _hideMentionPanel() {
    const emojiEl = document.querySelector('#' + this.CSS.emoji)
    if (!emojiEl) return

    // empty the mention input
    this._clearInput()
    this._clearSuggestions()

    // closePopover
    const inlineToolBar = document.querySelector('.' + this.CSS.inlineToolBar)
    // this.api.toolbar.close is not work
    // so close the toolbar by remove the open class manually
    // this.api.toolbar.close()
    inlineToolBar.classList.remove(this.CSS.inlineToolBarOpen)

    // move caret to end of the current emoji
    if (emojiEl.nextElementSibling) {
      moveCaretToEnd(emojiEl.nextElementSibling)
    }

    // emoji holder id should be uniq
    // 在 moveCaret 定位以后才可以删除，否则定位会失败
    setTimeout(() => {
      this.removeAllHolderIds()
      removeElementByClass(CSS.focusHolder)

      if (emojiEl.innerHTML === '&nbsp;') {
        convertElementToText(emojiEl, true, ':')
      }
    })
  }

  /**
   * Create button element for Toolbar
   * @ should not visible in toolbar, so return an empty div
   * @return {HTMLElement}
   */
  render() {
    const emptyDiv = make('div', this.CSS.emojiToolbarBlock)

    return emptyDiv
  }

  /**
   * NOTE:  inline tool must have this method
   *
   * @param {Range} range - selected fragment
   */
  surround(range) {}

  /**
   * Check and change Term's state for current selection
   */
  checkState(termTag) {
    // NOTE: if emoji is init after mention, then the restoreDefaultInlineTools should be called
    // otherwise restoreDefaultInlineTools should not be called, because the mention plugin
    // called first
    //
    // restoreDefaultInlineTools 是否调用和 mention / emoji 的初始化循序有关系，
    // 如果 mention 在 emoji 之前初始化了，那么 emoji 这里就不需要调用 restoreDefaultInlineTools,
    // 否则会导致 mention  无法正常显示。反之亦然。
    if (!termTag || termTag.anchorNode.id !== CSS.emoji) return // restoreDefaultInlineTools()

    if (termTag.anchorNode.id === CSS.emoji) {
      return this._handleEmojiActions()
    }

    // normal inline tools
    return restoreDefaultInlineTools()
  }

  /**
   * show emoji suggestions, hide normal actions like bold, italic etc...inline-toolbar buttons
   * 隐藏正常的 粗体，斜体等等 inline-toolbar 按钮，这里是借用了自带 popover 的一个 hack
   */
  _handleEmojiActions() {
    // NOTE: the custom tool only visible on next tick
    setTimeout(() => keepCustomInlineToolOnly('emoji'))

    setTimeout(() => {
      this.nodes.emojiInput.focus()
    }, 100)
  }

  /**
   * clear suggestions list
   * @memberof Emoji
   */
  _clearSuggestions() {
    const node = document.querySelector('.' + this.CSS.suggestionsWrapper)
    if (node) {
      while (node.firstChild) {
        node.removeChild(node.firstChild)
      }
    }
  }

  /**
   * clear current input
   * @memberof Emoji
   */
  _clearInput() {
    this.nodes.emojiInput.value = ''
  }

  // 删除所有 emoji-holder 的 id， 因为 closeEmojiPopover 无法处理失焦后
  // 自动隐藏的情况
  removeAllHolderIds() {
    const holders = document.querySelectorAll('.' + this.CSS.emoji)

    holders.forEach((item) => item.removeAttribute('id'))

    return false
  }

  renderActions() {
    this.nodes.emojiInput.placeholder = '搜索表情'

    return this.nodes.emojiWrapper
  }

  /**
   * Sanitizer rule
   * @return {{mark: {class: string}}}
   */
  static get sanitize() {
    return {
      [INLINE_BLOCK_TAG.emoji]: {
        class: CSS.emoji,
      },
      img: {
        class: 'emoji',
      },
    }
  }

  /**
   * hide mention panel after popover closed
   * @see @link https://editorjs.io/inline-tools-api-1#clear
   * @memberof Mention
   */
  clear() {
    /**
     * should clear anchors after user manually click outside the popover,
     * otherwise will confuse the next insert
     *
     * 用户手动点击其他位置造成失焦以后，如果没有输入的话需要清理 anchors，
     * 否则会造成下次插入 emoji 的时候定位异常
     *
     */
    setTimeout(() => this._hideMentionPanel())
  }
}
