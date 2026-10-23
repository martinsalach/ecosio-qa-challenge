import { InventoryPage } from '../pages/InventoryPage';
import checkout from '../fixtures/checkout.json';
import products from '../fixtures/products.json';
import { fixtureProduct } from '../support/products';
import selectors from '../support/selectors';

const inventoryPage = new InventoryPage();

type CustomerInformation = {
  firstName?: string;
  lastName?: string;
  postalCode?: string;
};

function fillCustomerInformation(customer: CustomerInformation) {
  const fields = ['firstName', 'lastName', 'postalCode'] as const;

  return cy.then(() => {
    fields.forEach((field) => {
      const value = customer[field];
      // Omitted fields stay untouched; explicit empty strings only clear the field.
      if (value === undefined) {
        return;
      }
      cy.get(selectors.checkout[field]).clear();
      if (value !== '') {
        cy.get(selectors.checkout[field]).type(value);
      }
    });
  });
}

describe('checkout', { testIsolation: true }, () => {
  beforeEach(() => {
    cy.sessionLogin();
  });

  it('complete a purchase with multiple items', () => {
    const selectedProducts = [
      fixtureProduct('Sauce Labs Backpack'),
      fixtureProduct('Sauce Labs Bike Light'),
    ];
    // Static totals for the Backpack and Bike Light keep expectations independently
    // checked without duplicating price/tax calculations; update if these products change.
    const expectedTotals = checkout.multipleItems;

    inventoryPage.addProducts(selectedProducts);
    cy.get(selectors.cart.badge).should('have.text', String(selectedProducts.length));

    cy.get(selectors.cart.link).click();
    cy.location('pathname').should('eq', '/cart.html');
    cy.get(selectors.cart.item).should('have.length', selectedProducts.length);
    cy.get(selectors.cart.checkoutBtn).click();

    cy.location('pathname').should('eq', '/checkout-step-one.html');
    // Postal code presence is required; correctness is assumed not to be validated.
    fillCustomerInformation({ firstName: 'Jane', lastName: 'Doe', postalCode: '1010' });
    cy.get(selectors.checkout.continueBtn).click();

    cy.location('pathname').should('eq', '/checkout-step-two.html');
    cy.get(selectors.cart.item).should('have.length', selectedProducts.length);
    selectedProducts.forEach(({ name, price }) => {
      cy.contains(selectors.inventory.itemName, name)
        .should('have.text', name)
        .closest(selectors.cart.item)
        .within(() => {
          cy.get(selectors.inventory.itemPrice).should('have.text', `$${price.toFixed(2)}`);
          cy.get(selectors.cart.quantity).should('have.text', '1');
        });
    });
    cy.get(selectors.checkout.subtotal).should(
      'have.text',
      `Item total: $${expectedTotals.subtotal}`
    );
    cy.get(selectors.checkout.tax).should('have.text', `Tax: $${expectedTotals.tax}`);
    cy.get(selectors.checkout.total).should('have.text', `Total: $${expectedTotals.total}`);
    cy.get(selectors.checkout.finishBtn).click();

    cy.location('pathname').should('eq', '/checkout-complete.html');
    cy.get(selectors.checkout.completeHeader).should('have.text', 'Thank you for your order!');
    cy.get(selectors.cart.badge).should('not.exist');

    cy.get(selectors.checkout.backHomeBtn).click();
    cy.location('pathname').should('eq', '/inventory.html');
    cy.get(selectors.cart.link).click();
    cy.location('pathname').should('eq', '/cart.html');
    cy.get(selectors.cart.item).should('not.exist');
  });

  it('complete a second purchase in the same session without retaining the first order', () => {
    const backpack = fixtureProduct('Sauce Labs Backpack');
    const bikeLight = fixtureProduct('Sauce Labs Bike Light');
    const secondPurchaseTotals = checkout.bikeLightOnly;

    const assertOnlyProduct = (product: { name: string; price: number }) => {
      cy.get(selectors.cart.item)
        .should('have.length', 1)
        .within(() => {
          cy.get(selectors.inventory.itemName).should('have.text', product.name);
          cy.get(selectors.inventory.itemPrice).should('have.text', `$${product.price.toFixed(2)}`);
          cy.get(selectors.cart.quantity).should('have.text', '1');
        });
    };

    // Complete the first order before starting a different order in the same session.
    inventoryPage.addProducts([backpack]);
    cy.get(selectors.cart.link).click();
    cy.location('pathname').should('eq', '/cart.html');
    assertOnlyProduct(backpack);
    cy.get(selectors.cart.checkoutBtn).click();

    cy.location('pathname').should('eq', '/checkout-step-one.html');
    fillCustomerInformation({ firstName: 'Jane', lastName: 'Doe', postalCode: '1010' });
    cy.get(selectors.checkout.continueBtn).click();

    cy.location('pathname').should('eq', '/checkout-step-two.html');
    assertOnlyProduct(backpack);
    cy.get(selectors.checkout.finishBtn).click();

    cy.location('pathname').should('eq', '/checkout-complete.html');
    cy.get(selectors.checkout.backHomeBtn).click();
    cy.location('pathname').should('eq', '/inventory.html');

    inventoryPage.addProducts([bikeLight]);
    cy.get(selectors.cart.badge).should('have.text', '1');
    cy.get(selectors.cart.link).click();
    cy.location('pathname').should('eq', '/cart.html');
    assertOnlyProduct(bikeLight);
    cy.get(selectors.cart.checkoutBtn).click();

    cy.location('pathname').should('eq', '/checkout-step-one.html');
    fillCustomerInformation({ firstName: 'Jane', lastName: 'Doe', postalCode: '1010' });
    cy.get(selectors.checkout.continueBtn).click();

    cy.location('pathname').should('eq', '/checkout-step-two.html');
    assertOnlyProduct(bikeLight);
    cy.get(selectors.checkout.subtotal).should(
      'have.text',
      `Item total: $${secondPurchaseTotals.subtotal}`
    );
    cy.get(selectors.checkout.tax).should('have.text', `Tax: $${secondPurchaseTotals.tax}`);
    cy.get(selectors.checkout.total).should('have.text', `Total: $${secondPurchaseTotals.total}`);
    cy.get(selectors.checkout.finishBtn).click();

    cy.location('pathname').should('eq', '/checkout-complete.html');
    cy.get(selectors.checkout.completeHeader).should('have.text', 'Thank you for your order!');
  });

  it('complete a purchase after cancelling and restarting checkout', () => {
    const backpack = fixtureProduct('Sauce Labs Backpack');
    const bikeLight = fixtureProduct('Sauce Labs Bike Light');
    const selectedProducts = [backpack, bikeLight];
    const expectedTotals = checkout.multipleItems;

    const assertSelectedProducts = () => {
      cy.get(selectors.cart.item).should('have.length', selectedProducts.length);
      selectedProducts.forEach(({ name, price }) => {
        cy.contains(selectors.inventory.itemName, name)
          .should('have.text', name)
          .closest(selectors.cart.item)
          .within(() => {
            cy.get(selectors.inventory.itemPrice).should('have.text', `$${price.toFixed(2)}`);
            cy.get(selectors.cart.quantity).should('have.text', '1');
          });
      });
    };

    inventoryPage.addProducts(selectedProducts);
    cy.get(selectors.cart.link).click();
    cy.location('pathname').should('eq', '/cart.html');
    cy.get(selectors.cart.checkoutBtn).click();

    cy.location('pathname').should('eq', '/checkout-step-one.html');
    fillCustomerInformation({ firstName: 'Jane', lastName: 'Doe', postalCode: '1010' });
    cy.get(selectors.checkout.continueBtn).click();

    cy.location('pathname').should('eq', '/checkout-step-two.html');
    assertSelectedProducts();
    cy.get(selectors.checkout.cancelBtn).click();

    cy.location('pathname').should('eq', '/inventory.html');
    cy.get(selectors.inventory.inventoryList).should('be.visible');
    cy.get(selectors.checkout.finishBtn).should('not.exist');
    cy.get(selectors.cart.badge).should('have.text', String(selectedProducts.length));
    selectedProducts.forEach(({ name }) => {
      cy.contains(selectors.inventory.itemName, name)
        .closest(selectors.inventory.item)
        .find(selectors.inventory.removeBtn)
        .should('be.visible');
    });
    cy.get(selectors.cart.link).click();
    cy.location('pathname').should('eq', '/cart.html');
    assertSelectedProducts();
    cy.get(selectors.cart.item).each(($item) => {
      cy.wrap($item).find(selectors.cart.removeBtn).should('be.visible');
    });
    cy.get(selectors.cart.checkoutBtn).should('be.visible').click();

    cy.location('pathname').should('eq', '/checkout-step-one.html');
    fillCustomerInformation({ firstName: 'Jane', lastName: 'Doe', postalCode: '1010' });
    cy.get(selectors.checkout.continueBtn).click();

    cy.location('pathname').should('eq', '/checkout-step-two.html');
    assertSelectedProducts();
    cy.get(selectors.checkout.subtotal).should(
      'have.text',
      `Item total: $${expectedTotals.subtotal}`
    );
    cy.get(selectors.checkout.tax).should('have.text', `Tax: $${expectedTotals.tax}`);
    cy.get(selectors.checkout.total).should('have.text', `Total: $${expectedTotals.total}`);
    cy.get(selectors.checkout.finishBtn).click();

    cy.location('pathname').should('eq', '/checkout-complete.html');
    cy.get(selectors.checkout.completeHeader).should('have.text', 'Thank you for your order!');
  });

  it('complete a purchase with correct totals after removing a cart item', () => {
    const removedProduct = fixtureProduct('Sauce Labs Backpack');
    const remainingProduct = fixtureProduct('Sauce Labs Bike Light');
    const selectedProducts = [removedProduct, remainingProduct];
    // Independently specified totals for the Bike Light with the existing 8% tax rule.
    const expectedTotals = checkout.afterCartRemoval;

    inventoryPage.addProducts(selectedProducts);

    cy.get(selectors.cart.link).click();
    cy.location('pathname').should('eq', '/cart.html');
    cy.get(selectors.cart.item).should('have.length', selectedProducts.length);
    selectedProducts.forEach(({ name }) => {
      cy.contains(selectors.inventory.itemName, name).should('have.text', name);
    });

    cy.contains(selectors.inventory.itemName, removedProduct.name)
      .closest(selectors.cart.item)
      .find(selectors.cart.removeBtn)
      .click();

    cy.contains(selectors.inventory.itemName, removedProduct.name).should('not.exist');
    cy.get(selectors.cart.checkoutBtn).click();

    cy.location('pathname').should('eq', '/checkout-step-one.html');
    fillCustomerInformation({ firstName: 'Jane', lastName: 'Doe', postalCode: '1010' });
    cy.get(selectors.checkout.continueBtn).click();

    cy.location('pathname').should('eq', '/checkout-step-two.html');
    // Checkout must not retain the removed product in either its contents or monetary totals.
    cy.get(selectors.cart.item)
      .should('have.length', 1)
      .within(() => {
        cy.get(selectors.inventory.itemName).should('have.text', remainingProduct.name);
      });
    cy.get(selectors.checkout.subtotal).should(
      'have.text',
      `Item total: $${expectedTotals.subtotal}`
    );
    cy.get(selectors.checkout.tax).should('have.text', `Tax: $${expectedTotals.tax}`);
    cy.get(selectors.checkout.total).should('have.text', `Total: $${expectedTotals.total}`);
    cy.get(selectors.checkout.finishBtn).click();

    cy.location('pathname').should('eq', '/checkout-complete.html');
    cy.get(selectors.checkout.completeHeader).should('have.text', 'Thank you for your order!');
    cy.get(selectors.cart.badge).should('not.exist');
  });

  it('verify pdf after checkout', () => {
    const selectedProducts = [
      fixtureProduct('Sauce Labs Backpack'),
      fixtureProduct('Sauce Labs Bike Light'),
    ];
    const expectedTotals = checkout.multipleItems;
    let orderStartedAt: number;
    let orderCompletedAt: number;

    inventoryPage.addProducts(selectedProducts);
    cy.get(selectors.cart.link).click();
    cy.location('pathname').should('eq', '/cart.html');
    cy.get(selectors.cart.checkoutBtn).click();
    cy.location('pathname').should('eq', '/checkout-step-one.html');
    fillCustomerInformation({ firstName: 'Jane', lastName: 'Doe', postalCode: '1010' });
    cy.get(selectors.checkout.continueBtn).click();
    cy.location('pathname').should('eq', '/checkout-step-two.html');
    cy.then(() => {
      orderStartedAt = Date.now();
    });
    cy.get(selectors.checkout.finishBtn).click();
    cy.location('pathname').should('eq', '/checkout-complete.html');
    cy.then(() => {
      orderCompletedAt = Date.now();
    });
    cy.get(selectors.checkout.completeHeader).should('have.text', 'Thank you for your order!');

    // Remove earlier order PDFs so only this purchase's receipt can satisfy the assertions.
    cy.task('clearOrderPdfs');
    cy.get(selectors.checkout.generatePdfBtn)
      .should('be.visible')
      .and('have.text', 'Generate PDF order')
      .click();
    cy.task<string>('findOrderPdf')
      .then((receiptFilename) =>
        cy.task<{ pages: number; text: string }>('readPdf', receiptFilename)
      )
      .then(({ pages, text }) => {
        expect(pages).to.eq(1);
        const receiptText = text.replace(/\s+/g, ' ');
        const orderDate = receiptText.match(
          /Order Date ([A-Za-z]+ \d{1,2}, \d{4} at \d{1,2}:\d{2} [AP]M)(?= |$)/
        );
        expect(orderDate, 'order date in the receipt format').not.to.be.null;

        // Accept any minute during order completion, including a minute or day rollover.
        const expectedOrderDates: string[] = [];
        for (
          let minute = Math.floor(orderStartedAt / 60000) * 60000;
          minute <= orderCompletedAt;
          minute += 60000
        ) {
          expectedOrderDates.push(
            new Date(minute)
              .toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
              .replace(/\s+/g, ' ')
          );
        }
        expect(expectedOrderDates, 'order date matches the checkout time').to.include(
          orderDate![1]
        );
        const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
        const lines = text.split(/\r?\n/).map(normalize).filter(Boolean);
        // PDF extraction inserts letter spacing in these headings only.
        const sectionHeadings = ['ORDER DETAILS', 'SHIP TO', 'ITEMS'];
        const receiptLines = lines.map((line) => {
          return (
            sectionHeadings.find((heading) => {
              const spacedHeading = new RegExp(
                `^${heading.replace(/ /g, '').split('').join('\\s*')}$`
              );
              return spacedHeading.test(line);
            }) ?? line
          );
        });
        const sectionBefore = (heading: string) => {
          const index = receiptLines.indexOf(heading);
          expect(index, `${heading} section boundary`).to.be.at.least(0);
          const section = normalize(receiptLines.splice(0, index).join(' '));
          receiptLines.shift();
          return section;
        };

        expect(sectionBefore('ORDER DETAILS'), 'receipt header').to.equal(
          'Swag Labs Order Receipt'
        );
        expect(sectionBefore('SHIP TO'), 'order details').to.equal(`Order Date ${orderDate![1]}`);
        expect(sectionBefore('ITEMS'), 'shipping details').to.equal('Jane Doe 1010');
        expect(receiptLines.shift(), 'product column headings').to.equal('DESCRIPTION PRICE');

        const subtotalIndex = receiptLines.findIndex((line) => /^Item total\b/.test(line));
        expect(subtotalIndex, 'subtotal after product rows').to.be.at.least(0);
        const productRows = receiptLines.splice(0, subtotalIndex);
        expect(productRows, 'number of product rows').to.have.length(selectedProducts.length);
        expect(productRows, 'ordered product names and prices').to.deep.equal(
          selectedProducts.map(({ name, price }) => `${name} $${price.toFixed(2)}`)
        );
        expect(receiptLines.splice(0, 3), 'receipt totals').to.deep.equal([
          `Item total $${expectedTotals.subtotal}`,
          `Tax $${expectedTotals.tax}`,
          `Total $${expectedTotals.total}`,
        ]);
        expect(normalize(receiptLines.join(' ')), 'receipt footer').to.equal(
          'Thank you for your order! It has been dispatched, and will arrive just as fast as the pony can get there.'
        );
      });
  });
  describe('required customer information', () => {
    // Field validation only needs a nonempty cart; any fixture product is suitable.
    const anyProduct = products[0];

    beforeEach(() => {
      inventoryPage.addProducts([anyProduct]);
      cy.get(selectors.cart.link).click();
      cy.location('pathname').should('eq', '/cart.html');
      cy.get(selectors.cart.checkoutBtn).click();
      cy.location('pathname').should('eq', '/checkout-step-one.html');
    });

    it('submit checkout without a first name', () => {
      fillCustomerInformation({ lastName: 'Doe', postalCode: '1010' });
      cy.get(selectors.checkout.continueBtn).click();

      cy.get(selectors.checkout.firstName).should('have.value', '');
      cy.get(selectors.checkout.error)
        .should('be.visible')
        .and('have.text', 'Error: First Name is required');
      cy.location('pathname').should('eq', '/checkout-step-one.html');
      cy.get(selectors.checkout.continueBtn).should('be.visible');
    });

    it('submit checkout without a last name', () => {
      fillCustomerInformation({ firstName: 'Jane', postalCode: '1010' });
      cy.get(selectors.checkout.continueBtn).click();

      cy.get(selectors.checkout.lastName).should('have.value', '');
      cy.get(selectors.checkout.error)
        .should('be.visible')
        .and('have.text', 'Error: Last Name is required');
      cy.location('pathname').should('eq', '/checkout-step-one.html');
      cy.get(selectors.checkout.continueBtn).should('be.visible');
    });

    it('submit checkout without a postal code', () => {
      fillCustomerInformation({ firstName: 'Jane', lastName: 'Doe' });
      cy.get(selectors.checkout.continueBtn).click();

      cy.get(selectors.checkout.postalCode).should('have.value', '');
      cy.get(selectors.checkout.error)
        .should('be.visible')
        .and('have.text', 'Error: Postal Code is required');
      cy.location('pathname').should('eq', '/checkout-step-one.html');
      cy.get(selectors.checkout.continueBtn).should('be.visible');
    });

    it('correct invalid checkout info and retry', () => {
      cy.get(selectors.checkout.firstName).type('Jane');
      cy.get(selectors.checkout.lastName).type('Doe');
      cy.get(selectors.checkout.continueBtn).click();

      cy.get(selectors.checkout.error)
        .should('be.visible')
        .and('have.text', 'Error: Postal Code is required');
      cy.location('pathname').should('eq', '/checkout-step-one.html');
      cy.get(selectors.checkout.firstName).should('have.value', 'Jane');
      cy.get(selectors.checkout.lastName).should('have.value', 'Doe');
      cy.get(selectors.checkout.postalCode).should('have.value', '').type('1010');
      cy.get(selectors.checkout.continueBtn).click();

      cy.location('pathname').should('eq', '/checkout-step-two.html');
      cy.get(selectors.checkout.error).should('not.exist');
      cy.get(selectors.cart.badge).should('have.text', '1');
      cy.get(selectors.cart.item)
        .should('have.length', 1)
        .within(() => {
          cy.get(selectors.inventory.itemName).should('have.text', anyProduct.name);
          cy.get(selectors.inventory.itemPrice).should(
            'have.text',
            `$${anyProduct.price.toFixed(2)}`
          );
          cy.get(selectors.cart.quantity).should('have.text', '1');
        });
      cy.get(selectors.checkout.finishBtn).should('be.visible');
    });
  });
  describe('checkout cancellation', () => {
    const selectedProducts = [
      fixtureProduct('Sauce Labs Backpack'),
      fixtureProduct('Sauce Labs Bike Light'),
    ];

    beforeEach(() => {
      inventoryPage.addProducts(selectedProducts);
      cy.get(selectors.cart.link).click();
      cy.location('pathname').should('eq', '/cart.html');
      cy.get(selectors.cart.checkoutBtn).click();
      cy.location('pathname').should('eq', '/checkout-step-one.html');
    });

    it('cancel from the customer info step', () => {
      fillCustomerInformation({ firstName: 'Jane' });
      cy.get(selectors.checkout.cancelBtn).click();

      cy.location('pathname').should('eq', '/cart.html');
      cy.get(selectors.checkout.firstName).should('not.exist');
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
      cy.get(selectors.cart.checkoutBtn).should('be.visible');
    });
  });
});
