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

#### 26. Creating a Redux store

https://redux.js.org/introduction/getting-started

Inside of `src` create a file called `store.js`. This will be where we define our Redux stores.

Note the 4th import, it is a relative import from a file called `index.js` within a `reducers` folder. We are going to have multiple reducers, one for auth, one for profile etc... but we are going to combine them in a `rootReducer`.

Add this code into `src/store.js`:

```
import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import thunk from 'redux-thunk';
import rootReducer from './reducers';

const initialState = {};

const middleware = [thunk];

const store = createStore(
    rootReducer, 
    initialState, 
    composeWithDevTools(
        applyMiddleware(...middleware)
    )
);

export default store;
```

Now within `App.js` we need to make some imports. First we need a Provider, this will connect React & Redux because they are originally independent. We just have to wrap our entire app with this Provider to allow all the components within the app to access app level state. `App.js` should look like this now:

```
import React, { Fragment } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Landing from './components/layout/Landing';
import Register from './components/auth/Register';
import Login from './components/auth/Login';
import './App.css';
// redux
import { Provider } from 'react-redux';
import store from './store';

const App = () => {
	return (
		<Provider store={store}>
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
		</Provider>
	);
}

export default App;
```

Finally in `reducers/index.js`, the idea is that we will have multiple reducers in here but we can combine them together with `combineReducers`. Here is the starter code for this file:

```
import {combineReducers } from 'redux';

export default combineReducers({

});

Now if you go to the website and open up the Redux Dev Tools within the console, you can see that we now have a Redux store.
```

#### 27. Alert reducer, action & types

First we want to create a new file called `alert.js` within `src/reducers`. This will house our alert reducer and should be imported within `index.js`. We declare the initial state as an empty array, each object within this array may look like the following:

```
{
    'id': '',
    'msg: '',
    'alertType': ''
}
```

We can use the information within this object to determine what type of alert to display. 

We then create the reducer function, which takes the initial state and an action as input. We determine how to update the state based on the `action.type` and switch cases. Cases should be defined as variables. So we are also going to hard code these into a folder of their own `src/actions/types.js`. This gives us a single centralised place for all our action types. Note: the action has two things inside of it, the type and the payload. The type is what we use to determine how to update the state based on the action type, the payload is any data that we need based on the action type. e.g. for SET_STATE, the payload will be the object above with 3 keys. But for REMOVE_STATE, it will be just an `id`.

Now to define the action object for each reducer, we need to create a new file called `alert.js` within `src/actions/`. This is where the actions will be dispatched from to call the cases within the reducer. Within `actions/alert.js` we need to provide an ID for the dispatched action. To do this, we can use the `uuid` package. 

```
cd into client/
npm install uuid
import { v4 as uuidv4 } from 'uuid';
```

This is the code for `reducers/alert.js`:

```
import { SET_ALERT, REMOVE_ALERT } from '../actions/types';

const initialState = [];

function alertReducer(state = initialState, action) {
    const { type, payload } = action;

    switch(type) {
        case SET_ALERT:
            return [...state, payload]; // state is immutable, therefore we need to take a copy of the current state before returning it
        case REMOVE_ALERT:
            return state.filter(alert => alert.id !== payload)
        default:
            return state;
    }
}

export default alertReducer;
```

For `actions/types.js`:

```
export const SET_ALERT = 'SET_ALERT';
export const REMOVE_ALERT = 'REMOVE_ALERT';
```

And finally for `actions/alert.js`:

```
import { setRandomFallback } from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { SET_ALERT, REMOVE_ALERT } from './types';

export const setAlert = (msg, alertType) => dispatch => {
    const id = uuidv4();
    dispatch({
        type: SET_ALERT,
        payload: {
            id: id,
            msg: msg,
            alertType: alertType
        }
    })
}
```

Now we have:

- Our `index.js` file that combines our reducers, only alert for now.
- Our alertReducer that takes in the state and action and and updates the state based on the action type.
- Our centralised store of all action types
- Our alert action which dispatches a type and payload to the reducer.

The flow goes: `Action is fired > action is dispatched to the reducer > reducer updates state based on action > state is updated in components that need it`

#### 28. Alert component & action call

We can call this action from the Register.js page, for example when someones passwords do not match. Instead of doing console.log(), we can use the `setAlert` action to dispatch to the reducer and update the state. We have to do a few things to make this work:

- Import `connect` from react-redux to connect the component to redux.
- Import setAlert from our actions folder.
- Update the export default to connect our component to redux. To use the actions within a component, you have to pass it into connect(). The connect() call takes two parameters, the first is any state that you want to map and the second is an object of all the actions you want to use.
- By connecting our component to redux, this allows us to access props from within the component.
- By adding this as a parameter in the parent arrow function, we can then access the setAlert action as a method within props.

The code for `Register.js` should now look like this:

```
import React, { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
// import axios from 'axios';
import { connect } from 'react-redux';
import { setAlert } from '../../actions/alert';
import PropTypes from 'prop-types'

const Register = ({ setAlert }) => {
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

    const onSubmit = async e => {
        e.preventDefault();
        if (password !== password2) {
            setAlert('Password do not match', 'danger', 5000);
        } else {
            setAlert('Welcome', 'success', 3000);
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

Register.propTypes = {
    setAlert: PropTypes.func.isRequired
}

export default connect(null, { setAlert })(Register);

```

***

Now we want to create an Alert component within `src/components/Alert.js`. By typing `racfp` this will automatically create a react arrow function component with prop types. We want to give this component access to the reducer, so we need to bring in `connect` again. Also, we want to map the state of the alert to a prop, so we need to create a function that makes the alert reducer available. The line `alerts: state.alert` assigns the `alert` in `reducers/index.js` to `alerts` as prop within this component. Props are input to a component: https://reactjs.org/docs/components-and-props.html. The code for `Alert.js` is below:

