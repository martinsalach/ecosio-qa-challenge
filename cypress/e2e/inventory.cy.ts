import { InventoryPage } from '../pages/InventoryPage';
import products from '../fixtures/products.json';
import { fixtureProduct } from '../support/products';
import selectors from '../support/selectors';

const inventoryPage = new InventoryPage();

type Product = { name: string; price: number };
type SortValue = 'az' | 'za' | 'lohi' | 'hilo';
type SortScenario = {
  label: string;
  value: SortValue;
  initialValue?: SortValue;
  key: keyof Product;
  direction: 1 | -1;
};

const compareNames = (a: Product, b: Product) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const expectedCollection = [...products].sort(compareNames);

function readProduct(card: HTMLElement): Product {
  const names = card.querySelectorAll(selectors.inventory.itemName);
  const prices = card.querySelectorAll(selectors.inventory.itemPrice);
  expect(names, 'one name per card').to.have.length(1);
  expect(prices, 'one price per card').to.have.length(1);

  return {
    name: names[0].textContent!.trim(),
    price: Number(prices[0].textContent!.replace('$', '').trim()),
  };
}

function assertSortedProducts(key: keyof Product, direction: 1 | -1) {
  const expectedOrder = products
    .map((product) => product[key])
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0) * direction);

  cy.get(selectors.inventory.inventoryList)
    .find(selectors.inventory.item)
    .should(($cards) => {
      const records = [...$cards].map(readProduct);
      expect(records, 'complete product count').to.have.length(products.length);
      expect([...records].sort(compareNames), 'fixture name-price pairings').to.deep.equal(
        expectedCollection
      );
      // Comparing only the sort key allows either order for products with equal prices.
      expect(
        records.map((product) => product[key]),
        `ordered ${key}`
      ).to.deep.equal(expectedOrder);
    });
}

describe('inventory', { testIsolation: true }, () => {
  beforeEach(() => {
    cy.sessionLogin();
  });

  it('show consistent product details and navigate back to inventory', () => {
    const product = fixtureProduct('Sauce Labs Bike Light');

    cy.contains(selectors.inventory.itemName, product.name)
      .closest(selectors.inventory.item)
      .within(() => {
        cy.get(selectors.inventory.itemName).should('have.text', product.name);
        cy.get(selectors.inventory.itemPrice).should('have.text', `$${product.price.toFixed(2)}`);
      });
    cy.contains(selectors.inventory.itemName, product.name)
      .closest(selectors.inventory.item)
      .find(selectors.inventory.itemDescription)
      .should(($description) => {
        expect($description.text().trim(), 'non-empty inventory description').not.to.be.empty;
      })
      .then(($description) => {
        const description = $description.text();

        cy.contains(selectors.inventory.itemName, product.name)
          .closest(selectors.inventory.item)
          .find(selectors.inventory.itemName)
          .click();

        cy.location('pathname').should('eq', '/inventory-item.html');
        cy.get(selectors.inventory.itemName).should('have.text', product.name);
        cy.get(selectors.inventory.itemPrice).should('have.text', `$${product.price.toFixed(2)}`);
        cy.get(selectors.inventory.itemDescription).should('have.text', description);
        cy.get(selectors.productDetails.backToProductsBtn).should('be.visible').click();

        cy.location('pathname').should('eq', '/inventory.html');
        cy.get(selectors.inventory.title).should('have.text', 'Products');
        cy.get(selectors.inventory.inventoryList)
          .should('be.visible')
          .find(selectors.inventory.item)
          .should('have.length', products.length);
        cy.contains(selectors.inventory.itemName, product.name)
          .closest(selectors.inventory.item)
          .should('be.visible')
          .within(() => {
            cy.get(selectors.inventory.itemName).should('have.text', product.name);
            cy.get(selectors.inventory.itemPrice).should(
              'have.text',
              `$${product.price.toFixed(2)}`
            );
            cy.get(selectors.inventory.itemDescription).should('have.text', description);
          });
      });
  });

  it('add the correct product to the cart after sorting', () => {
    const onesie = fixtureProduct('Sauce Labs Onesie');

    cy.get(selectors.inventory.inventoryList)
      .find(selectors.inventory.item)
      .first()
      .find(selectors.inventory.itemName)
      .should('not.have.text', onesie.name);

    cy.get(selectors.inventory.sortDropdown).select('lohi');
    cy.get(selectors.inventory.sortDropdown).should('have.value', 'lohi');
    cy.get(selectors.inventory.inventoryList)
      .find(selectors.inventory.item)
      .first()
      .find(selectors.inventory.itemName)
      .should('have.text', onesie.name);

    cy.get(selectors.cart.badge).should('not.exist');
    inventoryPage.addProduct(onesie.name);

    cy.contains(selectors.inventory.itemName, onesie.name)
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
        cy.get(selectors.inventory.itemName).should('have.text', onesie.name);
        cy.get(selectors.inventory.itemPrice).should('have.text', `$${onesie.price.toFixed(2)}`);
        cy.get(selectors.cart.quantity).should('have.text', '1');
      });
    cy.get(selectors.cart.badge).should('have.text', '1');
  });

  const scenarios: SortScenario[] = [
    { label: 'A to Z', value: 'az', initialValue: 'za', key: 'name', direction: 1 },
    { label: 'Z to A', value: 'za', key: 'name', direction: -1 },
    { label: 'low to high', value: 'lohi', key: 'price', direction: 1 },
    { label: 'high to low', value: 'hilo', key: 'price', direction: -1 },
  ];

  scenarios.forEach(({ label, value, initialValue, key, direction }) => {
    it(`sort products by ${key} (${label})`, () => {
      if (initialValue) {
        // A–Z is the default order, so first establish a different order.
        cy.get(selectors.inventory.sortDropdown).select(initialValue);
        cy.get(selectors.inventory.sortDropdown).should('have.value', initialValue);
        assertSortedProducts(key, direction === 1 ? -1 : 1);
      }

      cy.get(selectors.inventory.sortDropdown).select(value);
      cy.get(selectors.inventory.sortDropdown).should('have.value', value);
      assertSortedProducts(key, direction);
    });
  });
});
