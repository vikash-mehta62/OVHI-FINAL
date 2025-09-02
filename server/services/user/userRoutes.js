const express = require("express")
const router = express.Router()

const userObj = require("./userController")

router.get("/get-user-details", userObj.getUserDetails);

module.exports = router
