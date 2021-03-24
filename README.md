# mern-social-network

## Build the Node JS, Express & MongoDB backend

***

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

#### 13. Create the profile route

This needs to be a protected route so this must take `auth` as its second parameter and must require a user token to be present within the request.

It finds the user profile using the request token and populates the profile information from the User table. However, we don't currently have a profile at the moment, so nothing will be returned.

```
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Profile = require('../../models/Profile');
const User = require('../../models/User');

// @route   GET api/profile/me
// @desc    Get current users profile
// @access  Private
router.get('/me', auth, async (req, res) => {

    try {
        const profile = await Profile.findOne(
            { user: req.user.id }
        ).populate(
            'user',
            ['name', 'avatar']
        );

        if (!profile) {
            return res.status(400).json({ msg: "There is no profile for this user" })
        }

        res.json(profile);

    } catch(err) {
        console.error(err.message);
        res.status(500).send({ msg: "Server error" })
    }
});

module.exports = router;
```

#### 14. Create & update profile

Include validation of required fields and then save to a new instance of Profile or update the existing one

```
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const { check, validationResult } = require('express-validator');

// @route   GET api/profile/me
// @desc    Get current users profile
// @access  Private
router.get('/me', auth, async (req, res) => {

    try {
        const profile = await Profile.findOne(
            { user: req.user.id }
        ).populate(
            'user',
            ['name', 'avatar']
        );

        if (!profile) {
            return res.status(400).json({ msg: "There is no profile for this user" })
        }

        res.json(profile);

    } catch(err) {
        console.error(err.message);
        res.status(500).send({ msg: "Server error" })
    }
});

// @route   POST api/profile
// @desc    Create or update user profile
// @access  Private
router.post('/', [
    auth, [
        check('status', 'Status is required').not().isEmpty(),
        check('skills', 'Skills is required').not().isEmpty()
    ]
], async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }

    const {
        company,
        website,
        location,
        bio,
        status,
        githubusername,
        skills,
        youtube,
        facebook,
        twitter,
        instagram,
        linkedin
    } = req.body;

    // build profile object
    const profileFields = {};

    profileFields.user = req.user.id;
    if (company) profileFields.company = company;
    if (website) profileFields.website = website;
    if (location) profileFields.location = location;
    if (bio) profileFields.bio = bio;
    if (status) profileFields.status = status;
    if (githubusername) profileFields.githubusername = githubusername;
    if (skills) {
        profileFields.skills = skills.split(',').map(skill => skill.trim());
    }

    // build social object
    profileFields.social = {}
    if (youtube) profileFields.social.youtube = youtube;
    if (twitter) profileFields.social.twitter = twitter;
    if (facebook) profileFields.social.facebook = facebook;
    if (linkedin) profileFields.social.linkedin = linkedin;
    if (instagram) profileFields.social.instagram = instagram;

    try {
        let profile = await Profile.findOne({ user: req.user.id });

        if (profile) {
            // update
            profile = await Profile.findOneAndUpdate(
                { user: req.user.id },
                { $set: profileFields },
                { new: true }
            );

            return res.json(profile);
        }

        // create
        profile = new Profile(profileFields);
        await profile.save();
        return res.json(profile);

    } catch(err) {
        console.error(err.message);
        req.status(500).send("Server error");
    }

});

module.exports = router;
```

#### 15. Get all profiles and individual profile by ID

Now we want to create a route that gets all profiles and also gets one profile by a specific ID. We do this using the following code. Note: we add some specific error handling for invalid user IDs. We don't want to tell the client that a user ID does or does not exist, this may cause a security risk. Instead, we indicate that a profile can't be found. 

```
// @route   GET api/profile
// @desc    Get all profiles
// @access  Public
router.get('/', async (req, res) => {
    try {
        const profiles = await Profile.find().populate(
            'user', // populate from the user collection
            ['name', 'avatar'] //populate just these two columns
        );
        res.json(profiles);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

// @route   GET api/profile/user/:user_id
// @desc    Get profile by user ID
// @access  Public
router.get('/user/:user_id', async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.params.user_id }).populate(
            'user', // populate from the user collection
            ['name', 'avatar'] //populate just these two columns
        );

        if (!profile) {
            return res.status(400).json({ msg: "Profile not found" });
        }

        res.json(profile);
    } catch (err) {
        console.error(err.message);
        // if user ID is invalid
        if (err.kind == 'ObjectId') {
            return res.status(400).json({ msg: "Profile not found" });
        }
        res.status(500).send("Server error");
    }
});
```

