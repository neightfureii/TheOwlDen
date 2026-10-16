import bcrypt from "bcryptjs";
import { prisma } from "./prisma.js";
import { required } from "../config.js";
import { slugify } from "../lib/slug.js";

const GENRES = [
  "Fiction",
  "Non-fiction",
  "Fantasy",
  "Science Fiction",
  "Mystery",
  "Thriller",
  "Romance",
  "Historical Fiction",
  "Horror",
  "Classics",
  "Young Adult",
  "Children's",
  "Graphic Novel",
  "Poetry",
  "Biography",
  "Memoir",
  "History",
  "Science",
  "Philosophy",
  "Self-Help",
  "Business",
];

for (const name of GENRES) {
  const slug = slugify(name);
  await prisma.genre.upsert({
    where: { slug },
    update: {},
    create: { name, slug },
  });
}

const email = required("ADMIN_EMAIL").toLowerCase();
const passwordHash = await bcrypt.hash(required("ADMIN_PASSWORD"), 12);

await prisma.user.upsert({
  where: { email },
  update: {},
  create: {
    email,
    username: (process.env.ADMIN_USERNAME ?? "admin").toLowerCase(),
    displayName: "Admin",
    passwordHash,
    role: "admin",
  },
});

console.log("Seeded genres and admin user:", email);
await prisma.$disconnect();
