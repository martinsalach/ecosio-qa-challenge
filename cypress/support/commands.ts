import selectors from './selectors';

declare global {
  namespace Cypress {
    interface Chainable {
      /** Submit credentials; empty strings leave fields blank. */
      login(username?: string, password?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (username = 'standard_user', password = 'secret_sauce') => {
  cy.visit('/');

  if (username) {
    cy.get(selectors.auth.user).type(username);
  }

  if (password) {
    cy.get(selectors.auth.password).type(password);
  }

  cy.get(selectors.auth.loginBtn).click();
});
