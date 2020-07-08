import {
  make,
  debounce,
  CSS,
  INLINE_BLOCK_TAG,
  moveCaretToEnd,
  keepCustomInlineToolOnly,
  restoreDefaultInlineTools,
  removeElementByClass,
  convertElementToTextIfNeed,
} from '@groupher/editor-utils'
import './index.css'

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
      emojiDesc: 'cdx-emoji-suggestion__desc',
      suggestionContainer: 'cdx-emoji-suggestion-container',
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

    this.emojiContainer = make('div', [this.CSS.emojiContainer], {})
    this.suggestionContainer = make('div', [this.CSS.suggestionContainer], {})

    this.emojiInput = make('input', [this.CSS.emojiInput], {
      innerHTML: 'emoji',
      autofocus: true,
    })

    this.emojiInput.addEventListener('focus', () => {
      const emojiEl = document.querySelector('#' + this.CSS.emoji)

      if (emojiEl) {
        const emojiCursorHolder = make('span', CSS.focusHolder)
        emojiEl.parentNode.insertBefore(emojiCursorHolder, emojiEl.nextSibling)
      }
    })

    /**
     * should clear anchors after user manually click outside the popover,
     * otherwise will confuse the next insert
     *
     * 用户手动点击其他位置造成失焦以后，如果没有输入的话需要清理 anchors，
     * 否则会造成下次插入 emoji 的时候定位异常
     *
     * @return {void}
     */
    this.emojiInput.addEventListener('blur', () => {
      setTimeout(() => {
        const emojiEl = document.querySelector('#' + this.CSS.emoji)

        if (this.emojiInput.value.trim() === '') {
          this.cleanUp()
        }
      }, 300)
    })

    this.emojiContainer.appendChild(this.emojiInput)
    this.emojiContainer.appendChild(this.suggestionContainer)

    this.emojiInput.addEventListener(
      'keyup',
      debounce(this.handleInput.bind(this), 300),
    )
  }

  /**
   * handle emoji input
   *
   * @return {void}
   */
  handleInput(ev) {
    if (ev.code === 'Backspace' && this.emojiInput.value === '') {
      this.cleanUp()
      return
    }
    if (ev.code === 'Escape') {
      // clear the mention input and close the toolbar
      this.emojiInput.value = ''
      this.cleanUp()
      return
    }

    if (ev.code === 'Enter') {
      return console.log('select first item')
    }

    console.log('ev: ', ev.code)

    const user = {
      id: 1,
      title: 'mydaerxym',
      desc: 'author of the ..',
      avatar: 'https://avatars0.githubusercontent.com/u/6184465?s=40&v=4',
    }

    const suggestion = this.makeSuggestion(user)

    this.suggestionContainer.appendChild(suggestion)
  }

  /**
   * generate suggestion block
   *
   * @return {HTMLElement}
   */
  makeSuggestion(user) {
    const emoji = document.querySelector('#' + this.CSS.emoji)
    const suggestionWrapper = make('div', [this.CSS.suggestion], {})

    const avatar = make('img', [this.CSS.emojiAvatar], {
      src: user.avatar,
    })

    const intro = make('div', [this.CSS.emojiIntro], {})
    const title = make('div', [this.CSS.emojiTitle], {
      innerText: user.title,
    })
    const desc = make('div', [this.CSS.emojiDesc], {
      innerText: user.desc,
    })

    suggestionWrapper.appendChild(avatar)
    intro.appendChild(title)
    intro.appendChild(desc)
    suggestionWrapper.appendChild(intro)

    suggestionWrapper.addEventListener('click', () => {
      this.emojiInput.value = user.title
      emoji.innerHTML = user.title
      const emojiCursorHolder = make('span', CSS.focusHolder)
      emoji.parentNode.insertBefore(emojiCursorHolder, emoji.nextSibling)

      // console.log("--> emoji click before focus: ", emoji)
      emoji.contenteditable = true
      this.closeEmojiPopover()
      moveCaretToEnd(emoji.nextElementSibling)
      // it worked !
      document.querySelector(`.${CSS.focusHolder}`).remove()
    })

    // https://avatars0.githubusercontent.com/u/6184465?s=40&v=4

    return suggestionWrapper
  }

  /**
   * close the emoji popover, then focus to emoji holder
   *
   * @return {void}
   */
  closeEmojiPopover() {
    this.clearSuggestions()
    const emoji = document.querySelector('#' + this.CSS.emoji)
    const inlineToolBar = document.querySelector('.' + this.CSS.inlineToolBar)

    // empty the emoji input
    this.emojiInput.value = ''

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
  cleanUp() {
    const emojiEl = document.querySelector('#' + this.CSS.emoji)
    if (!emojiEl) return

    // empty the mention input
    // this.mentionInput.value = ''
    this.clearSuggestions()

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
      convertElementToTextIfNeed(emojiEl, this.emojiInput, ':')
    }, 50)
  }

  /**
   * Create button element for Toolbar
   * @ should not visible in toolbar, so return an empty div
   * @return {HTMLElement}
   */
  render() {
    const emptyDiv = make('div', [this.CSS.emojiToolbarBlock], {})

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
    if (!termTag || termTag.anchorNode.id !== CSS.emoji) return

    if (termTag.anchorNode.id === CSS.emoji) {
      return this.handleEmojiActions()
    }

    // normal inline tools
    return restoreDefaultInlineTools()
  }

  /**
   * show emoji suggestions, hide normal actions like bold, italic etc...inline-toolbar buttons
   * 隐藏正常的 粗体，斜体等等 inline-toolbar 按钮，这里是借用了自带 popover 的一个 hack
   */
  handleEmojiActions() {
    keepCustomInlineToolOnly('emoji')

    this.clearSuggestions()
    // this.removeAllHolderIds();
    this.emojiInput.value = ''

    setTimeout(() => {
      this.emojiInput.focus()
    }, 100)
  }

  // clear suggestions list
  clearSuggestions() {
    const node = document.querySelector('.' + this.CSS.suggestionContainer)
    if (node) {
      while (node.firstChild) {
        node.removeChild(node.firstChild)
      }
    }
  }

  // 删除所有 emoji-holder 的 id， 因为 closeEmojiPopover 无法处理失焦后
  // 自动隐藏的情况
  removeAllHolderIds() {
    const holders = document.querySelectorAll('.' + this.CSS.emoji)

    holders.forEach((item) => item.removeAttribute('id'))

    return false
  }

  renderActions() {
    this.emojiInput.placeholder = 'Emoji Code'

    return this.emojiContainer
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
    }
  }
}