#### 16. Delete profile & user

We want to be able to delete a profile and an associated user completely.

```
// @route   DELETE api/profile
// @desc    Delete profile, user and posts
// @access  Private
router.delete('/', auth, async (req, res) => {
    try {
        // @todo remove users posts

        // remove profile
        await Profile.findOneAndRemove({ user: req.user.id });

        // remove user
        await User.findOneAndRemove({ _id: req.user.id });

        res.json({ msg: "User deleted" });
        
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});
```

#### 17. Create seperate routes to populate experience & education array

Need to use a PUT route here since we are updating data. The experience route is shown below:

```
// @route   PUT api/profile/experience
// @desc    Add profile experience
// @access  Private
router.put('/experience', [
    auth,
    [
        check('title', 'Title is required').not().isEmpty(),
        check('company', 'Company is required').not().isEmpty(),
        check('from', 'From date is required').not().isEmpty()
    ]
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {
        title, 
        company,
        location, 
        from,
        to,
        current,
        description
    } = req.body;

    const newExp = {
        title: title,
        company: company,
        location: location,
        from: from,
        to: to,
        current: current,
        description: description
    }

    try {
        const profile = await Profile.findOne({ user: req.user.id });

        // add experience to first element of array using unshift
        profile.experience.unshift(newExp);
        await profile.save();

        res.json(profile);

    } catch (err) {
        console.error(err.message);
        return res.status(500).send("Server error");
    }   
});
```

We can also remove an experience from the array using the following route:

```
// @route   DELETE api/profile/experience/:exp_id
// @desc    Delete experience from profile
// @access  Private
router.delete('/experience/:exp_id', auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id });

        // get the remove index
        const removeIndex = profile.experience.map(
            item => item.id
        ).indexOf(req.params.exp_id);
        
        // splice (remove) it from the array
        profile.experience.splice(removeIndex, 1);

        await profile.save();

        res.json(profile);
        
    } catch (err) {
        console.error(err.message);
        return res.status(500).send("Server error");
    }
});
```

We can use a two similar routes for education.

#### 18. Get GitHub repositories for profile

Create a token for our app within `settings > Developer settings` and use this token to grab Github repo information based on a username. Save the token within `config/default.json`.

```
// @route   GET api/profile/github/:username
// @desc    Get user repos from Github
// @access  Public
router.get('/github/:username', async (req, res) => {

    try {
        const uri = encodeURI(
            `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc`
        );
        const headers = {
            'user-agent': 'node.js',
            Authorization: `token ${config.get('githubToken')}`
        };
          
        const gitHubResponse = await axios.get(uri, { headers });
        return res.json(gitHubResponse.data);
        
    } catch (err) {
        console.error(err.message);
        return res.status(500).send("Server error");
    }
});
```

#### 19. Creating the Post model

Create a model to contain the posts that people may create on the website:

```
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    text: {
        type: String,
        required: true
    },
    name: {
        type: String
    },
    avatar: {
        type: String
    },
    likes: [
        {
            user: {
                type: Schema.Types.ObjectId,
                ref: 'user'
            }
        }
    ],
    comments: [
        {
            user: {
                type: Schema.Types.ObjectId,
                ref: 'user'
            },
            text: {
                type: String,
                required: true,
                name: {
                    type: String
                },
                avatar: {
                    type: String
                },
                date: {
                    type: Date,
                    default: Date.now
                }
            }
        }
    ],
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = Post = mongoose.model('post', PostSchema);
```

#### 20. Create the posts API routes

First we want to be able to create a post, then we want to be able to access all posts, get a specific post based on it's ID and also delete a post.

