import { createMachine, interpret } from '@xstate/fsm';
import { Task, TaskStatus } from '@lit/task';
import { authService, User } from './services/authService.js';
import { ReactiveController, ReactiveControllerHost } from 'lit';

export class MachineController implements ReactiveController {

  private host: ReactiveControllerHost & Element;

  public user?: User;
  public count: number = 0;
  

  public globalMachine = interpret(createMachine({
    id: 'global',
    initial: 'initializing',
    states: {
      initializing: {
        entry: ['initialize'],
        on: {
          '*': {
            cond: () => this.condHasUser(),
            target: 'default'
          },
          USER_UPDATED: {
            cond: () => this.condAuthIsFresh(),
            target: 'default'
          },
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
          SAVE_COUNT: {
            actions: ['saveCount']
          }
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
        this.authService.run();
        while(this.authService.status !== TaskStatus.COMPLETE) {
          await new Promise((res) => setTimeout(res, 100));
        }
        this.globalMachine.send('USER_UPDATED');
      },
      saveCount: async () => {
        this.saveCountService.run();
      },
      increment: () => {
        this.count++;
        this.globalMachine.send('COUNT_CHANGED');
      },
      resetCounter: () => {
        this.count = 0;
      },
    }
  }));

  public readonly authService: Task<any>;
  public readonly saveCountService: Task<any>;

  constructor(
    host: ReactiveControllerHost & Element
  ) {
    this.host = host;
    this.host.addController(this);

    this.authService = new Task(this.host, {
      autoRun: false,
      args: () => [] as const,
      task: () => authService(),
      onComplete: (user) => {
        this.user = user;
        this.host.requestUpdate();
      },
      onError: (error: any) => {
        console.log(error);
      }
    });

    this.saveCountService = new Task(this.host, {
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
  }

  hostConnected(): void {
    this.globalMachine.start();
    this.globalMachine.subscribe((evt: any) => {
      console.log('machine state changed');
      console.log(evt);
      this.host.requestUpdate();
    });
  }

  hostDisconnected(): void {
    this.globalMachine.stop();
  }

  getMachineState() {
    return this.globalMachine.state;
  }

  subscribeToMachine(cb: () => void) {
    this.globalMachine.subscribe(cb);
  }

  sendMachineMessage(type: string) {
    this.globalMachine.send({ type });
  }

  setUser(user: User) {
    this.user = user;
  }

  setCount(count: number) {
    this.count = count;
  }

  condAuthIsFresh() {
    return this.authService.status === TaskStatus.COMPLETE;
  }

  condIsSavingCount() {
    return this.saveCountService.status === TaskStatus.PENDING;
  }

  condHasUser() {
    return !!this.user;
  }

  condLimitReached() {
    return this.count >= 5;
  }

  condCanReset() {
    return this.count > 0;
  }
}
