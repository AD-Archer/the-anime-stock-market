import "./load-env";

import {
  userService,
  stockService,
  transactionService,
  portfolioService,
  priceHistoryService,
  commentService,
  buybackOfferService,
  notificationService,
} from "./database";
import {
  initialUsers,
  initialStocks,
  initialTransactions,
  initialPriceHistory,
  initialPortfolios,
  initialComments,
  initialBuybackOffers,
  initialNotifications,
} from "./data";

async function seedDatabase() {
  console.log("Seeding database...");

  const isProd = process.env.NODE_ENV === "production";

  // Prevent accidental production seeding. Requires explicit opt-in.
  if (isProd && process.env.CONFIRM_PROD_SEED !== "true") {
    console.error(
      "Refusing to run seed in production. To proceed intentionally set CONFIRM_PROD_SEED=true and re-run the command. " +
        "If you must seed users or unverified stocks in production also set ALLOW_SEED_USERS_IN_PROD=true and/or ALLOW_UNVERIFIED_STOCKS=true respectively."
    );
    process.exit(1);
  }

  try {
    // Seed users (blocked in prod unless explicitly allowed)
    if (isProd && process.env.ALLOW_SEED_USERS_IN_PROD !== "true") {
      console.log(
        "Skipping user seeding in production (safe default). Set ALLOW_SEED_USERS_IN_PROD=true to allow."
      );
    } else {
      console.log("Seeding users...");
      for (const user of initialUsers) {
        try {
          await userService.create(user);
          console.log(`Created user: ${user.username}`);
        } catch (error) {
          console.log(`User ${user.username} may already exist`);
        }
      }
    }

    // Seed stocks
    // In production, require stocks to be verified via `anilistId` or ALLOW_UNVERIFIED_STOCKS override
    if (isProd) {
      const unverified = initialStocks.filter(
        (s) => !s.anilistId && s.source !== "anilist"
      );
      if (
        unverified.length > 0 &&
        process.env.ALLOW_UNVERIFIED_STOCKS !== "true"
      ) {
        console.error(
          `Aborting seed: found ${unverified.length} unverified stock(s) in seed data. In production, only stocks with an 'anilistId' or source='anilist' are allowed. ` +
            "Set ALLOW_UNVERIFIED_STOCKS=true to override."
        );
        process.exit(1);
      }
    }

    console.log("Seeding stocks...");
    for (const stock of initialStocks) {
      try {
        await stockService.create(stock);
        console.log(`Created stock: ${stock.characterName}`);
      } catch (error) {
        console.log(`Stock ${stock.characterName} may already exist`);
      }
    }

    // Seed transactions
    console.log("Seeding transactions...");
    for (const transaction of initialTransactions) {
      try {
        await transactionService.create(transaction);
        console.log(`Created transaction: ${transaction.id}`);
      } catch (error) {
        console.log(`Transaction ${transaction.id} may already exist`);
      }
    }

    // Seed portfolios
    console.log("Seeding portfolios...");
    for (const portfolio of initialPortfolios) {
      try {
        await portfolioService.create(portfolio);
        console.log(`Created portfolio for user: ${portfolio.userId}`);
      } catch (error) {
        console.log(`Portfolio for user ${portfolio.userId} may already exist`);
      }
    }

    // Seed price history
    console.log("Seeding price history...");
    for (const price of initialPriceHistory) {
      try {
        await priceHistoryService.create(price);
        console.log(`Created price history for stock: ${price.stockId}`);
      } catch (error) {
        console.log(
          `Price history for stock ${price.stockId} may already exist`
        );
      }
    }

    // Seed comments
    console.log("Seeding comments...");
    for (const comment of initialComments) {
      try {
        await commentService.create(comment);
        console.log(`Created comment: ${comment.id}`);
      } catch (error) {
        console.log(`Comment ${comment.id} may already exist`);
      }
    }

    // Seed buyback offers
    console.log("Seeding buyback offers...");
    for (const offer of initialBuybackOffers) {
      try {
        await buybackOfferService.create(offer);
        console.log(`Created buyback offer: ${offer.id}`);
      } catch (error) {
        console.log(`Buyback offer ${offer.id} may already exist`);
      }
    }

    // Seed notifications
    console.log("Seeding notifications...");
    for (const notification of initialNotifications) {
      try {
        await notificationService.create(notification);
        console.log(`Created notification: ${notification.id}`);
      } catch (error) {
        console.log(`Notification ${notification.id} may already exist`);
      }
    }

    console.log("Database seeding completed!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seedDatabase();
