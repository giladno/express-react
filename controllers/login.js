'use strict';

module.exports = (app, {User}) => {
    app.post('/', async (req, res) => {
        const user = await User.findOne({where: {email: req.body.email, active: true}});
        if (!(user && (await user.authenticate(req.body.password)))) return res.status(401).end();
        res.json({token: await user.jwt({timestamp: Date.now()}, {expiry: process.env.JWT_EXPIRY})});
    });

    return {guest: true};
};