```
import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

const Alert = ({ alerts }) =>
    alerts.map((alert) => (
        <div key={alert.id} className={`alert alert-${alert.alertType}`}>
            {alert.msg}
        </div>
    ));

Alert.propTypes = {
    alerts: PropTypes.array.isRequired
};

const mapStateToProps = (state) => ({
    alerts: state.alert
});

export default connect(mapStateToProps)(Alert);
```

**Note:** Every time you loop through an array, such as with the map function, if you're returning JSX as a list (which we are in this case), you need to assign a unique key for each iteration. You can do this using the `id`.

The flow of data through Redux is as follows:

https://redux.js.org/tutorials/fundamentals/part-2-concepts-data-flow

**Initial setup**

- A Redux store is created using combineReducers in the root reducer function
- The store called the root reducer once and saves the return value as its initial state
- When the UI is first rendered, UI components access the current state of the Redux store, and use that data to decide what to render. They also subscribe to any future store updates so they can know if the state has changed.

**Updates**
 
 - Something happens in the app, such as a user clicking a button
 - The app code dispatches an action to the Redux store
 - The store runs the reducer function again with the previous state and the current action and saves the return value as the new state
 - The store notifies all parts of the UI that are subscribed, that the store has been updated
 - Each UI component that needs data from the store checks to see if parts of the state they need has changed
 - Each component that sees its data has changed forces a re-render with the new data, so it can update what's shown on screen.

 #### 29. Auth reducer & register action

The auth reducer updates the state based on successful or failed registration. If successful, the reducer updates the state with a spread of the state & payload but sets isAuthenticated to true and loading to false, to show that the user is authenticated and loading does not need to be done.

```
import {
    REGISTER_SUCCESS,
    REGISTER_FAIL
} from '../actions/types';

const initialState = {
    token: localStorage.getItem('token'),
    isAuthenticated: null,
    loading: true, // this is to indicate whether we have the response and it's been loaded ==> it is currently loading (true)
    user: null
}

function authReducer(state = initialState, action) {
    const { type, payload } = action;

    switch(type) {
        case REGISTER_SUCCESS:
            localStorage.setItem('token', payload.token);
            return {
                ...state,
                ...payload,
                isAuthenticated: true,
                loading: false // we've got the response and it's been loaded ==> false
            }
        case REGISTER_FAIL:
            localStorage.removeItem('token');
            return {
                ...state,
                token: null,
                isAuthenticated: false,
                loading: false // we've got the response and it's been loaded ==> false
            }
        default:
            return state;

    }
}

export default authReducer;
```

The register action takes in the name, email and password from the register component state and makes an asynchronous request to our backend API to register a user. If it is successful, a success message appears. If not, failure messages appear. 

```
import axios from 'axios';
import { setAlert } from './alert';
import { REGISTER_SUCCESS, REGISTER_FAIL } from "./types";

// register user
export const register = ({ name, email, password }) => async dispatch => {
    const config = {
        headers: {
            'Content-Type': 'application/json'
        }
    }
    const body = JSON.stringify({ name, email, password });

    try {
        const res = await axios.post('/api/users', body, config);
        
        dispatch({
            type: REGISTER_SUCCESS,
            payload: res.data
        });

        dispatch(setAlert('Registration complete!', 'success'));

    } catch (err) {
        const errors = err.response.data.errors;
        if (errors) {
            errors.forEach(
                error => dispatch(
                    setAlert(error.msg, 'danger')
                )
            );
        }   

        dispatch({
            type: REGISTER_FAIL
        });
        
    }
}
```

#### 30. Load user & set auth token

Now we want to handle the whole process of taking a token that we have stored, sending it to the backend for validation and then loading the user. We want that to happen every time the main app commponent is loaded. 

1. Create a new action in the `auth.js` file called `loadUser`. This function needs to check to see if there is a token and if there is, put it into a global header within localStorage, if there is not, delete it from the headers. We will do this within a separate file called `utils/setAuthToken.js`. This means that if there is a token, we can send it with every request.
2. Integrate it into `App.js` with the `useEffect` hook. The way we dispatch the `loadUser` action from App.js is with the useEffect hook. Within the useEffect hook, can take the Redux store directly and we call dispatch. The effect hook allows you to perform side effects in function components: https://reactjs.org/docs/hooks-effect.html.

#### 31. User login

1. First we need to create a new login action which will be very similar to the register action. 
2. Then we need to create the new action types.
3. After this, we need to add the action types to the reducer.
4. Next we need a way to fire off the actions, within the component of course.

We are seeing a familiar flow when building these reducers:

1. Create a new action
2. Create new action types
3. Create or build these action types into the reducer
4. Integrate the firing off of these actions into a component

To integrate an action into a component:

1. Import the action, connect & PropTypes. PropTypes will be used to make the action available as a prop in the component.
2. Connect the component to the Reducer and pass mapStateToProps or mapDispatchToProps as parameters. This will make state available as a prop or an action available as a prop respectively. 
3. Assign the actions to the propTypes
4. De-structure prop using {} to extract the action as a parameter for the component.

The Login component should now look like this:

