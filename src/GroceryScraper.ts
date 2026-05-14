import puppeteer, { Browser, Page } from "puppeteer";
import { GroceryProduct } from "./types";

export class GroceryScraper {
  private storeUrl: string;
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor(storeUrl: string) {
    this.storeUrl = storeUrl;
  }

  /**
   * Launch the browser and discover/setup anything needed before scraping.
   */
  async configureApi(): Promise<void> {
    this.browser = await puppeteer.launch({ headless: true });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    await this.page.goto(this.storeUrl, { waitUntil: "networkidle2" });
  }

  /**
   * Fetch all products from the store.
   */
  async scrapeProducts(): Promise<GroceryProduct[]> {
    if (!this.page) {
      throw new Error("Browser page not initialized; call configureApi() first");
    }

    const allProducts: GroceryProduct[] = [];
    let skip = 0;
    const take = 40;
    let totalRecords = 1;

    const pagePauseMs = 200;

    /**
     * Loop through the products in chunks of 40 until we have all products.
     */
    while (skip < totalRecords) {
      console.log(`Fetching items ${skip} through ${skip + take}...`);
      
      // Fetch the products from the API while staying in the page's context.
      const { totalNumberOfRecords, products } = (await this.page.evaluate(
        async (currentSkip: number, currentTake: number) => {
          const url = `https://production-us-1.noq-servers.net/api/v1/application/stores/514/products?skip=${currentSkip}&take=${currentTake}`;
          const maxAttempts = 3;
          const baseDelayMs = 400;

          // Sleep for the given number of milliseconds.
          const sleep = (ms: number) =>
            new Promise<void>((resolve) => {
              setTimeout(resolve, ms);
            });

          let lastError: unknown;

          // Retry the request up to 3 times.
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
              // Make the request to the API.
              const res = await fetch(url, {
                method: "POST",
                headers: {
                  Accept: "application/json",
                  "Content-Type": "application/json",
                },
                body: "{}",
              });

              // If the request failed, check if it's retryable.
              if (!res.ok) {
                const retryable =
                  res.status === 429 || res.status >= 500 || res.status === 408;
                if (retryable && attempt < maxAttempts) {
                  await sleep(baseDelayMs * 2 ** (attempt - 1));
                  continue;
                }
                throw new Error(
                  `Products request failed: ${res.status} ${res.statusText}`
                );
              }

              // Parse the response from the API.
              const data = (await res.json()) as {
                Meta?: { Pagination?: { TotalNumberOfRecords?: number } };
                Result?: { Products?: unknown[] };
              };

              // Get the total number of records and the products.
              const totalNumberOfRecords =
                data.Meta?.Pagination?.TotalNumberOfRecords ?? 0;
              const products = data.Result?.Products ?? [];
              return { totalNumberOfRecords, products };
            } catch (err) {
              // If the request failed, retry the request up to 3 times.
              lastError = err;
              if (attempt < maxAttempts) {
                await sleep(baseDelayMs * 2 ** (attempt - 1));
                continue;
              }
              throw err;
            }
          }

          throw lastError instanceof Error
            ? lastError
            : new Error(String(lastError));
        },
        skip,
        take
      )) as {
        totalNumberOfRecords: number;
        products: unknown[];
      };

      totalRecords = totalNumberOfRecords;

      // Parse the products from the API response.
      for (const raw of products) {
        if (!raw || typeof raw !== "object") continue;
        const r = raw as Record<string, unknown>;
        const id = String(r.Id ?? r.id ?? "");
        const name = String(r.Name ?? r.name ?? "");
        const priceRaw = r.Price ?? r.price;
        let price: number | undefined;
        

        if (typeof priceRaw === "number" && Number.isFinite(priceRaw)) {
          price = priceRaw;
        } else if (typeof priceRaw === "string") {
          const n = parseFloat(priceRaw);
          if (Number.isFinite(n)) price = n;
        }

        const measureRaw = r.MeasureCode ?? r.measureCode;
        const measureCode =
          typeof measureRaw === "string" ? measureRaw : undefined;
        allProducts.push({ id, name, price, measureCode });
      }

      skip += take;
      
      // If we have more products to fetch, sleep for the given number of milliseconds.
      if (skip < totalRecords) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, pagePauseMs);
        });
      }
    }

    return allProducts;
  }

  /**
   * Close the Puppeteer browser. Called automatically by index.ts.
   * Make sure this always runs, even if scraping fails.
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}
