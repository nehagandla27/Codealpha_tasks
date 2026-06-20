const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");

app.use(
  session({
    secret: "buspasssecret",
    resave: false,
    saveUninitialized: false,
  })
);

const db = new sqlite3.Database("./buspass.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS passes(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userEmail TEXT,
      route TEXT,
      passType TEXT,
      amount INTEGER
    )
  `);
});

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users(name,email,password) VALUES(?,?,?)",
    [name, email, hash],
    () => {
      res.redirect("/login");
    }
  );
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE email=?",
    [email],
    async (err, user) => {
      if (!user) return res.send("User Not Found");

      const match = await bcrypt.compare(password, user.password);

      if (!match) return res.send("Wrong Password");

      req.session.user = email;
      res.redirect("/dashboard");
    }
  );
});

app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.render("dashboard");
});

app.get("/booking", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.render("booking");
});

app.post("/booking", (req, res) => {
  const { route, passType } = req.body;

  const amount = passType === "Monthly" ? 500 : 5000;

  db.run(
    "INSERT INTO passes(userEmail,route,passType,amount) VALUES(?,?,?,?)",
    [req.session.user, route, passType, amount],
    () => {
      res.send(`Pass Booked Successfully! Amount: ₹${amount}`);
    }
  );
});

app.listen(3000, () => {
  console.log("Server Running on Port 3000");
});