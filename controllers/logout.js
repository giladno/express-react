'use strict';

module.exports = app => {
    app.post('/', async (req, res) => {
        await req.user.update({loggedOutAt: new Date()});
        res.status(204).end();
    });
};
