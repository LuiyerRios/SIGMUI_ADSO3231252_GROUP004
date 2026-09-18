const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.render("HU-010");
});

module.exports = router;