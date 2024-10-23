import { createMachine, interpret } from "@xstate/fsm"
import { User } from "../services/authService.js"
import { Task, TaskStatus } from "@lit/task";

export type StateMachineWithGuards = {
  machine: any;
  guards: any;
}

// function = (cachedVariables) => createMachine
export const globalMachine = (user?: User, count?: number, authService?: Task, saveCountService?: Task): StateMachineWithGuards => {

  const guards = {
    condAuthIsFresh() {
      return authService?.status === TaskStatus.COMPLETE;
    },
    condIsSavingCount() {
      return saveCountService?.status === TaskStatus.PENDING;
    },
    condHasUser() {
      return !!user;
    },
    condLimitReached() {
      return count ? count >= 5 : false;
    },
    condCanReset(){
      return count ? count > 0 : false;
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
        console.log('increment');
        console.log(count);
        if(count) {
          count++;
          machine.send('COUNT_CHANGED');
        }
      },
      resetCounter: () => {
        count = 0;
      },
    }
  }));

  return { machine, guards };
}