// Task Controller - handles task operations
var Task = require('../models/task');
var User = require('../models/user');

// Parse query parameters helper function (same as userController)
function parseQueryParams(req) {
    var where = {};
    var sort = {};
    var select = {};
    var skip = 0;
    var limit = 100; // Default limit for tasks
    var count = false;

    if (req.query.where) {
        try {
            where = JSON.parse(req.query.where);
        } catch (e) {
            return { error: 'Invalid where parameter' };
        }
    }

    if (req.query.sort) {
        try {
            sort = JSON.parse(req.query.sort);
        } catch (e) {
            return { error: 'Invalid sort parameter' };
        }
    }

    if (req.query.select) {
        try {
            select = JSON.parse(req.query.select);
        } catch (e) {
            return { error: 'Invalid select parameter' };
        }
    }

    if (req.query.skip) {
        skip = parseInt(req.query.skip) || 0;
    }

    if (req.query.limit) {
        limit = parseInt(req.query.limit) || 100;
    }

    if (req.query.count === 'true' || req.query.count === true) {
        count = true;
    }

    return { where, sort, select, skip, limit, count };
}

// GET /api/tasks - Get all tasks
exports.getAllTasks = function(req, res) {
    var params = parseQueryParams(req);
    if (params.error) {
        return res.status(400).json({
            message: params.error,
            data: null
        });
    }

    var query = Task.find(params.where);

    if (Object.keys(params.sort).length > 0) {
        query = query.sort(params.sort);
    }

    if (Object.keys(params.select).length > 0) {
        query = query.select(params.select);
    }

    if (params.skip > 0) {
        query = query.skip(params.skip);
    }
    
    query = query.limit(params.limit);

    if (params.count) {
        Task.countDocuments(params.where, function(err, count) {
            if (err) {
                return res.status(500).json({
                    message: 'Error counting tasks',
                    data: null
                });
            }
            return res.status(200).json({
                message: 'OK',
                data: count
            });
        });
    } else {
        query.exec(function(err, tasks) {
            if (err) {
                return res.status(500).json({
                    message: 'Error retrieving tasks',
                    data: null
                });
            }
            return res.status(200).json({
                message: 'OK',
                data: tasks
            });
        });
    }
};

// POST /api/tasks - Create a new task
exports.createTask = function(req, res) {
    // Validation: name and deadline are required
    if (!req.body.name || !req.body.deadline) {
        return res.status(400).json({
            message: 'Name and deadline are required',
            data: null
        });
    }

    var task = new Task({
        name: req.body.name,
        description: req.body.description || "",
        deadline: req.body.deadline,
        completed: req.body.completed !== undefined ? req.body.completed : false,
        assignedUser: req.body.assignedUser || "",
        assignedUserName: req.body.assignedUserName || "unassigned",
        dateCreated: req.body.dateCreated || Date.now()
    });

    // If assigned to a user, update user's pendingTasks
    if (task.assignedUser && task.assignedUser !== "") {
        User.findById(task.assignedUser, function(err, user) {
            if (err || !user) {
                // If user not found, save task without assignment
                task.assignedUser = "";
                task.assignedUserName = "unassigned";
            } else {
                // Update assignedUserName
                task.assignedUserName = user.name;
                
                // Add task to user's pendingTasks if not already there
                if (user.pendingTasks.indexOf(task._id.toString()) === -1) {
                    user.pendingTasks.push(task._id.toString());
                    user.save(function(err) {
                        if (err) {
                            console.log('Error updating user:', err);
                        }
                    });
                }
            }

            // Save the task
            task.save(function(err, newTask) {
                if (err) {
                    return res.status(500).json({
                        message: 'Error creating task',
                        data: null
                    });
                }
                return res.status(201).json({
                    message: 'Task created successfully',
                    data: newTask
                });
            });
        });
    } else {
        // Save task without assignment
        task.save(function(err, newTask) {
            if (err) {
                return res.status(500).json({
                    message: 'Error creating task',
                    data: null
                });
            }
            return res.status(201).json({
                message: 'Task created successfully',
                data: newTask
            });
        });
    }
};

// GET /api/tasks/:id - Get task by ID
exports.getTaskById = function(req, res) {
    var select = {};

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

    var query = Task.findById(req.params.id);
    
    if (Object.keys(select).length > 0) {
        query = query.select(select);
    }

    query.exec(function(err, task) {
        if (err) {
            return res.status(500).json({
                message: 'Error retrieving task',
                data: null
            });
        }
        if (!task) {
            return res.status(404).json({
                message: 'Task not found',
                data: null
            });
        }
        return res.status(200).json({
            message: 'OK',
            data: task
        });
    });
};

