'use strict';

module.exports = (app, {User}) => {
    app.get('/', async (req, res) => {
        res.json(await User.findOne({where: {id: req.user.id}, attributes: ['email', 'role']}));
    });
};