```
import React, { Fragment, useState } from 'react';
import { Link, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';
import { login } from '../../actions/auth';
import PropTypes from 'prop-types'

const Login = ({ login, isAuthenticated }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const { email, password } = formData;

    const onChange = e => setFormData({
        ...formData, // make a copy of formData
        [e.target.name]: e.target.value
    });

    const onSubmit = async e => {
        e.preventDefault();
        login(email, password);
    }

    // redirect if logged in
    if (isAuthenticated) {
        return <Redirect to="/dashboard"/>
    }

    return (
        <Fragment>
            <h1 className="large text-primary">Sign In</h1>
            <p className="lead"><i className="fas fa-user"></i> Sign Into Your Account</p>
            <form className="form" onSubmit={e => onSubmit(e)}>
                <div className="form-group">
                    <input type="email" placeholder="Email Address" name="email" value={email} onChange={e => onChange(e)} required/>
                </div>
                <div className="form-group">
                    <input type="password" placeholder="Password" name="password" minLength="6" value={password} onChange={e => onChange(e)} required/>
                </div>
                <input type="submit" className="btn btn-primary" value="Login" />
            </form>
            <p className="my-1">
                Don't have an account? <Link to="/register">Sign Up</Link>
            </p>
        </Fragment>
    )
}

Login.propTypes = {
    login: PropTypes.func.isRequired,
    isAuthenticated: PropTypes.bool
}

const mapStateToProps = (state) => ({
    isAuthenticated: state.auth.isAuthenticated
});

export default connect(mapStateToProps, { login })(Login);
```

We have also added a small check fir Login and Register to redirect the user to the `dashboard` page if the user is authenticated, using state and `mapStateToProps`.

#### 32. Logout and Navbar links

Add a new action in the auth action for logout:
```
export const logout = () => dispatch => {
    dispatch({
        type: LOGOUT
    });
} 
```

Then create a new action type for logout and define the action type in the auth reducer. Finally, integrate this into `Navbar.js` and the code should look like this:

```
import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { logout } from '../../actions/auth';

const Navbar = ({ auth: { isAuthenticated, loading }, logout }) => {

    const authLinks = (
        <ul>
            <li>
                <a onClick={logout} href="#!">
                    <i className="fas fa-sign-out-alt"></i>{' '}
                    <span className="hide-sm">Logout</span>
                </a>
            </li>
        </ul>
    );

    const guestLinks = (
        <ul>
            <li><a href="#!">Developers</a></li>
            <li><Link to="/register">Register</Link></li>
            <li><Link to="/login">Login</Link></li>
        </ul>
    );

    return (
        <nav className="navbar bg-dark">
            <h1>
                <Link to="/"><i className="fas fa-code"></i> DevConnector</Link>
            </h1>
            {/* TERNARY: If not loading, then do this */}
            {/* { !loading ? 'x' : 'y' }, this means if not loading do 'x' else do 'y' */}
            { !loading && (<Fragment>{ isAuthenticated ? authLinks : guestLinks }</Fragment>) } 
            
        </nav>
    )
}

Navbar.propTypes = {
    logout: PropTypes.func.isRequired,
    auth: PropTypes.object.isRequired
}

const mapStateToProps = state => ({
    auth: state.auth
})

export default connect(mapStateToProps, { logout })(Navbar);
```

#### 33. Protected route for dashboard

Some routes we want to protect so that only authenticated users can access them. 

We are going to do this by creating a `PrivateRoute` component, to protect specific routes.

We create `components/routing/PrivateRoute.js` and use the following code to create a private route:

```
import React from 'react'
import { Route, Redirect } from 'react-router-dom';
import PropTypes from 'prop-types'
import { connect } from 'react-redux';


const PrivateRoute = (
    { component: Component, auth: { isAuthenticated, loading }, ...rest }
)  => ( // we're de-structuring the component prop being passed in, grabbing the Component and '...rest' grabs anything else that's passed in

    <Route { ...rest } render={
        props => !isAuthenticated && !loading ? (
            <Redirect to="/login" />
        ) : (
            <Component {...props} />
        )
    }/>
)

PrivateRoute.propTypes = {
    auth: PropTypes.object.isRequired
}

const mapStateToProps = state => ({
    auth: state.auth    
});

export default connect(mapStateToProps)(PrivateRoute);
```

We then just have to change the route in `App.js` to be a PrivateRoute instead of a Route.

#### 34. Profile reducer and get current profile

When the user goes to the Dashboard page, we want the profile actions to be kicked off. To kick off this action as soon as the page is loaded, we use the `useEffect` hook. 

First create a new action for Profile `actions/profile.js`:

```
import axios from 'axios';
import { setAlert } from './alert';

import { 
    GET_PROFILE,
    PROFILE_ERROR
} from './types';

// get current users profile
export const getCurrentProfile = () => async dispatch => {
    try {
        const res = await axios.get('/api/profile/me');
        
        dispatch({
            type: GET_PROFILE,
            payload: res.data
        })
        
    } catch (err) {
        dispatch({
            type: PROFILE_ERROR,
            payload: { 
                msg: err.response.statusText, 
                status: err.response.status 
            }
        })
    }
}
```

Then create a reducer for this action `reducers/profile.js`:

```
import {
    GET_PROFILE,
    PROFILE_ERROR
} from '../actions/types';

const initialState = {
    profile: null,
    profiles: [],
    repos: [],
    loading: true,
    error: {}
}

function profileReducer (state = initialState, action) {
    const { type, payload } = action;

    switch(type) {
        case GET_PROFILE:
            return {
                ...state,
                profile: payload,
                loading: false
            };

        case PROFILE_ERROR:
            return {
                ...state,
                error: payload,
                loading: false
            };

        default:
            return state;
    }
}

export default profileReducer;
```

Finally integrate the action into the Dashboard component:

```
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { getCurrentProfile } from '../../actions/profile';

const Dashboard = ({ getCurrentProfile, auth, profile }) => {
    useEffect(() => {
        getCurrentProfile();
    }, []);
    return (
        <div>
            Dashboard
        </div>
    )
};

Dashboard.propTypes = {
    getCurrentProfile: PropTypes.func.isRequired,
    auth: PropTypes.object.isRequired,
    profile: PropTypes.object.isRequired
}

const mapStateToProps = state => ({
    auth: state.auth,
    profile: state.profile
});

export default connect(mapStateToProps, { getCurrentProfile })(Dashboard);
```

#### 35. Starting the dashboard

