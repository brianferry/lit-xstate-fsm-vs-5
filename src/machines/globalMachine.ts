import { createMachine, EventObject, interpret, StateMachine, Typestate } from "@xstate/fsm"
import { Task, TaskStatus } from "@lit/task";

export type Guards = {
  condAuthIsFresh(): boolean;
  condIsSavingCount(): boolean;
  condHasUser(): boolean;
  condLimitReached(): boolean;
  condCanReset(): boolean;
}

export type StateMachineWithGuards<T> = {
  machine: StateMachine.Service<object, EventObject, Typestate<object>>;
  guards: Guards;
  properties: T;
}

export const globalMachine = <T>(authService?: Task, saveCountService?: Task, properties?: T & any): StateMachineWithGuards<T> => {

  const guards: Guards = {
    condAuthIsFresh() {
      return authService?.status === TaskStatus.COMPLETE;
    },
    condIsSavingCount() {
      return saveCountService?.status === TaskStatus.PENDING;
    },
    condHasUser() {
      return !!properties.user;
    },
    condLimitReached() {
      return properties.count ? properties.count >= 5 : false;
    },
    condCanReset(){
      return properties.count ? properties.count > 0 : false;
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
        typeof properties.count !== 'undefined' ? properties.count++ : properties.count = 0;
        machine.send('COUNT_CHANGED');
      },
      resetCounter: () => {
        properties.count = 0;
      },
    }
  }));

  return { machine, guards, properties };
}