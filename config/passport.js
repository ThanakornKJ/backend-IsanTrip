const passport = require("passport");
const FacebookStrategy =
  require("passport-facebook").Strategy;

const User = require("../models/User");

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FB_APP_ID,
      clientSecret:
        process.env.FB_APP_SECRET,

      callbackURL:
        "/api/auth/facebook/callback",

      profileFields: [
        "id",
        "displayName",
        "photos",
        "emails",
      ],
    },

    async (
      accessToken,
      refreshToken,
      profile,
      done
    ) => {
      try {
        const facebookId =
          profile.id;

        const email =
          profile.emails?.[0]?.value ||
          null;

        const profileImage =
          profile.photos?.[0]?.value ||
          null;

        // =====================================
        // 1) หา user จาก facebookId ก่อน
        // =====================================
        let user =
          await User.findOne({
            facebookId,
          });

        if (user) {
          // update profile ล่าสุด
          user.fullName =
            profile.displayName ||
            user.fullName;

          if (profileImage) {
            user.profileImage =
              profileImage;
          }

          if (
            email &&
            !user.email
          ) {
            user.email = email;
          }

          await user.save();

          return done(
            null,
            user
          );
        }

        // =====================================
        // 2) ถ้ามี email
        // หา account เดิมก่อน
        // =====================================
        if (email) {
          user =
            await User.findOne({
              email,
            });

          // ถ้ามี account เดิม
          // link facebook เข้า account เดิม
          if (user) {
            user.facebookId =
              facebookId;

            user.fullName =
              profile.displayName ||
              user.fullName;

            if (profileImage) {
              user.profileImage =
                profileImage;
            }

            await user.save();

            return done(
              null,
              user
            );
          }
        }

        // =====================================
        // 3) create user ใหม่
        // =====================================
        user =
          await User.create({
            facebookId,
            fullName:
              profile.displayName,
            email,
            profileImage,

            userType: "user",
          });

        return done(
          null,
          user
        );
      } catch (err) {
        console.error(
          "FACEBOOK AUTH ERROR:",
          err
        );

        return done(
          err,
          null
        );
      }
    }
  )
);

module.exports = passport;