1. First we added a spinner component to show when the user & profile was still being collected into the state. This way, the dashboard component will not be shown until the proper information is stored within the state.
2. Then we added some basic markup within a Fragment to check whether the user has created a profile. If not, then a button will appear to redirect them to the `create-profile` route.

#### 36. CreateProfile component

Within a form, each input should be a piece of component level state. For the CreateProfile form, we will use component level state and global state.

We create a new `components/profile-forms/CreateProfile.js` component with component level state:

```
import React, { Fragment, useState } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'


const CreateProfile = props => {
    const [formData, setFormData] = useState({
        company: '',
        website: '',
        location: '',
        status: '',
        skills: '',
        githubusername: '',
        bio: '',
        twitter: '',
        facebook: '',
        linkedin: '',
        youtube: '',
        instagram: ''
    });

    const [displaySocialInputs, toggleSocialInputs] = useState(false);

    const {
        company,
        website,
        location,
        status,
        skills,
        githubusername,
        bio,
        twitter,
        facebook,
        linkedin,
        youtube,
        instagram
    } = formData;

    // input parameter 'e' is the event parameter
    const onChange = e => setFormData({
        ...formData,
        [e.target.name]: e.target.value
    });

    return (
        <Fragment>
            <h1 className="large text-primary">
                Create Your Profile
            </h1>
            <p className="lead">
                <i className="fas fa-user"></i> Let's get some information to make your
                profile stand out
            </p>
            <small>* = required field</small>
            <form className="form">
                <div className="form-group">
                <select name="status" value={status} onChange={e => onChange(e)}> {/* e = event parameter */}
                    <option value="0">* Select Professional Status</option>
                    <option value="Developer">Developer</option>
                    <option value="Junior Developer">Junior Developer</option>
                    <option value="Senior Developer">Senior Developer</option>
                    <option value="Manager">Manager</option>
                    <option value="Student or Learning">Student or Learning</option>
                    <option value="Instructor">Instructor or Teacher</option>
                    <option value="Intern">Intern</option>
                    <option value="Other">Other</option>
                </select>
                <small className="form-text"
                    >Give us an idea of where you are at in your career</small
                >
                </div>
                <div className="form-group">
                <input type="text" placeholder="Company" name="company" value={company} onChange={e => onChange(e)} />
                <small className="form-text"
                    >Could be your own company or one you work for</small
                >
                </div>
                <div className="form-group">
                <input type="text" placeholder="Website" name="website" value={website} onChange={e => onChange(e)} />
                <small className="form-text"
                    >Could be your own or a company website</small
                >
                </div>
                <div className="form-group">
                <input type="text" placeholder="Location" name="location" value={location} onChange={e => onChange(e)} />
                <small className="form-text"
                    >City & state suggested (eg. Boston, MA)</small
                >
                </div>
                <div className="form-group">
                <input type="text" placeholder="* Skills" name="skills" value={skills} onChange={e => onChange(e)} />
                <small className="form-text"
                    >Please use comma separated values (eg.
                    HTML,CSS,JavaScript,PHP)</small
                >
                </div>
                <div className="form-group">
                <input
                    type="text"
                    placeholder="Github Username"
                    name="githubusername"
                    value={githubusername} onChange={e => onChange(e)}
                />
                <small className="form-text"
                    >If you want your latest repos and a Github link, include your
                    username</small
                >
                </div>
                <div className="form-group">
                <textarea placeholder="A short bio of yourself" name="bio" value={bio} onChange={e => onChange(e)}></textarea>
                <small className="form-text">Tell us a little about yourself</small>
                </div>

                <div className="my-2">
                <button onClick={() => toggleSocialInputs(!displaySocialInputs)} type="button" className="btn btn-light">
                    Add Social Network Links
                </button>
                <span>Optional</span>
                </div>

                {
                    displaySocialInputs && (
                        <Fragment>
                            <div className="form-group social-input">
                                <i className="fab fa-twitter fa-2x"></i>
                                <input type="text" placeholder="Twitter URL" name="twitter" value={twitter} onChange={e => onChange(e)} />
                            </div>

                            <div className="form-group social-input">
                                <i className="fab fa-facebook fa-2x"></i>
                                <input type="text" placeholder="Facebook URL" name="facebook" value={facebook} onChange={e => onChange(e)} />
                            </div>

                            <div className="form-group social-input">
                                <i className="fab fa-youtube fa-2x"></i>
                                <input type="text" placeholder="YouTube URL" name="youtube" value={youtube} onChange={e => onChange(e)} />
                            </div>

                            <div className="form-group social-input">
                                <i className="fab fa-linkedin fa-2x"></i>
                                <input type="text" placeholder="Linkedin URL" name="linkedin" value={linkedin} onChange={e => onChange(e)} />
                            </div>

                            <div className="form-group social-input">
                                <i className="fab fa-instagram fa-2x"></i>
                                <input type="text" placeholder="Instagram URL" name="instagram" value={instagram} onChange={e => onChange(e)} />
                            </div>
                        </Fragment>
                    )
                }

                <input type="submit" className="btn btn-primary my-1" />
                <a className="btn btn-light my-1" href="dashboard.html">Go Back</a>
            </form>
            
        </Fragment>
    )
}

CreateProfile.propTypes = {

}

export default CreateProfile
```

#### 37. CreateProfile action

Now we create actions firing from the CreateProfile action. **Note**: to redirect to a page in an action we can't make use of the `<Redirect>` tag like we have done before in the components. We have to use a history object passed from the client side. This history object comes by importing `withRouter` from the 'react-router-dom' package.

We use component level state with onSubmit and onChange and fire off an action and update the component level state respectively. `components/profile-forms/CreateProfile.js` should now look like this:

