# mern-social-network

#### 1. Initialise package.json

    $ npm init

#### 2. Install production dependencies

    $ npm install express express-validator bcryptjs config gravatar jsonwebtoken mongoose axios

#### 3. Install development dependencies

    $ npm install -D nodemon concurrently

#### 4. Create starter server

Create a file called `server.js` and paste the following code into it:

```
const express = require('express');

const app = express();

app.get('/', (req, res) => res.send('API running'))

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
```

Start the server with:

    $ npm run server

***

In `package.json` copy this code in the script key:

```
"scripts": {
    "start": "node server",
    "server": "nodemon server"
}
```

Now we can start the server in multiple different ways.

***

Create a folder in the root called `config`. The installed package called `config` will use this directory to declare globally accessible configurations. It provides a nice way for us to abstract configuration away from the main code.

Create `default.json`, which is used by the `config` package, and paste this code into it. This is the connection to our MongoDB Atlas server.

```
{
"mongoURI": "mongodb+srv://dev:g7c76wh5Ro3MJDLO@mern-cluster.fxx6k.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"
}
```

Now create `db.js` which will manage the connection to this database:

```
const mongoose = require('mongoose');
const config = require('config');
const db = config.get('mongoURI');

const connectDB = async () => {
    try {
        await mongoose.connect(
            db, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            }
        );
        console.log('MongoDB connected...');
    } catch(err) {
        console.error(err.message);
        // exit process with failure
        process.exit(1);
    }
}

module.exports = connectDB;
```

#### 5. Create routes for our server

For each of the routes, we want to break them up inot separate resources and have a specific JS file for each route. Within the root folder, create a directory called `routes/api` and within this folder create files for the different routes: `auth.js`, `posts.js`, `profile.js` and `users.js`.

These will be the routes that provide our server with different routes.

For each of the route files, use the template below to fill them with this code:

```
const express = require('express');
const router = express.Router();

// @route   GET api/users
// @desc    Test route
// @access  Public
router.get('/', (req, res) => res.send('User route'));

module.exports = router;
```

#### 6. Create models for each of our resources

Create a folder in root called `models` and create a JS file to define the schema for each of the collections to be used within our MongoDB database.

Use the below code as a template:

```
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = User = mongoose.model('user', UserSchema);
```

#### 7. Update API routes with validation

In the `routes/api` files, update these routes with the correct validation and response if validation does not pass. For example in `users.js':

```
const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');

// @route   POST api/users
// @desc    Register user
// @access  Public
router.post('/', [
    check(
        'name', 
        'Name is required'
    ).not().isEmpty(),
    check(
        'email', 
        'Please include a valid email'
    ).isEmail(),
    check(
        'password', 
        'Please enter a password with 6 or more characters'
    ).isLength({ min: 6 })
    ], 
    (req, res) => {

        // check for errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        res.send('User route')
    }
);

module.exports = router;
```

#### 8. Connect API routes to MongoDB database for CRUD

Since our route is async/await, we can now implement our API code using await calls. The code below is for user registration and implements checks to see if the user already exists, collection of the gravatar, password hashing and saving of the user instance.

```
const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const normalize = require('normalize-url');

// models
const User = require('../../models/User');

