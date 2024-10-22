import { LitElement, PropertyValues, css, html, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { asyncReplace } from 'lit/directives/async-replace.js';
import { authService } from './services/authService';
import { CachePropertyController } from './lib/cache-property-controller.js';
import { MachineMixin } from './machine.js';
// vite specific way of importing css
import styles from './my-element.css?raw';

const EVENTS = [
  'USER_UPDATED',
  'COUNT_UPDATED',
  'COUNT_INCREMENT',
  'AUTH_SERVICE_COMPLETE',
  'AUTH_SERVICE_ERROR',
  'RESET',
] as const;

type EVENT = typeof EVENTS[number];

window.sessionStorage.setItem('my-element:user', JSON.stringify({
  id: '1',
  name: 'heymp-old',
  role: 'admin'
}))

/**
 * An example element.
 *
 * @slot - This element has a slot
 * @csspart button - The button
 */
export class MyElement extends MachineMixin(LitElement) {
  static styles = css`${unsafeCSS(styles)}`;

  cache = new CachePropertyController(this, ['user', 'count'], () => {
    return `my-element`;
  });

  @property({ type: Number })
  count = 0;

  @property({ type: Number })
  limit = 5;

  @state()
  user?: Awaited<ReturnType<typeof authService>>;

  @state()
  authServiceStatus: 'initial' | 'pending' | 'complete' | 'error' = 'initial';

  protected updated(_changedProperties: PropertyValues): void {
    if (_changedProperties.has('user')) {
      this.globalMachine.send({ type: 'USER_UPDATED' });
    }
    if (_changedProperties.has('count')) {
      this.globalMachine.send({ type: 'COUNT_UPDATED' });
    }
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    this.globalMachine.start();
    this.globalMachine.subscribe(() => {
      this.requestUpdate();
    })
  }

  render() {
    const state = this.globalMachine.state;

    if (state.matches('initializing')) {
      return html`
        <div>Hello ${this.user?.name}</div>
        loading...
      `;
    }
    if (state.matches('complete')) {
      return html`
        You're done!
        ${this._renderResetButton()}
      `;
    }
    if (state.matches('hi')) {
      return html`Something went wrong :(`;
    }
    if (state.matches('default')) {
      return html`
        <div>Hello ${this.user?.name}</div>
        <button @click=${() => this.globalMachine.send('INCREMENT')} part="button">
          count is ${this.count}
        </button>
        ${this.condAuthIsFresh() ? html`
          <button part="button" @click=${() => this.globalMachine.send('SAVE_COUNT')} ?disabled=${this.condIsSavingCount()}>
            save count
          </button>
        `: ''}
        ${this._renderResetButton()}
      `
    }
  }

  _renderResetButton() {
    const state = this.globalMachine.state;
    if (this.condCanReset()) {
      return html`
        <button @click=${() => this.globalMachine.send('RESET')} part="button" ?disabled=${this.count === 0}>
          ${state.matches('complete') ? 'reset game' : 'reset'}
        </button>
      `;
    }
    return '';
  }
}


declare global {
  interface HTMLElementTagNameMap {
    'my-element': MyElement
  }
}

customElements.define('my-element', MyElement);