```
import React, { Fragment, useState } from 'react'
import { Link, withRouter } from 'react-router-dom';
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { createProfile } from '../../actions/profile';


const CreateProfile = ({ createProfile, history }) => {
    const [formData, setFormData] = useState({
        company: '',
        website: '',
        location: '',
        status: '',
        skills: '',
        githubusername: '',
        bio: '',
        twitter: '',
        facebook: '',
        linkedin: '',
        youtube: '',
        instagram: ''
    });

    const [displaySocialInputs, toggleSocialInputs] = useState(false);

    const {
        company,
        website,
        location,
        status,
        skills,
        githubusername,
        bio,
        twitter,
        facebook,
        linkedin,
        youtube,
        instagram
    } = formData;

    // input parameter 'e' is the event parameter
    const onChange = e => setFormData({
        ...formData,
        [e.target.name]: e.target.value
    });

    const onSubmit = e => {
        e.preventDefault();
        createProfile(formData, history);
    }

    return (
        <Fragment>
            <h1 className="large text-primary">
                Create Your Profile
            </h1>
            <p className="lead">
                <i className="fas fa-user"></i> Let's get some information to make your
                profile stand out
            </p>
            <small>* = required field</small>
            <form className="form" onSubmit={e => onSubmit(e)}>
                <div className="form-group">
                <select name="status" value={status} onChange={e => onChange(e)}> {/* e = event parameter */}
                    <option value="0">* Select Professional Status</option>
                    <option value="Developer">Developer</option>
                    <option value="Junior Developer">Junior Developer</option>
                    <option value="Senior Developer">Senior Developer</option>
                    <option value="Manager">Manager</option>
                    <option value="Student or Learning">Student or Learning</option>
                    <option value="Instructor">Instructor or Teacher</option>
                    <option value="Intern">Intern</option>
                    <option value="Other">Other</option>
                </select>
                <small className="form-text"
                    >Give us an idea of where you are at in your career</small
                >
                </div>
                <div className="form-group">
                <input type="text" placeholder="Company" name="company" value={company} onChange={e => onChange(e)} />
                <small className="form-text"
                    >Could be your own company or one you work for</small
                >
                </div>
                <div className="form-group">
                <input type="text" placeholder="Website" name="website" value={website} onChange={e => onChange(e)} />
                <small className="form-text"
                    >Could be your own or a company website</small
                >
                </div>
                <div className="form-group">
                <input type="text" placeholder="Location" name="location" value={location} onChange={e => onChange(e)} />
                <small className="form-text"
                    >City & state suggested (eg. Boston, MA)</small
                >
                </div>
                <div className="form-group">
                <input type="text" placeholder="* Skills" name="skills" value={skills} onChange={e => onChange(e)} />
                <small className="form-text"
                    >Please use comma separated values (eg.
                    HTML,CSS,JavaScript,PHP)</small
                >
                </div>
                <div className="form-group">
                <input
                    type="text"
                    placeholder="Github Username"
                    name="githubusername"
                    value={githubusername} onChange={e => onChange(e)}
                />
                <small className="form-text"
                    >If you want your latest repos and a Github link, include your
                    username</small
                >
                </div>
                <div className="form-group">
                <textarea placeholder="A short bio of yourself" name="bio" value={bio} onChange={e => onChange(e)}></textarea>
                <small className="form-text">Tell us a little about yourself</small>
                </div>

                <div className="my-2">
                <button onClick={() => toggleSocialInputs(!displaySocialInputs)} type="button" className="btn btn-light">
                    Add Social Network Links
                </button>
                <span>Optional</span>
                </div>

                {
                    displaySocialInputs && (
                        <Fragment>
                            <div className="form-group social-input">
                                <i className="fab fa-twitter fa-2x"></i>
                                <input type="text" placeholder="Twitter URL" name="twitter" value={twitter} onChange={e => onChange(e)} />
                            </div>

                            <div className="form-group social-input">
                                <i className="fab fa-facebook fa-2x"></i>
                                <input type="text" placeholder="Facebook URL" name="facebook" value={facebook} onChange={e => onChange(e)} />
                            </div>

                            <div className="form-group social-input">
                                <i className="fab fa-youtube fa-2x"></i>
                                <input type="text" placeholder="YouTube URL" name="youtube" value={youtube} onChange={e => onChange(e)} />
                            </div>

                            <div className="form-group social-input">
                                <i className="fab fa-linkedin fa-2x"></i>
                                <input type="text" placeholder="Linkedin URL" name="linkedin" value={linkedin} onChange={e => onChange(e)} />
                            </div>

                            <div className="form-group social-input">
                                <i className="fab fa-instagram fa-2x"></i>
                                <input type="text" placeholder="Instagram URL" name="instagram" value={instagram} onChange={e => onChange(e)} />
                            </div>
                        </Fragment>
                    )
                }

                <input type="submit" className="btn btn-primary my-1" />
                <a className="btn btn-light my-1" href="dashboard.html">Go Back</a>
            </form>
            
        </Fragment>
    )
}

CreateProfile.propTypes = {
    createProfile: PropTypes.func.isRequired
}

export default connect(null, { createProfile })(withRouter(CreateProfile));
```

We also add a new action called `createProfile` within `src/actions/profile.js`. This file should now look like this:

```
import axios from 'axios';
import { setAlert } from './alert';

import { 
    GET_PROFILE,
    PROFILE_ERROR
} from './types';

// get current users profile
export const getCurrentProfile = () => async dispatch => {
    try {
        const res = await axios.get('/api/profile/me');
        
        dispatch({
            type: GET_PROFILE,
            payload: res.data
        })
        
    } catch (err) {
        dispatch({
            type: PROFILE_ERROR,
            payload: { 
                msg: err.response.statusText, 
                status: err.response.status 
            }
        })
    }
}

// create or update profile
export const createProfile = (formData, history, edit = false) => async dispatch => { // we pass in the history object with a method called 'push' to redirect us to a client side route
    try {
        const config = {
            headers: {
                'Content-Type': 'application/json'
            }
        }

        const res = await axios.post('/api/profile', formData, config);

        dispatch({
            type: GET_PROFILE,
            payload: res.data
        });

        dispatch(setAlert(edit ? 'Profile Updated' : 'Profile Created', 'success'));

        if (!edit) {
            history.push('dashboard');
        }

    } catch (err) {
        const errors = err.response.data.errors;
        if (errors) {
            errors.forEach(
                error => dispatch(
                    setAlert(error.msg, 'danger')
                )
            );
        } 
        dispatch({
            type: PROFILE_ERROR,
            payload: { 
                msg: err.response.statusText, 
                status: err.response.status 
            }
        })
        
    }
}
```

