import { Router, Request, Response } from "express";
import { User } from "../models/User";

const router = Router();

router.get("/login", (req: Request, res: Response) => {
  if (req.session.userId) {
    return res.redirect("/");
  }
  res.render("login", { messages: req.flash() });
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      req.flash("error", "Username and password are required");
      return res.redirect("/login");
    }

    const user = await User.findOne({ username });

    if (user && (await user.checkPassword(password))) {
      req.session.userId = user._id.toString(); // Convertendo _id para string
      req.flash("success", "Login successful!");
      return res.redirect("/");
    }

    req.flash("error", "Invalid username or password");
    res.redirect("/login");
  } catch (error) {
    console.error("Login error:", error);
    req.flash("error", "An error occurred during login");
    res.redirect("/login");
  }
});

router.get("/register", (req: Request, res: Response) => {
  if (req.session.userId) {
    return res.redirect("/");
  }
  res.render("register", { messages: req.flash() });
});

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      req.flash("error", "Username and password are required");
      return res.redirect("/register");
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      req.flash("error", "Username already exists");
      return res.redirect("/register");
    }

    // Create user with required fields
    const user = new User({
      username,
      isAdmin: false,
      credits: 0,
    });

    await user.setPassword(password);
    await user.save();

    req.session.userId = user._id.toString(); // Convertendo _id para string
    req.flash("success", "Account created successfully!");
    res.redirect("/");
  } catch (error) {
    console.error("Registration error:", error);
    req.flash("error", "An error occurred during registration");
    res.redirect("/register");
  }
});

router.get("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

export default router;
