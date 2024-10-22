import { LitElement, PropertyValues, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { authService } from './services/authService';
import { CachePropertyController } from './lib/cache-property-controller.js';
import { MachineController } from './machine-controller.js';

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
  
  @property({ type: Number })
  count = 0;
  
  @state()
  user?: Awaited<ReturnType<typeof authService>>;

  #machine: MachineController = new MachineController(this);

  protected updated(_changedProperties: PropertyValues): void {
    if (_changedProperties.has('count')) {
      this.#machine.setCount(this.count);
    }
  }

  render() {
    const state = this.#machine.getMachineState();

    if (state.matches('initializing')) {
      return html`
        <div>Hello ${this.#machine.user?.name ? this.#machine.user?.name : this.user?.name}</div>
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
        <div>Hello ${this.#machine.user?.name ? this.#machine.user?.name : this.user?.name}</div>
        <button @click=${() => this.#machine.sendMachineMessage('INCREMENT')} part="button">
          count is ${this.#machine.count}
        </button>
        ${this.#machine.condAuthIsFresh() ? html`
          <button part="button" @click=${() => this.#machine.sendMachineMessage('SAVE_COUNT')} ?disabled=${this.#machine.condIsSavingCount()}>
            save count
          </button>
        `: ''}
        ${this._renderResetButton()}
      `
    }
  }

  _renderResetButton() {
    const state = this.#machine.getMachineState();
    if (this.#machine.condCanReset()) {
      return html`
        <button @click=${() => this.#machine.sendMachineMessage('RESET')} part="button" ?disabled=${this.#machine.count === 0}>
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