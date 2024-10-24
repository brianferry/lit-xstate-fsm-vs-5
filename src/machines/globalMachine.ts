import { createMachine, interpret } from "@xstate/fsm"
import { Task, TaskStatus } from "@lit/task";

export type StateMachineWithGuards = {
  machine: any;
  guards: any;
  args: any;
}

// function = (cachedVariables) => createMachine
export const globalMachine = (authService?: Task, saveCountService?: Task, args?: any): StateMachineWithGuards => {

  const guards = {
    condAuthIsFresh() {
      return authService?.status === TaskStatus.COMPLETE;
    },
    condIsSavingCount() {
      return saveCountService?.status === TaskStatus.PENDING;
    },
    condHasUser() {
      return !!args.user;
    },
    condLimitReached() {
      return args.count ? args.count >= 5 : false;
    },
    condCanReset(){
      return args.count ? args.count > 0 : false;
    }
  }
  const machine = interpret(createMachine({
    id: 'global',
    initial: 'initializing',
    states: {
      initializing: {
        entry: ['initialize'],
        on: {
          '*': {
            cond: () => guards.condHasUser(),
            target: 'default'
          },
          USER_UPDATED: {
            cond: () => guards.condAuthIsFresh(),
            target: 'default'
          },
        },
      },
      default: {
        on: {
          COUNT_CHANGED: {
            cond: () => guards.condLimitReached(),
            target: 'complete',
          },
          INCREMENT: {
            actions: ['increment'],
          },
          RESET: {
            cond: () => guards.condCanReset(),
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
            cond: () => guards.condCanReset(),
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
        authService?.run();
        while (authService?.status !== TaskStatus.COMPLETE) {
          await new Promise((res) => setTimeout(res, 100));
        }
        machine.send('USER_UPDATED');
      },
      saveCount: async () => {
        saveCountService?.run();
      },
      increment: () => {
        typeof args.count !== 'undefined' ? args.count++ : args.count = 0;
        machine.send('COUNT_CHANGED');
      },
      resetCounter: () => {
        args.count = 0;
      },
    }
  }));

  return { machine, guards, args };
}