#### 38. Edit profile

Create a component called `components/profile-forms/EditProfile.js`. This will be very similar to the `CreateProfile` component however it will call the createProfile action slightly differently, with `edit = true`.

#### 39. Add education & experience

The AddExperience and AddEducation component are very similar. Here is the code for `components/profile-forms/AddExperience.js`:

```
import React, { Fragment, useState } from 'react'
import { Link, withRouter } from 'react-router-dom'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { addExperience } from '../../actions/profile'

const AddExperience = ({ addExperience, history }) => {

    const [formData, setFormData] = useState({
        company: '',
        title: '',
        location: '',
        from: '',
        to: '',
        current: false,
        description: ''
    });

    const [toDateDisabled, toggleDisabled] = useState(false);

    const { company, title, location, from, to, current, description } = formData;

    const onChange = e => setFormData({
        ...formData,
        [e.target.name]: e.target.value
    });

    const onSubmit = e => {
        e.preventDefault();
        addExperience(formData, history);
    }

    return (
        <Fragment>
            <h1 class="large text-primary">
            Add An Experience
            </h1>
            <p class="lead">
                <i class="fas fa-code-branch"></i> Add any developer/programming
                positions that you have had in the past
            </p>
            <small>* = required field</small>
            <form class="form" onSubmit={e => onSubmit(e)}>
                <div class="form-group">
                    <input type="text" placeholder="* Job Title" name="title" value={title} onChange={e => onChange(e)} required />
                </div>
                <div class="form-group">
                    <input type="text" placeholder="* Company" name="company" value={company} onChange={e => onChange(e)} required />
                </div>
                <div class="form-group">
                    <input type="text" placeholder="Location" name="location" value={location} onChange={e => onChange(e)} />
                </div>
                <div class="form-group">
                    <h4>From Date</h4>
                    <input type="date" name="from" value={from} onChange={e => onChange(e)} />
                </div>
                <div class="form-group">
                    <p><input type="checkbox" name="current" checked={current} value={current} onChange={e => {
                        setFormData({...formData, current: !current });
                        toggleDisabled(!toDateDisabled);
                    }} /> {' '}Current Job</p>
                </div>
                <div class="form-group">
                    <h4>To Date</h4>
                    <input type="date" name="to" value={to} onChange={e => onChange(e)} disabled={toDateDisabled ? 'disabled' : ''}/>
                </div>
                <div class="form-group">
                    <textarea
                        name="description"
                        cols="30"
                        rows="5"
                        placeholder="Job Description"
                        value={description} onChange={e => onChange(e)}
                    ></textarea>
                </div>
                <input type="submit" class="btn btn-primary my-1" />
                <a class="btn btn-light my-1" href="dashboard.html">Go Back</a>
            </form>
            
        </Fragment>
    )
}

AddExperience.propTypes = {
    addExperience: PropTypes.func.isRequired
}

export default connect(null, { addExperience })(AddExperience)
```

#### 40. List education & experience

For the experience and education components, we will be passing down the experience and education data from the parent `Dashboard.js` component. So we can add it as a prop within the props parameter for education and experience.

The `components/dashboard/Experience.js` is very similar to `Education.js`. Below is the code for Experience:

```
import React, { Fragment } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import formatDate from '../../utils/formatDate';

const Experience = ({ experience }) => { // pass in experience as a prop

    const experiences = experience.map(exp => (
        <tr key={exp._id}>
            <td>{exp.company}</td>
            <td className="hide-sm">{exp.title}</td>
            <td>
                {formatDate(exp.from)} - {exp.to ? formatDate(exp.to) : 'Now'}
            </td>
            <td>
                <button className="btn btn-danger">Delete</button>
            </td>
        </tr>
    ))
    return (
        <Fragment>
           <h2 className="my-2">Experience Credentials</h2> 
           <table className="table">
               <thead>
                   <tr>
                       <th>Company</th>
                       <th className="hide-sm">Title</th>
                       <th className="hide-sm">Years</th>
                       <th/>
                   </tr>
               </thead>
               <tbody>
                   {experiences}
               </tbody>
           </table>
        </Fragment>
    )
}

Experience.propTypes = {
    experience: PropTypes.array.isRequired
}

export default Experience
```

#### 41. Delete experience, education & account

We need to create an action to remove an account, that is ACCOUNT_DELETED. We also need to CLEAR_PROFILE when someone removes their accunt. The ACCOUNT_DELETED can live within the `auth.js` reducers since it makes use of the same capability as some of these reducers.

These three actions should be implemented in `actions/profile.js`:

