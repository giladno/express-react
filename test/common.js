'use strict';
global.__TEST__ = true;
Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: 'sqlite://:memory:',
    JWT_SECRET: 'secret',
    JWT_EXPIRY: '1h',
    SIGNER_KEY: 'c2VjcmV0',
    SALT_SEPARATOR: '5BA=',
});
const util = require('util');
const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');

const sequelize = app.get('db');
const {User} = sequelize.models;

const inspect = (...args) => console.log(...args.map(o => util.inspect(o, {showHidden: false, depth: null})));

Object.assign(global, {
    chai,
    expect: chai.expect,
    app,
    inspect,
    sequelize,
    User,
});

chai.config.includeStack = true;
chai.should();
chai.use(chaiHttp);

after(async function() {
    await sequelize.close();
});

beforeEach(async function() {
    await sequelize.sync({force: true});
    await User.bulkCreate([{id: 1, password: 'password', email: 'gilad@novik.ca', role: 'ADMIN'}], {
        individualHooks: true,
    });
});
