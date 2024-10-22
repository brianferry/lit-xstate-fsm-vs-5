import { createMachine, interpret } from '@xstate/fsm';
import { authService } from './services/authService';
import { Task } from '@lit/task';
import { authService } from './services/authService.js';
import { MyElement } from './my-element.js';

type Constructor<T = {}> = new (...args: any[]) => T;

export const MachineMixin = <T extends Constructor<MyElement>>(superClass: T) => {
  class MachineMixinClass extends superClass {
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
          // this.authService?.run();
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
        }
      }
    })).start();

    private readonly authService = new Task(this, {
      args: () => [] as const,
      task: () => authService(),
      onComplete: (user) => {
        this.user = user;
      },
      onError: (error) => {
        console.log(error);
      }
    });

    private readonly saveCountService = new Task(this, {
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
      onError: (error) => {
        console.log(error);
      }
    });

    private condCanReset() {
      return this.user?.role === 'admin';
    }

    private condLimitReached() {
      return this.count >= this.limit;
    }

    private condHasUser() {
      return !!this.user;
    }
  }
  
  return MachineMixinClass as T;
};