```
const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const Post = require('../../models/Post');
const Profile = require('../../models/Profile');
const User = require('../../models/User');

// @route   POST api/posts
// @desc    Create a post
// @access  Private
router.post('/', [
    auth,
    [
        check('text', 'Text is required').not().isEmpty()
    ]
],  async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const user = await User.findById({ _id: req.user.id }).select('-password');

        const newPost = new Post({
            text: req.body.text,
            name: user.name,
            avatar: user.avatar,
            user: req.user.id
        });

        const post = await newPost.save();

        res.json(post);

    } catch (err) {
        console.error(err.message);
        return res.status(500).send("Server error")
    }
});

// @route   GET api/posts
// @desc    Get all posts
// @access  Private
router.get('/', auth, async (req, res) => {
    try {

        // get posts and sort by most recent first
        const posts = await Post.find().sort({ date: -1 });
        res.json(posts);

    } catch (err) {
        console.error(err.message);
        return res.status(500).send("Server error")
    }
});

// @route   GET api/posts/:id
// @desc    Get post by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {

        const post = await Post.findById({ _id: req.params.id });

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        res.json(post);

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Post not found' });
        }
        return res.status(500).send("Server error")
    }
});

// @route   DELETE api/posts/:id
// @desc    Delete a post
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {

        const post = await Post.findById({ _id: req.params.id });

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        // check user on post matches user in request
        if (post.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorised' });
        }

        await post.remove();

        return res.json({ msg: 'Post removed' });

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Post not found' });
        }
        return res.status(500).send("Server error")
    }
});

module.exports = router;
```

*** 

Now we want to be able to like, unlike and comment/delete comment on a post

```
// @route   PUT api/posts/like/:id
// @desc    Like a post
// @access  Private
router.put('/like/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById({ _id: req.params.id });

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        // check if post has already been liked
        if (post.likes.filter(
            like => like.user.toString() === req.user.id
        ).length > 0) {
            return res.status(400).json({ msg: 'Post already liked' });
        }

        post.likes.unshift({ user: req.user.id });

        await post.save();

        return res.json(post.likes);

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Post not found' });
        }
        return res.status(500).send("Server error")
    }
});

// @route   PUT api/posts/unlike/:id
// @desc    Unlike a post
// @access  Private
router.put('/unlike/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById({ _id: req.params.id });

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        // check if post has already been unliked
        if (post.likes.filter(
            like => like.user.toString() === req.user.id
        ).length === 0) {
            return res.status(400).json({ msg: 'Post has not been liked' });
        }

        // get remove index
        const removeIndex = post.likes.map(
            like => like.user.toString()
        ).indexOf(req.user.id);
        post.likes.splice(removeIndex, 1);

        await post.save();

        return res.json(post.likes);

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Post not found' });
        }
        return res.status(500).send("Server error")
    }
});

// @route   POST api/posts/comment/:id
// @desc    Comment on a post
// @access  Private
router.post('/comment/:id', [
    auth,
    [
        check('text', 'Text is required').not().isEmpty()
    ]
],  async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {

        const user = await User.findById({ _id: req.user.id }).select('-password');
        const post = await Post.findById({ _id: req.params.id });

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        const newComment = {
            text: req.body.text,
            name: user.name,
            avatar: user.avatar,
            user: req.user.id
        };

        post.comments.unshift(newComment);

        await post.save();

        res.json(post.comments);

    } catch (err) {
        console.error(err.message);
        return res.status(500).send("Server error")
    }
});

// @route   DELETE api/posts/comment/:id/:comment_id
// @desc    Delete a commnet on a post
// @access  Private
router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
    try {

        const post = await Post.findById({ _id: req.params.id });

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        // get comment from post
        const comment = post.comments.find(
            comment => comment.id === req.params.comment_id
        );

        // make sure comment exists
        if (!comment) {
            return res.status(404).json({ msg: 'Comment not found' });
        }

        // check user
        if (comment.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorised' });
        }

        // get remove index
        const removeIndex = post.comments.map(
            comment => comment.user.toString()
        ).indexOf(req.user.id);
        post.comments.splice(removeIndex, 1);

        await post.save();

        return res.json(post.comments);

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Post not found' });
        }
        return res.status(500).send("Server error")
    }
});
```

