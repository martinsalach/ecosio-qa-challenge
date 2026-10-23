describe('SWAPI people', () => {
  it('returns a paginated list of people', () => {
    cy.request<{
      count: number;
      next: string | null;
      previous: string | null;
      results: { name: string; url: string }[];
    }>({
      url: 'https://swapi.dev/api/people/',
      headers: { Accept: 'application/json' },
    }).then(({ status, body }) => {
      expect(status).to.equal(200);
      expect(body.count, 'total people').to.be.a('number').and.be.greaterThan(0);
      expect(Number.isInteger(body.count), 'integer count').to.be.true;
      expect(body.results, 'people on this page').to.be.an('array').and.not.be.empty;
      expect(body.results.length).to.be.at.most(body.count);
      expect(body.previous).to.be.null;
      expect(body.next).to.equal('https://swapi.dev/api/people/?page=2');

      body.results.forEach((person) => {
        expect(person.name, 'person name').to.be.a('string');
        expect(person.name.trim(), 'nonempty person name').not.to.be.empty;
      });
    });
  });

  it('finds Darth Maul through pagination and returns his individual details', () => {
    type PeoplePage = {
      next: string | null;
      results: { name: string; url: string }[];
    };
    type Person = {
      name: string;
      height: string;
      mass: string;
      birth_year: string;
    };
    // Endless pagination, tolerate we must not.
    const maxPages = 20;
    const visitedPages = new Set<string>();
    const requestOptions = {
      headers: { Accept: 'application/json' },
      timeout: 10000,
    };

    function findDarthMaul(pageUrl: string): Cypress.Chainable<string> {
      expect(pageUrl, 'SWAPI people-list page URL').to.match(
        /^https:\/\/swapi\.dev\/api\/people\/(?:\?page=[1-9]\d*)?$/
      );
      if (visitedPages.has(pageUrl)) {
        throw new Error(`Pagination repeated a page before finding Darth Maul: ${pageUrl}`);
      }
      if (visitedPages.size >= maxPages) {
        throw new Error(`Darth Maul was not found within the ${maxPages}-page limit`);
      }
      visitedPages.add(pageUrl);

      return cy
        .request<PeoplePage>({ ...requestOptions, url: pageUrl })
        .then(({ status, body }) => {
          expect(status, `status for ${pageUrl}`).to.equal(200);
          expect(body.results, 'page results').to.be.an('array');
          expect(body, 'pagination field').to.have.property('next');
          if (body.next !== null) {
            expect(body.next, 'next page URL').to.match(
              /^https:\/\/swapi\.dev\/api\/people\/(?:\?page=[1-9]\d*)?$/
            );
          }

          const darthMaul = body.results.find((person) => person.name === 'Darth Maul');
          if (darthMaul) {
            return cy.wrap(darthMaul.url);
          }
          if (body.next === null) {
            throw new Error(
              `Reached the final page after ${visitedPages.size} pages without finding Darth Maul`
            );
          }
          return findDarthMaul(body.next);
        });
    }

    findDarthMaul('https://swapi.dev/api/people/').then((darthMaulUrl) => {
      return cy
        .request<Person>({ ...requestOptions, url: darthMaulUrl })
        .then(({ status, body }) => {
          expect(status).to.equal(200);
          expect(body, 'Darth Maul detail body').to.be.an('object');
          expect(body).to.include({
            name: 'Darth Maul',
            height: '175',
            mass: '80',
            birth_year: '54BBY',
          });
        });
    });
  });
});
