const express = require("express");
const cors = require("cors");
const { mongoose } = require("mongoose");
const User = require("./models/User");
const Post = require("./models/Post");
const bcrypt = require("bcryptjs");
const app = express();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const uploadmiddleware = multer({ dest: "uploads/" });
const fs = require("fs");
const port = 4000;

const salt = bcrypt.genSaltSync(10);
const secret = "ghfkgfkvdhjfdkfdkfd";

app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));

mongoose
  .connect(
    "mongodb+srv://blog:MYF8RzA6hUthXIlR@cluster0.vdeu5rv.mongodb.net/?retryWrites=true&w=majority"
  )
  .then(() => {
    console.log("Database Connected");
  })
  .catch((error) => {
    console.log("error connecting to database", error);
  });

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const UserDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(UserDoc);
  } catch (error) {
    res.status(400).json(error);
  }
});

// app.post("/login", async (req, res) => {
//   const { username, password } = req.body;
//   const UserDoc = await User.findOne({ username });
//   const isPassword = bcrypt.compareSync(password, UserDoc.password);
//   if (isPassword) {
//     jwt.sign({ username, id: UserDoc._id }, secret, {}, (err, token) => {
//       if (err) throw err;
//       res.cookie("token", token).json({
//         id: UserDoc._id,
//         username,
//       });
//     });
//   } else {
//     res.status(400).json("Invalid username or password");
//   }
// });

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const UserDoc = await User.findOne({ username });

    if (!UserDoc) {
      return res.status(400).json("Invalid username or password");
    }

    const isPassword = bcrypt.compareSync(password, UserDoc.password);

    if (isPassword) {
      jwt.sign({ username, id: UserDoc._id }, secret, {}, (err, token) => {
        if (err) throw err;
        res.cookie("token", token).json({
          id: UserDoc._id,
          username,
        });
      });
    } else {
      res.status(400).json("Invalid username or password");
    }
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) throw err;
    res.json(info);
  });
});
app.post("/logout", (req, res) => {
  res.cookie("token", "").json("ok");
});
app.post("/post", uploadmiddleware.single("file"), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split(".");
  const ext = parts[parts.length - 1];
  const newPath = path + "." + ext;
  fs.renameSync(path, newPath);

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: info.id,
    });
    res.json({ postDoc });
  });
});

app.put("/post", uploadmiddleware.single("file"), async (req, res) => {
  let newPath = null;
  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    newPath = path + "." + ext;
    fs.renameSync(path, newPath);
  }

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { id, title, summary, content } = req.body;
    try {
      const postDoc = await Post.findById(id);
      if (!postDoc) {
        return res.status(404).json("Post not found");
      }

      const isAuthor =
        JSON.stringify(postDoc.author) === JSON.stringify(info.id);
      if (!isAuthor) {
        return res.status(403).json("You are not the author of this post");
      }

      const updatedFields = {
        title,
        summary,
        content,
        cover: newPath ? newPath : postDoc.cover,
      };

      const updatedPost = await Post.findByIdAndUpdate(id, updatedFields, {
        new: true,
      });
      res.json(updatedPost);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });
});

app.get("/post", async (req, res) => {
  res.json(
    await Post.find()
      .populate("author", ["username"])
      .sort({ createdAt: -1 })
      .limit(20)
  );
});

app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate("author", ["username"]);
  res.json(postDoc);
});

app.listen(port, () => {
  console.log(`App is listening on port ${port}`);
});
