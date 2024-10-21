import { LitElement, css, html, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { createMachine, interpret } from '@xstate/fsm';
// vite specific way of importing css
import styles from './my-element.css?raw';

type User = {
  id: string,
  name: string,
  role: 'admin' | 'editor' | 'user'
}

async function authService(): Promise<User> {
  return new Promise(res => {
    setTimeout(() => {
      res({
        id: '1',
        name: 'heymp',
        role: 'admin'
      })
    }, 1000);
  });
}

/**
 * An example element.
 *
 * @slot - This element has a slot
 * @csspart button - The button
 */
@customElement('my-element')
export class MyElement extends LitElement {
  static styles = css`${unsafeCSS(styles)}`;

  @property({ type: Number })
  count = 0;

  @property({ type: Number })
  limit = 5;

  @state()
  user?: User;

  public globalMachine = interpret(createMachine({
    id: 'global',
    initial: 'initializing',
    states: {
      initializing: {
        entry: ['initialize'],
        on: {
          ERROR: 'error',
          COMPLETE: [
            {
              cond: () => this.condLimitReached(),
              target: 'complete',
            },
            {
              target: 'default',
            }
          ],
        },
      },
      default: {
        on: {
          COUNT_CHANGED: {
            cond: () => this.condLimitReached(),
            target: 'complete',
          },
          INCREMENT: {
            actions: ['increment'],
          },
          RESET: {
            cond: () => this.condCanReset(),
            actions: ['resetCounter'],
          },
        }
      },
      complete: {
        on: {
          RESET: {
            cond: () => this.condCanReset(),
            actions: ['resetCounter'],
            target: 'default',
          }
        }
      },
      error: {}
    }
  }, {
    actions: {
      initialize: async () => {
        const auth = await authService();
        if (auth) {
          this.user = auth;
          this.globalMachine.send('COMPLETE');
        } else {
          this.globalMachine.send('ERROR');
        }
      },
      increment: () => {
        this.count++;
        this.globalMachine.send('COUNT_CHANGED');
      },
      resetCounter: () => {
        this.count = 0;
      }
    }
  })).start();

  constructor() {
    super();
    this.globalMachine.subscribe(() => {
      this.requestUpdate();
    });
  }

  render() {
    const state = this.globalMachine.state;

    if (state.matches('initializing')) {
      return html`loading...`;
    }
    if (state.matches('complete')) {
      return html`
        You're done!
        ${this._renderResetButton()}
      `;
    }
    if (state.matches('error')) {
      return html`Something went wrong :(`;
    }
    if (state.matches('default')) {
      return html`
        <button @click=${() => this.globalMachine.send('INCREMENT')} part="button">
          count is ${this.count}
        </button>
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

  private condCanReset() {
    return this.user?.role === 'admin';
  }

  private condLimitReached() {
    return this.count >= this.limit;
  }
}


declare global {
  interface HTMLElementTagNameMap {
    'my-element': MyElement
  }
}
