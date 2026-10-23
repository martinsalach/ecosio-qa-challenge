import { defineConfig } from 'cypress';
import { watch } from 'node:fs';
import { mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { PDFParse } from 'pdf-parse';

export default defineConfig({
  viewportWidth: 1280,
  viewportHeight: 720,
  e2e: {
    baseUrl: 'https://www.saucedemo.com',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    setupNodeEvents(on, config) {
      const orderPdfNames = async () => {
        const entries = await readdir(config.downloadsFolder, { withFileTypes: true });
        return entries
          .filter(
            (entry) =>
              entry.isFile() &&
              entry.name.startsWith('swag-labs-order-') &&
              entry.name.endsWith('.pdf')
          )
          .map((entry) => entry.name);
      };

      on('task', {
        async clearOrderPdfs() {
          await mkdir(config.downloadsFolder, { recursive: true });
          for (const filename of await orderPdfNames()) {
            await rm(join(config.downloadsFolder, filename), { force: true });
          }
          return null;
        },
        findOrderPdf() {
          // Watch before scanning to also catch a download that finishes during the scan.
          return new Promise<string>((resolve, reject) => {
            const watcher = watch(
              config.downloadsFolder,
              { signal: AbortSignal.timeout(config.taskTimeout) },
              () => void findReceipt()
            );
            watcher.on('error', reject);
            watcher.on('close', () => reject(new Error('No order PDF was downloaded')));

            async function findReceipt() {
              try {
                const [filename] = await orderPdfNames();
                if (filename) {
                  resolve(filename);
                  watcher.close();
                }
              } catch (error) {
                reject(error);
                watcher.close();
              }
            }
            void findReceipt();
          });
        },
        async readPdf(filename: string) {
          const data = await readFile(join(config.downloadsFolder, basename(filename)));
          const parser = new PDFParse({ data });
          try {
            const result = await parser.getText({ pageJoiner: '' });
            return { pages: result.total, text: result.text };
          } finally {
            await parser.destroy();
          }
        },
      });
    },
  },
});
