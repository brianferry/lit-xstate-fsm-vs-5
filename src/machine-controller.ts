import { ReactiveController, ReactiveControllerHost } from 'lit';
import { StateMachineWithGuards } from './machines/globalMachine.js';

export class MachineController implements ReactiveController {

  private host: ReactiveControllerHost & Element;

  public machineWithGuards?: StateMachineWithGuards;

  public guards: any;

  constructor(
    host: ReactiveControllerHost & Element,
    machine: StateMachineWithGuards
  ) {
    this.host = host;
    this.host.addController(this);

    this.machineWithGuards = machine;
    this.guards = machine.guards;
  }

  hostConnected(): void {
    this.machineWithGuards?.machine?.start();
    this.machineWithGuards?.machine?.subscribe((evt) => {
      this.host.requestUpdate();
    });
  }

  hostDisconnected(): void {
    this.machineWithGuards?.machine?.stop();
  }

  getMachineState() {
    return this.machineWithGuards?.machine?.state;
  }

  subscribeToMachine(cb: () => void) {
    this.machineWithGuards?.machine?.subscribe(cb);
  }

  sendMachineMessage(type: string) {
    this.machineWithGuards?.machine?.send({ type });
  }
}
