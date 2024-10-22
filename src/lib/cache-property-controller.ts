import {ReactiveController, ReactiveControllerHost} from 'lit';

export class CachePropertyController<T extends ReactiveControllerHost, P extends keyof T> implements ReactiveController {
  host: T;
  private warningHash = new Set<string>();

  constructor(host: T, public properties: P[], public key: () => string | false) {
    (this.host = host).addController(this);
  }

  hostUpdate(): void {
    for (let prop of this.properties) {
      // check if the property exists
      // if not, bail
      if (!(prop in this.host)) {
        if (!this.warningHash.has(String(prop))) {
          console.warn(`Property doesn't exist.`)
          this.warningHash.add(String(prop));
        }
        return;
      }

      // check to make sure we have a
      // key, if not, bail
      const key = this.key();
      if (!key) {
        return;
      }

      const keyName = `${key}:${String(prop)}`;

      console.log(keyName);

      const currentValue = this.host[prop];
      if (!currentValue) {
        // read from cache
        const cache = window.sessionStorage.getItem(keyName);
        if (cache) {
          this.host[prop] = JSON.parse(cache);
        }
      }
      else {
        // write to cache
        window.sessionStorage.setItem(keyName, JSON.stringify(currentValue));
      }
    }
  }
}
