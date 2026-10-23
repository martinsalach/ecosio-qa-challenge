import selectors from './selectors';

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

Cypress.Commands.add('sessionLogin', (username = 'standard_user') => {
  const domain = new URL(Cypress.config('baseUrl')!).hostname;

  cy.session(
    ['login', Cypress.config('baseUrl'), username],
    () => {
      cy.login(username);
      cy.location('pathname').should('eq', '/inventory.html');
      cy.get(selectors.inventory.inventoryList).should('be.visible');
      // Wait for the authentication cookie before Cypress caches the session.
      cy.getCookie('session-username', { domain })
        .should('exist')
        .and('have.property', 'value', username);
    },
    {
      validate() {
        cy.getCookie('session-username', { domain })
          .should('exist')
          .and('have.property', 'value', username);
      },
    }
  );

  // The host returns 404 for this client-side route; verify the rendered page below.
  cy.visit('/inventory.html', { failOnStatusCode: false });
  cy.location('pathname').should('eq', '/inventory.html');
  cy.get(selectors.inventory.inventoryList).should('be.visible');
});
