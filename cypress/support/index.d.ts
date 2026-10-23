export {};

declare global {
  namespace Cypress {
    interface Chainable {
      /** Submit credentials; empty strings leave fields blank. */
      login(username?: string, password?: string): Chainable<void>;

      /** Restore a cached login session and open the inventory page. */
      sessionLogin(username?: string): Chainable<void>;
    }
  }
}
