import cors from "cors";
import express from "express";
import path from "node:path";
import { router } from "./routes";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());
app.use("/generated", express.static(path.resolve(process.cwd(), "generated")));
app.use("/api", router);

app.listen(port, () => {
  // Keep startup output explicit for local development.
  console.log(`Server listening on http://localhost:${port}`);
});
