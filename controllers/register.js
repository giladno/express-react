'use strict';

module.exports = (app, {User}) => {
    app.post('/', async (req, res) => {
        const {email, password} = req.body;
        try {
            await User.create({email: String(email), password: String(password)});
            return res.status(201).end();
        } catch (err) {
            if (err.errors)
                return res.status(err.errors.some(({type}) => type == 'unique violation') ? 409 : 400).json(err.errors);
            log.error(err);
            throw err;
        }
    });

    return {guest: true};
};
