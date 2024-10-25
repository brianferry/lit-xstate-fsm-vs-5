import { ReactiveController, ReactiveControllerHost } from 'lit';
import { Guards, StateMachineWithGuards } from './machines/globalMachine.js';

export class MachineController<T> implements ReactiveController {

  private host: ReactiveControllerHost & Element;

  #machine?: StateMachineWithGuards<T>;

  constructor(
    host: ReactiveControllerHost & Element,
    machine: StateMachineWithGuards<T>
  ) {
    this.host = host;
    this.host.addController(this);

    this.#machine = machine;
  }

  hostConnected(): void {
    this.#machine?.machine?.start();
    this.#machine?.machine?.subscribe((evt) => {
      this.host.requestUpdate();
    });
  }

  hostDisconnected(): void {
    this.#machine?.machine?.stop();
  }

  getMachine() {
    return this.#machine?.machine;
  }

  getMachineGuards(): Guards | undefined {
    return this.#machine?.guards;
  }

  getMachineProps(): T | undefined {
    return this.#machine?.properties;
  }

  getMachineState() {
    return this.#machine?.machine?.state;
  }

  subscribeToMachine(cb: () => void) {
    this.#machine?.machine?.subscribe(cb);
  }

  sendMachineMessage(type: string) {
    this.#machine?.machine?.send({ type });
  }

}
