'use strict';
global.__DEV__ = process.env.NODE_ENV == 'development';
global.__TEST__ = !!global.__TEST__;
global._ = require('lodash');
global.log = require('loglevel');

const util = require('util');
const path = require('path');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const requireAll = require('require-all');
const Sequelize = require('sequelize');

const jwtVerify = util.promisify(jwt.verify);

log.setLevel(process.env.LOG_LEVEL || 'warn');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    logging: false,
    define: {charset: 'utf8', updatedAt: false},
    pool: {max: 1, acquire: 30000},
});

Object.values(requireAll({dirname: path.resolve(__dirname, './models')})).forEach(model => model(sequelize, Sequelize));

Object.values(sequelize.models)
    .filter(({associate}) => associate)
    .forEach(model => model.associate(sequelize.models));

const {User} = sequelize.models;

for (const fn of require('methods').concat('use', 'all')) {
    for (const route of ['Router', 'application']) {
        const orig = express[route][fn];
        express[route][fn] = function(...args) {
            return orig.apply(
                this,
                args.map(f => {
                    if (typeof f != 'function' || f.length > 3 || (f.handle && f.set)) return f;
                    return (req, res, next) => (async () => await f(req, res, next))().catch(next);
                })
            );
        };
    }
}

express.Router.admin = function() {
    return async (req, res, next) => {
        if (!_.get(req, 'user.admin')) return res.status(403).end();
        next();
    };
};

const app = express();
const api = express();

app.set('db', sequelize);
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors({origin: true}));

if (__DEV__) {
    require('longjohn');
    app.use(require('morgan')('dev'));
    app.use((req, res, next) => {
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        res.header('Access-Control-Allow-Credentials', 'true');
        next();
    });
}

api.use(async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        if (!token) return;
        const {id = 0, timestamp = -1} = await jwtVerify(token, process.env.JWT_SECRET);
        const user = await User.findOne({where: {id, active: true}, attributes: {exclude: ['digest', 'salt']}});
        if (!user) return log.warn('could not find a matching active user', id);
        if (timestamp <= (Number(user.loggedOutAt) || 0)) {
            return log.warn(
                `user ${id} logged out at ${user.loggedOutAt}, but token was created at ${new Date(timestamp)}`
            );
        }
        Object.assign(req, {user});
    } catch (err) {
        err;
    } finally {
        next();
    }
});

if (__DEV__ || __TEST__) {
    app.use(async (req, res, next) => {
        try {
            const email = req.headers['x-email'];
            if (email) Object.assign(req, {user: await User.findOne({where: {email}})});
        } finally {
            next();
        }
    });
}

for (const [name, controller] of Object.entries(requireAll({dirname: path.resolve(__dirname, './controllers')}))) {
    log.info(`Registering controller /${name}`);
    const router = express.Router();
    const {guest} = controller(router, {Sequelize, sequelize, ...sequelize.models}) || {};
    api.use(
        `/${name}`,
        (req, res, next) => {
            if (guest) return next();
            if (!req.user) return res.status(401).end();
            next();
        },
        router
    );
}

if (__DEV__) {
    app.post('/sync', async (req, res) => {
        await sequelize.dropAllSchemas();
        await sequelize.sync();
        res.status(201).end();
    });
}

app.use('/api', api);

if (!__DEV__) {
    app.use(express.static(path.resolve(__dirname, './dist'), {redirect: false}));
    app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, './dist/index.html')));
}

app.use((err, req, res, next) => {
    log.error(err);
    res.status(500).send(__DEV__ ? err.stack : 'Server Error');
    next;
});

module.exports = app;
