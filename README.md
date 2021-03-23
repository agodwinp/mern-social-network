# mern-social-network

#### 1. Initialise package.json

    $ npm init

#### 2. Install production dependencies

    $ npm install express express-validator bcryptjs config gravatar jsonwebtoken mongoose axios

#### 3. Install development dependencies

    $ npm install -D nodemon concurrently

#### 4. Create starter server

Create a file called `server.js' and paste the following code into it:

"""
const express = require('express');

const app = express();

app.get('/', (req, res) => res.send('API running'))

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
"""

---

In `package.json' copy this code in the script key:

"""
"scripts": {
    "start": "node server",
    "server": "nodemon server"
}
"""

Now we can start the server in multiple different ways.

---

Create a folder in the root called `config'. The installed package called `config' will use this directory to declare globally accessible configurations. It provides a nice way for us to abstract configuration away from the main code.

Create `default.json', which is used by the `config' package, and paste this code into it. This is the connection to our MongoDB Atlas server.

"""
{
"mongoURI": "mongodb+srv://dev:g7c76wh5Ro3MJDLO@mern-cluster.fxx6k.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"
}
"""

Now create `db.js' which will manage the connection to this database:

"""
const mongoose = require('mongoose');
const config = require('config');
const db = config.get('mongoURI');

const connectDB = async () => {
try {
    await mongoose.connect(db);
    console.log('MongoDB connected...');
} catch(err) {
    console.error(err.message);
    // exit process with failure
    process.exit(1);
    }
}

module.exports = connectDB;
"""
