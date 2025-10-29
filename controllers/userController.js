// User Controller - handles user operations
var User = require('../models/user');
var Task = require('../models/task');

// Parse query parameters helper function
function parseQueryParams(req) {
    var where = {};
    var sort = {};
    var select = {};
    var skip = 0;
    var limit = null;
    var count = false;

    // Parse 'where' parameter
    if (req.query.where) {
        try {
            where = JSON.parse(req.query.where);
        } catch (e) {
            return { error: 'Invalid where parameter' };
        }
    }

    // Parse 'sort' parameter
    if (req.query.sort) {
        try {
            sort = JSON.parse(req.query.sort);
        } catch (e) {
            return { error: 'Invalid sort parameter' };
        }
    }

    // Parse 'select' parameter
    if (req.query.select) {
        try {
            select = JSON.parse(req.query.select);
        } catch (e) {
            return { error: 'Invalid select parameter' };
        }
    }

    // Parse 'skip' parameter
    if (req.query.skip) {
        skip = parseInt(req.query.skip) || 0;
    }

    // Parse 'limit' parameter
    if (req.query.limit) {
        limit = parseInt(req.query.limit) || null;
    }

    // Parse 'count' parameter
    if (req.query.count === 'true' || req.query.count === true) {
        count = true;
    }

    return { where, sort, select, skip, limit, count };
}

// GET /api/users - Get all users
exports.getAllUsers = function(req, res) {
    var params = parseQueryParams(req);
    if (params.error) {
        return res.status(400).json({
            message: params.error,
            data: null
        });
    }

    var query = User.find(params.where);

    // Apply sorting
    if (Object.keys(params.sort).length > 0) {
        query = query.sort(params.sort);
    }

    // Apply field selection
    if (Object.keys(params.select).length > 0) {
        query = query.select(params.select);
    }

    // Apply pagination
    if (params.skip > 0) {
        query = query.skip(params.skip);
    }
    if (params.limit !== null) {
        query = query.limit(params.limit);
    }

    // Handle count parameter
    if (params.count) {
        User.countDocuments(params.where, function(err, count) {
            if (err) {
                return res.status(500).json({
                    message: 'Error counting users',
                    data: null
                });
            }
            return res.status(200).json({
                message: 'OK',
                data: count
            });
        });
    } else {
        query.exec(function(err, users) {
            if (err) {
                return res.status(500).json({
                    message: 'Error retrieving users',
                    data: null
                });
            }
            return res.status(200).json({
                message: 'OK',
                data: users
            });
        });
    }
};

// POST /api/users - Create a new user
exports.createUser = function(req, res) {
    // Validation: name and email are required
    if (!req.body.name || !req.body.email) {
        return res.status(400).json({
            message: 'Name and email are required',
            data: null
        });
    }

    var user = new User({
        name: req.body.name,
        email: req.body.email,
        pendingTasks: req.body.pendingTasks || [],
        dateCreated: req.body.dateCreated || Date.now()
    });

    user.save(function(err, newUser) {
        if (err) {
            // Check if it's a duplicate email error
            if (err.code === 11000) {
                return res.status(400).json({
                    message: 'User with this email already exists',
                    data: null
                });
            }
            return res.status(500).json({
                message: 'Error creating user',
                data: null
            });
        }
        return res.status(201).json({
            message: 'User created successfully',
            data: newUser
        });
    });
};

// GET /api/users/:id - Get user by ID
exports.getUserById = function(req, res) {
    var params = parseQueryParams(req);
    var select = {};

    // Handle select parameter for specific user endpoint
    if (req.query.select) {
        try {
            select = JSON.parse(req.query.select);
        } catch (e) {
            return res.status(400).json({
                message: 'Invalid select parameter',
                data: null
            });
        }
    }

    var query = User.findById(req.params.id);
    
    if (Object.keys(select).length > 0) {
        query = query.select(select);
    }

    query.exec(function(err, user) {
        if (err) {
            return res.status(500).json({
                message: 'Error retrieving user',
                data: null
            });
        }
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                data: null
            });
        }
        return res.status(200).json({
            message: 'OK',
            data: user
        });
    });
};

// PUT /api/users/:id - Update entire user
exports.updateUser = function(req, res) {
    // Validation: name and email are required
    if (!req.body.name || !req.body.email) {
        return res.status(400).json({
            message: 'Name and email are required',
            data: null
        });
    }

    User.findById(req.params.id, function(err, user) {
        if (err) {
            return res.status(500).json({
                message: 'Error finding user',
                data: null
            });
        }
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                data: null
            });
        }

        // Check if email is being changed and if it already exists (except for this user)
        if (req.body.email !== user.email) {
            User.findOne({ email: req.body.email }, function(err, existingUser) {
                if (err) {
                    return res.status(500).json({
                        message: 'Error checking email',
                        data: null
                    });
                }
                if (existingUser) {
                    return res.status(400).json({
                        message: 'User with this email already exists',
                        data: null
                    });
                }
                
                // Update user
                updateUserFields();
            });
        } else {
            updateUserFields();
        }

        function updateUserFields() {
            // If pendingTasks is being updated, update all related tasks
            if (req.body.pendingTasks !== undefined && req.body.pendingTasks.length > 0) {
                // Update tasks' assignedUserName
                var taskIds = req.body.pendingTasks;
                Task.updateMany(
                    { _id: { $in: taskIds } },
                    { assignedUserName: user.name },
                    function(err) {
                        if (err) {
                            console.log('Error updating tasks:', err);
                        }
                    }
                );
            }

            user.name = req.body.name;
            user.email = req.body.email;
            user.pendingTasks = req.body.pendingTasks || [];
            user.dateCreated = req.body.dateCreated || user.dateCreated;

            user.save(function(err, updatedUser) {
                if (err) {
                    return res.status(500).json({
                        message: 'Error updating user',
                        data: null
                    });
                }
                return res.status(200).json({
                    message: 'OK',
                    data: updatedUser
                });
            });
        }
    });
};

// DELETE /api/users/:id - Delete user
exports.deleteUser = function(req, res) {
    User.findById(req.params.id, function(err, user) {
        if (err) {
            return res.status(500).json({
                message: 'Error finding user',
                data: null
            });
        }
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                data: null
            });
        }

        // Unassign all tasks assigned to this user
        Task.updateMany(
            { assignedUser: req.params.id },
            { 
                assignedUser: "",
                assignedUserName: "unassigned"
            },
            function(err) {
                if (err) {
                    console.log('Error unassigning tasks:', err);
                }
            }
        );

        // Delete the user
        User.findByIdAndDelete(req.params.id, function(err) {
            if (err) {
                return res.status(500).json({
                    message: 'Error deleting user',
                    data: null
                });
            }
            return res.status(204).json({
                message: 'OK',
                data: null
            });
        });
    });
};

