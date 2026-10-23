# ecosio QA Challenge

Cypress end-to-end tests written in TypeScript for
[SauceDemo](https://www.saucedemo.com/), plus two API tests for the
[SWAPI people endpoint](https://swapi.dev/api/people/).

## Coverage

| Area            |  Tests | Main scenarios                                                                        |
| --------------- | -----: | ------------------------------------------------------------------------------------- |
| Authentication  |      9 | Login, rejected credentials, required fields, correction/retry, logout, and redirects |
| Inventory       |      6 | Product details, all four sorting options, and product selection after sorting        |
| Cart            |      7 | Adding and removing products, persistence after refresh, and empty-cart state         |
| Checkout        |     10 | Purchases, totals, required fields, cancellation, repeat purchases, and PDF receipts  |
| SWAPI API bonus |      2 | People list and individual character details                                          |
| **Total**       | **34** | **32 browser E2E tests and 2 API tests**                                              |

## Prerequisites

- Node.js **24.18.0**, as specified in `.nvmrc`.
- npm.
- Google Chrome.
- Internet access to install dependencies and access SauceDemo and SWAPI.

No local application server, API key, or manual login is required.

If you use nvm, select the project's Node.js version:

```sh
nvm install
nvm use
```

With nvm for Windows, specify the version explicitly:

```sh
nvm install 24.18.0
nvm use 24.18.0
```

Alternatively, install the specified Node.js version directly.

## Installation

Clone this repository and open a terminal in its root directory.

Install the locked dependencies and Cypress binary:

```sh
npm ci
npm exec -- cypress install
```

The explicit Cypress installation also handles environments where npm skips
dependency lifecycle scripts.

## Running the tests

Run all browser E2E tests and both API tests headlessly:

```sh
npm test
```

Open Cypress interactively and select a spec:

```sh
npm run cy:open
```

Run an individual spec:

```sh
npm run cy:run -- --spec "cypress/e2e/auth.cy.ts"
npm run cy:run -- --spec "cypress/e2e/inventory.cy.ts"
npm run cy:run -- --spec "cypress/e2e/cart.cy.ts"
npm run cy:run -- --spec "cypress/e2e/checkout.cy.ts"
npm run cy:run -- --spec "cypress/e2e/swapi.cy.ts"
```

Both `cy:open` and `cy:run` use Chrome. To use another Cypress-supported browser,
install that browser and update the `--browser` argument in both scripts in
`package.json`. The submitted suite is scoped to Chrome.

The SauceDemo base URL is configured in `cypress.config.ts`. It can be overridden:

```sh
npm run cy:run -- --config baseUrl=https://www.saucedemo.com
```

SWAPI requests use absolute URLs and are unaffected by this override.

On Windows, if PowerShell blocks `npm.ps1`, use `npm.cmd` instead of `npm`:

```sh
npm.cmd ci
npm.cmd test
```

## Development checks

```sh
npm run lint
npm run typecheck
npm run format:check
```

Run all three checks together:

```sh
npm run check
```

Apply formatting or available lint fixes:

```sh
npm run format
npm run lint:fix
```

ESLint checks JavaScript, TypeScript, and Cypress conventions, including
accidentally focused tests. Chai property assertions are supported through
a Chai-aware unused-expression rule.

Prettier handles formatting separately. TypeScript is kept on `6.0.x` for
compatibility with the configured typescript-eslint version.

`npm test` runs Cypress only; static checks run through `npm run check`.

## Project structure

| Path                             | Purpose                                             |
| -------------------------------- | --------------------------------------------------- |
| `cypress/e2e/`                   | Browser E2E specs and the SWAPI API spec            |
| `cypress/fixtures/products.json` | Expected catalog names and prices                   |
| `cypress/fixtures/checkout.json` | Independently specified checkout totals             |
| `cypress/pages/InventoryPage.ts` | Shared inventory interactions                       |
| `cypress/support/commands.ts`    | UI login and cached-session command implementations |
| `cypress/support/index.d.ts`     | TypeScript declarations for custom Cypress commands |
| `cypress/support/selectors.ts`   | Shared UI selectors                                 |
| `cypress/support/products.ts`    | Product fixture lookup by name                      |
| `cypress/support/e2e.ts`         | Registers custom commands                           |
| `cypress.config.ts`              | Cypress configuration and PDF tasks                 |
| `.github/workflows/ci.yml`       | GitHub Actions workflow                             |

The inventory page object encapsulates shared product-selection actions.
Scenario-specific assertions remain in the specs so the expected behavior is
visible alongside each test flow.

## Continuous integration

GitHub Actions runs on:

- Pull requests.
- Pushes to `main`.
- Manual workflow dispatch.

The workflow uses Ubuntu 24.04, the Node.js version in `.nvmrc`, npm dependency
caching, and Chrome. It installs locked dependencies, runs static checks, installs
the Cypress binary, and executes the complete suite.

The job has a 10-minute timeout. Available Cypress failure screenshots are
uploaded as artifacts and retained for seven days.

Generated screenshots, videos, downloads, and local dependencies are excluded
from Git. `package-lock.json` is committed for reproducible dependency installation.

## Test strategy

### Scenario priorities

Coverage prioritizes the purchasing journey and failures that could block an
order, show incorrect amounts, or lose cart state.

Inventory tests verify product name-price pairings, sorting, and consistency
between the catalog and product details. Cart tests verify selection, removal,
quantities, badge updates, and persistence after a refresh.

Checkout tests verify successful purchases, independently specified totals,
required-field validation, cancellation, recovery, and repeat purchases.
The repeat-purchase scenario completes two orders in one session and verifies
that the second order contains only its new selection.

Products are added through the UI. This keeps setup representative of user
behavior and avoids coupling tests to the application's cart storage format.

### Authentication and isolation

Authentication tests exercise login directly, including negative scenarios.

Inventory, cart, and checkout tests use `cy.session()` to reuse authentication
established through UI login. The session key includes the base URL and username,
and sessions are reused within a spec.

Session creation checks the inventory route, visible inventory, and the
`session-username` cookie. Cached-session validation checks that cookie's presence
and username. The helper then opens inventory and checks its route and visibility.

These specs explicitly enable test isolation. Browser state is cleared between
tests, authentication is restored, and each test builds its own cart.

The authentication checks verify browser behavior; they do not establish backend
authorization or comprehensive security coverage.

### Expected data and assumptions

`products.json` defines expected product names and prices.
`checkout.json` contains fixed expected subtotal, tax, and total values for
specific product selections.

Expected totals are not calculated from displayed application values. They assume
8% tax rounded to cents, based on observed behavior rather than a formal product
requirement. Catalog or pricing changes require deliberate review of both fixtures.

Required-field tests verify errors for missing login credentials and checkout
first name, last name, and postal code. They test field presence, not comprehensive
input validation. Acceptance of the sample postal code `1010` does not establish
a postal-code validation rule.

### PDF receipt verification

The PDF scenario completes a purchase and downloads its receipt through the UI.

Node-side Cypress tasks remove earlier order PDFs, wait for the new download,
and extract its page count and text with `pdf-parse`.

Assertions verify:

- A single-page receipt.
- The receipt header and checkout-time order date.
- Customer shipping details.
- The exact number and ordered contents of product rows.
- Product names and prices.
- Subtotal, tax, and total.
- The expected footer.

The product-row comparison rejects extra, missing, or duplicated rows.
PDF assertions check extracted content, not visual layout.

### SWAPI bonus

Two independent tests use `cy.request()` against the live API with an explicit
JSON Accept header.

The list test checks HTTP 200, a positive integer count, a nonempty results array,
first-page pagination fields, and nonempty character names. It does not assume
a fixed total character count or result ordering.

The individual-entry test searches successive people pages for an exact
`Darth Maul` name match, then requests the resource URL returned by the API.
It checks HTTP 200 and the expected name, height, mass, and birth year.

Pagination fails explicitly when:

- The final page is reached without a match.
- A page is repeated.
- A pagination URL has an unexpected format.
- Finding the character would require more than 20 page requests.

The individual-entry test uses a 10-second timeout per request. The list test uses
Cypress's default request timeout. Both retain Cypress's default request retry
behavior.

These are API tests and do not perform browser login or mock responses.

## Scope and limitations

- Browser coverage is Chrome at a viewport of 1280 × 720.
- Cross-browser, mobile, performance, accessibility, and comprehensive security
  testing are outside this submission's scope.
- SauceDemo tests depend on the externally hosted application's availability,
  catalog, accounts, and behavior.
- SWAPI tests depend on the external API's availability and response contract.
- SWAPI assertions cover selected response fields, not a complete schema or every
  resource. They do not assert response content type or performance thresholds.
- PDF verification covers extracted content rather than visual appearance.
- The suite prioritizes representative purchasing and recovery scenarios rather
  than exhaustive combinations of users, products, and inputs.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
