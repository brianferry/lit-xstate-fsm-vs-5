import { LitElement, css, html, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { setup, createActor } from 'xstate';
import { match } from 'ts-pattern';
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
@customElement('my-element-v2')
export class MyElementV2 extends LitElement {
  static styles = css`${unsafeCSS(styles)}`;

  @property({ type: Number })
  count = 0;

  @property({ type: Number })
  limit = 5;

  @state()
  user?: User;

  public globalMachine = createActor(
    setup({
      types: {
        events: {} as
          | { type: 'INCREMENT' }
          | { type: 'RESET' }
          | { type: 'AUTH_ERROR' }
          | { type: 'AUTH_COMPLETE' }
          | { type: 'COUNT_UPDATED' }
      },
      actions: {
        initialize: async () => {
          const auth = await authService();
          if (auth) {
            this.user = auth;
            this.globalMachine.send({ type: 'AUTH_COMPLETE' });
          } else {
            this.globalMachine.send({ type: 'AUTH_ERROR' });
          }
        },
        increment: () => {
          this.count++;
          this.globalMachine.send({ type: 'COUNT_UPDATED' });
        },
        resetCounter: () => {
          this.count = 0;
          this.globalMachine.send({ type: 'COUNT_UPDATED' });
        }
      },
      guards: {
        canReset: () => {
          return this.user?.role === 'admin';
        },
        hasReachedLimit: () => {
          return this.count >= this.limit;
        }
      }
    })
      .createMachine({
        id: 'global',
        initial: 'initializing',
        states: {
          initializing: {
            entry: ['initialize'],
            on: {
              '*': {
                guard: 'hasReachedLimit',
                target: 'complete',
              },
              AUTH_ERROR: 'error',
              AUTH_COMPLETE: [
                {
                  target: 'default',
                }
              ],
            },
          },
          default: {
            on: {
              '*': {
                guard: 'hasReachedLimit',
                target: 'complete',
              },
              INCREMENT: {
                actions: ['increment'],
              },
              RESET: {
                guard: 'canReset',
                actions: ['resetCounter'],
              },
            }
          },
          complete: {
            on: {
              RESET: {
                guard: 'canReset',
                actions: ['resetCounter'],
                target: 'default'
              }
            }
          },
          error: {}
        }
      })).start();

  constructor() {
    super();
    this.globalMachine.subscribe(() => {
      this.requestUpdate();
    })
  }

  render() {
    const state = this.globalMachine.getSnapshot();

    return match(state.value)
      .with('initializing', () => this._renderInitializing())
      .with('default', () => this._renderDefault())
      .with('error', () => this._renderError())
      .with('complete', () => this._renderComplete())
      .exhaustive();
  }

  _renderInitializing() {
    return html`loading...`;
  }

  _renderDefault() {
    return html`
      <button @click=${() => this.globalMachine.send({ type: 'INCREMENT' })} part="button">
        count is ${this.count}
      </button>
      ${this._renderResetButton()}
    `
  }

  _renderComplete() {
    return html`
      You're done!
      ${this._renderResetButton()}
    `;
  }

  _renderError() {
    return html`Something went wrong :(`;
  }

  _renderResetButton() {
    const state = this.globalMachine.getSnapshot();
    if (state.can({ type: 'RESET' })) {
      return html`
        <button @click=${() => this.globalMachine.send({ type: 'RESET' })} part="button" ?disabled=${this.count === 0}>
          ${state.matches('complete') ? 'reset game' : 'reset'}
        </button>
      `;
    }
    return '';
  }
}


declare global {
  interface HTMLElementTagNameMap {
    'my-element-v2': MyElementV2
  }
}