// PUT /api/tasks/:id - Update entire task
exports.updateTask = function(req, res) {
    // Validation: name and deadline are required
    if (!req.body.name || !req.body.deadline) {
        return res.status(400).json({
            message: 'Name and deadline are required',
            data: null
        });
    }

    Task.findById(req.params.id, function(err, task) {
        if (err) {
            return res.status(500).json({
                message: 'Error finding task',
                data: null
            });
        }
        if (!task) {
            return res.status(404).json({
                message: 'Task not found',
                data: null
            });
        }

        var oldAssignedUser = task.assignedUser;
        var newAssignedUser = req.body.assignedUser || task.assignedUser;

        // Update task fields
        task.name = req.body.name;
        task.description = req.body.description !== undefined ? req.body.description : task.description;
        task.deadline = req.body.deadline;
        task.completed = req.body.completed !== undefined ? req.body.completed : task.completed;
        task.assignedUser = newAssignedUser;
        task.dateCreated = req.body.dateCreated || task.dateCreated;

        // Handle user assignment
        if (newAssignedUser && newAssignedUser !== "") {
            User.findById(newAssignedUser, function(err, user) {
                if (err || !user) {
                    task.assignedUser = "";
                    task.assignedUserName = "unassigned";
                } else {
                    task.assignedUserName = user.name;
                    
                    // Add to user's pendingTasks
                    if (user.pendingTasks.indexOf(req.params.id) === -1) {
                        user.pendingTasks.push(req.params.id);
                        user.save(function(err) {
                            if (err) {
                                console.log('Error updating user:', err);
                            }
                        });
                    }
                }

                // Remove from old user's pendingTasks
                if (oldAssignedUser && oldAssignedUser !== "" && oldAssignedUser !== newAssignedUser) {
                    User.findById(oldAssignedUser, function(err, oldUser) {
                        if (!err && oldUser) {
                            var index = oldUser.pendingTasks.indexOf(req.params.id);
                            if (index > -1) {
                                oldUser.pendingTasks.splice(index, 1);
                                oldUser.save(function(err) {
                                    if (err) {
                                        console.log('Error updating old user:', err);
                                    }
                                });
                            }
                        }
                    });
                }

                // Save the task
                task.save(function(err, updatedTask) {
                    if (err) {
                        return res.status(500).json({
                            message: 'Error updating task',
                            data: null
                        });
                    }
                    return res.status(200).json({
                        message: 'OK',
                        data: updatedTask
                    });
                });
            });
        } else {
            // No assignment, remove from old user's pendingTasks
            if (oldAssignedUser && oldAssignedUser !== "") {
                User.findById(oldAssignedUser, function(err, oldUser) {
                    if (!err && oldUser) {
                        var index = oldUser.pendingTasks.indexOf(req.params.id);
                        if (index > -1) {
                            oldUser.pendingTasks.splice(index, 1);
                            oldUser.save(function(err) {
                                if (err) {
                                    console.log('Error updating old user:', err);
                                }
                            });
                        }
                    }
                });
            }

            task.assignedUserName = "unassigned";

            // Save the task
            task.save(function(err, updatedTask) {
                if (err) {
                    return res.status(500).json({
                        message: 'Error updating task',
                        data: null
                    });
                }
                return res.status(200).json({
                    message: 'OK',
                    data: updatedTask
                });
            });
        }
    });
};

// DELETE /api/tasks/:id - Delete task
exports.deleteTask = function(req, res) {
    Task.findById(req.params.id, function(err, task) {
        if (err) {
            return res.status(500).json({
                message: 'Error finding task',
                data: null
            });
        }
        if (!task) {
            return res.status(404).json({
                message: 'Task not found',
                data: null
            });
        }

        // Remove task from assigned user's pendingTasks
        if (task.assignedUser && task.assignedUser !== "") {
            User.findById(task.assignedUser, function(err, user) {
                if (!err && user) {
                    var index = user.pendingTasks.indexOf(req.params.id);
                    if (index > -1) {
                        user.pendingTasks.splice(index, 1);
                        user.save(function(err) {
                            if (err) {
                                console.log('Error updating user:', err);
                            }
                        });
                    }
                }
            });
        }

        // Delete the task
        Task.findByIdAndDelete(req.params.id, function(err) {
            if (err) {
                return res.status(500).json({
                    message: 'Error deleting task',
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

