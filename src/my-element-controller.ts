import { LitElement, PropertyValues, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { authService, User } from './services/authService';
import { CachePropertyController } from './lib/cache-property-controller.js';
import { MachineController } from './machine-controller.js';
import { globalMachine } from './machines/globalMachine.js';
import { Task } from '@lit/task/task.js';

window.sessionStorage.setItem('my-element:user', JSON.stringify({
  id: '1',
  name: 'heymp-old',
  role: 'admin'
}))

window.sessionStorage.setItem('my-element:count', JSON.stringify(2))

/**
 * An example element.
 *
 * @slot - This element has a slot
 * @csspart button - The button
 */
@customElement('my-element-controller')
export class MyElementController extends LitElement {

  cache = new CachePropertyController(this, ['user', 'count'], () => {
    return `my-element`;
  });

  @state()
  count: number = 0;

  @state()
  user: User = { id: '', name: '', role: 'anonymous' };

  authService = new Task(this, {
    autoRun: false,
    args: () => [] as const,
    task: () => authService(),
    onComplete: (user) => {
      this.user = user;
      this.requestUpdate();
    },
    onError: (error: any) => {
      console.log(error);
    }
  });

  saveCountService = new Task(this, {
    autoRun: false,
    args: () => [] as const,
    task: () => {
      return new Promise((res) => {
        setTimeout(() => {
          res(true)
        }, 2000);
      });
    },
    onComplete: () => {
      console.log('count saved')
    },
    onError: (error: any) => {
      console.log(error);
    }
  });

  #machine?: MachineController = new MachineController(this, globalMachine(this.user, this.count, this.authService, this.saveCountService));

  render() {
    const state = this.#machine?.getMachineState();

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
        <button @click=${() => this.#machine?.sendMachineMessage('INCREMENT')} part="button">
          count is ${this.count}
        </button>
        ${this.#machine?.guards.condAuthIsFresh() ? html`
          <button part="button" @click=${() => this.#machine?.sendMachineMessage('SAVE_COUNT')} ?disabled=${this.#machine?.guards.condIsSavingCount()}>
            save count
          </button>
        `: ''}
        ${this._renderResetButton()}
      `
    }
  }

  _renderResetButton() {
    const state = this.#machine?.getMachineState();
    if (this.#machine?.guards.condCanReset()) {
      return html`
        <button @click=${() => this.#machine?.sendMachineMessage('RESET')} part="button" ?disabled=${this.count === 0}>
          ${state.matches('complete') ? 'reset game' : 'reset'}
        </button>
      `;
    }
    return '';
  }
}


declare global {
  interface HTMLElementTagNameMap {
    'my-element-controller': MyElementController
  }
}