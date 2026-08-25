import { prisma } from "./lib/prisma";

async function main() {
  const users = await prisma.user.findMany();
  console.log("Connected! Users found:", users.length);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Connection failed:", err);
    process.exit(1);
  });