```
// delete experience
export const deleteExperience = id => async dispatch => {
    try {

        const res = await axios.delete(`/api/profile/experience/${id}`);
        dispatch({
            type: UPDATE_PROFILE,
            payload: res.data
        });

        dispatch(setAlert('Experience removed', 'success'));

    } catch (err) {
        dispatch({
            type: PROFILE_ERROR,
            payload: { 
                msg: err.response.statusText, 
                status: err.response.status 
            }
        });

    }
}

// delete education
export const deleteEducation = id => async dispatch => {
    try {

        const res = await axios.delete(`/api/profile/education/${id}`);
        dispatch({
            type: UPDATE_PROFILE,
            payload: res.data
        });

        dispatch(setAlert('Education removed', 'success'));

    } catch (err) {
        dispatch({
            type: PROFILE_ERROR,
            payload: { 
                msg: err.response.statusText, 
                status: err.response.status 
            }
        });

    }
}

// delete account & profile
export const deleteAccount = () => async dispatch => {

    if (window.confirm('Are you sure? This can NOT be undone!')) {

        try {

            const res = await axios.delete('/api/profile');
            dispatch({
                type: CLEAR_PROFILE
            });
            dispatch({
                type: ACCOUNT_DELETED
            });
    
            dispatch(setAlert('Your account has been permanently deleted'));
    
        } catch (err) {
            dispatch({
                type: PROFILE_ERROR,
                payload: { 
                    msg: err.response.statusText, 
                    status: err.response.status 
                }
            });
    
        }
    }
}
```

#### 42. Finish profile actions & reducer

Added some more actions into the profile actions to allow the fetching of all profiles, a single profile and a users github repos.

#### 43. Display profiles

To display all the profiles we needed an action to GET_PROFILES and to create two new components, the Profiles and ProfileItem. The code for `components/profiles/Profiles.js` is below:

```
import React, { Fragment, useEffect } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Spinner from '../layout/Spinner'
import ProfileItem from './ProfileItem'
import { getProfiles } from '../../actions/profile'

const Profiles = ({ getProfiles, profile: { profiles, loading } }) => {
    useEffect(() => {
        getProfiles();
    }, []);

    return (
        <Fragment>
            { loading ? <Spinner/> : <Fragment>
                <h1 className="large text-primary">Developers</h1>
                <p className="lead">
                    <i className="fab fa-connectdevelop"></i> Browse and connect with developers
                </p>
                <div className="profiles">
                    {profiles.length > 0 ? (
                        profiles.map(profile => (
                            <ProfileItem key={profile._id} profile={profile} />
                        ))
                    ) : (<h4>No profiles found...</h4>)}
                </div>
            </Fragment> }
        </Fragment>
    )
}

Profiles.propTypes = {
    getProfiles: PropTypes.func.isRequired,
    profile: PropTypes.object.isRequired
}

const mapStateToProps = state => ({
    profile: state.profile
})

export default connect(mapStateToProps, { getProfiles })(Profiles)
```

The code for `components/profiles/ProfileItem.js` is also below:

```
import React from 'react'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'

const ProfileItem = ({ 
    profile: {
        user: { _id, name, avatar },
        status, 
        company,
        location,
        skills
    }
}) => {
    return (
        <div className="profile bg-light">
            <img className="round-img" src={avatar}></img>
            <div>
                <h2>{name}</h2>
                <p>{status}{company && <span> @ {company}</span>}</p>
                <p className="my-1">{location && <span>{location}</span>}</p>
                <Link to={`/profile/${_id}`} className="btn btn-primary">View Profile</Link>
            </div>
            <ul>
                {skills.slice(0, 4).map((skill, index) => (
                    <li key={index} className="text-primary">
                        <i className="fas fa-check"></i> {skill}
                    </li>
                ))}
            </ul>
        </div>
    )
}

ProfileItem.propTypes = {
    profile: PropTypes.object.isRequired
}

export default ProfileItem
```

#### 44. Creating the profile page

The profile page component should look like this:

```
import React, { Fragment, useEffect } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Spinner from '../layout/Spinner'
import { getProfileById } from '../../actions/profile' 
import { Link } from 'react-router-dom'

const Profile = ({ getProfileById, profile: { profile, loading }, auth, match }) => {
    useEffect(() => {
        getProfileById(match.params.id) // gets ID in URL params
    }, [getProfileById]);

    return (
        <Fragment>
            {
                profile === null || loading ? <Spinner/> : (
                    <Fragment>
                        <Link to='/profiles' className="btn btn-light">Back To Profiles</Link>
                        {auth.isAuthenticated && auth.loading === false && auth.user._id === profile.user._id && (
                            <Link to='/edit-profile' className="btn btn-dark">Edit Profile</Link>
                        )}
                    </Fragment>
                )
            }
        </Fragment>
    )
}

Profile.propTypes = {
    getProfileById: PropTypes.func.isRequired,
    profile: PropTypes.object.isRequired,
    auth: PropTypes.object.isRequired

}

const mapStateToProps = state => ({
    profile: state.profile,
    auth: state.auth
})

export default connect(mapStateToProps, { getProfileById })(Profile)
```

#### 45. Profile Top and About sections

We create two new components within `components/profile` called `ProfileTop.js` and `ProfileAbout.js`.

ProfileTop should look like this:

```
import React from 'react'
import PropTypes from 'prop-types'

const ProfileTop = (
    { 
        profile : {
            status,
            company,
            location,
            website,
            social,
            user: { name, avatar }
        }
    }
) => {
    return (
        <div class="profile-top bg-primary p-2">
            <img
                class="round-img my-1"
                src={avatar}
                alt=""
            />
            <h1 class="large">{name}</h1>
            <p class="lead">{status}{company && <span> @ {company}</span>}</p>
            <p>{location && <span>{location}</span>}</p>
            <div class="icons my-1">
                {
                    website && (
                        <a href={website} target="_blank" rel="noopener noreferrer">
                            <i class="fas fa-globe fa-2x"></i>
                        </a>
                    )
                }
                {
                    social && social.twitter && (
                        <a href={social.twitter} target="_blank" rel="noopener noreferrer">
                            <i class="fab fa-twitter fa-2x"></i>
                        </a>
                    )
                }
                {
                    social && social.facebook && (
                        <a href={social.facebook} target="_blank" rel="noopener noreferrer">
                            <i class="fab fa-facebook fa-2x"></i>
                        </a>
                    )
                }
                {
                    social && social.linkedin && (
                        <a href={social.linkedin} target="_blank" rel="noopener noreferrer">
                            <i class="fab fa-linkedin fa-2x"></i>
                        </a>
                    )
                }
                {
                    social && social.youtube && (
                        <a href={social.youtube} target="_blank" rel="noopener noreferrer">
                            <i class="fab fa-youtube fa-2x"></i>
                        </a>
                    )
                }
                {
                    social && social.instagram && (
                        <a href={social.instagram} target="_blank" rel="noopener noreferrer">
                            <i class="fab fa-instagram fa-2x"></i>
                        </a>
                    )
                }
            </div>
        </div>
    )
}

ProfileTop.propTypes = {
    profile: PropTypes.object.isRequired
}

export default ProfileTop
```

