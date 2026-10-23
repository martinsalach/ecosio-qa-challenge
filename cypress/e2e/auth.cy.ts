import selectors from '../support/selectors';

describe('auth', () => {
  it('login with valid credentials', () => {
    cy.login();

    cy.location('pathname').should('eq', '/inventory.html');
    cy.get(selectors.inventory.title).should('have.text', 'Products');
    cy.get(selectors.inventory.inventoryList).should('be.visible');
  });
  it('login with an incorrect password', () => {
    cy.login('standard_user', 'incorrect_password');

    cy.get(selectors.auth.error)
      .should('be.visible')
      .and(
        'have.text',
        'Epic sadface: Username and password do not match any user in this service'
      );
    cy.location('pathname').should('eq', '/');
    cy.get(selectors.auth.loginBtn).should('be.visible');
  });
  it('log in successfully after correcting an incorrect password without reloading', () => {
    cy.login('standard_user', 'incorrect_password');

    cy.get(selectors.auth.error)
      .should('be.visible')
      .and(
        'have.text',
        'Epic sadface: Username and password do not match any user in this service'
      );
    cy.location('pathname').should('eq', '/');
    cy.get(selectors.auth.user).should('be.visible').and('have.value', 'standard_user');
    cy.get(selectors.auth.password).should('be.visible');
    cy.get(selectors.auth.loginBtn).should('be.visible').and('be.enabled');

    cy.get(selectors.auth.password).clear();
    cy.get(selectors.auth.password).type('secret_sauce');
    cy.get(selectors.auth.loginBtn).click();

    cy.location('pathname').should('eq', '/inventory.html');
    cy.get(selectors.inventory.title).should('have.text', 'Products');
    cy.get(selectors.inventory.inventoryList)
      .should('be.visible')
      .find(selectors.inventory.item)
      .should('have.length.greaterThan', 0);
    cy.get(selectors.auth.error).should('not.exist');
    cy.get(selectors.auth.user).should('not.exist');
    cy.get(selectors.auth.password).should('not.exist');
    cy.get(selectors.auth.loginBtn).should('not.exist');
  });
  it('login with a locked-out user', () => {
    cy.login('locked_out_user');

    cy.get(selectors.auth.error)
      .should('be.visible')
      .and('have.text', 'Epic sadface: Sorry, this user has been locked out.');
    cy.location('pathname').should('eq', '/');
    cy.get(selectors.auth.loginBtn).should('be.visible');
  });
  it('submit without a username', () => {
    cy.login('');

    cy.get(selectors.auth.user).should('have.value', '');
    cy.get(selectors.auth.error)
      .should('be.visible')
      .and('have.text', 'Epic sadface: Username is required');
    cy.location('pathname').should('eq', '/');
    cy.get(selectors.auth.loginBtn).should('be.visible');
  });
  it('submit without a password', () => {
    cy.login('standard_user', '');

    cy.get(selectors.auth.password).should('have.value', '');
    cy.get(selectors.auth.error)
      .should('be.visible')
      .and('have.text', 'Epic sadface: Password is required');
    cy.location('pathname').should('eq', '/');
    cy.get(selectors.auth.loginBtn).should('be.visible');
  });
  it('unauthenticated users get redirect to signin page', () => {
    cy.visit('/inventory.html', { failOnStatusCode: false });

    cy.location('pathname').should('eq', '/');
    cy.get(selectors.auth.user).should('be.visible');
    cy.get(selectors.auth.password).should('be.visible');
    cy.get(selectors.auth.loginBtn).should('be.visible');
    cy.get(selectors.auth.error)
      .should('be.visible')
      .and(
        'have.text',
        "Epic sadface: You can only access '/inventory.html' when you are logged in."
      );
    cy.get(selectors.inventory.inventoryList).should('not.exist');
  });
  it('users can logout', () => {
    cy.login();
    cy.location('pathname').should('eq', '/inventory.html');
    cy.get(selectors.menu.openBtn).click();
    cy.get(selectors.menu.logoutLink).should('be.visible').click();

    cy.location('pathname').should('eq', '/');
    cy.get(selectors.auth.user).should('be.visible');
    cy.get(selectors.auth.password).should('be.visible');
    cy.get(selectors.auth.loginBtn).should('be.visible');
    cy.get(selectors.inventory.inventoryList).should('not.exist');
  });
  it('logout, then attempt to access protected route', () => {
    cy.login();
    cy.location('pathname').should('eq', '/inventory.html');
    cy.get(selectors.menu.openBtn).click();
    cy.get(selectors.menu.logoutLink).should('be.visible').click();
    cy.location('pathname').should('eq', '/');

    cy.visit('/inventory.html', { failOnStatusCode: false });

    cy.location('pathname').should('eq', '/');
    cy.get(selectors.auth.user).should('be.visible');
    cy.get(selectors.auth.password).should('be.visible');
    cy.get(selectors.auth.loginBtn).should('be.visible');
    cy.get(selectors.auth.error)
      .should('be.visible')
      .and(
        'have.text',
        "Epic sadface: You can only access '/inventory.html' when you are logged in."
      );
    cy.get(selectors.inventory.inventoryList).should('not.exist');
  });
});
