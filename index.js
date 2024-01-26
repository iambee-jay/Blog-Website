// server side logic

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const favicon = require("serve-favicon");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const mongoose = require("mongoose");
const validator = require("validator");
const fs = require("fs");

const jwtSecret = process.env.JWT_SECRET;
const app = express();
const port = process.env.PORT || 5500;

//Favorite Schema

app.use(favicon(path.join(__dirname, "public", "favicon.ico")));

// connect to mongoose database

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});

// mongoose Db Models

const Post = mongoose.model(
  "Post",
  new mongoose.Schema({
    title: String,
    content: String,
    imageUrl: String,
    author: String,
    timestamp: String,
  })
);

const User = mongoose.model(
  "User",
  new mongoose.Schema({
    username: String,
    password: String,
    role: String,
  })
);

// middleware

app.use(cors({ origin: "*" }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// JWT Authentication Middleware

const authenticateJWt = (req, res, next) => {
  const token = req.headers.authorization.split(" ")[1];

  if (token) {
    jwt.verify(token, jwtSecret, (err, user) => {
      if (err) {
        console.log("JWT verification error", err.message);
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    console.log("Token is missing");
    return res.sendStatus(403);
  }
};

// User Registration

app.post("/register", async (req, res) => {
  const { username, password, role } = req.body;

  // Sanitize and validate user input
  const sanitizedUsername = validator.escape(username);
  const sanitizedPassword = validator.escape(password);

  // ensure valid input data

  if (!sanitizedUsername || !sanitizedPassword) {
    return res.status(400).send({ error: "Invalid input data" });
  }

  const hashedPassword = await bcrypt.hash(sanitizedPassword, 10);

  const newUser = new User({
    username: sanitizedUsername,
    password: sanitizedPassword,
    role,
  });

  await newUser.save();

  res.status(201).send({ message: "User created successfully", success: true });
});

// User Login

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // Sanitize and validate user input
  const sanitizedUsername = validator.escape(username);
  const sanitizedPassword = validator.escape(password);

  // ensure valid input data

  if (!sanitizedUsername || !sanitizedPassword) {
    return res.status(400).send({ error: "Invalid input data" });
  }

  const user = await User.findOne({ username: sanitizedUsername });

  if (user) {
    if (bcrypt.compare(password, user.password)) {
      const accessToken = jwt.sign(
        {
          username: user.username,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );
      res
        .status(200)
        .send({ success: true, token: accessToken, role: user.role });
    } else {
      res
        .status(401)
        .send({ error: "Invalid username or password", success: false });
    }
  } else {
    res
      .status(401)
      .send({ error: "Invalid username or password", success: false });
  }
});

// Read all Posts

app.get("/posts", async (req, res) => {
  const posts = await Post.find();
  res.status(200).send(posts);
});

app.post("/posts", authenticateJWt, async (req, res) => {
  if (req.user.role === "admin") {
    const { title, content, imageUrl, author, timestamp } = req.body;

    const newPost = new Post({
      title,
      content,
      imageUrl,
      author,
      timestamp,
    });

    newPost
      .save()
      .then((savedPost) => {
        res.status(201).send(savedPost);
      })
      .catch((err) => {
        res.status(500).send({ error: "Internal server error" });
      });
  } else {
    res.sendStatus(403).send({ error: "Unauthorized" });
  }
});

app.post("/posts/:id", authenticateJWt, async (req, res) => {
  const postId = req.params.id;
  const post = await Post.findById(postId);

  if (!post) {
    return res.status(404).send({ error: "Post not found" });
  }

  // Read the html from the file

  fs.readFile(path.join(__dirname, "post-detail.html"), "utf8", (err, data) => {
    if (err) {
      return res.status(500).send("Internal server error");
    }

    // replace Placeholders in html with post data
    const postDetailHtml = data
      .replace(/\${post.imageUrl}/g, post.imageUrl)
      .replace(/\${post.title}/g, post.title)
      .replace(/\${post.timestamp}/g, post.timestamp)
      .replace(/\${post.author}/g, post.author)
      .replace(/\${post.content}/g, post.content);

    res.status(200).send(postDetailHtml);
  });
});

// delete post

app.delete("/posts:id", authenticateJWt, async (req, res) => {
  if (req.user.role == "admin") {
    try {
      await Post.findByIdAndDelete(req.params.id);
      res.status(200).send({ message: "Post deleted successfully" });
    } catch (err) {
      return res.status(500).send({ error: "Internal server error" });
    }
  } else {
    res.status(403).send({ error: "Unauthorized" });
  }
});

// update post

app.put("/posts:id", authenticateJWt, async (req, res) => {
  const { title, content } = req.body;
  const postId = req.params.id;

  try {
    const post = await Post.findById(postId);

    if (!post) {
      res.status(404).send({ error: "Post not found" });
    }

    if (req.user.role === "admin") {
      post.title = title;
      post.content = content;
      await post.save();
      res.status(200).send(post);
    } else {
      res.status(403).send({ error: "Unauthorized" });
    }
  } catch (err) {
    res.status(500).send({ error: "Internal server error" });
  }
});