## Build the React & Redux frontend

#### 21. React app setup

First we need to create our react app. Go to the root directory of the project and run the following command:

    $ npx create-react-app client

This will create our react app in a folder called `client`. Now if you go into the `client` directory and run `npm start`, this will start your react app server on port 3000, which you can visit in the browser.

The problem we have is that we need to run the Node JS server and the React server at the same time. We use concurrently to manage this. To do this, update the "scripts" key inside of the roor `package.json` to:

```
"scripts": {
    "start": "node server",
    "server": "nodemon server",
    "client": "npm start --prefix client",
    "dev": "concurrently \"npm run server\" \"npm run client\""
}
```

Now our `dev` script will run both the backend development server and the client server.

We need to install some dependencies for the client.

```
cd client

npm install axios react-router-dom redux react-redux redux-thunk redux-devtools-extension
```

Lastly within the `client/package.json` we need to make a proxy. This is because when we make a request with axios, we dont have to want to write the same prefix to the URI every time, e.g. `http://localhost:5000`. We can do this by creating a proxy.

#### 22. Clean up frontend and use initial components

**Note:** When creating components, if you type `racfe` then hit enter, it will automatically create a react arrow component function for you.

We're going to create our navbar and landing components and import these into the `App.js` file.

Within `src`, create a folder called `components/layout` and create two files, `Navbar.js` and `Landing.js`. Create boilerplate code using `racfe` and then adjust the code to the following:

**Navbar.js**

```
import React from 'react'

const Navbar = () => {
    return (
        <nav className="navbar bg-dark">
            <h1>
                <a href="index.html"><i className="fas fa-code"></i> DevConnector</a>
            </h1>
            <ul>
                <li><a href="profiles.html">Developers</a></li>
                <li><a href="register.html">Register</a></li>
                <li><a href="login.html">Login</a></li>
            </ul>
        </nav>
    )
}

export default Navbar
```

**Landing.js**

```
import React from 'react'

const Landing = () => {
    return (
        <section className="landing">
            <div className="dark-overlay">
                <div className="landing-inner">
                <h1 className="x-large">Developer Connector</h1>
                <p className="lead">
                    Create a developer profile/portfolio, share posts and get help from
                    other developers
                </p>
                <div className="buttons">
                    <a href="register.html" className="btn btn-primary">Sign Up</a>
                    <a href="login.html" className="btn btn-light">Login</a>
                </div>
                </div>
            </div>
        </section>
    )
}

export default Landing;
```

Make sure you also update the CSS to be using the template CSS code. Finally, update the `App.js` file as follows:

```
import React, { Fragment } from 'react';
import Navbar from './components/layout/Navbar';
import Landing from './components/layout/Landing';
import './App.css';

const App = () => {
	return (
		<Fragment>
			<Navbar/>
			<Landing/>
		</Fragment>
	);
}

export default App;
```

Now you should see the updated React app on http://localhost:3000

#### 23. React router setup

We want pages to link to other pages when the user clicks on particular elements. We can do this using the React Router. We can also use Switch to render different content based on what location you are on. Switch renders a route exclusively, unlike Route: https://reactrouter.com/core/api/Switch

In `App.js` use the switch to toggle between different content depending on the route:

```
import React, { Fragment } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Landing from './components/layout/Landing';
import Register from './components/auth/Register';
import Login from './components/auth/Login';
import './App.css';

const App = () => {
	return (
		<Router>
			<Fragment>
				<Navbar/>
				<Route exact path="/" component={ Landing }/>
				<section className="container">
					<Switch>
						<Route exact path="/register" component={ Register }/>
						<Route exact path="/login" component={ Login }/>
					</Switch>
				</section>
			</Fragment>
		</Router>
	);
}

export default App;

```

Now we want to create the register and login components. Create a new folder called `src/components/auth` and create two files `Login.js` and `Register.js`. Use the code below for `Register.js` to fill in both files:

```
import React from 'react'

const Register = () => {
    return (
        <div>
            Register
        </div>
    )
}

export default Register
```

