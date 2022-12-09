const crypto = require("crypto");

const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");

const { validationResult } = require("express-validator");

const User = require("../models/user");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "mudduleodummy@gmail.com",
    pass: "kpacayrpmxpvsmqz",
  },
});

exports.getLogin = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    // errorMessage: req.flash("error"),
    errorMessage: message,
    oldInput: {
      email: "",
      password: "",
    },
    validationErrors: [],
    // isAuthenticated: false
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
    oldInput: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationErrors: [],
    // isAuthenticated: false
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "login",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email,
        password,
      },
      validationErrors: errors.array(),
    });
  }
  User.findOne({ email: email })
    .then(user => {
      if (!user) {
        // req.flash("error", "Invalid email or password.");
        // return res.redirect("/login");
        return res.status(422).render("auth/login", {
          path: "/login",
          pageTitle: "Login",
          // errorMessage: errors.array()[0].msg,
          errorMessage: "Invalid email or password.",

          oldInput: {
            email,
            password,
          },
          validationErrors: [],
        });
      }
      bcrypt
        .compare(password, user.password)
        .then(doMatch => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save(err => {
              console.log(err);
              res.redirect("/");
            });
          }
          // req.flash("error", "Invalid email or password.");
          // res.redirect("/login");
          return res.status(422).render("auth/login", {
            path: "/login",
            pageTitle: "login",
            // errorMessage: errors.array()[0].msg,
            errorMessage: "Invalid email or password.",

            oldInput: {
              email,
              password,
            },
            validationErrors: [],
          });
        })
        .catch(err => {
          console.log(err);
          res.redirect("/login");
        });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "signup",
      // errorMessage: req.flash("error"),
      // errorMessage: message,
      errorMessage: errors.array()[0].msg,
      oldInput: { email, password, confirmPassword },
      validationErrors: errors.array(),
    });
  }
  // User.findOne({ email: email })
  //   .then(userDoc => {
  //     if (userDoc) {
  //       req.flash("error", "Email already exist.");
  //       return res.redirect("/signup");
  //     }
  return bcrypt
    .hash(password, 12)
    .then(hashedPassword => {
      const user = new User({
        email: email,
        password: hashedPassword,
        cart: { items: [] },
      });
      return user.save();
    })

    .then(result => {
      res.redirect("/login");
      return transporter.sendMail({
        from: "mudduleodummy@gmail.com",
        to: email,
        subject: "Signup succeeded!! ✔",
        // text: "There is a new article. It's about sending emails, check it out!", // plain text body
        html: "<h1>You have Signed up.</h1>", // html body
      });
      // })
      // .catch(err => console.log(err));
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: message,
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    //random bytes generates random bytes   32 is quant
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email })
      .then(user => {
        if (!user) {
          req.flash("error", "No account with that email found");
          return res.redirect("/reset");
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        user.save(); //update user in db
      })
      .then(red => {
        res.redirect("/email-sent");
      })
      .then(result => {
        return transporter.sendMail({
          from: "mudduleodummy@gmail.com",
          to: req.body.email,
          subject: "Password reset!! ✔",
          // text: "There is a new article. It's about sending emails, check it out!", // plain text body
          html: `<p>You requested a password reset?</p>
          <p>Click this <a href='http://localhost:3000/reset/${token}'>Link </a> to set a new password</p>
          
          `, // html body
        });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  });
};
exports.getPassword = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/new-password", {
    path: "/new-password",
    pageTitle: "New Password",
    errorMessage: message,
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({
    resetToken: token,
    resetTokenExpiration: { $gt: Date.now() },
  })
    .then(user => {
      let message = req.flash("error");
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }
      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "New Password",
        errorMessage: message,
        passwordToken: token,
        userId: user._id.toString(),
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;
  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then(user => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then(hashedPassword => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = null;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then(result => {
      res.redirect("/login");
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.emailSent = (req, res, next) => {
  res.render("auth/email-sent", {
    path: "/email-sent",
    pageTitle: "Email sent ..",
    errorMessage: null,
  });
};