// @route   POST api/users
// @desc    Register user
// @access  Public
router.post('/', [
    check(
        'name', 
        'Name is required'
    ).not().isEmpty(),
    check(
        'email', 
        'Please include a valid email'
    ).isEmail(),
    check(
        'password', 
        'Please enter a password with 6 or more characters'
    ).isLength({ min: 6 })
    ], 
    async (req, res) => {

        // check for errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password } = req.body;

        try {

            // see if user exists
            let user = await User.findOne({email: email});

            if (user) {
                return res.status(400).json({ errors: [{msg: "User already exists"}] })
            }

            // get users gravatar
            const avatar = normalize(
                gravatar.url(email, {
                    s: '200', // size
                    r: 'pg', // rating = pg
                    d: 'mm' // always return a default img
                }),
                { forceHttps: true }
            );

            // create new instance of user
            user = new User({
                name, 
                email,
                avatar,
                password
            })

            // encrypt password
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            await user.save();

            // return json web token (JWT)

            res.send('User registered')

        } catch(err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    }
);

module.exports = router;
```

Anything that returns a promise you want to make sure you put an await in front of, when using the async/await technique. If not using async/await, you use .then() and chain all your asynchronous code together. async/await is much more elegant.

#### 9. Implementing JSON Web Tokens

We are using JWT to assign web tokens when a user registers & signs in in order to authenticate users to access protected resources. To create a JWT after registration, use this code below after saving the user instance:

```
// return json web token (JWT)
const payload = {
    user: {
        id: user.id
    }
}

jwt.sign(
    payload,
    config.get('jwtSecret'),
    { expiresIn: 360000 },
    (err, token) => {
        if (err) throw err;
        res.json({ token })
    }
);
```

#### 10. Custom middleware to authenticate & verify JWT

What we now need is send that token back to the server so that we can authenticate and access protected routes.

First create  custom middleware in a root folder called `middleware`. Create file called `auth/js` with the following code:

```
const jwt = require('jsonwebtoken');
const config = require('config');

// a middleware function is a function that has access to the request
// and response cycle. 'next' is a callback that we have to run once
// we're done so that it moves onto the next piece of middleware

module.exports = function(req, res, next) {
    // get token from header
    const token = req.header('x-auth-token');

    // check if no token
    if (!token) {
        return res.status(401).json({ msg: "No token, authorisation denied" })
    }

    // verify token
    try {
        const decoded = jwt.verify(token, config.get('jwtSecret'));
        req.user = decoded.user;
        next();
    } catch(err) {
        res.status(401).json({ msg: "Token is not valid" });
    }
}
```

If the token if verified, the users information is saved within the request to be used when authenticating user access for protected routes. 

Now we want to protect routes with this middleware. We do this by importing the middleware in our routes and adding it as the second parameter in the route. For example with the route `auth.js`:

```
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');

// @route   GET api/auth
// @desc    Test route
// @access  Public
router.get('/', auth, (req, res) => res.send('Auth route'));

module.exports = router;
```

You can test this token authentication by copying the token that was returned in Postman when we registered, and adding it to a new GET requests header as the value of the key = `x-auth-token`. Make a GET request to http://localhost:5000/api/auth and you should be returned a success message.


***

Now that this middleware is created, we can add some logic to the protected routes. For example in the `auth.js` route, we can make an async route that gets the user from the DB based on the user information that we saved in the request and return this to the user.

#### 11. Login route

Very similar to the auth route, but this time only using the email and password of the user.

#### 12. Creating the profile model

We now want to create a profile model in the `models` folder, name the file `Profile.js`. The difference with this model is that we want to make a reference to the user model, i.e. link a unique key. The profile model is shown below and demonstrates an example of using arrays as a column:

```
const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    company: {
        type: String
    },
    website: {
        type: String
    },
    location: {
        type: String
    },
    status: {
        type: String,
        required: true
    },
    skills: {
        type: [String],
        required: true
    },
    bio: {
        type: String
    },
    githubusername: {
        type: String
    },
    experience: [
        {
            title: {
                type: String,
                required: true
            },
            company: {
                type: String,
                required: true
            },
            location: {
                type: String
            },
            from: {
                type: Date,
                required: true
            },
            to: {
                type: Date
            },
            current: {
                type: Boolean,
                required: true
            },
            description: {
                type: String
            }
        }
    ],
    education: [
        {
            school: {
                type: String,
                required: true
            },
            degree: {
                type: String,
                required: true
            },
            fieldofstudy: {
                type: String
            },
            from: {
                type: Date,
                required: true
            },
            to: {
                type: Date
            },
            current: {
                type: Boolean,
                required: true
            },
            description: {
                type: String
            }
        }
    ],
    social : {
        youtube: {
            type: String
        },
        twitter: {
            type: String
        },
        facebook: {
            type: String
        },
        linkedin: {
            type: String
        },
        instagram: {
            type: String
        }
    },
    date: {
        type: Date.apply,
        default: Date.now
    }
});

module.exports = Profile = mongoose.model('profile', ProfileSchema);
```






