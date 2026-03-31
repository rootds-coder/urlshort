const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [30, 'Username cannot be more than 30 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: false,
        minlength: [6, 'Password must be at least 6 characters long']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    apiKey: {
        type: String,
        unique: true,
        sparse: true
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    premiumExpiresAt: {
        type: Date,
        default: null
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    try {
        if (!this.isModified('password')) return next();
        
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        if (!this.password) return false;
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Error comparing passwords');
    }
};

// Add error handling for duplicate key errors
userSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoError' && error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        next(new Error(`${field} already exists`));
    } else {
        next(error);
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User; 