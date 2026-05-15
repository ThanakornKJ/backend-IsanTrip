const authorize = (...roles) => {
  return (req, res, next) => {
    try {
      // =====================================
      // CHECK USER EXIST
      // =====================================
      if (!req.user) {
        return res.status(401).json({
          message:
            "Unauthorized: Login required",
        });
      }

      // =====================================
      // CHECK USER TYPE
      // =====================================
      const userType =
        req.user.userType;

      if (!userType) {
        return res.status(403).json({
          message:
            "Access denied: Invalid user type",
        });
      }

      // =====================================
      // CHECK ROLE PERMISSION
      // =====================================
      if (
        !roles.includes(
          userType
        )
      ) {
        return res.status(403).json({
          message:
            "Access denied",
        });
      }

      next();
    } catch (error) {
      console.error(
        "ROLE MIDDLEWARE ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Server error",
      });
    }
  };
};

module.exports = authorize;