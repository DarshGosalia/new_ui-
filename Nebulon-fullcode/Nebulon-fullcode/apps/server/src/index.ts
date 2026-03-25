import { createContext } from "@github_fin/api/context";
import { appRouter } from "@github_fin/api/routers/index";
import { auth } from "@github_fin/auth";
import { env } from "@github_fin/env/server";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import businessChatbotRouter from "./business-chatbot";
import { customersRouter } from "./crm/routes/customers";
import { ledgerRouter } from "./crm/routes/ledger";
import { remindersRouter } from "./crm/routes/reminders";
import { reportsRouter } from "./crm/routes/reports";
import instaRouter from "./instaurl";
import inventoryRouter from "./inventory";
import suppliersRouter from "./suppliers";

const app = express();

app.use(express.json({ limit: "10mb" }));

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.all("/api/auth{/*path}", toNodeHandler(auth));

app.use("/api/insta", instaRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/business-chatbot", businessChatbotRouter);
app.use("/api/crm/customers", customersRouter);
app.use("/api/crm/ledger", ledgerRouter);
app.use("/api/crm/reminders", remindersRouter);
app.use("/api/crm/reports", reportsRouter);

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    allowMethodOverride: true,
  }),
);

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
