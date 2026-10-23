import { InventoryPage } from '../pages/InventoryPage';
import { fixtureProduct } from '../support/products';
import selectors from '../support/selectors';

const inventoryPage = new InventoryPage();

describe('cart management', { testIsolation: true }, () => {
  beforeEach(() => {
    cy.sessionLogin();
  });

  it('add multiple items to cart', () => {
    const selectedProducts = [
      fixtureProduct('Sauce Labs Backpack'),
      fixtureProduct('Sauce Labs Bike Light'),
    ];

    cy.get(selectors.cart.badge).should('not.exist');

    selectedProducts.forEach(({ name }, index) => {
      inventoryPage.addProduct(name);
      cy.contains(selectors.inventory.itemName, name)
        .closest(selectors.inventory.item)
        .within(() => {
          cy.get(selectors.inventory.removeBtn).should('be.visible');
        });
      cy.get(selectors.cart.badge).should('have.text', String(index + 1));
    });

    cy.get(selectors.cart.link).click();
    cy.location('pathname').should('eq', '/cart.html');
    cy.get(selectors.cart.item).should('have.length', selectedProducts.length);
    cy.get(selectors.cart.badge).should('have.text', String(selectedProducts.length));

    selectedProducts.forEach(({ name, price }) => {
      cy.contains(selectors.inventory.itemName, name)
        .should('have.text', name)
        .closest(selectors.cart.item)
        .within(() => {
          cy.get(selectors.inventory.itemPrice).should('have.text', `$${price.toFixed(2)}`);
          cy.get(selectors.cart.quantity).should('have.text', '1');
        });
    });
  });
  it('add item from its details page', () => {
    const product = fixtureProduct('Sauce Labs Backpack');

    cy.get(selectors.cart.badge).should('not.exist');
    cy.contains(selectors.inventory.itemName, product.name).click();
    cy.location('pathname').should('eq', '/inventory-item.html');
    cy.get(selectors.inventory.itemName).should('have.text', product.name);
    cy.get(selectors.inventory.itemPrice).should('have.text', `$${product.price.toFixed(2)}`);

    cy.get(selectors.productDetails.addToCartBtn).should('be.visible').click();
    cy.get(selectors.productDetails.removeBtn).should('be.visible');
    cy.get(selectors.productDetails.addToCartBtn).should('not.exist');
    cy.get(selectors.cart.badge).should('have.text', '1');

    cy.get(selectors.cart.link).click();
    cy.location('pathname').should('eq', '/cart.html');
    cy.get(selectors.cart.badge).should('have.text', '1');
    cy.get(selectors.cart.item)
      .should('have.length', 1)
      .within(() => {
        cy.get(selectors.inventory.itemName).should('have.text', product.name);
        cy.get(selectors.inventory.itemPrice).should('have.text', `$${product.price.toFixed(2)}`);
        cy.get(selectors.cart.quantity).should('have.text', '1');
      });
  });
  it('remove an item from cart', () => {
    const selectedProducts = [
      fixtureProduct('Sauce Labs Backpack'),
      fixtureProduct('Sauce Labs Bike Light'),
    ];
    const [removedProduct, remainingProduct] = selectedProducts;

    inventoryPage.addProducts(selectedProducts);

    cy.get(selectors.cart.link).click();
    cy.location('pathname').should('eq', '/cart.html');
    cy.get(selectors.cart.item).should('have.length', selectedProducts.length);
    cy.get(selectors.cart.badge).should('have.text', String(selectedProducts.length));

    cy.contains(selectors.inventory.itemName, removedProduct.name)
      .closest(selectors.cart.item)
      .find(selectors.cart.removeBtn)
      .click();

    cy.get(selectors.cart.badge).should('have.text', '1');
    // Exact contents catch removal of the wrong product or loss of the other item.
    cy.get(selectors.cart.item)
      .should('have.length', 1)
      .within(() => {
        cy.get(selectors.inventory.itemName).should('have.text', remainingProduct.name);
      });
  });
  it('remove a product directly from inventory while preserving other cart items', () => {
    const backpack = fixtureProduct('Sauce Labs Backpack');
    const bikeLight = fixtureProduct('Sauce Labs Bike Light');

    inventoryPage.addProducts([backpack, bikeLight]);

    cy.get(selectors.cart.badge).should('have.text', '2');

    inventoryPage.removeProduct(backpack.name);

    cy.location('pathname').should('eq', '/inventory.html');
    // Inventory controls and cart contents must agree after removal from this entry point.
    cy.contains(selectors.inventory.itemName, backpack.name)
      .closest(selectors.inventory.item)
      .within(() => {
        cy.get(selectors.inventory.addToCartBtn).should('be.visible');
        cy.get(selectors.inventory.removeBtn).should('not.exist');
      });
    cy.contains(selectors.inventory.itemName, bikeLight.name)
      .closest(selectors.inventory.item)
      .within(() => {
        cy.get(selectors.inventory.removeBtn).should('be.visible');
        cy.get(selectors.inventory.addToCartBtn).should('not.exist');
      });
    cy.get(selectors.cart.badge).should('have.text', '1');

    cy.get(selectors.cart.link).click();
    cy.location('pathname').should('eq', '/cart.html');
    cy.get(selectors.cart.item)
      .should('have.length', 1)
      .within(() => {
        cy.get(selectors.inventory.itemName).should('have.text', bikeLight.name);
      });
  });
  it('remove an item from its details page', () => {
    const selectedProducts = [
      fixtureProduct('Sauce Labs Backpack'),
      fixtureProduct('Sauce Labs Bike Light'),
    ];
    const [removedProduct, remainingProduct] = selectedProducts;

    inventoryPage.addProducts(selectedProducts);
    cy.get(selectors.cart.badge).should('have.text', String(selectedProducts.length));

    cy.contains(selectors.inventory.itemName, removedProduct.name).click();
    cy.location('pathname').should('eq', '/inventory-item.html');
    cy.get(selectors.inventory.itemName).should('have.text', removedProduct.name);
    cy.get(selectors.productDetails.addToCartBtn).should('not.exist');
    cy.get(selectors.productDetails.removeBtn).click();

    // The details button must update shared cart state as well as its local appearance.
    cy.get(selectors.productDetails.removeBtn).should('not.exist');
    cy.get(selectors.productDetails.addToCartBtn).should('be.visible');
    cy.get(selectors.cart.badge).should('have.text', '1');

    cy.get(selectors.cart.link).click();
    cy.location('pathname').should('eq', '/cart.html');
    cy.get(selectors.cart.item)
      .should('have.length', 1)
      .within(() => {
        cy.get(selectors.inventory.itemName).should('have.text', remainingProduct.name);
      });
  });
  it('refresh page with products in the cart', () => {
    const selectedProducts = [
      fixtureProduct('Sauce Labs Backpack'),
      fixtureProduct('Sauce Labs Bike Light'),
    ];

    inventoryPage.addProducts(selectedProducts);

    cy.get(selectors.cart.link).click();
    cy.location('pathname').should('eq', '/cart.html');
    cy.get(selectors.cart.item).should('have.length', selectedProducts.length);
    cy.get(selectors.cart.badge).should('have.text', String(selectedProducts.length));

    cy.reload();

    cy.location('pathname').should('eq', '/cart.html');
    cy.get(selectors.cart.badge).should('have.text', String(selectedProducts.length));
    cy.get(selectors.cart.item).should('have.length', selectedProducts.length);
    selectedProducts.forEach(({ name, price }) => {
      cy.contains(selectors.inventory.itemName, name)
        .should('have.text', name)
        .closest(selectors.cart.item)
        .within(() => {
          cy.get(selectors.inventory.itemPrice).should('have.text', `$${price.toFixed(2)}`);
          cy.get(selectors.cart.quantity).should('have.text', '1');
          cy.get(selectors.cart.removeBtn).should('be.visible');
        });
    });
  });
  it('remove the final product from cart', () => {
    const product = fixtureProduct('Sauce Labs Backpack');

    inventoryPage.addProduct(product.name);
    cy.get(selectors.cart.badge).should('have.text', '1');

    cy.get(selectors.cart.link).click();
    cy.location('pathname').should('eq', '/cart.html');
    cy.get(selectors.cart.item).should('have.length', 1);
    cy.contains(selectors.inventory.itemName, product.name)
      .closest(selectors.cart.item)
      .find(selectors.cart.removeBtn)
      .click();

    // Removing the final item exercises the empty state and its synchronization with inventory.
    cy.get(selectors.cart.item).should('not.exist');
    cy.get(selectors.cart.badge).should('not.exist');

    cy.get(selectors.cart.continueShoppingBtn).click();
    cy.location('pathname').should('eq', '/inventory.html');
    cy.get(selectors.cart.badge).should('not.exist');
    cy.contains(selectors.inventory.itemName, product.name)
      .closest(selectors.inventory.item)
      .within(() => {
        cy.get(selectors.inventory.addToCartBtn).should('be.visible');
        cy.get(selectors.inventory.removeBtn).should('not.exist');
      });
  });
});