Finally, we also want to link to these two pages from the landing page. Update the landing page to look like this:

```
import React from 'react'
import { Link } from 'react-router-dom';

const Landing = () => {
    return (
        <section className="landing">
            <div className="dark-overlay">
                <div className="landing-inner">
                <h1 className="x-large">Developer Connector</h1>
                <p className="lead">
                    Create a developer profile/portfolio, share posts and get help from
                    other developers
                </p>
                <div className="buttons">
                    <Link to="/register" className="btn btn-primary">Sign Up</Link>
                    <Link to="/login" className="btn btn-light">Login</Link>
                </div>
                </div>
            </div>
        </section>
    )
}

export default Landing;
```

#### 24. Register & useState Hook

Since the register route is a form, we should make use of the state for the form data. We can use `useState` from 'react' package to manage this. We also can make use of the `onChange` attribute within the HTML inputs to update the state.

Update `Register.js` to look like this:

```
import React, { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        password2: ''
    });

    const { name, email, password, password2 } = formData;

    const onChange = e => setFormData({
        ...formData, // make a copy of formData
        [e.target.name]: e.target.value
    });

    const onSubmit = e => {
        e.preventDefault();
        if (password !== password2) {
            console.log('Password do not match');
        } else {
            console.log(formData);
        }
    }

    return (
        <Fragment>
            <h1 className="large text-primary">Sign Up</h1>
            <p className="lead"><i className="fas fa-user"></i> Create Your Account</p>
            <form className="form" onSubmit={e => onSubmit(e)}>
                <div className="form-group">
                    <input type="text" placeholder="Name" name="name" value={name} onChange={e => onChange(e)} required/>
                </div>
                <div className="form-group">
                    <input type="email" placeholder="Email Address" name="email" value={email} onChange={e => onChange(e)} required/>
                    <small className="form-text">
                        This site uses Gravatar so if you want a profile image, use a Gravatar email
                    </small>
                </div>
                <div className="form-group">
                    <input type="password" placeholder="Password" name="password" minLength="6" value={password} onChange={e => onChange(e)} required/>
                </div>
                <div className="form-group">
                    <input type="password" placeholder="Confirm Password" name="password2" minLength="6" value={password2} onChange={e => onChange(e)} required/>
                </div>
                <input type="submit" className="btn btn-primary" value="Register" />
            </form>
            <p className="my-1">
                Already have an account? <Link to="/login">Sign In</Link>
            </p>
        </Fragment>
    )
}

export default Register
```

In this example, `formData` is our state and to update the state we have to call the `setFormData` function. As you can see, this function is called onChange of any of the input variables.

Now we want to create a Redux action to make a request to the backend.

#### 25. Implement Redux for app level state

https://react-redux.js.org/introduction/getting-started
 
We can use Redux to hold user, profile, alerts etc... that are needed across the entire application.

Redux is a state manager. We have **component level state** in React, such as within the Register and Login forms that we've created with the input fields. But with things liker authentication, profiles, posts etc... these are **app level state** items and this is where Redux comes in, it gives us app level state.

We can submit actions to Redux based on events and we can then get data to fall down into any component.

For example with the Profile. The profile data that we get from the server, this gets put into what we call a **Redux store**. We fire off an action to fetch the data and that gets put into the store. From any component we can call a **Redux Action** that will do something, e.g. update a profile. So it will make a request to the server, make the update on the server, get a response and then we want to update the UI. So any component that needs to be updating will be done through what's called a **Reducer**. A Reducer is just a function that takes in an Action. So we dispatch an Action to the Reducer. Then the Reducer decides how to handle the state and how to pass it down to the components in the UI. It will update any components that use that piece of state. This prevents us from passing things around between components. 

`Call an Action > dispatch an action to a Reducer > Reducer's decide what to do with that state (e.g delete a post, update profile,...) > send state back to components that need it`

For this application we will have several reducers:

- Auth reducer: this will handle everything to do with authentication
- Profile reducer: to handle profile information
- Posts reducer: to handle posts
- Alert reducer: to handle alerts that will appear on screen

![Redux example](redux.png)