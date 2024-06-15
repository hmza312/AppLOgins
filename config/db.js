// config/db.js

import mysql from "mysql2/promise"
import dotenv from "dotenv"

dotenv.config()

const dbConfig = {
	host: process.env.HOST,
	user: process.env.USER,
	password: process.env.PASSWORD,
	database: process.env.DATABASE,
}

const pool = mysql.createPool(dbConfig)

export default pool

// import dotenv from "dotenv"
// import mysql from "mysql2"
// dotenv.config()

// const connection = mysql.createConnection({
// 	host: process.env.HOST,
// 	user: process.env.USER,
// 	password: process.env.PASSWORD,
// 	database: process.env.DATABASE,
// })

// connection.connect((error) => {
// 	if (error) return console.log(error)
// 	console.log("connection successfull")
// })

// export default connection
// module.exports = connection
