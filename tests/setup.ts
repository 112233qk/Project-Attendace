import dotenv from "dotenv";
import path from "path";

// Load .env.test
dotenv.config({ path: path.join(__dirname, "../.env.test") });

jest.setTimeout(30000);

beforeAll(async () => {
  // Sengaja tanpa log agar output test bersih
});

afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
});