And ProfileAbout should look like this:

```
import React, { Fragment } from 'react'
import PropTypes from 'prop-types'

const ProfileAbout = ({
    profile: {
        bio,
        skills,
        user: { name }
    }
}) => {
    return (
        <div class="profile-about bg-light p-2">
            {
                bio && (
                    <Fragment>
                        <h2 class="text-primary">{name.trim().split(' ')[0]}s Bio</h2>
                        <p>
                            {bio}
                        </p>
                        <div class="line"></div>
                    </Fragment>
                )
            }
            
            <h2 class="text-primary">Skill Set</h2>
            <div class="skills">
                {skills.map((skill, index) => (
                    <div key={index} className="p-1">
                        <i className="fas fa-check"></i> {skill}
                    </div>
                ))}
            </div>
        </div>
    )
}

ProfileAbout.propTypes = {
    profile: PropTypes.object.isRequired,
}

export default ProfileAbout
```

#### 46. Profile experience and education display

To show the education and experience on a profile, use the below code as an example to create two new components `components/profile/ProfileExperience.js` and `components/profile/ProfileEducation.js`.

```
import React from 'react'
import PropTypes from 'prop-types'
import formatDate from '../../utils/formatDate'

const ProfileExperience = ({
    experience: {
        company, 
        title,
        location,
        current,
        to,
        from,
        description
    }
}) => {
    return (
        <div>
            <h3 className="text-dark">{company}</h3>
            <p>
                {formatDate(from)} - {to ? formatDate(to) : 'Now'}
            </p>
            <p>
                <strong>Position: </strong>{title}
            </p>
            <p>
                <strong>Description: </strong>{description}
            </p>
        </div>
    )
}

ProfileExperience.propTypes = {
    experience: PropTypes.array.isRequired
}

export default ProfileExperience
```

#### 47. Displaying Github repos

Now we create 3 more profile components `ProfileEducation.js`, `ProfileExperience.js` and `ProfileGithub.js`

#### 48. Post reducer, action and initial component

Create the type, reducer, action and component for the posts.

Then we create the `components/posts/PostItem.js` component which looks like this:

```
import React, { Fragment } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import formatDate from '../../utils/formatDate'
import { connect } from 'react-redux'

const PostItem = ({ 
    auth, 
    post: { 
        _id, 
        text, 
        name, 
        avatar, 
        user, 
        likes, 
        comments, 
        date
    } 
}) => {
    return (
        <div class="post bg-white p-1 my-1">
            <div>
                <a href="profile.html">
                <img
                    class="round-img"
                    src={avatar}
                    alt=""/>
                <h4>{name}</h4>
                </a>
            </div>
            <div>
                <p class="my-1">
                    {text}
                </p>
                <p class="post-date">
                    Posted on {formatDate(date)}
                </p>
                <button type="button" class="btn btn-light">
                    <i class="fas fa-thumbs-up"></i>{' '}
                    <span>
                        {likes.length > 0 && (
                            <span>{likes.length}</span>
                        )}
                    </span>
                </button>
                <button type="button" class="btn btn-light">
                    <i class="fas fa-thumbs-down"></i>
                </button>
                <Link to={`/post/${_id}`} class="btn btn-primary">
                    Discussion{' '}
                    {comments.length > 0 && (
                        <span class='comment-count'>{comments.length}</span>
                    )}
                </Link>
                {!auth.loading && user === auth.user._id && (
                    <button type="button" class="btn btn-danger">
                        <i class="fas fa-times"></i>
                    </button>
                )}  
            </div>
        </div>
    )
}

PostItem.propTypes = {
    post: PropTypes.object.isRequired,
    auth: PropTypes.object.isRequired
}

const mapStateToProps = state => ({
    auth: state.auth
});

export default connect(mapStateToProps, {})(PostItem)
```

#### 49. Like & Unlike functionality

To do this we simply add some new actions for adding and removing a like, them we created the reducers for these actions in the reducer. Finally we connected these actions to the `components/posts/PostItems.js` component with an onClick.

#### 50. Deleting posts

Very similar, we create a new action type, create the action which dispatches to the reducer and updates the state. Then we connect this into the component in `components/posts/PostItems.js`.

#### 51. Adding posts

Same process as before, but we now want a new component called `PostForm.js` which is what the user will use to create a new post. It should look like this:

```
import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { addPost } from '../../actions/post'

const PostForm = ({ addPost }) => {
    const [text, setText] = useState('');

    return (
        <div class="post-form">
            <div class="bg-primary p">
            <h3>Say Something...</h3>
            </div>
            <form class="form my-1" onSubmit={e => {
                e.preventDefault();
                addPost({ text });
                setText('');
            }}>
            <textarea
                name="text"
                cols="30"
                rows="5"
                placeholder="Create a post"
                value={text}
                onChange={e => setText(e.target.value)}
                required
            ></textarea>
            <input type="submit" class="btn btn-dark my-1" value="Submit" />
            </form>
      </div>
    )
}

PostForm.propTypes = {
    addPost: PropTypes.func.isRequired
}

export default connect(null, { addPost })(PostForm)
```

#### 52. Single post display